import 'server-only'
import { getPayload } from 'payload'
import config from '@payload-config'
import { WorkflowExecutionStatus, ExecutionPhaseStatus, type AppNode } from './types'
import { ExecutorRegistry } from './executor/registry'
import { createLogCollector } from './log'
import { checkIdempotency, recordIdempotency, generateIdempotencyKey } from './idempotency'
import { resolveSecret } from './secrets/secretResolver'
import type { Edge } from '@xyflow/react'

type ExecuteOptions = {
    workflowId: string
    trigger: string
    inputData?: Record<string, any>
    scheduledJobId?: string
}

export async function executeWorkflow(options: ExecuteOptions): Promise<string> {
    const { workflowId, trigger, inputData } = options
    const payload = await getPayload({ config })

    // 1. Load workflow definition from Payload (overrideAccess: true for cron/webhook/server safety)
    const workflowRes = await payload.find({
        collection: 'workflows',
        where: { id: { equals: workflowId } },
        depth: 0,
        limit: 1,
        overrideAccess: true,
    })

    if (workflowRes.docs.length === 0) throw new Error(`Workflow ${workflowId} not found`)
    const workflow = workflowRes.docs[0] as any

    if (workflow.status !== 'PUBLISHED') {
        throw new Error(`Workflow ${workflow.name} is not published`)
    }

    // 2. Idempotency Check (if enabled)
    let idempotencyKey = ''
    if (workflow.idempotencyEnabled && trigger !== 'MANUAL') {
        idempotencyKey = generateIdempotencyKey(workflowId, trigger, inputData)
        const windowMinutes = workflow.idempotencyWindowMinutes ?? 60
        const check = await checkIdempotency(idempotencyKey, windowMinutes)
        if (check.isDuplicate) {
            return check.existingExecutionId
        }
    }

    // 3. Setup phases from execution plan (auto-compile if missing)
    let executionPlan = workflow.executionPlan ?? []
    const edges: Edge[] = workflow.definition?.edges ?? []

    if (executionPlan.length === 0 && workflow.definition?.nodes) {
        const { FlowToExecutionPlan } = await import('./executionPlan')
        const nodes = workflow.definition.nodes as AppNode[]
        const result = FlowToExecutionPlan(nodes, edges)

        if (result.error) {
            const errorMsg =
                result.error.type === 'NO_ENTRY_POINT'
                    ? 'Workflow must have a Trigger node as entry point.'
                    : `Some nodes have missing required inputs: ${result.error.invalidElements?.map((e: any) => e.nodeId).join(', ')}`
            throw new Error(`Execution plan missing and compilation failed: ${errorMsg}`)
        }
        executionPlan = result.executionPlan

        await payload.update({
            collection: 'workflows',
            id: workflowId,
            data: { executionPlan },
            overrideAccess: true,
        })
    }

    if (!executionPlan || executionPlan.length === 0) {
        throw new Error('Workflow has no compileable execution plan and no nodes. Please edit and republish.')
    }

    const phasesForDb = executionPlan.flatMap((phaseMap: any) =>
        phaseMap.nodes.map((node: AppNode) => ({
            phaseNumber: phaseMap.phase,
            nodeId: node.id,
            nodeType: node.data.type,
            status: 'CREATED',
            inputs: node.data.inputs ?? {},
            outputs: {},
            logs: [],
        }))
    )

    // 4. Create Execution Record
    const parsedWorkflowId = !isNaN(Number(workflowId)) ? Number(workflowId) : workflowId
    const execution = await payload.create({
        collection: 'workflow-executions',
        overrideAccess: true,
        data: {
            workflow: parsedWorkflowId,
            trigger,
            status: 'PENDING',
            inputData: inputData ?? {},
            definition: workflow.definition,
            phases: phasesForDb,
            startedAt: new Date().toISOString(),
            currentPhaseIndex: 0,
            idempotencyKey: idempotencyKey || null,
            isDeduplicated: false,
        },
    })

    // 5. Record idempotency key
    if (workflow.idempotencyEnabled && idempotencyKey) {
        await recordIdempotency(
            idempotencyKey,
            workflowId,
            String(execution.id),
            trigger,
            workflow.idempotencyWindowMinutes ?? 60
        )
    }

    // 6. Update workflow parent metadata
    await payload.update({
        collection: 'workflows',
        id: workflowId,
        overrideAccess: true,
        data: {
            lastRunId: String(execution.id),
            lastRunAt: new Date().toISOString(),
            lastRunStatus: 'PENDING',
        },
    })

    await runExecutionLoop(
        String(execution.id),
        payload,
        executionPlan,
        edges,
        inputData ?? {},
        { workflowId, trigger }
    ).catch((err) => {
        console.error(`[Workflow Engine] Fatal loop error:`, err)
    })

    return String(execution.id)
}

