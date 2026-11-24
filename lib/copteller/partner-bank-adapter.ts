import crypto from 'crypto'
import { queryCopteller } from '@/lib/copteller/pg'
import { ensureOlivePayTables, getPlatformConfig, setPlatformConfig } from '@/lib/copteller/olivepay-schema'

export type PartnerBankProvider =
    | 'olivepay'
    | 'sandbox_simulator'
    | 'banksuite'
    | 'kuda'
    | 'qore'
    | 'generic_mfb'

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
    supportsEscrowHolds: boolean
    supportsKycTiers: boolean
    isSandboxRail: boolean
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

const VALID_PROVIDERS: PartnerBankProvider[] = [
    'olivepay',
    'sandbox_simulator',
    'banksuite',
    'kuda',
    'qore',
    'generic_mfb',
]

export const PARTNER_BANK_PRESETS: Record<
    PartnerBankProvider,
    Omit<PartnerBankConfig, 'configured' | 'apiBaseUrl' | 'escrowAccountNumber'> & {
        defaultApiBaseUrl: string
    }
> = {
    olivepay: {
        provider: 'olivepay',
        bankName: 'OlivePay Financial Infrastructure (Live API)',
        shortName: 'OlivePay',
        bankCode: '999999',
        defaultApiBaseUrl: process.env.OLIVEPAY_BASE_URL || 'https://api.olivepayment.com',
        supportsVirtualEscrow: true,
        supportsTransfers: true,
        supportsHeadlessBridge: true,
        supportsEscrowHolds: true,
        supportsKycTiers: true,
        isSandboxRail: false,
        description:
            'Full OlivePay unified rail: Member & Cooperative SubWallets (Static VA + Tiers 1–3), W2W transfers, Escrow Holds (lien), NIP Payouts (HMAC-SHA256), Dynamic Virtual Accounts (kobo), and Hosted/Recurring Collections.',
    },
    sandbox_simulator: {
        provider: 'sandbox_simulator',
        bankName: 'Copteller Internal Testing & Sandbox Rail (OlivePay Parity)',
        shortName: 'Sandbox Rail',
        bankCode: '999999',
        defaultApiBaseUrl: '/api/webhooks/olivepay',
        supportsVirtualEscrow: true,
        supportsTransfers: true,
        supportsHeadlessBridge: true,
        supportsEscrowHolds: true,
        supportsKycTiers: true,
        isSandboxRail: true,
        description:
            '100% realistic local testing rail mirroring every OlivePay primitive (SubWallets, Static/Dynamic VAs, Escrow Holds, NIP Name Enquiry, Payouts, KYC Tier 1–3, and Signed Webhook Simulation) with zero external credentials or IP whitelist required.',
    },
    banksuite: {
        provider: 'banksuite',
        bankName: process.env.COPTELLER_PARTNER_BANK_NAME || 'Abia SME Microfinance Bank (BankSuite)',
        shortName: 'BankSuite MFB',
        bankCode: process.env.COPTELLER_PARTNER_BANK_CODE || '090423',
        defaultApiBaseUrl:
            process.env.BANKSUITE_API_URL ||
            process.env.NEXT_PUBLIC_BANKSUITE_URL ||
            (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''),
        supportsVirtualEscrow: true,
        supportsTransfers: true,
        supportsHeadlessBridge: true,
        supportsEscrowHolds: false,
        supportsKycTiers: false,
        isSandboxRail: false,
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
        supportsEscrowHolds: false,
        supportsKycTiers: false,
        isSandboxRail: false,
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
        supportsEscrowHolds: false,
        supportsKycTiers: false,
        isSandboxRail: false,
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
        supportsEscrowHolds: false,
        supportsKycTiers: false,
        isSandboxRail: false,
        description:
            'Bank-agnostic webhook & REST settlement adapter for any commercial bank, MFB, or payment service bank.',
    },
}

