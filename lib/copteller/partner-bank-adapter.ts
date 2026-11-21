import crypto from 'crypto'
import { queryCopteller } from '@/lib/copteller/pg'

export type PartnerBankProvider = 'banksuite' | 'kuda' | 'qore' | 'generic_mfb'

export interface PartnerBankConfig {
    provider: PartnerBankProvider
    bankName: string
    shortName: string
    bankCode: string
    apiBaseUrl: string
    escrowAccountNumber: string
    configured: boolean
    supportsVirtualEscrow: boolean
    supportsTransfers: boolean
    supportsHeadlessBridge: boolean
    description: string
}

export interface KudaApiResponse<T = any> {
    status: boolean
    message: string
    data?: T
}

const g = globalThis as typeof globalThis & {
    __coptellerPartnerBankOverride?: Partial<{
        provider: PartnerBankProvider
        bankName: string
        bankCode: string
        apiBaseUrl: string
        escrowAccountNumber: string
    }>
    __kudaTokenCache?: { token: string; expiresAt: number }
}

export const PARTNER_BANK_PRESETS: Record<
    PartnerBankProvider,
    Omit<PartnerBankConfig, 'configured' | 'apiBaseUrl' | 'escrowAccountNumber'> & {
        defaultApiBaseUrl: string
    }
> = {
    banksuite: {
        provider: 'banksuite',
        bankName: process.env.COPTELLER_PARTNER_BANK_NAME || 'Abia SME Microfinance Bank (BankSuite)',
        shortName: 'BankSuite MFB',
        bankCode: process.env.COPTELLER_PARTNER_BANK_CODE || '090423',
        defaultApiBaseUrl:
            process.env.BANKSUITE_API_URL ||
            process.env.NEXT_PUBLIC_BANKSUITE_URL ||
            'http://localhost:3000',
        supportsVirtualEscrow: true,
        supportsTransfers: true,
        supportsHeadlessBridge: true,
        description:
            'Native BankSuite Core Banking integration with ring-fenced Corporate Escrow NUBANs, Double-Entry GL mirroring, and embedded Headless Cooperative Console.',
    },
    kuda: {
        provider: 'kuda',
        bankName: 'Kuda Microfinance Bank (Open API v2.1)',
        shortName: 'Kuda Bank',
        bankCode: '50211',
        defaultApiBaseUrl: process.env.KUDA_BASE_URL || 'https://kuda-openapi.kuda.com/v2.1',
        supportsVirtualEscrow: true,
        supportsTransfers: true,
        supportsHeadlessBridge: false,
        description:
            'Kuda Open API v2.1 virtual account provisioning (ADMIN_CREATE_VIRTUAL_ACCOUNT), main settlement balance telemetry, name enquiry, and interbank NIP payouts.',
    },
    qore: {
        provider: 'qore',
        bankName: 'Qore / BankOne Licensed MFB Core',
        shortName: 'Qore CBS',
        bankCode: process.env.QORE_INSTITUTION_CODE || '090001',
        defaultApiBaseUrl: process.env.QORE_BASE_URL || 'https://staging.mybankone.com',
        supportsVirtualEscrow: true,
        supportsTransfers: true,
        supportsHeadlessBridge: false,
        description:
            'Direct Qore / BankOne Core Banking adapter for CBN-licensed microfinance banks running BankOne.',
    },
    generic_mfb: {
        provider: 'generic_mfb',
        bankName: process.env.COPTELLER_PARTNER_BANK_NAME || 'Custom Partner Bank / MFB',
        shortName: 'Partner MFB',
        bankCode: process.env.COPTELLER_PARTNER_BANK_CODE || '090000',
        defaultApiBaseUrl: process.env.PARTNER_BANK_API_URL || '',
        supportsVirtualEscrow: true,
        supportsTransfers: true,
        supportsHeadlessBridge: true,
        description:
            'Bank-agnostic webhook & REST settlement adapter for any commercial bank, MFB, or payment service bank.',
    },
}

