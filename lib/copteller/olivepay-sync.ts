import { queryCopteller } from '@/lib/copteller/pg'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'
import { olivePayClient, nairaToKobo, TIER_LIMITS_NAIRA } from '@/lib/copteller/olivepay-client'

/**
 * Ensures a Copteller member has a provisioned OlivePay / Sandbox SubWallet row linked
 * to their `user_id`, `customer_id`, and `account_id` in `copteller.olivepay_subwallets`.
 */
export async function ensureMemberOlivePaySubWallet(params: {
    userId: string
    email: string
    fullName?: string
    phoneNumber?: string
    accountId?: number | null
    customerId?: number | null
    bvn?: string
    nin?: string
    requestedTier?: 1 | 2 | 3
}): Promise<any> {
    await ensureOlivePayTables()

    const existing = await queryCopteller(
        `SELECT * FROM copteller.olivepay_subwallets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [params.userId]
    )
    if (existing.rows[0]) {
        const row = existing.rows[0]
        // Bind account_id if missing
        if (params.accountId && !row.account_id) {
            await queryCopteller(
                `UPDATE copteller.olivepay_subwallets SET account_id = $1, updated_at = NOW() WHERE id = $2`,
                [params.accountId, row.id]
            ).catch(() => {})
            row.account_id = params.accountId
        }
        return row
    }

    const parts = String(params.fullName || params.email?.split('@')[0] || 'Copteller Member').trim().split(/\s+/)
    const firstName = parts[0] || 'Copteller'
    const lastName = parts.slice(1).join(' ') || 'Member'
    const holderRef = `member_${params.customerId || params.userId.slice(0, 12)}`

    const res = await olivePayClient.createSubWallet({
        walletHolderReference: holderRef,
        firstName,
        lastName,
        email: params.email || `${holderRef}@copteller.app`,
        phoneNumber: params.phoneNumber || '08000000000',
        bvn: params.bvn,
        nin: params.nin,
        requestedTier: params.requestedTier || (params.nin ? 2 : 1),
        canPayout: true,
    })

    if (!res.ok || !res.data) {
        throw new Error(res.message || 'Failed to provision OlivePay SubWallet')
    }

    const d = res.data
    const subWalletId = String(d.id || d.sub_wallet_id || '')
    const tier = Number(d.tier || 1)
    const tierLimits = d.tier_limits || TIER_LIMITS_NAIRA[tier]

    // Sync local `copteller.olivepay_subwallets` (upsert for live mode; sandbox already inserted)
    const upsert = await queryCopteller(
        `INSERT INTO copteller.olivepay_subwallets
         (entity_type, customer_id, user_id, account_id, olivepay_sub_wallet_id, wallet_holder_reference,
          first_name, last_name, email, phone_number, virtual_account_number, virtual_account_name,
          virtual_account_bank_name, virtual_account_bank_code, status, can_payout, tier, tier_limits,
          ledger_balance_kobo, lien_balance_kobo, available_balance_kobo, available_today_kobo,
          is_tier_locked, is_admin_frozen, bvn_verified, nin_verified, rail_mode, raw_response, last_synced_at)
         VALUES ('member', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, TRUE, $15, $16::jsonb,
                 $17, $18, $19, $20, $21, $22, $23, $24, $25, $26::jsonb, NOW())
         ON CONFLICT (olivepay_sub_wallet_id) DO UPDATE SET
           customer_id = COALESCE(EXCLUDED.customer_id, copteller.olivepay_subwallets.customer_id),
           user_id = COALESCE(EXCLUDED.user_id, copteller.olivepay_subwallets.user_id),
           account_id = COALESCE(EXCLUDED.account_id, copteller.olivepay_subwallets.account_id),
           virtual_account_number = COALESCE(EXCLUDED.virtual_account_number, copteller.olivepay_subwallets.virtual_account_number),
           status = EXCLUDED.status,
           tier = EXCLUDED.tier,
           tier_limits = EXCLUDED.tier_limits,
           last_synced_at = NOW(),
           updated_at = NOW()
         RETURNING *`,
        [
            params.customerId || null,
            params.userId,
            params.accountId || null,
            subWalletId,
            holderRef,
            firstName,
            lastName,
            params.email || null,
            params.phoneNumber || null,
            d.virtual_account_number || null,
            d.virtual_account_name || `${firstName} ${lastName}`.toUpperCase(),
            d.virtual_account_bank_name || 'OlivePay Bank',
            d.virtual_account_bank_code || '999999',
            d.status || 'Active',
            tier,
            JSON.stringify(tierLimits),
            nairaToKobo(d.ledger_balance ?? 0),
            nairaToKobo(d.lien_balance ?? 0),
            nairaToKobo(d.available_balance ?? 0),
            nairaToKobo(d.available_today ?? tierLimits.daily_debit),
            Boolean(d.is_tier_locked),
            Boolean(d.is_admin_frozen),
            Boolean(d.bvn_verified || params.bvn),
            Boolean(d.nin_verified || params.nin),
            res.railMode,
            JSON.stringify(d),
        ]
    )

    return upsert.rows[0]
}

/**
 * Syncs local `copteller.olivepay_subwallets` row with latest remote balances & KYC tier state.
 */
export async function refreshOlivePaySubWallet(subWalletId: string): Promise<any | null> {
    await ensureOlivePayTables()
    const res = await olivePayClient.getSubWallet(subWalletId)
    if (!res.ok || !res.data) return null
    const d = res.data
    const upd = await queryCopteller(
        `UPDATE copteller.olivepay_subwallets
         SET virtual_account_number = COALESCE($1, virtual_account_number),
             virtual_account_name = COALESCE($2, virtual_account_name),
             virtual_account_bank_name = COALESCE($3, virtual_account_bank_name),
             status = COALESCE($4, status),
             tier = COALESCE($5, tier),
             tier_limits = COALESCE($6::jsonb, tier_limits),
             ledger_balance_kobo = $7,
             lien_balance_kobo = $8,
             available_balance_kobo = $9,
             available_today_kobo = $10,
             is_tier_locked = $11,
             is_admin_frozen = $12,
             bvn_verified = $13,
             nin_verified = $14,
             pending_tier_upgrade = $15::jsonb,
             last_synced_at = NOW(),
             updated_at = NOW()
         WHERE olivepay_sub_wallet_id = $16
         RETURNING *`,
        [
            d.virtual_account_number || null,
            d.virtual_account_name || null,
            d.virtual_account_bank_name || null,
            d.status || null,
            d.tier ? Number(d.tier) : null,
            d.tier_limits ? JSON.stringify(d.tier_limits) : null,
            nairaToKobo(d.ledger_balance ?? 0),
            nairaToKobo(d.lien_balance ?? 0),
            nairaToKobo(d.available_balance ?? 0),
            nairaToKobo(d.available_today ?? 0),
            Boolean(d.is_tier_locked),
            Boolean(d.is_admin_frozen),
            Boolean(d.bvn_verified),
            Boolean(d.nin_verified),
            d.pending_tier_upgrade ? JSON.stringify(d.pending_tier_upgrade) : null,
            subWalletId,
        ]
    )
    return upd.rows[0] || null
}

/**
 * Ensures a Cooperative Treasury SubWallet exists in `copteller.olivepay_subwallets`
 * so Ajo/Esusu contributions, dues collections, and cooperative payouts mirror onto OlivePay / Sandbox rails.
 */
export async function ensureCooperativeTreasurySubWallet(params: {
    cooperativeId?: number | string | null
    cooperativeName?: string
    email?: string
}): Promise<any | null> {
    await ensureOlivePayTables()
    const coopKey = String(params.cooperativeId || 'default')
    const holderRef = `coop_treasury_${coopKey}`

    const existing = await queryCopteller(
        `SELECT * FROM copteller.olivepay_subwallets
         WHERE entity_type = 'cooperative' AND wallet_holder_reference = $1
         ORDER BY created_at DESC LIMIT 1`,
        [holderRef]
    ).catch(() => ({ rows: [] as any[] }))

    if (existing.rows[0]) return existing.rows[0]

    const cleanName = String(params.cooperativeName || 'Copteller Cooperative').trim()
    const res = await olivePayClient.createSubWallet({
        walletHolderReference: holderRef,
        firstName: cleanName.slice(0, 32),
        lastName: 'Treasury',
        email: params.email || `${holderRef}@copteller.app`,
        phoneNumber: '08000000000',
        requestedTier: 3,
        canPayout: true,
    })

    if (!res.ok || !res.data) return null
    const d = res.data
    const subWalletId = String(d.id || d.sub_wallet_id || '')
    if (!subWalletId) return null

    const tier = Number(d.tier || 3)
    const tierLimits = d.tier_limits || TIER_LIMITS_NAIRA[tier]

    const upsert = await queryCopteller(
        `INSERT INTO copteller.olivepay_subwallets
         (entity_type, cooperative_id, olivepay_sub_wallet_id, wallet_holder_reference,
          first_name, last_name, email, virtual_account_number, virtual_account_name,
          virtual_account_bank_name, virtual_account_bank_code, status, can_payout, tier, tier_limits,
          ledger_balance_kobo, lien_balance_kobo, available_balance_kobo, available_today_kobo,
          rail_mode, raw_response, last_synced_at)
         VALUES ('cooperative', $1, $2, $3, $4, 'Treasury', $5, $6, $7, $8, $9, $10, TRUE, $11, $12::jsonb,
                 $13, $14, $15, $16, $17, $18::jsonb, NOW())
         ON CONFLICT (olivepay_sub_wallet_id) DO UPDATE SET
           last_synced_at = NOW(),
           updated_at = NOW()
         RETURNING *`,
        [
            Number.isFinite(Number(params.cooperativeId)) ? Number(params.cooperativeId) : null,
            subWalletId,
            holderRef,
            cleanName.slice(0, 64),
            params.email || `${holderRef}@copteller.app`,
            d.virtual_account_number || null,
            d.virtual_account_name || `${cleanName.toUpperCase()} TREASURY`,
            d.virtual_account_bank_name || 'OlivePay Bank',
            d.virtual_account_bank_code || '999999',
            d.status || 'Active',
            tier,
            JSON.stringify(tierLimits),
            nairaToKobo(d.ledger_balance ?? 0),
            nairaToKobo(d.lien_balance ?? 0),
            nairaToKobo(d.available_balance ?? 0),
            nairaToKobo(d.available_today ?? tierLimits.daily_debit),
            res.railMode,
            JSON.stringify(d),
        ]
    ).catch(() => ({ rows: [] as any[] }))

    return upsert.rows[0] || null
}
