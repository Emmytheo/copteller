import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole, getCoptellerAuth } from '@/lib/copteller/auth'
import { getSchemes, getSchemeById, createScheme, updateScheme, writeAuditLog } from '@/lib/copteller/db'

/**
 * GET /api/copteller/schemes
 * List schemes. Filterable by cooperativeId, scheme_type, status, bank_approved.
 * - Members/investors: can see active + bank-approved schemes only
 * - Coop admins: can see all schemes for their cooperative
 * - Superadmin: can see all schemes
 */
export async function GET(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = req.nextUrl
    const cooperativeId = searchParams.get('cooperativeId') ?? undefined
    const scheme_type = searchParams.get('scheme_type') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const bank_approved_raw = searchParams.get('bank_approved')
    const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 100)
    const page = Number(searchParams.get('page') ?? '1')

    let bank_approved: boolean | undefined = undefined

    // Non-admin users can only see bank-approved schemes
    if (auth.role === 'member' || auth.role === 'investor') {
        bank_approved = true
    } else if (bank_approved_raw !== null) {
        bank_approved = bank_approved_raw === 'true'
    }

    // Coop admins are scoped to their own cooperative unless a specific one is requested
    const effectiveCoopId =
        auth.role === 'coop_admin' && !cooperativeId
            ? auth.cooperativeId
            : cooperativeId

    try {
        const result = await getSchemes({
            cooperativeId: effectiveCoopId,
            scheme_type,
            status,
            bank_approved,
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
        console.error('[GET /api/copteller/schemes]', err)
        return NextResponse.json({ error: 'Failed to retrieve schemes.' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/schemes
 * Create a new scheme. Coop admins can create schemes for their cooperative.
 * New schemes start in 'draft' status and require bank superadmin approval.
 */
export async function POST(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['coop_admin', 'superadmin'])
    if (auth instanceof NextResponse) return auth

    let body: Record<string, any>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { name, cooperative, product_type, scheme_type, contribution_amount,
        target_capital, repayment_frequency, duration_months, start_date,
        end_date, max_participants, description } = body

    if (!name || !scheme_type) {
        return NextResponse.json({ error: 'name and scheme_type are required.' }, { status: 400 })
    }

    // Coop admins can only create for their cooperative
    const effectiveCoopId =
        auth.role === 'coop_admin' ? auth.cooperativeId : (cooperative ?? auth.cooperativeId)

    if (!effectiveCoopId) {
        return NextResponse.json({ error: 'cooperativeId is required.' }, { status: 400 })
    }

    try {
        const scheme = await createScheme({
            name,
            description,
            cooperative: effectiveCoopId,
            product_type: product_type ?? undefined,
            scheme_type,
            status: 'draft',
            bank_approved: false,
            target_capital: Number(target_capital ?? 0),
            funded_capital: 0,
            contribution_amount: Number(contribution_amount ?? 0),
            yield_rate: Number(body.yield_rate ?? 0),
            repayment_frequency: repayment_frequency ?? 'weekly',
            duration_months: duration_months ? Number(duration_months) : undefined,
            start_date,
            end_date,
            max_participants: max_participants ? Number(max_participants) : undefined,
            enrolled_count: 0,
            current_payout_slot: 0,
            profit_sharing_percentage: Number(body.profit_sharing_percentage ?? 80),
        })

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: 'scheme.created',
            entity_type: 'scheme',
            entity_id: String(scheme.id),
            after_state: scheme,
            cooperative: effectiveCoopId,
        })

        return NextResponse.json({ data: scheme }, { status: 201 })
    } catch (err) {
        console.error('[POST /api/copteller/schemes]', err)
        return NextResponse.json({ error: 'Failed to create scheme.' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/schemes
 * Update or approve a scheme, or fund it.
 * - Coop admins: can update draft schemes for their cooperative
 * - Superadmin: can approve/reject any scheme (sets bank_approved and status)
 * - Investors: can allocate capital to increase funded_capital
 */
export async function PATCH(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['coop_admin', 'superadmin', 'investor'])
    if (auth instanceof NextResponse) return auth

    let body: Record<string, any>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Scheme id is required.' }, { status: 400 })

    try {
        const before = await getSchemeById(id) as any
        if (!before) {
            return NextResponse.json({ error: 'Scheme not found.' }, { status: 404 })
        }

        // Role-based mutating constraints
        if (auth.role === 'investor') {
            // Investors can only update funded_capital
            const keys = Object.keys(updates)
            if (keys.length > 2 || (keys.length === 2 && !keys.includes('status')) || !keys.includes('funded_capital')) {
                return NextResponse.json({ error: 'Investors can only update funded_capital and status.' }, { status: 403 })
            }
        } else {
            // Only superadmin can set bank_approved
            if (updates.bank_approved !== undefined && auth.role !== 'superadmin') {
                return NextResponse.json({ error: 'Only superadmin can approve schemes.' }, { status: 403 })
            }
        }

        const after = await updateScheme(id, updates)

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: auth.role === 'investor' ? 'investor.capital_allocated' : (updates.bank_approved ? 'scheme.approved' : 'scheme.updated'),
            entity_type: 'scheme',
            entity_id: String(id),
            before_state: before,
            after_state: after,
            amount_kobo: auth.role === 'investor' ? Number(updates.funded_capital) - Number(before.funded_capital ?? 0) : undefined,
        })

        return NextResponse.json({ data: after })
    } catch (err) {
        console.error('[PATCH /api/copteller/schemes]', err)
        return NextResponse.json({ error: 'Failed to update scheme.' }, { status: 500 })
    }
}
