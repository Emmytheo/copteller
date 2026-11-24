"use client"

import * as React from "react"
import Link from "next/link"
import { Eye, Info, PlayCircle, Trash2, CheckCircle2, XCircle, Loader2, RefreshCw, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CoptellerSubsystemNav } from "@/components/copteller/subsystem-nav"

export default function CoptellerWorkflowRunsPage() {
    const [runs, setRuns] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [statusFilter, setStatusFilter] = React.useState("ALL")
    const [actingId, setActingId] = React.useState<string | null>(null)

    const loadRuns = React.useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/workflow-executions?limit=100&sort=-startedAt&depth=1")
            const data = await res.json().catch(() => ({}))
            setRuns(Array.isArray(data.docs) ? data.docs : [])
        } catch {
            toast.error("Failed to load workflow execution runs")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        loadRuns()
    }, [loadRuns])

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this execution record?")) return
        setActingId(id)
        try {
            const res = await fetch(`/api/workflow-executions/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Delete failed")
            toast.success("Execution record deleted")
            loadRuns()
        } catch (err: any) {
            toast.error(err.message || "Delete failed")
        } finally {
            setActingId(null)
        }
    }

    const handleDecision = async (id: string, decision: "APPROVED" | "REJECTED") => {
        setActingId(id)
        try {
            const res = await fetch(`/api/workflows/executions/${id}/resume`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decision }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "Resume failed")
            toast.success(`Execution ${decision.toLowerCase()} and resumed!`)
            loadRuns()
        } catch (err: any) {
            toast.error(err.message || "Failed to resume execution")
        } finally {
            setActingId(null)
        }
    }

    const completed = runs.filter((r) => r.status === "COMPLETED").length
    const failed = runs.filter((r) => r.status === "FAILED").length
    const inFlight = runs.filter((r) => ["PENDING", "RUNNING", "WAITING_APPROVAL"].includes(r.status)).length
    const filtered = statusFilter === "ALL" ? runs : runs.filter((r) => r.status === statusFilter)

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col gap-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                        <History className="h-3 w-3" /> Automation Telemetry
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Workflow Run History</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Inspect phase-by-phase execution logs, resolved payload inputs, OlivePay API outputs, and approval gates.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadRuns} className="h-9 rounded-xl font-bold text-xs gap-1.5 self-start">
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Runs
                </Button>
            </div>

            <CoptellerSubsystemNav group="automation" />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {[
                    { label: "Total Recorded Runs", value: runs.length, sub: "Audit execution ledger" },
                    { label: "Completed", value: completed, sub: "Settled cleanly" },
                    { label: "Failed", value: failed, sub: "Inspect trace logs" },
                    { label: "In-Flight / Approval", value: inFlight, sub: "Pending or awaiting gate" },
                ].map((k) => (
                    <div key={k.label} className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{k.label}</p>
                        <p className="text-2xl font-black font-mono text-foreground">{k.value}</p>
                        <p className="text-[11px] text-muted-foreground">{k.sub}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                {["ALL", "COMPLETED", "FAILED", "WAITING_APPROVAL", "RUNNING"].map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                            statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {s.replace(/_/g, " ")}
                    </button>
                ))}
            </div>

            <div className="border rounded-2xl shadow-sm bg-card overflow-x-auto">
                {loading && runs.length === 0 ? (
                    <div className="p-16 flex justify-center">
                        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        <Info size={24} className="mx-auto mb-3 opacity-40" />
                        <h3 className="text-base font-bold text-foreground">No executions recorded</h3>
                        <p className="text-xs mt-1">Run a published workflow to inspect phase traces here.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left min-w-[820px]">
                        <thead className="text-[11px] text-muted-foreground uppercase bg-muted/50 border-b">
                            <tr>
                                <th className="px-5 py-3.5 font-bold">Execution ID</th>
                                <th className="px-4 py-3.5 font-bold">Workflow</th>
                                <th className="px-4 py-3.5 font-bold">Status</th>
                                <th className="px-4 py-3.5 font-bold">Trigger</th>
                                <th className="px-4 py-3.5 font-bold">Phases</th>
                                <th className="px-4 py-3.5 font-bold">Started At</th>
                                <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.map((run) => (
                                <tr key={run.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">#{run.id}</td>
                                    <td className="px-4 py-3.5">
                                        <div className="font-bold inline-flex items-center gap-2">
                                            <PlayCircle size={14} className="text-emerald-500 shrink-0" />
                                            {typeof run.workflow === "object" && run.workflow ? run.workflow.name : `Workflow #${run.workflow}`}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] font-bold ${
                                                run.status === "COMPLETED"
                                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25"
                                                    : run.status === "FAILED"
                                                      ? "bg-red-500/10 text-red-600 border-red-500/25"
                                                      : run.status === "WAITING_APPROVAL"
                                                        ? "bg-amber-500/10 text-amber-600 border-amber-500/25"
                                                        : "bg-blue-500/10 text-blue-600 border-blue-500/25"
                                            }`}
                                        >
                                            {run.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <Badge variant="secondary" className="text-[10px] font-mono">{run.trigger}</Badge>
                                    </td>
                                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                                        {Array.isArray(run.phases) ? run.phases.length : 0}
                                    </td>
                                    <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                                        {run.startedAt ? new Date(run.startedAt).toLocaleString() : "--"}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {run.status === "WAITING_APPROVAL" && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        disabled={actingId === String(run.id)}
                                                        onClick={() => handleDecision(String(run.id), "APPROVED")}
                                                        className="h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold gap-1"
                                                    >
                                                        <CheckCircle2 size={12} /> Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={actingId === String(run.id)}
                                                        onClick={() => handleDecision(String(run.id), "REJECTED")}
                                                        className="h-7 px-2 rounded-lg text-red-600 border-red-500/30 text-[10px] font-bold gap-1"
                                                    >
                                                        <XCircle size={12} /> Reject
                                                    </Button>
                                                </>
                                            )}
                                            <Link
                                                href={`/copteller/superadmin/workflows/runs/${run.id}`}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-bold"
                                                title="Inspect Phase Trace"
                                            >
                                                <Eye size={13} /> Trace
                                            </Link>
                                            <button
                                                disabled={actingId === String(run.id)}
                                                onClick={() => handleDelete(String(run.id))}
                                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                                title="Delete Run"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
