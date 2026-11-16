import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole, getCoptellerAuth, createProfileForUser } from '@/lib/copteller/auth'
import { getCooperatives, getCooperativeById, writeAuditLog } from '@/lib/copteller/db'
export async function GET(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = req.nextUrl
    const sector = searchParams.get('sector') ?? undefined
    const cooperative_type = searchParams.get('cooperative_type') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const state = searchParams.get('state') ?? undefined
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100)
    const page = Number(searchParams.get('page') ?? '1')

    try {
        const result = await getCooperatives({ sector, cooperative_type, status, state, limit, page })
        return NextResponse.json({
            data: result.docs,
            meta: {
                total: result.totalDocs,
                page: result.page,
                limit: result.limit,
                hasMore: result.hasNextPage,
                totalPages: result.totalPages,
            },
        })
    } catch (err) {
        console.error('[GET /api/copteller/admin/cooperatives]', err)
        return NextResponse.json({ error: 'Failed to retrieve cooperatives.' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['superadmin'])
    if (auth instanceof NextResponse) return auth

    let body: Record<string, any>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { cooperative_id, authorized_product_types, ...updates } = body
    if (!cooperative_id) return NextResponse.json({ error: 'cooperative_id is required.' }, { status: 400 })

    const payload = await getDb()

    try {
        const before = await payload.findByID({ collection: 'cooperatives', id: cooperative_id })

        let updateData: any = { ...updates }

        // Proper authorized_product_types relationship mapping
        if (authorized_product_types !== undefined && Array.isArray(authorized_product_types)) {
            updateData.authorized_product_types = authorized_product_types
        }

        const after = await payload.update({
            collection: 'cooperatives',
            id: cooperative_id,
            data: updateData,
            overrideAccess: true,
        })

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: updates.status === 'active' && before.status === 'pending' ? 'coop.approved' : 'system.data_export', // fallback generic
            entity_type: 'cooperative',
            entity_id: String(cooperative_id),
            before_state: before,
            after_state: after,
        })

        return NextResponse.json({ data: after })
    } catch (err) {
        console.error('[PATCH /api/copteller/admin/cooperatives]', err)
        return NextResponse.json({ error: 'Failed to update cooperative.' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    // Both coop_admins and superadmins can create cooperatives
    const auth = await requireCoptellerRole(req, ['superadmin', 'coop_admin'])
    if (auth instanceof NextResponse) return auth

    let body: Record<string, any>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { name, cooperative_type, sector } = body
    let union_leader_id = body.union_leader_id

    const payload = await getDb()

    if (!union_leader_id) {
        // Resolve or create customer document in Payload for this registering admin
        const customerRes = await payload.find({
            collection: 'customers',
            where: { email: { equals: auth.email.toLowerCase().trim() } },
            limit: 1,
            overrideAccess: true
        })

        if (customerRes.docs.length > 0) {
            union_leader_id = String(customerRes.docs[0].id)
        } else {
            const newCust = await payload.create({
                collection: 'customers',
                data: {
                    firstName: auth.displayName?.split(' ')[0] || 'Admin',
                    lastName: auth.displayName?.split(' ')[1] || '',
                    email: auth.email,
                    phone_number: '0803 000 0000',
                    kyc_status: 'active',
                    onboarding_status: 'completed',
                },
                overrideAccess: true
            })
            union_leader_id = String(newCust.id)

            // Create ledger account
            const accountNum = Math.floor(1000000000 + Math.random() * 9000000000).toString()
            await payload.create({
                collection: 'accounts',
                data: {
                    customer: union_leader_id,
                    user_id: `SUP_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                    account_number: accountNum,
                    account_type: 'Savings',
                    balance: 0,
                    currency: 'NGN',
                    source: 'local',
                    is_primary: true,
                    status: 'active',
                },
                overrideAccess: true
            })
        }
    }

    if (!name || !union_leader_id) {
        return NextResponse.json({ error: 'name is required.' }, { status: 400 })
    }

    try {
        const cooperative = await payload.create({
            collection: 'cooperatives',
            data: {
                ...body,
                status: 'pending', // Always start as pending
                cooperative_type: cooperative_type ?? 'multipurpose',
                sector: sector ?? 'other',
            },
            overrideAccess: true,
        })

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: 'coop.registered',
            entity_type: 'cooperative',
            entity_id: String(cooperative.id),
            after_state: cooperative,
        })

        // Auto-create Copteller Profile for the newly registered coop admin (so they can log in next time)
        if (auth.role === 'coop_admin') {
            try {
                const { getProfilesForUser } = require('@/lib/copteller/auth')
                const existingProfiles = await getProfilesForUser(auth.userId)
                const hasAdminProfile = existingProfiles.some((p: any) => p.role === 'coop_admin')
                
                if (!hasAdminProfile) {
                    await createProfileForUser(auth.userId, 'coop_admin', {
                        display_name: auth.displayName,
                        cooperative_id: String(cooperative.id),
                        cooperative_name: cooperative.name,
                        onboarding_done: true
                    })
                }
            } catch (err) {
                console.error('[Cooperative Admin Auto-Profile Registration Failed]', err)
            }
        }

        return NextResponse.json({ data: cooperative }, { status: 201 })
    } catch (err) {
        console.error('[POST /api/copteller/admin/cooperatives]', err)
        return NextResponse.json({ error: 'Failed to create cooperative.' }, { status: 500 })
    }
}