/**
 * Resume a workflow execution previously paused at an APPROVAL_GATE node.
 */
export async function resumeWorkflowExecution(params: {
    executionId: string
    decision: 'APPROVED' | 'REJECTED'
    notes?: string
    decidedByUserId?: string
}): Promise<{ status: string; executionId: string }> {
    const payload = await getPayload({ config })
    const exec = (await payload.findByID({
        collection: 'workflow-executions',
        id: params.executionId,
        overrideAccess: true,
    })) as any

    if (!exec) throw new Error(`Execution ${params.executionId} not found`)
    if (exec.status !== WorkflowExecutionStatus.WAITING_APPROVAL) {
        throw new Error(`Execution ${params.executionId} is not waiting for approval (status: ${exec.status})`)
    }

    const updatedApprovals = (exec.approvalRequests || []).map((req: any) =>
        req.status === 'PENDING'
            ? {
                  ...req,
                  status: params.decision,
                  decision: params.decision,
                  notes: params.notes || '',
                  decidedAt: new Date().toISOString(),
              }
            : req
    )

    if (params.decision === 'REJECTED') {
        await payload.update({
            collection: 'workflow-executions',
            id: params.executionId,
            overrideAccess: true,
            data: {
                status: WorkflowExecutionStatus.CANCELLED,
                approvalRequests: updatedApprovals,
                completedAt: new Date().toISOString(),
            },
        })
        return { status: WorkflowExecutionStatus.CANCELLED, executionId: params.executionId }
    }

    const wfId = typeof exec.workflow === 'object' ? String(exec.workflow.id) : String(exec.workflow)
    const wf = (await payload.findByID({
        collection: 'workflows',
        id: wfId,
        overrideAccess: true,
    })) as any

    const fullPlan = wf?.executionPlan ?? []
    const startPhaseIdx = Number(exec.currentPhaseIndex || 0) + 1
    const remainingPlan = fullPlan.slice(startPhaseIdx)
    const edges: Edge[] = exec.definition?.edges ?? wf?.definition?.edges ?? []

    await payload.update({
        collection: 'workflow-executions',
        id: params.executionId,
        overrideAccess: true,
        data: {
            approvalRequests: updatedApprovals,
            status: WorkflowExecutionStatus.RUNNING,
        },
    })

    await runExecutionLoop(
        params.executionId,
        payload,
        remainingPlan,
        edges,
        exec.inputData ?? {},
        { workflowId: wfId, trigger: exec.trigger || 'MANUAL' },
        exec.environmentSnapshot || undefined,
        startPhaseIdx
    )

    const finalDoc = (await payload.findByID({
        collection: 'workflow-executions',
        id: params.executionId,
        overrideAccess: true,
    })) as any
    return { status: finalDoc?.status || WorkflowExecutionStatus.COMPLETED, executionId: params.executionId }
}

/**
 * Determine whether a node should be skipped due to an inactive upstream CONDITIONAL branch.
 */
