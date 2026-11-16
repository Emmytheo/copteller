import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/copteller/db'
import { getCoptellerAuth, requireCoptellerRole } from '@/lib/copteller/auth'

export const dynamic = 'force-dynamic'

let cachedCategoriesList: any[] | null = null
let cachedCategoriesListExpiresAt = 0

export function invalidateCategoriesCache() {
    cachedCategoriesList = null
    cachedCategoriesListExpiresAt = 0
}

export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = Date.now()
        if (cachedCategoriesList && now < cachedCategoriesListExpiresAt) {
            return NextResponse.json({ success: true, categories: cachedCategoriesList })
        }

        const payload = await getDb()

        const [categoriesRes, servicesRes] = await Promise.all([
            payload.find({
                collection: 'service-categories',
                limit: 100,
                overrideAccess: true,
            }),
            payload.find({
                collection: 'services',
                where: { status: { equals: 'active' } },
                depth: 0,
                limit: 300,
                overrideAccess: true,
            })
        ])

        // Compute service count per category
        const countMap = new Map<string, number>()
        servicesRes.docs.forEach((s: any) => {
            const catId = typeof s.category === 'object' && s.category !== null ? String(s.category.id) : String(s.category)
            countMap.set(catId, (countMap.get(catId) || 0) + 1)
        })

        const categories = categoriesRes.docs.map((cat: any) => ({
            id: String(cat.id),
            name: cat.name,
            slug: cat.slug,
            description: cat.description || '',
            icon: cat.icon || 'Layers',
            status: cat.status || 'active',
            ui_layout: cat.ui_layout || 'default',
            serviceCount: countMap.get(String(cat.id)) || 0,
            createdAt: cat.createdAt,
        }))

        cachedCategoriesList = categories
        cachedCategoriesListExpiresAt = now + 60000

        return NextResponse.json({ success: true, categories })
    } catch (error: any) {
        console.error('Copteller GET /api/copteller/services/categories error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const { name, slug, description, icon, status, ui_layout } = body

        if (!name) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
        }

        const payload = await getDb()

        const autoSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')

        const newCategory = await payload.create({
            collection: 'service-categories',
            data: {
                name,
                slug: autoSlug,
                description: description || '',
                icon: icon || 'Layers',
                status: status || 'active',
                ui_layout: ui_layout || 'default',
            },
            overrideAccess: true,
        })

        invalidateCategoriesCache()
        return NextResponse.json({ success: true, category: newCategory })
    } catch (error: any) {
        console.error('Copteller POST /api/copteller/services/categories error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
