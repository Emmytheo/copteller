import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole, getCoptellerAuth } from '@/lib/copteller/auth'
import { getProductTypeById, updateProductType, writeAuditLog } from '@/lib/copteller/db'
import { queryCopteller } from '@/lib/copteller/pg'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'

async function loadWithExtension(product: any) {
    if (!product) return product
    await ensureOlivePayTables().catch(() => {})
    const res = await queryCopteller(
        `SELECT * FROM copteller.copteller_product_type_extensions WHERE product_type_id = $1 LIMIT 1`,
        [Number(product.id)]
    ).catch(() => ({ rows: [] as any[] }))
    const ext = res.rows[0]
    return {
        ...product,
        form_schema: ext?.form_schema || [],
        onboarding_workflow_id: ext?.onboarding_workflow_id || '',
        disbursement_workflow_id: ext?.disbursement_workflow_id || '',
        repayment_workflow_id: ext?.repayment_workflow_id || '',
        olivepay_settlement_config: ext?.olivepay_settlement_config || {},
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    try {
        const product = await getProductTypeById(id)
        const enriched = await loadWithExtension(product)
        return NextResponse.json({ data: enriched })
    } catch {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    let body: Record<string, any>
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) }
    try {
        const {
            form_schema,
            onboarding_workflow_id,
            disbursement_workflow_id,
            repayment_workflow_id,
            olivepay_settlement_config,
            ...coreFields
        } = body
        const before = await getProductTypeById(id)
        const after = Object.keys(coreFields).length > 0 ? await updateProductType(id, coreFields) : before

        if (
            form_schema !== undefined ||
            onboarding_workflow_id !== undefined ||
            disbursement_workflow_id !== undefined ||
            repayment_workflow_id !== undefined ||
            olivepay_settlement_config !== undefined
        ) {
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
                    Number(id),
                    form_schema !== undefined ? JSON.stringify(form_schema) : null,
                    onboarding_workflow_id ?? null,
                    disbursement_workflow_id ?? null,
                    repayment_workflow_id ?? null,
                    olivepay_settlement_config !== undefined ? JSON.stringify(olivepay_settlement_config) : null,
                ]
            )
        }

        const enriched = await loadWithExtension(after)
        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: body.status === 'deprecated' ? 'product.deprecated' : 'product.updated',
            entity_type: 'product_type',
            entity_id: id,
            before_state: before,
            after_state: enriched,
        })
        return NextResponse.json({ data: enriched })
    } catch (err) {
        console.error('[PATCH /api/copteller/products/[id]]', err)
        return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    try {
        const before = await getProductTypeById(id)
        const after = await updateProductType(id, { status: 'deprecated' } as any)
        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: 'product.deprecated',
            entity_type: 'product_type',
            entity_id: id,
            before_state: before,
            after_state: after,
        })
        return NextResponse.json({ data: after })
    } catch (err) {
        console.error('[DELETE /api/copteller/products/[id]]', err)
        return NextResponse.json({ error: 'Failed to deprecate product.' }, { status: 500 })
    }
}
