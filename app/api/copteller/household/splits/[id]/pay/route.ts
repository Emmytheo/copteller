import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/household/splits/[id]/pay
 * Marks a member's share in a household split as settled/paid.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const { id } = await params
        const splitId = parseInt(id)
        if (!splitId || isNaN(splitId)) {
            return NextResponse.json({ error: 'Valid split ID is required' }, { status: 400 })
        }

        const body = await req.json().catch(() => ({}))
        const { memberId, paymentReference } = body

        if (!memberId) {
            return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
        }

        const pool = getCoptellerPool()
        const client = await pool.connect()

        try {
            await client.query('BEGIN')

            // Verify split ownership or participation
            const splitRes = await client.query(`
                SELECT * FROM copteller.household_splits WHERE id = $1
            `, [splitId])

            if (splitRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Split bill not found' }, { status: 404 })
            }

            // Update member record
            const ref = paymentReference || `SPLIT_PAY_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            const updateRes = await client.query(`
                UPDATE copteller.household_split_members
                SET status = 'paid', paid_at = NOW(), payment_reference = $1, paid_amount = share_amount
                WHERE id = $2 AND split_id = $3
                RETURNING *
            `, [ref, memberId, splitId])

            if (updateRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Participant not found in this split bill' }, { status: 404 })
            }

            // Check if all members have paid
            const checkRes = await client.query(`
                SELECT COUNT(*) as unpaid_count 
                FROM copteller.household_split_members 
                WHERE split_id = $1 AND status != 'paid'
            `, [splitId])

            if (parseInt(checkRes.rows[0].unpaid_count) === 0) {
                await client.query(`
                    UPDATE copteller.household_splits 
                    SET status = 'completed', updated_at = NOW()
                    WHERE id = $1
                `, [splitId])
            }

            await client.query('COMMIT')

            return NextResponse.json({
                success: true,
                message: `Payment confirmed for ${updateRes.rows[0].name}!`,
                member: updateRes.rows[0]
            })
        } catch (txErr) {
            await client.query('ROLLBACK')
            throw txErr
        } finally {
            client.release()
        }
    } catch (err: any) {
        console.error('[Split Pay Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
