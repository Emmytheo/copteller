import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/campaigns/[id]/launch
 * Locks funds in escrow from the funding account and activates the campaign
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
        const pool = getCoptellerPool()
        const client = await pool.connect()

        try {
            await client.query('BEGIN')

            // 1. Fetch Campaign
            const campRes = await client.query(`
                SELECT * FROM copteller.disbursement_campaigns 
                WHERE id = $1 FOR UPDATE
            `, [campaignId])

            if (campRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
            }

            const campaign = campRes.rows[0]

            if (campaign.status === 'active') {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Campaign is already active.' }, { status: 400 })
            }

            const totalRequiredNaira = Number(campaign.total_disbursed)
            const totalRequiredKobo = Math.round(totalRequiredNaira * 100)
            if (totalRequiredKobo <= 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Cannot launch a campaign with 0 disbursed amount. Please add recipients first.' }, { status: 400 })
            }

            // 2. Validate Funding Account
            let accountId = campaign.funding_account_id
            if (!accountId) {
                // Pick creator's primary account with sufficient balance
                const userAccs = await client.query(`
                    SELECT a.id, a.balance FROM copteller.accounts a
                    LEFT JOIN copteller.customers c ON c.id = a.customer_id
                    WHERE a.user_id = $1 OR c.supabase_id = $1 OR c.email = $2
                    ORDER BY a.balance DESC LIMIT 1
                `, [auth.userId, auth.email])

                if (userAccs.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return NextResponse.json({ error: 'No funding account found for campaign creator.' }, { status: 400 })
                }
                accountId = userAccs.rows[0].id
            }

            const accRes = await client.query(`
                SELECT id, account_number, balance FROM copteller.accounts 
                WHERE id = $1 FOR UPDATE
            `, [accountId])

            if (accRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Funding account not found.' }, { status: 400 })
            }

            const account = accRes.rows[0]
            const currentBalanceKobo = Number(account.balance || 0)

            if (currentBalanceKobo < totalRequiredKobo) {
                await client.query('ROLLBACK')
                return NextResponse.json({
                    error: `Insufficient balance in account ${account.account_number}. Required: ₦${totalRequiredNaira.toLocaleString()}, Available: ₦${(currentBalanceKobo / 100).toLocaleString()}`
                }, { status: 400 })
            }

            // 3. Deduct from account and write transaction log
            const escrowRef = `ESC-CMP-${campaignId}-${Date.now().toString(36).toUpperCase()}`
            const newBalanceKobo = currentBalanceKobo - totalRequiredKobo

            await client.query(`
                UPDATE copteller.accounts
                SET balance = $1, updated_at = NOW()
                WHERE id = $2
            `, [newBalanceKobo, accountId])

            await client.query(`
                INSERT INTO copteller.transactions (
                    reference, from_account_id, amount, type, status, narration, balance_after, created_at
                ) VALUES ($1, $2, $3, 'debit', 'successful', $4, $5, NOW())
            `, [
                escrowRef,
                accountId,
                totalRequiredKobo,
                `Escrow funding for Campaign: ${campaign.title} (${campaign.total_recipients} recipients)`,
                newBalanceKobo
            ])

            // 4. Update campaign status to active
            const updatedCamp = await client.query(`
                UPDATE copteller.disbursement_campaigns
                SET 
                    status = 'active',
                    funding_account_id = $1,
                    escrow_reference = $2,
                    updated_at = NOW()
                WHERE id = $3
                RETURNING *
            `, [accountId, escrowRef, campaignId])

            await client.query('COMMIT')

            return NextResponse.json({
                success: true,
                campaign: updatedCamp.rows[0],
                escrowReference: escrowRef,
                amountLocked: totalRequiredNaira
            })
        } catch (txErr) {
            await client.query('ROLLBACK')
            throw txErr
        } finally {
            client.release()
        }
    } catch (err: any) {
        console.error('[Launch Campaign Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