function shouldSkipNodeByBranching(
    nodeId: string,
    edges: Edge[],
    skippedNodes: Set<string>,
    inactiveHandles: Set<string>
): boolean {
    const incoming = edges.filter((e) => e.target === nodeId)
    if (incoming.length === 0) return false

    // If EVERY incoming edge either comes from a skipped node OR from an inactive conditional sourceHandle, skip!
    return incoming.every((edge) => {
        if (skippedNodes.has(edge.source)) return true
        if (edge.sourceHandle && inactiveHandles.has(`${edge.source}:${edge.sourceHandle}`)) {
            return true
        }
        return false
    })
}

async function runExecutionLoop(
    executionId: string,
    payload: any,
    plan: any[],
    edges: Edge[],
    startInput: any,
    metadata: { workflowId: string; trigger: string },
    initialEnvironment?: Record<string, any>,
    phaseOffset = 0
) {
    const { workflowId, trigger } = metadata
    let mainStatus: WorkflowExecutionStatus = WorkflowExecutionStatus.RUNNING

    await payload.update({
        collection: 'workflow-executions',
        id: executionId,
        overrideAccess: true,
        data: { status: WorkflowExecutionStatus.RUNNING },
    })

    const environment: Record<string, any> = initialEnvironment
        ? { ...initialEnvironment }
        : {
              TRIGGER_PAYLOAD: startInput,
              SYSTEM: {
                  now: new Date().toISOString(),
                  date: new Date().toISOString().split('T')[0],
                  executionId,
                  workflowId,
                  trigger,
              },
          }

    const skippedNodes = new Set<string>()
    const inactiveHandles = new Set<string>()

    for (let idx = 0; idx < plan.length; idx++) {
        if (mainStatus !== WorkflowExecutionStatus.RUNNING) break

        const phaseMap = plan[idx]
        const phaseNumber = phaseMap.phase
        const nodes: AppNode[] = phaseMap.nodes

        const activeNodes: AppNode[] = []
        for (const node of nodes) {
            if (shouldSkipNodeByBranching(node.id, edges, skippedNodes, inactiveHandles)) {
                skippedNodes.add(node.id)
                await savePhaseResult(
                    payload,
                    executionId,
                    node.id,
                    'SKIPPED',
                    environment,
                    [{ level: 'info', message: 'Skipped — upstream conditional branch not taken', timestamp: new Date().toISOString() }]
                )
            } else {
                activeNodes.push(node)
            }
        }

        if (activeNodes.length === 0) continue

        await updatePhaseStatuses(
            payload,
            executionId,
            activeNodes.map((n) => n.id),
            ExecutionPhaseStatus.RUNNING,
            phaseOffset + idx
        )

        for (const node of activeNodes) {
            const res = await executeNode(node, phaseNumber, edges, environment, payload, executionId, startInput)
            if (node.data.type === 'CONDITIONAL' && res.success) {
                // Mark untaken conditional output handle inactive so downstream nodes skip cleanly
                const trueVal = environment[`${node.id}.trueBranch`]
                const falseVal = environment[`${node.id}.falseBranch`]
                if (trueVal === null || trueVal === undefined) {
                    inactiveHandles.add(`${node.id}:trueBranch`)
                    inactiveHandles.add(`${node.id}:true`)
                }
                if (falseVal === null || falseVal === undefined) {
                    inactiveHandles.add(`${node.id}:falseBranch`)
                    inactiveHandles.add(`${node.id}:false`)
                }
            }
            if (!res.success) {
                if (res.isPausedForApproval) {
                    mainStatus = WorkflowExecutionStatus.WAITING_APPROVAL
                } else {
                    mainStatus = WorkflowExecutionStatus.FAILED
                }
            }
        }
    }

    if (mainStatus === WorkflowExecutionStatus.RUNNING) mainStatus = WorkflowExecutionStatus.COMPLETED

    await payload.update({
        collection: 'workflow-executions',
        id: executionId,
        overrideAccess: true,
        data: {
            status: mainStatus,
            ...(mainStatus !== WorkflowExecutionStatus.WAITING_APPROVAL
                ? { completedAt: new Date().toISOString() }
                : {}),
        },
    })

    const exec = await payload
        .findByID({ collection: 'workflow-executions', id: executionId, overrideAccess: true })
        .catch(() => null)
    if (exec && exec.workflow) {
        const wfId = typeof exec.workflow === 'object' ? exec.workflow.id : exec.workflow
        await payload
            .update({
                collection: 'workflows',
                id: wfId,
                overrideAccess: true,
                data: { lastRunStatus: mainStatus },
            })
            .catch(() => {})
    }
}

