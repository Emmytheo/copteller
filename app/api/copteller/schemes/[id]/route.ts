import { NextRequest, NextResponse } from "next/server"
import { requireCoptellerRole, getCoptellerAuth } from "@/lib/copteller/auth"
import { getSchemeById, updateScheme, writeAuditLog } from "@/lib/copteller/db"

export async function GET(req: NextRequest, { params }: { params: Promise<any> }) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    try {
        const scheme = await getSchemeById(id)
        return NextResponse.json({ data: scheme })
    } catch {
        return NextResponse.json({ error: "Scheme not found." }, { status: 404 })
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<any> }) {
    const auth = await requireCoptellerRole(req, ["superadmin", "coop_admin"])
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    let body: Record<string, any>
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }) }
    try {
        const before = await getSchemeById(id)
        // Coop admins can only edit their own cooperative schemes
        if (auth.role === "coop_admin") {
            const coopId = typeof before.cooperative === "object" ? (before.cooperative as any)?.id : before.cooperative
            if (String(coopId) !== String(auth.cooperativeId)) {
                return NextResponse.json({ error: "Forbidden." }, { status: 403 })
            }
        }
        const after = await updateScheme(id, body)
        await writeAuditLog({ actor_id: auth.userId, actor_role: auth.role, actor_name: auth.displayName, action: "scheme.updated", entity_type: "scheme", entity_id: id, before_state: before, after_state: after })
        return NextResponse.json({ data: after })
    } catch (err) {
        console.error("[PATCH /api/copteller/schemes/[id]]", err)
        return NextResponse.json({ error: "Failed to update scheme." }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<any> }) {
    const auth = await requireCoptellerRole(req, ["superadmin"])
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    try {
        const before = await getSchemeById(id)
        const after = await updateScheme(id, { status: "closed" } as any)
        await writeAuditLog({ actor_id: auth.userId, actor_role: auth.role, actor_name: auth.displayName, action: "scheme.closed", entity_type: "scheme", entity_id: id, before_state: before, after_state: after })
        return NextResponse.json({ data: after })
    } catch (err) {
        console.error("[DELETE /api/copteller/schemes/[id]]", err)
        return NextResponse.json({ error: "Failed to close scheme." }, { status: 500 })
    }
}