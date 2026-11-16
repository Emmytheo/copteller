import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole, getCoptellerAuth } from '@/lib/copteller/auth'
import { getContracts, getContractById, createContract, updateContract, writeAuditLog } from '@/lib/copteller/db'

/**
 * GET /api/copteller/contracts
 * List contracts. Role-scoped:
 * - Members: only their own contracts
 * - Coop admins: all contracts for their cooperative
 * - Superadmin: all contracts (filterable)
 */
export async function GET(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = req.nextUrl
    const contract_type = searchParams.get('contract_type') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const cooperativeId = searchParams.get('cooperativeId') ?? undefined
    const schemeId = searchParams.get('schemeId') ?? undefined
    const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 100)
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
                    where: {
                        or: [
                            { supabase_id: { equals: auth.userId } },
                            ...(auth.email ? [{ email: { equals: auth.email.toLowerCase().trim() } }] : [])
                        ]
                    },
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
        const result = await getContracts({
            memberId,
            cooperativeId: effectiveCoopId,
            schemeId,
            contract_type,
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
        console.error('[GET /api/copteller/contracts]', err)
        return NextResponse.json({ error: 'Failed to retrieve contracts.' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/contracts
 * Create a new contract (enroll in Ajo, create HP agreement, etc.).
 * Members can self-enroll; Coop admins & superadmin can create for any member.
 */
export async function POST(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['member', 'coop_admin', 'superadmin'])
    if (auth instanceof NextResponse) return auth

    let body: Record<string, any>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const payload = await getDb()
    let member = body.member

    // If member role, ensure they are enrolling themselves
    if (auth.role === 'member') {
        const customerRes = await payload.find({
            collection: 'customers',
            where: {
                or: [
                    { supabase_id: { equals: auth.userId } },
                    ...(auth.email ? [{ email: { equals: auth.email.toLowerCase().trim() } }] : [])
                ]
            },
            limit: 1,
            overrideAccess: true
        })
        if (customerRes.docs.length === 0) {
            return NextResponse.json({ error: 'Please complete your cooperative profile before enrolling.' }, { status: 400 })
        }
        member = String(customerRes.docs[0].id)
    }

    const {
        cooperative, scheme, contract_type,
        due_amount, repayment_frequency, total_obligation,
        start_date, end_date, asset_name, asset_identifier,
        asset_value, notes, metadata
    } = body

    if (!member || !cooperative || !scheme || !contract_type || !start_date) {
        return NextResponse.json({
            error: 'member, cooperative, scheme, contract_type, and start_date are required.'
        }, { status: 400 })
    }

    if (auth.role === 'coop_admin' && cooperative !== auth.cooperativeId) {
        return NextResponse.json({
            error: 'You can only create contracts for your own cooperative.'
        }, { status: 403 })
    }

    // Auto-calculate slot number if enrolling in Ajo rotation
    let calculatedSlot = body.ajo_slot_number
    if (!calculatedSlot && contract_type === 'ajo_enrollment') {
        const existingCount = await payload.count({
            collection: 'copteller-contracts',
            where: {
                scheme: { equals: scheme },
                contract_type: { equals: 'ajo_enrollment' }
            },
            overrideAccess: true,
        })
        calculatedSlot = (existingCount.totalDocs || 0) + 1
    }

    try {
        const contract = await createContract({
            member,
            cooperative,
            scheme,
            contract_type,
            status: 'active',
            due_amount: Number(due_amount ?? 0),
            repayment_frequency: repayment_frequency ?? 'weekly',
            total_paid: 0,
            total_obligation: Number(total_obligation ?? 0),
            missed_payments: 0,
            payment_streak: 0,
            start_date,
            end_date,
            asset_name,
            asset_identifier,
            asset_value: asset_value ? Number(asset_value) : undefined,
            ajo_slot_number: calculatedSlot ? Number(calculatedSlot) : undefined,
            notes,
            metadata: metadata || {}
        })

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: 'contract.created',
            entity_type: 'contract',
            entity_id: String(contract.id),
            after_state: contract,
            cooperative,
            amount_kobo: Number(total_obligation ?? 0),
        })

        return NextResponse.json({ data: contract }, { status: 201 })
    } catch (err) {
        console.error('[POST /api/copteller/contracts]', err)
        return NextResponse.json({ error: 'Failed to create contract.' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/contracts
 * Update a contract. Supports:
 * - Recording a payment (debits wallet, creates ledger transaction, updates contract & membership stats)
 * - Marking defaulted, completing, cancelling (admin only)
 */
export async function PATCH(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['member', 'coop_admin', 'superadmin'])
    if (auth instanceof NextResponse) return auth

    let body: Record<string, any>
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { id, action, payment_amount, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Contract id is required.' }, { status: 400 })

    const payload = await getDb()

    try {
        const existing = await getContractById(id) as any
        if (!existing) {
            return NextResponse.json({ error: 'Contract not found.' }, { status: 404 })
        }

        // Authorization: Members can ONLY record payments on their own contracts
        if (auth.role === 'member') {
            if (action !== 'record_payment') {
                return NextResponse.json({ error: 'Members can only record payments.' }, { status: 403 })
            }

            const existingMemberId = typeof existing.member === 'object' ? existing.member?.id : existing.member
            const custRes = await payload.find({
                collection: 'customers',
                where: {
                    or: [
                        { supabase_id: { equals: auth.userId } },
                        ...(auth.email ? [{ email: { equals: auth.email.toLowerCase().trim() } }] : [])
                    ]
                },
                limit: 1,
                overrideAccess: true,
            })
            const currentCustId = custRes.docs[0]?.id
            if (!currentCustId || String(existingMemberId) !== String(currentCustId)) {
                return NextResponse.json({ error: 'You are only authorized to pay for your own contract.' }, { status: 403 })
            }
        }

        let patchData: Record<string, any> = { ...updates }
        let auditAction = 'contract.updated'
        let updatedWalletBalance = 0

        // Handle semantic actions
        if (action === 'record_payment') {
            const amountKobo = Number(payment_amount ?? 0)
            if (amountKobo <= 0) {
                return NextResponse.json({ error: 'payment_amount must be greater than zero.' }, { status: 400 })
            }

            // 1. Debit member's active wallet
            const custRes = await payload.find({
                collection: 'customers',
                where: {
                    or: [
                        { supabase_id: { equals: auth.userId } },
                        ...(auth.email ? [{ email: { equals: auth.email.toLowerCase().trim() } }] : [])
                    ]
                },
                limit: 1,
                overrideAccess: true,
            })
            const customerId = custRes.docs[0]?.id

            const accRes = await payload.find({
                collection: 'accounts',
                where: {
                    or: [
                        { user_id: { equals: auth.userId } },
                        ...(customerId ? [{ customer: { equals: customerId } }] : [])
                    ],
                    status: { equals: 'active' },
                },
                limit: 1,
                overrideAccess: true,
            })

            const account = accRes.docs[0]
            if (!account) {
                return NextResponse.json({ error: 'Active wallet not found. Please fund your account.' }, { status: 400 })
            }

            if (Number(account.balance || 0) < amountKobo) {
                return NextResponse.json({
                    error: `Insufficient wallet balance. Available: ₦${((account.balance || 0) / 100).toLocaleString()}, Required: ₦${(amountKobo / 100).toLocaleString()}`
                }, { status: 400 })
            }

            const newBalanceKobo = Number(account.balance || 0) - amountKobo
            await payload.update({
                collection: 'accounts',
                id: account.id,
                data: {
                    balance: newBalanceKobo,
                    last_transaction_at: new Date().toISOString(),
                },
                overrideAccess: true,
            })
            updatedWalletBalance = newBalanceKobo / 100

            // 2. Create ledger transaction log
            const schemeName = existing.scheme?.name || 'Ajo Cycle'
            const refTx = `TX_AJO_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`
            const createdTx = await payload.create({
                collection: 'transactions',
                data: {
                    reference: refTx,
                    type: 'debit',
                    amount: amountKobo,
                    from_account: account.id,
                    status: 'successful',
                    narration: `Ajo Contribution: ${schemeName} (Slot ${existing.ajo_slot_number || 1})`,
                    user_id: auth.userId,
                    customer: customerId,
                    balance_after: newBalanceKobo,
                },
                overrideAccess: true,
            })

            // 3. Update contract numbers
            patchData = {
                total_paid: Number(existing.total_paid ?? 0) + amountKobo,
                payment_streak: Number(existing.payment_streak ?? 0) + 1,
                missed_payments: Math.max(0, Number(existing.missed_payments ?? 0) - 1),
                status: 'active',
            }

            // 4. Update member's cooperative membership stats
            if (customerId) {
                try {
                    const coopId = typeof existing.cooperative === 'object' ? existing.cooperative?.id : existing.cooperative
                    const memRes = await payload.find({
                        collection: 'copteller-memberships',
                        where: {
                            member: { equals: customerId },
                            ...(coopId ? { cooperative: { equals: coopId } } : {})
                        },
                        limit: 1,
                        overrideAccess: true,
                    })
                    if (memRes.docs.length > 0) {
                        const mem = memRes.docs[0]
                        await payload.update({
                            collection: 'copteller-memberships',
                            id: mem.id,
                            data: {
                                total_contributed: Number(mem.total_contributed || 0) + amountKobo,
                            },
                            overrideAccess: true,
                        })
                    }
                } catch (e) {
                    console.warn('[Contract Payment] Membership stat update error:', e)
                }
            }

            auditAction = existing.contract_type === 'hire_purchase'
                ? 'payment.hp_repayment'
                : 'payment.contribution'
        } else if (action === 'mark_defaulted') {
            if (auth.role === 'member') return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
            patchData = {
                missed_payments: Number(existing.missed_payments ?? 0) + 1,
                payment_streak: 0,
                status: (Number(existing.missed_payments ?? 0) + 1 >= 3) ? 'defaulted' : 'active',
            }
            auditAction = 'contract.defaulted'
        } else if (action === 'complete') {
            if (auth.role === 'member') return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
            patchData = { status: 'completed' }
            auditAction = 'contract.completed'
        } else if (action === 'cancel') {
            if (auth.role === 'member') return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
            patchData = { status: 'cancelled' }
            auditAction = 'contract.cancelled'
        }

        const updated = await updateContract(id, patchData)

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: auditAction,
            entity_type: 'contract',
            entity_id: String(id),
            before_state: existing,
            after_state: updated,
            amount_kobo: payment_amount ? Number(payment_amount) : undefined,
        })

        return NextResponse.json({
            data: updated,
            balance: updatedWalletBalance,
        })
    } catch (err: any) {
        console.error('[PATCH /api/copteller/contracts]', err)
        return NextResponse.json({ error: err.message || 'Failed to update contract.' }, { status: 500 })
    }
}
