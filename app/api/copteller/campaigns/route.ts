import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool } from '@/lib/copteller/pg'
import { seedCampaignsData } from './seed/route'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/campaigns
 * Lists all campaigns created by the caller (or all campaigns for admin/superadmin)
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const pool = getCoptellerPool()
        const isSuper = auth.role === 'superadmin' || auth.role === 'bank_staff'

        let query = `
            SELECT 
                c.*,
                a.account_number as funding_account_number,
                a.balance as funding_account_balance
            FROM copteller.disbursement_campaigns c
            LEFT JOIN copteller.accounts a ON a.id = c.funding_account_id
        `
        const params: any[] = []

        const scope = req.nextUrl.searchParams.get('scope')
        if (scope === 'my' && !isSuper) {
            query += ` WHERE c.creator_id = $1 `
            params.push(auth.userId)
        } else if (!isSuper) {
            query += ` WHERE (c.status = 'active' OR c.creator_id = $1 OR c.creator_id = 'sys_admin') `
            params.push(auth.userId)
        }

        query += ` ORDER BY c.created_at DESC`

        let res = await pool.query(query, params)

        // If no campaigns exist at all, auto seed so the user has immediate rich data
        if (res.rows.length === 0 && !scope) {
            try {
                await seedCampaignsData()
                res = await pool.query(query, params)
            } catch (seedErr) {
                console.warn('[Auto Seed Campaigns Warning]', seedErr)
            }
        }

        return NextResponse.json({
            success: true,
            campaigns: res.rows
        })
    } catch (err: any) {
        console.error('[Campaigns GET Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/campaigns
 * Creates a new disbursement campaign draft
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const {
            title,
            description,
            category = 'grant',
            organization_name = 'Community Welfare Fund',
            funding_account_id,
            total_budget = 0,
            expires_at = null
        } = body

        if (!title || !title.trim()) {
            return NextResponse.json({ error: 'Campaign title is required.' }, { status: 400 })
        }

        const pool = getCoptellerPool()

        // Resolve funding account
        let fundAccId = funding_account_id
        if (!fundAccId) {
            // Pick creator's primary account
            const accRes = await pool.query(`
                SELECT a.id FROM copteller.accounts a
                JOIN copteller.customers c ON c.id = a.customer_id
                WHERE c.supabase_id = $1 OR c.email = $2
                ORDER BY a.balance DESC LIMIT 1
            `, [auth.userId, auth.email])
            if (accRes.rows.length > 0) {
                fundAccId = accRes.rows[0].id
            }
        }

        const insertRes = await pool.query(`
            INSERT INTO copteller.disbursement_campaigns (
                creator_id, creator_name, organization_name, title, description,
                category, funding_account_id, total_budget, expires_at, status, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NOW(), NOW()
            ) RETURNING *
        `, [
            auth.userId,
            auth.displayName || auth.email,
            organization_name.trim(),
            title.trim(),
            description || '',
            category,
            fundAccId || null,
            Number(total_budget) || 0,
            expires_at ? new Date(expires_at) : null
        ])

        return NextResponse.json({
            success: true,
            campaign: insertRes.rows[0]
        }, { status: 201 })
    } catch (err: any) {
        console.error('[Campaigns POST Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
