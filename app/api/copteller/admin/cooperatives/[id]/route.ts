import { NextRequest, NextResponse } from "next/server"
import { requireCoptellerRole, getCoptellerAuth } from "@/lib/copteller/auth"
import { getCooperativeById, writeAuditLog } from "@/lib/copteller/db"
import { getDb } from "@/lib/copteller/db"

export async function GET(req: NextRequest, { params }: { params: Promise<any> }) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    try {
        const coop = await getCooperativeById(id)
        return NextResponse.json({ data: coop })
    } catch {
        return NextResponse.json({ error: "Cooperative not found." }, { status: 404 })
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<any> }) {
    const auth = await requireCoptellerRole(req, ["superadmin"])
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    let body: Record<string, any>
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }) }
    const payload = await getDb()
    try {
        const before = await payload.findByID({ collection: "cooperatives", id, overrideAccess: true })
        const after = await payload.update({ collection: "cooperatives", id, data: body, overrideAccess: true })
        const action = body.status === "active" && before.status === "pending" ? "coop.approved"
            : body.status === "rejected" ? "coop.rejected"
            : body.status === "suspended" ? "coop.suspended"
            : "coop.updated"
        await writeAuditLog({ actor_id: auth.userId, actor_role: auth.role, actor_name: auth.displayName, action, entity_type: "cooperative", entity_id: id, before_state: before, after_state: after })
        return NextResponse.json({ data: after })
    } catch (err) {
        console.error("[PATCH /api/copteller/admin/cooperatives/[id]]", err)
        return NextResponse.json({ error: "Failed to update cooperative." }, { status: 500 })
    }
}