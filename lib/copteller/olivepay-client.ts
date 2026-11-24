import crypto from 'crypto'
import http from 'http'
import https from 'https'
import tls from 'tls'
import { queryCopteller, withCoptellerTransaction } from '@/lib/copteller/pg'
import {
    ensureOlivePayTables,
    getPlatformConfig,
    NIGERIAN_NIP_BANKS_6DIGIT,
    type NipBankEntry,
} from '@/lib/copteller/olivepay-schema'
import { resolveSecretByName } from '@/lib/workflow/secrets/secretResolver'

// =============================================================================
// CONSTANTS & CONVERSION HELPERS (STRICT OLIVEPAY WIRE CONTRACT)
// =============================================================================

export const OLIVEPAY_DEFAULT_BASE_URL = 'https://api.olivepayment.com'

export type OlivePayAuthMode =
    | 'OLIVEPAY_PUBLIC_BEARER'
    | 'OLIVEPAY_JWT'
    | 'OLIVEPAY_JWT_HMAC'
    | 'NONE'

export type OlivePayRailMode = 'olivepay' | 'sandbox_simulator'

export interface OlivePayCredentials {
    publicKey: string | null
    secretKey: string | null
    webhookSecret: string | null
    baseUrl: string
    proxyUrl: string | null
    source: 'vault' | 'env' | 'mixed' | 'unconfigured'
}

export interface OlivePayEnvelope<T = any> {
    ok: boolean
    httpStatus: number
    status: boolean | string
    responseCode: string
    message: string
    data: T
    railMode: OlivePayRailMode
    isPending: boolean
    isReplay: boolean
    isTierLimitExceeded: boolean
    isTierLocked: boolean
    isHoldsDisabled: boolean
    raw?: any
}

export const TIER_LIMITS_NAIRA: Record<number, {
    single_deposit: number
    daily_debit: number
    max_balance: number
}> = {
    1: { single_deposit: 50_000, daily_debit: 50_000, max_balance: 300_000 },
    2: { single_deposit: 200_000, daily_debit: 200_000, max_balance: 500_000 },
    3: { single_deposit: 5_000_000, daily_debit: 5_000_000, max_balance: 1_000_000_000 },
}

/** Convert integer kobo → Naira string with 2 decimal places (Collections API wire unit). */
export function koboToNairaString(kobo: number): string {
    return (Math.round(Number(kobo) || 0) / 100).toFixed(2)
}

/** Convert integer kobo → Naira decimal number (Payout & SubWallet API wire unit). */
export function koboToNairaNumber(kobo: number): number {
    return Number((Math.round(Number(kobo) || 0) / 100).toFixed(2))
}

/** Convert Naira string or number → integer kobo (Copteller Ledger & Virtual Account API wire unit). */
export function nairaToKobo(naira: number | string): number {
    const num = typeof naira === 'string' ? parseFloat(naira.replace(/,/g, '')) : Number(naira)
    if (!Number.isFinite(num)) return 0
    return Math.round(num * 100)
}

/**
 * OlivePay Payout narration contract:
 * Max 25 characters, strictly [A-Za-z0-9 ._-]
 */
