import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/copteller/db'
import { getCoptellerAuth, requireCoptellerRole } from '@/lib/copteller/auth'

export const dynamic = 'force-dynamic'

let cachedCategories: any[] | null = null
let cachedCategoriesExpiresAt = 0
let cachedActiveServices: any[] | null = null
let cachedActiveServicesExpiresAt = 0
let cachedAllServices: any[] | null = null
let cachedAllServicesExpiresAt = 0

export function invalidateServicesCache() {
    cachedCategories = null
    cachedCategoriesExpiresAt = 0
    cachedActiveServices = null
    cachedActiveServicesExpiresAt = 0
    cachedAllServices = null
    cachedAllServicesExpiresAt = 0
}

export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const { searchParams } = new URL(req.url)
        const isAll = searchParams.get('all') === '1'
        const categorySlug = searchParams.get('category')
        const search = searchParams.get('search')?.toLowerCase().trim()
        const role = auth.role || 'member'

        const payload = await getDb()

        // Fetch user customer and active cooperative to determine sector and memberships
        let userSector = 'all'
        if (auth.cooperativeId) {
            try {
                const coopId = /^\d+$/.test(auth.cooperativeId) ? Number(auth.cooperativeId) : auth.cooperativeId
                const coopDoc = await payload.findByID({
                    collection: 'cooperatives',
                    id: coopId as any,
                    overrideAccess: true,
                })
                if (coopDoc && (coopDoc as any).sector) {
                    userSector = (coopDoc as any).sector
                }
            } catch {
                // Ignore fallback
            }
        }

        // Fetch categories (cached for 60s)
        const now = Date.now()
        let categoriesDocs = cachedCategories
        if (!categoriesDocs || now > cachedCategoriesExpiresAt) {
            const categoriesRes = await payload.find({
                collection: 'service-categories',
                where: { status: { equals: 'active' } },
                limit: 100,
                overrideAccess: true,
            })
            categoriesDocs = categoriesRes.docs
            cachedCategories = categoriesDocs
            cachedCategoriesExpiresAt = now + 60000
        }
        const categoryMap = new Map((categoriesDocs || []).map((c: any) => [String(c.id), c]))
        const categorySlugMap = new Map((categoriesDocs || []).map((c: any) => [c.slug, c]))

        let targetCategoryId: string | null = null
        if (categorySlug && categorySlug !== 'all') {
            const cat = categorySlugMap.get(categorySlug) as any
            if (cat) targetCategoryId = String(cat.id)
        }

        // Superadmin viewing management console with ?all=1 gets full raw list
        let filteredDocs: any[] = []
        if (isAll && role === 'superadmin' && !search && !targetCategoryId && cachedAllServices && now <= cachedAllServicesExpiresAt) {
            filteredDocs = [...cachedAllServices]
        } else if (!isAll && !targetCategoryId && role !== 'superadmin' && !search && cachedActiveServices && now <= cachedActiveServicesExpiresAt) {
            filteredDocs = [...cachedActiveServices]
        } else {
            const queryWhere: any = {}
            if (!isAll || role !== 'superadmin') {
                queryWhere.status = { equals: 'active' }
            }
            if (targetCategoryId) {
                queryWhere.category = { equals: targetCategoryId }
            }

            const servicesRes = await payload.find({
                collection: 'services',
                where: queryWhere,
                depth: 1,
                limit: 200,
                overrideAccess: true,
            })
            filteredDocs = servicesRes.docs
            if (isAll && role === 'superadmin' && !targetCategoryId && !search) {
                cachedAllServices = servicesRes.docs
                cachedAllServicesExpiresAt = now + 60000
            } else if (!isAll && !targetCategoryId && !search) {
                cachedActiveServices = servicesRes.docs
                cachedActiveServicesExpiresAt = now + 60000
            }
        }

        // Apply Persona, Sector, and Cooperative Whitelist Filtering for non-superadmin users
        if (role !== 'superadmin' && !isAll) {
            filteredDocs = filteredDocs.filter((service: any) => {
                // 1. Role Check
                const allowedRoles = service.allowed_roles || ['member', 'coop_admin', 'superadmin']
                if (!allowedRoles.includes(role) && !allowedRoles.includes('all')) {
                    return false
                }

                // 2. Sector Check
                const sectorTags = service.sector_tags || ['all']
                if (!sectorTags.includes('all') && userSector !== 'all' && !sectorTags.includes(userSector)) {
                    return false
                }

                // 3. Cooperative Scope Check
                if (service.cooperative_scope === 'specific_cooperatives') {
                    const coopIds = Array.isArray(service.cooperatives)
                        ? service.cooperatives.map((c: any) => (typeof c === 'object' ? String(c.id) : String(c)))
                        : []
                    if (auth.cooperativeId && !coopIds.includes(String(auth.cooperativeId))) {
                        return false
                    }
                }

                return true
            })
        }

        // Text Search Filter
        if (search) {
            filteredDocs = filteredDocs.filter((s: any) => 
                s.name?.toLowerCase().includes(search) || 
                s.description?.toLowerCase().includes(search) ||
                s.provider_service_code?.toLowerCase().includes(search)
            )
        }

        // Format and enrich docs with category metadata
        const formattedServices = filteredDocs.map((s: any) => {
            const catDoc = typeof s.category === 'object' && s.category !== null 
                ? s.category 
                : categoryMap.get(String(s.category))

            return {
                id: String(s.id),
                name: s.name,
                description: s.description || '',
                icon: s.icon || 'Zap',
                category: catDoc ? {
                    id: String(catDoc.id),
                    name: catDoc.name,
                    slug: catDoc.slug,
                    icon: catDoc.icon,
                    ui_layout: catDoc.ui_layout,
                } : null,
                provider: typeof s.provider === 'object' && s.provider !== null ? {
                    id: String(s.provider.id),
                    name: s.provider.name,
                    slug: s.provider.slug,
                } : (s.provider ? String(s.provider) : null),
                provider_service_code: s.provider_service_code || '',
                validation_workflow: typeof s.validation_workflow === 'object' && s.validation_workflow !== null 
                    ? { id: String(s.validation_workflow.id), name: s.validation_workflow.name }
                    : (s.validation_workflow ? String(s.validation_workflow) : null),
                execution_workflow: typeof s.execution_workflow === 'object' && s.execution_workflow !== null 
                    ? { id: String(s.execution_workflow.id), name: s.execution_workflow.name }
                    : (s.execution_workflow ? String(s.execution_workflow) : null),
                fee_type: s.fee_type || 'none',
                fee_value: s.fee_value || 0,
                form_schema: Array.isArray(s.form_schema) ? s.form_schema : [],
                allowed_roles: s.allowed_roles || ['member', 'coop_admin', 'superadmin'],
                sector_tags: s.sector_tags || ['all'],
                cooperative_scope: s.cooperative_scope || 'all_cooperatives',
                min_kyc_tier: s.min_kyc_tier || 'tier_1',
                settlement_type: s.settlement_type || 'wallet_debit',
                sandbox_enabled: s.sandbox_enabled !== false,
                union_markup_allowed: s.union_markup_allowed !== false,
                status: s.status || 'active',
                service_intent: s.service_intent || 'none',
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
            }
        })

        return NextResponse.json({
            success: true,
            total: formattedServices.length,
            services: formattedServices,
            categories: (categoriesDocs || []).map((c: any) => ({
                id: String(c.id),
                name: c.name,
                slug: c.slug,
                icon: c.icon,
                ui_layout: c.ui_layout,
            })),
            userContext: {
                role,
                cooperativeId: auth.cooperativeId,
                cooperativeName: auth.cooperativeName,
                sector: userSector,
            }
        })
    } catch (error: any) {
        console.error('Copteller GET /api/copteller/services error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const {
            name,
            description,
            icon,
            category,
            provider,
            provider_service_code,
            validation_workflow,
            execution_workflow,
            fee_type,
            fee_value,
            form_schema,
            allowed_roles,
            sector_tags,
            cooperative_scope,
            cooperatives,
            min_kyc_tier,
            settlement_type,
            sandbox_enabled,
            union_markup_allowed,
            status,
            service_intent,
        } = body

        if (!name || !category) {
            return NextResponse.json({ error: 'Service name and category are required' }, { status: 400 })
        }

        const payload = await getDb()

        const newService = await payload.create({
            collection: 'services',
            data: {
                name,
                description: description || '',
                icon: icon || 'Zap',
                category,
                provider: provider || undefined,
                provider_service_code: provider_service_code || undefined,
                validation_workflow: validation_workflow || undefined,
                execution_workflow: execution_workflow || undefined,
                fee_type: fee_type || 'none',
                fee_value: Number(fee_value) || 0,
                form_schema: Array.isArray(form_schema) ? form_schema : [],
                allowed_roles: allowed_roles || ['member', 'coop_admin', 'superadmin'],
                sector_tags: sector_tags || ['all'],
                cooperative_scope: cooperative_scope || 'all_cooperatives',
                cooperatives: cooperatives || undefined,
                min_kyc_tier: min_kyc_tier || 'tier_1',
                settlement_type: settlement_type || 'wallet_debit',
                sandbox_enabled: sandbox_enabled !== false,
                union_markup_allowed: union_markup_allowed !== false,
                status: status || 'active',
                service_intent: service_intent || 'none',
            },
            overrideAccess: true,
        })

        invalidateServicesCache()
        return NextResponse.json({ success: true, service: newService })
    } catch (error: any) {
        console.error('Copteller POST /api/copteller/services error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
