import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requireCoptellerRole } from '@/lib/copteller/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth

    try {
        const payload = await getPayload({ config })
        const [mappingsRes, productTypesRes, providersRes] = await Promise.all([
            payload.find({ collection: 'provider-mappings', limit: 200, depth: 2, overrideAccess: true }),
            payload.find({ collection: 'product-types', limit: 200, overrideAccess: true }).catch(() => ({ docs: [] })),
            payload.find({ collection: 'service-providers', limit: 100, overrideAccess: true }),
        ])
        return NextResponse.json({
            success: true,
            docs: mappingsRes.docs,
            productTypes: productTypesRes.docs,
            providers: providersRes.docs,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to load provider mappings' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json()
        const { internalName, externalCode, providerId, productTypeId } = body
        if (!internalName || !externalCode || !providerId) {
            return NextResponse.json({ error: 'internalName, externalCode, and providerId are required' }, { status: 400 })
        }

        const payload = await getPayload({ config })
        const doc = await payload.create({
            collection: 'provider-mappings',
            overrideAccess: true,
            data: {
                internalName: String(internalName).trim(),
                externalCode: String(externalCode).trim(),
                provider: Number(providerId) || providerId,
                ...(productTypeId
                    ? { relatedEntity: { relationTo: 'product-types', value: Number(productTypeId) || productTypeId } }
                    : {}),
            } as any,
        })

        return NextResponse.json({ success: true, doc })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to create provider mapping' }, { status: 500 })
    }
}
