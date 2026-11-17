import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'
import { resolveMemberFormSpec } from '@/lib/copteller/coop-form-specs'

export const dynamic = 'force-dynamic'

async function resolveTargetCooperative(cooperativeId?: string | null) {
    if (cooperativeId && /^\d+$/.test(String(cooperativeId))) {
        const scoped = await queryCopteller(
            `SELECT id, name, sector, default_contribution_amount, escrow_fee_percent,
                    late_payment_penalty_kobo, metadata
             FROM copteller.cooperatives
             WHERE id = $1
             LIMIT 1`,
            [Number(cooperativeId)]
        )
        if (scoped.rows[0]) return scoped.rows[0]
    }
    const fallback = await queryCopteller(`
        SELECT id, name, sector, default_contribution_amount, escrow_fee_percent,
               late_payment_penalty_kobo, metadata
        FROM copteller.cooperatives
        WHERE status = 'active'
        ORDER BY created_at ASC
        LIMIT 1
    `)
    return fallback.rows[0] || null
}

/**
 * GET /api/copteller/admin/settings
 * Retrieves cooperative guild configuration and member form specifications.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['coop_admin', 'superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const coop = await resolveTargetCooperative(auth.cooperativeId)
        const metadata = coop?.metadata || {}
        const coopName = coop?.name || auth.cooperativeName || 'Copteller Cooperative'
        const sector = coop?.sector || 'transport'

        return NextResponse.json({
            success: true,
            cooperativeName: coopName,
            settings: {
                weeklyContribution: Number(coop?.default_contribution_amount || 20000),
                managementYield: Number(coop?.escrow_fee_percent || 2.5),
                defaultPenalty: Number(coop?.late_payment_penalty_kobo || 150000) / 100,
                enableAutoDeductions: metadata.enable_auto_deductions !== false,
                maxPoolSize: Number(metadata.max_pool_size || 50000000),
            },
            memberFormSpec: resolveMemberFormSpec(coopName, metadata.memberFormSpec, sector),
        })
    } catch (error: any) {
        console.error('[Admin Settings GET] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/admin/settings
 * Updates cooperative guild configuration and member form specifications in the core database.
 */
export async function PATCH(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['coop_admin', 'superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const body = await req.json()
        const {
            weeklyContribution,
            managementYield,
            defaultPenalty,
            enableAutoDeductions,
            maxPoolSize,
            memberFormSpec,
        } = body

        const coop = await resolveTargetCooperative(auth.cooperativeId)
        if (!coop) {
            return NextResponse.json({ error: 'No active cooperative found' }, { status: 404 })
        }

        const currentMeta = coop.metadata || {}
        const updatedMeta: Record<string, any> = {
            ...currentMeta,
            enable_auto_deductions: enableAutoDeductions,
            max_pool_size: maxPoolSize,
            updated_at: new Date().toISOString(),
        }

        if (memberFormSpec && typeof memberFormSpec === 'object') {
            updatedMeta.memberFormSpec = resolveMemberFormSpec(
                coop.name || 'Copteller Cooperative',
                memberFormSpec,
                coop.sector || 'transport'
            )
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
            coop.id,
        ])

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
            JSON.stringify({ weeklyContribution, managementYield, defaultPenalty, enableAutoDeductions, hasMemberFormSpec: Boolean(memberFormSpec) }),
        ])

        return NextResponse.json({
            success: true,
            message: 'Guild configurations successfully updated and saved to core database!',
        })
    } catch (error: any) {
        console.error('[Admin Settings PATCH] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
