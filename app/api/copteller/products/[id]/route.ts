import { NextRequest, NextResponse } from "next/server"
import { requireCoptellerRole, getCoptellerAuth } from "@/lib/copteller/auth"
import { getProductTypeById, updateProductType, writeAuditLog } from "@/lib/copteller/db"

export async function GET(req: NextRequest, { params }: { params: Promise<any> }) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    try {
        const product = await getProductTypeById(id)
        return NextResponse.json({ data: product })
    } catch {
        return NextResponse.json({ error: "Product not found." }, { status: 404 })
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<any> }) {
    const auth = await requireCoptellerRole(req, ["superadmin"])
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    let body: Record<string, any>
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }) }
    try {
        const before = await getProductTypeById(id)
        const after = await updateProductType(id, body)
        await writeAuditLog({ actor_id: auth.userId, actor_role: auth.role, actor_name: auth.displayName, action: body.status === "deprecated" ? "product.deprecated" : "product.updated", entity_type: "product_type", entity_id: id, before_state: before, after_state: after })
        return NextResponse.json({ data: after })
    } catch (err) {
        console.error("[PATCH /api/copteller/products/[id]]", err)
        return NextResponse.json({ error: "Failed to update product." }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<any> }) {
    const auth = await requireCoptellerRole(req, ["superadmin"])
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    try {
        const before = await getProductTypeById(id)
        const after = await updateProductType(id, { status: "deprecated" } as any)
        await writeAuditLog({ actor_id: auth.userId, actor_role: auth.role, actor_name: auth.displayName, action: "product.deprecated", entity_type: "product_type", entity_id: id, before_state: before, after_state: after })
        return NextResponse.json({ data: after })
    } catch (err) {
        console.error("[DELETE /api/copteller/products/[id]]", err)
        return NextResponse.json({ error: "Failed to deprecate product." }, { status: 500 })
    }
}