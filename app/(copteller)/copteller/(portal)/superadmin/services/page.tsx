"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Zap, Plus, Search, Filter, Play, Edit3, Trash2, CheckCircle2,
    XCircle, Shield, Users, Layers, ArrowUpRight, Check, Sparkles,
    Building2, RefreshCw, Cpu, Activity, Sliders, Eye, FileJson,
    Coins, DollarSign, ArrowRight, Tag, HelpCircle
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

export default function SuperadminServicesPage() {
    const [services, setServices] = React.useState<ServiceItem[]>([])
    const [categories, setCategories] = React.useState<CategoryItem[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [selectedCategory, setSelectedCategory] = React.useState("all")
    const [statusFilter, setStatusFilter] = React.useState("all")

    // Slide-over Modal state
    const [isEditorOpen, setIsEditorOpen] = React.useState(false)
    const [editingService, setEditingService] = React.useState<ServiceItem | null>(null)
    const [activeTab, setActiveTab] = React.useState<"general" | "access" | "schema" | "pricing">("general")
    const [isSaving, setIsSaving] = React.useState(false)

    // Form builder state for editor
    const [formFields, setFormFields] = React.useState<any[]>([])
    const [rawJsonSchema, setRawJsonSchema] = React.useState("")

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [servicesRes, categoriesRes] = await Promise.all([
                fetch("/api/copteller/services?all=1"),
                fetch("/api/copteller/services/categories")
            ])
            const servicesData = await servicesRes.json()
            const categoriesData = await categoriesRes.json()

            if (servicesData.success) {
                setServices(servicesData.services || [])
            }
            if (categoriesData.success) {
                setCategories(categoriesData.categories || [])
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
        setFormFields([
            { name: "amount", label: "Amount (NGN)", type: "number", required: true, placeholder: "5000" },
            { name: "accountNumber", label: "Beneficiary Account Number", type: "text", required: true, placeholder: "10-digit account" },
        ])
        setRawJsonSchema(JSON.stringify([
            { name: "amount", label: "Amount (NGN)", type: "number", required: true, placeholder: "5000" },
            { name: "accountNumber", label: "Beneficiary Account Number", type: "text", required: true, placeholder: "10-digit account" },
        ], null, 2))
        setActiveTab("general")
        setIsEditorOpen(true)
    }

    const handleOpenEdit = (service: ServiceItem) => {
        setEditingService(service)
        const fields = Array.isArray(service.form_schema) ? service.form_schema : []
        setFormFields(fields)
        setRawJsonSchema(JSON.stringify(fields, null, 2))
        setActiveTab("general")
        setIsEditorOpen(true)
    }

    const handleSaveService = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSaving(true)
        const formData = new FormData(e.currentTarget)

        let parsedSchema = formFields
        try {
            if (rawJsonSchema) {
                parsedSchema = JSON.parse(rawJsonSchema)
            }
        } catch {
            toast.error("Invalid JSON Schema format")
            setIsSaving(false)
            return
        }

        const allowedRoles = formData.getAll("allowed_roles") as string[]
        const sectorTags = formData.getAll("sector_tags") as string[]

        const payloadData = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            icon: (formData.get("icon") as string) || "Zap",
            category: formData.get("category") as string,
            provider_service_code: formData.get("provider_service_code") as string,
            service_intent: formData.get("service_intent") as string,
            fee_type: formData.get("fee_type") as string,
            fee_value: Number(formData.get("fee_value")) || 0,
            settlement_type: formData.get("settlement_type") as string,
            min_kyc_tier: formData.get("min_kyc_tier") as string,
            cooperative_scope: formData.get("cooperative_scope") as string,
            allowed_roles: allowedRoles.length > 0 ? allowedRoles : ["member", "coop_admin", "superadmin"],
            sector_tags: sectorTags.length > 0 ? sectorTags : ["all"],
            sandbox_enabled: formData.get("sandbox_enabled") === "on",
            union_markup_allowed: formData.get("union_markup_allowed") === "on",
            status: formData.get("status") as string,
            form_schema: parsedSchema,
        }

        try {
            const url = editingService
                ? `/api/copteller/services/${editingService.id}`
                : `/api/copteller/services`
            const method = editingService ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadData),
            })
            const data = await res.json()

            if (data.success) {
                toast.success(editingService ? "Service updated successfully!" : "New service created successfully!")
                setIsEditorOpen(false)
                fetchData()
            } else {
                toast.error(data.error || "Failed to save service")
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to save service")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this service?")) return
        try {
            const res = await fetch(`/api/copteller/services/${id}`, { method: "DELETE" })
            const data = await res.json()
            if (data.success) {
                toast.success("Service deleted successfully")
                setServices(prev => prev.filter(s => s.id !== id))
            } else {
                toast.error(data.error || "Failed to delete service")
            }
        } catch {
            toast.error("Failed to delete service")
        }
    }

    // Filtered services list
    const filteredServices = services.filter(service => {
        const matchesSearch = searchQuery === "" ||
            service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.provider_service_code.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesCat = selectedCategory === "all" ||
            (service.category && service.category.slug === selectedCategory)

        const matchesStatus = statusFilter === "all" || service.status === statusFilter

        return matchesSearch && matchesCat && matchesStatus
    })

    const totalActive = services.filter(s => s.status === "active").length
    const totalSandbox = services.filter(s => s.sandbox_enabled).length

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Ambient glow — theme-aware */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 right-[20%] w-[400px] h-[400px] bg-rose-500/3 dark:bg-rose-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-[15%] w-[350px] h-[350px] bg-emerald-500/3 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">

                {/* ── HEADER ─────────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                                <Cpu className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                                Core Services Registry · SuperAdmin Engine
                            </p>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">
                            Service Management &amp; Access Matrix
                        </h1>
                        <p className="text-xs text-muted-foreground mt-1 max-w-2xl font-semibold">
                            Define dynamic form schemas, multi-persona visibility rules, API bindings, fee structures, and sandbox environments for all platform operations.
                        </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 shrink-0">
                        <Link href="/copteller/superadmin/services/simulator" className="flex-1 sm:flex-initial">
                            <Button variant="outline" className="w-full sm:w-auto text-xs font-bold gap-2 h-9 rounded-xl">
                                <Play className="w-3.5 h-3.5 text-emerald-500" />
                                Open Sandbox
                            </Button>
                        </Link>
                        <Button onClick={handleOpenCreate} className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-2 h-9 rounded-xl shadow-lg shadow-emerald-950/30">
                            <Plus className="w-4 h-4" />
                            Create Service
                        </Button>
                    </div>
                </div>

                {/* ── KPI STRIP ──────────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[
                        {
                            label: "Total Services", value: services.length,
                            sub: `${totalActive} Active in Production`,
                            icon: <Zap className="w-4 h-4 text-emerald-500" />,
                            subColor: "text-emerald-600 dark:text-emerald-400"
                        },
                        {
                            label: "Service Categories", value: categories.length,
                            sub: "Transfers, Bills, Leases, Ajo",
                            icon: <Layers className="w-4 h-4 text-blue-500" />,
                            subColor: "text-muted-foreground"
                        },
                        {
                            label: "Sandbox Enabled", value: totalSandbox,
                            sub: "Dry-run Simulation Ready",
                            icon: <Activity className="w-4 h-4 text-amber-500" />,
                            subColor: "text-amber-600 dark:text-amber-400"
                        },
                        {
                            label: "Settlement Rail", value: "Kuda v2.1",
                            sub: "34 OpenAPI Endpoints Seeded",
                            icon: <Shield className="w-4 h-4 text-purple-500" />,
                            subColor: "text-purple-600 dark:text-purple-400"
                        },
                    ].map((stat, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                                {stat.icon}
                            </div>
                            <p className="text-2xl font-black">{stat.value}</p>
                            <span className={`text-[10px] font-semibold flex items-center gap-1 ${stat.subColor}`}>
                                {stat.sub}
                            </span>
                        </div>
                    ))}
                </div>

                {/* ── FILTER BAR ─────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border p-3 rounded-2xl">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search service name, code, intent..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 text-xs rounded-xl h-9"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="bg-background border border-border text-xs text-foreground rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        >
                            <option value="all">All Categories ({categories.length})</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.slug}>{c.name}</option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-background border border-border text-xs text-foreground rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <Button onClick={fetchData} variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>

                {/* ── SERVICES TABLE ─────────────────────────────────────────────── */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left text-xs">
                            <thead className="bg-muted/40 text-[10px] uppercase font-black tracking-wider text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="px-5 py-3.5">Service &amp; Biller</th>
                                    <th className="px-4 py-3.5">Category</th>
                                    <th className="px-4 py-3.5">Allowed Personas</th>
                                    <th className="px-4 py-3.5">Sectors</th>
                                    <th className="px-4 py-3.5">Settlement &amp; Pricing</th>
                                    <th className="px-4 py-3.5">Status</th>
                                    <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-medium text-foreground">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-14 text-center text-muted-foreground">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                                            Loading Copteller Services Engine...
                                        </td>
                                    </tr>
                                ) : filteredServices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-14 text-center text-muted-foreground">
                                            No services found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredServices.map(service => (
                                        <tr key={service.id} className="hover:bg-muted/30 transition-colors">
                                            {/* Service Name */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                                                        <Zap className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">{service.name}</p>
                                                        <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                                                            {service.description || "No description provided."}
                                                        </p>
                                                        {service.provider_service_code && (
                                                            <span className="text-[10px] font-mono text-muted-foreground mt-0.5 inline-block">
                                                                Code: {service.provider_service_code}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="px-4 py-4">
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted border border-border text-foreground">
                                                    {service.category?.name || "General"}
                                                </span>
                                            </td>

                                            {/* Allowed Roles */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                                    {(service.allowed_roles || ["member", "coop_admin"]).map(role => {
                                                        const r = ROLE_LABELS[role] || { label: role, bg: "bg-muted", text: "text-foreground" }
                                                        return (
                                                            <span key={role} className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${r.bg} ${r.text}`}>
                                                                {r.label}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            </td>

                                            {/* Sector Tags */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {(service.sector_tags || ["all"]).map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-muted text-muted-foreground uppercase tracking-tight">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>

                                            {/* Pricing */}
                                            <td className="px-4 py-4">
                                                <div>
                                                    <p className="font-bold">
                                                        {service.fee_type === "none"
                                                            ? "Free"
                                                            : service.fee_type === "flat"
                                                            ? `₦${service.fee_value.toLocaleString()} Flat`
                                                            : `${service.fee_value}%`}
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground capitalize">
                                                        {service.settlement_type.replace("_", " ")}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                    service.status === "active"
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${service.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                                                    {service.status === "active" ? "Active" : "Inactive"}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link href={`/copteller/superadmin/services/simulator?serviceId=${service.id}`}>
                                                        <Button size="sm" variant="outline" className="h-8 px-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-[11px] font-bold gap-1 rounded-lg">
                                                            <Play className="w-3 h-3" /> Test
                                                        </Button>
                                                    </Link>
                                                    <Button onClick={() => handleOpenEdit(service)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg">
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button onClick={() => handleDelete(service.id)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500 rounded-lg">
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

            </div>{/* /max-w-7xl */}

            {/* ── SLIDE-OVER CREATE / EDIT DRAWER (IN TRUE PORTAL) ──────────── */}
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
                                {/* Drawer Header */}
                                <div className="p-6 border-b border-border flex items-center justify-between bg-card">
                                    <div>
                                        <h2 className="text-lg font-black">
                                            {editingService ? `Edit: ${editingService.name}` : "Create New Platform Service"}
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Configure form schema, validation triggers, and access matrix.
                                        </p>
                                    </div>
                                    <Button onClick={() => setIsEditorOpen(false)} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                                        <XCircle className="w-5 h-5" />
                                    </Button>
                                </div>

                                {/* Tabs Strip */}
                                <div className="flex border-b border-border bg-card/60 px-4 sm:px-6 gap-3 sm:gap-6 text-xs font-bold overflow-x-auto no-scrollbar">
                                    {(["general", "access", "schema", "pricing"] as const).map((tab, i) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`py-3 border-b-2 transition-colors capitalize whitespace-nowrap shrink-0 ${
                                                activeTab === tab
                                                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                                    : "border-transparent text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            {i + 1}. {tab === "general" ? "General & Intent" : tab === "access" ? "Access Matrix" : tab === "schema" ? "Form Schema" : "Pricing & Settlement"}
                                        </button>
                                    ))}
                                </div>

                                {/* Drawer Body */}
                                <form id="service-form" onSubmit={handleSaveService} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

                                    {/* ── GENERAL ── */}
                                    {activeTab === "general" && (
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-xs font-bold">Service Name *</Label>
                                                <Input
                                                    name="name"
                                                    defaultValue={editingService?.name || ""}
                                                    required
                                                    placeholder="e.g. Kuda Instant Interbank Transfer"
                                                    className="mt-1.5 text-xs"
                                                />
                                            </div>

                                            <div>
                                                <Label className="text-xs font-bold">Service Category *</Label>
                                                <select
                                                    name="category"
                                                    defaultValue={editingService?.category?.id || categories[0]?.id || ""}
                                                    required
                                                    className="mt-1.5 w-full bg-background border border-border text-xs text-foreground rounded-xl px-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                                >
                                                    {categories.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <Label className="text-xs font-bold">Description</Label>
                                                <textarea
                                                    name="description"
                                                    defaultValue={editingService?.description || ""}
                                                    rows={3}
                                                    placeholder="Provide user-facing instructions and details for this service..."
                                                    className="mt-1.5 w-full bg-background border border-border text-xs text-foreground rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                <div>
                                                    <Label className="text-xs font-bold">Provider Service Code</Label>
                                                    <Input
                                                        name="provider_service_code"
                                                        defaultValue={editingService?.provider_service_code || ""}
                                                        placeholder="e.g. kuda_interbank"
                                                        className="mt-1.5 text-xs font-mono"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-bold">Service Intent</Label>
                                                    <select
                                                        name="service_intent"
                                                        defaultValue={editingService?.service_intent || "none"}
                                                        className="mt-1.5 w-full bg-background border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                                    >
                                                        <option value="none">Generic / None</option>
                                                        <option value="transfer_intra">Intra-Bank Transfer</option>
                                                        <option value="transfer_interbank">Inter-Bank Transfer</option>
                                                        <option value="bill_airtime">Airtime Recharge</option>
                                                        <option value="bill_cable">Cable TV Subscription</option>
                                                        <option value="bill_electricity">Electricity Token</option>
                                                        <option value="coop_dues">Cooperative Dues</option>
                                                        <option value="ajo_contribution">Ajo Contribution</option>
                                                        <option value="hp_repayment">Asset Lease Repayment</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <Label className="text-xs font-bold">Publication Status</Label>
                                                <select
                                                    name="status"
                                                    defaultValue={editingService?.status || "active"}
                                                    className="mt-1.5 w-full bg-background border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                                >
                                                    <option value="active">Active (Visible to Authorized Users)</option>
                                                    <option value="inactive">Inactive / Under Maintenance</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── ACCESS MATRIX ── */}
                                    {activeTab === "access" && (
                                        <div className="space-y-5">
                                            <div className="p-4 rounded-xl bg-muted/40 border border-border">
                                                <Label className="text-xs font-bold mb-3 block">Allowed User Roles</Label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                    {["member", "coop_admin", "investor", "agent", "superadmin"].map(role => (
                                                        <label key={role} className="flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border cursor-pointer hover:border-emerald-500/30 transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                name="allowed_roles"
                                                                value={role}
                                                                defaultChecked={editingService?.allowed_roles?.includes(role) ?? true}
                                                                className="rounded border-border bg-background text-emerald-500 focus:ring-emerald-500/40"
                                                            />
                                                            <span className="capitalize font-semibold">{role.replace("_", " ")}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-xl bg-muted/40 border border-border">
                                                <Label className="text-xs font-bold mb-3 block">Economic Sector Targeting</Label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                    {["all", "transport", "agriculture", "commerce", "artisan"].map(sector => (
                                                        <label key={sector} className="flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border cursor-pointer hover:border-emerald-500/30 transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                name="sector_tags"
                                                                value={sector}
                                                                defaultChecked={editingService?.sector_tags?.includes(sector) ?? (sector === "all")}
                                                                className="rounded border-border bg-background text-emerald-500 focus:ring-emerald-500/40"
                                                            />
                                                            <span className="capitalize font-semibold">{sector}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                <div>
                                                    <Label className="text-xs font-bold">Cooperative Scope</Label>
                                                    <select
                                                        name="cooperative_scope"
                                                        defaultValue={editingService?.cooperative_scope || "all_cooperatives"}
                                                        className="mt-1.5 w-full bg-background border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                                    >
                                                        <option value="all_cooperatives">All Cooperatives (Global)</option>
                                                        <option value="specific_cooperatives">Specific Whitelisted Unions</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-bold">Minimum KYC Tier</Label>
                                                    <select
                                                        name="min_kyc_tier"
                                                        defaultValue={editingService?.min_kyc_tier || "tier_1"}
                                                        className="mt-1.5 w-full bg-background border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                                    >
                                                        <option value="tier_0">Tier 0 (Unverified)</option>
                                                        <option value="tier_1">Tier 1 (Basic BVN/NIN)</option>
                                                        <option value="tier_2">Tier 2 (Full KYC &amp; Address)</option>
                                                        <option value="tier_3">Tier 3 (Enhanced)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── SCHEMA ── */}
                                    {activeTab === "schema" && (
                                        <div className="space-y-4">
                                            <VisualFormBuilder
                                                fields={formFields}
                                                onChange={setFormFields}
                                                rawJson={rawJsonSchema}
                                                onRawJsonChange={setRawJsonSchema}
                                            />
                                        </div>
                                    )}

                                    {/* ── PRICING ── */}
                                    {activeTab === "pricing" && (
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                <div>
                                                    <Label className="text-xs font-bold">Fee Calculation Mode</Label>
                                                    <select
                                                        name="fee_type"
                                                        defaultValue={editingService?.fee_type || "none"}
                                                        className="mt-1.5 w-full bg-background border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                                    >
                                                        <option value="none">Free (₦0.00)</option>
                                                        <option value="flat">Flat Fee (NGN)</option>
                                                        <option value="percentage">Percentage (%)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-bold">Fee Value</Label>
                                                    <Input
                                                        name="fee_value"
                                                        type="number"
                                                        step="0.01"
                                                        defaultValue={editingService?.fee_value || 0}
                                                        placeholder="e.g. 50 or 1.5"
                                                        className="mt-1.5 text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <Label className="text-xs font-bold">Settlement Mechanism</Label>
                                                <select
                                                    name="settlement_type"
                                                    defaultValue={editingService?.settlement_type || "wallet_debit"}
                                                    className="mt-1.5 w-full bg-background border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                                >
                                                    <option value="wallet_debit">Direct Wallet Debit (Immediate settlement)</option>
                                                    <option value="escrow_clearing">Escrow Vault Clearing (Hold until delivered)</option>
                                                    <option value="cash_agent">Agent Cash Collection (POS Terminal)</option>
                                                    <option value="informational">Informational / Free Action</option>
                                                </select>
                                            </div>

                                            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-4">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name="sandbox_enabled"
                                                        defaultChecked={editingService?.sandbox_enabled ?? true}
                                                        className="rounded border-border bg-background text-emerald-500 focus:ring-emerald-500/40"
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold">Enable Sandbox Simulation</p>
                                                        <p className="text-[11px] text-muted-foreground">Allows admins to dry-run test without performing financial debits.</p>
                                                    </div>
                                                </label>

                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name="union_markup_allowed"
                                                        defaultChecked={editingService?.union_markup_allowed ?? true}
                                                        className="rounded border-border bg-background text-emerald-500 focus:ring-emerald-500/40"
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold">Allow Union Fee Markups</p>
                                                        <p className="text-[11px] text-muted-foreground">Permit cooperative union admins to apply local convenience commissions.</p>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </form>

                                {/* Drawer Footer */}
                                <div className="p-4 border-t border-border bg-card flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 items-center justify-between">
                                    <Button onClick={() => setIsEditorOpen(false)} variant="ghost" className="w-full sm:w-auto text-muted-foreground text-xs font-bold">
                                        Cancel
                                    </Button>
                                    <Button form="service-form" type="submit" disabled={isSaving} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-2 rounded-xl">
                                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        {editingService ? "Update Service" : "Publish Service"}
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
