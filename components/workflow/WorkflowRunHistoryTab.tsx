'use client'
import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
    PlayCircle, CheckCircle2, XCircle, Clock, ChevronRight,
    FileText, Terminal, AlertCircle, Loader2, ShieldCheck
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface PhaseRecord {
    phaseNumber?: number
    nodeId?: string
    nodeType?: string
    status?: string
    inputs?: any
    outputs?: any
    logs?: Array<{ level: string; message: string; timestamp?: string }>
}

interface Execution {
    id: string
    status: string
    trigger: string
    startedAt: string
    completedAt?: string
    inputData?: any
    phases?: PhaseRecord[]
    approvalRequests?: any[]
}

interface WorkflowRunHistoryTabProps {
    workflowId: string
    refreshKey?: number
}

export function WorkflowRunHistoryTab({ workflowId, refreshKey }: WorkflowRunHistoryTabProps) {
    const [runs, setRuns] = useState<Execution[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedRun, setSelectedRun] = useState<Execution | null>(null)
    const [resuming, setResuming] = useState(false)

    const loadRuns = async () => {
        if (workflowId === 'new') return
        setLoading(true)
        try {
            const res = await fetch(`/api/workflow-executions?where[workflow][equals]=${workflowId}&sort=-startedAt&limit=20`)
            const data = await res.json()
            setRuns(data.docs || [])
        } catch (e) {
            console.error('Failed to fetch runs', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadRuns()
    }, [workflowId, refreshKey])

    const handleApprovalDecision = async (executionId: string, decision: 'APPROVED' | 'REJECTED') => {
        setResuming(true)
        try {
            const res = await fetch(`/api/workflows/executions/${executionId}/resume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision, notes: `${decision} from Workflow Run History` }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || 'Resume failed')
            toast.success(`Execution ${decision.toLowerCase()} — final status: ${data.status}`)
            await loadRuns()
            setSelectedRun(null)
        } catch (e: any) {
            toast.error(e.message || 'Failed to submit decision')
        } finally {
            setResuming(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-medium uppercase tracking-widest">Loading Execution Ledger...</p>
            </div>
        )
    }

    if (runs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <PlayCircle className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No Runs Yet</h3>
                <p className="text-sm max-w-[280px] mt-1 italic">
                    Workflows that have been triggered or tested will appear here with full phase telemetry.
                </p>
            </div>
        )
    }

    const flattenedLogs = (selectedRun?.phases || []).flatMap((p) =>
        (p.logs || []).map((l) => ({ ...l, nodeType: p.nodeType, nodeId: p.nodeId }))
    )

    const aggregatedOutputs = Object.fromEntries(
        (selectedRun?.phases || []).map((p) => [p.nodeId || p.nodeType || 'step', { status: p.status, outputs: p.outputs || {} }])
    )

    const latencyMs =
        selectedRun?.startedAt && selectedRun?.completedAt
            ? Math.max(0, new Date(selectedRun.completedAt).getTime() - new Date(selectedRun.startedAt).getTime())
            : null

    return (
        <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm">
            <div className="flex flex-1 min-h-0 overflow-hidden divide-x border-t">
                <div className={cn('flex flex-col transition-all duration-300 min-h-0', selectedRun ? 'w-0 md:w-[380px] overflow-hidden' : 'w-full')}>
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="p-2 space-y-1">
                            {runs.map((run) => (
                                <button
                                    key={run.id}
                                    onClick={() => setSelectedRun(run)}
                                    className={cn(
                                        'w-full text-left p-3 rounded-xl transition-all group relative border border-transparent hover:border-primary/10',
                                        selectedRun?.id === run.id ? 'bg-primary/5 border-primary/20 shadow-sm' : 'hover:bg-muted/50'
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            {run.status === 'COMPLETED' ? (
                                                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                            ) : run.status === 'FAILED' ? (
                                                <XCircle size={16} className="text-destructive shrink-0" />
                                            ) : (
                                                <Clock size={16} className="text-amber-500 shrink-0 animate-pulse" />
                                            )}
                                            <span className="font-mono text-[10px] font-bold text-primary opacity-70">
                                                RUN #{String(run.id).slice(0, 8).toUpperCase()}
                                            </span>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase border-none bg-muted font-black tracking-tighter">
                                            {run.trigger}
                                        </Badge>
                                    </div>
                                    <div className="mt-2 flex items-end justify-between">
                                        <div>
                                            <p className="text-xs font-bold truncate max-w-[220px]">
                                                {(run.phases || []).length} Phase(s) · {run.status}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                {run.startedAt ? format(new Date(run.startedAt), 'MMM d, HH:mm:ss') : '—'}
                                            </p>
                                        </div>
                                        <ChevronRight size={14} className={cn('text-muted-foreground transition-transform', selectedRun?.id === run.id ? 'rotate-90 text-primary' : 'group-hover:translate-x-0.5')} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {selectedRun && (
                    <div className="flex-1 flex flex-col min-w-0 bg-background/80">
                        <header className="h-14 border-b px-4 flex items-center justify-between bg-muted/10 shrink-0">
                            <div className="flex items-center gap-2">
                                <Terminal size={14} className="text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                    Execution Telemetry #{selectedRun.id}
                                </span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedRun(null)} className="h-8 text-[10px] font-black uppercase">
                                Close Trace
                            </Button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-muted/30 border border-muted/50">
                                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mb-1">Status</p>
                                    <Badge className={cn('uppercase text-[10px] border-none font-bold', selectedRun.status === 'COMPLETED' ? 'bg-emerald-500 text-white' : selectedRun.status === 'WAITING_APPROVAL' ? 'bg-amber-500 text-white' : 'bg-destructive text-white')}>
                                        {selectedRun.status}
                                    </Badge>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/30 border border-muted/50">
                                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mb-1">Latency</p>
                                    <p className="text-xs font-mono font-bold">{latencyMs !== null ? `${latencyMs} ms` : 'In Progress'}</p>
                                </div>
                            </div>

                            {selectedRun.status === 'WAITING_APPROVAL' && (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                                    <p className="text-xs font-black text-amber-600 flex items-center gap-2">
                                        <ShieldCheck size={15} /> Paused at Approval Gate
                                    </p>
                                    <div className="flex gap-2">
                                        <Button size="sm" disabled={resuming} onClick={() => handleApprovalDecision(selectedRun.id, 'APPROVED')} className="bg-emerald-600 text-white text-xs font-bold">
                                            Approve &amp; Resume
                                        </Button>
                                        <Button size="sm" variant="destructive" disabled={resuming} onClick={() => handleApprovalDecision(selectedRun.id, 'REJECTED')} className="text-xs font-bold">
                                            Reject &amp; Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                                    <FileText size={12} /> Phase Log Stream ({flattenedLogs.length})
                                </h4>
                                <div className="space-y-2 font-mono text-[11px] leading-relaxed">
                                    {flattenedLogs.length > 0 ? (
                                        flattenedLogs.map((log, idx) => (
                                            <div key={idx} className="flex gap-2.5 text-foreground/80">
                                                <span className="text-muted-foreground opacity-60 shrink-0">
                                                    {log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss') : '--:--:--'}
                                                </span>
                                                <span className={cn('px-1 rounded font-bold uppercase text-[9px] h-fit', log.level === 'error' ? 'text-destructive bg-destructive/10' : 'text-primary bg-primary/10')}>
                                                    {log.level}
                                                </span>
                                                <span className="text-muted-foreground shrink-0">[{log.nodeType}]</span>
                                                <span>{log.message}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                            <AlertCircle size={18} className="mb-1 opacity-30" />
                                            <p className="text-[10px] font-bold italic">No phase logs recorded for this execution.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mb-2">Trigger Input Payload</p>
                                    <pre className="p-3 rounded-xl bg-muted/50 text-[10px] overflow-auto border font-mono max-h-48">
                                        {JSON.stringify(selectedRun.inputData || {}, null, 2)}
                                    </pre>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mb-2">Phase Outputs Manifest</p>
                                    <pre className="p-3 rounded-xl bg-muted/50 text-[10px] overflow-auto border font-mono max-h-64">
                                        {JSON.stringify(aggregatedOutputs, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
