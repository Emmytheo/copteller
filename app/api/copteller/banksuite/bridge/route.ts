import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole, timingSafeSecretMatch } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/banksuite/bridge
 * Signed institutional oversight endpoint for BankSuite deployments running
 * on separate Vercel projects without direct shared Postgres network access.
 *
 * Authenticates via timing-safe `x-copteller-internal-secret === ADMIN_SECRET`
 * OR an authenticated Copteller superadmin/bank_staff session.
 */
export async function GET(req: NextRequest) {
    const internalSecret = req.headers.get('x-copteller-internal-secret')
    const isBridgeSigned = timingSafeSecretMatch(internalSecret, process.env.ADMIN_SECRET)

    if (!isBridgeSigned) {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth
    }

    try {
        const [coopsRes, schemesRes, contractsRes, loansRes, vaultsRes, auditRes] = await Promise.all([
            queryCopteller(`SELECT id, name, description, status, created_at FROM copteller.cooperatives ORDER BY created_at DESC LIMIT 50`),
            queryCopteller(`SELECT id, name, scheme_type, status, bank_approved, target_capital, funded_capital, created_at FROM copteller.copteller_schemes ORDER BY created_at DESC LIMIT 50`),
            queryCopteller(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active FROM copteller.copteller_contracts`),
            queryCopteller(`SELECT id, user_id, principal, outstanding_balance, interest_rate, duration_months, status, purpose, disbursed_at, created_at FROM copteller.loans ORDER BY created_at DESC LIMIT 50`),
            queryCopteller(`SELECT COUNT(*)::int AS account_count, COALESCE(SUM(balance), 0)::bigint AS total_vault_kobo FROM copteller.accounts WHERE status = 'active'`),
            queryCopteller(`SELECT id, actor_role, actor_name, action, entity_type, entity_id, created_at FROM copteller.copteller_audit_logs ORDER BY created_at DESC LIMIT 25`),
        ])

        return NextResponse.json({
            success: true,
            bridgeVersion: '1.0',
            timestamp: new Date().toISOString(),
            metrics: {
                cooperativeCount: coopsRes.rows.length,
                schemeCount: schemesRes.rows.length,
                contractsTotal: Number(contractsRes.rows[0]?.total || 0),
                contractsActive: Number(contractsRes.rows[0]?.active || 0),
                activeAccounts: Number(vaultsRes.rows[0]?.account_count || 0),
                totalVaultBalanceKobo: Number(vaultsRes.rows[0]?.total_vault_kobo || 0),
            },
            cooperatives: coopsRes.rows,
            schemes: schemesRes.rows,
            loans: loansRes.rows,
            auditLogs: auditRes.rows,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Bridge query failed' }, { status: 500 })
    }
}
