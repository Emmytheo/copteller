import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole, timingSafeSecretMatch } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/banksuite/bridge
 * Signed bi-directional institutional custody & underwriting bridge for BankSuite MFB cores.
 * Exposes live cooperative registry (including provisioned BankSuite Escrow NUBAN metadata),
 * schemes, active HP/Ajo contracts, loans, member behavioral credit scores, and vault totals.
 */
export async function GET(req: NextRequest) {
    const internalSecret = req.headers.get('x-copteller-internal-secret')
    const isBridgeSigned = timingSafeSecretMatch(internalSecret, process.env.ADMIN_SECRET)

    if (!isBridgeSigned) {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth
    }

    try {
        const [coopsRes, schemesRes, contractsRes, loansRes, vaultsRes, membersRes, auditRes] = await Promise.all([
            queryCopteller(`
                SELECT id, name, description, sector, registration_number, state, lga, status,
                       current_member_count, escrow_fee_percent, metadata, created_at
                FROM copteller.cooperatives
                ORDER BY created_at DESC LIMIT 50
            `),
            queryCopteller(`
                SELECT id, name, scheme_type, status, bank_approved, target_capital, funded_capital,
                       yield_rate, created_at
                FROM copteller.copteller_schemes
                ORDER BY created_at DESC LIMIT 50
            `),
            queryCopteller(`
                SELECT COUNT(*)::int AS total,
                       COUNT(*) FILTER (WHERE status = 'active')::int AS active,
                       COUNT(*) FILTER (WHERE status = 'defaulted' OR missed_payments >= 2)::int AS defaulting,
                       COALESCE(SUM(total_obligation), 0)::bigint AS obligation_kobo,
                       COALESCE(SUM(total_paid), 0)::bigint AS collected_kobo
                FROM copteller.copteller_contracts
            `),
            queryCopteller(`
                SELECT id, user_id, principal, outstanding_balance, interest_rate, duration_months,
                       status, purpose, disbursed_at, created_at
                FROM copteller.loans
                ORDER BY created_at DESC LIMIT 50
            `),
            queryCopteller(`
                SELECT COUNT(*)::int AS account_count,
                       COALESCE(SUM(balance), 0)::bigint AS total_vault_kobo
                FROM copteller.accounts
                WHERE status = 'active'
            `),
            queryCopteller(`
                SELECT COUNT(*)::int AS active_members,
                       COALESCE(AVG(credit_score), 0)::numeric(6,1) AS avg_credit_score
                FROM copteller.copteller_memberships
                WHERE status = 'active'
            `),
            queryCopteller(`
                SELECT id, actor_role, actor_name, action, entity_type, entity_id, amount_kobo, created_at
                FROM copteller.copteller_audit_logs
                ORDER BY created_at DESC LIMIT 25
            `),
        ])

        const cAgg = contractsRes.rows[0] || {}
        const obligationKobo = Number(cAgg.obligation_kobo || 0)
        const collectedKobo = Number(cAgg.collected_kobo || 0)

        return NextResponse.json({
            success: true,
            bridgeVersion: '2.0',
            protocol: 'BankSuite-Copteller-5Rail',
            timestamp: new Date().toISOString(),
            metrics: {
                cooperativeCount: coopsRes.rows.length,
                schemeCount: schemesRes.rows.length,
                activeMembers: Number(membersRes.rows[0]?.active_members || 0),
                avgCreditScore: Number(membersRes.rows[0]?.avg_credit_score || 0),
                contractsTotal: Number(cAgg.total || 0),
                contractsActive: Number(cAgg.active || 0),
                contractsDefaulting: Number(cAgg.defaulting || 0),
                collectionRatePct: obligationKobo > 0 ? Number(((collectedKobo / obligationKobo) * 100).toFixed(1)) : 100,
                activeAccounts: Number(vaultsRes.rows[0]?.account_count || 0),
                totalVaultBalanceKobo: Number(vaultsRes.rows[0]?.total_vault_kobo || 0),
            },
            cooperatives: coopsRes.rows.map((c) => ({
                ...c,
                banksuiteEscrowNuban: c.metadata?.banksuite_escrow_nuban || null,
            })),
            schemes: schemesRes.rows,
            loans: loansRes.rows,
            auditLogs: auditRes.rows,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Bridge query failed' }, { status: 500 })
    }
}