export function normalizeOlivePayNarration(input: string | undefined | null, fallback = 'Copteller Transfer'): string {
    const cleaned = String(input || fallback)
        .replace(/[^A-Za-z0-9 ._-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    return (cleaned || fallback).slice(0, 25)
}

/**
 * OlivePay transactionId contract: 6-30 characters alphanumeric/hyphen/underscore.
 */
export function generateOlivePayTransactionId(prefix = 'COP'): string {
    const cleanPrefix = prefix.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || 'COP'
    const ts = Date.now().toString(36).toUpperCase()
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase()
    return `${cleanPrefix}-${ts}-${rand}`.slice(0, 28)
}

/**
 * Compute exact-bytes OlivePay outbound HMAC-SHA256 signature.
 * Signed string is ALWAYS `${timestamp}.${rawBody}` (for GET/HEAD rawBody is `""`, yielding `${timestamp}.`).
 */
export function computeOlivePaySignature(
    secretKey: string,
    timestampSeconds: string,
    exactRawBody: string
): string {
    return crypto
        .createHmac('sha256', secretKey)
        .update(`${timestampSeconds}.${exactRawBody}`)
        .digest('hex')
        .toLowerCase()
}

/**
 * Compute inbound webhook HMAC-SHA256 signature (used by both verifier and Sandbox Webhook Simulator).
 */
export function signOlivePayWebhookPayload(
    webhookSecret: string,
    rawBody: string,
    timestampSeconds?: string
): { timestamp: string; signature: string; headers: Record<string, string> } {
    const ts = timestampSeconds || Math.floor(Date.now() / 1000).toString()
    const sig = computeOlivePaySignature(webhookSecret, ts, rawBody)
    return {
        timestamp: ts,
        signature: sig,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${webhookSecret}`,
            'X-Webhook-Timestamp': ts,
            'X-Webhook-Signature': sig,
        },
    }
}

/**
 * Cryptographically verify an inbound OlivePay webhook request:
 *  - Validates `X-Webhook-Timestamp` is within ±300 seconds UTC (replay protection)
 *  - Validates `X-Webhook-Signature` = HMAC-SHA256(webhookSecret, `${timestamp}.${rawBody}`) using timingSafeEqual
 *  - Optionally cross-checks `Authorization: Bearer {webhookSecret}` if present
 */
export function verifyOlivePayWebhookSignature(params: {
    rawBody: string
    timestampHeader: string | null
    signatureHeader: string | null
    authorizationHeader?: string | null
    webhookSecret: string
    nowEpochSeconds?: number
    maxDriftSeconds?: number
}): { valid: boolean; reason?: string } {
    const {
        rawBody,
        timestampHeader,
        signatureHeader,
        authorizationHeader,
        webhookSecret,
        nowEpochSeconds = Math.floor(Date.now() / 1000),
        maxDriftSeconds = 300,
    } = params

    if (!webhookSecret) {
        return { valid: false, reason: 'Webhook secret not configured on server' }
    }
    if (!timestampHeader || !signatureHeader) {
        return { valid: false, reason: 'Missing X-Webhook-Timestamp or X-Webhook-Signature header' }
    }

    const parsedTs = Number(timestampHeader)
    if (!Number.isFinite(parsedTs) || Math.abs(nowEpochSeconds - parsedTs) > maxDriftSeconds) {
        return { valid: false, reason: `Webhook timestamp outside ±${maxDriftSeconds}s replay window` }
    }

    const expectedSig = computeOlivePaySignature(webhookSecret, String(timestampHeader).trim(), rawBody)
    const providedSig = String(signatureHeader).trim().toLowerCase()

    const expectedBuf = Buffer.from(expectedSig, 'utf8')
    const providedBuf = Buffer.from(providedSig, 'utf8')
    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
        return { valid: false, reason: 'HMAC-SHA256 signature mismatch' }
    }

    if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
        const providedBearer = authorizationHeader.slice(7).trim()
        const a = Buffer.from(providedBearer, 'utf8')
        const b = Buffer.from(webhookSecret, 'utf8')
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            return { valid: false, reason: 'Authorization Bearer webhook secret mismatch' }
        }
    }

    return { valid: true }
}

/**
 * Parse OlivePay response envelope + semantic responseCode classification.
 */
export function parseOlivePayResponse<T = any>(
    httpStatus: number,
    raw: any,
    railMode: OlivePayRailMode
): OlivePayEnvelope<T> {
    const obj = typeof raw === 'object' && raw !== null ? raw : { message: String(raw || '') }
    const responseCode = String(
        obj.responseCode ?? obj.response_code ?? obj.code ?? (httpStatus >= 200 && httpStatus < 300 ? '00' : '02')
    )
    const statusField = obj.status ?? obj.isSuccessful ?? (httpStatus >= 200 && httpStatus < 300)
    const isPending = responseCode === '09'
    const isReplay = responseCode === '11'
    const isTierLimitExceeded = responseCode === '12'
    const isTierLocked = responseCode === '13'
    const isHoldsDisabled = responseCode === '15' || (httpStatus === 403 && /hold/i.test(String(obj.message || '')))

    const ok =
        httpStatus >= 200 &&
        httpStatus < 300 &&
        (responseCode === '00' || responseCode === '09' || responseCode === '11' || statusField === true || statusField === 'success')

    return {
        ok,
        httpStatus,
        status: statusField,
        responseCode,
        message: String(obj.message || obj.Message || (ok ? 'Success' : `OlivePay HTTP ${httpStatus}`)),
        data: (obj.data !== undefined ? obj.data : obj) as T,
        railMode,
        isPending,
        isReplay,
        isTierLimitExceeded,
        isTierLocked,
        isHoldsDisabled,
        raw: obj,
    }
}

// =============================================================================
// CREDENTIALS, ACTIVE RAIL & 60-MIN JWT TOKEN CACHE
// =============================================================================

const g = globalThis as typeof globalThis & {
    __olivepayJwtCache?: { token: string; expiresAt: number; keyFingerprint: string }
    __olivepayJwtInFlight?: Promise<string> | null
}

/**
 * Resolve OlivePay credentials from Copteller's AES-256-GCM Secrets Vault first,
 * falling back to environment variables (`OLIVEPAY_*`).
 */
export async function resolveOlivePayCredentials(): Promise<OlivePayCredentials> {
    const [vaultPub, vaultSec, vaultWh] = await Promise.all([
        resolveSecretByName('OLIVEPAY_PUBLIC_KEY'),
        resolveSecretByName('OLIVEPAY_SECRET_KEY'),
        resolveSecretByName('OLIVEPAY_WEBHOOK_SECRET'),
    ])

    const envPub = process.env.OLIVEPAY_PUBLIC_KEY?.trim() || null
    const envSec = process.env.OLIVEPAY_SECRET_KEY?.trim() || null
    const envWh = process.env.OLIVEPAY_WEBHOOK_SECRET?.trim() || null

    const publicKey = vaultPub || envPub
    const secretKey = vaultSec || envSec
    const webhookSecret = vaultWh || envWh

    const usedVault = Boolean(vaultPub || vaultSec || vaultWh)
    const usedEnv = Boolean((!vaultPub && envPub) || (!vaultSec && envSec) || (!vaultWh && envWh))

    const source: OlivePayCredentials['source'] =
        usedVault && usedEnv ? 'mixed' : usedVault ? 'vault' : usedEnv ? 'env' : 'unconfigured'

    const baseUrl = (process.env.OLIVEPAY_BASE_URL || OLIVEPAY_DEFAULT_BASE_URL).replace(/\/$/, '')
    const proxyUrl = process.env.OLIVEPAY_PROXY_URL?.trim() || null

    return { publicKey, secretKey, webhookSecret, baseUrl, proxyUrl, source }
}

/**
 * Determine whether financial calls should route to Live OlivePay or Internal Sandbox Testing Rail.
 * Checks persistent platform config first, then `OLIVEPAY_RAIL_MODE` env, defaulting safely:
 *  - If user selected `sandbox_simulator` in Superadmin Infrastructure → `sandbox_simulator`
 *  - If user selected `olivepay` AND live credentials exist → `olivepay`
 *  - If live credentials are NOT yet configured → gracefully runs on `sandbox_simulator`
 */
export async function resolveActiveOlivePayRailMode(forceSandbox?: boolean): Promise<OlivePayRailMode> {
    if (forceSandbox) return 'sandbox_simulator'
    const railCfg = await getPlatformConfig<{ provider?: string; olivepaySandboxFallback?: boolean }>(
        'partner_bank',
        {}
    )
    const activeProvider = (railCfg.provider || process.env.COPTELLER_PARTNER_BANK_PROVIDER || '').toLowerCase()
    if (activeProvider === 'sandbox_simulator') return 'sandbox_simulator'
    if (process.env.OLIVEPAY_MODE?.toLowerCase() === 'sandbox') return 'sandbox_simulator'

    const creds = await resolveOlivePayCredentials()
    if (activeProvider === 'olivepay' && creds.publicKey && creds.secretKey) {
        return 'olivepay'
    }
    if (creds.publicKey && creds.secretKey && process.env.OLIVEPAY_MODE?.toLowerCase() === 'live') {
        return 'olivepay'
    }
    return 'sandbox_simulator'
}

/**
 * Low-level HTTP transport that transparently supports optional `OLIVEPAY_PROXY_URL`
 * (HTTP CONNECT tunnel for static egress IP on Vercel via QuotaGuard / Fixie / custom proxy)
 * with ZERO external package dependencies.
 */
async function olivePayRawRequest(params: {
    url: string
    method: string
    headers: Record<string, string>
    body?: string | Buffer
    proxyUrl?: string | null
    timeoutMs?: number
}): Promise<{ status: number; text: string }> {
    const { url, method, headers, body, proxyUrl, timeoutMs = 20_000 } = params

    if (!proxyUrl) {
        const res = await fetch(url, {
            method,
            headers,
            body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : (body as any),
            cache: 'no-store',
            signal: AbortSignal.timeout(timeoutMs),
        })
        const text = await res.text()
        return { status: res.status, text }
    }

    // Optional HTTP CONNECT static egress proxy tunnel (for Vercel static IP whitelisting)
    const target = new URL(url)
    const proxy = new URL(proxyUrl)
    const targetPort = Number(target.port) || (target.protocol === 'https:' ? 443 : 80)
    const proxyPort = Number(proxy.port) || (proxy.protocol === 'https:' ? 443 : 80)

    const proxyAuth =
        proxy.username || proxy.password
            ? `Basic ${Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString('base64')}`
            : null

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`OlivePay proxy request timed out after ${timeoutMs}ms`)), timeoutMs)
        const connectReq = (proxy.protocol === 'https:' ? https : http).request({
            host: proxy.hostname,
            port: proxyPort,
            method: 'CONNECT',
            path: `${target.hostname}:${targetPort}`,
            headers: {
                Host: `${target.hostname}:${targetPort}`,
                ...(proxyAuth ? { 'Proxy-Authorization': proxyAuth } : {}),
            },
        })

        connectReq.on('connect', (res, socket) => {
            if (res.statusCode !== 200) {
                clearTimeout(timer)
                socket.destroy()
                return reject(new Error(`Static egress proxy CONNECT failed with HTTP ${res.statusCode}`))
            }

            const tlsSocket =
                target.protocol === 'https:'
                    ? tls.connect({ socket, servername: target.hostname })
                    : socket

            const reqHeaders: Record<string, string> = { ...headers }
            if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
                reqHeaders['Content-Length'] = String(Buffer.byteLength(body))
            }

            const innerReq = (target.protocol === 'https:' ? https : http).request(
                {
                    host: target.hostname,
                    port: targetPort,
                    path: `${target.pathname}${target.search}`,
                    method,
                    headers: reqHeaders,
                    createConnection: () => tlsSocket as any,
                },
                (innerRes) => {
                    const chunks: Buffer[] = []
                    innerRes.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
                    innerRes.on('end', () => {
                        clearTimeout(timer)
                        resolve({
                            status: innerRes.statusCode || 500,
                            text: Buffer.concat(chunks).toString('utf8'),
                        })
                    })
                }
            )

            innerReq.on('error', (err) => {
                clearTimeout(timer)
                reject(err)
            })
            if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
                innerReq.write(body)
            }
            innerReq.end()
        })

        connectReq.on('error', (err) => {
            clearTimeout(timer)
            reject(err)
        })
        connectReq.end()
    })
}

/**
 * Exchange `public_key` + `private_key` via `POST /api/v1/auth/token` (application/x-www-form-urlencoded)
 * and cache the 60-minute JWT for 55 minutes in memory, deduplicating concurrent refreshes.
 */
export async function getOlivePayJwt(forceRefresh = false): Promise<string> {
    const creds = await resolveOlivePayCredentials()
    if (!creds.publicKey || !creds.secretKey) {
        throw new Error('OlivePay credentials (OLIVEPAY_PUBLIC_KEY and OLIVEPAY_SECRET_KEY) are not configured in Vault or environment.')
    }

    const fingerprint = crypto
        .createHash('sha256')
        .update(`${creds.publicKey}:${creds.secretKey}:${creds.baseUrl}`)
        .digest('hex')
        .slice(0, 16)

    if (
        !forceRefresh &&
        g.__olivepayJwtCache &&
        g.__olivepayJwtCache.keyFingerprint === fingerprint &&
        g.__olivepayJwtCache.expiresAt > Date.now() + 60_000
    ) {
        return g.__olivepayJwtCache.token
    }

    if (g.__olivepayJwtInFlight) {
        return g.__olivepayJwtInFlight
    }

    g.__olivepayJwtInFlight = (async () => {
        try {
            const formBody = new URLSearchParams({
                public_key: creds.publicKey!,
                private_key: creds.secretKey!,
            }).toString()

            const { status, text } = await olivePayRawRequest({
                url: `${creds.baseUrl}/api/v1/auth/token`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                body: formBody,
                proxyUrl: creds.proxyUrl,
            })

            let parsed: any = {}
            try { parsed = JSON.parse(text) } catch { parsed = { raw: text } }

            const token =
                typeof parsed?.data === 'string'
                    ? parsed.data
                    : parsed?.data?.token || parsed?.token || null

            if (status < 200 || status >= 300 || !token) {
                throw new Error(
                    `OlivePay auth token failed (HTTP ${status}): ${parsed?.message || text.slice(0, 200)}`
                )
            }

            g.__olivepayJwtCache = {
                token,
                expiresAt: Date.now() + 55 * 60_000, // 55 mins (JWT expires at 60 mins)
                keyFingerprint: fingerprint,
            }
            return token
        } finally {
            g.__olivepayJwtInFlight = null
        }
    })()

    return g.__olivepayJwtInFlight
}

// =============================================================================
// LIVE DISPATCHER (EXACT-BYTES SINGLE-SERIALIZATION SIGNING)
// =============================================================================

export async function dispatchLiveOlivePay<T = any>(params: {
    path: string
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    authMode: OlivePayAuthMode
    query?: Record<string, any>
    body?: any
    idempotencyKey?: string
    multipartBody?: FormData
}): Promise<OlivePayEnvelope<T>> {
    const creds = await resolveOlivePayCredentials()
    const cleanPath = params.path.startsWith('/') ? params.path : `/${params.path}`
    let url = `${creds.baseUrl}${cleanPath}`

    if (params.query && Object.keys(params.query).length > 0) {
        const sp = new URLSearchParams()
        for (const [k, v] of Object.entries(params.query)) {
            if (v !== undefined && v !== null && v !== '') {
                sp.append(k, String(v))
            }
        }
        const qs = sp.toString()
        if (qs) url += `${url.includes('?') ? '&' : '?'}${qs}`
    }

    const isBodyless = ['GET', 'HEAD'].includes(params.method)
    // CRITICAL: Serialize JSON body ONCE and reuse exact string for BOTH HMAC and HTTP body!
    const exactRawBody = isBodyless || params.multipartBody ? '' : JSON.stringify(params.body ?? {})

    const execOnce = async (retryAuth = false): Promise<OlivePayEnvelope<T>> => {
        const headers: Record<string, string> = {
            Accept: 'application/json',
        }
        if (!isBodyless && !params.multipartBody) {
            headers['Content-Type'] = 'application/json'
        }
        if (params.idempotencyKey) {
            headers['Idempotency-Key'] = params.idempotencyKey
        }

        if (params.authMode === 'OLIVEPAY_PUBLIC_BEARER') {
            if (!creds.publicKey) {
                throw new Error('OLIVEPAY_PUBLIC_KEY is required for Collections API calls.')
            }
            headers['Authorization'] = `Bearer ${creds.publicKey}`
        } else if (params.authMode === 'OLIVEPAY_JWT' || params.authMode === 'OLIVEPAY_JWT_HMAC') {
            const jwt = await getOlivePayJwt(retryAuth)
            headers['Authorization'] = `Bearer ${jwt}`

            if (params.authMode === 'OLIVEPAY_JWT_HMAC') {
                if (!creds.secretKey) {
                    throw new Error('OLIVEPAY_SECRET_KEY is required for HMAC-signed OlivePay calls.')
                }
                const ts = Math.floor(Date.now() / 1000).toString()
                const sig = computeOlivePaySignature(creds.secretKey, ts, exactRawBody)
                headers['X-Olivepay-Timestamp'] = ts
                headers['X-Olivepay-Signature'] = sig
            }
        }

        // Multipart uploads use native fetch directly
        if (params.multipartBody) {
            const res = await fetch(url, {
                method: params.method,
                headers,
                body: params.multipartBody,
                cache: 'no-store',
                signal: AbortSignal.timeout(25_000),
            })
            const text = await res.text()
            let parsed: any = text
            try { parsed = JSON.parse(text) } catch {}
            return parseOlivePayResponse<T>(res.status, parsed, 'olivepay')
        }

        const { status, text } = await olivePayRawRequest({
            url,
            method: params.method,
            headers,
            body: isBodyless ? undefined : exactRawBody,
            proxyUrl: creds.proxyUrl,
        })

        // Auto-retry once on 401 when JWT expired mid-flight
        if (status === 401 && !retryAuth && (params.authMode === 'OLIVEPAY_JWT' || params.authMode === 'OLIVEPAY_JWT_HMAC')) {
            return execOnce(true)
        }

        let parsed: any = text
        try { parsed = JSON.parse(text) } catch {}
        return parseOlivePayResponse<T>(status, parsed, 'olivepay')
    }

    return execOnce(false)
}

// =============================================================================
// INTERNAL SANDBOX / TESTING RAIL (100% REALISTIC OLIVEPAY EMULATION IN POSTGRES)
// =============================================================================

function generateSandboxNuban(seedStr: string): string {
    const hash = crypto.createHash('sha256').update(seedStr).digest('hex')
    const digits = BigInt('0x' + hash.slice(0, 12)).toString().padStart(8, '0').slice(0, 8)
    return `98${digits}`
}

async function computeSandboxFee(amountNaira: number): Promise<{
    amount: number
    processingFee: number
    vat: number
    totalDebit: number
}> {
    const processingFee = amountNaira <= 5000 ? 10 : amountNaira <= 50000 ? 25 : 50
    const vat = Number((processingFee * 0.075).toFixed(2))
    const totalDebit = Number((amountNaira + processingFee + vat).toFixed(2))
    return { amount: amountNaira, processingFee, vat, totalDebit }
}

/**
 * Full-featured internal Sandbox / Testing Rail that faithfully implements EVERY
 * OlivePay endpoint, state transition, KYC tier limit, escrow hold, fee estimate,
 * dynamic virtual account, and idempotency code in Copteller Postgres!
 */
export async function dispatchSandboxOlivePay<T = any>(params: {
    path: string
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    query?: Record<string, any>
    body?: any
    idempotencyKey?: string
}): Promise<OlivePayEnvelope<T>> {
    await ensureOlivePayTables()
    const cleanPath = (params.path.startsWith('/') ? params.path : `/${params.path}`).replace(/\?.*$/, '')
    const method = params.method.toUpperCase()
    const body = params.body || {}
    const query = params.query || {}

    const ok = <D>(data: D, message = 'Success', responseCode = '00', httpStatus = 200): OlivePayEnvelope<any> =>
        parseOlivePayResponse(httpStatus, { status: true, responseCode, message, data }, 'sandbox_simulator')

    const fail = (message: string, responseCode = '02', httpStatus = 400, data: any = null): OlivePayEnvelope<any> =>
        parseOlivePayResponse(httpStatus, { status: false, responseCode, message, data }, 'sandbox_simulator')

    // 1. Auth token
    if (cleanPath === '/api/v1/auth/token' && method === 'POST') {
        const fakeJwt = `sandbox_jwt_${crypto.randomBytes(16).toString('hex')}`
        return ok(fakeJwt, 'Sandbox token issued')
    }

    // 2. Collections: Initialize & InitializeRecurring
    if ((cleanPath === '/api/v1/Payments/Initialize' || cleanPath === '/api/v1/Payments/InitializeRecurring') && method === 'POST') {
        const txId = String(body.transactionId || generateOlivePayTransactionId('COL'))
        const amountKobo = nairaToKobo(body.amount || '0')
        const accessCode = `sbx_acc_${crypto.randomBytes(6).toString('hex')}`
        const recurringId = body.reccurringID || body.recurringID || null
        const callbackUrl = String(body.callbackUrl || '/copteller/wallet/callback')
        const paymentUrl = `/copteller/wallet/sandbox-checkout?transactionId=${encodeURIComponent(txId)}&amount=${encodeURIComponent(koboToNairaString(amountKobo))}&callbackUrl=${encodeURIComponent(callbackUrl)}`

        await queryCopteller(
            `INSERT INTO copteller.olivepay_collections
             (transaction_id, access_code, payment_url, recurring_id, amount_kobo, currency, status, is_successful, rail_mode, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending', FALSE, 'sandbox_simulator', $7::jsonb)
             ON CONFLICT (transaction_id) DO UPDATE
             SET payment_url = EXCLUDED.payment_url, updated_at = NOW()`,
            [txId, accessCode, paymentUrl, recurringId, amountKobo, body.currency || 'NGN', JSON.stringify(body.metadata || {})]
        )

        return ok({
            paymentUrl,
            accessCode,
            transactionId: txId,
            ...(recurringId ? { reccurringID: recurringId } : {}),
        }, 'Payment initialized in Sandbox Testing Rail')
    }

    // 3. Collections: VerifyPayment
    if (cleanPath === '/api/v1/Payments/VerifyPayment' && method === 'POST') {
        const txId = String(body.transactionId || '')
        const res = await queryCopteller(
            `SELECT * FROM copteller.olivepay_collections WHERE transaction_id = $1 LIMIT 1`,
            [txId]
        )
        const row = res.rows[0]
        if (!row) return fail(`Collection ${txId} not found`, '04', 404)
        return ok({
            transactionId: row.transaction_id,
            amount: koboToNairaString(Number(row.amount_kobo)),
            currency: row.currency || 'NGN',
            status: row.status,
            isSuccessful: Boolean(row.is_successful),
            paymentReference: row.payment_reference || `SBX-PAY-${row.id}`,
            paidAt: row.verified_at || row.updated_at,
        })
    }

    // 4. Payouts: NIP Bank List
    if (cleanPath === '/api/v1/merchant-api/payouts/banks' && method === 'GET') {
        const banksRes = await queryCopteller(
            `SELECT bank_code AS code, bank_name AS name, short_code AS "shortCode" FROM copteller.olivepay_banks_cache WHERE is_active = TRUE ORDER BY bank_name ASC`
        )
        const rows = banksRes.rows.length > 0 ? banksRes.rows : NIGERIAN_NIP_BANKS_6DIGIT
        return ok(rows, 'NIP banks fetched from Sandbox Testing Rail')
    }

    // 5. Payouts: Name Enquiry (free, 30 rpm on live)
    if (cleanPath === '/api/v1/merchant-api/payouts/name-enquiry' && method === 'POST') {
        const accountNumber = String(body.accountNumber || '').replace(/\D/g, '')
        const bankCode = String(body.bankCode || '000014')
        if (accountNumber.length !== 10) {
            return fail('Account number must be 10 digits', '03', 400)
        }

        // Check local olivepay_subwallets or copteller.accounts first!
        const swRes = await queryCopteller(
            `SELECT first_name, last_name, virtual_account_name, virtual_account_bank_name
             FROM copteller.olivepay_subwallets WHERE virtual_account_number = $1 LIMIT 1`,
            [accountNumber]
        )
        const bankRow = NIGERIAN_NIP_BANKS_6DIGIT.find((b) => b.code === bankCode || b.shortCode === bankCode)
        const bankName = bankRow?.name || 'Nigerian Commercial Bank'

        let accountName = ''
        if (swRes.rows[0]) {
            accountName = swRes.rows[0].virtual_account_name || `${swRes.rows[0].first_name || ''} ${swRes.rows[0].last_name || ''}`.trim()
        } else {
            const accRes = await queryCopteller(
                `SELECT c.first_name, c.last_name
                 FROM copteller.accounts a
                 LEFT JOIN copteller.customers c ON c.id = a.customer_id
                 WHERE a.account_number = $1 LIMIT 1`,
                [accountNumber]
            ).catch(() => ({ rows: [] as any[] }))
            if (accRes.rows[0] && (accRes.rows[0].first_name || accRes.rows[0].last_name)) {
                accountName = `${accRes.rows[0].first_name || ''} ${accRes.rows[0].last_name || ''}`.trim().toUpperCase()
            } else {
                const deterministicPool = [
                    'CHINEDU EMEKA OKAFOR',
                    'NGOZI BLESSING NWANNA',
                    'IBRAHIM MUSA GARBA',
                    'AMAKA FAVOUR EZENWA',
                    'KINGSLEY CHUKWUEMEKA UDEH',
                    'ADEOLA OLUWASEUN BANJO',
                    'METRO TRICYCLE OPERATORS UNION',
                ]
                const idx = accountNumber.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0) % deterministicPool.length
                accountName = deterministicPool[idx]
            }
        }

        await queryCopteller(
            `INSERT INTO copteller.olivepay_name_enquiry_cache (bank_code, account_number, account_name, bank_name, verified_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (bank_code, account_number) DO UPDATE SET account_name = EXCLUDED.account_name, verified_at = NOW()`,
            [bankCode, accountNumber, accountName, bankName]
        )

        return ok({
            accountNumber,
            accountName,
            bankCode: bankRow?.code || bankCode,
            bankName,
        }, 'Name enquiry successful (Sandbox)')
    }

    // 6. Payouts: Master Wallet Balance
    if (cleanPath === '/api/v1/merchant-api/payouts/balance' && method === 'GET') {
        const res = await queryCopteller(`SELECT * FROM copteller.olivepay_sandbox_master WHERE id = 1`)
        const m = res.rows[0] || { available_balance_kobo: 50000000000, currency: 'NGN', status: 'ACTIVE' }
        return ok({
            available_balance: koboToNairaNumber(Number(m.available_balance_kobo)),
            ledger_balance: koboToNairaNumber(Number(m.available_balance_kobo)),
            currency: m.currency || 'NGN',
            status: m.status || 'ACTIVE',
        })
    }

    // 7. Payouts: Fee Estimate
    if (cleanPath === '/api/v1/merchant-api/payouts/fee-estimate' && method === 'POST') {
        const amountNaira = Number(body.amount || 0)
        if (amountNaira <= 0) return fail('Amount must be greater than 0', '03', 400)
        const est = await computeSandboxFee(amountNaira)
        return ok(est, 'Fee estimate calculated (Sandbox)')
    }

    // 8. Payouts: Saved Beneficiaries
    if (cleanPath === '/api/v1/merchant-api/payouts/beneficiaries' && method === 'GET') {
        const search = String(query.search || '').trim().toLowerCase()
        const res = await queryCopteller(
            `SELECT bank_code AS "bankCode", bank_name AS "bankName", account_number AS "accountNumber", account_name AS "accountName", verified_at AS "lastUsedAt"
             FROM copteller.olivepay_name_enquiry_cache ORDER BY verified_at DESC LIMIT 50`
        )
        const items = search
            ? res.rows.filter(
                  (r) =>
                      String(r.accountName).toLowerCase().includes(search) ||
                      String(r.accountNumber).includes(search)
              )
            : res.rows
        return ok(items)
    }

    // 9. Payouts: Merchant Payout (Signed)
    if (cleanPath === '/api/v1/merchant-api/payouts' && method === 'POST') {
        const idemKey = params.idempotencyKey || body.idempotencyKey || generateOlivePayTransactionId('PAY')
        const existing = await queryCopteller(
            `SELECT * FROM copteller.olivepay_payouts WHERE idempotency_key = $1 LIMIT 1`,
            [idemKey]
        )
        if (existing.rows[0]) {
            const p = existing.rows[0]
            return ok(
                {
                    reference: p.olivepay_reference,
                    status: p.status,
                    amount: koboToNairaNumber(Number(p.amount_kobo)),
                    processingFee: koboToNairaNumber(Number(p.processing_fee_kobo)),
                    vat: koboToNairaNumber(Number(p.vat_kobo)),
                    totalDebit: koboToNairaNumber(Number(p.total_debit_kobo)),
                },
                'Idempotent replay',
                '11'
            )
        }

        // Enforce OlivePay rule: block NIP payout to own virtual account!
        const ownVa = await queryCopteller(
            `SELECT id FROM copteller.olivepay_subwallets WHERE virtual_account_number = $1 LIMIT 1`,
            [String(body.destinationAccountNumber || '')]
        )
        if (ownVa.rows.length > 0) {
            return fail(
                'Cannot send NIP payout to your own OlivePay Virtual Account. Use /api/v1/merchant-api/subwallet-funding instead.',
                '03',
                400
            )
        }

        const amountNaira = Number(body.amount || 0)
        const est = await computeSandboxFee(amountNaira)
        const totalDebitKobo = nairaToKobo(est.totalDebit)
        const narration = normalizeOlivePayNarration(body.narration)
        const ref = `OP-PAY-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`

        const isSimPending = narration.includes('SIM_PENDING')
        const isSimFail = narration.includes('SIM_FAIL')

        if (isSimFail) {
            return fail('Simulated NIP bank rejection (SIM_FAIL)', '02', 400)
        }

        return await withCoptellerTransaction(async (client) => {
            const mRes = await client.query(`SELECT available_balance_kobo, status FROM copteller.olivepay_sandbox_master WHERE id = 1 FOR UPDATE`)
            const masterBal = Number(mRes.rows[0]?.available_balance_kobo || 0)
            if (masterBal < totalDebitKobo) {
                return fail('Insufficient Master Treasury balance in Sandbox', '02', 400)
            }

            await client.query(
                `UPDATE copteller.olivepay_sandbox_master SET available_balance_kobo = available_balance_kobo - $1, updated_at = NOW() WHERE id = 1`,
                [totalDebitKobo]
            )

            const finalStatus = isSimPending ? 'PENDING' : 'SUCCESS'
            const responseCode = isSimPending ? '09' : '00'

            await client.query(
                `INSERT INTO copteller.olivepay_payouts
                 (rail, idempotency_key, olivepay_reference, external_reference, provider_reference,
                  destination_bank_code, destination_account_number, beneficiary_name, narration,
                  amount_kobo, processing_fee_kobo, vat_kobo, total_debit_kobo, response_code, status, rail_mode)
                 VALUES ('merchant_payout', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'sandbox_simulator')`,
                [
                    idemKey,
                    ref,
                    body.reference || idemKey,
                    `NIP-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
                    body.destinationBankCode || '',
                    body.destinationAccountNumber || '',
                    body.beneficiaryName || 'Verified Beneficiary',
                    narration,
                    nairaToKobo(amountNaira),
                    nairaToKobo(est.processingFee),
                    nairaToKobo(est.vat),
                    totalDebitKobo,
                    responseCode,
                    finalStatus,
                ]
            )

            return ok(
                {
                    reference: ref,
                    status: finalStatus,
                    amount: amountNaira,
                    processingFee: est.processingFee,
                    vat: est.vat,
                    totalDebit: est.totalDebit,
                    destinationAccountNumber: body.destinationAccountNumber,
                    destinationBankCode: body.destinationBankCode,
                    narration,
                },
                isSimPending ? 'Payout pending settlement (Sandbox)' : 'Payout settled (Sandbox)',
                responseCode
            )
        })
    }

    // 10. Payout Status (Merchant & SubWallet & SWF Funding)
    const merchantPayoutStatusMatch = cleanPath.match(/^\/api\/v1\/merchant-api\/payouts\/([^/]+)\/status$/)
    const subwalletPayoutStatusMatch = cleanPath.match(/^\/api\/v1\/subwallet\/payout\/([^/]+)\/status$/)
    const swfStatusMatch = cleanPath.match(/^\/api\/v1\/merchant-api\/subwallet-funding\/([^/]+)\/status$/)
    if ((merchantPayoutStatusMatch || subwalletPayoutStatusMatch || swfStatusMatch) && method === 'GET') {
        const ref = decodeURIComponent((merchantPayoutStatusMatch || subwalletPayoutStatusMatch || swfStatusMatch)![1])
        const res = await queryCopteller(
            `SELECT * FROM copteller.olivepay_payouts WHERE olivepay_reference = $1 OR external_reference = $1 OR idempotency_key = $1 LIMIT 1`,
            [ref]
        )
        const p = res.rows[0]
        if (!p) return fail(`Reference ${ref} not found`, '04', 404)
        return ok({
            reference: p.olivepay_reference,
            externalReference: p.external_reference,
            providerReference: p.provider_reference,
            status: p.status,
            amount: koboToNairaNumber(Number(p.amount_kobo)),
            processingFee: koboToNairaNumber(Number(p.processing_fee_kobo)),
            vat: koboToNairaNumber(Number(p.vat_kobo)),
            totalDebit: koboToNairaNumber(Number(p.total_debit_kobo)),
            destinationAccountNumber: p.destination_account_number,
            beneficiaryName: p.beneficiary_name,
        })
    }

    // 11. SubWallet: Create SubWallet
    if (cleanPath === '/api/v1/subwallet' && method === 'POST') {
        const holderRef = String(body.walletHolderReference || `holder_${Date.now()}`)
        const existing = await queryCopteller(
            `SELECT * FROM copteller.olivepay_subwallets WHERE wallet_holder_reference = $1 LIMIT 1`,
            [holderRef]
        )
        if (existing.rows[0]) {
            const w = existing.rows[0]
            return ok(formatSandboxSubWallet(w), 'Existing sub-wallet returned')
        }

        const subWalletId = crypto.randomUUID()
        const nuban = generateSandboxNuban(`${holderRef}:${Date.now()}`)
        const requestedTier = Number(body.tier?.requestedTier || 1)
        const ninProvided = Boolean(body.nin || body.tier?.nin)
        const tier = requestedTier >= 2 && ninProvided ? 2 : 1
        const tierLimits = TIER_LIMITS_NAIRA[tier]
        const fullName = `${body.firstName || 'Copteller'} ${body.lastName || 'Member'}`.trim()

        const ins = await queryCopteller(
            `INSERT INTO copteller.olivepay_subwallets
             (entity_type, olivepay_sub_wallet_id, wallet_holder_reference, first_name, last_name, email, phone_number,
              virtual_account_number, virtual_account_name, virtual_account_bank_name, virtual_account_bank_code,
              status, can_payout, tier, tier_limits, available_today_kobo, bvn_verified, nin_verified, rail_mode)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OlivePay Sandbox Bank', '999999',
                     'Active', $10, $11, $12::jsonb, $13, $14, $15, 'sandbox_simulator')
             RETURNING *`,
            [
                holderRef.startsWith('coop_') ? 'cooperative' : 'member',
                subWalletId,
                holderRef,
                body.firstName || 'Copteller',
                body.lastName || 'Member',
                body.email || null,
                body.phoneNumber || null,
                nuban,
                `${fullName.toUpperCase()} / COPTELLER`,
                body.canPayout !== false,
                tier,
                JSON.stringify(tierLimits),
                nairaToKobo(tierLimits.daily_debit),
                Boolean(body.bvn),
                ninProvided,
            ]
        )
        return ok(formatSandboxSubWallet(ins.rows[0]), 'SubWallet provisioned in Sandbox Testing Rail')
    }

    // 12. SubWallet: List SubWallets
    if (cleanPath === '/api/v1/subwallet' && method === 'GET') {
        const res = await queryCopteller(`SELECT * FROM copteller.olivepay_subwallets ORDER BY created_at DESC LIMIT 100`)
        return ok(res.rows.map(formatSandboxSubWallet))
    }

    // 13. SubWallet: Hold Settings & Commission Configurations
    if (cleanPath === '/api/v1/subwallet/hold-settings' && method === 'GET') {
        const mRes = await queryCopteller(`SELECT holds_enabled FROM copteller.olivepay_sandbox_master WHERE id = 1`)
        return ok({ holds_enabled: mRes.rows[0]?.holds_enabled !== false, rail: 'sandbox_simulator' })
    }
    if (cleanPath === '/api/v1/subwallet/commission-configurations' && method === 'GET') {
        const mRes = await queryCopteller(`SELECT commission_config FROM copteller.olivepay_sandbox_master WHERE id = 1`)
        return ok(mRes.rows[0]?.commission_config || {})
    }

    // 14. SubWallet: Wallet-to-Wallet Transfer
    if (cleanPath === '/api/v1/subwallet/transfer' && method === 'POST') {
        const idemKey = String(body.idempotencyKey || params.idempotencyKey || generateOlivePayTransactionId('W2W'))
        const existing = await queryCopteller(`SELECT * FROM copteller.olivepay_payouts WHERE idempotency_key = $1 LIMIT 1`, [idemKey])
        if (existing.rows[0]) {
            return ok({ reference: existing.rows[0].olivepay_reference, status: existing.rows[0].status, amount: koboToNairaNumber(Number(existing.rows[0].amount_kobo)) }, 'Idempotent replay', '11')
        }

        const amountKobo = nairaToKobo(body.amount || 0)
        if (amountKobo <= 0) return fail('Transfer amount must be positive', '03', 400)

        return await withCoptellerTransaction(async (client) => {
            const srcRes = await client.query(`SELECT * FROM copteller.olivepay_subwallets WHERE olivepay_sub_wallet_id = $1 FOR UPDATE`, [body.sourceSubWalletId])
            const dstRes = await client.query(`SELECT * FROM copteller.olivepay_subwallets WHERE olivepay_sub_wallet_id = $1 FOR UPDATE`, [body.destinationSubWalletId])
            const src = srcRes.rows[0]
            const dst = dstRes.rows[0]
            if (!src || !dst) return fail('Source or destination SubWallet not found', '04', 404)
            if (src.is_tier_locked) return fail('Source wallet is tier-locked. Upgrade KYC tier to debit.', '13', 400)
            if (src.is_admin_frozen) return fail('Source wallet is frozen', '02', 403)
            if (Number(src.available_balance_kobo) < amountKobo) return fail('Insufficient available balance', '02', 400)

            const srcLimits = src.tier_limits || TIER_LIMITS_NAIRA[src.tier || 1]
            if (amountKobo > nairaToKobo(srcLimits.daily_debit || 50000)) {
                return fail('Transfer exceeds KYC tier daily debit limit', '12', 400)
            }

            await client.query(
                `UPDATE copteller.olivepay_subwallets
                 SET available_balance_kobo = available_balance_kobo - $1,
                     ledger_balance_kobo = ledger_balance_kobo - $1,
                     updated_at = NOW()
                 WHERE olivepay_sub_wallet_id = $2`,
                [amountKobo, src.olivepay_sub_wallet_id]
            )

            const dstLimits = dst.tier_limits || TIER_LIMITS_NAIRA[dst.tier || 1]
            const newDstBal = Number(dst.ledger_balance_kobo) + amountKobo
            const triggersTierLock = newDstBal > nairaToKobo(dstLimits.max_balance || 300000)

            await client.query(
                `UPDATE copteller.olivepay_subwallets
                 SET available_balance_kobo = available_balance_kobo + $1,
                     ledger_balance_kobo = ledger_balance_kobo + $1,
                     is_tier_locked = is_tier_locked OR $2,
                     updated_at = NOW()
                 WHERE olivepay_sub_wallet_id = $3`,
                [amountKobo, triggersTierLock, dst.olivepay_sub_wallet_id]
            )

            const ref = `W2W-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
            await client.query(
                `INSERT INTO copteller.olivepay_payouts
                 (rail, idempotency_key, olivepay_reference, source_sub_wallet_id, destination_sub_wallet_id,
                  narration, amount_kobo, total_debit_kobo, response_code, status, rail_mode)
                 VALUES ('subwallet_transfer', $1, $2, $3, $4, $5, $6, $6, '00', 'SUCCESS', 'sandbox_simulator')`,
                [idemKey, ref, src.olivepay_sub_wallet_id, dst.olivepay_sub_wallet_id, normalizeOlivePayNarration(body.narration || 'W2W Transfer'), amountKobo]
            )

            return ok({
                reference: ref,
                status: 'SUCCESS',
                amount: koboToNairaNumber(amountKobo),
                commission_amount: 0,
                sourceSubWalletId: src.olivepay_sub_wallet_id,
                destinationSubWalletId: dst.olivepay_sub_wallet_id,
                destinationTierLocked: triggersTierLock,
            })
        })
    }

    // 15. Main Wallet → SubWallet Funding (Signed, Zero-Priced, SWF-...)
    if (cleanPath === '/api/v1/merchant-api/subwallet-funding' && method === 'POST') {
        const idemKey = params.idempotencyKey || body.idempotencyKey || generateOlivePayTransactionId('SWF')
        const existing = await queryCopteller(`SELECT * FROM copteller.olivepay_payouts WHERE idempotency_key = $1 LIMIT 1`, [idemKey])
        if (existing.rows[0]) {
            return ok({ reference: existing.rows[0].olivepay_reference, status: existing.rows[0].status }, 'Idempotent replay', '11')
        }
        const amountKobo = nairaToKobo(body.amount || 0)
        if (amountKobo <= 0) return fail('Funding amount must be positive', '03', 400)

        return await withCoptellerTransaction(async (client) => {
            const dstRes = await client.query(`SELECT * FROM copteller.olivepay_subwallets WHERE olivepay_sub_wallet_id = $1 FOR UPDATE`, [body.subWalletId])
            const dst = dstRes.rows[0]
            if (!dst) return fail('Destination SubWallet not found', '04', 404)

            await client.query(
                `UPDATE copteller.olivepay_sandbox_master SET available_balance_kobo = available_balance_kobo - $1, updated_at = NOW() WHERE id = 1`,
                [amountKobo]
            )
            await client.query(
                `UPDATE copteller.olivepay_subwallets
                 SET available_balance_kobo = available_balance_kobo + $1,
                     ledger_balance_kobo = ledger_balance_kobo + $1,
                     updated_at = NOW()
                 WHERE olivepay_sub_wallet_id = $2`,
                [amountKobo, dst.olivepay_sub_wallet_id]
            )

            const ref = `SWF-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
            await client.query(
                `INSERT INTO copteller.olivepay_payouts
                 (rail, idempotency_key, olivepay_reference, destination_sub_wallet_id, narration,
                  amount_kobo, total_debit_kobo, response_code, status, rail_mode)
                 VALUES ('subwallet_funding', $1, $2, $3, $4, $5, $5, '00', 'SETTLED', 'sandbox_simulator')`,
                [idemKey, ref, dst.olivepay_sub_wallet_id, normalizeOlivePayNarration(body.narration || 'Treasury Funding'), amountKobo]
            )

            return ok({
                reference: ref,
                status: 'SETTLED',
                amount: koboToNairaNumber(amountKobo),
                fee: 0,
                subWalletId: dst.olivepay_sub_wallet_id,
            })
        })
    }

    // 16. SubWallet By ID & Actions (Details, Tier Upgrade, Documents, Payout, Holds)
    const swDetailMatch = cleanPath.match(/^\/api\/v1\/subwallet\/([^/]+)$/)
    if (swDetailMatch && method === 'GET') {
        const id = decodeURIComponent(swDetailMatch[1])
        const res = await queryCopteller(`SELECT * FROM copteller.olivepay_subwallets WHERE olivepay_sub_wallet_id = $1 LIMIT 1`, [id])
        if (!res.rows[0]) return fail('SubWallet not found', '04', 404)
        return ok(formatSandboxSubWallet(res.rows[0]))
    }

    const swTierUpgradeMatch = cleanPath.match(/^\/api\/v1\/subwallet\/([^/]+)\/tier-upgrade$/)
    if (swTierUpgradeMatch && method === 'POST') {
        const id = decodeURIComponent(swTierUpgradeMatch[1])
        const targetTier = Number(body.targetTier || body.requestedTier || 2)
        const res = await queryCopteller(`SELECT * FROM copteller.olivepay_subwallets WHERE olivepay_sub_wallet_id = $1 LIMIT 1`, [id])
        const w = res.rows[0]
        if (!w) return fail('SubWallet not found', '04', 404)

        if (targetTier === 2) {
            if (!body.nin || String(body.nin).replace(/\D/g, '').length !== 11) {
                return fail('Valid 11-digit NIN is required for Tier 2 upgrade', '03', 400)
            }
            const limits = TIER_LIMITS_NAIRA[2]
            await queryCopteller(
                `UPDATE copteller.olivepay_subwallets
                 SET tier = 2, tier_limits = $1::jsonb, nin_verified = TRUE, is_tier_locked = FALSE,
                     available_today_kobo = $2, pending_tier_upgrade = NULL, updated_at = NOW()
                 WHERE olivepay_sub_wallet_id = $3`,
                [JSON.stringify(limits), nairaToKobo(limits.daily_debit), id]
            )
            return ok({ subWalletId: id, tier: 2, status: 'APPROVED', tier_limits: limits, is_tier_locked: false }, 'Tier 2 NIN upgrade approved instantaneously (Sandbox)')
        }

        // Tier 3 (instant if attestation/auto-approve, else queued with requestId for document upload)
        const requestId = `TIU-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
        const pendingObj = { requestId, requestedTier: 3, status: 'PENDING_DOCUMENTS', createdAt: new Date().toISOString() }
        if (body.attestation?.verifiedByMerchant) {
            const limits = TIER_LIMITS_NAIRA[3]
            await queryCopteller(
                `UPDATE copteller.olivepay_subwallets
                 SET tier = 3, tier_limits = $1::jsonb, is_tier_locked = FALSE,
                     available_today_kobo = $2, pending_tier_upgrade = NULL, updated_at = NOW()
                 WHERE olivepay_sub_wallet_id = $3`,
                [JSON.stringify(limits), nairaToKobo(limits.daily_debit), id]
            )
            return ok({ requestId, subWalletId: id, tier: 3, status: 'APPROVED', tier_limits: limits }, 'Tier 3 Delegated KYC upgrade approved (Sandbox)')
        }

        await queryCopteller(
            `UPDATE copteller.olivepay_subwallets SET pending_tier_upgrade = $1::jsonb, updated_at = NOW() WHERE olivepay_sub_wallet_id = $2`,
            [JSON.stringify(pendingObj), id]
        )
        return ok(pendingObj, 'Tier 3 upgrade request created — upload supporting documents')
    }

    const swDocsMatch = cleanPath.match(/^\/api\/v1\/subwallet\/([^/]+)\/tier-upgrade\/documents$/)
    if (swDocsMatch && method === 'POST') {
        const id = decodeURIComponent(swDocsMatch[1])
        const limits = TIER_LIMITS_NAIRA[3]
        await queryCopteller(
            `UPDATE copteller.olivepay_subwallets
             SET tier = 3, tier_limits = $1::jsonb, is_tier_locked = FALSE,
                 available_today_kobo = $2, pending_tier_upgrade = NULL, updated_at = NOW()
             WHERE olivepay_sub_wallet_id = $3`,
            [JSON.stringify(limits), nairaToKobo(limits.daily_debit), id]
        )
        return ok({ subWalletId: id, tier: 3, documentAccepted: true, status: 'APPROVED', tier_limits: limits }, 'Tier 3 KYC document uploaded and verified (Sandbox)')
    }

    const swTierReqMatch = cleanPath.match(/^\/api\/v1\/subwallet\/([^/]+)\/tier-upgrade-requests$/)
    if (swTierReqMatch && method === 'GET') {
        const id = decodeURIComponent(swTierReqMatch[1])
        const res = await queryCopteller(`SELECT pending_tier_upgrade, tier FROM copteller.olivepay_subwallets WHERE olivepay_sub_wallet_id = $1`, [id])
        const reqs = res.rows[0]?.pending_tier_upgrade ? [res.rows[0].pending_tier_upgrade] : []
        return ok(reqs)
    }

    // 17. SubWallet External Bank Payout
    const swPayoutMatch = cleanPath.match(/^\/api\/v1\/subwallet\/([^/]+)\/payout$/)
    if (swPayoutMatch && method === 'POST') {
        const subWalletId = decodeURIComponent(swPayoutMatch[1])
        const idemKey = String(body.idempotencyKey || params.idempotencyKey || generateOlivePayTransactionId('SWP'))
        const existing = await queryCopteller(`SELECT * FROM copteller.olivepay_payouts WHERE idempotency_key = $1 LIMIT 1`, [idemKey])
        if (existing.rows[0]) {
            const p = existing.rows[0]
            return ok({ reference: p.olivepay_reference, status: p.status, amount: koboToNairaNumber(Number(p.amount_kobo)) }, 'Idempotent replay', '11')
        }

        const amountNaira = Number(body.amount || 0)
        const est = await computeSandboxFee(amountNaira)
        const totalDebitKobo = nairaToKobo(est.totalDebit)
        const narration = normalizeOlivePayNarration(body.narration)

        return await withCoptellerTransaction(async (client) => {
            const wRes = await client.query(`SELECT * FROM copteller.olivepay_subwallets WHERE olivepay_sub_wallet_id = $1 FOR UPDATE`, [subWalletId])
            const w = wRes.rows[0]
            if (!w) return fail('SubWallet not found', '04', 404)
            if (w.is_tier_locked) return fail('Wallet is tier-locked. Complete KYC tier upgrade first.', '13', 400)
            if (w.is_admin_frozen) return fail('Wallet is frozen', '02', 403)
            if (!w.can_payout) return fail('Payouts disabled for this sub-wallet', '02', 403)

            const limits = w.tier_limits || TIER_LIMITS_NAIRA[w.tier || 1]
            if (amountNaira > Number(limits.daily_debit || 50000)) {
                return fail(`Amount exceeds Tier ${w.tier} daily debit limit (₦${Number(limits.daily_debit).toLocaleString()})`, '12', 400)
            }
            if (Number(w.available_balance_kobo) < totalDebitKobo) {
                return fail('Insufficient available balance to cover amount + fee + VAT', '02', 400)
            }

            await client.query(
                `UPDATE copteller.olivepay_subwallets
                 SET available_balance_kobo = available_balance_kobo - $1,
                     ledger_balance_kobo = ledger_balance_kobo - $1,
                     updated_at = NOW()
                 WHERE olivepay_sub_wallet_id = $2`,
                [totalDebitKobo, subWalletId]
            )

            const isSimPending = narration.includes('SIM_PENDING')
            const ref = `SWP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
            await client.query(
                `INSERT INTO copteller.olivepay_payouts
                 (rail, idempotency_key, olivepay_reference, source_sub_wallet_id, destination_bank_code,
                  destination_account_number, beneficiary_name, narration, amount_kobo, processing_fee_kobo,
                  vat_kobo, total_debit_kobo, response_code, status, rail_mode)
                 VALUES ('subwallet_payout', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'sandbox_simulator')`,
                [
                    idemKey,
                    ref,
                    subWalletId,
                    body.destinationBankCode || '',
                    body.destinationAccountNumber || '',
                    body.beneficiaryName || 'Verified Recipient',
                    narration,
                    nairaToKobo(amountNaira),
                    nairaToKobo(est.processingFee),
                    nairaToKobo(est.vat),
                    totalDebitKobo,
                    isSimPending ? '09' : '00',
                    isSimPending ? 'PENDING' : 'SUCCESS',
                ]
            )

            return ok(
                {
                    reference: ref,
                    status: isSimPending ? 'PENDING' : 'SUCCESS',
                    amount: amountNaira,
                    processingFee: est.processingFee,
                    vat: est.vat,
                    totalDebit: est.totalDebit,
                },
                isSimPending ? 'SubWallet payout pending (Sandbox)' : 'SubWallet payout settled (Sandbox)',
                isSimPending ? '09' : '00'
            )
        })
    }

    // 18. Escrow Holds: Place / List / Capture / Release / GetByRef
    const swHoldsMatch = cleanPath.match(/^\/api\/v1\/subwallet\/([^/]+)\/holds$/)
    if (swHoldsMatch && method === 'POST') {
        const subWalletId = decodeURIComponent(swHoldsMatch[1])
        const idemKey = String(body.idempotencyKey || params.idempotencyKey || generateOlivePayTransactionId('HLD'))
        const existing = await queryCopteller(`SELECT * FROM copteller.olivepay_holds WHERE idempotency_key = $1 LIMIT 1`, [idemKey])
        if (existing.rows[0]) {
            return ok(formatSandboxHold(existing.rows[0]), 'Idempotent replay', '11')
        }

        const amountKobo = nairaToKobo(body.amount || 0)
        if (amountKobo <= 0) return fail('Hold amount must be positive', '03', 400)

        return await withCoptellerTransaction(async (client) => {
            const wRes = await client.query(`SELECT * FROM copteller.olivepay_subwallets WHERE olivepay_sub_wallet_id = $1 FOR UPDATE`, [subWalletId])
            const w = wRes.rows[0]
            if (!w) return fail('SubWallet not found', '04', 404)
            if (Number(w.available_balance_kobo) < amountKobo) return fail('Insufficient available balance to place escrow hold', '02', 400)

            await client.query(
                `UPDATE copteller.olivepay_subwallets
                 SET available_balance_kobo = available_balance_kobo - $1,
                     lien_balance_kobo = lien_balance_kobo + $1,
                     updated_at = NOW()
                 WHERE olivepay_sub_wallet_id = $2`,
                [amountKobo, subWalletId]
            )

            const holdId = crypto.randomUUID()
            const ref = `HLD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
            const ins = await client.query(
                `INSERT INTO copteller.olivepay_holds
                 (olivepay_hold_id, reference, idempotency_key, external_reference, sub_wallet_id,
                  amount_kobo, status, reason, rail_mode)
                 VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7, 'sandbox_simulator')
                 RETURNING *`,
                [holdId, ref, idemKey, body.externalReference || null, subWalletId, amountKobo, body.reason || 'Copteller Escrow Hold']
            )
            return ok(formatSandboxHold(ins.rows[0]), 'Escrow hold placed in Sandbox')
        })
    }

    if (swHoldsMatch && method === 'GET') {
        const subWalletId = decodeURIComponent(swHoldsMatch[1])
        const res = await queryCopteller(`SELECT * FROM copteller.olivepay_holds WHERE sub_wallet_id = $1 ORDER BY created_at DESC LIMIT 100`, [subWalletId])
        return ok(res.rows.map(formatSandboxHold))
    }

    const holdCaptureMatch = cleanPath.match(/^\/api\/v1\/subwallet\/holds\/([^/]+)\/capture$/)
    if (holdCaptureMatch && method === 'POST') {
        const holdId = decodeURIComponent(holdCaptureMatch[1])
        return await withCoptellerTransaction(async (client) => {
            const hRes = await client.query(
                `SELECT * FROM copteller.olivepay_holds WHERE olivepay_hold_id = $1 OR reference = $1 FOR UPDATE`,
                [holdId]
            )
            const h = hRes.rows[0]
            if (!h) return fail('Hold not found', '04', 404)
            if (h.status !== 'Active') return fail(`Hold is already ${h.status}`, '03', 400)

            const fullHoldKobo = Number(h.amount_kobo)
            const captureKobo = body.captureAmount ? Math.min(fullHoldKobo, nairaToKobo(body.captureAmount)) : fullHoldKobo
            const commissionKobo = body.commissionAmount ? Math.min(captureKobo, nairaToKobo(body.commissionAmount)) : 0
            const remainderKobo = fullHoldKobo - captureKobo
            const netToDestKobo = captureKobo - commissionKobo

            // Release full lien from source, refund any uncaptured remainder to available_balance, reduce ledger by captureKobo
            await client.query(
                `UPDATE copteller.olivepay_subwallets
                 SET lien_balance_kobo = GREATEST(0, lien_balance_kobo - $1),
                     available_balance_kobo = available_balance_kobo + $2,
                     ledger_balance_kobo = GREATEST(0, ledger_balance_kobo - $3),
                     updated_at = NOW()
                 WHERE olivepay_sub_wallet_id = $4`,
                [fullHoldKobo, remainderKobo, captureKobo, h.sub_wallet_id]
            )

            // Credit destination sub-wallet (or master treasury if no destination specified)
            if (body.destinationSubWalletId) {
                await client.query(
                    `UPDATE copteller.olivepay_subwallets
                     SET available_balance_kobo = available_balance_kobo + $1,
                         ledger_balance_kobo = ledger_balance_kobo + $1,
                         updated_at = NOW()
                     WHERE olivepay_sub_wallet_id = $2`,
                    [netToDestKobo, body.destinationSubWalletId]
                )
            } else {
                await client.query(
                    `UPDATE copteller.olivepay_sandbox_master SET available_balance_kobo = available_balance_kobo + $1, updated_at = NOW() WHERE id = 1`,
                    [netToDestKobo]
                )
            }
            if (commissionKobo > 0) {
                await client.query(
                    `UPDATE copteller.olivepay_sandbox_master SET available_balance_kobo = available_balance_kobo + $1, updated_at = NOW() WHERE id = 1`,
                    [commissionKobo]
                )
            }

            const upd = await client.query(
                `UPDATE copteller.olivepay_holds
                 SET status = 'Captured', captured_amount_kobo = $1, commission_amount_kobo = $2,
                     released_amount_kobo = $3, destination_sub_wallet_id = $4, updated_at = NOW()
                 WHERE id = $5 RETURNING *`,
                [captureKobo, commissionKobo, remainderKobo, body.destinationSubWalletId || null, h.id]
            )
            return ok(formatSandboxHold(upd.rows[0]), 'Escrow hold captured (Sandbox)')
        })
    }

    const holdReleaseMatch = cleanPath.match(/^\/api\/v1\/subwallet\/holds\/([^/]+)\/release$/)
    if (holdReleaseMatch && method === 'POST') {
        const holdId = decodeURIComponent(holdReleaseMatch[1])
        return await withCoptellerTransaction(async (client) => {
            const hRes = await client.query(
                `SELECT * FROM copteller.olivepay_holds WHERE olivepay_hold_id = $1 OR reference = $1 FOR UPDATE`,
                [holdId]
            )
            const h = hRes.rows[0]
            if (!h) return fail('Hold not found', '04', 404)
            if (h.status !== 'Active') return fail(`Hold is already ${h.status}`, '03', 400)

            const holdKobo = Number(h.amount_kobo)
            await client.query(
                `UPDATE copteller.olivepay_subwallets
                 SET lien_balance_kobo = GREATEST(0, lien_balance_kobo - $1),
                     available_balance_kobo = available_balance_kobo + $1,
                     updated_at = NOW()
                 WHERE olivepay_sub_wallet_id = $2`,
                [holdKobo, h.sub_wallet_id]
            )

            const upd = await client.query(
                `UPDATE copteller.olivepay_holds
                 SET status = 'Released', released_amount_kobo = $1, updated_at = NOW()
                 WHERE id = $2 RETURNING *`,
                [holdKobo, h.id]
            )
            return ok(formatSandboxHold(upd.rows[0]), 'Escrow hold released back to available balance (Sandbox)')
        })
    }

    const holdGetMatch = cleanPath.match(/^\/api\/v1\/subwallet\/holds\/([^/]+)$/)
    if (holdGetMatch && method === 'GET') {
        const holdRef = decodeURIComponent(holdGetMatch[1])
        const res = await queryCopteller(
            `SELECT * FROM copteller.olivepay_holds WHERE reference = $1 OR olivepay_hold_id = $1 LIMIT 1`,
            [holdRef]
        )
        if (!res.rows[0]) return fail('Hold not found', '04', 404)
        return ok(formatSandboxHold(res.rows[0]))
    }

    // 19. Dynamic One-Time Virtual Accounts (INTEGER KOBO ON THE WIRE!)
    if (cleanPath === '/api/v1/merchant/virtual-accounts' && method === 'POST') {
        const txId = String(body.transactionId || generateOlivePayTransactionId('DVA'))
        const existing = await queryCopteller(`SELECT * FROM copteller.olivepay_virtual_accounts WHERE transaction_id = $1 LIMIT 1`, [txId])
        if (existing.rows[0]) {
            return ok(formatSandboxVa(existing.rows[0]), 'Existing dynamic virtual account returned', '11')
        }

        // Virtual Account API wire amount is INTEGER KOBO!
        const amountKobo = Math.round(Number(body.amount || 0))
        if (amountKobo <= 0) return fail('Virtual Account amount (in kobo) must be positive', '03', 400)
        const feeKobo = Math.min(200_000, Math.round(amountKobo * 0.01)) // 1% capped at ₦2,000
        const chargeBearer = body.applyConvenienceCharge ? 'customer' : 'merchant'
        const amountPayableKobo = chargeBearer === 'customer' ? amountKobo + feeKobo : amountKobo
        const expiresIn = Math.min(1440, Math.max(5, Number(body.expiresInMinutes || 30)))
        const expiresAt = new Date(Date.now() + expiresIn * 60_000)
        const accountNumber = generateSandboxNuban(`DVA:${txId}`)
        const bank = body.bank === 'WEMA' ? 'Wema Bank (Sandbox)' : 'OlivePay Virtual Bank (Sandbox)'
        const bankCode = body.bank === 'WEMA' ? '000017' : '999999'

        const ins = await queryCopteller(
            `INSERT INTO copteller.olivepay_virtual_accounts
             (transaction_id, reference, account_number, account_name, bank_name, bank_code,
              amount_kobo, fee_kobo, amount_payable_kobo, charge_bearer, status, expires_at, metadata, rail_mode)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12::jsonb, 'sandbox_simulator')
             RETURNING *`,
            [
                txId,
                `VA-${Date.now().toString(36).toUpperCase()}`,
                accountNumber,
                String(body.customerName || 'COPTELLER ONE-TIME DEPOSIT').toUpperCase().slice(0, 40),
                bank,
                bankCode,
                amountKobo,
                feeKobo,
                amountPayableKobo,
                chargeBearer,
                expiresAt.toISOString(),
                JSON.stringify(body.metadata || {}),
            ]
        )
        return ok(formatSandboxVa(ins.rows[0]), 'Dynamic Virtual Account generated (Sandbox)')
    }

    const vaGetMatch = cleanPath.match(/^\/api\/v1\/merchant\/virtual-accounts\/([^/]+)$/)
    if (vaGetMatch && method === 'GET') {
        const txId = decodeURIComponent(vaGetMatch[1])
        const res = await queryCopteller(`SELECT * FROM copteller.olivepay_virtual_accounts WHERE transaction_id = $1 LIMIT 1`, [txId])
        if (!res.rows[0]) return fail('Dynamic virtual account not found', '04', 404)
        return ok(formatSandboxVa(res.rows[0]))
    }

    return fail(`Sandbox simulator does not implement ${method} ${cleanPath}`, '04', 404)
}

function formatSandboxSubWallet(w: any) {
    return {
        id: w.olivepay_sub_wallet_id,
        sub_wallet_id: w.olivepay_sub_wallet_id,
        wallet_holder_reference: w.wallet_holder_reference,
        first_name: w.first_name,
        last_name: w.last_name,
        email: w.email,
        phone_number: w.phone_number,
        virtual_account_number: w.virtual_account_number,
        virtual_account_name: w.virtual_account_name,
        virtual_account_bank_name: w.virtual_account_bank_name,
        virtual_account_bank_code: w.virtual_account_bank_code,
        status: w.status,
        can_payout: Boolean(w.can_payout),
        tier: Number(w.tier || 1),
        tier_limits: w.tier_limits || TIER_LIMITS_NAIRA[Number(w.tier || 1)],
        ledger_balance: koboToNairaNumber(Number(w.ledger_balance_kobo || 0)),
        lien_balance: koboToNairaNumber(Number(w.lien_balance_kobo || 0)),
        available_balance: koboToNairaNumber(Number(w.available_balance_kobo || 0)),
        available_today: koboToNairaNumber(Number(w.available_today_kobo || 0)),
        is_tier_locked: Boolean(w.is_tier_locked),
        is_admin_frozen: Boolean(w.is_admin_frozen),
        bvn_verified: Boolean(w.bvn_verified),
        nin_verified: Boolean(w.nin_verified),
        pending_tier_upgrade: w.pending_tier_upgrade || null,
        rail_mode: w.rail_mode || 'sandbox_simulator',
    }
}

function formatSandboxHold(h: any) {
    return {
        id: h.olivepay_hold_id,
        holdId: h.olivepay_hold_id,
        reference: h.reference,
        externalReference: h.external_reference,
        subWalletId: h.sub_wallet_id,
        destinationSubWalletId: h.destination_sub_wallet_id,
        amount: koboToNairaNumber(Number(h.amount_kobo || 0)),
        capturedAmount: koboToNairaNumber(Number(h.captured_amount_kobo || 0)),
        commissionAmount: koboToNairaNumber(Number(h.commission_amount_kobo || 0)),
        releasedAmount: koboToNairaNumber(Number(h.released_amount_kobo || 0)),
        status: h.status,
        reason: h.reason,
        createdAt: h.created_at,
    }
}

function formatSandboxVa(v: any) {
    // Wire contract: integer KOBO!
    return {
        transactionId: v.transaction_id,
        reference: v.reference,
        accountNumber: v.account_number,
        accountName: v.account_name,
        bankName: v.bank_name,
        bankCode: v.bank_code,
        amount: Number(v.amount_kobo),
        fee: Number(v.fee_kobo),
        amountPayable: Number(v.amount_payable_kobo),
        paidAmount: Number(v.paid_amount_kobo || 0),
        chargeBearer: v.charge_bearer,
        status: v.status,
        expiresAt: v.expires_at,
        paidAt: v.paid_at,
        providerReference: v.provider_reference,
    }
}

// =============================================================================
// UNIFIED DISPATCHER (AUTO-ROUTES LIVE OLIVEPAY vs SANDBOX TESTING RAIL)
// =============================================================================

export async function dispatchOlivePayEndpoint<T = any>(params: {
    path: string
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    authMode: OlivePayAuthMode
    query?: Record<string, any>
    body?: any
    pathParams?: Record<string, any>
    idempotencyKey?: string
    multipartBody?: FormData
    forceSandbox?: boolean
}): Promise<OlivePayEnvelope<T>> {
    // Interpolate {pathVar} tokens cleanly
    let resolvedPath = params.path
    if (params.pathParams) {
        resolvedPath = resolvedPath.replace(/\{([^}]+)\}/g, (match, key) => {
            const val = params.pathParams?.[key]
            return val !== undefined && val !== null ? encodeURIComponent(String(val)) : match
        })
    }

    const mode = await resolveActiveOlivePayRailMode(params.forceSandbox)
    if (mode === 'sandbox_simulator') {
        return dispatchSandboxOlivePay<T>({
            path: resolvedPath,
            method: params.method,
            query: params.query,
            body: params.body,
            idempotencyKey: params.idempotencyKey,
        })
    }

    return dispatchLiveOlivePay<T>({
        path: resolvedPath,
        method: params.method,
        authMode: params.authMode,
        query: params.query,
        body: params.body,
        idempotencyKey: params.idempotencyKey,
        multipartBody: params.multipartBody,
    })
}

// =============================================================================
// HIGH-LEVEL TYPED OLIVEPAY CLIENT METHODS (ALL 24 ENDPOINTS)
// =============================================================================

export const olivePayClient = {
    // ── Collections ──────────────────────────────────────────────────────────
    async initializePayment(input: {
        amountKobo: number
        email: string
        name?: string
        phoneNumber?: string
        callbackUrl: string
        transactionId?: string
        isSplitPayment?: boolean
        applyConviniencyCharge?: boolean
        metadata?: Record<string, any>
        forceSandbox?: boolean
    }) {
        const transactionId = input.transactionId || generateOlivePayTransactionId('COL')
        return dispatchOlivePayEndpoint({
            path: '/api/v1/Payments/Initialize',
            method: 'POST',
            authMode: 'OLIVEPAY_PUBLIC_BEARER',
            body: {
                transactionId,
                amount: koboToNairaString(input.amountKobo),
                currency: 'NGN',
                email: input.email,
                name: input.name || 'Copteller Member',
                phoneNumber: input.phoneNumber || '',
                callbackUrl: input.callbackUrl,
                isSplitPayment: Boolean(input.isSplitPayment),
                applyConviniencyCharge: Boolean(input.applyConviniencyCharge),
                metadata: input.metadata || {},
            },
            forceSandbox: input.forceSandbox,
        })
    },

    async initializeRecurringPayment(input: {
        amountKobo: number
        email: string
        reccurringID: string // Exact OlivePay spelling (double 'c')
        callbackUrl: string
        transactionId?: string
        isSplitpayment?: boolean // Exact OlivePay spelling (lowercase 'p')
        applyConviniencyCharge?: boolean
        metadata?: Record<string, any>
        forceSandbox?: boolean
    }) {
        const transactionId = input.transactionId || generateOlivePayTransactionId('REC')
        return dispatchOlivePayEndpoint({
            path: '/api/v1/Payments/InitializeRecurring',
            method: 'POST',
            authMode: 'OLIVEPAY_PUBLIC_BEARER',
            body: {
                transactionId,
                amount: koboToNairaString(input.amountKobo),
                currency: 'NGN',
                email: input.email,
                reccurringID: input.reccurringID,
                callbackUrl: input.callbackUrl,
                isSplitpayment: Boolean(input.isSplitpayment),
                applyConviniencyCharge: Boolean(input.applyConviniencyCharge),
                metadata: input.metadata || {},
            },
            forceSandbox: input.forceSandbox,
        })
    },

    async verifyPayment(transactionId: string, forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/Payments/VerifyPayment',
            method: 'POST',
            authMode: 'OLIVEPAY_PUBLIC_BEARER',
            body: { transactionId },
            forceSandbox,
        })
    },

    // ── Payouts (Signed JWT + HMAC) ──────────────────────────────────────────
    async listBanks(forceSandbox?: boolean) {
        const res = await dispatchOlivePayEndpoint<NipBankEntry[]>({
            path: '/api/v1/merchant-api/payouts/banks',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT_HMAC',
            forceSandbox,
        })
        // Refresh local cache on live success
        if (res.ok && Array.isArray(res.data) && res.data.length > 0 && res.railMode === 'olivepay') {
            await ensureOlivePayTables()
            for (const b of res.data) {
                const code = String((b as any).code || (b as any).bankCode || '')
                const name = String((b as any).name || (b as any).bankName || '')
                if (code && name) {
                    await queryCopteller(
                        `INSERT INTO copteller.olivepay_banks_cache (bank_code, bank_name, is_active, updated_at)
                         VALUES ($1, $2, TRUE, NOW())
                         ON CONFLICT (bank_code) DO UPDATE SET bank_name = EXCLUDED.bank_name, updated_at = NOW()`,
                        [code, name]
                    ).catch(() => {})
                }
            }
        }
        return res
    },

    async nameEnquiry(bankCode: string, accountNumber: string, forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/merchant-api/payouts/name-enquiry',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT_HMAC',
            body: { bankCode, accountNumber },
            forceSandbox,
        })
    },

    async getMasterBalance(forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/merchant-api/payouts/balance',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT_HMAC',
            forceSandbox,
        })
    },

    async estimatePayoutFee(amountKobo: number, forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/merchant-api/payouts/fee-estimate',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT_HMAC',
            body: { amount: koboToNairaNumber(amountKobo) },
            forceSandbox,
        })
    },

    async sendMerchantPayout(input: {
        amountKobo: number
        destinationBankCode: string
        destinationAccountNumber: string
        beneficiaryName: string
        narration: string
        idempotencyKey: string
        reference?: string
        forceSandbox?: boolean
    }) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/merchant-api/payouts',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT_HMAC',
            idempotencyKey: input.idempotencyKey,
            body: {
                amount: koboToNairaNumber(input.amountKobo),
                destinationBankCode: input.destinationBankCode,
                destinationAccountNumber: input.destinationAccountNumber,
                beneficiaryName: input.beneficiaryName,
                narration: normalizeOlivePayNarration(input.narration),
                ...(input.reference ? { reference: input.reference } : {}),
            },
            forceSandbox: input.forceSandbox,
        })
    },

    async getMerchantPayoutStatus(reference: string, forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/merchant-api/payouts/{reference}/status',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT_HMAC',
            pathParams: { reference },
            forceSandbox,
        })
    },

    async listBeneficiaries(search?: string, forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/merchant-api/payouts/beneficiaries',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT_HMAC',
            query: search ? { search } : undefined,
            forceSandbox,
        })
    },

    // ── SubWallets & KYC Tiers ───────────────────────────────────────────────
    async createSubWallet(input: {
        walletHolderReference: string
        firstName: string
        lastName: string
        email: string
        phoneNumber: string
        bvn?: string
        nin?: string
        dateOfBirth?: string
        address?: string
        canPayout?: boolean
        requestedTier?: 1 | 2 | 3
        forceSandbox?: boolean
    }) {
        const body: Record<string, any> = {
            walletHolderReference: input.walletHolderReference,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phoneNumber: input.phoneNumber,
            canPayout: input.canPayout !== false,
            ...(input.bvn ? { bvn: input.bvn } : {}),
            ...(input.nin ? { nin: input.nin } : {}),
            ...(input.dateOfBirth ? { dateOfBirth: input.dateOfBirth } : {}),
            ...(input.address ? { address: input.address } : {}),
            ...(input.requestedTier && input.requestedTier >= 2
                ? { tier: { requestedTier: input.requestedTier, ...(input.nin ? { nin: input.nin } : {}) } }
                : {}),
        }
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT',
            body,
            forceSandbox: input.forceSandbox,
        })
    },

    async listSubWallets(forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT',
            forceSandbox,
        })
    },

    async getSubWallet(subWalletId: string, forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/{id}',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT',
            pathParams: { id: subWalletId },
            forceSandbox,
        })
    },

    async upgradeSubWalletTier(input: {
        subWalletId: string
        targetTier: 2 | 3
        nin?: string
        address?: string
        attestation?: Record<string, any>
        forceSandbox?: boolean
    }) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/{id}/tier-upgrade',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT',
            pathParams: { id: input.subWalletId },
            body: {
                targetTier: input.targetTier,
                ...(input.nin ? { nin: input.nin } : {}),
                ...(input.address ? { address: input.address } : {}),
                ...(input.attestation ? { attestation: input.attestation } : {}),
            },
            forceSandbox: input.forceSandbox,
        })
    },

    async uploadTier3Document(input: {
        subWalletId: string
        requestId: string
        documentType: 'proof_of_address' | 'source_of_funds' | 'government_id' | 'selfie'
        file?: Blob
        fileName?: string
        forceSandbox?: boolean
    }) {
        const mode = await resolveActiveOlivePayRailMode(input.forceSandbox)
        if (mode === 'sandbox_simulator') {
            return dispatchSandboxOlivePay({
                path: `/api/v1/subwallet/${encodeURIComponent(input.subWalletId)}/tier-upgrade/documents`,
                method: 'POST',
                body: { requestId: input.requestId, documentType: input.documentType, fileName: input.fileName || 'doc.pdf' },
            })
        }
        const form = new FormData()
        form.append('requestId', input.requestId)
        form.append('documentType', input.documentType)
        if (input.file) {
            form.append('file', input.file, input.fileName || 'document.pdf')
        }
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/{id}/tier-upgrade/documents',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT',
            pathParams: { id: input.subWalletId },
            multipartBody: form,
        })
    },

    async transferSubWallet(input: {
        sourceSubWalletId: string
        destinationSubWalletId: string
        amountKobo: number
        narration: string
        idempotencyKey: string
        forceSandbox?: boolean
    }) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/transfer',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT',
            body: {
                sourceSubWalletId: input.sourceSubWalletId,
                destinationSubWalletId: input.destinationSubWalletId,
                amount: koboToNairaNumber(input.amountKobo),
                narration: normalizeOlivePayNarration(input.narration),
                idempotencyKey: input.idempotencyKey,
            },
            forceSandbox: input.forceSandbox,
        })
    },

    async sendSubWalletPayout(input: {
        subWalletId: string
        amountKobo: number
        destinationBankCode: string
        destinationAccountNumber: string
        beneficiaryName: string
        narration: string
        idempotencyKey: string
        forceSandbox?: boolean
    }) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/{id}/payout',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT',
            pathParams: { id: input.subWalletId },
            body: {
                amount: koboToNairaNumber(input.amountKobo),
                destinationBankCode: input.destinationBankCode,
                destinationAccountNumber: input.destinationAccountNumber,
                beneficiaryName: input.beneficiaryName,
                narration: normalizeOlivePayNarration(input.narration),
                idempotencyKey: input.idempotencyKey,
            },
            forceSandbox: input.forceSandbox,
        })
    },

    async getSubWalletPayoutStatus(reference: string, forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/payout/{reference}/status',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT',
            pathParams: { reference },
            forceSandbox,
        })
    },

    async fundSubWalletFromMain(input: {
        subWalletId: string
        amountKobo: number
        narration: string
        idempotencyKey: string
        forceSandbox?: boolean
    }) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/merchant-api/subwallet-funding',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT_HMAC',
            idempotencyKey: input.idempotencyKey,
            body: {
                subWalletId: input.subWalletId,
                amount: koboToNairaNumber(input.amountKobo),
                narration: normalizeOlivePayNarration(input.narration),
            },
            forceSandbox: input.forceSandbox,
        })
    },

    async getSubWalletFundingStatus(reference: string, forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/merchant-api/subwallet-funding/{reference}/status',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT_HMAC',
            pathParams: { reference },
            forceSandbox,
        })
    },

    // ── Escrow Holds & Commissions ───────────────────────────────────────────
    async placeHold(input: {
        subWalletId: string
        amountKobo: number
        reason: string
        idempotencyKey: string
        externalReference?: string
        forceSandbox?: boolean
    }) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/{id}/holds',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT',
            pathParams: { id: input.subWalletId },
            body: {
                amount: koboToNairaNumber(input.amountKobo),
                reason: input.reason,
                idempotencyKey: input.idempotencyKey,
                ...(input.externalReference ? { externalReference: input.externalReference } : {}),
            },
            forceSandbox: input.forceSandbox,
        })
    },

    async captureHold(input: {
        holdId: string
        destinationSubWalletId?: string
        captureAmountKobo?: number
        commissionAmountKobo?: number
        narration?: string
        forceSandbox?: boolean
    }) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/holds/{holdId}/capture',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT',
            pathParams: { holdId: input.holdId },
            body: {
                ...(input.destinationSubWalletId ? { destinationSubWalletId: input.destinationSubWalletId } : {}),
                ...(input.captureAmountKobo !== undefined ? { captureAmount: koboToNairaNumber(input.captureAmountKobo) } : {}),
                ...(input.commissionAmountKobo !== undefined ? { commissionAmount: koboToNairaNumber(input.commissionAmountKobo) } : {}),
                ...(input.narration ? { narration: normalizeOlivePayNarration(input.narration) } : {}),
            },
            forceSandbox: input.forceSandbox,
        })
    },

    async releaseHold(holdId: string, reason?: string, forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/holds/{holdId}/release',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT',
            pathParams: { holdId },
            body: reason ? { reason } : {},
            forceSandbox,
        })
    },

    async getHold(holdRef: string, forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/holds/{holdRef}',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT',
            pathParams: { holdRef },
            forceSandbox,
        })
    },

    async listSubWalletHolds(subWalletId: string, forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/{id}/holds',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT',
            pathParams: { id: subWalletId },
            forceSandbox,
        })
    },

    async getHoldSettings(forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/hold-settings',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT',
            forceSandbox,
        })
    },

    async getCommissionConfigurations(forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/subwallet/commission-configurations',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT',
            forceSandbox,
        })
    },

    // ── Dynamic One-Time Virtual Accounts (INTEGER KOBO!) ────────────────────
    async createDynamicVirtualAccount(input: {
        amountKobo: number
        customerName: string
        customerEmail: string
        transactionId?: string
        bank?: 'OLIVEPAY' | 'WEMA'
        expiresInMinutes?: number
        applyConvenienceCharge?: boolean
        metadata?: Record<string, any>
        forceSandbox?: boolean
    }) {
        const transactionId = input.transactionId || generateOlivePayTransactionId('DVA')
        return dispatchOlivePayEndpoint({
            path: '/api/v1/merchant/virtual-accounts',
            method: 'POST',
            authMode: 'OLIVEPAY_JWT',
            body: {
                transactionId,
                amount: Math.round(input.amountKobo), // INTEGER KOBO ON THE WIRE!
                customerName: input.customerName,
                customerEmail: input.customerEmail,
                bank: input.bank || 'OLIVEPAY',
                expiresInMinutes: Math.min(1440, Math.max(5, Number(input.expiresInMinutes || 30))),
                applyConvenienceCharge: Boolean(input.applyConvenienceCharge),
                metadata: input.metadata || {},
            },
            forceSandbox: input.forceSandbox,
        })
    },

    async getDynamicVirtualAccount(transactionId: string, forceSandbox?: boolean) {
        return dispatchOlivePayEndpoint({
            path: '/api/v1/merchant/virtual-accounts/{transactionId}',
            method: 'GET',
            authMode: 'OLIVEPAY_JWT',
            pathParams: { transactionId },
            forceSandbox,
        })
    },
}

// =============================================================================
// GRACEFUL RUNTIME CAPABILITY PROBER (FOR SUPERADMIN INFRASTRUCTURE CONSOLE)
// =============================================================================

export interface OlivePayCapabilityReport {
    railMode: OlivePayRailMode
    credentials: {
        hasPublicKey: boolean
        hasSecretKey: boolean
        hasWebhookSecret: boolean
        hasStaticProxy: boolean
        baseUrl: string
        source: OlivePayCredentials['source']
    }
    capabilities: {
        collections: { status: 'enabled' | 'sandbox' | 'missing_credentials'; detail: string }
        jwtAuth: { status: 'enabled' | 'sandbox' | 'ip_or_auth_blocked' | 'missing_credentials'; detail: string }
        payouts: { status: 'enabled' | 'sandbox' | 'not_enabled' | 'unavailable'; balanceNaira?: number; walletStatus?: string; detail: string }
        subwallets: { status: 'enabled' | 'sandbox' | 'not_enabled' | 'unavailable'; count?: number; detail: string }
        escrowHolds: { status: 'enabled' | 'sandbox' | 'not_enabled' | 'unavailable'; detail: string }
        virtualAccounts: { status: 'enabled' | 'sandbox' | 'pending_verification'; detail: string }
    }
    commissions: any
    probedAt: string
}

export async function probeOlivePayCapabilities(probeLiveEvenInSandbox = false): Promise<OlivePayCapabilityReport> {
    await ensureOlivePayTables()
    const creds = await resolveOlivePayCredentials()
    const railMode = await resolveActiveOlivePayRailMode()

    const baseCreds = {
        hasPublicKey: Boolean(creds.publicKey),
        hasSecretKey: Boolean(creds.secretKey),
        hasWebhookSecret: Boolean(creds.webhookSecret),
        hasStaticProxy: Boolean(creds.proxyUrl),
        baseUrl: creds.baseUrl,
        source: creds.source,
    }

    // If running in Sandbox Testing Rail (and not forced to probe live), report live Sandbox capabilities
    if (railMode === 'sandbox_simulator' && !probeLiveEvenInSandbox) {
        const [bal, swList, holds, comms] = await Promise.all([
            olivePayClient.getMasterBalance(true),
            olivePayClient.listSubWallets(true),
            olivePayClient.getHoldSettings(true),
            olivePayClient.getCommissionConfigurations(true),
        ])
        return {
            railMode,
            credentials: baseCreds,
            capabilities: {
                collections: { status: 'sandbox', detail: 'Internal Sandbox Checkout & Recurring ready' },
                jwtAuth: { status: 'sandbox', detail: 'Internal Sandbox Rail active (no IP whitelist required)' },
                payouts: {
                    status: 'sandbox',
                    balanceNaira: Number(bal.data?.available_balance || 0),
                    walletStatus: bal.data?.status || 'ACTIVE',
                    detail: 'NIP Banks, Name Enquiry, Fee Estimate & Payouts active in Sandbox',
                },
                subwallets: {
                    status: 'sandbox',
                    count: Array.isArray(swList.data) ? swList.data.length : 0,
                    detail: 'Static VA provisioning, W2W transfers & Tier 1-3 KYC active in Sandbox',
                },
                escrowHolds: {
                    status: holds.data?.holds_enabled ? 'sandbox' : 'not_enabled',
                    detail: 'Escrow Lien Holds (place, capture, release) active in Sandbox',
                },
                virtualAccounts: {
                    status: 'sandbox',
                    detail: 'One-Time Kobo Dynamic Virtual Accounts + Webhook Simulation active',
                },
            },
            commissions: comms.data || {},
            probedAt: new Date().toISOString(),
        }
    }

    // Live OlivePay Graceful Capability Probe
    if (!creds.publicKey || !creds.secretKey) {
        return {
            railMode,
            credentials: baseCreds,
            capabilities: {
                collections: {
                    status: creds.publicKey ? 'enabled' : 'missing_credentials',
                    detail: creds.publicKey ? 'Public key ready (no IP whitelist needed)' : 'Add OLIVEPAY_PUBLIC_KEY in Secrets Vault',
                },
                jwtAuth: { status: 'missing_credentials', detail: 'Add OLIVEPAY_PUBLIC_KEY + OLIVEPAY_SECRET_KEY in Vault' },
                payouts: { status: 'unavailable', detail: 'Requires OlivePay JWT + HMAC keys' },
                subwallets: { status: 'unavailable', detail: 'Requires OlivePay JWT credentials' },
                escrowHolds: { status: 'unavailable', detail: 'Requires OlivePay JWT credentials' },
                virtualAccounts: { status: 'pending_verification', detail: 'Requires OlivePay JWT credentials' },
            },
            commissions: {},
            probedAt: new Date().toISOString(),
        }
    }

    let jwtOk = false
    let jwtDetail = '60-minute JWT token exchange succeeded'
    try {
        await getOlivePayJwt(false)
        jwtOk = true
    } catch (err: any) {
        jwtDetail = err.message || 'Auth token failed (check IP whitelist or OLIVEPAY_PROXY_URL)'
    }

    if (!jwtOk) {
        return {
            railMode,
            credentials: baseCreds,
            capabilities: {
                collections: { status: 'enabled', detail: 'Collections Public Key ready (no IP whitelist needed)' },
                jwtAuth: { status: 'ip_or_auth_blocked', detail: jwtDetail },
                payouts: { status: 'unavailable', detail: 'Blocked until JWT auth / static IP whitelist succeeds' },
                subwallets: { status: 'unavailable', detail: 'Blocked until JWT auth / static IP whitelist succeeds' },
                escrowHolds: { status: 'unavailable', detail: 'Blocked until JWT auth / static IP whitelist succeeds' },
                virtualAccounts: { status: 'pending_verification', detail: 'Blocked until JWT auth succeeds' },
            },
            commissions: {},
            probedAt: new Date().toISOString(),
        }
    }

    const [balRes, swRes, holdRes, commRes] = await Promise.all([
        dispatchLiveOlivePay({ path: '/api/v1/merchant-api/payouts/balance', method: 'GET', authMode: 'OLIVEPAY_JWT_HMAC' }).catch((e) =>
            parseOlivePayResponse(500, { message: e.message }, 'olivepay')
        ),
        dispatchLiveOlivePay({ path: '/api/v1/subwallet', method: 'GET', authMode: 'OLIVEPAY_JWT' }).catch((e) =>
            parseOlivePayResponse(500, { message: e.message }, 'olivepay')
        ),
        dispatchLiveOlivePay({ path: '/api/v1/subwallet/hold-settings', method: 'GET', authMode: 'OLIVEPAY_JWT' }).catch((e) =>
            parseOlivePayResponse(500, { message: e.message }, 'olivepay')
        ),
        dispatchLiveOlivePay({ path: '/api/v1/subwallet/commission-configurations', method: 'GET', authMode: 'OLIVEPAY_JWT' }).catch((e) =>
            parseOlivePayResponse(500, { message: e.message }, 'olivepay')
        ),
    ])

    return {
        railMode,
        credentials: baseCreds,
        capabilities: {
            collections: { status: 'enabled', detail: 'Public Key Bearer active (no IP whitelist required)' },
            jwtAuth: { status: 'enabled', detail: jwtDetail },
            payouts: balRes.ok
                ? {
                      status: 'enabled',
                      balanceNaira: Number(balRes.data?.available_balance ?? 0),
                      walletStatus: String(balRes.data?.status || 'ACTIVE'),
                      detail: 'API Payouts & HMAC-SHA256 verified',
                  }
                : { status: 'not_enabled', detail: balRes.message || 'API Payouts not yet enabled on OlivePay merchant account' },
            subwallets: swRes.ok
                ? {
                      status: 'enabled',
                      count: Array.isArray(swRes.data) ? swRes.data.length : 0,
                      detail: 'SubWallets API enabled',
                  }
                : { status: 'not_enabled', detail: swRes.message || 'SubWallets not yet enabled on OlivePay merchant account' },
            escrowHolds:
                holdRes.ok && holdRes.data?.holds_enabled !== false
                    ? { status: 'enabled', detail: 'SubWallet Escrow Holds enabled' }
                    : { status: 'not_enabled', detail: holdRes.message || 'Escrow Holds (responseCode 15) not yet enabled' },
            virtualAccounts: {
                status: jwtOk ? 'enabled' : 'pending_verification',
                detail: 'Dynamic One-Time Virtual Accounts (kobo wire) ready via JWT',
            },
        },
        commissions: commRes.ok ? commRes.data : {},
        probedAt: new Date().toISOString(),
    }
}
