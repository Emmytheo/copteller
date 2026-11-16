import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/copteller/db'
import { getCoptellerAuth } from '@/lib/copteller/auth'

export async function GET(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    const url = new URL(req.url)
    const category = url.searchParams.get('category') // e.g. loan, grant

    try {
        const payload = await getDb()
        
        let typeQuery: any = { in: ['micro_loan', 'grant'] }
        if (category === 'loan') {
            typeQuery = { equals: 'micro_loan' }
        } else if (category === 'grant') {
            typeQuery = { equals: 'grant' }
        }

        const contractsRes = await payload.find({
            collection: 'copteller-contracts',
            where: {
                contract_type: typeQuery
            },
            limit: 100,
            sort: '-createdAt',
            overrideAccess: true,
        })

        const mappedApps = contractsRes.docs.map((c: any) => {
            const memberObj = typeof c.member === 'object' ? c.member : null
            const schemeObj = typeof c.scheme === 'object' ? c.scheme : null
            const coopObj = typeof c.cooperative === 'object' ? c.cooperative : null

            return {
                id: String(c.id),
                productId: schemeObj ? String(schemeObj.id) : '',
                productName: schemeObj ? schemeObj.name : 'Unknown Scheme',
                productCategory: c.contract_type === 'micro_loan' ? 'loan' : 'grant',
                userId: memberObj ? String(memberObj.id) : '',
                userName: memberObj ? `${memberObj.firstName || 'Member'} ${memberObj.lastName || ''}`.trim() : 'Coop Member',
                amount: (c.total_obligation || 0) / 100, // convert to Naira
                status: c.status === 'pending' ? 'pending' : c.status === 'active' ? 'disbursed' : c.status,
                dateApplied: c.createdAt || new Date().toISOString(),
                cooperativeName: coopObj ? coopObj.name : 'Independent Guild',
                notes: c.notes || '',
                repayment_frequency: c.repayment_frequency || 'weekly'
            }
        })

        return NextResponse.json({ success: true, applications: mappedApps })
    } catch (e: any) {
        console.error('Failed to fetch contracts for applications queue:', e)
        return NextResponse.json({ success: false, error: 'Failed to load applications queue' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json()
        const { id, status } = body
        if (!id || !status) {
            return NextResponse.json({ success: false, error: 'id and status are required' }, { status: 400 })
        }

        // Map frontend statuses: 'disbursed' -> 'active', 'approved' -> 'active'
        const dbStatus = status === 'disbursed' || status === 'approved' ? 'active' : status

        const payload = await getDb()
        const updated = await payload.update({
            collection: 'copteller-contracts',
            id,
            data: {
                status: dbStatus
            },
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, application: updated })
    } catch (e: any) {
        console.error('Failed to update application contract status:', e)
        return NextResponse.json({ success: false, error: 'Failed to update application' }, { status: 500 })
    }
}
