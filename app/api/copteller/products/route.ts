import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole, getCoptellerAuth } from '@/lib/copteller/auth'
import { getProductTypes, getProductTypeById, createProductType, updateProductType, writeAuditLog } from '@/lib/copteller/db'
import { queryCopteller } from '@/lib/copteller/pg'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'

async function attachExtensions(docs: any[]) {
    if (!docs.length) return docs
    await ensureOlivePayTables().catch(() => {})
    const ids = docs.map((d) => Number(d.id)).filter((n) => Number.isFinite(n))
    if (!ids.length) return docs
    const extRes = await queryCopteller(
        `SELECT * FROM copteller.copteller_product_type_extensions WHERE product_type_id = ANY($1::bigint[])`,
        [ids]
    ).catch(() => ({ rows: [] as any[] }))
    const extMap = new Map(extRes.rows.map((r) => [String(r.product_type_id), r]))
    return docs.map((d) => {
        const ext = extMap.get(String(d.id))
        return ext
            ? {
                  ...d,
                  form_schema: ext.form_schema || [],
                  onboarding_workflow_id: ext.onboarding_workflow_id || '',
                  disbursement_workflow_id: ext.disbursement_workflow_id || '',
                  repayment_workflow_id: ext.repayment_workflow_id || '',
                  olivepay_settlement_config: ext.olivepay_settlement_config || {},
              }
            : { ...d, form_schema: d.form_schema || [] }
    })
}

async function saveExtensions(productId: number | string, body: Record<string, any>) {
    if (
        body.form_schema === undefined &&
        body.onboarding_workflow_id === undefined &&
        body.disbursement_workflow_id === undefined &&
        body.repayment_workflow_id === undefined &&
        body.olivepay_settlement_config === undefined
    ) {
        return
    }
    await ensureOlivePayTables()
    await queryCopteller(
        `INSERT INTO copteller.copteller_product_type_extensions
         (product_type_id, form_schema, onboarding_workflow_id, disbursement_workflow_id, repayment_workflow_id, olivepay_settlement_config, updated_at)
         VALUES ($1, $2::jsonb, $3, $4, $5, $6::jsonb, NOW())
         ON CONFLICT (product_type_id) DO UPDATE SET
           form_schema = COALESCE($2::jsonb, copteller.copteller_product_type_extensions.form_schema),
           onboarding_workflow_id = COALESCE($3, copteller.copteller_product_type_extensions.onboarding_workflow_id),
           disbursement_workflow_id = COALESCE($4, copteller.copteller_product_type_extensions.disbursement_workflow_id),
           repayment_workflow_id = COALESCE($5, copteller.copteller_product_type_extensions.repayment_workflow_id),
           olivepay_settlement_config = COALESCE($6::jsonb, copteller.copteller_product_type_extensions.olivepay_settlement_config),
           updated_at = NOW()`,
        [
            Number(productId),
            JSON.stringify(Array.isArray(body.form_schema) ? body.form_schema : []),
            body.onboarding_workflow_id ?? null,
            body.disbursement_workflow_id ?? null,
            body.repayment_workflow_id ?? null,
            JSON.stringify(body.olivepay_settlement_config || {}),
        ]
    )
}

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
        const enriched = await attachExtensions(result.docs)
        return NextResponse.json({
            data: enriched,
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

export async function POST(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth

    let body: Record<string, any>
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) }

    if (!body.name || !body.product_type || !body.category) {
        return NextResponse.json({ error: 'name, product_type, and category are required.' }, { status: 400 })
    }

    try {
        const { form_schema, onboarding_workflow_id, disbursement_workflow_id, repayment_workflow_id, olivepay_settlement_config, ...coreFields } = body
        const product = await createProductType({
            ...coreFields,
            status: body.status ?? 'active',
            repayment_frequency: body.repayment_frequency ?? 'weekly',
        })
        await saveExtensions(product.id, { form_schema, onboarding_workflow_id, disbursement_workflow_id, repayment_workflow_id, olivepay_settlement_config })
        const [enriched] = await attachExtensions([product])

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: 'product.created',
            entity_type: 'product_type',
            entity_id: String(product.id),
            after_state: enriched,
        })

        return NextResponse.json({ data: enriched }, { status: 201 })
    } catch (err) {
        console.error('[POST /api/copteller/products]', err)
        return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth

    let body: Record<string, any>
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) }

    const { id, form_schema, onboarding_workflow_id, disbursement_workflow_id, repayment_workflow_id, olivepay_settlement_config, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Product id is required.' }, { status: 400 })

    try {
        const before = await getProductTypeById(id)
        const after = await updateProductType(id, updates)
        await saveExtensions(id, { form_schema, onboarding_workflow_id, disbursement_workflow_id, repayment_workflow_id, olivepay_settlement_config })
        const [enriched] = await attachExtensions([after])

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: updates.status === 'deprecated' ? 'product.deprecated' : 'product.updated',
            entity_type: 'product_type',
            entity_id: String(id),
            before_state: before,
            after_state: enriched,
        })

        return NextResponse.json({ data: enriched })
    } catch (err) {
        console.error('[PATCH /api/copteller/products]', err)
        return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 })
    }
}
