import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requireCoptellerRole } from '@/lib/copteller/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth

    try {
        const { id } = await params
        const body = await req.json()
        const payload = await getPayload({ config })
        const doc = await payload.update({
            collection: 'provider-mappings',
            id,
            overrideAccess: true,
            data: {
                ...(body.externalCode !== undefined ? { externalCode: String(body.externalCode).trim() } : {}),
                ...(body.internalName !== undefined ? { internalName: String(body.internalName).trim() } : {}),
            },
        })
        return NextResponse.json({ success: true, doc })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to update mapping' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth

    try {
        const { id } = await params
        const payload = await getPayload({ config })
        await payload.delete({ collection: 'provider-mappings', id, overrideAccess: true })
        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to delete mapping' }, { status: 500 })
    }
}