async function executeNode(
    node: AppNode,
    phaseNumber: number,
    edges: Edge[],
    environment: Record<string, any>,
    payload: any,
    executionId: string,
    _startInput: any
) {
    const logCollector = createLogCollector()
    const executorFn = ExecutorRegistry[node.data.type]
    let success = false
    let isPausedForApproval = false

    if (!executorFn) {
        logCollector.error(`No executor found for node type: ${node.data.type}`)
        await savePhaseResult(payload, executionId, node.id, 'FAILED', {}, logCollector.getAll())
        return { success: false }
    }

    const resolveVariables = (val: any, env: Record<string, any>): any => {
        if (typeof val !== 'string') return val
        if (!val.includes('{{')) return val

        const getValue = (path: string) => {
            if (env[path] !== undefined) return env[path]
            let matchedKey = ''
            for (const key of Object.keys(env)) {
                if (path.startsWith(key + '.') || path === key) {
                    if (key.length > matchedKey.length) matchedKey = key
                }
            }
            if (matchedKey) {
                let current = env[matchedKey]
                const remaining = path.slice(matchedKey.length).replace(/^\./, '')
                if (!remaining) return current
                for (const part of remaining.split('.')) {
                    if (current === undefined || current === null) return undefined
                    current = current[part]
                }
                return current
            }
            let current = env
            for (const part of path.split('.')) {
                if (current === undefined || current === null) return undefined
                current = current[part]
            }
            return current
        }

        const exactMatch = val.match(/^\{\{([^{}]+)\}\}$/)
        if (exactMatch) return getValue(exactMatch[1].trim())

        return val.replace(/\{\{([^{}]+)\}\}/g, (match, path) => {
            const resolved = getValue(path.trim())
            return resolved !== undefined
                ? typeof resolved === 'object'
                    ? JSON.stringify(resolved)
                    : String(resolved)
                : match
        })
    }

    // Bind environment API — resolves BOTH static/template inputs AND visually connected ReactFlow edges!
    const incomingEdges = edges.filter((e) => e.target === node.id)

    const nodeEnvApi = {
        getInput: (inputName: string) => {
            if (node.data.type === 'TRIGGER' && inputName === 'triggerPayload') {
                return environment.TRIGGER_PAYLOAD
            }
            const rawVal = node.data.inputs?.[inputName]
            if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
                return resolveVariables(rawVal, environment)
            }
            // Edge-wire fallback: look up connected source node output handle!
            const matchingEdge = incomingEdges.find((e) => e.targetHandle === inputName)
            if (matchingEdge) {
                if (matchingEdge.sourceHandle) {
                    const edgeKey = `${matchingEdge.source}.${matchingEdge.sourceHandle}`
                    if (environment[edgeKey] !== undefined) return environment[edgeKey]
                }
                // Fallback to first output emitted by source node if handle was generic
                const prefix = `${matchingEdge.source}.`
                const firstKey = Object.keys(environment).find((k) => k.startsWith(prefix))
                if (firstKey) return environment[firstKey]
            }
            return ''
        },
        setOutput: (outputName: string, value: any) => {
            if (outputName === '__approvalGatePause__') isPausedForApproval = true
            environment[`${node.id}.${outputName}`] = value
        },
        getEnvironment: () => environment,
        log: logCollector,
        payload,
        executionId,
        resolveSecret: async (id: string) => resolveSecret(id),
        getProvider: async (id: string) => {
            return await payload
                .findByID({ collection: 'service-providers', id, overrideAccess: true })
                .catch(() => null)
        },
    }

    const startTime = Date.now()
    try {
        success = await executorFn(nodeEnvApi as any)
    } catch (err: any) {
        logCollector.error(`Uncaught executor error: ${err.message}`)
        success = false
    }

    // Handle APPROVAL_GATE pause cleanly (persist approvalRequest + environment snapshot)
    if (!success && isPausedForApproval) {
        let approvalData: any = {}
        try {
            approvalData = JSON.parse(environment[`${node.id}.__approvalGatePause__`] || '{}')
        } catch {}

        const existingExec = (await payload
            .findByID({ collection: 'workflow-executions', id: executionId, overrideAccess: true })
            .catch(() => null)) as any

        const existingRequests = Array.isArray(existingExec?.approvalRequests) ? existingExec.approvalRequests : []
        const newApprovalReq = {
            nodeId: node.id,
            phaseNumber,
            assigneeRole: approvalData.assigneeRole || 'superadmin',
            title: approvalData.title || `Approval Required (${node.id})`,
            description: approvalData.description || '',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
        }

        await payload.update({
            collection: 'workflow-executions',
            id: executionId,
            overrideAccess: true,
            data: {
                environmentSnapshot: environment,
                approvalRequests: [...existingRequests, newApprovalReq],
            },
        })

        await savePhaseResult(payload, executionId, node.id, 'PENDING', environment, logCollector.getAll())
        return { success: false, isPausedForApproval: true }
    }

    const status: ExecutionPhaseStatus = success ? ExecutionPhaseStatus.COMPLETED : ExecutionPhaseStatus.FAILED
    await savePhaseResult(payload, executionId, node.id, status, environment, logCollector.getAll(), new Date(startTime))
    return { success }
}