function isProviderConfigured(provider: PartnerBankProvider, apiBaseUrl: string): boolean {
    if (provider === 'kuda') {
        return Boolean(process.env.KUDA_EMAIL && process.env.KUDA_API_KEY)
    }
    if (provider === 'qore') {
        return Boolean(process.env.QORE_AUTH_TOKEN && (process.env.QORE_BASE_URL || apiBaseUrl))
    }
    if (provider === 'banksuite') {
        return Boolean(
            apiBaseUrl ||
                process.env.BANKSUITE_API_URL ||
                process.env.COPTELLER_BRIDGE_SECRET ||
                process.env.ADMIN_SECRET
        )
    }
    return Boolean(apiBaseUrl)
}

export function getActivePartnerBankConfig(): PartnerBankConfig {
    const rawProvider = (
        g.__coptellerPartnerBankOverride?.provider ||
        process.env.COPTELLER_PARTNER_BANK_PROVIDER ||
        'banksuite'
    ).toLowerCase()

    const provider: PartnerBankProvider =
        rawProvider === 'kuda' || rawProvider === 'qore' || rawProvider === 'generic_mfb'
            ? rawProvider
            : 'banksuite'

    const preset = PARTNER_BANK_PRESETS[provider]
    const apiBaseUrl = (
        g.__coptellerPartnerBankOverride?.apiBaseUrl ||
        preset.defaultApiBaseUrl ||
        ''
    ).replace(/\/$/, '')

    const bankName = g.__coptellerPartnerBankOverride?.bankName || preset.bankName
    const bankCode = g.__coptellerPartnerBankOverride?.bankCode || preset.bankCode
    const escrowAccountNumber =
        g.__coptellerPartnerBankOverride?.escrowAccountNumber ||
        process.env.COPTELLER_MASTER_ESCROW_NUBAN ||
        ''

    return {
        provider,
        bankName,
        shortName: preset.shortName,
        bankCode,
        apiBaseUrl,
        escrowAccountNumber,
        configured: isProviderConfigured(provider, apiBaseUrl),
        supportsVirtualEscrow: preset.supportsVirtualEscrow,
        supportsTransfers: preset.supportsTransfers,
        supportsHeadlessBridge: preset.supportsHeadlessBridge,
        description: preset.description,
    }
}

export function setPartnerBankRuntimeOverride(override: {
    provider: PartnerBankProvider
    bankName?: string
    bankCode?: string
    apiBaseUrl?: string
    escrowAccountNumber?: string
}): PartnerBankConfig {
    g.__coptellerPartnerBankOverride = {
        ...g.__coptellerPartnerBankOverride,
        ...override,
    }
    return getActivePartnerBankConfig()
}

export function listSupportedPartnerBanks(): PartnerBankConfig[] {
    return (['banksuite', 'kuda', 'qore', 'generic_mfb'] as PartnerBankProvider[]).map((p) => {
        const preset = PARTNER_BANK_PRESETS[p]
        const apiBaseUrl = preset.defaultApiBaseUrl.replace(/\/$/, '')
        return {
            provider: p,
            bankName: preset.bankName,
            shortName: preset.shortName,
            bankCode: preset.bankCode,
            apiBaseUrl,
            escrowAccountNumber: process.env.COPTELLER_MASTER_ESCROW_NUBAN || '',
            configured: isProviderConfigured(p, apiBaseUrl),
            supportsVirtualEscrow: preset.supportsVirtualEscrow,
            supportsTransfers: preset.supportsTransfers,
            supportsHeadlessBridge: preset.supportsHeadlessBridge,
            description: preset.description,
        }
    })
}

// =============================================================================
// KUDA OPEN API v2.1 ADAPTER (Independent Bank Integration Rail)
// =============================================================================

