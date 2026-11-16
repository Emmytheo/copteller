import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/admin/settings
 * Retrieves cooperative guild configuration parameters from the database.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const coopRes = await queryCopteller(`
            SELECT id, name, default_contribution_amount, escrow_fee_percent,
                   late_payment_penalty_kobo, metadata
            FROM copteller.cooperatives
            WHERE status = 'active'
            ORDER BY created_at ASC
            LIMIT 1
        `)

        const coop = coopRes.rows[0]
        const metadata = coop?.metadata || {}

        return NextResponse.json({
            success: true,
            settings: {
                weeklyContribution: Number(coop?.default_contribution_amount || 20000),
                managementYield: Number(coop?.escrow_fee_percent || 2.5),
                defaultPenalty: Number(coop?.late_payment_penalty_kobo || 150000) / 100,
                enableAutoDeductions: metadata.enable_auto_deductions !== false,
                maxPoolSize: Number(metadata.max_pool_size || 50000000)
            }
        })
    } catch (error: any) {
        console.error('[Admin Settings GET] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/admin/settings
 * Updates cooperative guild configuration in the core database.
 */
export async function PATCH(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json()
        const { weeklyContribution, managementYield, defaultPenalty, enableAutoDeductions, maxPoolSize } = body

        const coopRes = await queryCopteller(`
            SELECT id, metadata FROM copteller.cooperatives WHERE status = 'active' LIMIT 1
        `)
        const coop = coopRes.rows[0]
        if (!coop) {
            return NextResponse.json({ error: 'No active cooperative found' }, { status: 404 })
        }

        const currentMeta = coop.metadata || {}
        const updatedMeta = {
            ...currentMeta,
            enable_auto_deductions: enableAutoDeductions,
            max_pool_size: maxPoolSize,
            updated_at: new Date().toISOString()
        }

        await queryCopteller(`
            UPDATE copteller.cooperatives
            SET default_contribution_amount = COALESCE($1, default_contribution_amount),
                escrow_fee_percent = COALESCE($2, escrow_fee_percent),
                late_payment_penalty_kobo = COALESCE($3, late_payment_penalty_kobo),
                metadata = $4,
                updated_at = NOW()
            WHERE id = $5
        `, [
            weeklyContribution !== undefined ? Number(weeklyContribution) : null,
            managementYield !== undefined ? Number(managementYield) : null,
            defaultPenalty !== undefined ? Number(defaultPenalty) * 100 : null,
            JSON.stringify(updatedMeta),
            coop.id
        ])

        // Record audit log
        await queryCopteller(`
            INSERT INTO copteller.copteller_audit_logs (
                actor_id, actor_role, actor_name, action, entity_type, entity_id,
                metadata, created_at, updated_at
            ) VALUES (
                $1, 'admin', $2, 'COOPERATIVE_CONFIG_UPDATED', 'COOPERATIVE', $3,
                $4, NOW(), NOW()
            )
        `, [
            auth.userId,
            auth.email || 'Admin',
            String(coop.id),
            JSON.stringify({ weeklyContribution, managementYield, defaultPenalty, enableAutoDeductions })
        ])

        return NextResponse.json({
            success: true,
            message: 'Guild configurations successfully updated and saved to core database!'
        })
    } catch (error: any) {
        console.error('[Admin Settings PATCH] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
