"use client"

import * as React from "react"
import Link from "next/link"
import {
    PlusCircle, Edit2, Play, RefreshCw, Loader2, Search, Copy,
    Trash2, ToggleLeft, Upload, X, Check, Building2, Workflow
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface WorkflowRow {
    id: string
    name: string
    description: string
    status: "PUBLISHED" | "DRAFT"
    trigger: string
    cronExpression?: string
    nodeCount: number
    lastRunAt?: string
    lastRunStatus?: string
    updatedAt?: string
    cooperativeId?: string
    raw: any
}

export default function SuperadminWorkflowsPage() {
    const [workflows, setWorkflows] = React.useState<WorkflowRow[]>([])
    const [cooperatives, setCooperatives] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [busyId, setBusyId] = React.useState<string | null>(null)
    const [bootstrapping, setBootstrapping] = React.useState(false)

    // Filters
    const [search, setSearch] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState("ALL")
    const [coopFilter, setCoopFilter] = React.useState("ALL")

    // Inline Rename
    const [renamingId, setRenamingId] = React.useState<string | null>(null)
    const [renameVal, setRenameVal] = React.useState("")

    // SDL Import Modal
    const [showImportModal, setShowImportModal] = React.useState(false)
    const [sdlText, setSdlText] = React.useState("")
    const [importingSdl, setImportingSdl] = React.useState(false)

    const fetchWorkflows = React.useCallback(async () => {
        try {
            setLoading(true)
            const [wfRes, coopsRes] = await Promise.all([
                fetch("/api/workflows?limit=250&sort=-updatedAt"),
                fetch("/api/copteller/admin/cooperatives").catch(() => null),
            ])
            const wfData = await wfRes.json().catch(() => ({}))
            const coopsData = coopsRes ? await coopsRes.json().catch(() => ({})) : {}

            if (Array.isArray(wfData.docs)) {
                setWorkflows(
                    wfData.docs.map((wf: any) => {
                        const def = wf.definition || {}
                        const triggerNode = Array.isArray(def.nodes)
                            ? def.nodes.find((n: any) => n.data?.type === "TRIGGER")
                            : null
                        return {
                            id: String(wf.id),
                            name: wf.name || "Untitled Workflow",
                            description: wf.description || "",
                            status: wf.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
                            trigger: triggerNode?.data?.inputs?.triggerType || wf.trigger || "MANUAL",
                            cronExpression: triggerNode?.data?.inputs?.cronExpression || wf.cronExpression || undefined,
                            nodeCount: Array.isArray(def.nodes) ? def.nodes.length : 0,
                            lastRunAt: wf.lastRunAt,
                            lastRunStatus: wf.lastRunStatus,
                            updatedAt: wf.updatedAt,
                            cooperativeId:
                                typeof wf.cooperative === "object" && wf.cooperative !== null
                                    ? String(wf.cooperative.id)
                                    : wf.cooperative
                                      ? String(wf.cooperative)
                                      : undefined,
                            raw: wf,
                        }
                    })
                )
            }
            if (Array.isArray(coopsData.cooperatives)) setCooperatives(coopsData.cooperatives)
        } catch {
            toast.error("Failed to load workflow pipelines")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchWorkflows()
    }, [fetchWorkflows])

    const handleRenameSave = async (id: string) => {
        const trimmed = renameVal.trim()
        setRenamingId(null)
        if (!trimmed) return
        try {
            const res = await fetch(`/api/workflows/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmed }),
            })
            if (!res.ok) throw new Error("Rename failed")
            toast.success("Workflow renamed")
            fetchWorkflows()
        } catch (err: any) {
            toast.error(err.message || "Failed to rename")
        }
    }

    const handleToggleStatus = async (wf: WorkflowRow) => {
        setBusyId(wf.id)
        try {
            const nextStatus = wf.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
            const res = await fetch(`/api/workflows/${wf.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus }),
            })
            if (!res.ok) throw new Error("Failed to toggle status")
            toast.success(`Workflow ${nextStatus === "PUBLISHED" ? "published" : "unpublished"}`)
            fetchWorkflows()
        } catch (err: any) {
            toast.error(err.message || "Status update failed")
        } finally {
            setBusyId(null)
        }
    }

    const handleDuplicate = async (wf: WorkflowRow) => {
        setBusyId(wf.id)
        try {
            const res = await fetch("/api/workflows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `${wf.name} (Copy)`,
                    description: wf.description,
                    status: "DRAFT",
                    trigger: wf.trigger,
                    definition: wf.raw?.definition || { nodes: [], edges: [] },
                    cooperative: wf.cooperativeId || null,
                }),
            })
            if (!res.ok) throw new Error("Failed to duplicate workflow")
            toast.success("Workflow duplicated as Draft")
            fetchWorkflows()
        } catch (err: any) {
            toast.error(err.message || "Duplicate failed")
        } finally {
            setBusyId(null)
        }
    }

    const handleDelete = async (wf: WorkflowRow) => {
        if (!confirm(`Delete workflow "${wf.name}"? This cannot be undone.`)) return
        setBusyId(wf.id)
        try {
            const res = await fetch(`/api/workflows/${wf.id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Delete failed")
            toast.success(`Deleted "${wf.name}"`)
            fetchWorkflows()
        } catch (err: any) {
            toast.error(err.message || "Delete failed")
        } finally {
            setBusyId(null)
        }
    }

    const handleExecute = async (wf: WorkflowRow) => {
        setBusyId(wf.id)
        const tId = toast.loading(`Executing "${wf.name}"...`)
        try {
            const res = await fetch(`/api/workflows/${wf.id}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trigger: "MANUAL", inputData: {} }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "Execution failed")
            toast.success(`Executed! Run ID: ${data.executionId}`, { id: tId })
            fetchWorkflows()
        } catch (err: any) {
            toast.error(err.message || "Execution failed", { id: tId })
        } finally {
            setBusyId(null)
        }
    }

    const handleBootstrapOlivePay = async () => {
        setBootstrapping(true)
        const tId = toast.loading("Bootstrapping OlivePay Blueprint (24 endpoints) & 8 SDL Workflows...")
        try {
            const res = await fetch("/api/workflows/bootstrap?filter=olivepay&bind=1", { method: "POST" })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "Bootstrap failed")
            toast.success(
                `Bootstrapped ${data.summary?.blueprintsProcessed || 1} blueprint & ${data.summary?.workflowsProcessed || 8} OlivePay workflows!`,
                { id: tId }
            )
            fetchWorkflows()
        } catch (err: any) {
            toast.error(err.message || "Bootstrap failed", { id: tId })
        } finally {
            setBootstrapping(false)
        }
    }

    const handleImportSdl = async () => {
        if (!sdlText.trim()) return
        setImportingSdl(true)
        try {
            const parsed = JSON.parse(sdlText)
            const res = await fetch("/api/workflows/import-sdl", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "SDL import failed")
            toast.success("SDL Workflow imported & compiled!")
            setShowImportModal(false)
            setSdlText("")
            fetchWorkflows()
        } catch (err: any) {
            toast.error(err.message || "Invalid SDL JSON")
        } finally {
            setImportingSdl(false)
        }
    }

    const filtered = workflows.filter((wf) => {
        const q = search.toLowerCase()
        const matchQ = !q || wf.name.toLowerCase().includes(q) || wf.description.toLowerCase().includes(q) || wf.trigger.toLowerCase().includes(q)
        const matchStatus = statusFilter === "ALL" || wf.status === statusFilter
        const matchCoop =
            coopFilter === "ALL" ||
            (coopFilter === "GLOBAL" ? !wf.cooperativeId : String(wf.cooperativeId) === String(coopFilter))
        return matchQ && matchStatus && matchCoop
    })

    const publishedCount = workflows.filter((w) => w.status === "PUBLISHED").length
    const healthyCount = workflows.filter((w) => w.lastRunStatus === "COMPLETED").length
    const failedCount = workflows.filter((w) => w.lastRunStatus === "FAILED").length

    return (
        <div className="w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                        <Workflow className="h-3 w-3" /> Automation Engine &bull; Visual DAG Orchestrator
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Workflow Pipelines</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Visual orchestration studio powering OlivePay SubWallets, Escrow Holds, NIP Payouts, KYC upgrades, and multi-stage approvals.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} className="h-9 rounded-xl text-xs font-bold gap-1.5 whitespace-nowrap">
                        <Upload className="h-3.5 w-3.5" /> Import SDL
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={bootstrapping}
                        onClick={handleBootstrapOlivePay}
                        className="h-9 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-black gap-1.5 whitespace-nowrap"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${bootstrapping ? "animate-spin" : ""}`} />
                        Bootstrap OlivePay
                    </Button>
                    <Link
                        href="/copteller/superadmin/workflows/new/edit"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center font-black text-xs h-9 px-4 rounded-xl shadow-sm gap-1.5 whitespace-nowrap"
                    >
                        <PlusCircle className="h-4 w-4" /> Create Workflow
                    </Link>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Total Workflows", value: workflows.length, sub: "Registered DAG pipelines" },
                    { label: "Published Live", value: publishedCount, sub: `${workflows.length - publishedCount} draft` },
                    { label: "Healthy Last Runs", value: healthyCount, sub: "Completed without error" },
                    { label: "Attention Required", value: failedCount, sub: failedCount > 0 ? "Inspect Run History" : "All active runs clean" },
                ].map((k) => (
                    <div key={k.label} className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">{k.label}</p>
                        <p className="text-2xl font-black font-mono text-foreground">{k.value}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{k.sub}</p>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                <div className="relative sm:col-span-2 lg:col-span-6">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search workflows by name, trigger, or description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 pl-9 pr-9 text-sm rounded-xl border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <X size={14} />
                        </button>
                    )}
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 px-3 text-xs font-bold rounded-xl border bg-background lg:col-span-3"
                >
                    <option value="ALL">All Statuses</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                </select>
                <select
                    value={coopFilter}
                    onChange={(e) => setCoopFilter(e.target.value)}
                    className="h-10 px-3 text-xs font-bold rounded-xl border bg-background lg:col-span-3"
                >
                    <option value="ALL">All Cooperatives &amp; Global</option>
                    <option value="GLOBAL">Global / System-Wide Only</option>
                    {cooperatives.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Content */}
            {loading && workflows.length === 0 ? (
                <div className="border rounded-2xl bg-card p-16 flex justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="border rounded-2xl bg-card p-12 text-center text-muted-foreground space-y-2">
                    <Workflow className="h-10 w-10 mx-auto opacity-30" />
                    <p className="font-semibold text-foreground">No workflows found</p>
                    <p className="text-xs">Click &quot;Bootstrap OlivePay&quot; to seed 8 production workflows or create one visually.</p>
                </div>
            ) : (
                <>
                    {/* MOBILE & TABLET CARDS (< lg) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
                        {filtered.map((wf) => {
                            const coopObj = cooperatives.find((c) => String(c.id) === String(wf.cooperativeId))
                            const isBusy = busyId === wf.id
                            return (
                                <div key={wf.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between gap-3.5 min-w-0">
                                    <div className="space-y-2 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <Link href={`/copteller/superadmin/workflows/${wf.id}/edit`} className="font-bold text-sm text-foreground hover:text-primary leading-snug line-clamp-2">
                                                {wf.name}
                                            </Link>
                                            <Badge variant={wf.status === "PUBLISHED" ? "default" : "secondary"} className="text-[10px] font-bold shrink-0 whitespace-nowrap">
                                                {wf.status === "PUBLISHED" ? "Published" : "Draft"}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{wf.description || "Visual DAG pipeline"}</p>
                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono bg-background whitespace-nowrap">
                                                {wf.trigger}
                                            </span>
                                            <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                                                {wf.nodeCount} nodes
                                            </span>
                                            <Badge variant="outline" className="text-[10px] gap-1 whitespace-nowrap">
                                                <Building2 size={10} /> {coopObj?.name || "Global"}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                                        <Link
                                            href={`/copteller/superadmin/workflows/${wf.id}/edit`}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/20 text-xs font-bold whitespace-nowrap"
                                        >
                                            <Edit2 size={13} /> Open Studio
                                        </Link>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button disabled={isBusy} onClick={() => handleExecute(wf)} className="p-1.5 rounded-lg hover:bg-muted text-emerald-600" title="Execute Now">
                                                <Play size={14} />
                                            </button>
                                            <button disabled={isBusy} onClick={() => handleToggleStatus(wf)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title={wf.status === "PUBLISHED" ? "Unpublish" : "Publish"}>
                                                <ToggleLeft size={14} />
                                            </button>
                                            <button disabled={isBusy} onClick={() => handleDuplicate(wf)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Duplicate">
                                                <Copy size={14} />
                                            </button>
                                            <button disabled={isBusy} onClick={() => handleDelete(wf)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* DESKTOP TABLE (lg+) */}
                    <div className="hidden lg:block w-full border rounded-2xl shadow-sm bg-card overflow-hidden">
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-sm text-left table-auto">
                                <thead className="text-[11px] text-muted-foreground uppercase bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-4 py-3.5 font-bold whitespace-nowrap">Workflow Name</th>
                                        <th className="px-3 py-3.5 font-bold whitespace-nowrap">Status &amp; Trigger</th>
                                        <th className="px-3 py-3.5 font-bold whitespace-nowrap">Nodes</th>
                                        <th className="px-3 py-3.5 font-bold whitespace-nowrap">Last Run</th>
                                        <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/70">
                                    {filtered.map((wf) => {
                                        const coopObj = cooperatives.find((c) => String(c.id) === String(wf.cooperativeId))
                                        const isBusy = busyId === wf.id
                                        return (
                                            <tr key={wf.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3.5 max-w-[300px]">
                                                    {renamingId === wf.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                autoFocus
                                                                value={renameVal}
                                                                onChange={(e) => setRenameVal(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") handleRenameSave(wf.id)
                                                                    if (e.key === "Escape") setRenamingId(null)
                                                                }}
                                                                className="px-2 py-0.5 text-sm font-semibold border rounded bg-background w-full"
                                                            />
                                                            <button onClick={() => handleRenameSave(wf.id)} className="p-1 text-emerald-600"><Check size={14} /></button>
                                                            <button onClick={() => setRenamingId(null)} className="p-1 text-muted-foreground"><X size={14} /></button>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onDoubleClick={() => { setRenamingId(wf.id); setRenameVal(wf.name) }}
                                                            title="Double-click to rename"
                                                            className="font-bold text-foreground cursor-pointer hover:text-primary truncate"
                                                        >
                                                            {wf.name}
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{wf.description || "Visual DAG pipeline"}</p>
                                                </td>
                                                <td className="px-3 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={wf.status === "PUBLISHED" ? "default" : "secondary"} className="text-[10px] font-bold">
                                                            {wf.status === "PUBLISHED" ? "Published" : "Draft"}
                                                        </Badge>
                                                        <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono bg-background">
                                                            {wf.trigger}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">· {coopObj?.name || "Global"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                                                    {wf.nodeCount} node{wf.nodeCount !== 1 ? "s" : ""}
                                                </td>
                                                <td className="px-3 py-3.5 text-xs whitespace-nowrap">
                                                    {wf.lastRunAt ? (
                                                        <div>
                                                            <div className="text-foreground">{new Date(wf.lastRunAt).toLocaleString()}</div>
                                                            <div className={`text-[10px] font-bold ${
                                                                wf.lastRunStatus === "COMPLETED" ? "text-emerald-600" : wf.lastRunStatus === "FAILED" ? "text-red-500" : "text-amber-500"
                                                            }`}>
                                                                {wf.lastRunStatus}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">Never run</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        <Link
                                                            href={`/copteller/superadmin/workflows/${wf.id}/edit`}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/20 text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
                                                            title="Open Visual Flow Studio"
                                                        >
                                                            <Edit2 size={13} className="shrink-0" /> Studio
                                                        </Link>
                                                        <button
                                                            disabled={isBusy}
                                                            onClick={() => handleExecute(wf)}
                                                            className="p-1.5 rounded-lg hover:bg-muted text-emerald-600 shrink-0 disabled:opacity-40"
                                                            title="Execute Now"
                                                        >
                                                            <Play size={14} />
                                                        </button>
                                                        <button
                                                            disabled={isBusy}
                                                            onClick={() => handleToggleStatus(wf)}
                                                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                                                            title={wf.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                                                        >
                                                            <ToggleLeft size={14} />
                                                        </button>
                                                        <button
                                                            disabled={isBusy}
                                                            onClick={() => handleDuplicate(wf)}
                                                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                                                            title="Duplicate Workflow"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                        <button
                                                            disabled={isBusy}
                                                            onClick={() => handleDelete(wf)}
                                                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                                                            title="Delete Workflow"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Import SDL Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black">Import Declarative SDL Workflow</h3>
                                <p className="text-xs text-muted-foreground">Paste a Copteller SDL JSON specification to compile into a published visual workflow.</p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                                <X size={16} />
                            </button>
                        </div>
                        <textarea
                            rows={10}
                            value={sdlText}
                            onChange={(e) => setSdlText(e.target.value)}
                            placeholder={'{\n  "name": "My OlivePay Flow",\n  "trigger": "MANUAL",\n  "steps": []\n}'}
                            className="w-full font-mono text-xs p-3 rounded-xl border bg-background"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowImportModal(false)}>Cancel</Button>
                            <Button size="sm" disabled={importingSdl} onClick={handleImportSdl}>
                                {importingSdl ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                                Import &amp; Compile
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
