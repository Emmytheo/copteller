"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Loader2, Save, AlertCircle, CheckCircle2, Link2, Hash, Trash2, Plus, X, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { CoptellerSubsystemNav } from "@/components/copteller/subsystem-nav"

interface ProviderMapping {
    id: string
    internalName: string
    externalCode: string
    provider: any
    relatedEntity: any
    updatedAt?: string
}

export default function CoptellerProviderMappingsPage() {
    const [mappings, setMappings] = React.useState<ProviderMapping[]>([])
    const [productTypes, setProductTypes] = React.useState<any[]>([])
    const [providers, setProviders] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState<string | null>(null)
    const [deleting, setDeleting] = React.useState<string | null>(null)
    const [edits, setEdits] = React.useState<Record<string, string>>({})

    const [showCreateForm, setShowCreateForm] = React.useState(false)
    const [selectedProductTypeId, setSelectedProductTypeId] = React.useState("")
    const [selectedProviderId, setSelectedProviderId] = React.useState("")
    const [customLabel, setCustomLabel] = React.useState("")
    const [newExternalCode, setNewExternalCode] = React.useState("")
    const [creating, setCreating] = React.useState(false)

    const loadData = React.useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/copteller/admin/provider-mappings")
            const data = await res.json().catch(() => ({}))
            const docs: ProviderMapping[] = Array.isArray(data.docs) ? data.docs : []
            setMappings(docs)
            setProductTypes(Array.isArray(data.productTypes) ? data.productTypes : [])
            setProviders(Array.isArray(data.providers) ? data.providers : [])
            if (Array.isArray(data.providers) && data.providers[0] && !selectedProviderId) {
                setSelectedProviderId(String(data.providers[0].id))
            }
            const init: Record<string, string> = {}
            docs.forEach((m) => {
                init[String(m.id)] = m.externalCode || ""
            })
            setEdits(init)
        } catch {
            toast.error("Failed to load provider mappings")
        } finally {
            setLoading(false)
        }
    }, [selectedProviderId])

    React.useEffect(() => {
        loadData()
    }, [loadData])

    const handleSave = async (mapping: ProviderMapping) => {
        const newCode = edits[String(mapping.id)]?.trim()
        if (!newCode) {
            toast.error("External code cannot be empty")
            return
        }
        setSaving(String(mapping.id))
        try {
            const res = await fetch(`/api/copteller/admin/provider-mappings/${mapping.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ externalCode: newCode }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok || !data.success) throw new Error(data.error || "Update failed")
            toast.success(`Updated mapping "${mapping.internalName}"`)
            loadData()
        } catch (err: any) {
            toast.error(err.message || "Update failed")
        } finally {
            setSaving(null)
        }
    }

    const handleCreate = async () => {
        if (!selectedProviderId || !newExternalCode.trim()) {
            toast.error("Select a provider and enter an external code")
            return
        }
        const pt = productTypes.find((p) => String(p.id) === String(selectedProductTypeId))
        const prov = providers.find((p) => String(p.id) === String(selectedProviderId))
        const label = customLabel.trim() || `${pt?.name || "Platform Entity"} (${prov?.name || "Provider"}) Mapping`

        setCreating(true)
        try {
            const res = await fetch("/api/copteller/admin/provider-mappings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    internalName: label,
                    externalCode: newExternalCode.trim(),
                    providerId: selectedProviderId,
                    productTypeId: selectedProductTypeId || undefined,
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok || !data.success) throw new Error(data.error || "Create failed")
            toast.success("Provider mapping created!")
            setShowCreateForm(false)
            setCustomLabel("")
            setNewExternalCode("")
            setSelectedProductTypeId("")
            loadData()
        } catch (err: any) {
            toast.error(err.message || "Create failed")
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (mapping: ProviderMapping) => {
        if (!confirm(`Delete provider mapping "${mapping.internalName}"?`)) return
        setDeleting(String(mapping.id))
        try {
            const res = await fetch(`/api/copteller/admin/provider-mappings/${mapping.id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Delete failed")
            toast.success("Mapping deleted")
            loadData()
        } catch (err: any) {
            toast.error(err.message || "Delete failed")
        } finally {
            setDeleting(null)
        }
    }

    const mappedCount = mappings.length
    const coverage = productTypes.length > 0 ? Math.min(100, Math.round((mappedCount / productTypes.length) * 100)) : 100

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col gap-6 font-sans pb-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                        <Link2 className="h-3 w-3" /> Rail Translation Registry
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Provider Product Mappings</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Bind internal Copteller financial products &amp; services to external provider codes (OlivePay tiers/plans, Qore ProductCodes, BankSuite rails).
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={loadData} className="h-9 rounded-xl text-xs font-bold gap-1.5">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </Button>
                    <Button size="sm" onClick={() => setShowCreateForm(true)} className="h-9 rounded-xl text-xs font-black gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Create Mapping
                    </Button>
                </div>
            </div>

            <CoptellerSubsystemNav group="automation" />

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                    { label: "Active Product Types", value: productTypes.length, sub: "Copteller financial products" },
                    { label: "Configured Mappings", value: mappedCount, sub: `Across ${providers.length} providers` },
                    { label: "Coverage Rate", value: `${coverage}%`, sub: "Mapped to external provider codes" },
                ].map((k) => (
                    <div key={k.label} className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{k.label}</p>
                        <p className="text-2xl font-black font-mono text-foreground">{k.value}</p>
                        <p className="text-[11px] text-muted-foreground">{k.sub}</p>
                    </div>
                ))}
            </div>

            {showCreateForm && (
                <Card className="border-primary/25 bg-primary/[0.03] rounded-2xl shadow-lg relative">
                    <button onClick={() => setShowCreateForm(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                    <CardHeader>
                        <CardTitle className="text-base font-black">New Provider Code Mapping</CardTitle>
                        <CardDescription className="text-xs">Map a Copteller product or recurring mandate to an external provider identifier.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Service Provider</Label>
                                <select
                                    value={selectedProviderId}
                                    onChange={(e) => setSelectedProviderId(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-semibold"
                                >
                                    <option value="">Select Provider...</option>
                                    {providers.map((p) => (
                                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Product Type (Optional)</Label>
                                <select
                                    value={selectedProductTypeId}
                                    onChange={(e) => setSelectedProductTypeId(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-semibold"
                                >
                                    <option value="">Global / Custom Mapping</option>
                                    {productTypes.map((pt) => (
                                        <option key={pt.id} value={String(pt.id)}>{pt.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Mapping Label</Label>
                                <Input
                                    value={customLabel}
                                    onChange={(e) => setCustomLabel(e.target.value)}
                                    placeholder="e.g. Cooperative Thrift Recurring Plan (OlivePay)"
                                    className="h-10 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">External Provider Code</Label>
                                <Input
                                    value={newExternalCode}
                                    onChange={(e) => setNewExternalCode(e.target.value)}
                                    placeholder="e.g. REC_PLAN_AJO_01 or 101"
                                    className="h-10 font-mono text-xs"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                            <Button size="sm" disabled={creating} onClick={handleCreate}>
                                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                                Save Mapping
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {loading ? (
                <div className="p-16 flex justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
            ) : mappings.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-2xl text-muted-foreground">
                    <Link2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-foreground">No provider mappings yet</p>
                    <p className="text-xs mt-1">Click &quot;Create Mapping&quot; to bind Copteller products to OlivePay, Qore, or BankSuite external codes.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mappings.map((m) => {
                        const mid = String(m.id)
                        const code = edits[mid] ?? m.externalCode ?? ""
                        const dirty = code !== (m.externalCode || "")
                        return (
                            <Card key={mid} className="rounded-2xl shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <CardTitle className="text-sm font-black truncate">{m.internalName}</CardTitle>
                                            <CardDescription className="text-xs mt-0.5">
                                                Provider: {typeof m.provider === "object" && m.provider ? m.provider.name : String(m.provider || "N/A")}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {m.externalCode ? (
                                                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Bound
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive gap-1">
                                                    <AlertCircle className="h-3 w-3" /> Missing
                                                </Badge>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                disabled={deleting === mid}
                                                onClick={() => handleDelete(m)}
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Hash className="h-3 w-3" /> External Code
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={code}
                                            onChange={(e) => setEdits((prev) => ({ ...prev, [mid]: e.target.value }))}
                                            className="font-mono h-9 text-xs"
                                        />
                                        <Button size="sm" disabled={!dirty || saving === mid} onClick={() => handleSave(m)} className="h-9 gap-1.5">
                                            {saving === mid ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                            Save
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
