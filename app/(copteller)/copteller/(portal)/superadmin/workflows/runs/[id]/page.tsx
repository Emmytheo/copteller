"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle, Trash2, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function CoptellerWorkflowRunDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = String(params?.id || "")

    const [run, setRun] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)
    const [acting, setActing] = React.useState(false)

    const loadRun = React.useCallback(async () => {
        if (!id) return
        try {
            setLoading(true)
            const res = await fetch(`/api/workflow-executions/${id}?depth=1`)
            if (!res.ok) throw new Error("Execution record not found")
            const data = await res.json()
            setRun(data)
        } catch (err: any) {
            toast.error(err.message || "Failed to load execution trace")
        } finally {
            setLoading(false)
        }
    }, [id])

    React.useEffect(() => {
        loadRun()
    }, [loadRun])

    const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
        setActing(true)
        try {
            const res = await fetch(`/api/workflows/executions/${id}/resume`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decision }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "Resume failed")
            toast.success(`Execution ${decision.toLowerCase()}!`)
            loadRun()
        } catch (err: any) {
            toast.error(err.message || "Decision failed")
        } finally {
            setActing(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("Delete this execution trace?")) return
        setActing(true)
        try {
            const res = await fetch(`/api/workflow-executions/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Delete failed")
            toast.success("Execution deleted")
            router.push("/copteller/superadmin/workflows/runs")
        } catch (err: any) {
            toast.error(err.message || "Delete failed")
            setActing(false)
        }
    }

    if (loading && !run) {
        return (
            <div className="p-16 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!run) {
        return (
            <div className="p-12 text-center space-y-3">
                <p className="font-bold">Execution #{id} not found.</p>
                <Link href="/copteller/superadmin/workflows/runs" className="text-xs text-primary hover:underline">
                    ← Back to Run History
                </Link>
            </div>
        )
    }

    const phases = Array.isArray(run.phases) ? run.phases : []
    const wfName = typeof run.workflow === "object" && run.workflow ? run.workflow.name : `Workflow #${run.workflow}`

    const StatusIcon = ({ status }: { status: string }) => {
        switch (status) {
            case "COMPLETED":
                return <CheckCircle className="text-emerald-500" size={18} />
            case "FAILED":
                return <XCircle className="text-red-500" size={18} />
            case "WAITING_APPROVAL":
                return <AlertCircle className="text-amber-500" size={18} />
            case "RUNNING":
                return <Clock className="text-blue-500 animate-pulse" size={18} />
            default:
                return <Clock className="text-muted-foreground" size={18} />
        }
    }

    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-start gap-3">
                    <Link
                        href="/copteller/superadmin/workflows/runs"
                        className="p-2 hover:bg-muted rounded-full transition-colors shrink-0"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Execution Trace</h1>
                            <Badge variant="outline" className="font-mono text-xs border-dashed">#{id}</Badge>
                            <Badge variant="outline" className="text-xs font-bold">{run.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Workflow: <strong className="text-foreground">{wfName}</strong> &bull; Trigger: {run.trigger} &bull; Started:{" "}
                            {run.startedAt ? new Date(run.startedAt).toLocaleString() : "--"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {run.status === "WAITING_APPROVAL" && (
                        <>
                            <Button
                                size="sm"
                                disabled={acting}
                                onClick={() => handleDecision("APPROVED")}
                                className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black"
                            >
                                Approve &amp; Resume
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={acting}
                                onClick={() => handleDecision("REJECTED")}
                                className="h-9 rounded-xl text-red-600 border-red-500/30 text-xs font-black"
                            >
                                Reject
                            </Button>
                        </>
                    )}
                    <Button variant="outline" size="sm" onClick={loadRun} className="h-9 rounded-xl text-xs font-bold gap-1.5">
                        <RefreshCw size={13} /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" disabled={acting} onClick={handleDelete} className="h-9 rounded-xl text-destructive border-destructive/30 text-xs font-bold gap-1.5">
                        <Trash2 size={13} /> Delete
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Phase-by-Phase Execution Timeline</h2>
                    {phases.length === 0 ? (
                        <p className="text-muted-foreground italic text-sm">No phases recorded.</p>
                    ) : (
                        phases.map((phase: any, index: number) => (
                            <div key={`${phase.nodeId}-${index}`} className="border rounded-2xl bg-card overflow-hidden shadow-sm">
                                <div className="p-4 flex items-center justify-between bg-muted/20 border-b gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <StatusIcon status={phase.status} />
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm truncate">{phase.nodeType}</div>
                                            <div className="text-[11px] text-muted-foreground font-mono truncate">Node: {phase.nodeId}</div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                                            Phase {phase.phaseNumber}
                                        </Badge>
                                        {phase.startedAt && (
                                            <div className="text-[11px] font-mono text-muted-foreground mt-1">
                                                {Math.max(
                                                    0,
                                                    new Date(phase.completedAt || new Date()).getTime() - new Date(phase.startedAt).getTime()
                                                )}ms
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 space-y-4 text-xs">
                                    {phase.outputs && Object.keys(phase.outputs).length > 0 && (
                                        <div>
                                            <div className="text-[10px] font-black text-muted-foreground uppercase mb-1.5">Outputs</div>
                                            <pre className="bg-muted/50 p-3 rounded-xl overflow-x-auto text-[11px] font-mono border">
                                                {JSON.stringify(phase.outputs, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                    {Array.isArray(phase.logs) && phase.logs.length > 0 && (
                                        <div>
                                            <div className="text-[10px] font-black text-muted-foreground uppercase mb-1.5">Execution Logs</div>
                                            <div className="bg-zinc-950 text-emerald-400 p-3 rounded-xl overflow-x-auto text-[11px] font-mono space-y-1">
                                                {phase.logs.map((log: any, i: number) => (
                                                    <div
                                                        key={i}
                                                        className={`flex gap-2 ${
                                                            log.level === "error" ? "text-red-400" : log.level === "warn" ? "text-amber-400" : ""
                                                        }`}
                                                    >
                                                        <span className="opacity-50 shrink-0">
                                                            [{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "--"}]
                                                        </span>
                                                        <span className="opacity-60 uppercase shrink-0">[{log.level || "info"}]</span>
                                                        <span className="break-all">{log.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="space-y-4">
                    <div className="border rounded-2xl bg-card p-4 shadow-sm">
                        <h3 className="font-black text-xs uppercase tracking-wider text-muted-foreground mb-3">Trigger Input Data</h3>
                        <pre className="bg-muted p-3 rounded-xl overflow-x-auto text-[11px] font-mono border">
                            {JSON.stringify(run.inputData || {}, null, 2)}
                        </pre>
                    </div>

                    <div className="border rounded-2xl bg-card p-4 shadow-sm space-y-2.5 text-xs">
                        <h3 className="font-black text-xs uppercase tracking-wider text-muted-foreground">Execution Metadata</h3>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Final Status</span>
                            <span className="font-bold">{run.status}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Deduplicated</span>
                            <span className="font-bold">{run.isDeduplicated ? "Yes" : "No"}</span>
                        </div>
                        {run.idempotencyKey && (
                            <div className="flex justify-between gap-2 pt-2 border-t">
                                <span className="text-muted-foreground shrink-0">Idempotency Key</span>
                                <span className="font-mono text-[10px] truncate">{String(run.idempotencyKey)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
