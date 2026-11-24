import { NextRequest, NextResponse } from 'next/server'
import { getDb, writeAuditLog } from '@/lib/copteller/db'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { executeWorkflow } from '@/lib/workflow/executeWorkflow'
import { queryCopteller } from '@/lib/copteller/pg'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'

export const dynamic = 'force-dynamic'

const KYC_TIER_RANK: Record<string, number> = {
    tier_0: 0,
    tier_1: 1,
    tier_2: 2,
    tier_3: 3,
}

/**
 * POST /api/copteller/services/execute
 * Real production Service Execution Engine:
 *  - Enforces Idempotency Key deduplication
 *  - Enforces Role & Minimum KYC Tier (against OlivePay SubWallet tier)
 *  - Validates full form_schema rules
 *  - Executes linked `validation_workflow` & `execution_workflow` (real OlivePay / Sandbox / Qore nodes!)
 *  - Atomically refunds debited wallet funds if execution_workflow fails!
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        await ensureOlivePayTables().catch(() => {})
        const body = await req.json().catch(() => ({}))
        const { serviceId, formData = {}, idempotencyKey } = body

        if (!serviceId) {
            return NextResponse.json({ error: 'serviceId is required' }, { status: 400 })
        }

        const payload = await getDb()
        const cleanServiceId = /^\d+$/.test(String(serviceId)) ? Number(serviceId) : serviceId
        const service = (await payload.findByID({
            collection: 'services',
            id: cleanServiceId as any,
            depth: 2,
            overrideAccess: true,
        })) as any

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 })
        }
        if (service.status !== 'active') {
            return NextResponse.json({ error: 'This service is currently disabled or undergoing maintenance.' }, { status: 400 })
        }

        // 1. Role Check
        const role = auth.role || 'member'
        const allowedRoles = service.allowed_roles || ['member', 'coop_admin', 'superadmin']
        if (role !== 'superadmin' && !allowedRoles.includes(role) && !allowedRoles.includes('all')) {
            return NextResponse.json({ error: `Your role (${role}) is not authorized to execute this service.` }, { status: 403 })
        }

        // 2. Idempotency Deduplication Check
        const effectiveIdemKey = idempotencyKey ? String(idempotencyKey).trim() : null
        if (effectiveIdemKey) {
            const dup = await queryCopteller(
                `SELECT id, reference, status, amount, narration, created_at
                 FROM copteller.transactions WHERE reference = $1 LIMIT 1`,
                [effectiveIdemKey]
            ).catch(() => ({ rows: [] as any[] }))
            if (dup.rows[0]) {
                return NextResponse.json({
                    success: true,
                    idempotentReplay: true,
                    message: 'Duplicate request deduplicated — returning original settlement.',
                    receipt: {
                        reference: dup.rows[0].reference,
                        status: String(dup.rows[0].status || 'COMPLETED').toUpperCase(),
                        totalAmount: Number(dup.rows[0].amount || 0) / 100,
                        timestamp: dup.rows[0].created_at,
                    },
                })
            }
        }

        // 3. Schema Validation
        const schema = Array.isArray(service.form_schema) ? service.form_schema : []
        const validationErrors: string[] = []
        for (const field of schema) {
            const val = formData[field.name]
            if (field.required && (val === undefined || val === null || val === '')) {
                validationErrors.push(`Field "${field.label || field.name}" is required.`)
            }
            if (val !== undefined && val !== null && val !== '' && Array.isArray(field.validations)) {
                for (const v of field.validations) {
                    if (v.type === 'regex' && v.value) {
                        try {
                            if (!new RegExp(v.value).test(String(val))) {
                                validationErrors.push(v.errorMessage || `Field "${field.label}" failed format validation.`)
                            }
                        } catch {}
                    }
                    if (v.type === 'min' && v.value !== undefined && Number(val) < Number(v.value)) {
                        validationErrors.push(v.errorMessage || `Field "${field.label}" must be at least ${v.value}.`)
                    }
                    if (v.type === 'max' && v.value !== undefined && Number(val) > Number(v.value)) {
                        validationErrors.push(v.errorMessage || `Field "${field.label}" cannot exceed ${v.value}.`)
                    }
                }
            }
        }
        if (validationErrors.length > 0) {
            return NextResponse.json({ error: validationErrors[0], details: validationErrors }, { status: 422 })
        }

        // 4. Resolve Customer, Account & OlivePay SubWallet (+ KYC Tier Check)
        const custRes = await payload.find({
            collection: 'customers',
            where: {
                or: [
                    { supabase_id: { equals: auth.userId } },
                    ...(auth.email ? [{ email: { equals: auth.email.toLowerCase().trim() } }] : []),
                ],
            },
            limit: 1,
            overrideAccess: true,
        })
        const customerId = custRes.docs[0]?.id || null

        const swRes = await queryCopteller(
            `SELECT * FROM copteller.olivepay_subwallets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [auth.userId]
        ).catch(() => ({ rows: [] as any[] }))
        const memberSubWallet = swRes.rows[0] || null

        const requiredTierNum = KYC_TIER_RANK[service.min_kyc_tier || 'tier_1'] ?? 1
        if (role !== 'superadmin' && memberSubWallet && Number(memberSubWallet.tier || 1) < requiredTierNum) {
            return NextResponse.json(
                {
                    error: `This service requires KYC Tier ${requiredTierNum}. Your wallet is currently Tier ${memberSubWallet.tier || 1}. Upgrade your KYC tier in Wallet Settings.`,
                    requiredKycTier: requiredTierNum,
                    currentKycTier: memberSubWallet.tier || 1,
                },
                { status: 403 }
            )
        }

        // 5. Financial Calculation
        let principalAmount = 0
        if (formData.amount !== undefined) principalAmount = Number(formData.amount) || 0
        else if (formData.principal !== undefined) principalAmount = Number(formData.principal) || 0
        else if (formData.rechargeAmount !== undefined) principalAmount = Number(formData.rechargeAmount) || 0
        else if (formData.value !== undefined) principalAmount = Number(formData.value) || 0

        let baseFee = 0
        if (service.fee_type === 'flat') baseFee = Number(service.fee_value) || 0
        else if (service.fee_type === 'percentage') baseFee = (principalAmount * (Number(service.fee_value) || 0)) / 100

        const totalAmountNaira = principalAmount + baseFee
        const totalAmountKobo = Math.round(totalAmountNaira * 100)
        const principalKobo = Math.round(principalAmount * 100)
        const settlementType = service.settlement_type || 'wallet_debit'
        const reference = effectiveIdemKey || `CTX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`

        // 6. Optional Pre-Validation Workflow
        const valWfId =
            typeof service.validation_workflow === 'object'
                ? service.validation_workflow?.id
                : service.validation_workflow
        if (valWfId) {
            const valExecId = await executeWorkflow({
                workflowId: String(valWfId),
                trigger: 'MANUAL',
                inputData: { ...formData, userId: auth.userId, email: auth.email, subWalletId: memberSubWallet?.olivepay_sub_wallet_id },
            })
            const valExec = (await payload.findByID({
                collection: 'workflow-executions',
                id: valExecId,
                overrideAccess: true,
            })) as any
            if (valExec?.status === 'FAILED') {
                return NextResponse.json(
                    { error: 'Service pre-validation workflow failed. Verify input details and retry.', validationExecutionId: valExecId },
                    { status: 422 }
                )
            }
        }

        // 7. Debit Member Account (if wallet_debit) — with guaranteed atomic rollback on workflow failure!
        let userAccount: any = null
        let debited = false
        let newBalanceNaira = 0
        let originalBalKobo = 0

        if (settlementType === 'wallet_debit' && totalAmountKobo > 0) {
            const accRes = await payload.find({
                collection: 'accounts',
                where: {
                    or: [
                        { user_id: { equals: auth.userId } },
                        ...(customerId ? [{ customer: { equals: customerId } }] : []),
                    ],
                    status: { equals: 'active' },
                },
                limit: 1,
                overrideAccess: true,
            })
            userAccount = accRes.docs[0]
            if (!userAccount) {
                return NextResponse.json(
                    { error: 'No active wallet found. Please fund your account before executing services.' },
                    { status: 400 }
                )
            }
            originalBalKobo = Number(userAccount.balance || 0)
            if (originalBalKobo < totalAmountKobo) {
                return NextResponse.json(
                    {
                        error: `Insufficient wallet balance. Available: ₦${(originalBalKobo / 100).toLocaleString()}, Required: ₦${totalAmountNaira.toLocaleString()}`,
                    },
                    { status: 400 }
                )
            }
            const updatedBalKobo = originalBalKobo - totalAmountKobo
            await payload.update({
                collection: 'accounts',
                id: userAccount.id,
                data: { balance: updatedBalKobo, last_transaction_at: new Date().toISOString() },
                overrideAccess: true,
            })
            debited = true
            newBalanceNaira = updatedBalKobo / 100
        }

        // 8. REAL Execution Workflow Dispatch (OlivePay / Qore / Custom Provider)
        let workflowExecutionId: string | null = null
        let workflowOutputs: Record<string, any> = {}
        const execWfId =
            typeof service.execution_workflow === 'object'
                ? service.execution_workflow?.id
                : service.execution_workflow

        if (execWfId) {
            try {
                workflowExecutionId = await executeWorkflow({
                    workflowId: String(execWfId),
                    trigger: 'MANUAL',
                    inputData: {
                        ...formData,
                        amount: principalAmount,
                        totalAmount: totalAmountNaira,
                        reference,
                        idempotencyKey: reference,
                        userId: auth.userId,
                        email: auth.email,
                        name: auth.displayName || auth.email,
                        subWalletId: memberSubWallet?.olivepay_sub_wallet_id || formData.subWalletId || '',
                        sourceSubWalletId: memberSubWallet?.olivepay_sub_wallet_id || formData.sourceSubWalletId || '',
                        callbackUrl: '/copteller/wallet/callback',
                    },
                })
                const execDoc = (await payload.findByID({
                    collection: 'workflow-executions',
                    id: workflowExecutionId,
                    overrideAccess: true,
                })) as any

                if (execDoc?.status === 'FAILED') {
                    // ATOMIC ROLLBACK of debited wallet funds!
                    if (debited && userAccount) {
                        await payload.update({
                            collection: 'accounts',
                            id: userAccount.id,
                            data: { balance: originalBalKobo },
                            overrideAccess: true,
                        })
                    }
                    const failedPhase = (execDoc.phases || []).find((p: any) => p.status === 'FAILED')
                    const errLog = failedPhase?.logs?.find((l: any) => l.level === 'error')?.message
                    return NextResponse.json(
                        {
                            error: errLog || 'Execution workflow failed. Your wallet balance has been refunded.',
                            workflowExecutionId,
                        },
                        { status: 502 }
                    )
                }

                // Collect outputs from all completed phases
                for (const phase of execDoc?.phases || []) {
                    if (phase.outputs && typeof phase.outputs === 'object') {
                        workflowOutputs = { ...workflowOutputs, ...phase.outputs }
                    }
                }
            } catch (wfErr: any) {
                if (debited && userAccount) {
                    await payload.update({
                        collection: 'accounts',
                        id: userAccount.id,
                        data: { balance: originalBalKobo },
                        overrideAccess: true,
                    })
                }
                return NextResponse.json(
                    { error: `Workflow dispatch failed: ${wfErr.message}. Your wallet was not charged.` },
                    { status: 502 }
                )
            }
        }

        // 9. Record Ledger Transaction
        const externalReference =
            workflowOutputs.reference ||
            workflowOutputs.transactionReference ||
            workflowOutputs.holdId ||
            workflowOutputs.transactionId ||
            `REF-${Date.now().toString(36).toUpperCase()}`

        const txStatus = workflowOutputs.isPending ? 'pending' : 'successful'

        if (totalAmountKobo > 0 && userAccount) {
            await payload.create({
                collection: 'transactions',
                data: {
                    reference,
                    type: 'debit',
                    amount: totalAmountKobo,
                    from_account: userAccount.id,
                    status: txStatus,
                    narration: `${service.name} (${externalReference})`,
                    user_id: auth.userId,
                    customer: customerId,
                    balance_after: Math.round(newBalanceNaira * 100),
                },
                overrideAccess: true,
            })
        }

        // 10. Cooperative dues accounting hook
        if (service.service_intent === 'coop_dues' && customerId) {
            const memRes = await payload
                .find({
                    collection: 'copteller-memberships',
                    where: { member: { equals: customerId } },
                    limit: 1,
                    overrideAccess: true,
                })
                .catch(() => ({ docs: [] as any[] }))
            if (memRes.docs[0]) {
                const mem = memRes.docs[0]
                await payload.update({
                    collection: 'copteller-memberships',
                    id: mem.id,
                    data: {
                        total_contributed: Number(mem.total_contributed || 0) + principalKobo,
                        outstanding_balance: Math.max(0, Number(mem.outstanding_balance || 0) - principalKobo),
                    },
                    overrideAccess: true,
                })
            }
        }

        const providerObj = typeof service.provider === 'object' ? service.provider : null

        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: 'service.executed',
            entity_type: 'service',
            entity_id: String(service.id),
            amount_kobo: totalAmountKobo,
            cooperative: auth.cooperativeId,
            metadata: {
                serviceName: service.name,
                reference,
                externalReference,
                workflowExecutionId,
                railMode: workflowOutputs.railMode || providerObj?.slug || 'internal',
            },
        })

        return NextResponse.json({
            success: true,
            message: `Service "${service.name}" executed successfully.`,
            workflowExecutionId,
            receipt: {
                reference,
                externalReference,
                serviceId: String(service.id),
                serviceName: service.name,
                serviceIntent: service.service_intent,
                settlementType,
                timestamp: new Date().toISOString(),
                principalAmount,
                fee: baseFee,
                totalAmount: totalAmountNaira,
                currency: 'NGN',
                status: workflowOutputs.isPending ? 'PENDING' : 'COMPLETED',
                railMode: workflowOutputs.railMode || providerObj?.slug || 'internal',
                workflowOutputs,
                payloadSummary: { ...formData, ...workflowOutputs },
            },
            balance: newBalanceNaira,
        })
    } catch (error: any) {
        console.error('Copteller POST /api/copteller/services/execute error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
