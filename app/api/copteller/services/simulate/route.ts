import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/copteller/db'
import { getCoptellerAuth } from '@/lib/copteller/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const { serviceId, formData = {}, mockEnvironment = 'sandbox' } = body

        if (!serviceId) {
            return NextResponse.json({ error: 'serviceId is required' }, { status: 400 })
        }

        const payload = await getDb()

        const cleanServiceId = /^\d+$/.test(serviceId) ? Number(serviceId) : serviceId
        const service = await payload.findByID({
            collection: 'services',
            id: cleanServiceId as any,
            depth: 2,
            overrideAccess: true,
        })

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

        // 1. Schema Validation Step
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
                            const re = new RegExp(v.value)
                            if (!re.test(String(val))) {
                                validationIssues.push(v.errorMessage || `Field "${field.label}" failed regex validation (${v.value}).`)
                            }
                        } catch { }
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
            durationMs: 14,
            details: {
                fieldsEvaluated: schema.length,
                providedInputs: Object.keys(formData).length,
                errors: validationIssues,
            }
        })

        // 2. Access Matrix Step
        const allowedRoles = (service as any).allowed_roles || ['member', 'coop_admin', 'superadmin']
        const sectorTags = (service as any).sector_tags || ['all']
        traceSteps.push({
            id: 'step_access_evaluation',
            name: 'Multi-Role & Sector Permission Matrix',
            status: 'SUCCESS',
            durationMs: 9,
            details: {
                callerRole: auth.role,
                allowedRoles,
                sectorTags,
                sandboxMode: true,
            }
        })

        // 3. Financial Calculation Step
        let principalAmount = 0
        if (formData.amount) principalAmount = Number(formData.amount) || 0
        else if (formData.principal) principalAmount = Number(formData.principal) || 0
        else if (formData.rechargeAmount) principalAmount = Number(formData.rechargeAmount) || 0
        else if (formData.value) principalAmount = Number(formData.value) || 0

        let baseFee = 0
        if (service.fee_type === 'flat') {
            baseFee = Number(service.fee_value) || 0
        } else if (service.fee_type === 'percentage') {
            baseFee = (principalAmount * (Number(service.fee_value) || 0)) / 100
        }

        const totalAmount = principalAmount + baseFee

        traceSteps.push({
            id: 'step_fee_calculation',
            name: 'Pricing & Fee Engine Simulation',
            status: 'SUCCESS',
            durationMs: 18,
            details: {
                feeType: service.fee_type,
                feeValue: service.fee_value,
                principalAmount,
                calculatedFee: baseFee,
                simulatedTotalDebit: totalAmount,
                currency: 'NGN',
            }
        })

        // 4. Workflow / Endpoint Dispatch Simulation
        const executionWorkflow = service.execution_workflow
        const validationWorkflow = service.validation_workflow
        traceSteps.push({
            id: 'step_workflow_dispatch',
            name: 'Workflow / API Endpoint Execution Simulation',
            status: 'SUCCESS',
            durationMs: 45,
            details: {
                environment: mockEnvironment,
                hasValidationWorkflow: !!validationWorkflow,
                hasExecutionWorkflow: !!executionWorkflow,
                workflowId: executionWorkflow ? (typeof executionWorkflow === 'object' ? executionWorkflow.id : executionWorkflow) : 'DIRECT_PRIMITIVE',
                simulatedProviderStatus: '200 OK',
                providerServiceCode: service.provider_service_code || 'N/A',
            }
        })

        // 5. Output Receipt Generation
        const simulatedReference = `SIM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
        const simulatedReceipt = {
            simulatedReference,
            isDryRun: true,
            serviceName: service.name,
            serviceIntent: service.service_intent,
            settlementType: (service as any).settlement_type || 'wallet_debit',
            timestamp: new Date().toISOString(),
            principalAmount,
            fee: baseFee,
            totalAmount,
            status: validationIssues.length === 0 ? 'SIMULATED_SUCCESS' : 'SIMULATION_FAILED',
            simulatedInputs: formData,
        }

        traceSteps.push({
            id: 'step_receipt_generation',
            name: 'Digital Receipt & State Assembly',
            status: validationIssues.length === 0 ? 'SUCCESS' : 'FAILED',
            durationMs: 8,
            details: simulatedReceipt,
        })

        return NextResponse.json({
            success: validationIssues.length === 0,
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
