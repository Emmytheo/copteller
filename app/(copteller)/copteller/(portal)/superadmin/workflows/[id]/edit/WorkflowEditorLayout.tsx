'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ArrowLeft, Play, Save, Loader2, Check, Pencil, Layout, Activity, SlidersHorizontal, X } from 'lucide-react'
import { ThemeCustomizer } from '@/components/theme-customizer'
import { CoptellerFlowEditor, SaveWorkflowFn, DynamicOptions } from '@/components/copteller/CoptellerFlowEditor'
import { toast } from 'sonner'
import { renameWorkflow, runWorkflow } from './actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkflowRunHistoryTab } from '@/components/workflow/WorkflowRunHistoryTab'

interface WorkflowEditorLayoutProps {
    workflowId: string
    workflow: any
    dynamicOptions: DynamicOptions
}

export function WorkflowEditorLayout({ workflowId, workflow, dynamicOptions }: WorkflowEditorLayoutProps) {
    const saveFnRef = useRef<SaveWorkflowFn | null>(null)
    const [isSaving, setIsSaving] = useState<'draft' | 'published' | null>(null)
    const [isRunning, setIsRunning] = useState(false)
    const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'editor' | 'runs'>('editor')
    const [refreshKey, setRefreshKey] = useState(0)

    const [wfName, setWfName] = useState(workflow?.name || 'Untitled Workflow')
    const [currentStatus, setCurrentStatus] = useState<string>(workflow?.status || 'DRAFT')
    const [isEditingName, setIsEditingName] = useState(false)
    const nameInputRef = useRef<HTMLInputElement>(null)

    // Custom JSON Test Payload Modal
    const [showPayloadModal, setShowPayloadModal] = useState(false)
    const [testPayloadText, setTestPayloadText] = useState('{\n  "amount": 5000,\n  "narration": "Test Workflow Run"\n}')

    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const handleReady = useCallback((fn: SaveWorkflowFn) => {
        saveFnRef.current = fn
    }, [])

    const handleSave = async (status: 'draft' | 'published') => {
        if (!saveFnRef.current) {
            toast.error('Editor is still loading, please wait...')
            return
        }
        setIsSaving(status)
        try {
            await saveFnRef.current(status)
            setCurrentStatus(status === 'published' ? 'PUBLISHED' : 'DRAFT')
        } finally {
            setIsSaving(null)
        }
    }

    const handleNameSave = async () => {
        const trimmed = wfName.trim()
        if (!trimmed) {
            setWfName(workflow?.name || 'Untitled Workflow')
            setIsEditingName(false)
            return
        }
        if (workflowId !== 'new' && trimmed !== workflow?.name) {
            const result = await renameWorkflow(workflowId, trimmed)
            if (result.success) {
                toast.success('Workflow renamed')
            } else {
                toast.error(result.error || 'Failed to rename')
            }
        }
        setIsEditingName(false)
    }

    const executeTestRun = async (payloadObj?: Record<string, any>) => {
        if (workflowId === 'new') {
            toast.error('Please save and publish the workflow before testing.')
            return
        }
        if (currentStatus !== 'PUBLISHED') {
            toast.error('Workflow must be published before running. Click "Publish" first.')
            return
        }
        setIsRunning(true)
        setCurrentExecutionId(null)
        setShowPayloadModal(false)
        try {
            const result = await runWorkflow(workflowId, payloadObj || {})
            if (result.success && result.executionId) {
                toast.success(`Workflow executed! Run ID: ${result.executionId}`)
                setCurrentExecutionId(result.executionId)
                setRefreshKey((prev) => prev + 1)
                setActiveTab('runs')
            } else {
                toast.error(result.error || 'Execution failed.')
            }
        } catch (e: any) {
            toast.error(e.message || 'An unexpected error occurred.')
        } finally {
            setIsRunning(false)
        }
    }

    const handleTestRunWithPayload = () => {
        try {
            const parsed = testPayloadText.trim() ? JSON.parse(testPayloadText) : {}
            executeTestRun(parsed)
        } catch {
            toast.error('Invalid JSON in Test Payload')
        }
    }

    if (!mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex flex-col bg-background animate-in fade-in duration-200">
            <header className="h-14 bg-background border-b flex items-center justify-between px-2 sm:px-4 gap-2 shrink-0 overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Link
                        href="/copteller/superadmin/workflows"
                        className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground shrink-0"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div className="h-4 w-px bg-border my-auto shrink-0" />
                    <div className="flex items-center gap-2 min-w-0">
                        {isEditingName ? (
                            <input
                                ref={nameInputRef}
                                value={wfName}
                                onChange={(e) => setWfName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleNameSave()
                                    if (e.key === 'Escape') {
                                        setWfName(workflow?.name || 'Untitled Workflow')
                                        setIsEditingName(false)
                                    }
                                }}
                                onBlur={handleNameSave}
                                autoFocus
                                className="font-semibold text-sm bg-transparent border border-primary/50 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-[140px] sm:max-w-[240px] min-w-0"
                            />
                        ) : (
                            <div
                                className="font-semibold text-sm flex items-center gap-1.5 cursor-pointer group/name min-w-0"
                                onClick={() => setIsEditingName(true)}
                                title="Click to rename"
                            >
                                <span className="truncate">{wfName}</span>
                                <Pencil size={12} className="text-muted-foreground opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                            </div>
                        )}
                        <div
                            className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                currentStatus === 'PUBLISHED'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            }`}
                        >
                            {currentStatus === 'PUBLISHED' ? 'Published' : 'Draft'}
                        </div>
                    </div>
                </div>

                <div className="hidden lg:flex items-center justify-center flex-1 max-w-md mx-auto">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                        <TabsList className="grid grid-cols-2 bg-muted/60 h-9 p-1 rounded-lg">
                            <TabsTrigger
                                value="editor"
                                className="text-xs h-7 gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                                <Layout size={14} /> Design Canvas
                            </TabsTrigger>
                            <TabsTrigger
                                value="runs"
                                className="text-xs h-7 gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                                <Activity size={14} /> Execution Runs
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <ThemeCustomizer />
                    <button
                        onClick={() => setShowPayloadModal(true)}
                        disabled={isRunning || !!isSaving || workflowId === 'new'}
                        className="h-8 px-2 text-xs bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        title="Configure custom JSON input payload for Test Run"
                    >
                        <SlidersHorizontal size={13} />
                        <span className="hidden xl:inline">Payload</span>
                    </button>
                    <button
                        onClick={() => executeTestRun()}
                        disabled={isRunning || !!isSaving || workflowId === 'new'}
                        className="h-8 px-2.5 sm:px-3 text-xs bg-muted text-foreground hover:bg-muted/80 rounded-md font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="text-emerald-500" />}
                        <span className="hidden sm:inline">{isRunning ? 'Running...' : 'Test Run'}</span>
                    </button>
                    <button
                        onClick={() => handleSave('draft')}
                        disabled={!!isSaving}
                        className="h-8 px-2.5 sm:px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                        {isSaving === 'draft' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        <span className="hidden sm:inline">Save Draft</span>
                    </button>
                    <button
                        onClick={() => handleSave('published')}
                        disabled={!!isSaving}
                        className="h-8 px-2.5 sm:px-3 text-xs bg-emerald-600 text-white hover:bg-emerald-700 rounded-md font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {isSaving === 'published' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        <span className="hidden sm:inline">Publish</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 w-full relative min-h-0 overflow-hidden bg-background">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex flex-col min-h-0">
                    <TabsContent value="editor" className="flex-1 m-0 relative h-full min-h-0 data-[state=active]:flex flex-col">
                        <CoptellerFlowEditor
                            onReady={handleReady}
                            dynamicOptions={dynamicOptions}
                            workflowId={workflowId !== 'new' ? workflowId : undefined}
                            initialData={workflow?.definition as any}
                            runningExecutionId={currentExecutionId}
                        />
                    </TabsContent>

                    <TabsContent value="runs" className="flex-1 m-0 h-full min-h-0 data-[state=active]:flex flex-col">
                        <WorkflowRunHistoryTab workflowId={workflowId} refreshKey={refreshKey} />
                    </TabsContent>

                    <div className="lg:hidden h-14 bg-background border-t flex items-center px-4 shrink-0 pb-safe">
                        <TabsList className="bg-muted h-10 p-1 w-full grid grid-cols-2 rounded-xl">
                            <TabsTrigger value="editor" className="text-[10px] h-8 font-bold uppercase tracking-widest rounded-lg flex items-center gap-2">
                                <Layout size={14} /> Design
                            </TabsTrigger>
                            <TabsTrigger value="runs" className="text-[10px] h-8 font-bold uppercase tracking-widest rounded-lg flex items-center gap-2">
                                <Activity size={14} /> Runs
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </Tabs>
            </div>

            {/* Custom Test Payload Modal */}
            {showPayloadModal && (
                <div className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black">Test Run Input Payload (TRIGGER_PAYLOAD)</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Supply JSON values referenced by <code className="font-mono">{'{{TRIGGER_PAYLOAD.*}}'}</code> nodes.
                                </p>
                            </div>
                            <button onClick={() => setShowPayloadModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                                <X size={16} />
                            </button>
                        </div>
                        <textarea
                            rows={8}
                            value={testPayloadText}
                            onChange={(e) => setTestPayloadText(e.target.value)}
                            className="w-full font-mono text-xs p-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowPayloadModal(false)}
                                className="px-3.5 py-2 rounded-xl border text-xs font-bold hover:bg-muted"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTestRunWithPayload}
                                disabled={isRunning}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5"
                            >
                                <Play size={13} /> Execute With Payload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    )
}