function isProviderConfigured(provider: PartnerBankProvider, apiBaseUrl: string): boolean {
    if (provider === 'sandbox_simulator') return true
    if (provider === 'olivepay') {
        return Boolean(process.env.OLIVEPAY_PUBLIC_KEY && process.env.OLIVEPAY_SECRET_KEY)
    }
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

function buildConfig(
    rawProvider: string,
    override?: Partial<{
        provider: PartnerBankProvider
        bankName: string
        bankCode: string
        apiBaseUrl: string
        escrowAccountNumber: string
    }>,
    olivepayVaultReady = false
): PartnerBankConfig {
    const normalized = rawProvider.toLowerCase() as PartnerBankProvider
    const provider: PartnerBankProvider = VALID_PROVIDERS.includes(normalized)
        ? normalized
        : 'sandbox_simulator'

    const preset = PARTNER_BANK_PRESETS[provider]
    const apiBaseUrl = (override?.apiBaseUrl || preset.defaultApiBaseUrl || '').replace(/\/$/, '')
    const bankName = override?.bankName || preset.bankName
    const bankCode = override?.bankCode || preset.bankCode
    const escrowAccountNumber =
        override?.escrowAccountNumber || process.env.COPTELLER_MASTER_ESCROW_NUBAN || ''

    const configured =
        provider === 'olivepay'
            ? olivepayVaultReady || isProviderConfigured('olivepay', apiBaseUrl)
            : isProviderConfigured(provider, apiBaseUrl)

    return {
        provider,
        bankName,
        shortName: preset.shortName,
        bankCode,
        apiBaseUrl,
        escrowAccountNumber,
        configured,
        supportsVirtualEscrow: preset.supportsVirtualEscrow,
        supportsTransfers: preset.supportsTransfers,
        supportsHeadlessBridge: preset.supportsHeadlessBridge,
        supportsEscrowHolds: preset.supportsEscrowHolds,
        supportsKycTiers: preset.supportsKycTiers,
        isSandboxRail: preset.isSandboxRail,
        description: preset.description,
    }
}

export function getActivePartnerBankConfig(): PartnerBankConfig {
    const rawProvider =
        g.__coptellerPartnerBankOverride?.provider ||
        process.env.COPTELLER_PARTNER_BANK_PROVIDER ||
        'sandbox_simulator'
    return buildConfig(rawProvider, g.__coptellerPartnerBankOverride)
}

/**
 * Durable DB-backed partner bank config resolver (survives Vercel serverless cold starts!).
 */
export async function getActivePartnerBankConfigAsync(): Promise<PartnerBankConfig> {
    const stored = await getPlatformConfig<any>('partner_bank', {})
    const rawProvider =
        stored?.provider ||
        g.__coptellerPartnerBankOverride?.provider ||
        process.env.COPTELLER_PARTNER_BANK_PROVIDER ||
        'sandbox_simulator'

    // Check if OlivePay Vault secrets exist so `configured` reflects Vault as well as env!
    let olivepayVaultReady = false
    try {
        const { resolveOlivePayCredentials } = await import('@/lib/copteller/olivepay-client')
        const creds = await resolveOlivePayCredentials()
        olivepayVaultReady = Boolean(creds.publicKey && creds.secretKey)
    } catch {}

    const merged = { ...g.__coptellerPartnerBankOverride, ...stored }
    g.__coptellerPartnerBankOverride = merged
    return buildConfig(rawProvider, merged, olivepayVaultReady)
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

export async function setPartnerBankConfig(
    override: {
        provider: PartnerBankProvider
        bankName?: string
        bankCode?: string
        apiBaseUrl?: string
        escrowAccountNumber?: string
    },
    updatedBy?: string
): Promise<PartnerBankConfig> {
    await setPlatformConfig('partner_bank', override, updatedBy)
    setPartnerBankRuntimeOverride(override)
    return getActivePartnerBankConfigAsync()
}

export function listSupportedPartnerBanks(olivepayVaultReady = false): PartnerBankConfig[] {
    return VALID_PROVIDERS.map((p) => buildConfig(p, undefined, olivepayVaultReady))
}

export async function listSupportedPartnerBanksAsync(): Promise<PartnerBankConfig[]> {
    let olivepayVaultReady = false
    try {
        const { resolveOlivePayCredentials } = await import('@/lib/copteller/olivepay-client')
        const creds = await resolveOlivePayCredentials()
        olivepayVaultReady = Boolean(creds.publicKey && creds.secretKey)
    } catch {}
    return listSupportedPartnerBanks(olivepayVaultReady)
}

// =============================================================================
// KUDA OPEN API v2.1 ADAPTER
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
 * Bank-agnostic Cooperative Escrow Provisioner.
 * Provisions a dedicated OlivePay / Sandbox Treasury SubWallet when OlivePay or Sandbox Rail is active,
 * or Kuda / BankSuite / Qore escrow NUBAN otherwise.
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
    subWalletId?: string
    trackingReference: string
    liveApiProvisioned: boolean
}> {
    await ensureOlivePayTables()
    const config = await getActivePartnerBankConfigAsync()
    const trackingRef = `coop_${params.cooperativeId}`

    let escrowNuban = ''
    let subWalletId: string | undefined
    let liveApiProvisioned = false

    if (config.provider === 'olivepay' || config.provider === 'sandbox_simulator') {
        const { olivePayClient } = await import('@/lib/copteller/olivepay-client')
        const swRes = await olivePayClient.createSubWallet({
            walletHolderReference: trackingRef,
            firstName: params.cooperativeName.slice(0, 35),
            lastName: 'Treasury',
            email: params.email,
            phoneNumber: params.phoneNumber,
            canPayout: true,
            forceSandbox: config.provider === 'sandbox_simulator',
        })
        if (!swRes.ok || !swRes.data) {
            throw new Error(`OlivePay Cooperative Treasury SubWallet provisioning failed: ${swRes.message}`)
        }
        subWalletId = String(swRes.data.id || swRes.data.sub_wallet_id || '')
        escrowNuban = String(swRes.data.virtual_account_number || 'PENDING_PROVISIONING')
        liveApiProvisioned = swRes.railMode === 'olivepay'

        // Bind cooperative_id on olivepay_subwallets
        if (subWalletId) {
            await queryCopteller(
                `UPDATE copteller.olivepay_subwallets
                 SET entity_type = 'cooperative', cooperative_id = $1, updated_at = NOW()
                 WHERE olivepay_sub_wallet_id = $2`,
                [params.cooperativeId, subWalletId]
            ).catch(() => {})
        }
    } else if (config.provider === 'kuda' && config.configured) {
        const kudaRes = await callKudaOpenApi<{ accountNumber?: string }>('ADMIN_CREATE_VIRTUAL_ACCOUNT', {
            email: params.email,
            phoneNumber: params.phoneNumber,
            lastName: 'Cooperative Escrow',
            firstName: params.cooperativeName.slice(0, 35),
            businessName: params.cooperativeName,
            trackingReference: `${trackingRef}_${Date.now()}`,
        })
        if (!kudaRes.status || !kudaRes.data?.accountNumber) {
            throw new Error(`Kuda virtual escrow creation failed: ${kudaRes.message}`)
        }
        escrowNuban = String(kudaRes.data.accountNumber)
        liveApiProvisioned = true
    } else if (config.provider === 'banksuite' && config.apiBaseUrl) {
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
                olivepay_sub_wallet_id: subWalletId || null,
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
        subWalletId,
        trackingReference: trackingRef,
        liveApiProvisioned,
    }
}
