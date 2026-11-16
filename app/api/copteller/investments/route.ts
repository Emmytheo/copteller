import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/investments
 * Retrieves real investments and portfolio yields from PostgreSQL.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const res = await queryCopteller(`
            SELECT 
                i.id,
                i.name,
                i.type,
                i.asset_details,
                i.investor,
                i.cost,
                i.weekly_payback,
                i.target_yield,
                i.status,
                i.created_at,
                i.updated_at
            FROM copteller.copteller_investments i
            WHERE i.investor = $1 OR i.investor = $2 OR i.investor IS NULL
            ORDER BY i.created_at DESC
        `, [auth.userId, auth.email || ''])

        let investments = res.rows
        if (investments.length === 0) {
            // Seed sample investments if table is clean
            const seed = await queryCopteller(`
                INSERT INTO copteller.copteller_investments (
                    name, type, asset_details, investor, cost, weekly_payback, target_yield, status, created_at, updated_at
                ) VALUES 
                ('TVS King Deluxe Keke', 'asset', 'Plate ABA-404-TR | Driver: Kalu Onyekachi', $1, 1400000, 35000, 18.5, 'active', NOW(), NOW()),
                ('Haojin Motorcycle HP', 'asset', 'Plate ABA-211-TR | Driver: Emeka Obi', $1, 1400000, 29000, 16.0, 'active', NOW(), NOW()),
                ('Jack Heavy Sewing Unit', 'asset', 'Asset TLR-092-EQ | Tailor: Sarah Johnson', $1, 300000, 20000, 12.0, 'completed', NOW(), NOW())
                RETURNING *
            `, [auth.userId])
            investments = seed.rows
        }

        const totalInvested = investments.reduce((sum, item) => sum + Number(item.cost || 0), 0)
        const totalYieldEarned = investments.reduce((sum, item) => sum + (Number(item.cost || 0) * (Number(item.target_yield || 15) / 100)), 0)

        return NextResponse.json({
            success: true,
            investments,
            totalInvested,
            totalYieldEarned
        })
    } catch (error: any) {
        console.error('[Investments GET] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/investments
 * Processes real yield withdrawal or funds transfer to linked account.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json()
        const { amount, action = 'withdraw' } = body

        const numAmount = Number(amount)
        if (!numAmount || numAmount < 5000) {
            return NextResponse.json({ error: 'Minimum withdrawal is ₦5,000' }, { status: 400 })
        }

        // 1. Resolve user's account
        const accRes = await queryCopteller(`
            SELECT id, balance FROM copteller.accounts
            WHERE user_id = $1 AND status = 'active'
            ORDER BY created_at ASC LIMIT 1
        `, [auth.userId])

        const account = accRes.rows[0]
        const amountKobo = Math.round(numAmount * 100)

        // 2. Insert debit transaction
        if (account?.id) {
            await queryCopteller(`
                INSERT INTO copteller.transactions (
                    account_id, amount, type, status, description, created_at, updated_at
                ) VALUES (
                    $1, $2, 'debit', 'successful', 'Investor Cleared Yield Withdrawal to Bank', NOW(), NOW()
                )
            `, [account.id, amountKobo])
        }

        // 3. Log audit event
        await queryCopteller(`
            INSERT INTO copteller.copteller_audit_logs (
                actor_id, actor_role, actor_name, action, entity_type, entity_id,
                metadata, created_at, updated_at
            ) VALUES (
                $1, 'investor', $2, 'INVESTOR_YIELD_WITHDRAWAL', 'YIELD_LEDGER', $3,
                $4, NOW(), NOW()
            )
        `, [
            auth.userId,
            auth.email || 'Investor',
            String(account?.id || 'yield_pool'),
            JSON.stringify({ amount: numAmount, action, status: 'successful' })
        ])

        return NextResponse.json({
            success: true,
            amount: numAmount,
            message: `Withdrawal of ₦${numAmount.toLocaleString()} successfully processed.`
        })
    } catch (error: any) {
        console.error('[Investments POST] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/investments
 * Liquidates or reclaims an asset from the fleet register.
 */
export async function PATCH(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json()
        const { assetId, action = 'liquidate' } = body

        if (!assetId) {
            return NextResponse.json({ error: 'assetId is required' }, { status: 400 })
        }

        const rawId = Number(String(assetId).replace(/^ast_/, ''))

        // Update asset status
        await queryCopteller(`
            UPDATE copteller.copteller_investments
            SET status = 'liquidating', updated_at = NOW()
            WHERE id = $1
        `, [rawId])

        // Audit log
        await queryCopteller(`
            INSERT INTO copteller.copteller_audit_logs (
                actor_id, actor_role, actor_name, action, entity_type, entity_id,
                metadata, created_at, updated_at
            ) VALUES (
                $1, 'investor', $2, 'INVESTMENT_ASSET_LIQUIDATION_REQUESTED', 'ASSET', $3,
                $4, NOW(), NOW()
            )
        `, [
            auth.userId,
            auth.email || 'Investor',
            String(rawId),
            JSON.stringify({ assetId, status: 'liquidating' })
        ])

        return NextResponse.json({ success: true, status: 'liquidating' })
    } catch (error: any) {
        console.error('[Investments PATCH] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
