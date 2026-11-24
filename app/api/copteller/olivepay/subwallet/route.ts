import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'
import { ensureMemberOlivePaySubWallet, refreshOlivePaySubWallet } from '@/lib/copteller/olivepay-sync'
import { resolveActiveOlivePayRailMode, TIER_LIMITS_NAIRA } from '@/lib/copteller/olivepay-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/olivepay/subwallet
 * Returns the authenticated member's OlivePay SubWallet (auto-provisioning if missing),
 * live KYC Tier 1–3 limits, lien/escrow holds, pending Dynamic Virtual Accounts, and active rail mode.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        await ensureOlivePayTables()
        const syncRemote = new URL(req.url).searchParams.get('refresh') === '1'

        // Resolve member's local account & customer ID
        const accRes = await queryCopteller(
            `SELECT a.id AS account_id, a.customer_id, c.phone_number
             FROM copteller.accounts a
             LEFT JOIN copteller.customers c ON c.id = a.customer_id
             WHERE a.user_id = $1 AND a.status = 'active'
             ORDER BY a.created_at ASC LIMIT 1`,
            [auth.userId]
        ).catch(() => ({ rows: [] as any[] }))

        let sw = await ensureMemberOlivePaySubWallet({
            userId: auth.userId,
            email: auth.email,
            fullName: auth.displayName,
            phoneNumber: accRes.rows[0]?.phone_number || undefined,
            accountId: accRes.rows[0]?.account_id ? Number(accRes.rows[0].account_id) : null,
            customerId: accRes.rows[0]?.customer_id ? Number(accRes.rows[0].customer_id) : null,
        })

        if (syncRemote && sw?.olivepay_sub_wallet_id) {
            const refreshed = await refreshOlivePaySubWallet(sw.olivepay_sub_wallet_id)
            if (refreshed) sw = refreshed
        }

        const [holdsRes, vasRes, railMode] = await Promise.all([
            queryCopteller(
                `SELECT * FROM copteller.olivepay_holds WHERE sub_wallet_id = $1 ORDER BY created_at DESC LIMIT 20`,
                [sw.olivepay_sub_wallet_id]
            ).catch(() => ({ rows: [] as any[] })),
            queryCopteller(
                `SELECT * FROM copteller.olivepay_virtual_accounts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
                [auth.userId]
            ).catch(() => ({ rows: [] as any[] })),
            resolveActiveOlivePayRailMode(),
        ])

        return NextResponse.json({
            success: true,
            railMode,
            subwallet: {
                id: sw.olivepay_sub_wallet_id,
                holderReference: sw.wallet_holder_reference,
                virtualAccountNumber: sw.virtual_account_number,
                virtualAccountName: sw.virtual_account_name,
                bankName: sw.virtual_account_bank_name || 'OlivePay Bank',
                status: sw.status,
                canPayout: Boolean(sw.can_payout),
                tier: Number(sw.tier || 1),
                tierLimits: sw.tier_limits || TIER_LIMITS_NAIRA[Number(sw.tier || 1)],
                availableBalanceNaira: Number(sw.available_balance_kobo || 0) / 100,
                lienBalanceNaira: Number(sw.lien_balance_kobo || 0) / 100,
                ledgerBalanceNaira: Number(sw.ledger_balance_kobo || 0) / 100,
                availableTodayNaira: Number(sw.available_today_kobo || 0) / 100,
                isTierLocked: Boolean(sw.is_tier_locked),
                isAdminFrozen: Boolean(sw.is_admin_frozen),
                bvnVerified: Boolean(sw.bvn_verified),
                ninVerified: Boolean(sw.nin_verified),
                pendingTierUpgrade: sw.pending_tier_upgrade || null,
                lastSyncedAt: sw.last_synced_at,
            },
            holds: holdsRes.rows.map((h: any) => ({
                id: h.olivepay_hold_id,
                reference: h.reference,
                amountNaira: Number(h.amount_kobo || 0) / 100,
                capturedAmountNaira: Number(h.captured_amount_kobo || 0) / 100,
                status: h.status,
                reason: h.reason,
                entityType: h.entity_type,
                entityId: h.entity_id,
                createdAt: h.created_at,
            })),
            virtualAccounts: vasRes.rows.map((v: any) => ({
                transactionId: v.transaction_id,
                accountNumber: v.account_number,
                bankName: v.bank_name,
                amountNaira: Number(v.amount_kobo || 0) / 100,
                amountPayableNaira: Number(v.amount_payable_kobo || 0) / 100,
                status: v.status,
                expiresAt: v.expires_at,
            })),
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to load SubWallet' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const sw = await ensureMemberOlivePaySubWallet({
            userId: auth.userId,
            email: body.email || auth.email,
            fullName: body.fullName || auth.displayName,
            phoneNumber: body.phoneNumber,
            bvn: body.bvn,
            nin: body.nin,
            requestedTier: body.requestedTier,
        })

        return NextResponse.json({ success: true, subwallet: sw })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'SubWallet provisioning failed' }, { status: 500 })
    }
}
