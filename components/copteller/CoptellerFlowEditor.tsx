'use client'
import React, { useCallback, useState, useRef, useEffect } from 'react'
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    ReactFlowProvider,
    Panel,
    MarkerType,
    Edge,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TaskRegistry } from '@/lib/workflow/task/registry'
import { NodeComponent } from '../workflow/nodes/NodeComponent'
import { TaskMenu } from '../workflow/TaskMenu'
import {
    X, Plus, Menu, Trash2, Copy, LayoutGrid, Maximize2,
    Download, Upload, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { saveWorkflowDefinition, createWorkflowAndSave } from '@/app/(copteller)/copteller/(portal)/superadmin/workflows/[id]/edit/actions'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { TaskType, TaskCategory, AppNode } from '@/lib/workflow/types'
import { VariableSelector } from '../workflow/VariableSelector'
import { v4 as uuidv4 } from 'uuid'
import { useTheme } from 'next-themes'

const initialNodes: AppNode[] = [
    {
        id: 'trigger-1',
        type: 'abiaNode',
        position: { x: 120, y: 140 },
        zIndex: 1,
        data: { type: TaskType.TRIGGER, inputs: { triggerType: 'MANUAL' } }
    }
]

const nodeTypes: NodeTypes = {
    abiaNode: NodeComponent,
    custom: NodeComponent,
}

const defaultEdgeOptions = {
    type: 'smoothstep',
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { strokeWidth: 2 },
}

export interface DynamicOptions {
    providers: { id: string; label: string }[]
    secrets: { id: string; label: string }[]
    workflows: { id: string; label: string }[]
    applications: { id: string; label: string }[]
    endpoints?: { id: string; label: string; method: string; path: string; providerName?: string }[]
}

export type SaveWorkflowFn = (status: 'draft' | 'published') => Promise<void>

interface FlowEditorProps {
    workflowId?: string
    initialData?: any
    dynamicOptions: DynamicOptions
    onReady?: (saveFn: SaveWorkflowFn) => void
    runningExecutionId?: string | null
}

function FlowEditorInner({ workflowId, initialData, dynamicOptions, onReady, runningExecutionId }: FlowEditorProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(
        initialData?.nodes?.length ? initialData.nodes : initialNodes
    )
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
        initialData?.edges?.length
            ? initialData.edges.map((e: Edge) => ({ ...defaultEdgeOptions, ...e }))
            : []
    )
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(true)
    const [selectedNode, setSelectedNode] = useState<AppNode | null>(null)
    useTheme()

    // Expose save function to WorkflowEditorLayout header
    useEffect(() => {
        if (!onReady || !reactFlowInstance) return
        const saveFn: SaveWorkflowFn = async (status) => {
            try {
                const flow = reactFlowInstance.toObject()
                const dbStatus = status === 'published' ? ('PUBLISHED' as const) : ('DRAFT' as const)

                if (!workflowId || workflowId === 'new') {
                    const result = await createWorkflowAndSave(flow, dbStatus)
                    if (result?.success && result.workflowId) {
                        toast.success('Workflow created successfully!')
                        window.location.href = `/copteller/superadmin/workflows/${result.workflowId}/edit`
                    } else {
                        toast.error(result?.error || 'Failed to create workflow')
                    }
                } else {
                    const result = await saveWorkflowDefinition(workflowId, flow, dbStatus)
                    if (result?.success) {
                        toast.success(`Workflow ${status === 'published' ? 'published' : 'saved as draft'}!`)
                    } else {
                        toast.error(result?.error || 'Failed to save workflow')
                    }
                }
            } catch (e: any) {
                toast.error(e.message || 'An error occurred while saving')
            }
        }
        onReady(saveFn)
    }, [reactFlowInstance, workflowId, onReady])

    // Live execution status polling (illuminates nodes & animates edges while running)
    useEffect(() => {
        if (!runningExecutionId) {
            setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, executionStatus: undefined } })))
            setEdges((eds) => eds.map((e) => ({ ...e, animated: false })))
            return
        }

        let isPolling = true
        let pollTimeout: ReturnType<typeof setTimeout>
        setEdges((eds) => eds.map((e) => ({ ...e, animated: true })))

        const pollExecution = async () => {
            if (!isPolling) return
            try {
                const res = await fetch(`/api/workflows/executions/${runningExecutionId}`)
                const data = await res.json()

                if (data.success && data.phases) {
                    const statusMap: Record<string, string> = {}
                    data.phases.forEach((p: any) => {
                        statusMap[p.nodeId] = p.status
                    })

                    setNodes((nds) =>
                        nds.map((n) => {
                            const newStatus = statusMap[n.id]
                            if (n.data.executionStatus !== newStatus) {
                                return { ...n, data: { ...n.data, executionStatus: newStatus } }
                            }
                            return n
                        })
                    )

                    if (['COMPLETED', 'FAILED', 'CANCELLED', 'WAITING_APPROVAL'].includes(data.status)) {
                        isPolling = false
                        setEdges((eds) => eds.map((e) => ({ ...e, animated: false })))
                        return
                    }
                }
            } catch (err) {
                console.error('Failed to poll execution status:', err)
            }

            if (isPolling) {
                pollTimeout = setTimeout(pollExecution, 1500)
            }
        }

        pollExecution()

        return () => {
            isPolling = false
            clearTimeout(pollTimeout)
        }
    }, [runningExecutionId, setNodes, setEdges])

    const onNodeDataChange = useCallback(
        (nodeId: string, key: string, value: any) => {
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id === nodeId) {
                        return {
                            ...n,
                            data: {
                                ...n.data,
                                lastUpdated: Date.now(),
                                inputs: {
                                    ...(typeof n.data.inputs === 'object' && n.data.inputs !== null ? n.data.inputs : {}),
                                    [key]: value,
                                },
                            },
                        }
                    }
                    return n
                })
            )

            setSelectedNode((prev) => {
                if (prev && prev.id === nodeId) {
                    return {
                        ...prev,
                        data: {
                            ...prev.data,
                            lastUpdated: Date.now(),
                            inputs: {
                                ...(typeof prev.data.inputs === 'object' && prev.data.inputs !== null ? prev.data.inputs : {}),
                                [key]: value,
                            },
                        },
                    }
                }
                return prev
            })
        },
        [setNodes]
    )

    // Append or insert variable expression into string/textarea/json field
    const appendVariableToInput = useCallback(
        (nodeId: string, inputName: string, variableToken: string) => {
            const currentVal = selectedNode?.data?.inputs?.[inputName]
            const currentStr =
                typeof currentVal === 'object' && currentVal !== null
                    ? JSON.stringify(currentVal)
                    : String(currentVal || '')
            const nextVal = currentStr ? `${currentStr}${variableToken}` : variableToken
            onNodeDataChange(nodeId, inputName, nextVal)
        },
        [selectedNode, onNodeDataChange]
    )

    // Auto-inject variable binding when visually connecting Output -> Input handles
    const onConnect = useCallback(
        (params: Connection | Edge) => {
            setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds))

            if (params.target && params.targetHandle && params.source && params.sourceHandle) {
                setNodes((nds) =>
                    nds.map((n) => {
                        if (n.id === params.target) {
                            const task = TaskRegistry[n.data.type as TaskType]
                            if (task && task.inputs.find((i) => i.name === params.targetHandle)) {
                                const isTrigger =
                                    String(params.source).startsWith('trigger-') || params.source === 'trigger'
                                const prefix = isTrigger ? 'TRIGGER_PAYLOAD' : params.source

                                const updatedNode = {
                                    ...n,
                                    data: {
                                        ...n.data,
                                        inputs: {
                                            ...(typeof n.data.inputs === 'object' && n.data.inputs !== null
                                                ? n.data.inputs
                                                : {}),
                                            [params.targetHandle as string]: `{{${prefix}.${params.sourceHandle}}}`,
                                        },
                                    },
                                } as AppNode

                                setSelectedNode((prev) => (prev && prev.id === n.id ? updatedNode : prev))
                                return updatedNode
                            }
                        }
                        return n
                    })
                )
            }
        },
        [setEdges, setNodes]
    )

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const addNodeOfType = useCallback(
        (type: TaskType, position?: { x: number; y: number }) => {
            if (!TaskRegistry[type]) return
            const defaultPos = position || {
                x: 200 + nodes.length * 60,
                y: 120 + (nodes.length % 4) * 90,
            }
            const defaultInputs: Record<string, any> = {}
            for (const inp of TaskRegistry[type].inputs) {
                if (inp.value !== undefined) defaultInputs[inp.name] = inp.value
            }

            const newNode: AppNode = {
                id: `node-${uuidv4().slice(0, 8)}`,
                type: 'abiaNode',
                position: defaultPos,
                zIndex: type === TaskType.GROUP ? -1 : 1,
                style: type === TaskType.GROUP ? { width: 420, height: 300 } : undefined,
                data: { type, inputs: defaultInputs },
            }

            if (reactFlowInstance && position) {
                const intersecting = reactFlowInstance.getIntersectingNodes(newNode)
                const groupNode = intersecting.find((n: AppNode) => n.data.type === TaskType.GROUP)
                if (groupNode) {
                    newNode.parentId = groupNode.id
                    newNode.position = {
                        x: position.x - groupNode.position.x,
                        y: position.y - groupNode.position.y,
                    }
                }
            }

            setNodes((nds) => nds.concat(newNode))
            setSelectedNode(newNode)
        },
        [nodes.length, reactFlowInstance, setNodes]
    )

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault()
            if (!reactFlowWrapper.current || !reactFlowInstance) return
            const type = event.dataTransfer.getData('application/reactflow') as TaskType
            if (!type || !TaskRegistry[type]) return
            const bounds = reactFlowWrapper.current.getBoundingClientRect()
            const pos = reactFlowInstance.screenToFlowPosition({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
            })
            addNodeOfType(type, pos)
        },
        [reactFlowInstance, addNodeOfType]
    )

    const onNodeDragStop = useCallback(
        (_: React.MouseEvent, node: AppNode) => {
            if (!reactFlowInstance || node.data.type === TaskType.GROUP) return
            const intersecting = reactFlowInstance.getIntersectingNodes(node)
            const groupNode = intersecting.find((n: AppNode) => n.data.type === TaskType.GROUP)

            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id === node.id) {
                        if (groupNode && n.parentId !== groupNode.id) {
                            return {
                                ...n,
                                parentId: groupNode.id,
                                zIndex: 2,
                                position: {
                                    x: n.position.x - groupNode.position.x,
                                    y: n.position.y - groupNode.position.y,
                                },
                            } as AppNode
                        } else if (!groupNode && n.parentId) {
                            const oldParent = nds.find((p) => p.id === n.parentId)
                            return {
                                ...n,
                                parentId: undefined,
                                extent: undefined,
                                zIndex: 1,
                                position: {
                                    x: oldParent ? n.position.x + oldParent.position.x : n.position.x,
                                    y: oldParent ? n.position.y + oldParent.position.y : n.position.y,
                                },
                            } as AppNode
                        }
                    }
                    return n
                })
            )
        },
        [reactFlowInstance, setNodes]
    )

    const handleDeleteSelectedNode = () => {
        if (!selectedNode) return
        const id = selectedNode.id
        setNodes((nds) => nds.filter((n) => n.id !== id))
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
        setSelectedNode(null)
        toast.info('Node removed from canvas')
    }

    const handleDuplicateSelectedNode = () => {
        if (!selectedNode) return
        const clone: AppNode = {
            ...selectedNode,
            id: `node-${uuidv4().slice(0, 8)}`,
            position: { x: selectedNode.position.x + 60, y: selectedNode.position.y + 60 },
            selected: false,
            data: {
                ...selectedNode.data,
                inputs: { ...(selectedNode.data.inputs || {}) },
                executionStatus: undefined,
            },
        }
        setNodes((nds) => nds.concat(clone))
        setSelectedNode(clone)
        toast.success('Node duplicated')
    }

    // Topological Left-to-Right Auto-Layout
    const handleAutoLayout = () => {
        const inDegree: Record<string, number> = {}
        const adj: Record<string, string[]> = {}
        nodes.forEach((n) => {
            inDegree[n.id] = 0
            adj[n.id] = []
        })
        edges.forEach((e) => {
            if (adj[e.source] && inDegree[e.target] !== undefined) {
                adj[e.source].push(e.target)
                inDegree[e.target]++
            }
        })

        const depth: Record<string, number> = {}
        const queue: string[] = []
        nodes.forEach((n) => {
            if (inDegree[n.id] === 0 || n.data.type === TaskType.TRIGGER) {
                depth[n.id] = 0
                queue.push(n.id)
            }
        })

        while (queue.length > 0) {
            const cur = queue.shift()!
            for (const nxt of adj[cur] || []) {
                depth[nxt] = Math.max(depth[nxt] ?? 0, (depth[cur] ?? 0) + 1)
                queue.push(nxt)
            }
        }

        const columns: Record<number, AppNode[]> = {}
        nodes.forEach((n) => {
            const col = depth[n.id] ?? 0
            if (!columns[col]) columns[col] = []
            columns[col].push(n)
        })

        const positioned = nodes.map((n) => {
            const col = depth[n.id] ?? 0
            const row = columns[col].findIndex((x) => x.id === n.id)
            return {
                ...n,
                position: { x: 80 + col * 380, y: 80 + row * 280 },
            }
        })
        setNodes(positioned)
        setTimeout(() => reactFlowInstance?.fitView({ padding: 0.2, duration: 300 }), 50)
        toast.success('Canvas auto-aligned!')
    }

    const handleExportJson = () => {
        if (!reactFlowInstance) return
        const flow = reactFlowInstance.toObject()
        const blob = new Blob([JSON.stringify(flow, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `workflow-${workflowId || 'draft'}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Workflow definition exported as JSON')
    }

    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result || '{}'))
                if (Array.isArray(parsed.nodes)) {
                    setNodes(parsed.nodes)
                    setEdges(Array.isArray(parsed.edges) ? parsed.edges : [])
                    setTimeout(() => reactFlowInstance?.fitView({ padding: 0.2 }), 80)
                    toast.success(`Imported ${parsed.nodes.length} nodes onto canvas`)
                } else {
                    toast.error('JSON must contain a ReactFlow nodes[] array')
                }
            } catch {
                toast.error('Invalid JSON file')
            }
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    const selectedTask = selectedNode ? TaskRegistry[selectedNode.data.type] : null

    return (
        <div className="flex w-full h-full bg-background overflow-hidden relative">
            <TaskMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onQuickAdd={(type) => addNodeOfType(type)}
            />

            <div className="flex-1 relative h-full" ref={reactFlowWrapper}>
                {!isMenuOpen && (
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="md:hidden absolute bottom-6 right-6 w-12 h-12 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-700 transition-transform active:scale-95 z-[10]"
                        title="Add Node"
                    >
                        <Plus size={24} />
                    </button>
                )}

                <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJson} className="hidden" />

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeClick={(_: any, node: any) => setSelectedNode(node)}
                    onNodeDragStop={onNodeDragStop as any}
                    onPaneClick={() => setSelectedNode(null)}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    deleteKeyCode={['Backspace', 'Delete']}
                    fitView
                    minZoom={0.2}
                    maxZoom={2}
                    attributionPosition="bottom-left"
                >
                    <Background variant={BackgroundVariant.Dots} color="hsl(var(--muted-foreground) / 0.35)" gap={20} size={1.2} />
                    <Controls
                        position="bottom-right"
                        className="!bg-card !border-border fill-foreground shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground hover:[&>button]:!bg-muted !bottom-24 md:!bottom-4 !right-4"
                    />
                    <MiniMap
                        zoomable
                        pannable
                        position="top-right"
                        nodeColor={(n: AppNode) => {
                            const taskDef = TaskRegistry[n.data?.type]
                            if (n.data?.type === TaskType.TRIGGER) return 'hsl(var(--primary))'
                            if (taskDef?.category === TaskCategory.OLIVEPAY) return '#10b981'
                            if (n.data?.type === TaskType.APPROVAL_GATE) return '#f59e0b'
                            return 'hsl(var(--muted-foreground))'
                        }}
                        maskColor="hsl(var(--background) / 0.8)"
                        style={{ backgroundColor: 'hsl(var(--card))' }}
                        className="hidden md:block !bg-card border border-border shadow-sm rounded-xl overflow-hidden !top-4 !right-4"
                    />

                    {/* Floating Studio Toolbar */}
                    <Panel position="top-left" className="flex items-center gap-1.5 bg-card/95 backdrop-blur-md border border-border rounded-xl p-1.5 shadow-md">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                                isMenuOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                            title="Toggle Node Palette"
                        >
                            <Menu size={15} />
                            <span className="hidden sm:inline">Palette</span>
                        </button>
                        <div className="h-4 w-px bg-border" />
                        <button
                            onClick={handleAutoLayout}
                            className="p-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-1.5"
                            title="Auto-Align DAG Left-to-Right"
                        >
                            <LayoutGrid size={14} />
                            <span className="hidden sm:inline">Auto-Align</span>
                        </button>
                        <button
                            onClick={() => reactFlowInstance?.fitView({ padding: 0.2, duration: 250 })}
                            className="p-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Fit Canvas View"
                        >
                            <Maximize2 size={14} />
                        </button>
                        <div className="h-4 w-px bg-border" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-1"
                            title="Import Workflow JSON"
                        >
                            <Upload size={14} />
                        </button>
                        <button
                            onClick={handleExportJson}
                            className="p-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-1"
                            title="Export Workflow JSON"
                        >
                            <Download size={14} />
                        </button>
                        <div className="h-4 w-px bg-border hidden sm:block" />
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 text-[10px] font-mono font-bold text-muted-foreground">
                            {nodes.length} nodes · {edges.length} edges
                        </span>
                    </Panel>
                </ReactFlow>
            </div>

            {/* Right Inspector Drawer */}
            <div
                className={`h-full transition-all duration-300 ease-in-out flex-shrink-0 border-l bg-background relative z-20 ${
                    selectedNode ? 'w-80 sm:w-96 opacity-100' : 'w-0 opacity-0 pointer-events-none border-l-0'
                }`}
                style={{ minWidth: 0 }}
            >
                {selectedNode && selectedTask && (
                    <aside
                        className="w-full h-full bg-background p-4 flex flex-col gap-4 overflow-y-auto z-10"
                        onKeyDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between pb-3 border-b shrink-0 gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                                <div className={`p-2 rounded-lg shrink-0 ${
                                    selectedTask.category === TaskCategory.OLIVEPAY
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-primary/10 text-primary'
                                }`}>
                                    {React.createElement(selectedTask.icon, { size: 18 })}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-xs truncate">{selectedTask.label}</h3>
                                    <p className="text-[10px] text-muted-foreground font-mono truncate">{selectedNode.id}</p>
                                    {selectedTask.category && (
                                        <Badge variant="outline" className="text-[9px] font-black uppercase mt-1 px-1.5 py-0">
                                            {selectedTask.category === TaskCategory.OLIVEPAY && <Sparkles size={9} className="mr-1 text-emerald-500" />}
                                            {selectedTask.category.replace(/_/g, ' ')}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={handleDuplicateSelectedNode}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                    title="Duplicate Node"
                                >
                                    <Copy size={14} />
                                </button>
                                <button
                                    onClick={handleDeleteSelectedNode}
                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                    title="Delete Node"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {selectedTask.description && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/30 p-2.5 rounded-lg border">
                                {selectedTask.description}
                            </p>
                        )}

                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest shrink-0 flex items-center justify-between">
                            <span>Node Inputs</span>
                            <span className="font-mono text-[9px] font-normal normal-case">Use {'{ }'} to bind upstream outputs</span>
                        </div>

                        <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pb-10 relative z-30 pointer-events-auto">
                            {selectedTask.inputs.map((inputSchema) => {
                                if (selectedNode.data.type === TaskType.TRIGGER) {
                                    const currentTrigger = selectedNode.data.inputs?.triggerType || 'MANUAL'
                                    if (inputSchema.name === 'cronExpression' && currentTrigger !== 'CRON') return null
                                    if (inputSchema.name === 'applicationType' && currentTrigger !== 'APPLICATION_SUBMIT') return null
                                    if (inputSchema.name === 'webhookSecret' && currentTrigger !== 'WEBHOOK') return null
                                }

                                const val = selectedNode.data.inputs?.[inputSchema.name]
                                const isEndpointSelector =
                                    inputSchema.name === 'endpointId' && (dynamicOptions?.endpoints?.length ?? 0) > 0

                                return (
                                    <div key={inputSchema.name} className="space-y-1">
                                        <label className="text-[11px] font-bold flex items-center justify-between">
                                            <span className="font-mono">{inputSchema.name}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-mono text-muted-foreground uppercase">{inputSchema.type}</span>
                                                {inputSchema.required && <span className="text-destructive">*</span>}
                                            </div>
                                        </label>

                                        {isEndpointSelector ? (
                                            <select
                                                className="flex w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                value={val || ''}
                                                onChange={(e) => onNodeDataChange(selectedNode.id, inputSchema.name, e.target.value)}
                                            >
                                                <option value="">Select API Endpoint spec...</option>
                                                {dynamicOptions.endpoints!.map((ep) => (
                                                    <option key={ep.id} value={ep.id}>
                                                        [{ep.method}] {ep.label} ({ep.path})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : inputSchema.name === 'applicationType' ? (
                                            <select
                                                className="flex w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                value={val || ''}
                                                onChange={(e) => onNodeDataChange(selectedNode.id, inputSchema.name, e.target.value)}
                                            >
                                                <option value="" disabled>Select a Product Type...</option>
                                                {dynamicOptions?.applications?.map((a) => (
                                                    <option key={a.id} value={a.id}>{a.label}</option>
                                                ))}
                                            </select>
                                        ) : inputSchema.type === 'STRING' && inputSchema.name === 'workflowId' ? (
                                            <select
                                                className="flex w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                value={val || ''}
                                                onChange={(e) => onNodeDataChange(selectedNode.id, inputSchema.name, e.target.value)}
                                            >
                                                <option value="" disabled>Select a workflow...</option>
                                                {dynamicOptions?.workflows?.map((w) => (
                                                    <option key={w.id} value={w.id}>{w.label}</option>
                                                ))}
                                            </select>
                                        ) : (inputSchema.type === 'STRING' && inputSchema.options) || inputSchema.type === 'SELECT' ? (
                                            <select
                                                className="flex w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                value={val || ''}
                                                onChange={(e) => onNodeDataChange(selectedNode.id, inputSchema.name, e.target.value)}
                                            >
                                                <option value="" disabled>Select {inputSchema.name}...</option>
                                                {inputSchema.options?.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        ) : inputSchema.type === 'PROVIDER' ? (
                                            <select
                                                className="flex w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                value={val || ''}
                                                onChange={(e) => onNodeDataChange(selectedNode.id, inputSchema.name, e.target.value)}
                                            >
                                                <option value="" disabled>Select a provider...</option>
                                                {dynamicOptions?.providers?.map((p) => (
                                                    <option key={p.id} value={p.id}>{p.label}</option>
                                                ))}
                                            </select>
                                        ) : inputSchema.type === 'CREDENTIAL' ? (
                                            <select
                                                className="flex w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                value={val || ''}
                                                onChange={(e) => onNodeDataChange(selectedNode.id, inputSchema.name, e.target.value)}
                                            >
                                                <option value="" disabled>Select a Vault secret...</option>
                                                {dynamicOptions?.secrets?.map((s) => (
                                                    <option key={s.id} value={s.id}>{s.label}</option>
                                                ))}
                                            </select>
                                        ) : inputSchema.type === 'BOOLEAN' ? (
                                            <select
                                                className="flex w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                value={String(val ?? 'false')}
                                                onChange={(e) => onNodeDataChange(selectedNode.id, inputSchema.name, e.target.value === 'true')}
                                            >
                                                <option value="false">False</option>
                                                <option value="true">True</option>
                                            </select>
                                        ) : inputSchema.type === 'STRING' || inputSchema.type === 'NUMBER' ? (
                                            <div className="flex items-center gap-1.5">
                                                <Input
                                                    type="text"
                                                    className="h-9 text-xs font-mono"
                                                    value={val ?? ''}
                                                    onChange={(e) => {
                                                        const raw = e.target.value
                                                        if (inputSchema.type === 'NUMBER' && raw !== '' && !raw.includes('{{') && !isNaN(Number(raw))) {
                                                            onNodeDataChange(selectedNode.id, inputSchema.name, Number(raw))
                                                        } else {
                                                            onNodeDataChange(selectedNode.id, inputSchema.name, raw)
                                                        }
                                                    }}
                                                    placeholder={inputSchema.helperText || `Enter ${inputSchema.name}...`}
                                                />
                                                <VariableSelector
                                                    nodeId={selectedNode.id}
                                                    onSelectVariable={(v) => appendVariableToInput(selectedNode.id, inputSchema.name, v)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-1.5">
                                                <Textarea
                                                    className="min-h-[84px] font-mono text-xs flex-1"
                                                    value={
                                                        typeof val === 'object' && val !== null
                                                            ? JSON.stringify(val, null, 2)
                                                            : val || ''
                                                    }
                                                    onChange={(e) => {
                                                        if (inputSchema.type === 'TEXTAREA') {
                                                            onNodeDataChange(selectedNode.id, inputSchema.name, e.target.value)
                                                            return
                                                        }
                                                        try {
                                                            onNodeDataChange(selectedNode.id, inputSchema.name, JSON.parse(e.target.value))
                                                        } catch {
                                                            onNodeDataChange(selectedNode.id, inputSchema.name, e.target.value)
                                                        }
                                                    }}
                                                    placeholder={inputSchema.helperText || `{ "example": "value" }`}
                                                />
                                                <VariableSelector
                                                    nodeId={selectedNode.id}
                                                    onSelectVariable={(v) => appendVariableToInput(selectedNode.id, inputSchema.name, v)}
                                                />
                                            </div>
                                        )}

                                        {inputSchema.helperText && (
                                            <p className="text-[10px] text-muted-foreground leading-snug">{inputSchema.helperText}</p>
                                        )}
                                    </div>
                                )
                            })}
                            {selectedTask.inputs.length === 0 && (
                                <div className="text-xs text-muted-foreground italic text-center p-4 border rounded-lg bg-muted/20">
                                    This node requires no configuration inputs.
                                </div>
                            )}

                            {/* Outputs Preview */}
                            {selectedTask.outputs.length > 0 && (
                                <div className="pt-3 border-t space-y-1.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        Emitted Outputs (Referenceable Downstream)
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedTask.outputs.map((o) => (
                                            <code
                                                key={o.name}
                                                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted border text-foreground"
                                            >
                                                {`{{${selectedNode.data.type === TaskType.TRIGGER ? 'TRIGGER_PAYLOAD' : selectedNode.id}.${o.name}}}`}
                                            </code>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    )
}

export function CoptellerFlowEditor(props: FlowEditorProps) {
    return (
        <ReactFlowProvider>
            <FlowEditorInner
                {...props}
                dynamicOptions={props.dynamicOptions || { providers: [], secrets: [], workflows: [], applications: [], endpoints: [] }}
            />
        </ReactFlowProvider>
    )
}
