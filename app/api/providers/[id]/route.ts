import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const { id } = await params
        const payload = await getPayload({ config })

        const doc = await payload.findByID({
            collection: 'service-providers',
            id,
            depth: 1,
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, doc })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 404 })
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        await ensureOlivePayTables().catch(() => {})
        const { id } = await params
        const payload = await getPayload({ config })
        const body = await req.json()

        const doc = await payload.update({
            collection: 'service-providers',
            id,
            data: body,
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, doc })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const { id } = await params
        const payload = await getPayload({ config })

        await payload.delete({
            collection: 'service-providers',
            id,
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, message: 'Service provider deleted' })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
