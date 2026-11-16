import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/campaigns/[id]
 * Returns campaign info + list of recipients and claim statistics
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const { id } = await context.params

        const campRes = await queryCopteller(`
            SELECT 
                c.*,
                a.account_number as funding_account_number,
                a.balance as funding_account_balance
            FROM copteller.disbursement_campaigns c
            LEFT JOIN copteller.accounts a ON a.id = c.funding_account_id
            WHERE c.id = $1
        `, [Number(id)])

        if (campRes.rows.length === 0) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
        }

        const campaign = campRes.rows[0]

        // Fetch recipients
        const recRes = await queryCopteller(`
            SELECT * FROM copteller.disbursement_recipients
            WHERE campaign_id = $1
            ORDER BY id ASC
        `, [Number(id)])

        return NextResponse.json({
            success: true,
            campaign,
            recipients: recRes.rows
        })
    } catch (err: any) {
        console.error('[Campaign Detail GET Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
