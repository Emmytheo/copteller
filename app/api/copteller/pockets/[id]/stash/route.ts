import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool, queryCopteller } from '@/lib/copteller/pg'
import { olivePayClient } from '@/lib/copteller/olivepay-client'
import { ensureMemberOlivePaySubWallet } from '@/lib/copteller/olivepay-sync'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/pockets/[id]/stash
 * Transfers funds from the user's main wallet account into this designated sub-pocket.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const { id } = await params
        const pocketId = parseInt(id)
        if (!pocketId || isNaN(pocketId)) {
            return NextResponse.json({ error: 'Valid pocket ID is required' }, { status: 400 })
        }

        const body = await req.json().catch(() => ({}))
        const { amount, narration } = body

        const amountNum = Number(amount)
        if (!amountNum || amountNum <= 0) {
            return NextResponse.json({ error: 'Please enter a valid amount to stash (minimum ₦100)' }, { status: 400 })
        }
        const amountKobo = Math.round(amountNum * 100)

        const pool = getCoptellerPool()
        const client = await pool.connect()

        try {
            await client.query('BEGIN')

            // 1. Get pocket and verify ownership
            const pocketRes = await client.query(`
                SELECT p.*, a.balance as account_balance, a.id as acc_id
                FROM copteller.pockets p
                JOIN copteller.accounts a ON a.id = p.account_id
                WHERE p.id = $1 AND p.user_id = $2
                FOR UPDATE
            `, [pocketId, auth.userId])

            if (pocketRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Pocket not found or unauthorized access.' }, { status: 404 })
            }

            const pocket = pocketRes.rows[0]
            const primaryBalanceKobo = Number(pocket.account_balance || 0)

            if (primaryBalanceKobo < amountKobo) {
                await client.query('ROLLBACK')
                return NextResponse.json({
                    error: `Insufficient balance in main wallet. Available: ₦${(primaryBalanceKobo / 100).toLocaleString()}, Required: ₦${amountNum.toLocaleString()}`
                }, { status: 400 })
            }

            // 2. Debit primary account
            const newAccBalanceKobo = primaryBalanceKobo - amountKobo
            await client.query(`
                UPDATE copteller.accounts
                SET balance = $1, updated_at = NOW()
                WHERE id = $2
            `, [newAccBalanceKobo, pocket.acc_id])

            // 3. Credit pocket
            const newPocketBalance = Number(pocket.balance || 0) + amountNum
            const updatePocketRes = await client.query(`
                UPDATE copteller.pockets
                SET balance = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING *
            `, [newPocketBalance, pocketId])

            // 4. Log to pocket_transactions
            const ref = `PKT_STASH_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            await client.query(`
                INSERT INTO copteller.pocket_transactions (
                    pocket_id, account_id, type, amount, balance_after, narration, reference
                ) VALUES ($1, $2, 'stash', $3, $4, $5, $6)
            `, [
                pocketId,
                pocket.acc_id,
                amountNum,
                newPocketBalance,
                narration || `Stashed into ${pocket.name}`,
                ref
            ])

            // 5. Log to main ledger transactions
            await client.query(`
                INSERT INTO copteller.transactions (
                    reference, type, amount, from_account_id, status, narration, user_id, balance_after
                ) VALUES ($1, 'debit', $2, $3, 'successful', $4, $5, $6)
            `, [
                ref,
                amountKobo,
                pocket.acc_id,
                `Stashed into Pocket: ${pocket.name}`,
                auth.userId,
                newAccBalanceKobo
            ])

            await client.query('COMMIT')

            // Place matching OlivePay Escrow Hold (lien) when holds are enabled on active rail
            let escrowHold: any = null
            try {
                const sw = await ensureMemberOlivePaySubWallet({
                    userId: auth.userId,
                    email: auth.email,
                    fullName: auth.displayName,
                    accountId: Number(pocket.acc_id),
                })
                if (sw?.rail_mode === 'sandbox_simulator') {
                    await queryCopteller(
                        `UPDATE copteller.olivepay_subwallets SET available_balance_kobo = GREATEST(available_balance_kobo, $1), ledger_balance_kobo = GREATEST(ledger_balance_kobo, $1) WHERE olivepay_sub_wallet_id = $2`,
                        [primaryBalanceKobo, sw.olivepay_sub_wallet_id]
                    )
                }
                const hRes = await olivePayClient.placeHold({
                    subWalletId: sw.olivepay_sub_wallet_id,
                    amountKobo,
                    reason: `Target Pocket Stash: ${pocket.name}`,
                    idempotencyKey: ref,
                    externalReference: `pocket_${pocketId}`,
                })
                if (hRes.ok && hRes.data?.id) {
                    escrowHold = { holdId: hRes.data.id, reference: hRes.data.reference, railMode: hRes.railMode }
                    await queryCopteller(
                        `UPDATE copteller.olivepay_holds SET entity_type = 'pocket', entity_id = $1 WHERE olivepay_hold_id = $2`,
                        [String(pocketId), hRes.data.id]
                    ).catch(() => {})
                }
            } catch {}

            return NextResponse.json({
                success: true,
                message: `Successfully stashed ₦${amountNum.toLocaleString()} into "${pocket.name}"`,
                pocket: updatePocketRes.rows[0],
                primaryBalanceNaira: newAccBalanceKobo / 100,
                escrowHold,
            })
        } catch (txErr) {
            await client.query('ROLLBACK')
            throw txErr
        } finally {
            client.release()
        }
    } catch (err: any) {
        console.error('[Pocket Stash Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
