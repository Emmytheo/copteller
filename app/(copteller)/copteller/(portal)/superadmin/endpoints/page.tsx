"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    PlusCircle, Settings, Trash2, X, Loader2, Play, Search,
    FileText, CheckCircle2, AlertCircle, Building2, Terminal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface EndpointSpec {
    id: string
    name: string
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    path: string
    provider: string
    status: 'active' | 'draft' | 'deprecated'
    schema: string
    cooperative?: string
}

export default function SuperadminEndpointsPage() {
    const router = useRouter()
    const [endpoints, setEndpoints] = React.useState<EndpointSpec[]>([])
    const [providers, setProviders] = React.useState<any[]>([])
    const [cooperatives, setCooperatives] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)

    // Filter states
    const [search, setSearch] = React.useState("")
    const [methodFilter, setMethodFilter] = React.useState("ALL")
    const [coopFilter, setCoopFilter] = React.useState("ALL")

    // Panel controls
    const [panelMode, setPanelMode] = React.useState<'details' | 'form' | 'none'>('none')
    const [selectedEp, setSelectedEp] = React.useState<EndpointSpec | null>(null)

    // Form states
    const [formName, setFormName] = React.useState("")
    const [formMethod, setFormMethod] = React.useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>("POST")
    const [formPath, setFormPath] = React.useState("")
    const [formProvider, setFormProvider] = React.useState("")
    const [formStatus, setFormStatus] = React.useState<'active' | 'draft' | 'deprecated'>("active")
    const [formSchema, setFormSchema] = React.useState("")
    const [formCooperative, setFormCooperative] = React.useState("")

    const fetchEndpoints = async () => {
        try {
            setLoading(true)
            const [epRes, provRes, coopsRes] = await Promise.all([
                fetch('/api/endpoints?limit=250&depth=1'),
                fetch('/api/service-providers?limit=200'),
                fetch('/api/copteller/admin/cooperatives')
            ])

            const epData = await epRes.json()
            const provData = await provRes.json()
            const coopsData = await coopsRes.json()

            if (epData.docs) {
                const mapped = epData.docs.map((ep: any) => ({
                    id: String(ep.id),
                    name: ep.name,
                    method: ep.method,
                    path: ep.path,
                    provider: typeof ep.provider === 'object' && ep.provider !== null ? ep.provider.name : ep.provider || '',
                    providerId: typeof ep.provider === 'object' && ep.provider !== null ? ep.provider.id : ep.provider,
                    status: ep.status === 'active' ? 'active' : ep.status === 'deprecated' ? 'deprecated' : 'draft',
                    schema: ep.bodySchema ? JSON.stringify(ep.bodySchema, null, 2) : '{}',
                    cooperative: typeof ep.cooperative === 'object' && ep.cooperative !== null ? ep.cooperative.id : ep.cooperative || undefined
                }))
                setEndpoints(mapped)
            }

            if (provData.docs) {
                setProviders(provData.docs)
            }

            if (coopsData.cooperatives) {
                setCooperatives(coopsData.cooperatives)
            }
        } catch (e) {
            toast.error("Failed to load endpoint definitions")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchEndpoints()
    }, [])

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            let parsedSchema = {}
            if (formSchema.trim()) {
                try {
                    parsedSchema = JSON.parse(formSchema)
                } catch {
                    throw new Error("Invalid JSON schema syntax")
                }
            }

            const payloadData = {
                name: formName,
                method: formMethod,
                path: formPath.startsWith('/') ? formPath : `/${formPath}`,
                provider: formProvider,
                status: formStatus,
                bodySchema: parsedSchema,
                cooperative: formCooperative || null
            }

            if (selectedEp) {
                // Update
                const res = await fetch(`/api/endpoints/${selectedEp.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadData)
                })
                if (!res.ok) throw new Error("Failed to save endpoint specs")
                toast.success(`API spec updated successfully!`)
            } else {
                // Create
                const res = await fetch('/api/endpoints', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadData)
                })
                if (!res.ok) throw new Error("Failed to register endpoint spec")
                toast.success(`API endpoint registered successfully!`)
            }

            setPanelMode('none')
            setSelectedEp(null)
            fetchEndpoints()
        } catch (err: any) {
            toast.error(err.message || "Failed to save endpoint spec")
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return
        try {
            const res = await fetch(`/api/endpoints/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error("Failed to delete endpoint")
            toast.error(`Endpoint spec "${name}" deleted`)
            setSelectedEp(null)
            setPanelMode('none')
            fetchEndpoints()
        } catch (err: any) {
            toast.error(err.message || "Failed to delete endpoint spec")
        }
    }

    const triggerEdit = () => {
        if (!selectedEp) return
        setFormName(selectedEp.name)
        setFormMethod(selectedEp.method)
        setFormPath(selectedEp.path)
        setFormProvider((selectedEp as any).providerId || "")
        setFormStatus(selectedEp.status)
        setFormSchema(selectedEp.schema)
        setFormCooperative(selectedEp.cooperative || "")
        setPanelMode('form')
    }

    const triggerNew = () => {
        setSelectedEp(null)
        resetForm()
        setPanelMode('form')
    }

    const resetForm = () => {
        setFormName("")
        setFormMethod("POST")
        setFormPath("")
        setFormProvider(providers[0]?.id || "")
        setFormStatus("active")
        setFormSchema("{}")
        setFormCooperative("")
    }

    const filtered = endpoints.filter(ep => {
        const matchSearch = ep.name.toLowerCase().includes(search.toLowerCase()) || ep.path.toLowerCase().includes(search.toLowerCase())
        const matchMethod = methodFilter === 'ALL' || ep.method === methodFilter
        const matchCoop = coopFilter === 'ALL' || (coopFilter === 'GLOBAL' ? !ep.cooperative : String(ep.cooperative) === String(coopFilter))
        return matchSearch && matchMethod && matchCoop
    })

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Gateway Configuration</span>
                    <h1 className="text-3xl font-black mt-2">API Endpoints Specs</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">Configure path validation schema and response payload specs mapping.</p>
                </div>
                <Button onClick={triggerNew} className="h-10 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs border-0 shadow-lg flex items-center gap-2 shrink-0">
                    <PlusCircle className="h-4 w-4" /> Create API Endpoint
                </Button>
            </div>

            {loading && endpoints.length === 0 ? (
                <div className="flex justify-center p-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* Main Table Column */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Search & Filter */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search API endpoints by path or description..."
                                    className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                />
                            </div>
                            
                            {/* Tenancy Filter Dropdown */}
                            <select
                                value={coopFilter}
                                onChange={(e) => setCoopFilter(e.target.value)}
                                className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold focus:outline-none"
                            >
                                <option value="ALL">All Tenancies</option>
                                <option value="GLOBAL">Global Only</option>
                                {cooperatives.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            <select
                                value={methodFilter}
                                onChange={e => setMethodFilter(e.target.value)}
                                className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold focus:outline-none"
                            >
                                <option value="ALL">All Methods</option>
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                        </div>

                        {/* Table */}
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <div className="min-w-[560px]">
                                    <div className="grid grid-cols-5 px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                        <span>Method</span>
                                        <span className="col-span-2">Specs Endpoint</span>
                                        <span>Scope</span>
                                        <span>Status</span>
                                    </div>

                                    {filtered.length === 0 ? (
                                        <div className="py-12 text-center text-muted-foreground text-xs font-semibold">No API endpoints match the selected filters.</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filtered.map((ep) => {
                                                const coopObj = cooperatives.find(c => String(c.id) === String(ep.cooperative))
                                                return (
                                                    <div
                                                        key={ep.id}
                                                        onClick={() => {
                                                            setSelectedEp(ep)
                                                            setPanelMode('details')
                                                        }}
                                                        className={`grid grid-cols-5 px-4 sm:px-6 py-4 items-center cursor-pointer transition-colors ${selectedEp?.id === ep.id ? "bg-rose-50/50 dark:bg-rose-950/20 font-bold" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/30"}`}
                                                    >
                                                        <span className={`font-mono text-xs font-black ${ep.method === 'POST' ? 'text-emerald-500' : 'text-blue-500'}`}>
                                                            {ep.method}
                                                        </span>
                                                        <div className="col-span-2 pr-2">
                                                            <p className="text-sm font-black text-foreground truncate">{ep.name}</p>
                                                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{ep.path}</p>
                                                        </div>
                                                        <div className="truncate pr-2">
                                                            <Badge variant="outline" className={`text-[8px] font-bold py-0.5 px-2 ${!ep.cooperative ? 'border-slate-200 text-muted-foreground' : 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'}`}>
                                                                {!ep.cooperative ? 'Global' : coopObj?.name || 'Scoped'}
                                                            </Badge>
                                                        </div>
                                                        <div>
                                                            <Badge variant={ep.status === 'active' ? 'default' : 'secondary'} className="text-[9px] uppercase font-bold">
                                                                {ep.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className="space-y-4">
                        <AnimatePresence mode="wait">
                            {panelMode === 'details' && selectedEp && (
                                <motion.div
                                    key="details"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 shadow-sm space-y-5"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Endpoint Details</span>
                                            <h3 className="text-base font-black mt-1 leading-snug">{selectedEp.name}</h3>
                                        </div>
                                        <button onClick={() => setPanelMode('none')} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-3.5 text-xs border-y py-4 border-slate-100 dark:border-slate-800 font-semibold">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">HTTP Method</span>
                                            <span className={`font-mono font-black ${selectedEp.method === 'POST' ? 'text-emerald-500' : 'text-blue-500'}`}>{selectedEp.method}</span>
                                        </div>
                                        <div className="flex justify-between gap-4 items-start">
                                            <span className="text-muted-foreground shrink-0">Path Route</span>
                                            <span className="font-mono text-muted-foreground break-all text-right max-w-[65%]">{selectedEp.path}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Clearing Provider</span>
                                            <span>{selectedEp.provider}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Cooperative Scope</span>
                                            <span className="font-bold text-emerald-600">
                                                {cooperatives.find(c => String(c.id) === String(selectedEp.cooperative))?.name || 'Global'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Status</span>
                                            <Badge variant={selectedEp.status === 'active' ? 'default' : 'secondary'} className="text-[9px] uppercase font-bold">
                                                {selectedEp.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">JSON Validation Schema</p>
                                        <pre className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl font-mono text-[10px] text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-40">
                                            {selectedEp.schema}
                                        </pre>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <Button 
                                            onClick={() => router.push(`/copteller/superadmin/endpoints/${selectedEp.id}`)}
                                            className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2 border-0"
                                        >
                                            <Terminal className="h-4 w-4" /> Visual Tester & Schema Editor
                                        </Button>
                                        <Button onClick={triggerEdit} className="w-full h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-xs gap-2">
                                            <Settings className="h-4 w-4" /> Edit Specifications
                                        </Button>
                                        <Button onClick={() => handleDelete(selectedEp.id, selectedEp.name)} variant="outline" className="w-full h-10 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-black text-xs gap-2">
                                            <Trash2 className="h-4 w-4" /> Delete Spec
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {panelMode === 'form' && (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 shadow-sm space-y-4"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-sm font-black">{selectedEp ? 'Edit Spec' : 'Register Spec'}</h3>
                                            <p className="text-[9px] text-muted-foreground mt-0.5">Specify JSON properties validation schemas.</p>
                                        </div>
                                        <button onClick={() => setPanelMode(selectedEp ? 'details' : 'none')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleCreateOrUpdate} className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Specs Name / Description</label>
                                            <input
                                                type="text"
                                                required
                                                value={formName}
                                                onChange={e => setFormName(e.target.value)}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-rose-500"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Cooperative Scope</label>
                                            <select
                                                value={formCooperative}
                                                onChange={e => setFormCooperative(e.target.value)}
                                                className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-rose-500"
                                            >
                                                <option value="">Global / System-Wide (Shared)</option>
                                                {cooperatives.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Method</label>
                                                <select
                                                    value={formMethod}
                                                    onChange={e => setFormMethod(e.target.value as any)}
                                                    className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-rose-500"
                                                >
                                                    <option value="POST">POST</option>
                                                    <option value="GET">GET</option>
                                                    <option value="PUT">PUT</option>
                                                    <option value="DELETE">DELETE</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Path URL</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formPath}
                                                    onChange={e => setFormPath(e.target.value)}
                                                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-mono focus:outline-none focus:border-rose-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Validation JSON Schema</label>
                                            <textarea
                                                rows={3}
                                                value={formSchema}
                                                onChange={e => setFormSchema(e.target.value)}
                                                placeholder={`{\n  "type": "object"\n}`}
                                                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-mono focus:outline-none focus:border-rose-500 resize-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Clearing Provider</label>
                                                <select
                                                    value={formProvider}
                                                    onChange={e => setFormProvider(e.target.value)}
                                                    className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-rose-500"
                                                >
                                                    <option value="" disabled>Select Provider...</option>
                                                    {providers.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Status</label>
                                                <select
                                                    value={formStatus}
                                                    onChange={e => setFormStatus(e.target.value as any)}
                                                    className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-rose-500"
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="draft">Draft</option>
                                                    <option value="deprecated">Deprecated</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <Button type="button" onClick={() => setPanelMode(selectedEp ? 'details' : 'none')} variant="outline" className="flex-1 rounded-xl h-9 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                            <Button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs h-9 rounded-xl border-0 shadow-lg">Save specs</Button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {panelMode === 'none' && (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center empty-state-card"
                                >
                                    <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                                    <p className="text-xs font-bold text-muted-foreground">Select an endpoint entry to audit or edit specifications.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            )}
        </div>
    )
}