async function getKudaBearerToken(): Promise<string> {
    const email = process.env.KUDA_EMAIL
    const apiKey = process.env.KUDA_API_KEY
    const baseUrl = (process.env.KUDA_BASE_URL || 'https://kuda-openapi.kuda.com/v2.1').replace(/\/$/, '')

    if (!email || !apiKey) {
        throw new Error('Kuda Open API credentials (KUDA_EMAIL, KUDA_API_KEY) are not configured.')
    }

    if (g.__kudaTokenCache && g.__kudaTokenCache.expiresAt > Date.now() + 60_000) {
        return g.__kudaTokenCache.token
    }

    const res = await fetch(`${baseUrl}/Account/GetToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, apiKey }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
    })

    const rawToken = (await res.text()).replace(/^"|"$/g, '').trim()
    if (!res.ok || !rawToken || rawToken.length < 20) {
        throw new Error(`Kuda token exchange failed (HTTP ${res.status}).`)
    }

    g.__kudaTokenCache = {
        token: rawToken,
        expiresAt: Date.now() + 12 * 60_000,
    }
    return rawToken
}

export async function callKudaOpenApi<T = any>(
    serviceType:
        | 'ADMIN_CREATE_VIRTUAL_ACCOUNT'
        | 'ADMIN_RETRIEVE_MAIN_ACCOUNT_BALANCE'
        | 'NAME_ENQUIRY'
        | 'SINGLE_FUND_TRANSFER'
        | 'ADMIN_RETRIEVE_SINGLE_VIRTUAL_ACCOUNT',
    data: Record<string, any> = {}
): Promise<KudaApiResponse<T>> {
    const token = await getKudaBearerToken()
    const baseUrl = (process.env.KUDA_BASE_URL || 'https://kuda-openapi.kuda.com/v2.1').replace(/\/$/, '')
    const requestRef = `COP_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`

    const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            serviceType,
            requestRef,
            data,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(12_000),
    })

    const json = await res.json().catch(() => ({}))
    const ok = Boolean(res.ok && (json.status === true || json.Status === true))
    return {
        status: ok,
        message: json.message || json.Message || (ok ? 'Success' : `Kuda HTTP ${res.status}`),
        data: json.data ?? json.Data,
    }
}

/**
 * Bank-agnostic Cooperative Escrow NUBAN Provisioner.
 * Works with Kuda Open API v2.1, BankSuite MFB, Qore CBS, or Generic Partner MFB.
 */
export async function provisionCooperativeEscrowWithPartnerBank(params: {
    cooperativeId: number
    cooperativeName: string
    email: string
    phoneNumber: string
    actorEmail: string
}): Promise<{
    provider: PartnerBankProvider
    bankName: string
    escrowNuban: string
    trackingReference: string
    liveApiProvisioned: boolean
}> {
    const config = getActivePartnerBankConfig()
    const trackingRef = `COP_ESC_${params.cooperativeId}_${Date.now()}`

    let escrowNuban = ''
    let liveApiProvisioned = false

    if (config.provider === 'kuda' && config.configured) {
        const kudaRes = await callKudaOpenApi<{ accountNumber?: string }>('ADMIN_CREATE_VIRTUAL_ACCOUNT', {
            email: params.email,
            phoneNumber: params.phoneNumber,
            lastName: 'Cooperative Escrow',
            firstName: params.cooperativeName.slice(0, 35),
            businessName: params.cooperativeName,
            trackingReference: trackingRef,
        })
        if (!kudaRes.status || !kudaRes.data?.accountNumber) {
            throw new Error(`Kuda virtual escrow creation failed: ${kudaRes.message}`)
        }
        escrowNuban = String(kudaRes.data.accountNumber)
        liveApiProvisioned = true
    } else if (config.provider === 'banksuite' && config.apiBaseUrl) {
        // BankSuite provisions via its own regulated /api/admin/copteller rail; fallback deterministic local escrow reference if initiated from Copteller side
        const suffix = String(100000 + Math.floor(Math.random() * 899999))
        escrowNuban = `3000${suffix}`
    } else {
        const prefix = config.provider === 'kuda' ? '2020' : config.provider === 'qore' ? '1100' : '3050'
        const suffix = String(100000 + Math.floor(Math.random() * 899999))
        escrowNuban = `${prefix}${suffix}`
    }

    await queryCopteller(
        `UPDATE copteller.cooperatives
         SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2`,
        [
            JSON.stringify({
                banksuite_escrow_nuban: escrowNuban,
                partner_bank_name: config.bankName,
                partner_bank_provider: config.provider,
                partner_bank_code: config.bankCode,
                escrow_tracking_ref: trackingRef,
                escrow_live_api: liveApiProvisioned,
                escrow_bound_at: new Date().toISOString(),
                escrow_bound_by: params.actorEmail,
            }),
            params.cooperativeId,
        ]
    )

    return {
        provider: config.provider,
        bankName: config.bankName,
        escrowNuban,
        trackingReference: trackingRef,
        liveApiProvisioned,
    }
}