async function updatePhaseStatuses(
    payload: any,
    executionId: string,
    nodeIds: string[],
    status: ExecutionPhaseStatus,
    currentPhaseIndex?: number
) {
    const doc = await payload.findByID({
        collection: 'workflow-executions',
        id: executionId,
        overrideAccess: true,
    })
    if (!doc) return
    const currentPhases = doc.phases ?? []
    const updatedPhases = currentPhases.map((p: any) => {
        if (nodeIds.includes(p.nodeId)) {
            return { ...p, status, startedAt: new Date().toISOString() }
        }
        return p
    })

    await payload.update({
        collection: 'workflow-executions',
        id: executionId,
        overrideAccess: true,
        data: {
            phases: updatedPhases,
            ...(currentPhaseIndex !== undefined ? { currentPhaseIndex } : {}),
        },
    })
}

async function savePhaseResult(
    payload: any,
    executionId: string,
    nodeId: string,
    status: string,
    environment: any,
    logs: any[],
    startedAt?: Date
) {
    const doc = await payload.findByID({
        collection: 'workflow-executions',
        id: executionId,
        overrideAccess: true,
    })
    if (!doc) return

    const myOutputs = Object.fromEntries(
        Object.entries(environment)
            .filter(([k]) => k.startsWith(`${nodeId}.`))
            .map(([k, v]) => [k.replace(`${nodeId}.`, ''), v])
    )

    const currentPhases = doc.phases ?? []
    const updatedPhases = currentPhases.map((p: any) => {
        if (p.nodeId === nodeId) {
            return {
                ...p,
                status,
                outputs: myOutputs,
                logs: p.logs ? [...p.logs, ...logs] : logs,
                completedAt: new Date().toISOString(),
                ...(startedAt && { startedAt: startedAt.toISOString() }),
            }
        }
        return p
    })

    await payload.update({
        collection: 'workflow-executions',
        id: executionId,
        overrideAccess: true,
        data: { phases: updatedPhases },
    })
}
