import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/circles/[id]/contribute
 * Debits the member's primary Copteller account and credits the Circle's shared vault/pool.
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
        const { amount } = body

        const pool = getCoptellerPool()
        const client = await pool.connect()

        try {
            await client.query('BEGIN')

            // 1. Fetch circle
            const circleRes = await client.query(`
                SELECT * FROM copteller.social_circles WHERE id = $1 FOR UPDATE
            `, [circleId])

            if (circleRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Circle not found.' }, { status: 404 })
            }

            const circle = circleRes.rows[0]

            // 2. Determine contribution amount
            const contribAmount = amount ? Number(amount) : Number(circle.contribution_amount)
            if (!contribAmount || contribAmount <= 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Valid contribution amount is required.' }, { status: 400 })
            }
            const contribKobo = Math.round(contribAmount * 100)

            // 3. Find user's member record in this circle
            const memberRes = await client.query(`
                SELECT * FROM copteller.social_circle_members
                WHERE circle_id = $1 AND user_id = $2 AND status = 'active'
                FOR UPDATE
            `, [circleId, auth.userId])

            if (memberRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'You are not an active member of this circle. Join first!' }, { status: 403 })
            }

            const member = memberRes.rows[0]

            // 4. Fetch user's primary account
            const accRes = await client.query(`
                SELECT * FROM copteller.accounts
                WHERE user_id = $1 AND status = 'active'
                ORDER BY created_at ASC LIMIT 1
                FOR UPDATE
            `, [auth.userId])

            if (accRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'No active primary account found to fund contribution.' }, { status: 404 })
            }

            const userAcc = accRes.rows[0]
            const currentAccBalKobo = Number(userAcc.balance || 0)

            if (currentAccBalKobo < contribKobo) {
                await client.query('ROLLBACK')
                return NextResponse.json({
                    error: `Insufficient funds. Available: ₦${(currentAccBalKobo / 100).toLocaleString()}, Required: ₦${contribAmount.toLocaleString()}`
                }, { status: 400 })
            }

            // 5. Debit user account
            const newAccBalKobo = currentAccBalKobo - contribKobo
            await client.query(`
                UPDATE copteller.accounts
                SET balance = $1, updated_at = NOW(), last_transaction_at = NOW()
                WHERE id = $2
            `, [newAccBalKobo, userAcc.id])

            // 6. Credit Circle Pool
            const newPool = Number(circle.current_pool || 0) + contribAmount
            const newTotalCollected = Number(circle.total_collected || 0) + contribAmount
            await client.query(`
                UPDATE copteller.social_circles
                SET current_pool = $1, total_collected = $2, updated_at = NOW()
                WHERE id = $3
            `, [newPool, newTotalCollected, circleId])

            // 7. Update member's contribution total
            const newMemberContrib = Number(member.total_contributed || 0) + contribAmount
            await client.query(`
                UPDATE copteller.social_circle_members
                SET total_contributed = $1
                WHERE id = $2
            `, [newMemberContrib, member.id])

            // 8. Record contribution
            const txRef = `CIRC_CTB_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            await client.query(`
                INSERT INTO copteller.social_circle_contributions (
                    circle_id, member_id, amount, round_number, reference, status
                ) VALUES ($1, $2, $3, $4, $5, 'successful')
            `, [circleId, member.id, contribAmount, circle.current_round, txRef])

            // 9. Record main ledger transaction
            await client.query(`
                INSERT INTO copteller.transactions (
                    reference, type, amount, from_account_id, status, narration, user_id, balance_after
                ) VALUES ($1, 'debit', $2, $3, 'successful', $4, $5, $6)
            `, [
                txRef,
                contribKobo,
                userAcc.id,
                `Contribution to ${circle.name} (Round ${circle.current_round})`,
                auth.userId,
                newAccBalKobo
            ])

            await client.query('COMMIT')

            return NextResponse.json({
                success: true,
                message: `Successfully contributed ₦${contribAmount.toLocaleString()} to ${circle.name}!`,
                reference: txRef,
                newPoolBalance: newPool,
                userBalanceNaira: newAccBalKobo / 100
            })
        } catch (txErr) {
            await client.query('ROLLBACK')
            throw txErr
        } finally {
            client.release()
        }
    } catch (err: any) {
        console.error('[Circle Contribute Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
