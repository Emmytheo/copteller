import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool, queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/circles
 * Lists all Social Circles / Open Vaults where the user is either the creator or a member.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const res = await queryCopteller(`
            SELECT 
                c.*,
                (
                    SELECT COUNT(*) 
                    FROM copteller.social_circle_members m 
                    WHERE m.circle_id = c.id AND m.status = 'active'
                ) as active_member_count,
                (
                    SELECT m.role 
                    FROM copteller.social_circle_members m 
                    WHERE m.circle_id = c.id AND m.user_id = $1
                    LIMIT 1
                ) as my_role,
                (
                    SELECT m.total_contributed 
                    FROM copteller.social_circle_members m 
                    WHERE m.circle_id = c.id AND m.user_id = $1
                    LIMIT 1
                ) as my_contribution
            FROM copteller.social_circles c
            WHERE c.creator_id = $1 
               OR EXISTS (
                   SELECT 1 FROM copteller.social_circle_members m 
                   WHERE m.circle_id = c.id AND m.user_id = $1
               )
            ORDER BY c.created_at DESC
        `, [auth.userId])

        return NextResponse.json({
            success: true,
            circles: res.rows
        })
    } catch (err: any) {
        console.error('[Social Circles GET Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/circles
 * Creates a new Open Social Circle or Community Savings Vault
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const {
            name,
            description,
            circleType = 'target_vault', // 'target_vault' | 'rotational_esusu'
            category = 'friends',        // 'friends' | 'family' | 'alumni' | 'club' | 'project'
            contributionAmount = 0,
            frequency = 'monthly',       // 'daily' | 'weekly' | 'monthly' | 'custom'
            targetAmount = 0,
            maxMembers = 12,
            payoutRule = 'creator_approval'
        } = body

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Circle name is required.' }, { status: 400 })
        }

        const contribNum = Number(contributionAmount) || 0
        const targetNum = Number(targetAmount) || 0

        const pool = getCoptellerPool()
        const client = await pool.connect()

        try {
            await client.query('BEGIN')

            // Generate clean invite code e.g. CIR-8M2X7K
            const inviteCode = 'CIR-' + Math.random().toString(36).substring(2, 8).toUpperCase()

            // 1. Get creator's primary account
            const accRes = await client.query(`
                SELECT a.id, TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) as full_name, c.phone_number
                FROM copteller.accounts a
                LEFT JOIN copteller.customers c ON c.id = a.customer_id
                WHERE a.user_id = $1 AND a.status = 'active'
                ORDER BY a.created_at ASC LIMIT 1
            `, [auth.userId])

            const creatorAcc = accRes.rows[0]
            const creatorDisplayName = creatorAcc?.full_name || auth.displayName || 'Circle Founder'
            const creatorPhone = creatorAcc?.phone_number || ''

            // 2. Insert circle
            const circleRes = await client.query(`
                INSERT INTO copteller.social_circles (
                    creator_id, name, description, circle_type, category,
                    contribution_amount, frequency, target_amount, max_members,
                    status, invite_code, payout_rule, vault_account_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, $12)
                RETURNING *
            `, [
                auth.userId,
                name.trim(),
                description || null,
                circleType,
                category,
                contribNum,
                frequency,
                targetNum,
                Number(maxMembers) || 12,
                inviteCode,
                payoutRule,
                creatorAcc?.id || null
            ])

            const circle = circleRes.rows[0]

            // 3. Add creator as Admin / Member #1
            await client.query(`
                INSERT INTO copteller.social_circle_members (
                    circle_id, user_id, account_id, name, phone_number, role, rotation_order, status
                ) VALUES ($1, $2, $3, $4, $5, 'admin', 1, 'active')
            `, [
                circle.id,
                auth.userId,
                creatorAcc?.id || null,
                creatorDisplayName,
                creatorPhone
            ])

            await client.query('COMMIT')

            return NextResponse.json({
                success: true,
                circle,
                inviteCode,
                message: `Circle "${name.trim()}" created successfully! Invite code: ${inviteCode}`
            })
        } catch (txErr) {
            await client.query('ROLLBACK')
            throw txErr
        } finally {
            client.release()
        }
    } catch (err: any) {
        console.error('[Social Circles POST Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
