import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'

export async function GET(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const payload = await getPayload({ config })
        const res = await payload.find({
            collection: 'service-providers',
            sort: 'priority',
            limit: 200,
            depth: 1,
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, docs: res.docs, totalDocs: res.totalDocs })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        await ensureOlivePayTables().catch(() => {})
        const payload = await getPayload({ config })
        const body = await req.json()

        const doc = await payload.create({
            collection: 'service-providers',
            data: body,
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, doc }, { status: 201 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
