import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool } from '@/lib/copteller/pg'

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

            return NextResponse.json({
                success: true,
                message: `Successfully stashed ₦${amountNum.toLocaleString()} into "${pocket.name}"`,
                pocket: updatePocketRes.rows[0],
                primaryBalanceNaira: newAccBalanceKobo / 100
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
