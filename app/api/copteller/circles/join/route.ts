import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/circles/join?code=CIR-...
 * Look up a circle by its unique invite code.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const code = searchParams.get('code')?.trim().toUpperCase()

        if (!code) {
            return NextResponse.json({ error: 'Invite code is required.' }, { status: 400 })
        }

        const pool = getCoptellerPool()
        const res = await pool.query(`
            SELECT 
                c.*,
                (
                    SELECT COUNT(*) 
                    FROM copteller.social_circle_members m 
                    WHERE m.circle_id = c.id AND m.status = 'active'
                ) as member_count
            FROM copteller.social_circles c
            WHERE c.invite_code = $1
        `, [code])

        if (res.rows.length === 0) {
            return NextResponse.json({ error: 'No circle found with this invite code.' }, { status: 404 })
        }

        const circle = res.rows[0]

        return NextResponse.json({
            success: true,
            circle: {
                id: circle.id,
                name: circle.name,
                description: circle.description,
                circleType: circle.circle_type,
                category: circle.category,
                contributionAmount: Number(circle.contribution_amount),
                frequency: circle.frequency,
                targetAmount: Number(circle.target_amount),
                memberCount: parseInt(circle.member_count),
                maxMembers: circle.max_members,
                status: circle.status
            }
        })
    } catch (err: any) {
        console.error('[Circle Invite Lookup Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/circles/join
 * Joins a circle using its invite code
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const { inviteCode } = body

        if (!inviteCode || !inviteCode.trim()) {
            return NextResponse.json({ error: 'Invite code is required.' }, { status: 400 })
        }
        const cleanCode = inviteCode.trim().toUpperCase()

        const pool = getCoptellerPool()
        const client = await pool.connect()

        try {
            await client.query('BEGIN')

            // 1. Fetch circle
            const circleRes = await client.query(`
                SELECT * FROM copteller.social_circles WHERE invite_code = $1 FOR UPDATE
            `, [cleanCode])

            if (circleRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Invalid invite code.' }, { status: 404 })
            }

            const circle = circleRes.rows[0]

            // 2. Check if already joined
            const checkMember = await client.query(`
                SELECT * FROM copteller.social_circle_members 
                WHERE circle_id = $1 AND user_id = $2
            `, [circle.id, auth.userId])

            if (checkMember.rows.length > 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({
                    success: true,
                    alreadyJoined: true,
                    circleId: circle.id,
                    message: `You are already a member of "${circle.name}".`
                })
            }

            // 3. Check capacity
            const countRes = await client.query(`
                SELECT COUNT(*) as cnt FROM copteller.social_circle_members
                WHERE circle_id = $1 AND status = 'active'
            `, [circle.id])

            const activeCount = parseInt(countRes.rows[0].cnt)
            if (activeCount >= circle.max_members) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'This circle has reached maximum member capacity.' }, { status: 400 })
            }

            // 4. Resolve user account & details
            const accRes = await client.query(`
                SELECT a.id, TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) as full_name, c.phone_number
                FROM copteller.accounts a
                LEFT JOIN copteller.customers c ON c.id = a.customer_id
                WHERE a.user_id = $1 AND a.status = 'active'
                ORDER BY a.created_at ASC LIMIT 1
            `, [auth.userId])

            const userAcc = accRes.rows[0]
            const displayName = userAcc?.full_name || auth.displayName || 'New Member'
            const phone = userAcc?.phone_number || ''
            const nextRotationOrder = activeCount + 1

            // 5. Insert member
            const memberInsertRes = await client.query(`
                INSERT INTO copteller.social_circle_members (
                    circle_id, user_id, account_id, name, phone_number, role, rotation_order, status
                ) VALUES ($1, $2, $3, $4, $5, 'member', $6, 'active')
                RETURNING *
            `, [circle.id, auth.userId, userAcc?.id || null, displayName, phone, nextRotationOrder])

            await client.query('COMMIT')

            return NextResponse.json({
                success: true,
                circleId: circle.id,
                circleName: circle.name,
                rotationOrder: nextRotationOrder,
                message: `Welcome to ${circle.name}! You are Member #${nextRotationOrder}.`
            })
        } catch (txErr) {
            await client.query('ROLLBACK')
            throw txErr
        } finally {
            client.release()
        }
    } catch (err: any) {
        console.error('[Circle Join Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
