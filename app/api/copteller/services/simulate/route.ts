import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/copteller/db'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { resolveActiveOlivePayRailMode } from '@/lib/copteller/olivepay-client'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const { serviceId, formData = {}, simulatedRole, mockEnvironment = 'sandbox' } = body

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

        const traceSteps: Array<{
            id: string
            name: string
            status: 'SUCCESS' | 'WARNING' | 'FAILED'
            durationMs: number
            details: any
        }> = []

        // 1. Schema Validation
        const t0 = Date.now()
        const schema = Array.isArray(service.form_schema) ? service.form_schema : []
        const validationIssues: string[] = []
        for (const field of schema) {
            const val = formData[field.name]
            if (field.required && (val === undefined || val === null || val === '')) {
                validationIssues.push(`Missing required field: ${field.label || field.name}`)
            }
            if (val !== undefined && val !== null && val !== '' && Array.isArray(field.validations)) {
                for (const v of field.validations) {
                    if (v.type === 'regex' && v.value) {
                        try {
                            if (!new RegExp(v.value).test(String(val))) {
                                validationIssues.push(v.errorMessage || `Field "${field.label}" failed regex (${v.value}).`)
                            }
                        } catch {}
                    }
                    if (v.type === 'min' && v.value !== undefined && Number(val) < Number(v.value)) {
                        validationIssues.push(v.errorMessage || `Field "${field.label}" must be at least ${v.value}.`)
                    }
                    if (v.type === 'max' && v.value !== undefined && Number(val) > Number(v.value)) {
                        validationIssues.push(v.errorMessage || `Field "${field.label}" cannot exceed ${v.value}.`)
                    }
                }
            }
        }
        traceSteps.push({
            id: 'step_schema_validation',
            name: 'Form Schema & Input Validation',
            status: validationIssues.length === 0 ? 'SUCCESS' : 'FAILED',
            durationMs: Math.max(1, Date.now() - t0),
            details: { fieldsEvaluated: schema.length, providedInputs: Object.keys(formData).length, errors: validationIssues },
        })

        // 2. Real Persona Permission Check (FIX: respects simulatedRole from Simulator UI!)
        const t1 = Date.now()
        const effectiveRole = String(simulatedRole || auth.role || 'member')
        const allowedRoles: string[] = service.allowed_roles || ['member', 'coop_admin', 'superadmin']
        const rolePermitted =
            effectiveRole === 'superadmin' || allowedRoles.includes(effectiveRole) || allowedRoles.includes('all')

        traceSteps.push({
            id: 'step_access_evaluation',
            name: 'Multi-Role & Sector Permission Matrix',
            status: rolePermitted ? 'SUCCESS' : 'FAILED',
            durationMs: Math.max(1, Date.now() - t1),
            details: {
                simulatedRole: effectiveRole,
                allowedRoles,
                permitted: rolePermitted,
                minKycTier: service.min_kyc_tier || 'tier_1',
                sectorTags: service.sector_tags || ['all'],
            },
        })

        // 3. Pricing & Fee Engine
        const t2 = Date.now()
        const principalAmount = Number(formData.amount ?? formData.principal ?? formData.rechargeAmount ?? formData.value ?? 0) || 0
        const baseFee =
            service.fee_type === 'flat'
                ? Number(service.fee_value) || 0
                : service.fee_type === 'percentage'
                    ? (principalAmount * (Number(service.fee_value) || 0)) / 100
                    : 0
        const totalAmount = principalAmount + baseFee

        traceSteps.push({
            id: 'step_fee_calculation',
            name: 'Pricing & Fee Engine Calculation',
            status: 'SUCCESS',
            durationMs: Math.max(1, Date.now() - t2),
            details: { feeType: service.fee_type, feeValue: service.fee_value, principalAmount, calculatedFee: baseFee, simulatedTotalDebit: totalAmount, currency: 'NGN' },
        })

        // 4. Real Provider & Workflow Binding Verification
        const t3 = Date.now()
        const activeRailMode = await resolveActiveOlivePayRailMode()
        const execWf = typeof service.execution_workflow === 'object' ? service.execution_workflow : null
        const valWf = typeof service.validation_workflow === 'object' ? service.validation_workflow : null
        const provider = typeof service.provider === 'object' ? service.provider : null
        const workflowReady = !execWf || execWf.status === 'PUBLISHED'

        traceSteps.push({
            id: 'step_workflow_dispatch',
            name: 'Workflow & Clearing Rail Readiness',
            status: workflowReady ? (execWf ? 'SUCCESS' : 'WARNING') : 'FAILED',
            durationMs: Math.max(1, Date.now() - t3),
            details: {
                environment: mockEnvironment,
                activeRailMode,
                provider: provider ? { id: provider.id, name: provider.name, slug: provider.slug, isActive: provider.isActive } : null,
                validationWorkflow: valWf ? { id: valWf.id, name: valWf.name, status: valWf.status } : null,
                executionWorkflow: execWf
                    ? { id: execWf.id, name: execWf.name, status: execWf.status, phases: execWf.executionPlan?.length || 0 }
                    : 'NONE (Direct Ledger Settlement)',
                warning: !execWf ? 'No execution_workflow bound — service will settle locally without external rail dispatch.' : undefined,
            },
        })

        const overallOk = validationIssues.length === 0 && rolePermitted && workflowReady
        const simulatedReceipt = {
            simulatedReference: `SIM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
            isDryRun: true,
            serviceName: service.name,
            serviceIntent: service.service_intent,
            settlementType: service.settlement_type || 'wallet_debit',
            activeRailMode,
            timestamp: new Date().toISOString(),
            principalAmount,
            fee: baseFee,
            totalAmount,
            status: overallOk ? 'SIMULATED_SUCCESS' : 'SIMULATION_FAILED',
            simulatedInputs: formData,
        }

        return NextResponse.json({
            success: overallOk,
            serviceId: String(service.id),
            serviceName: service.name,
            mockEnvironment,
            totalDurationMs: traceSteps.reduce((acc, s) => acc + s.durationMs, 0),
            traceSteps,
            simulatedReceipt,
        })
    } catch (error: any) {
        console.error('Copteller POST /api/copteller/services/simulate error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
