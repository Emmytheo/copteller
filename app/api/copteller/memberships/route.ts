import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole, getCoptellerAuth, createProfileForUser } from '@/lib/copteller/auth'
import { getMemberships, createMembership, updateMembership, writeAuditLog } from '@/lib/copteller/db'
/**
 * GET /api/copteller/memberships
 * List memberships. Role-scoped:
 * - Members: only their own memberships (all their cooperatives)
 * - Coop admins: all memberships for their cooperative
 * - Superadmin: all memberships (filterable)
 */
export async function GET(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = req.nextUrl
    const cooperativeId = searchParams.get('cooperativeId') ?? undefined
    const role = searchParams.get('role') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200)
    const page = Number(searchParams.get('page') ?? '1')

    let memberId: string | undefined = undefined
    let effectiveCoopId: string | undefined = cooperativeId

    if (auth.role === 'member') {
        try {
            const { queryCopteller } = await import('@/lib/copteller/pg')
            const cRes = await queryCopteller(
                `SELECT id FROM copteller.customers WHERE supabase_id = $1 OR email = $2 LIMIT 1`,
                [auth.userId, auth.email?.toLowerCase().trim() || '']
            )
            if (cRes.rows.length > 0) {
                memberId = String(cRes.rows[0].id)
            }
        } catch {}

        if (!memberId) {
            try {
                const payload = await getDb()
                const customerRes = await payload.find({
                    collection: 'customers',
                    where: { email: { equals: auth.email.toLowerCase().trim() } },
                    limit: 1,
                    overrideAccess: true
                })
                if (customerRes.docs.length > 0) {
                    memberId = String(customerRes.docs[0].id)
                }
            } catch {}
        }
    } else if (auth.role === 'coop_admin') {
        effectiveCoopId = effectiveCoopId ?? auth.cooperativeId
    }

    try {
        const result = await getMemberships({
            memberId,
            cooperativeId: effectiveCoopId,
            role,
            status,
            limit,
            page,
        })

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
        console.error('[GET /api/copteller/memberships]', err)
        return NextResponse.json({ error: 'Failed to retrieve memberships.' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/memberships
 * Apply for membership in a cooperative (member self-apply) or
 * bulk add members (coop admin/superadmin).
 */
export async function POST(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    let body: Record<string, any>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { cooperative, role } = body

    if (!cooperative) {
        return NextResponse.json({ error: 'cooperative is required.' }, { status: 400 })
    }

    // Resolve member: self-application or admin adding someone else
    let memberId: string
    const payload = await getDb()

    if (auth.role === 'member') {
        // Self-application: Resolve or create customer document in Payload
        const customerRes = await payload.find({
            collection: 'customers',
            where: { email: { equals: auth.email.toLowerCase().trim() } },
            limit: 1,
            overrideAccess: true
        })

        if (customerRes.docs.length > 0) {
            memberId = String(customerRes.docs[0].id)
            // Ensure customer has supabase_id linked
            if (!customerRes.docs[0].supabase_id) {
                await payload.update({
                    collection: 'customers',
                    id: memberId,
                    data: { supabase_id: auth.userId, is_associated: true },
                    overrideAccess: true,
                }).catch(() => null)
            }
        } else {
            // Create customer document linked directly to Supabase user
            const newCust = await payload.create({
                collection: 'customers',
                data: {
                    firstName: auth.displayName?.split(' ')[0] || 'Member',
                    lastName: auth.displayName?.split(' ')[1] || '',
                    email: auth.email,
                    supabase_id: auth.userId,
                    is_associated: true,
                    phone_number: '0803 000 0000',
                    kyc_status: 'active',
                    onboarding_status: 'completed',
                },
                overrideAccess: true
            })
            memberId = String(newCust.id)
        }

        // Ensure active primary ledger account exists for this member
        const existingAcc = await payload.find({
            collection: 'accounts',
            where: {
                or: [
                    { user_id: { equals: auth.userId } },
                    { customer: { equals: memberId } },
                ]
            },
            limit: 1,
            overrideAccess: true,
        })

        if (existingAcc.docs.length === 0) {
            const accountNum = Math.floor(1000000000 + Math.random() * 9000000000).toString()
            await payload.create({
                collection: 'accounts',
                data: {
                    customer: memberId,
                    user_id: auth.userId,
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
    } else if (auth.role === 'coop_admin' || auth.role === 'superadmin') {
        if (!body.member) {
            return NextResponse.json({ error: 'member is required when creating on behalf of a user.' }, { status: 400 })
        }
        memberId = body.member
    } else {
        return NextResponse.json({ error: 'Unauthorized role for membership creation.' }, { status: 403 })
    }

    // Generate a simple membership number
    const membershipNumber = `CPT-${Date.now().toString(36).toUpperCase()}`

    // Resolve preset cooperative IDs (e.g. "preset_keke_operators") into persisted DB cooperative IDs
    let resolvedCooperativeId = String(cooperative)
    if (resolvedCooperativeId.startsWith('preset_')) {
        try {
            const { PRESET_REGISTERED_COOPS } = await import('@/lib/copteller/coop-form-specs')
            const preset = PRESET_REGISTERED_COOPS.find((p) => p.id === resolvedCooperativeId)
            if (preset) {
                const existing = await payload.find({
                    collection: 'cooperatives',
                    where: { name: { equals: preset.name } },
                    limit: 1,
                    overrideAccess: true,
                })
                if (existing.docs.length > 0) {
                    resolvedCooperativeId = String(existing.docs[0].id)
                } else {
                    const createdCoop = await payload.create({
                        collection: 'cooperatives',
                        data: {
                            name: preset.name,
                            description: preset.description,
                            union_leader: memberId,
                            cooperative_type: (preset.cooperativeType as any) || 'multipurpose',
                            sector: (preset.sector as any) || 'transport',
                            segment: preset.segment,
                            registration_number: preset.regNumber,
                            state: preset.state,
                            lga: preset.lga,
                            status: 'active',
                            cycleFrequency: preset.cycleFrequency || 'weekly',
                            defaultContributionAmount: (preset.defaultContributionNaira || 10000) * 100,
                            metadata: { memberFormSpec: preset.memberFormSpec },
                        },
                        overrideAccess: true,
                    })
                    resolvedCooperativeId = String(createdCoop.id)
                }
            }
        } catch (err) {
            console.warn('[POST /api/copteller/memberships] Could not auto-provision preset cooperative:', err)
        }
    }

    try {
        const membership = await createMembership({
            membership_number: membershipNumber,
            member: memberId,
            cooperative: resolvedCooperativeId,
            role: (auth.role === 'member' ? 'member' : role) ?? 'member',
            // Members self-apply → pending; admins adding → active
            status: auth.role === 'member' ? 'pending' : 'active',
            joined_date: new Date().toISOString(),
            total_contributed: 0,
            outstanding_balance: 0,
            credit_score: 50,
            shares_owned: 0,
        })

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: 'member.joined_coop',
            entity_type: 'membership',
            entity_id: String(membership.id),
            after_state: { membership, submittedMetadata: body.metadata || null },
            cooperative: resolvedCooperativeId,
        })

        // Auto-create Copteller Profile for the newly registered member (so they can log in next time)
        if (auth.role === 'member') {
            try {
                const { getProfilesForUser } = require('@/lib/copteller/auth')
                const existingProfiles = await getProfilesForUser(auth.userId)
                const hasMemberProfile = existingProfiles.some((p: any) => p.role === 'member')
                
                if (!hasMemberProfile) {
                    const coop = await payload.findByID({
                        collection: 'cooperatives',
                        id: resolvedCooperativeId,
                        overrideAccess: true,
                    })
                    
                    await createProfileForUser(auth.userId, 'member', {
                        display_name: auth.displayName,
                        cooperative_id: resolvedCooperativeId,
                        cooperative_name: coop?.name || null,
                        onboarding_done: true
                    })
                }
            } catch (err) {
                console.error('[Membership Auto-Profile Registration Failed]', err)
            }
        }

        return NextResponse.json({ data: membership }, { status: 201 })
    } catch (err) {
        console.error('[POST /api/copteller/memberships]', err)
        return NextResponse.json({ error: 'Failed to create membership.' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/memberships
 * Update a membership: approve, suspend, assign role, update financial data.
 * Coop admins and superadmin only.
 */
export async function PATCH(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['coop_admin', 'superadmin'])
    if (auth instanceof NextResponse) return auth

    let body: Record<string, any>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { id, action, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Membership id is required.' }, { status: 400 })

    let patchData: Record<string, any> = { ...updates }
    let auditAction = 'member.joined_coop'

    if (action === 'approve') {
        patchData = { status: 'active' }
        auditAction = 'member.joined_coop'
    } else if (action === 'suspend') {
        patchData = { status: 'suspended' }
        auditAction = 'member.exited_coop'
    } else if (action === 'reinstate') {
        patchData = { status: 'active' }
        auditAction = 'member.joined_coop'
    } else if (action === 'exit') {
        patchData = { status: 'exited', exit_date: new Date().toISOString() }
        auditAction = 'member.exited_coop'
    }

    try {
        const updated = await updateMembership(id, patchData)

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: auditAction,
            entity_type: 'membership',
            entity_id: String(id),
            after_state: updated,
        })

        return NextResponse.json({ data: updated })
    } catch (err) {
        console.error('[PATCH /api/copteller/memberships]', err)
        return NextResponse.json({ error: 'Failed to update membership.' }, { status: 500 })
    }
}
