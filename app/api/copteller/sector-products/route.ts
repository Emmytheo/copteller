import { getDb } from '@/lib/copteller/db'
import { NextResponse } from 'next/server'
import { coptellerProducts } from '../data'

// Sector -> relevant labels
const SECTOR_LABELS: Record<string, { leaseLabel: string; grantLabel: string }> = {
    transport: { leaseLabel: 'Hire Purchase Lease', grantLabel: 'Government Transport Grant' },
    agriculture: { leaseLabel: 'Agro Machinery Lease', grantLabel: 'Farm Input Grant' },
    commerce: { leaseLabel: 'Inventory Stall Lease', grantLabel: 'Trader Enterprise Grant' },
    artisan: { leaseLabel: 'Work Tools Lease', grantLabel: 'Tool Subsidy Grant' },
}

export async function GET(req: Request) {
    const url = new URL(req.url)
    const sector = url.searchParams.get('sector') || ''
    const authorizedIds = url.searchParams.get('authorizedIds')

    let products = [...coptellerProducts]

    // Try CoptellerProductTypes Payload CMS collection first
    try {
        const { getPayload } = await import('payload')
        
        const payload = await getDb()
        const result = await payload.find({
            collection: 'copteller-product-types',
            where: { status: { equals: 'active' } },
            limit: 100,
            overrideAccess: true,
        })
        if (result.docs.length > 0) {
            const payloadMapped = result.docs.map((pt: any) => ({
                id: String(pt.id),
                name: pt.name,
                tagline: pt.tagline || '',
                description: pt.description || '',
                category: pt.category,
                sector_tags: pt.sector_tags || [],
                status: pt.status as 'active' | 'draft',
                interestRate: pt.interest_rate ?? 0,
                max_interest_rate: pt.max_interest_rate ?? 18,
                durationMonths: pt.max_duration_months ?? 12,
                min_amount: pt.min_amount ?? 50000,
                max_amount: pt.max_amount ?? 2000000,
                targetCapital: pt.max_amount ?? 1000000,
                auto_assign_on_approval: pt.auto_assign_on_approval ?? true,
                allow_cross_sector_request: pt.allow_cross_sector_request ?? true,
                bankProductTypeId: String(pt.id),
            }))
            products = payloadMapped
        }
    } catch (_err) {
        // Payload unavailable in this context — fallback to mock data
    }

    // Filter by sector
    let filtered = products
    if (sector) {
        filtered = products.filter(p =>
            !p.sector_tags || p.sector_tags.length === 0 || p.sector_tags.includes(sector as any)
        )
    }

    // Filter by authorized IDs
    if (authorizedIds) {
        const ids = authorizedIds.split(',').map(s => s.trim()).filter(Boolean)
        if (ids.length > 0) {
            filtered = filtered.filter(p => ids.includes(p.id))
        }
    }

    return NextResponse.json({
        success: true,
        products: filtered,
        total: filtered.length,
        sector,
        sectorLabels: sector ? SECTOR_LABELS[sector] : null,
    })
}

