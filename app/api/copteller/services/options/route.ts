import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/copteller/db'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'
import { ensureOlivePayTables, NIGERIAN_NIP_BANKS_6DIGIT } from '@/lib/copteller/olivepay-schema'
import { executeResolvedEndpoint } from '@/lib/workflow/utils/apiResolver'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/services/options?endpointId=...&textKey=name&valueKey=code
 * Fixed to:
 *  - Serve live 6-digit NIP banks from `copteller.olivepay_banks_cache` for bank selectors
 *  - Execute any custom `api_select` endpoint via unified `executeResolvedEndpoint()` (supporting OlivePay JWT+HMAC & Sandbox)
 *  - Never leak bogus hardcoded bank lists for unrelated failing endpoints!
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const { searchParams } = new URL(req.url)
        const endpointId = searchParams.get('endpointId')
        const textKey = searchParams.get('textKey') || 'name'
        const valueKey = searchParams.get('valueKey') || 'code'

        if (!endpointId) {
            return NextResponse.json({ error: 'endpointId is required' }, { status: 400 })
        }

        // Fast-path for NIP Bank dropdowns (6-digit NIP codes for OlivePay!)
        if (endpointId === 'banks' || endpointId === 'olivepay_banks') {
            await ensureOlivePayTables().catch(() => {})
            const banksRes = await queryCopteller(
                `SELECT bank_code AS code, bank_name AS name FROM copteller.olivepay_banks_cache WHERE is_active = TRUE ORDER BY bank_name ASC`
            ).catch(() => ({ rows: [] as any[] }))
            const rows = banksRes.rows.length > 0 ? banksRes.rows : NIGERIAN_NIP_BANKS_6DIGIT
            return NextResponse.json({
                success: true,
                source: 'olivepay_nip_banks',
                options: rows.map((b: any) => ({
                    label: String(b.name),
                    value: String(b.code),
                })),
            })
        }

        const payload = await getDb()
        let endpointDoc: any = null
        if (/^\d+$/.test(endpointId)) {
            endpointDoc = await payload
                .findByID({ collection: 'endpoints', id: Number(endpointId), depth: 2, overrideAccess: true })
                .catch(() => null)
        }
        if (!endpointDoc) {
            const byName = await payload.find({
                collection: 'endpoints',
                where: { name: { equals: endpointId } },
                depth: 2,
                limit: 1,
                overrideAccess: true,
            })
            endpointDoc = byName.docs[0] || null
        }

        if (!endpointDoc) {
            return NextResponse.json({ error: `Endpoint specification "${endpointId}" not found` }, { status: 404 })
        }

        const exec = await executeResolvedEndpoint(endpointDoc, { query: {} })
        if (!exec.ok) {
            return NextResponse.json(
                { success: false, options: [], error: `Upstream endpoint returned HTTP ${exec.status}` },
                { status: 502 }
            )
        }

        const raw = exec.data
        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : raw?.items || raw?.result || []
        const formatted = (Array.isArray(items) ? items : [])
            .map((item: any) => ({
                label: String(item[textKey] || item.label || item.name || item.bankName || item.title || item[valueKey] || ''),
                value: String(item[valueKey] || item.value || item.code || item.bankCode || item.id || item[textKey] || ''),
            }))
            .filter((o: any) => o.label && o.value)

        return NextResponse.json({
            success: true,
            railMode: exec.railMode,
            options: formatted,
        })
    } catch (err: any) {
        console.error('Options API error:', err)
        return NextResponse.json({ error: err.message || 'Failed to fetch options', options: [] }, { status: 500 })
    }
}
