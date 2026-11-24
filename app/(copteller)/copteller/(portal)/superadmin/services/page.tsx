"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Search, Play, Edit3, Trash2, XCircle, Check, Sparkles,
    RefreshCw, Cpu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Link from "next/link"
import { ClientPortal } from "@/components/copteller/client-portal"
import { VisualFormBuilder } from "@/components/copteller/visual-form-builder"

type ServiceItem = {
    id: string
    name: string
    description: string
    icon: string
    category: { id: string; name: string; slug: string; icon?: string } | null
    provider: any
    provider_service_code: string
    validation_workflow: any
    execution_workflow: any
    fee_type: string
    fee_value: number
    form_schema: any[]
    allowed_roles: string[]
    sector_tags: string[]
    cooperative_scope: string
    min_kyc_tier: string
    settlement_type: string
    sandbox_enabled: boolean
    union_markup_allowed: boolean
    status: string
    service_intent: string
    createdAt: string
}

type CategoryItem = {
    id: string
    name: string
    slug: string
    icon?: string
    serviceCount?: number
}

const ROLE_LABELS: Record<string, { label: string; bg: string; text: string }> = {
    member: { label: "Member", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-700 dark:text-emerald-400" },
    coop_admin: { label: "Coop Admin", bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-700 dark:text-amber-400" },
    investor: { label: "Investor", bg: "bg-orange-500/10 border-orange-500/20", text: "text-orange-700 dark:text-orange-400" },
    superadmin: { label: "Superadmin", bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-700 dark:text-rose-400" },
    agent: { label: "POS Agent", bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-700 dark:text-blue-400" },
}

function relId(v: any): string {
    if (!v) return ""
    return typeof v === "object" ? String(v.id || "") : String(v)
}

export default function SuperadminServicesPage() {
    const [services, setServices] = React.useState<ServiceItem[]>([])
    const [categories, setCategories] = React.useState<CategoryItem[]>([])
    const [providers, setProviders] = React.useState<Array<{ id: string; name: string; slug: string }>>([])
    const [workflows, setWorkflows] = React.useState<Array<{ id: string; name: string; status: string }>>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [selectedCategory, setSelectedCategory] = React.useState("all")
    const [statusFilter, setStatusFilter] = React.useState("all")
    const [seeding, setSeeding] = React.useState(false)

    // Controlled Editor State (FIX: Eliminates FormData unmounted-tab data wipeout!)
    const [isEditorOpen, setIsEditorOpen] = React.useState(false)
    const [editingService, setEditingService] = React.useState<ServiceItem | null>(null)
    const [activeTab, setActiveTab] = React.useState<"general" | "access" | "schema" | "pricing">("general")
    const [isSaving, setIsSaving] = React.useState(false)

    const [draft, setDraft] = React.useState<any>({
        name: "",
        description: "",
        icon: "Zap",
        category: "",
        provider: "",
        provider_service_code: "",
        validation_workflow: "",
        execution_workflow: "",
        service_intent: "none",
        status: "active",
        allowed_roles: ["member", "coop_admin", "superadmin"],
        sector_tags: ["all"],
        cooperative_scope: "all_cooperatives",
        min_kyc_tier: "tier_1",
        fee_type: "none",
        fee_value: 0,
        settlement_type: "wallet_debit",
        sandbox_enabled: true,
        union_markup_allowed: true,
    })

    const [formFields, setFormFields] = React.useState<any[]>([])
    const [rawJsonSchema, setRawJsonSchema] = React.useState("[]")

    const patchDraft = (patch: Record<string, any>) => setDraft((prev: any) => ({ ...prev, ...patch }))

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [servicesRes, categoriesRes, provRes, wfRes] = await Promise.all([
                fetch("/api/copteller/services?all=1"),
                fetch("/api/copteller/services/categories"),
                fetch("/api/providers").catch(() => null),
                fetch("/api/workflows?limit=250").catch(() => null),
            ])
            const servicesData = await servicesRes.json()
            const categoriesData = await categoriesRes.json()

            if (servicesData.success) setServices(servicesData.services || [])
            if (categoriesData.success) setCategories(categoriesData.categories || [])

            if (provRes?.ok) {
                const pData = await provRes.json().catch(() => ({}))
                setProviders((pData.docs || []).map((p: any) => ({ id: String(p.id), name: p.name, slug: p.slug })))
            }
            if (wfRes?.ok) {
                const wData = await wfRes.json().catch(() => ({}))
                setWorkflows((wData.docs || []).map((w: any) => ({ id: String(w.id), name: w.name, status: w.status })))
            }
        } catch (error) {
            console.error("Failed to load services:", error)
            toast.error("Failed to load services catalog")
        } finally {
            setIsLoading(false)
        }
    }

    React.useEffect(() => {
        fetchData()
    }, [])

    const handleOpenCreate = () => {
        setEditingService(null)
        const starterFields = [
            { name: "amount", label: "Amount (NGN)", type: "number", required: true, placeholder: "5000" },
            { name: "destinationBankCode", label: "Destination Bank", type: "destination_bank_lookup", required: true },
            { name: "destinationAccountNumber", label: "Beneficiary Account Number", type: "text", required: true, placeholder: "10-digit account" },
        ]
        setDraft({
            name: "",
            description: "",
            icon: "Zap",
            category: categories[0]?.id || "",
            provider: providers.find((p) => p.slug === "olivepay")?.id || "",
            provider_service_code: "",
            validation_workflow: "",
            execution_workflow: "",
            service_intent: "none",
            status: "active",
            allowed_roles: ["member", "coop_admin", "superadmin"],
            sector_tags: ["all"],
            cooperative_scope: "all_cooperatives",
            min_kyc_tier: "tier_1",
            fee_type: "none",
            fee_value: 0,
            settlement_type: "wallet_debit",
            sandbox_enabled: true,
            union_markup_allowed: true,
        })
        setFormFields(starterFields)
        setRawJsonSchema(JSON.stringify(starterFields, null, 2))
        setActiveTab("general")
        setIsEditorOpen(true)
    }

    const handleOpenEdit = (service: ServiceItem) => {
        setEditingService(service)
        const fields = Array.isArray(service.form_schema) ? service.form_schema : []
        setDraft({
            name: service.name || "",
            description: service.description || "",
            icon: service.icon || "Zap",
            category: service.category?.id || categories[0]?.id || "",
            provider: relId(service.provider),
            provider_service_code: service.provider_service_code || "",
            validation_workflow: relId(service.validation_workflow),
            execution_workflow: relId(service.execution_workflow),
            service_intent: service.service_intent || "none",
            status: service.status || "active",
            allowed_roles: Array.isArray(service.allowed_roles) ? service.allowed_roles : ["member", "coop_admin", "superadmin"],
            sector_tags: Array.isArray(service.sector_tags) ? service.sector_tags : ["all"],
            cooperative_scope: service.cooperative_scope || "all_cooperatives",
            min_kyc_tier: service.min_kyc_tier || "tier_1",
            fee_type: service.fee_type || "none",
            fee_value: Number(service.fee_value || 0),
            settlement_type: service.settlement_type || "wallet_debit",
            sandbox_enabled: service.sandbox_enabled !== false,
            union_markup_allowed: service.union_markup_allowed !== false,
        })
        setFormFields(fields)
        setRawJsonSchema(JSON.stringify(fields, null, 2))
        setActiveTab("general")
        setIsEditorOpen(true)
    }

    const toggleArrayField = (key: "allowed_roles" | "sector_tags", val: string) => {
        const cur: string[] = Array.isArray(draft[key]) ? draft[key] : []
        const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]
        patchDraft({ [key]: next })
    }

    const handleSaveService = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!draft.name.trim() || !draft.category) {
            return toast.error("Service name and category are required.")
        }
        setIsSaving(true)

        let parsedSchema = formFields
        try {
            if (rawJsonSchema) parsedSchema = JSON.parse(rawJsonSchema)
        } catch {
            toast.error("Invalid JSON Schema format")
            setIsSaving(false)
            return
        }

        const payloadData = {
            ...draft,
            fee_value: Number(draft.fee_value) || 0,
            provider: draft.provider || null,
            validation_workflow: draft.validation_workflow || null,
            execution_workflow: draft.execution_workflow || null,
            allowed_roles: draft.allowed_roles?.length ? draft.allowed_roles : ["member", "coop_admin", "superadmin"],
            sector_tags: draft.sector_tags?.length ? draft.sector_tags : ["all"],
            form_schema: parsedSchema,
        }

        try {
            const url = editingService ? `/api/copteller/services/${editingService.id}` : `/api/copteller/services`
            const method = editingService ? "PUT" : "POST"
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadData),
            })
            const data = await res.json()
            if (data.success) {
                toast.success(editingService ? "Service updated (all 4 tabs preserved)!" : "New service published!")
                setIsEditorOpen(false)
                await fetchData()
            } else {
                toast.error(data.error || "Failed to save service")
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to save service")
        } finally {
            setIsSaving(false)
        }
    }

    const handleSeedOlivePayServices = async () => {
        setSeeding(true)
        const tId = toast.loading("Seeding 7 OlivePay-powered Services wired to OlivePay Workflows...")
        try {
            const res = await fetch("/api/copteller/olivepay/seed-services", { method: "POST" })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "Seed failed")
            toast.success(`Provisioned ${data.seeded?.length || 7} OlivePay Services!`, { id: tId })
            await fetchData()
        } catch (err: any) {
            toast.error(err.message || "Seed failed", { id: tId })
        } finally {
            setSeeding(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this service?")) return
        try {
            const res = await fetch(`/api/copteller/services/${id}`, { method: "DELETE" })
            const data = await res.json()
            if (data.success) {
                toast.success("Service deleted")
                setServices((prev) => prev.filter((s) => s.id !== id))
            } else {
                toast.error(data.error || "Failed to delete service")
            }
        } catch {
            toast.error("Failed to delete service")
        }
    }

    const filteredServices = services.filter((service) => {
        const matchesSearch =
            searchQuery === "" ||
            service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.provider_service_code.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCat = selectedCategory === "all" || service.category?.slug === selectedCategory
        const matchesStatus = statusFilter === "all" || service.status === statusFilter
        return matchesSearch && matchesCat && matchesStatus
    })

    return (
        <div className="min-h-[100dvh] bg-background text-foreground">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                                <Cpu className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                                Core Services Registry · OlivePay Workflow-Wired
                            </p>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">Platform Services Manager</h1>
                        <p className="text-xs text-muted-foreground mt-1 font-semibold">
                            Bind interactive member forms to real OlivePay Providers &amp; Workflows with role/KYC access control.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={handleSeedOlivePayServices} disabled={seeding} variant="outline" className="h-9 rounded-xl border-emerald-500/30 text-emerald-600 text-xs font-black gap-1.5">
                            <Sparkles className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`} />
                            {seeding ? "Seeding..." : "Seed OlivePay Services"}
                        </Button>
                        <Link href="/copteller/superadmin/services/simulator">
                            <Button variant="outline" className="h-9 rounded-xl text-xs font-bold gap-1.5">
                                <Play className="w-3.5 h-3.5 text-emerald-500" /> Simulator
                            </Button>
                        </Link>
                        <Button onClick={handleOpenCreate} className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black gap-1.5">
                            <Plus className="w-4 h-4" /> New Service
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search services, codes, workflows..." className="pl-9 h-10 rounded-xl text-xs" />
                    </div>
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="h-10 px-3 rounded-xl border bg-background text-xs font-bold">
                        <option value="all">All Categories</option>
                        {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-xl border bg-background text-xs font-bold">
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {/* Services Table */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[780px] text-left text-xs">
                            <thead className="bg-muted/40 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-5 py-3.5">Service</th>
                                    <th className="px-4 py-3.5">Provider &amp; Workflow</th>
                                    <th className="px-4 py-3.5">Access &amp; KYC</th>
                                    <th className="px-4 py-3.5">Fee</th>
                                    <th className="px-4 py-3.5">Status</th>
                                    <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading services...</td></tr>
                                ) : filteredServices.length === 0 ? (
                                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No services found. Click "Seed OlivePay Services" or "New Service".</td></tr>
                                ) : (
                                    filteredServices.map((service) => (
                                        <tr key={service.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-5 py-4">
                                                <p className="font-black text-foreground">{service.name}</p>
                                                <p className="text-[11px] text-muted-foreground line-clamp-1">{service.description || service.category?.name}</p>
                                            </td>
                                            <td className="px-4 py-4 space-y-1">
                                                <p className="text-[11px] font-bold">{service.provider?.name || "Internal Ledger"}</p>
                                                <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                                    {service.execution_workflow?.name || "Direct Settlement"}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {(service.allowed_roles || []).slice(0, 3).map((r) => (
                                                        <span key={r} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${ROLE_LABELS[r]?.bg || "bg-muted"} ${ROLE_LABELS[r]?.text || ""}`}>
                                                            {ROLE_LABELS[r]?.label || r}
                                                        </span>
                                                    ))}
                                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-muted uppercase">{service.min_kyc_tier}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 font-mono font-bold">
                                                {service.fee_type === "none" ? "Free" : service.fee_type === "flat" ? `₦${service.fee_value}` : `${service.fee_value}%`}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${service.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                                                    {service.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link href={`/copteller/superadmin/services/simulator?serviceId=${service.id}`}>
                                                        <Button size="sm" variant="outline" className="h-8 px-2.5 text-emerald-600 text-[11px] font-bold gap-1 rounded-lg">
                                                            <Play className="w-3 h-3" /> Test
                                                        </Button>
                                                    </Link>
                                                    <Button onClick={() => handleOpenEdit(service)} size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button onClick={() => handleDelete(service.id)} size="sm" variant="ghost" className="h-8 w-8 p-0 hover:text-rose-500 rounded-lg">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Controlled Slide-Over Drawer (Zero Tab-Unmount Data Loss!) */}
            <ClientPortal>
                <AnimatePresence>
                    {isEditorOpen && (
                        <div className="fixed inset-0 z-[100] flex justify-end bg-black/70 backdrop-blur-sm">
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                                className="w-full max-w-2xl bg-background border-l border-border h-full flex flex-col shadow-2xl overflow-hidden"
                            >
                                <div className="p-6 border-b border-border flex items-center justify-between bg-card">
                                    <div>
                                        <h2 className="text-lg font-black">{editingService ? `Edit: ${editingService.name}` : "Create Platform Service"}</h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">All tabs are unified in controlled state — switching tabs preserves every field.</p>
                                    </div>
                                    <Button onClick={() => setIsEditorOpen(false)} variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                        <XCircle className="w-5 h-5" />
                                    </Button>
                                </div>

                                <div className="flex border-b border-border bg-card/60 px-6 gap-5 text-xs font-bold overflow-x-auto">
                                    {(["general", "access", "schema", "pricing"] as const).map((tab, i) => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setActiveTab(tab)}
                                            className={`py-3 border-b-2 whitespace-nowrap ${activeTab === tab ? "border-emerald-500 text-emerald-600" : "border-transparent text-muted-foreground"}`}
                                        >
                                            {i + 1}. {tab === "general" ? "General & Workflows" : tab === "access" ? "Access Matrix" : tab === "schema" ? "Form Schema" : "Pricing & Settlement"}
                                        </button>
                                    ))}
                                </div>

                                <form id="service-form" onSubmit={handleSaveService} className="flex-1 overflow-y-auto p-6 space-y-5">
                                    {activeTab === "general" && (
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-xs font-bold">Service Name *</Label>
                                                <Input value={draft.name} onChange={(e) => patchDraft({ name: e.target.value })} required className="mt-1.5 text-xs" />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs font-bold">Category *</Label>
                                                    <select value={draft.category} onChange={(e) => patchDraft({ category: e.target.value })} required className="mt-1.5 w-full bg-background border border-border text-xs rounded-xl px-3 py-2.5">
                                                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-bold">Clearing Service Provider</Label>
                                                    <select value={draft.provider} onChange={(e) => patchDraft({ provider: e.target.value })} className="mt-1.5 w-full bg-background border border-border text-xs rounded-xl px-3 py-2.5">
                                                        <option value="">Internal Core Ledger</option>
                                                        {providers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs font-bold">Validation Workflow (Optional)</Label>
                                                    <select value={draft.validation_workflow} onChange={(e) => patchDraft({ validation_workflow: e.target.value })} className="mt-1.5 w-full bg-background border border-border text-xs rounded-xl px-3 py-2.5">
                                                        <option value="">None</option>
                                                        {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-bold">Execution Workflow (Settlement)</Label>
                                                    <select value={draft.execution_workflow} onChange={(e) => patchDraft({ execution_workflow: e.target.value })} className="mt-1.5 w-full bg-background border border-border text-xs rounded-xl px-3 py-2.5">
                                                        <option value="">Direct Local Settlement</option>
                                                        {workflows.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.status})</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-xs font-bold">Description</Label>
                                                <textarea value={draft.description} onChange={(e) => patchDraft({ description: e.target.value })} rows={2} className="mt-1.5 w-full bg-background border border-border text-xs rounded-xl p-3" />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div>
                                                    <Label className="text-xs font-bold">Provider Service Code</Label>
                                                    <Input value={draft.provider_service_code} onChange={(e) => patchDraft({ provider_service_code: e.target.value })} className="mt-1.5 text-xs font-mono" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-bold">Service Intent</Label>
                                                    <select value={draft.service_intent} onChange={(e) => patchDraft({ service_intent: e.target.value })} className="mt-1.5 w-full bg-background border border-border text-xs rounded-xl px-3 py-2.5">
                                                        <option value="none">Generic / None</option>
                                                        <option value="transfer_intra">Intra-Bank / W2W Transfer</option>
                                                        <option value="transfer_interbank">Inter-Bank NIP Payout</option>
                                                        <option value="bill_airtime">Airtime Recharge</option>
                                                        <option value="bill_cable">Cable TV</option>
                                                        <option value="bill_electricity">Electricity Token</option>
                                                        <option value="coop_dues">Cooperative Dues</option>
                                                        <option value="ajo_contribution">Ajo Contribution</option>
                                                        <option value="hp_repayment">Asset Lease Repayment</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-bold">Status</Label>
                                                    <select value={draft.status} onChange={(e) => patchDraft({ status: e.target.value })} className="mt-1.5 w-full bg-background border border-border text-xs rounded-xl px-3 py-2.5">
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "access" && (
                                        <div className="space-y-5">
                                            <div className="p-4 rounded-xl bg-muted/40 border border-border">
                                                <Label className="text-xs font-bold mb-3 block">Allowed User Roles</Label>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {["member", "coop_admin", "investor", "agent", "superadmin"].map((role) => (
                                                        <label key={role} className="flex items-center gap-2 p-2.5 rounded-lg bg-background border cursor-pointer">
                                                            <input type="checkbox" checked={draft.allowed_roles.includes(role)} onChange={() => toggleArrayField("allowed_roles", role)} />
                                                            <span className="capitalize font-semibold">{role.replace("_", " ")}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-muted/40 border border-border">
                                                <Label className="text-xs font-bold mb-3 block">Economic Sector Targeting</Label>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {["all", "transport", "agriculture", "commerce", "artisan"].map((sector) => (
                                                        <label key={sector} className="flex items-center gap-2 p-2.5 rounded-lg bg-background border cursor-pointer">
                                                            <input type="checkbox" checked={draft.sector_tags.includes(sector)} onChange={() => toggleArrayField("sector_tags", sector)} />
                                                            <span className="capitalize font-semibold">{sector}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs font-bold">Cooperative Scope</Label>
                                                    <select value={draft.cooperative_scope} onChange={(e) => patchDraft({ cooperative_scope: e.target.value })} className="mt-1.5 w-full bg-background border rounded-xl px-3 py-2.5 text-xs">
                                                        <option value="all_cooperatives">All Cooperatives</option>
                                                        <option value="specific_cooperatives">Specific Unions Only</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-bold">Minimum KYC Tier (OlivePay Enforced)</Label>
                                                    <select value={draft.min_kyc_tier} onChange={(e) => patchDraft({ min_kyc_tier: e.target.value })} className="mt-1.5 w-full bg-background border rounded-xl px-3 py-2.5 text-xs">
                                                        <option value="tier_0">Tier 0 (Unverified)</option>
                                                        <option value="tier_1">Tier 1 (BVN)</option>
                                                        <option value="tier_2">Tier 2 (BVN + NIN)</option>
                                                        <option value="tier_3">Tier 3 (Full Docs)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "schema" && (
                                        <VisualFormBuilder
                                            fields={formFields}
                                            onChange={setFormFields}
                                            rawJson={rawJsonSchema}
                                            onRawJsonChange={setRawJsonSchema}
                                        />
                                    )}

                                    {activeTab === "pricing" && (
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs font-bold">Fee Mode</Label>
                                                    <select value={draft.fee_type} onChange={(e) => patchDraft({ fee_type: e.target.value })} className="mt-1.5 w-full bg-background border rounded-xl px-3 py-2.5 text-xs">
                                                        <option value="none">Free (₦0)</option>
                                                        <option value="flat">Flat Fee (NGN)</option>
                                                        <option value="percentage">Percentage (%)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-bold">Fee Value</Label>
                                                    <Input type="number" step="0.01" value={draft.fee_value} onChange={(e) => patchDraft({ fee_value: Number(e.target.value) })} className="mt-1.5 text-xs" />
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-xs font-bold">Settlement Mechanism</Label>
                                                <select value={draft.settlement_type} onChange={(e) => patchDraft({ settlement_type: e.target.value })} className="mt-1.5 w-full bg-background border rounded-xl px-3 py-2.5 text-xs">
                                                    <option value="wallet_debit">Direct Wallet Debit</option>
                                                    <option value="escrow_clearing">Escrow Hold Clearing</option>
                                                    <option value="workflow_only">Workflow Direct Only (No Pre-Debit)</option>
                                                    <option value="informational">Informational / Free Action</option>
                                                </select>
                                            </div>
                                            <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
                                                <label className="flex items-center gap-3 cursor-pointer text-xs font-bold">
                                                    <input type="checkbox" checked={Boolean(draft.sandbox_enabled)} onChange={(e) => patchDraft({ sandbox_enabled: e.target.checked })} />
                                                    Enable Sandbox Simulation
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer text-xs font-bold">
                                                    <input type="checkbox" checked={Boolean(draft.union_markup_allowed)} onChange={(e) => patchDraft({ union_markup_allowed: e.target.checked })} />
                                                    Allow Cooperative Union Fee Markups
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </form>

                                <div className="p-4 border-t border-border bg-card flex items-center justify-between">
                                    <Button type="button" onClick={() => setIsEditorOpen(false)} variant="ghost" className="text-xs font-bold">Cancel</Button>
                                    <Button form="service-form" type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-2 rounded-xl">
                                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        {editingService ? "Save Service" : "Publish Service"}
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </ClientPortal>
        </div>
    )
}
