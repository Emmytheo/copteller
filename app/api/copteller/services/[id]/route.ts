import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/copteller/db'
import { getCoptellerAuth, requireCoptellerRole } from '@/lib/copteller/auth'
import { invalidateServicesCache } from '@/app/api/copteller/services/route'

export const dynamic = 'force-dynamic'

function sanitizeServicePayload(body: Record<string, any>) {
    const clean: Record<string, any> = { ...body }
    for (const relField of ['provider', 'validation_workflow', 'execution_workflow', 'category']) {
        if (relField in clean) {
            const val = clean[relField]
            if (val === '' || val === 'none' || val === undefined) {
                clean[relField] = null
            } else if (typeof val === 'object' && val !== null && val.id) {
                clean[relField] = /^\d+$/.test(String(val.id)) ? Number(val.id) : val.id
            } else if (typeof val === 'string' && /^\d+$/.test(val)) {
                clean[relField] = Number(val)
            }
        }
    }
    return clean
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

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

async function handleUpdate(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
            data: sanitizeServicePayload(body),
            overrideAccess: true,
        })

        invalidateServicesCache()
        return NextResponse.json({ success: true, service: updatedService })
    } catch (error: any) {
        console.error('Copteller UPDATE /api/copteller/services/[id] error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    return handleUpdate(req, ctx)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    return handleUpdate(req, ctx)
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

        invalidateServicesCache()
        return NextResponse.json({ success: true, message: 'Service successfully deleted' })
    } catch (error: any) {
        console.error('Copteller DELETE /api/copteller/services/[id] error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
