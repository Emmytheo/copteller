import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/superadmin/compliance
 * Retrieves real-time regulatory compliance metrics, filings history, and audit trail.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        // 1. Fetch system audit logs for compliance filings
        const filingsRes = await queryCopteller(`
            SELECT id, action, entity_type, entity_id, metadata, created_at
            FROM copteller.copteller_audit_logs
            WHERE action LIKE '%FILING%' OR action LIKE '%COMPLIANCE%' OR action LIKE '%REGULATORY%'
            ORDER BY created_at DESC
            LIMIT 25
        `)

        // 2. Telemetry metrics for CBN / NDIC compliance calculations
        const metricsRes = await queryCopteller(`
            SELECT
                (SELECT COUNT(*) FROM copteller.cooperatives WHERE status = 'active') as active_unions,
                (SELECT COUNT(*) FROM copteller.copteller_memberships WHERE status = 'active') as active_members,
                (SELECT COALESCE(SUM(balance), 0) FROM copteller.accounts WHERE status = 'active') as total_deposits_kobo,
                (SELECT COALESCE(SUM(amount), 0) FROM copteller.copteller_contracts WHERE status = 'active') as total_credit_exposure_kobo
        `)

        const metrics = metricsRes.rows[0]

        return NextResponse.json({
            success: true,
            metrics: {
                activeUnions: Number(metrics?.active_unions || 0),
                activeMembers: Number(metrics?.active_members || 0),
                totalDeposits: Number(metrics?.total_deposits_kobo || 0) / 100,
                totalCreditExposure: Number(metrics?.total_credit_exposure_kobo || 0) / 100,
            },
            filings: filingsRes.rows.map(f => ({
                id: `fil_${f.id}`,
                ref: f.metadata?.ref || `CBN-REG-2026-${f.id}`,
                title: f.metadata?.title || 'Core Regulatory Extraction Report',
                body: f.metadata?.regulator || 'CBN',
                category: f.metadata?.category || 'Prudential Return',
                period: f.metadata?.period || 'Q3 2026',
                filingDate: new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                deadline: 'Completed',
                status: 'submitted',
                metrics: f.metadata?.snapshot
            }))
        })
    } catch (error: any) {
        console.error('[Compliance GET] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/superadmin/compliance
 * Compiles a real live regulatory compliance extraction from the core database and stores audit record.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const { regulator = 'CBN', category = 'Prudential Extract' } = body

        // Extract live aggregates
        const liveRes = await queryCopteller(`
            SELECT
                (SELECT COUNT(*) FROM copteller.cooperatives WHERE status = 'active') as total_coops,
                (SELECT COUNT(*) FROM copteller.copteller_memberships WHERE status = 'active') as total_members,
                (SELECT COALESCE(SUM(balance), 0) FROM copteller.accounts) as total_balances_kobo,
                (SELECT COUNT(*) FROM copteller.transactions WHERE created_at >= NOW() - INTERVAL '30 days') as monthly_tx_count
        `)

        const row = liveRes.rows[0]
        const refNumber = `${regulator}-ODR-2026-${Math.floor(100 + Math.random() * 900)}`

        const snapshotData = {
            ref: refNumber,
            regulator,
            category,
            title: `On-Demand Core Ledger ${regulator} Audit Extract`,
            period: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            totalCoops: Number(row?.total_coops || 0),
            totalMembers: Number(row?.total_members || 0),
            totalLiquidityKobo: Number(row?.total_balances_kobo || 0),
            thirtyDayTxCount: Number(row?.monthly_tx_count || 0),
            compiledAt: new Date().toISOString()
        }

        // Record verifiable audit log entry
        const auditRes = await queryCopteller(`
            INSERT INTO copteller.copteller_audit_logs (
                actor_id, actor_role, actor_name, action, entity_type, entity_id,
                metadata, created_at, updated_at
            ) VALUES (
                $1, 'superadmin', $2, 'REGULATORY_FILING_COMPILED', 'COMPLIANCE', $3,
                $4, NOW(), NOW()
            ) RETURNING id, created_at
        `, [
            auth.userId,
            auth.email || 'Superadmin',
            refNumber,
            JSON.stringify(snapshotData)
        ])

        const createdLog = auditRes.rows[0]

        return NextResponse.json({
            success: true,
            filing: {
                id: `fil_${createdLog.id}`,
                ref: refNumber,
                title: snapshotData.title,
                body: regulator,
                category,
                period: snapshotData.period,
                filingDate: new Date(createdLog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                deadline: 'Immediate',
                status: 'submitted',
                metrics: snapshotData
            }
        })
    } catch (error: any) {
        console.error('[Compliance POST] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
