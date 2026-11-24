'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { FlowToExecutionPlan } from '@/lib/workflow/executionPlan'
import type { AppNode } from '@/lib/workflow/types'
import { createCoptellerServerClient } from '@/lib/copteller/supabase/server'
import { getProfilesForUser } from '@/lib/copteller/supabase/admin'

async function assertSuperadminAction() {
    const supabase = await createCoptellerServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized: sign in required.')

    const metaRole = String(user.user_metadata?.role || '').toLowerCase()
    if (metaRole === 'superadmin' || metaRole === 'admin' || metaRole === 'bank_staff') return

    const profiles = await getProfilesForUser(user.id)
    const allowed = profiles.some((p) => p.role === 'superadmin' || p.role === 'bank_staff')
    if (!allowed) throw new Error('Forbidden: superadmin or bank_staff role required.')
}

export async function saveWorkflowDefinition(workflowId: string, definition: any, status?: 'DRAFT' | 'PUBLISHED') {
    await assertSuperadminAction()
    if (!workflowId || workflowId === 'new') {
        throw new Error('Save requires an existing workflow ID.')
    }

    const payload = await getPayload({ config })
    const existing = await payload
        .findByID({ collection: 'workflows', id: workflowId, overrideAccess: true })
        .catch(() => null)

    if (!existing) {
        throw new Error(`Workflow ${workflowId} not found`)
    }

    try {
        const updateData: any = { definition }
        if (status) updateData.status = status

        const isPublishing = status === 'PUBLISHED' || (!status && existing.status === 'PUBLISHED')

        if (isPublishing && definition?.nodes) {
            const nodes = definition.nodes as AppNode[]
            const edges = definition.edges || []
            const result = FlowToExecutionPlan(nodes, edges)

            if (result.error) {
                const errorMsg =
                    result.error.type === 'NO_ENTRY_POINT'
                        ? 'Workflow must have a Trigger node as entry point.'
                        : `Some nodes have missing required inputs: ${result.error.invalidElements?.map((e: any) => e.nodeId).join(', ')}`
                return { success: false, error: errorMsg }
            }

            updateData.executionPlan = result.executionPlan

            const triggerNode = nodes.find((n) => n.data?.type === 'TRIGGER')
            if (triggerNode?.data?.inputs?.triggerType) {
                updateData.trigger = triggerNode.data.inputs.triggerType
            }
        }

        await payload.update({
            collection: 'workflows',
            id: workflowId,
            data: updateData,
            overrideAccess: true,
        })

        revalidatePath(`/copteller/superadmin/workflows/${workflowId}/edit`)
        revalidatePath('/copteller/superadmin/workflows')
        return { success: true, status: updateData.status || existing.status }
    } catch (e: any) {
        console.error('Failed to save workflow', e)
        return { success: false, error: e.message }
    }
}

export async function createWorkflowAndSave(definition: any, status: 'DRAFT' | 'PUBLISHED' = 'DRAFT') {
    await assertSuperadminAction()
    const payload = await getPayload({ config })

    try {
        let executionPlan
        let trigger = 'MANUAL'
        if (status === 'PUBLISHED' && definition?.nodes) {
            const result = FlowToExecutionPlan(definition.nodes, definition.edges || [])
            if (result.error) {
                return { success: false, error: 'Workflow has validation errors. Cannot publish.' }
            }
            executionPlan = result.executionPlan
            const triggerNode = (definition.nodes as AppNode[]).find((n) => n.data?.type === 'TRIGGER')
            if (triggerNode?.data?.inputs?.triggerType) {
                trigger = triggerNode.data.inputs.triggerType
            }
        }

        const workflow = await payload.create({
            collection: 'workflows',
            overrideAccess: true,
            data: {
                name: `Untitled Workflow ${new Date().toLocaleDateString()}`,
                status,
                trigger,
                definition,
                ...(executionPlan ? { executionPlan } : {}),
            },
        })

        revalidatePath('/copteller/superadmin/workflows')
        return { success: true, workflowId: String(workflow.id), status }
    } catch (e: any) {
        console.error('Failed to create workflow', e)
        return { success: false, error: e.message }
    }
}

export async function runWorkflow(workflowId: string, inputData?: Record<string, any>) {
    await assertSuperadminAction()
    const { executeWorkflow } = await import('@/lib/workflow/executeWorkflow')

    try {
        const executionId = await executeWorkflow({
            workflowId,
            trigger: 'MANUAL',
            inputData: inputData || {},
        })

        return {
            success: true,
            executionId,
            message: `Workflow execution started. ID: ${executionId}`,
        }
    } catch (e: any) {
        console.error(`[Test Run] Failed to execute workflow ${workflowId}:`, e)
        return {
            success: false,
            error: e.message || 'Failed to execute workflow',
        }
    }
}

export async function executeEndpointAction(endpointId: string, inputData: Record<string, any>) {
    await assertSuperadminAction()
    const payload = await getPayload({ config })

    try {
        const endpoint = await payload.findByID({
            collection: 'endpoints',
            id: endpointId,
            depth: 2,
            overrideAccess: true,
        })

        if (!endpoint) throw new Error('Endpoint not found')

        const { executeResolvedEndpoint } = await import('@/lib/workflow/utils/apiResolver')
        const result = await executeResolvedEndpoint(endpoint as any, {
            dynamicPayload: inputData,
        })

        if (!result.ok) {
            throw new Error(result.data?.message || result.data?.Message || 'API Execution failed')
        }

        return { success: true, data: result.data }
    } catch (e: any) {
        console.error(`[Form Event] Failed to execute endpoint ${endpointId}:`, e)
        return { success: false, error: e.message }
    }
}

export async function renameWorkflow(workflowId: string, name: string) {
    await assertSuperadminAction()
    const payload = await getPayload({ config })
    try {
        await payload.update({
            collection: 'workflows',
            id: workflowId,
            data: { name },
            overrideAccess: true,
        })
        revalidatePath('/copteller/superadmin/workflows')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
