import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole, getCoptellerAuth } from '@/lib/copteller/auth'
import { getProductTypes, getProductTypeById, createProductType, updateProductType, writeAuditLog } from '@/lib/copteller/db'

/**
 * GET /api/copteller/products
 * List product templates. Filterable by sector, category, product_type, status.
 */
export async function GET(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = req.nextUrl
    const sector = searchParams.get('sector') ?? undefined
    const category = searchParams.get('category') ?? undefined
    const product_type = searchParams.get('product_type') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100)
    const page = Number(searchParams.get('page') ?? '1')

    try {
        const result = await getProductTypes({ sector, category, product_type, status, limit, page })
        return NextResponse.json({
            data: result.docs,
            meta: {
                total: result.totalDocs,
                page: result.page,
                limit: result.limit,
                hasMore: result.hasNextPage,
                totalPages: result.totalPages,
            },
        })
    } catch (err) {
        console.error('[GET /api/copteller/products]', err)
        return NextResponse.json({ error: 'Failed to retrieve products.' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/products
 * Create a new product template. Superadmin only.
 */
export async function POST(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['superadmin'])
    if (auth instanceof NextResponse) return auth

    let body: Record<string, any>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    if (!body.name || !body.product_type || !body.category) {
        return NextResponse.json({ error: 'name, product_type, and category are required.' }, { status: 400 })
    }

    try {
        const product = await createProductType({
            ...body,
            status: body.status ?? 'active',
            repayment_frequency: body.repayment_frequency ?? 'weekly',
        })

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: 'product.created',
            entity_type: 'product_type',
            entity_id: String(product.id),
            after_state: product,
        })

        return NextResponse.json({ data: product }, { status: 201 })
    } catch (err) {
        console.error('[POST /api/copteller/products]', err)
        return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/products
 * Update an existing product template. Superadmin only.
 */
export async function PATCH(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['superadmin'])
    if (auth instanceof NextResponse) return auth

    let body: Record<string, any>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Product id is required.' }, { status: 400 })

    try {
        const before = await getProductTypeById(id)
        const after = await updateProductType(id, updates)

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: updates.status === 'deprecated' ? 'product.deprecated' : 'product.updated',
            entity_type: 'product_type',
            entity_id: String(id),
            before_state: before,
            after_state: after,
        })

        return NextResponse.json({ data: after })
    } catch (err) {
        console.error('[PATCH /api/copteller/products]', err)
        return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 })
    }
}
