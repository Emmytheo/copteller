import { NextRequest, NextResponse } from 'next/server'
import { getCooperatives } from '@/lib/copteller/db'
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
        console.warn('[GET /api/copteller/cooperatives] Falling back to registered presets:', err)
    }

    // Merge DB cooperatives with canonical presets (deduplicating by normalized name)
    const seenNames = new Set(dbItems.map((c) => c.name.trim().toLowerCase()))
    const presetAdditions = PRESET_REGISTERED_COOPS.filter((p) => {
        if (sector && p.sector !== sector) return false
        return !seenNames.has(p.name.trim().toLowerCase())
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
