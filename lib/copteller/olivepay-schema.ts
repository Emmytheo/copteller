import { queryCopteller } from '@/lib/copteller/pg'

/**
 * Idempotent DDL & Seed helper for OlivePay + Internal Sandbox Testing Rail + Copteller Subsystem Extensions.
 * Required because payload.config.ts runs with `push: false` against the `copteller` Postgres schema.
 * Safe to invoke on cold starts — runs once per process and catches concurrent DDL races gracefully.
 */

export interface NipBankEntry {
    code: string
    name: string
    shortCode?: string
    isActive?: boolean
}

export const NIGERIAN_NIP_BANKS_6DIGIT: NipBankEntry[] = [
    { code: '000014', name: 'Access Bank', shortCode: '044' },
    { code: '000013', name: 'Guaranty Trust Bank (GTBank)', shortCode: '058' },
    { code: '000015', name: 'Zenith Bank', shortCode: '057' },
    { code: '000016', name: 'First Bank of Nigeria', shortCode: '011' },
    { code: '000004', name: 'United Bank for Africa (UBA)', shortCode: '033' },
    { code: '000007', name: 'Fidelity Bank', shortCode: '070' },
    { code: '000003', name: 'First City Monument Bank (FCMB)', shortCode: '214' },
    { code: '000001', name: 'Sterling Bank', shortCode: '232' },
    { code: '000018', name: 'Union Bank of Nigeria', shortCode: '032' },
    { code: '000017', name: 'Wema Bank', shortCode: '035' },
    { code: '000010', name: 'Ecobank Nigeria', shortCode: '050' },
    { code: '000012', name: 'Stanbic IBTC Bank', shortCode: '221' },
    { code: '000008', name: 'Polaris Bank', shortCode: '076' },
    { code: '000002', name: 'Keystone Bank', shortCode: '082' },
    { code: '000023', name: 'Providus Bank', shortCode: '101' },
    { code: '000021', name: 'Standard Chartered Bank', shortCode: '068' },
    { code: '000009', name: 'Citibank Nigeria', shortCode: '023' },
    { code: '000006', name: 'Jaiz Bank', shortCode: '301' },
    { code: '000022', name: 'Suntrust Bank', shortCode: '100' },
    { code: '000026', name: 'Taj Bank', shortCode: '302' },
    { code: '000027', name: 'Globus Bank', shortCode: '103' },
    { code: '000025', name: 'Titan Trust Bank', shortCode: '102' },
    { code: '000031', name: 'PremiumTrust Bank', shortCode: '105' },
    { code: '090267', name: 'Kuda Microfinance Bank', shortCode: '50211' },
    { code: '999992', name: 'OPay Digital Services (OPay)', shortCode: '999992' },
    { code: '999991', name: 'PalmPay', shortCode: '999991' },
    { code: '090405', name: 'Moniepoint Microfinance Bank', shortCode: '50515' },
    { code: '090110', name: 'VFD Microfinance Bank', shortCode: '566' },
    { code: '090423', name: 'Abia SME Microfinance Bank', shortCode: '090423' },
    { code: '999999', name: 'OlivePay Settlement Bank (Internal)', shortCode: '999999' },
]

let ensurePromise: Promise<void> | null = null

