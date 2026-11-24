import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool } from '@/lib/copteller/pg'
import { olivePayClient } from '@/lib/copteller/olivepay-client'
import { ensureMemberOlivePaySubWallet, ensureCooperativeTreasurySubWallet } from '@/lib/copteller/olivepay-sync'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/circles/[id]/payout
 * Disburses collected pool funds to the designated recipient member for this round (or goal disbursement).
 * Only the Circle Creator / Admin can execute payouts.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const { id } = await params
        const circleId = parseInt(id)
        if (!circleId || isNaN(circleId)) {
            return NextResponse.json({ error: 'Valid circle ID is required' }, { status: 400 })
        }

        const body = await req.json().catch(() => ({}))
        const { recipientMemberId, amount } = body

        const pool = getCoptellerPool()
        const client = await pool.connect()

        try {
            await client.query('BEGIN')

            // 1. Fetch circle with lock
            const circleRes = await client.query(`
                SELECT * FROM copteller.social_circles WHERE id = $1 FOR UPDATE
            `, [circleId])

            if (circleRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Circle not found.' }, { status: 404 })
            }

            const circle = circleRes.rows[0]

            // 2. Authorize creator / admin
            if (circle.creator_id !== auth.userId) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Only the circle administrator can execute payouts.' }, { status: 403 })
            }

            // 3. Determine payout amount and validate pool
            const payoutAmount = amount ? Number(amount) : Number(circle.current_pool)
            if (!payoutAmount || payoutAmount <= 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Invalid payout amount.' }, { status: 400 })
            }

            if (Number(circle.current_pool || 0) < payoutAmount) {
                await client.query('ROLLBACK')
                return NextResponse.json({
                    error: `Insufficient funds in circle pool. Available: ₦${Number(circle.current_pool).toLocaleString()}, Requested: ₦${payoutAmount.toLocaleString()}`
                }, { status: 400 })
            }

            // 4. Resolve recipient member
            let memberQuery = `SELECT * FROM copteller.social_circle_members WHERE circle_id = $1 `
            const memberParams: any[] = [circleId]

            if (recipientMemberId) {
                memberQuery += ` AND id = $2 `
                memberParams.push(recipientMemberId)
            } else if (circle.circle_type === 'rotational_esusu') {
                memberQuery += ` AND rotation_order = $2 `
                memberParams.push(circle.current_round)
            } else {
                memberQuery += ` AND role = 'admin' LIMIT 1 `
            }

            const recipientRes = await client.query(memberQuery, memberParams)
            if (recipientRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Recipient member not found for this payout round.' }, { status: 404 })
            }

            const recipient = recipientRes.rows[0]

            // 5. Find recipient's active account to credit
            let recipientAccRes = await client.query(`
                SELECT * FROM copteller.accounts 
                WHERE (id = $1 OR user_id = $2) AND status = 'active'
                ORDER BY created_at ASC LIMIT 1
                FOR UPDATE
            `, [recipient.account_id, recipient.user_id])

            if (recipientAccRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: `Recipient ${recipient.name} does not have an active Copteller account to receive funds.` }, { status: 400 })
            }

            const recipientAcc = recipientAccRes.rows[0]
            const payoutKobo = Math.round(payoutAmount * 100)
            const newRecipientBalKobo = Number(recipientAcc.balance || 0) + payoutKobo

            // 6. Credit recipient account
            await client.query(`
                UPDATE copteller.accounts
                SET balance = $1, updated_at = NOW(), last_transaction_at = NOW()
                WHERE id = $2
            `, [newRecipientBalKobo, recipientAcc.id])

            // 7. Debit Circle Pool
            const newPool = Number(circle.current_pool) - payoutAmount
            const nextRound = circle.circle_type === 'rotational_esusu' ? Number(circle.current_round) + 1 : circle.current_round

            await client.query(`
                UPDATE copteller.social_circles
                SET current_pool = $1, current_round = $2, updated_at = NOW()
                WHERE id = $3
            `, [newPool, nextRound, circleId])

            // 8. Update recipient payout status
            await client.query(`
                UPDATE copteller.social_circle_members
                SET has_received_payout = true, payout_date = NOW()
                WHERE id = $1
            `, [recipient.id])

            // 9. Record payout
            const txRef = `CIRC_PO_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            await client.query(`
                INSERT INTO copteller.social_circle_payouts (
                    circle_id, recipient_member_id, amount, round_number, reference, status
                ) VALUES ($1, $2, $3, $4, $5, 'completed')
            `, [circleId, recipient.id, payoutAmount, circle.current_round, txRef])

            // 10. Record main ledger credit transaction
            await client.query(`
                INSERT INTO copteller.transactions (
                    reference, type, amount, to_account_id, status, narration, user_id, balance_after
                ) VALUES ($1, 'credit', $2, $3, 'successful', $4, $5, $6)
            `, [
                txRef,
                payoutKobo,
                recipientAcc.id,
                `Payout from Circle: ${circle.name} (Round ${circle.current_round})`,
                recipient.user_id,
                newRecipientBalKobo
            ])

            await client.query('COMMIT')

            // Best-effort zero-fee OlivePay / Sandbox W2W disbursement from Treasury -> Recipient SubWallet
            let olivePayRef: string | null = null
            try {
                const [treasurySw, recipientSw] = await Promise.all([
                    ensureCooperativeTreasurySubWallet({
                        cooperativeId: circle.cooperative_id || `circle_${circleId}`,
                        cooperativeName: circle.name || `Circle ${circleId}`,
                    }),
                    ensureMemberOlivePaySubWallet({
                        userId: String(recipient.user_id || recipientAcc.user_id || `member_${recipient.id}`),
                        email: recipient.email || `member_${recipient.id}@copteller.app`,
                        fullName: recipient.name || 'Circle Member',
                        accountId: Number(recipientAcc.id),
                    }),
                ])
                if (treasurySw?.olivepay_sub_wallet_id && recipientSw?.olivepay_sub_wallet_id) {
                    const w2w = await olivePayClient.transferSubWallet({
                        sourceSubWalletId: treasurySw.olivepay_sub_wallet_id,
                        destinationSubWalletId: recipientSw.olivepay_sub_wallet_id,
                        amountKobo: payoutKobo,
                        narration: `Circle Payout R${circle.current_round}`.slice(0, 25),
                        idempotencyKey: txRef,
                    })
                    if (w2w.ok) olivePayRef = w2w.data?.reference || txRef
                }
            } catch (opErr: any) {
                console.warn('[Circle Payout] OlivePay W2W mirror skipped:', opErr?.message)
            }

            return NextResponse.json({
                success: true,
                message: `Disbursed ₦${payoutAmount.toLocaleString()} to ${recipient.name} successfully!`,
                reference: txRef,
                olivePayReference: olivePayRef,
                recipientName: recipient.name,
                nextRound,
                remainingPool: newPool
            })
        } catch (txErr) {
            await client.query('ROLLBACK')
            throw txErr
        } finally {
            client.release()
        }
    } catch (err: any) {
        console.error('[Circle Payout Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
