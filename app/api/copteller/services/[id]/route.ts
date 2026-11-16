import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/copteller/db'
import { getCoptellerAuth, requireCoptellerRole } from '@/lib/copteller/auth'

export const dynamic = 'force-dynamic'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getCoptellerAuth(req)
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const payload = await getDb()

        const serviceId = /^\d+$/.test(id) ? Number(id) : id

        const service = await payload.findByID({
            collection: 'services',
            id: serviceId as any,
            depth: 2,
            overrideAccess: true,
        })

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, service })
    } catch (error: any) {
        console.error('Copteller GET /api/copteller/services/[id] error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const { id } = await params
        const body = await req.json().catch(() => ({}))
        const payload = await getDb()

        const serviceId = /^\d+$/.test(id) ? Number(id) : id

        const updatedService = await payload.update({
            collection: 'services',
            id: serviceId as any,
            data: body,
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, service: updatedService })
    } catch (error: any) {
        console.error('Copteller PUT /api/copteller/services/[id] error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const { id } = await params
        const payload = await getDb()

        const serviceId = /^\d+$/.test(id) ? Number(id) : id

        await payload.delete({
            collection: 'services',
            id: serviceId as any,
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, message: 'Service successfully deleted' })
    } catch (error: any) {
        console.error('Copteller DELETE /api/copteller/services/[id] error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
