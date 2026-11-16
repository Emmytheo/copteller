import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool } from '@/lib/copteller/pg'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/campaigns/[id]/recipients
 * Batch adds recipients to a draft/active campaign
 * Body: { recipients: [ { fullName, phoneNumber, amount } ] }
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const { id } = await context.params
        const campaignId = Number(id)
        const body = await req.json().catch(() => ({}))
        const { recipients = [] } = body

        if (!Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ error: 'At least one recipient is required.' }, { status: 400 })
        }

        const pool = getCoptellerPool()

        // Verify campaign exists and is not completed
        const campRes = await pool.query(`
            SELECT id, status FROM copteller.disbursement_campaigns WHERE id = $1
        `, [campaignId])

        if (campRes.rows.length === 0) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
        }

        const campaign = campRes.rows[0]
        if (campaign.status === 'completed' || campaign.status === 'cancelled') {
            return NextResponse.json({ error: `Cannot add recipients to a ${campaign.status} campaign.` }, { status: 400 })
        }

        const inserted: any[] = []
        let batchTotalAmount = 0

        await pool.query('BEGIN')

        for (const item of recipients) {
            const rawPhone = String(item.phoneNumber || item.phone || '').trim().replace(/\s+/g, '')
            const fullName = String(item.fullName || item.name || 'Beneficiary').trim()
            const amount = Number(item.amount) || 0

            if (!rawPhone) continue
            if (amount <= 0) continue

            // Generate secure unique claim token
            const claimToken = `clm_${crypto.randomBytes(16).toString('hex')}`
            const claimReference = `CPT-CLM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

            const insRes = await pool.query(`
                INSERT INTO copteller.disbursement_recipients (
                    campaign_id, phone_number, full_name, amount, claim_token, claim_reference,
                    status, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
                RETURNING *
            `, [campaignId, rawPhone, fullName, amount, claimToken, claimReference])

            inserted.push(insRes.rows[0])
            batchTotalAmount += amount
        }

        // Update campaign totals
        await pool.query(`
            UPDATE copteller.disbursement_campaigns
            SET 
                total_recipients = total_recipients + $1,
                total_disbursed = total_disbursed + $2,
                updated_at = NOW()
            WHERE id = $3
        `, [inserted.length, batchTotalAmount, campaignId])

        await pool.query('COMMIT')

        return NextResponse.json({
            success: true,
            addedCount: inserted.length,
            batchTotalAmount,
            recipients: inserted
        })
    } catch (err: any) {
        console.error('[Add Recipients Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
