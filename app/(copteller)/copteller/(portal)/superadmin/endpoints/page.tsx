"use client"

import * as React from "react"
import Link from "next/link"
import {
    PlusCircle, Trash2, Search, Globe, Activity, Terminal,
    Loader2, X, Copy, Building2, CheckCircle2, XCircle, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

const METHOD_BADGE: Record<string, string> = {
    GET: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
    POST: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    PUT: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    PATCH: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25",
    DELETE: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
}

interface EndpointRow {
    id: string
    name: string
    description: string
    method: string
    path: string
    providerId: string
    providerName: string
    authOverride: string
    status: string
    cooperativeId?: string
    raw: any
}

export default function SuperadminEndpointsPage() {
    const [endpoints, setEndpoints] = React.useState<EndpointRow[]>([])
    const [providers, setProviders] = React.useState<any[]>([])
    const [cooperatives, setCooperatives] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [healthMap, setHealthMap] = React.useState<Record<string, { state: "checking" | "healthy" | "unhealthy"; ms?: number; code?: number }>>({})
    const [busyId, setBusyId] = React.useState<string | null>(null)

    // Filters
    const [search, setSearch] = React.useState("")
    const [providerFilter, setProviderFilter] = React.useState("ALL")
    const [methodFilter, setMethodFilter] = React.useState("ALL")
    const [statusFilter, setStatusFilter] = React.useState("ALL")
    const [coopFilter, setCoopFilter] = React.useState("ALL")

    const fetchEndpoints = React.useCallback(async () => {
        try {
            setLoading(true)
            const [epRes, provRes, coopsRes] = await Promise.all([
                fetch("/api/endpoints?limit=300&depth=1&sort=name"),
                fetch("/api/service-providers?limit=200"),
                fetch("/api/copteller/admin/cooperatives").catch(() => null),
            ])
            const epData = await epRes.json().catch(() => ({}))
            const provData = await provRes.json().catch(() => ({}))
            const coopsData = coopsRes ? await coopsRes.json().catch(() => ({})) : {}

            if (Array.isArray(epData.docs)) {
                setEndpoints(
                    epData.docs.map((ep: any) => ({
                        id: String(ep.id),
                        name: ep.name || "Untitled Endpoint",
                        description: ep.description || "",
                        method: ep.method || "GET",
                        path: ep.path || "/",
                        providerId: typeof ep.provider === "object" && ep.provider ? String(ep.provider.id) : String(ep.provider || ""),
                        providerName: typeof ep.provider === "object" && ep.provider ? ep.provider.name : "Unbound",
                        authOverride: ep.authOverride || "INHERIT",
                        status: ep.status || "active",
                        cooperativeId:
                            typeof ep.cooperative === "object" && ep.cooperative
                                ? String(ep.cooperative.id)
                                : ep.cooperative
                                  ? String(ep.cooperative)
                                  : undefined,
                        raw: ep,
                    }))
                )
            }
            if (Array.isArray(provData.docs)) setProviders(provData.docs)
            if (Array.isArray(coopsData.cooperatives)) setCooperatives(coopsData.cooperatives)
        } catch {
            toast.error("Failed to load API endpoint registry")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchEndpoints()
    }, [fetchEndpoints])

    const pingHealth = async (epId: string) => {
        setHealthMap((prev) => ({ ...prev, [epId]: { state: "checking" } }))
        const t0 = Date.now()
        try {
            const res = await fetch(`/api/endpoints/health/${epId}`)
            const data = await res.json().catch(() => ({}))
            const ms = data.latencyMs ?? Date.now() - t0
            setHealthMap((prev) => ({
                ...prev,
                [epId]: { state: data.healthy ? "healthy" : "unhealthy", ms, code: data.status || res.status },
            }))
        } catch {
            setHealthMap((prev) => ({ ...prev, [epId]: { state: "unhealthy", ms: Date.now() - t0 } }))
        }
    }

    const handleClone = async (ep: EndpointRow) => {
        setBusyId(ep.id)
        try {
            const res = await fetch("/api/endpoints", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `${ep.name} (Copy)`,
                    description: ep.description,
                    provider: ep.providerId || undefined,
                    method: ep.method,
                    path: ep.path,
                    status: "draft",
                    headers: ep.raw?.headers || [],
                    queryParams: ep.raw?.queryParams || [],
                    authOverride: ep.authOverride,
                    authBodyFieldKey: ep.raw?.authBodyFieldKey,
                    authQueryParamKey: ep.raw?.authQueryParamKey,
                    queryParamsSchema: ep.raw?.queryParamsSchema || {},
                    bodySchema: ep.raw?.bodySchema || {},
                    responseSchema: ep.raw?.responseSchema || {},
                    cooperative: ep.cooperativeId || null,
                }),
            })
            if (!res.ok) throw new Error("Clone failed")
            toast.success("Endpoint cloned as Draft")
            fetchEndpoints()
        } catch (err: any) {
            toast.error(err.message || "Clone failed")
        } finally {
            setBusyId(null)
        }
    }

    const handleDelete = async (ep: EndpointRow) => {
        if (!confirm(`Delete endpoint "${ep.name}"?`)) return
        setBusyId(ep.id)
        try {
            const res = await fetch(`/api/endpoints/${ep.id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Delete failed")
            toast.success(`Deleted "${ep.name}"`)
            fetchEndpoints()
        } catch (err: any) {
            toast.error(err.message || "Delete failed")
        } finally {
            setBusyId(null)
        }
    }

    const filtered = endpoints.filter((ep) => {
        const q = search.toLowerCase()
        const matchQ =
            !q ||
            ep.name.toLowerCase().includes(q) ||
            ep.path.toLowerCase().includes(q) ||
            ep.providerName.toLowerCase().includes(q) ||
            ep.description.toLowerCase().includes(q)
        const matchProv = providerFilter === "ALL" || ep.providerId === providerFilter
        const matchMethod = methodFilter === "ALL" || ep.method === methodFilter
        const matchStatus = statusFilter === "ALL" || ep.status === statusFilter
        const matchCoop =
            coopFilter === "ALL" ||
            (coopFilter === "GLOBAL" ? !ep.cooperativeId : String(ep.cooperativeId) === String(coopFilter))
        return matchQ && matchProv && matchMethod && matchStatus && matchCoop
    })

    const activeCount = endpoints.filter((e) => e.status === "active").length
    const olivePayCount = endpoints.filter(
        (e) => e.providerName.toLowerCase().includes("olive") || e.authOverride.startsWith("OLIVEPAY")
    ).length
    const healthyCount = Object.values(healthMap).filter((h) => h.state === "healthy").length

    return (
        <div className="w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                        <Globe className="h-3 w-3" /> Integration Gateway &bull; API Registry
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">API Endpoints &amp; Test Console</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Declarative REST specs, OlivePay JWT/HMAC auth injection, JSON schema contracts, and live Sandbox/Production testing.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={fetchEndpoints} className="h-9 rounded-xl text-xs font-bold gap-1.5 whitespace-nowrap">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </Button>
                    <Link
                        href="/copteller/superadmin/endpoints/new"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center font-black text-xs h-9 px-4 rounded-xl shadow-sm gap-1.5 whitespace-nowrap"
                    >
                        <PlusCircle className="h-4 w-4" /> Create API Endpoint
                    </Link>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Total Endpoints", value: endpoints.length, sub: `Across ${providers.length} providers` },
                    { label: "Active Specs", value: activeCount, sub: `${endpoints.length - activeCount} draft / deprecated` },
                    { label: "OlivePay Rail Specs", value: olivePayCount, sub: "JWT + HMAC + Collections" },
                    { label: "Verified Healthy", value: healthyCount, sub: "Tap Ping to probe live" },
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
                <div className="relative sm:col-span-2 lg:col-span-5">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by name, path, provider, or description..."
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
                    value={providerFilter}
                    onChange={(e) => setProviderFilter(e.target.value)}
                    className="h-10 px-3 text-xs font-bold rounded-xl border bg-background lg:col-span-2"
                >
                    <option value="ALL">All Providers</option>
                    {providers.map((p) => (
                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                    ))}
                </select>
                <select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="h-10 px-3 text-xs font-mono font-bold rounded-xl border bg-background lg:col-span-2"
                >
                    <option value="ALL">All Methods</option>
                    {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 px-3 text-xs font-bold rounded-xl border bg-background lg:col-span-1"
                >
                    <option value="ALL">Status</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="deprecated">Deprecated</option>
                </select>
                <select
                    value={coopFilter}
                    onChange={(e) => setCoopFilter(e.target.value)}
                    className="h-10 px-3 text-xs font-bold rounded-xl border bg-background lg:col-span-2"
                >
                    <option value="ALL">All Tenancies</option>
                    <option value="GLOBAL">Global Only</option>
                    {cooperatives.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Loading / Empty */}
            {loading && endpoints.length === 0 ? (
                <div className="border rounded-2xl bg-card p-16 flex justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="border rounded-2xl bg-card p-12 text-center text-muted-foreground space-y-2">
                    <Globe className="h-10 w-10 mx-auto opacity-30" />
                    <p className="font-semibold text-foreground">No endpoints match your filters</p>
                    <p className="text-xs">Create a custom API endpoint or bootstrap OlivePay from Infrastructure / Workflows.</p>
                </div>
            ) : (
                <>
                    {/* MOBILE & TABLET CARD VIEW (< lg) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
                        {filtered.map((ep) => {
                            const coopObj = cooperatives.find((c) => String(c.id) === String(ep.cooperativeId))
                            const health = healthMap[ep.id]
                            return (
                                <div key={ep.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between gap-3.5 min-w-0">
                                    <div className="space-y-2 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <Link href={`/copteller/superadmin/endpoints/${ep.id}`} className="font-bold text-sm text-foreground hover:text-primary leading-snug line-clamp-2">
                                                {ep.name}
                                            </Link>
                                            <span className={`font-mono text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 ${METHOD_BADGE[ep.method] || "bg-muted text-foreground"}`}>
                                                {ep.method}
                                            </span>
                                        </div>
                                        <p className="font-mono text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-lg truncate" title={ep.path}>
                                            {ep.path}
                                        </p>
                                        {ep.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">{ep.description}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                            <Badge variant="outline" className="font-mono text-[10px] max-w-[170px] truncate">{ep.providerName}</Badge>
                                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-muted text-foreground whitespace-nowrap">
                                                {ep.authOverride}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] gap-1 whitespace-nowrap">
                                                <Building2 size={10} /> {coopObj?.name || "Global"}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                                        <button
                                            onClick={() => pingHealth(ep.id)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-background hover:bg-muted text-xs font-mono whitespace-nowrap"
                                        >
                                            {health?.state === "checking" ? (
                                                <Loader2 size={12} className="animate-spin text-primary" />
                                            ) : health?.state === "healthy" ? (
                                                <CheckCircle2 size={12} className="text-emerald-500" />
                                            ) : health?.state === "unhealthy" ? (
                                                <XCircle size={12} className="text-red-500" />
                                            ) : (
                                                <Activity size={12} className="text-muted-foreground" />
                                            )}
                                            <span>{health?.state === "checking" ? "Ping..." : health ? `${health.ms ?? 0}ms` : "Ping"}</span>
                                        </button>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Link
                                                href={`/copteller/superadmin/endpoints/${ep.id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/20 text-xs font-bold whitespace-nowrap"
                                            >
                                                <Terminal size={13} /> Edit &amp; Test
                                            </Link>
                                            <button
                                                disabled={busyId === ep.id}
                                                onClick={() => handleClone(ep)}
                                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                                                title="Clone"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button
                                                disabled={busyId === ep.id}
                                                onClick={() => handleDelete(ep)}
                                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* DESKTOP TABLE VIEW (lg+) — Zero Clipping, Zero Wrapped Buttons */}
                    <div className="hidden lg:block w-full border rounded-2xl shadow-sm bg-card overflow-hidden">
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-sm text-left table-auto">
                                <thead className="text-[11px] text-muted-foreground uppercase bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-4 py-3.5 font-bold whitespace-nowrap">Endpoint</th>
                                        <th className="px-3 py-3.5 font-bold whitespace-nowrap">Method &amp; Path</th>
                                        <th className="px-3 py-3.5 font-bold whitespace-nowrap">Provider &amp; Auth</th>
                                        <th className="px-3 py-3.5 font-bold whitespace-nowrap">Health</th>
                                        <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/70">
                                    {filtered.map((ep) => {
                                        const coopObj = cooperatives.find((c) => String(c.id) === String(ep.cooperativeId))
                                        const health = healthMap[ep.id]
                                        return (
                                            <tr key={ep.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3.5 max-w-[260px]">
                                                    <Link
                                                        href={`/copteller/superadmin/endpoints/${ep.id}`}
                                                        className="font-bold text-foreground hover:text-primary block truncate"
                                                        title={ep.name}
                                                    >
                                                        {ep.name}
                                                    </Link>
                                                    <p className="text-xs text-muted-foreground truncate mt-0.5" title={ep.description}>
                                                        {ep.description || "REST endpoint specification"}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-3.5 max-w-[260px]">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`font-mono text-[10px] font-black px-2 py-0.5 rounded-md border shrink-0 ${METHOD_BADGE[ep.method] || "bg-muted text-foreground"}`}>
                                                            {ep.method}
                                                        </span>
                                                        <span className="font-mono text-xs text-muted-foreground truncate" title={ep.path}>
                                                            {ep.path}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <Badge variant="outline" className="font-mono text-[10px] whitespace-nowrap max-w-[180px] truncate">
                                                            {ep.providerName}
                                                        </Badge>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground whitespace-nowrap">
                                                                {ep.authOverride}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                                · {coopObj?.name || "Global"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3.5 whitespace-nowrap">
                                                    <button
                                                        onClick={() => pingHealth(ep.id)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-background hover:bg-muted text-xs font-mono whitespace-nowrap transition-colors"
                                                        title="Run live health probe"
                                                    >
                                                        {health?.state === "checking" ? (
                                                            <Loader2 size={12} className="animate-spin text-primary" />
                                                        ) : health?.state === "healthy" ? (
                                                            <CheckCircle2 size={12} className="text-emerald-500" />
                                                        ) : health?.state === "unhealthy" ? (
                                                            <XCircle size={12} className="text-red-500" />
                                                        ) : (
                                                            <Activity size={12} className="text-muted-foreground" />
                                                        )}
                                                        <span>{health?.state === "checking" ? "Ping..." : health ? `${health.ms ?? 0}ms` : "Ping"}</span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        <Link
                                                            href={`/copteller/superadmin/endpoints/${ep.id}`}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/20 text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
                                                            title="Edit Schema & Run Test Console"
                                                        >
                                                            <Terminal size={13} className="shrink-0" /> Edit &amp; Test
                                                        </Link>
                                                        <button
                                                            disabled={busyId === ep.id}
                                                            onClick={() => handleClone(ep)}
                                                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                                                            title="Clone Endpoint"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                        <button
                                                            disabled={busyId === ep.id}
                                                            onClick={() => handleDelete(ep)}
                                                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                                                            title="Delete Endpoint"
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
        </div>
    )
}
