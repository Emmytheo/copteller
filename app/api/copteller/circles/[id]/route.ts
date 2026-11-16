import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/circles/[id]
 * Retrieves comprehensive details for a specific circle, including its roster,
 * rotational queue, contributions history, and payout ledger.
 */
export async function GET(
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

        // 1. Fetch Circle
        const circleRes = await queryCopteller(`
            SELECT * FROM copteller.social_circles WHERE id = $1
        `, [circleId])

        if (circleRes.rows.length === 0) {
            return NextResponse.json({ error: 'Circle not found' }, { status: 404 })
        }

        const circle = circleRes.rows[0]

        // 2. Fetch Members
        const membersRes = await queryCopteller(`
            SELECT * FROM copteller.social_circle_members
            WHERE circle_id = $1 AND status = 'active'
            ORDER BY rotation_order ASC NULLS LAST, joined_at ASC
        `, [circleId])

        // 3. Fetch Recent Contributions
        const contribRes = await queryCopteller(`
            SELECT c.*, m.name as member_name, m.phone_number as member_phone
            FROM copteller.social_circle_contributions c
            JOIN copteller.social_circle_members m ON m.id = c.member_id
            WHERE c.circle_id = $1
            ORDER BY c.created_at DESC
            LIMIT 30
        `, [circleId])

        // 4. Fetch Recent Payouts
        const payoutsRes = await queryCopteller(`
            SELECT p.*, m.name as recipient_name
            FROM copteller.social_circle_payouts p
            JOIN copteller.social_circle_members m ON m.id = p.recipient_member_id
            WHERE p.circle_id = $1
            ORDER BY p.payout_at DESC
        `, [circleId])

        // Check current user's membership
        const myMemberRecord = membersRes.rows.find(m => m.user_id === auth.userId)

        return NextResponse.json({
            success: true,
            circle,
            members: membersRes.rows,
            contributions: contribRes.rows,
            payouts: payoutsRes.rows,
            isCreator: circle.creator_id === auth.userId,
            myMembership: myMemberRecord || null
        })
    } catch (err: any) {
        console.error('[Circle Detail GET Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
