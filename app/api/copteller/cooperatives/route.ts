import { NextRequest, NextResponse } from 'next/server'
import { getCooperatives } from '@/lib/copteller/db'
import { queryCopteller } from '@/lib/copteller/pg'
import {
    PRESET_REGISTERED_COOPS,
    normalizeDbCoopToDirectoryItem,
    type RegisteredCoopDirectoryItem,
} from '@/lib/copteller/coop-form-specs'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/cooperatives
 * Public sanitized directory of active registered cooperatives and their member form specifications.
 * Used during public onboarding and offline printable form generation without exposing sensitive admin PII.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const sector = searchParams.get('sector') ?? undefined
    const status = searchParams.get('status') ?? 'active'

    let dbItems: RegisteredCoopDirectoryItem[] = []
    try {
        const result = await getCooperatives({
            status,
            sector,
            limit: 100,
            page: 1,
        })
        if (Array.isArray(result?.docs)) {
            dbItems = result.docs.map(normalizeDbCoopToDirectoryItem)
        }
    } catch (err) {
        console.warn('[GET /api/copteller/cooperatives] Payload lookup failed, trying direct PG:', err)
        try {
            const conditions: string[] = []
            const values: any[] = []
            if (status) {
                conditions.push(`status = $${values.length + 1}`)
                values.push(status)
            }
            if (sector) {
                conditions.push(`sector = $${values.length + 1}`)
                values.push(sector)
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
            const pgRes = await queryCopteller(
                `SELECT * FROM copteller.cooperatives ${whereClause} ORDER BY (registration_number IS NOT NULL) DESC, created_at DESC LIMIT 100`,
                values
            )
            dbItems = pgRes.rows.map(normalizeDbCoopToDirectoryItem)
        } catch (pgErr) {
            console.warn('[GET /api/copteller/cooperatives] Falling back to registered presets:', pgErr)
        }
    }

    // Prioritize officially registered cooperatives (those with a regNumber) at the top
    dbItems.sort((a, b) => {
        const aHasReg = a.regNumber ? 1 : 0
        const bHasReg = b.regNumber ? 1 : 0
        return bHasReg - aHasReg
    })

    // Merge DB cooperatives with canonical presets (deduplicating by normalized name OR regNumber)
    const seenNames = new Set(dbItems.map((c) => c.name.trim().toLowerCase()))
    const seenRegs = new Set(
        dbItems
            .map((c) => c.regNumber?.trim().toLowerCase())
            .filter((r): r is string => Boolean(r))
    )
    const presetAdditions = PRESET_REGISTERED_COOPS.filter((p) => {
        if (sector && p.sector !== sector) return false
        if (seenNames.has(p.name.trim().toLowerCase())) return false
        if (p.regNumber && seenRegs.has(p.regNumber.trim().toLowerCase())) return false
        return true
    })

    const combined = [...dbItems, ...presetAdditions]

    return NextResponse.json({
        success: true,
        data: combined,
        meta: {
            total: combined.length,
            liveCount: dbItems.length,
        },
    })
}
