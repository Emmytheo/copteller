import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { probeOlivePayCapabilities, olivePayClient, nairaToKobo } from '@/lib/copteller/olivepay-client'
import { queryCopteller } from '@/lib/copteller/pg'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/olivepay/capabilities?probeLive=1
 * Returns graceful runtime OlivePay capability detection report + Vercel egress proxy status + Sandbox Master balance.
 */
export async function GET(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth

    try {
        const probeLive = new URL(req.url).searchParams.get('probeLive') === '1'
        const report = await probeOlivePayCapabilities(probeLive)

        const [recentWebhooks, statsRes] = await Promise.all([
            queryCopteller(
                `SELECT id, event_type, dedupe_reference, processing_status, rail_mode, created_at
                 FROM copteller.olivepay_webhook_events ORDER BY created_at DESC LIMIT 10`
            ).catch(() => ({ rows: [] as any[] })),
            queryCopteller(`
                SELECT
                  (SELECT COUNT(*)::int FROM copteller.olivepay_subwallets) AS subwallets,
                  (SELECT COUNT(*)::int FROM copteller.olivepay_holds WHERE status = 'Active') AS active_holds,
                  (SELECT COUNT(*)::int FROM copteller.olivepay_payouts WHERE status IN ('PENDING','PROCESSING')) AS pending_payouts,
                  (SELECT COUNT(*)::int FROM copteller.olivepay_virtual_accounts WHERE status = 'pending') AS pending_vas,
                  (SELECT COUNT(*)::int FROM copteller.olivepay_banks_cache) AS cached_banks
            `).catch(() => ({ rows: [{}] })),
        ])

        return NextResponse.json({
            success: true,
            report,
            stats: statsRes.rows[0] || {},
            recentWebhooks: recentWebhooks.rows,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Capability probe failed' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/olivepay/capabilities
 * Operational actions: sync_banks, topup_sandbox_master, toggle_sandbox_holds
 */
export async function POST(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth

    try {
        await ensureOlivePayTables()
        const body = await req.json().catch(() => ({}))

        if (body.action === 'sync_banks') {
            const res = await olivePayClient.listBanks()
            return NextResponse.json({
                success: res.ok,
                railMode: res.railMode,
                bankCount: Array.isArray(res.data) ? res.data.length : 0,
                message: res.message,
            })
        }

        if (body.action === 'topup_sandbox_master') {
            const addNaira = Number(body.amountNaira || 10_000_000)
            const addKobo = nairaToKobo(addNaira)
            const upd = await queryCopteller(
                `UPDATE copteller.olivepay_sandbox_master
                 SET available_balance_kobo = available_balance_kobo + $1, updated_at = NOW()
                 WHERE id = 1 RETURNING available_balance_kobo`,
                [addKobo]
            )
            return NextResponse.json({
                success: true,
                availableBalanceNaira: Number(upd.rows[0]?.available_balance_kobo || 0) / 100,
            })
        }

        if (body.action === 'toggle_sandbox_holds') {
            const enabled = Boolean(body.enabled)
            await queryCopteller(
                `UPDATE copteller.olivepay_sandbox_master SET holds_enabled = $1, updated_at = NOW() WHERE id = 1`,
                [enabled]
            )
            return NextResponse.json({ success: true, holdsEnabled: enabled })
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Action failed' }, { status: 500 })
    }
}