export async function ensureOlivePayTables(): Promise<void> {
    if (ensurePromise) return ensurePromise

    ensurePromise = (async () => {
        try {
            // 1. Platform & Rail Configuration (persistent across Vercel serverless invocations)
            await queryCopteller(`
                CREATE TABLE IF NOT EXISTS copteller.olivepay_platform_config (
                    config_key TEXT PRIMARY KEY,
                    config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
                    updated_by TEXT,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `)

            // 2. OlivePay SubWallets (Member, Cooperative Treasury, Circle, Partner)
            await queryCopteller(`
                CREATE TABLE IF NOT EXISTS copteller.olivepay_subwallets (
                    id BIGSERIAL PRIMARY KEY,
                    entity_type TEXT NOT NULL DEFAULT 'member',
                    customer_id BIGINT,
                    user_id TEXT,
                    account_id BIGINT,
                    cooperative_id BIGINT,
                    olivepay_sub_wallet_id TEXT NOT NULL UNIQUE,
                    wallet_holder_reference TEXT NOT NULL,
                    first_name TEXT,
                    last_name TEXT,
                    email TEXT,
                    phone_number TEXT,
                    virtual_account_number TEXT,
                    virtual_account_name TEXT,
                    virtual_account_bank_name TEXT,
                    virtual_account_bank_code TEXT,
                    status TEXT NOT NULL DEFAULT 'Pending',
                    can_payout BOOLEAN NOT NULL DEFAULT TRUE,
                    tier INTEGER NOT NULL DEFAULT 1,
                    tier_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
                    ledger_balance_kobo BIGINT NOT NULL DEFAULT 0,
                    lien_balance_kobo BIGINT NOT NULL DEFAULT 0,
                    available_balance_kobo BIGINT NOT NULL DEFAULT 0,
                    available_today_kobo BIGINT NOT NULL DEFAULT 0,
                    is_tier_locked BOOLEAN NOT NULL DEFAULT FALSE,
                    is_admin_frozen BOOLEAN NOT NULL DEFAULT FALSE,
                    bvn_verified BOOLEAN NOT NULL DEFAULT FALSE,
                    nin_verified BOOLEAN NOT NULL DEFAULT FALSE,
                    pending_tier_upgrade JSONB,
                    rail_mode TEXT NOT NULL DEFAULT 'olivepay',
                    raw_response JSONB,
                    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_op_subwallets_user ON copteller.olivepay_subwallets(user_id);
                CREATE INDEX IF NOT EXISTS idx_op_subwallets_coop ON copteller.olivepay_subwallets(cooperative_id);
                CREATE INDEX IF NOT EXISTS idx_op_subwallets_nuban ON copteller.olivepay_subwallets(virtual_account_number);
                CREATE INDEX IF NOT EXISTS idx_op_subwallets_holder_ref ON copteller.olivepay_subwallets(wallet_holder_reference);
            `)

            // 3. One-Time Dynamic Virtual Accounts (Integer Kobo on the wire)
            await queryCopteller(`
                CREATE TABLE IF NOT EXISTS copteller.olivepay_virtual_accounts (
                    id BIGSERIAL PRIMARY KEY,
                    transaction_id TEXT NOT NULL UNIQUE,
                    reference TEXT,
                    account_number TEXT,
                    account_name TEXT,
                    bank_name TEXT,
                    bank_code TEXT,
                    amount_kobo BIGINT NOT NULL DEFAULT 0,
                    fee_kobo BIGINT NOT NULL DEFAULT 0,
                    amount_payable_kobo BIGINT NOT NULL DEFAULT 0,
                    paid_amount_kobo BIGINT DEFAULT 0,
                    charge_bearer TEXT NOT NULL DEFAULT 'merchant',
                    status TEXT NOT NULL DEFAULT 'pending',
                    target_sub_wallet_id TEXT,
                    target_account_id BIGINT,
                    user_id TEXT,
                    purpose TEXT,
                    expires_at TIMESTAMPTZ,
                    paid_at TIMESTAMPTZ,
                    provider_reference TEXT,
                    payer JSONB,
                    metadata JSONB DEFAULT '{}'::jsonb,
                    rail_mode TEXT NOT NULL DEFAULT 'olivepay',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_op_va_user ON copteller.olivepay_virtual_accounts(user_id);
                CREATE INDEX IF NOT EXISTS idx_op_va_status ON copteller.olivepay_virtual_accounts(status);
            `)

            // 4. Hosted Checkout & Recurring Collections
            await queryCopteller(`
                CREATE TABLE IF NOT EXISTS copteller.olivepay_collections (
                    id BIGSERIAL PRIMARY KEY,
                    transaction_id TEXT NOT NULL UNIQUE,
                    access_code TEXT,
                    payment_url TEXT,
                    recurring_id TEXT,
                    amount_kobo BIGINT NOT NULL DEFAULT 0,
                    currency TEXT NOT NULL DEFAULT 'NGN',
                    status TEXT NOT NULL DEFAULT 'pending',
                    is_successful BOOLEAN NOT NULL DEFAULT FALSE,
                    payment_reference TEXT,
                    user_id TEXT,
                    target_account_id BIGINT,
                    target_sub_wallet_id TEXT,
                    purpose TEXT,
                    metadata JSONB DEFAULT '{}'::jsonb,
                    rail_mode TEXT NOT NULL DEFAULT 'olivepay',
                    verified_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_op_col_user ON copteller.olivepay_collections(user_id);
            `)

            // 5. Escrow Holds (Lien Lifecycle — Never Expire on OlivePay so tracked locally!)
            await queryCopteller(`
                CREATE TABLE IF NOT EXISTS copteller.olivepay_holds (
                    id BIGSERIAL PRIMARY KEY,
                    olivepay_hold_id TEXT NOT NULL UNIQUE,
                    reference TEXT NOT NULL,
                    idempotency_key TEXT NOT NULL UNIQUE,
                    external_reference TEXT,
                    sub_wallet_id TEXT NOT NULL,
                    destination_sub_wallet_id TEXT,
                    amount_kobo BIGINT NOT NULL DEFAULT 0,
                    captured_amount_kobo BIGINT NOT NULL DEFAULT 0,
                    commission_amount_kobo BIGINT NOT NULL DEFAULT 0,
                    released_amount_kobo BIGINT NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'Active',
                    entity_type TEXT,
                    entity_id TEXT,
                    reason TEXT,
                    expires_policy_at TIMESTAMPTZ,
                    rail_mode TEXT NOT NULL DEFAULT 'olivepay',
                    metadata JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_op_holds_wallet ON copteller.olivepay_holds(sub_wallet_id);
                CREATE INDEX IF NOT EXISTS idx_op_holds_entity ON copteller.olivepay_holds(entity_type, entity_id);
            `)

            // 6. Payouts & Master->SubWallet Fundings & W2W Transfers
            await queryCopteller(`
                CREATE TABLE IF NOT EXISTS copteller.olivepay_payouts (
                    id BIGSERIAL PRIMARY KEY,
                    rail TEXT NOT NULL,
                    idempotency_key TEXT NOT NULL UNIQUE,
                    olivepay_reference TEXT,
                    external_reference TEXT,
                    provider_reference TEXT,
                    source_sub_wallet_id TEXT,
                    destination_sub_wallet_id TEXT,
                    destination_bank_code TEXT,
                    destination_bank_name TEXT,
                    destination_account_number TEXT,
                    beneficiary_name TEXT,
                    narration TEXT,
                    amount_kobo BIGINT NOT NULL DEFAULT 0,
                    processing_fee_kobo BIGINT NOT NULL DEFAULT 0,
                    vat_kobo BIGINT NOT NULL DEFAULT 0,
                    commission_kobo BIGINT NOT NULL DEFAULT 0,
                    total_debit_kobo BIGINT NOT NULL DEFAULT 0,
                    response_code TEXT,
                    status TEXT NOT NULL DEFAULT 'PENDING',
                    last_polled_at TIMESTAMPTZ,
                    poll_count INTEGER NOT NULL DEFAULT 0,
                    error_message TEXT,
                    local_transaction_id BIGINT,
                    user_id TEXT,
                    rail_mode TEXT NOT NULL DEFAULT 'olivepay',
                    metadata JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_op_payouts_ref ON copteller.olivepay_payouts(olivepay_reference);
                CREATE INDEX IF NOT EXISTS idx_op_payouts_status ON copteller.olivepay_payouts(status);
            `)

            // 7. Unified Webhook Inbox (Idempotent on (event_type, dedupe_reference))
            await queryCopteller(`
                CREATE TABLE IF NOT EXISTS copteller.olivepay_webhook_events (
                    id BIGSERIAL PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    dedupe_reference TEXT NOT NULL,
                    raw_headers JSONB DEFAULT '{}'::jsonb,
                    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
                    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
                    processing_status TEXT NOT NULL DEFAULT 'RECEIVED',
                    error_message TEXT,
                    rail_mode TEXT NOT NULL DEFAULT 'olivepay',
                    processed_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (event_type, dedupe_reference)
                );
                CREATE INDEX IF NOT EXISTS idx_op_wh_created ON copteller.olivepay_webhook_events(created_at DESC);
            `)

            // 8. NIP Bank List & Name Enquiry Cache (Protects 30 rpm limit)
            await queryCopteller(`
                CREATE TABLE IF NOT EXISTS copteller.olivepay_banks_cache (
                    bank_code TEXT PRIMARY KEY,
                    bank_name TEXT NOT NULL,
                    short_code TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS copteller.olivepay_name_enquiry_cache (
                    bank_code TEXT NOT NULL,
                    account_number TEXT NOT NULL,
                    account_name TEXT NOT NULL,
                    bank_name TEXT,
                    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (bank_code, account_number)
                );
            `)

            // 9. Product Type Extensions (form_schema + workflow bindings without breaking Payload push:false)
            await queryCopteller(`
                CREATE TABLE IF NOT EXISTS copteller.copteller_product_type_extensions (
                    product_type_id BIGINT PRIMARY KEY,
                    form_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
                    onboarding_workflow_id TEXT,
                    disbursement_workflow_id TEXT,
                    repayment_workflow_id TEXT,
                    olivepay_settlement_config JSONB NOT NULL DEFAULT '{}'::jsonb,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `)

            // 10. Sandbox Master Treasury Ledger (tracks internal testing rail float balance)
            await queryCopteller(`
                CREATE TABLE IF NOT EXISTS copteller.olivepay_sandbox_master (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    available_balance_kobo BIGINT NOT NULL DEFAULT 50000000000,
                    currency TEXT NOT NULL DEFAULT 'NGN',
                    status TEXT NOT NULL DEFAULT 'ACTIVE',
                    holds_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    delegated_kyc_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    commission_config JSONB NOT NULL DEFAULT '{"subwallet_transfer":{"type":"flat","value":0},"subwallet_payout":{"type":"flat","value":25},"hold_capture":{"type":"percentage","value":1.5}}'::jsonb,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                INSERT INTO copteller.olivepay_sandbox_master (id, available_balance_kobo)
                VALUES (1, 50000000000)
                ON CONFLICT (id) DO NOTHING;
            `)

            // 11. Extend existing Postgres ENUM types for OlivePay auth modes (idempotent, ignore if enum name differs)
            const enumAlterations = [
                `ALTER TYPE copteller.enum_service_providers_auth_type ADD VALUE IF NOT EXISTS 'HEADER'`,
                `ALTER TYPE copteller.enum_service_providers_auth_type ADD VALUE IF NOT EXISTS 'OLIVEPAY_PUBLIC_BEARER'`,
                `ALTER TYPE copteller.enum_service_providers_auth_type ADD VALUE IF NOT EXISTS 'OLIVEPAY_JWT'`,
                `ALTER TYPE copteller.enum_service_providers_auth_type ADD VALUE IF NOT EXISTS 'OLIVEPAY_JWT_HMAC'`,
                `ALTER TYPE copteller.enum_endpoints_auth_override ADD VALUE IF NOT EXISTS 'HEADER'`,
                `ALTER TYPE copteller.enum_endpoints_auth_override ADD VALUE IF NOT EXISTS 'BASIC'`,
                `ALTER TYPE copteller.enum_endpoints_auth_override ADD VALUE IF NOT EXISTS 'OAUTH2'`,
                `ALTER TYPE copteller.enum_endpoints_auth_override ADD VALUE IF NOT EXISTS 'OLIVEPAY_PUBLIC_BEARER'`,
                `ALTER TYPE copteller.enum_endpoints_auth_override ADD VALUE IF NOT EXISTS 'OLIVEPAY_JWT'`,
                `ALTER TYPE copteller.enum_endpoints_auth_override ADD VALUE IF NOT EXISTS 'OLIVEPAY_JWT_HMAC'`,
            ]
            for (const stmt of enumAlterations) {
                await queryCopteller(stmt).catch(() => {})
            }

            // 12. Seed 6-digit NIP bank list if cache is empty
            const bankCount = await queryCopteller(`SELECT COUNT(*)::int AS cnt FROM copteller.olivepay_banks_cache`)
            if ((bankCount.rows[0]?.cnt ?? 0) === 0) {
                for (const bank of NIGERIAN_NIP_BANKS_6DIGIT) {
                    await queryCopteller(
                        `INSERT INTO copteller.olivepay_banks_cache (bank_code, bank_name, short_code, is_active, updated_at)
                         VALUES ($1, $2, $3, TRUE, NOW())
                         ON CONFLICT (bank_code) DO NOTHING`,
                        [bank.code, bank.name, bank.shortCode || null]
                    ).catch(() => {})
                }
            }
        } catch (err: any) {
            ensurePromise = null
            console.error('[ensureOlivePayTables] Schema initialization error:', err.message)
            throw err
        }
    })()

    return ensurePromise
}

export async function getPlatformConfig<T = Record<string, any>>(key: string, fallback: T): Promise<T> {
    try {
        await ensureOlivePayTables()
        const res = await queryCopteller(
            `SELECT config_value FROM copteller.olivepay_platform_config WHERE config_key = $1 LIMIT 1`,
            [key]
        )
        if (res.rows[0]?.config_value) {
            return { ...fallback, ...res.rows[0].config_value } as T
        }
    } catch (err: any) {
        console.warn(`[getPlatformConfig:${key}] Fallback used:`, err.message)
    }
    return fallback
}

export async function setPlatformConfig(
    key: string,
    value: Record<string, any>,
    updatedBy?: string
): Promise<void> {
    await ensureOlivePayTables()
    await queryCopteller(
        `INSERT INTO copteller.olivepay_platform_config (config_key, config_value, updated_by, updated_at)
         VALUES ($1, $2::jsonb, $3, NOW())
         ON CONFLICT (config_key) DO UPDATE
         SET config_value = copteller.olivepay_platform_config.config_value || EXCLUDED.config_value,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()`,
        [key, JSON.stringify(value), updatedBy || 'system']
    )
}
