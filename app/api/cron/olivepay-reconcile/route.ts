import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerCronOrAdmin } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'
import { olivePayClient, nairaToKobo } from '@/lib/copteller/olivepay-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/olivepay-reconcile
 * Automated background reconciler & webhook backstop:
 *  1. Polls `Pending` SubWallets until asynchronous `virtual_account_number` is provisioned
 *  2. Polls `PENDING` / `PROCESSING` Merchant Payouts, SubWallet Payouts & SWF Fundings
 *  3. Expires overdue Dynamic Virtual Accounts (`expires_at < NOW()`)
 *  4. Releases expired Escrow Holds (`expires_policy_at <= NOW()`) so member lien_balance is never orphaned
 *  5. Refreshes the NIP bank list cache if stale (>24h)
 */
export async function GET(req: NextRequest) {
    const auth = await requireCoptellerCronOrAdmin(req)
    if (auth instanceof NextResponse) return auth

    try {
        await ensureOlivePayTables()
        const report = {
            subwalletsProvisioned: 0,
            payoutsReconciled: 0,
            virtualAccountsExpired: 0,
            staleHoldsReleased: 0,
            banksRefreshed: false,
            errors: [] as string[],
        }

        // 1. Poll Pending SubWallets missing NUBAN
        const pendingSw = await queryCopteller(
            `SELECT id, olivepay_sub_wallet_id, account_id, rail_mode
             FROM copteller.olivepay_subwallets
             WHERE virtual_account_number IS NULL OR status = 'Pending'
             LIMIT 25`
        )
        for (const sw of pendingSw.rows) {
            try {
                const res = await olivePayClient.getSubWallet(
                    sw.olivepay_sub_wallet_id,
                    sw.rail_mode === 'sandbox_simulator'
                )
                if (res.ok && res.data) {
                    const nuban = res.data.virtual_account_number || null
                    await queryCopteller(
                        `UPDATE copteller.olivepay_subwallets
                         SET virtual_account_number = COALESCE($1, virtual_account_number),
                             virtual_account_name = COALESCE($2, virtual_account_name),
                             virtual_account_bank_name = COALESCE($3, virtual_account_bank_name),
                             status = COALESCE($4, status),
                             available_balance_kobo = $5,
                             lien_balance_kobo = $6,
                             ledger_balance_kobo = $7,
                             last_synced_at = NOW(),
                             updated_at = NOW()
                         WHERE id = $8`,
                        [
                            nuban,
                            res.data.virtual_account_name || null,
                            res.data.virtual_account_bank_name || null,
                            res.data.status || 'Active',
                            nairaToKobo(res.data.available_balance ?? 0),
                            nairaToKobo(res.data.lien_balance ?? 0),
                            nairaToKobo(res.data.ledger_balance ?? 0),
                            sw.id,
                        ]
                    )
                    if (nuban) report.subwalletsProvisioned++
                }
            } catch (e: any) {
                report.errors.push(`SubWallet ${sw.olivepay_sub_wallet_id}: ${e.message}`)
            }
        }

        // 2. Poll PENDING/PROCESSING Payouts & SWF Fundings
        const pendingPayouts = await queryCopteller(
            `SELECT id, rail, olivepay_reference, rail_mode
             FROM copteller.olivepay_payouts
             WHERE status IN ('PENDING', 'PROCESSING') AND olivepay_reference IS NOT NULL
             ORDER BY created_at ASC LIMIT 30`
        )
        for (const p of pendingPayouts.rows) {
            try {
                const forceSbx = p.rail_mode === 'sandbox_simulator'
                const res =
                    p.rail === 'subwallet_funding'
                        ? await olivePayClient.getSubWalletFundingStatus(p.olivepay_reference, forceSbx)
                        : p.rail === 'subwallet_payout'
                            ? await olivePayClient.getSubWalletPayoutStatus(p.olivepay_reference, forceSbx)
                            : await olivePayClient.getMerchantPayoutStatus(p.olivepay_reference, forceSbx)

                if (res.ok && res.data?.status) {
                    await queryCopteller(
                        `UPDATE copteller.olivepay_payouts
                         SET status = $1, provider_reference = COALESCE($2, provider_reference),
                             last_polled_at = NOW(), poll_count = poll_count + 1, updated_at = NOW()
                         WHERE id = $3`,
                        [String(res.data.status).toUpperCase(), res.data.providerReference || null, p.id]
                    )
                    report.payoutsReconciled++
                }
            } catch (e: any) {
                report.errors.push(`Payout ${p.olivepay_reference}: ${e.message}`)
            }
        }

        // 3. Expire overdue Dynamic Virtual Accounts
        const expVa = await queryCopteller(
            `UPDATE copteller.olivepay_virtual_accounts
             SET status = 'expired', updated_at = NOW()
             WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < NOW()
             RETURNING id`
        )
        report.virtualAccountsExpired = expVa.rows.length

        // 4. Auto-release expired Escrow Holds (OlivePay holds never expire on their own!)
        const staleHolds = await queryCopteller(
            `SELECT id, olivepay_hold_id, rail_mode
             FROM copteller.olivepay_holds
             WHERE status = 'Active' AND expires_policy_at IS NOT NULL AND expires_policy_at <= NOW()
             LIMIT 20`
        )
        for (const h of staleHolds.rows) {
            try {
                const rel = await olivePayClient.releaseHold(
                    h.olivepay_hold_id,
                    'Auto-released by Copteller expiry policy',
                    h.rail_mode === 'sandbox_simulator'
                )
                if (rel.ok) {
                    await queryCopteller(
                        `UPDATE copteller.olivepay_holds SET status = 'Released', updated_at = NOW() WHERE id = $1`,
                        [h.id]
                    )
                    report.staleHoldsReleased++
                }
            } catch (e: any) {
                report.errors.push(`Hold ${h.olivepay_hold_id}: ${e.message}`)
            }
        }

        // 5. Refresh NIP Bank list cache if older than 24 hours
        const bankAge = await queryCopteller(`SELECT MAX(updated_at) AS latest FROM copteller.olivepay_banks_cache`)
        const latest = bankAge.rows[0]?.latest ? new Date(bankAge.rows[0].latest).getTime() : 0
        if (Date.now() - latest > 24 * 60 * 60_000) {
            const banks = await olivePayClient.listBanks().catch(() => null)
            report.banksRefreshed = Boolean(banks?.ok)
        }

        return NextResponse.json({ success: true, report })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Reconciler failed' }, { status: 500 })
    }
}
