"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp, Landmark, HeartPulse, Truck, Wheat, Award,
    Plus, Search, RefreshCw, Layers, CheckCircle2,
    Clock, CircleDollarSign, ArrowUpRight, ArrowRight, ShieldCheck,
    Users2, Sparkles, Building2, AlertCircle, LayoutGrid, List,
    ChevronDown, ChevronUp, Info, Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { INSTITUTIONAL_PARTNERS } from "@/lib/data/partner-directory"
import { PartnerSchemeItem } from "@/app/api/copteller/partner/schemes/route"
import { usePartnerOrg } from "@/context/partner-org-context"
import Link from "next/link"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

// Domain-specific filter categories based on active partner sector
const CONTEXT_CATEGORIES: Record<string, { value: string; label: string; icon: any }[]> = {
    health: [
        { value: "all", label: "All Health Schemes", icon: HeartPulse },
        { value: "informal", label: "Informal Capitation (₦300/wk)", icon: Users2 },
        { value: "family", label: "Household & Family Shield", icon: ShieldCheck },
        { value: "primary", label: "Primary & Rural PHC", icon: Building2 },
    ],
    transport: [
        { value: "all", label: "All Mobility Schemes", icon: Truck },
        { value: "keke", label: "Commercial Tricycle Leases", icon: Truck },
        { value: "inspection", label: "Vehicle Inspection & Permits", icon: ShieldCheck },
        { value: "telemetry", label: "Speed Governor Bonds", icon: Sparkles },
    ],
    agriculture: [
        { value: "all", label: "All Agro Schemes", icon: Wheat },
        { value: "inputs", label: "Seed & Bio-Fertilizer Grants", icon: Wheat },
        { value: "mechanization", label: "Tractor & Tooling Leases", icon: Award },
        { value: "offtake", label: "Harvest Off-Take Facilities", icon: TrendingUp },
    ],
    commerce: [
        { value: "all", label: "All MSME Schemes", icon: Award },
        { value: "tooling", label: "Artisan Workshop Tooling", icon: Award },
        { value: "equipment", label: "Machinery & Equipment Leases", icon: Building2 },
        { value: "cluster", label: "Industrial Cluster Working Capital", icon: TrendingUp },
    ],
    multi_sector: [
        { value: "all", label: "All Partner Schemes", icon: Layers },
        { value: "active", label: "Deploying Tranches", icon: TrendingUp },
        { value: "statutory", label: "Statutory Capitations", icon: Landmark },
    ]
}

export default function PartnerSchemesPage() {
    const { activeOrg, activeOrgSlug, activeSubscope } = usePartnerOrg()

    const [schemes, setSchemes] = React.useState<PartnerSchemeItem[]>([])
    const [aggregateMetrics, setAggregateMetrics] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)
    const [selectedCategory, setSelectedCategory] = React.useState("all")
    const [searchQuery, setSearchQuery] = React.useState("")
    const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")
    const [showArchitectureExplainer, setShowArchitectureExplainer] = React.useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
    const [submitting, setSubmitting] = React.useState(false)

    // Form state for creating a new scheme
    const [formData, setFormData] = React.useState<{
        name: string
        partnerSlug: string
        sector: string
        description: string
        allocatedCapitalKobo: number
        wholesalePerUnitKobo: number
        retailAmortizedPerUnitKobo: number
        weeklyDueKobo: number
        repaymentFrequency: string
        durationMonths: number
        maxCapacityBeneficiaries: number
        eligibleCooperatives: string
        requiredProviderType: string
    }>({
        name: "",
        partnerSlug: activeOrgSlug,
        sector: activeOrg.sector === "multi_sector" ? "health" : activeOrg.sector,
        description: "",
        allocatedCapitalKobo: 5000000000, // ₦50M
        wholesalePerUnitKobo: activeOrg.sector === "health" ? 1200000 : 140000000,
        retailAmortizedPerUnitKobo: activeOrg.sector === "health" ? 1440000 : 162000000,
        weeklyDueKobo: activeOrg.sector === "health" ? 30000 : 1800000,
        repaymentFrequency: "weekly",
        durationMonths: 12,
        maxCapacityBeneficiaries: 1000,
        eligibleCooperatives: "All Registered Abia State Cooperatives",
        requiredProviderType: activeOrg.sector === "health" ? "Accredited Hospitals & PHCs" : "Accredited Inspection & Depot Facilities"
    })

    React.useEffect(() => {
        setFormData(prev => ({
            ...prev,
            partnerSlug: activeOrgSlug,
            sector: activeOrg.sector === "multi_sector" ? "health" : activeOrg.sector,
            wholesalePerUnitKobo: activeOrg.sector === "health" ? 1200000 : 140000000,
            retailAmortizedPerUnitKobo: activeOrg.sector === "health" ? 1440000 : 162000000,
            weeklyDueKobo: activeOrg.sector === "health" ? 30000 : 1800000,
            requiredProviderType: activeOrg.sector === "health" ? "Accredited Hospitals & PHCs" : "Accredited Inspection & Depot Facilities"
        }))
        setSelectedCategory("all")
    }, [activeOrgSlug, activeOrg])

    const fetchSchemes = async () => {
        try {
            setLoading(true)
            const queryParams = new URLSearchParams()
            queryParams.set("partner", activeOrgSlug)
            if (searchQuery.trim()) queryParams.set("search", searchQuery.trim())

            const res = await fetch(`/api/copteller/partner/schemes?${queryParams.toString()}`)
            const data = await res.json()
            if (data.success) {
                setSchemes(data.schemes || [])
                setAggregateMetrics(data.aggregateMetrics)
            }
        } catch (err) {
            console.error("Failed to fetch partner schemes:", err)
            toast.error("Failed to load underwritten schemes")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchSchemes()
    }, [activeOrgSlug, searchQuery])

    const handleCreateScheme = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name || !formData.description) {
            toast.error("Please fill in scheme name and description")
            return
        }

        try {
            setSubmitting(true)
            const res = await fetch("/api/copteller/partner/schemes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (data.success) {
                toast.success(data.message || "Institutional scheme tranche created")
                setIsCreateModalOpen(false)
                setFormData({
                    name: "",
                    partnerSlug: activeOrgSlug,
                    sector: activeOrg.sector === "multi_sector" ? "health" : activeOrg.sector,
                    description: "",
                    allocatedCapitalKobo: 5000000000,
                    wholesalePerUnitKobo: 1200000,
                    retailAmortizedPerUnitKobo: 1440000,
                    weeklyDueKobo: 30000,
                    repaymentFrequency: "weekly",
                    durationMonths: 12,
                    maxCapacityBeneficiaries: 1000,
                    eligibleCooperatives: "All Abia State Cooperatives",
                    requiredProviderType: activeOrg.sector === "health" ? "Accredited Hospitals & PHCs" : "Accredited Facilities"
                })
                fetchSchemes()
            } else {
                toast.error(data.error || "Failed to create scheme")
            }
        } catch (err) {
            toast.error("Network error creating scheme")
        } finally {
            setSubmitting(false)
        }
    }

    // Filter schemes by local context sub-category
    const filteredSchemes = schemes.filter(s => {
        if (selectedCategory === "all") return true
        const text = `${s.name} ${s.description} ${s.code}`.toLowerCase()
        if (selectedCategory === "informal" || selectedCategory === "primary") {
            return text.includes("informal") || text.includes("300") || text.includes("phc") || text.includes("primary")
        }
        if (selectedCategory === "family") {
            return text.includes("family") || text.includes("household") || text.includes("shield")
        }
        if (selectedCategory === "keke") {
            return text.includes("keke") || text.includes("tricycle") || text.includes("tvs")
        }
        if (selectedCategory === "inspection" || selectedCategory === "telemetry") {
            return text.includes("permit") || text.includes("road") || text.includes("inspection") || text.includes("telemetry")
        }
        if (selectedCategory === "inputs" || selectedCategory === "mechanization" || selectedCategory === "offtake") {
            return text.includes("seed") || text.includes("fertilizer") || text.includes("tractor") || text.includes("agro")
        }
        if (selectedCategory === "tooling" || selectedCategory === "equipment" || selectedCategory === "cluster") {
            return text.includes("tool") || text.includes("equipment") || text.includes("sme") || text.includes("artisan")
        }
        return true
    })

    const categories = CONTEXT_CATEGORIES[activeOrg.sector] || CONTEXT_CATEGORIES.multi_sector

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-6 font-sans">
            
            {/* ── HEADER & OPERATIONAL BAR ─────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3" /> {activeOrg.shortName} Underwriting Console
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                            Available Escrow: {fmt(activeOrg.escrowAccount.availableFloatKobo / 100)}
                        </Badge>
                        {activeSubscope && (
                            <Badge variant="secondary" className="text-[10px] font-black bg-blue-500/10 text-blue-600">
                                {activeSubscope.name}
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground">
                        Underwritten Schemes &amp; Float Tranches
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-3xl font-semibold">
                        Structure wholesale bulk underwriting facilities, set member micro-dues schedules, and deploy liquidity into registered cooperatives.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        onClick={fetchSchemes}
                        className="h-9 sm:h-10 rounded-xl font-bold text-xs flex items-center gap-1.5 border-border bg-card"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>

                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-9 sm:h-10 rounded-xl flex items-center gap-1.5 shadow-sm border-0"
                    >
                        <Plus className="h-4 w-4" /> Underwrite New Scheme
                    </Button>
                </div>
            </div>

            {/* ── METRIC STRIP (COMPACT & RESPONSIVE) ─────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Committed Float Pool
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-foreground leading-tight">
                        {fmt((aggregateMetrics?.totalAllocatedKobo || 0) / 100)}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold truncate">
                        {fmt((aggregateMetrics?.totalDeployedKobo || 0) / 100)} active in market
                    </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Recovered Inflows
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                        {fmt((aggregateMetrics?.totalRecoveredKobo || 0) / 100)}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold truncate">
                        {aggregateMetrics?.recoveryRate || "0"}% Current Recovery
                    </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Net Spread Margin
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400 leading-tight">
                        {fmt((aggregateMetrics?.totalSpreadMarginKobo || 0) / 100)}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold truncate">
                        Platform &amp; coop yield spread
                    </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Active Enrollees
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-foreground leading-tight">
                        {(aggregateMetrics?.totalEnrolled || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold truncate">
                        Across {schemes.length} active scheme tranches
                    </p>
                </div>
            </div>

            {/* ── COLLAPSIBLE ARCHITECTURE EXPLAINER (DECLUTTERED) ────────────── */}
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 transition-all overflow-hidden">
                <button
                    onClick={() => setShowArchitectureExplainer(!showArchitectureExplainer)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-black text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>Float Pre-Payment &amp; Micro-Amortization Architecture</span>
                        <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-600 bg-blue-500/10 hidden sm:inline">
                            How Underwriting Works
                        </Badge>
                    </div>
                    {showArchitectureExplainer ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-bold">
                            <span>Details</span>
                            <ChevronDown className="h-4 w-4" />
                        </div>
                    )}
                </button>

                <AnimatePresence>
                    {showArchitectureExplainer && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 pt-1 border-t border-blue-500/10 space-y-3"
                        >
                            <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                                Under this model, {activeOrg.name} and Copteller deploy wholesale capital upfront to service providers (e.g. ₦12,000 annual ABSHIA capitation directly to hospitals). Grassroots cooperative members receive immediate active coverage passes and amortize the cost at an affordable <strong>₦300/week</strong> automatically debited from their Ajo thrifts or digital wallets.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs pt-1">
                                <div className="p-2.5 rounded-xl bg-card border border-border/60">
                                    <span className="text-[9px] uppercase font-black text-muted-foreground block">1. Wholesale Pre-Payment</span>
                                    <span className="text-xs font-black text-blue-600">Bulk Capitation Disbursed</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-card border border-border/60">
                                    <span className="text-[9px] uppercase font-black text-muted-foreground block">2. Retail Amortization</span>
                                    <span className="text-xs font-black text-emerald-600">Weekly Micro-Dues Auto-Swept</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-card border border-border/60">
                                    <span className="text-[9px] uppercase font-black text-muted-foreground block">3. Financing Spread</span>
                                    <span className="text-xs font-black text-indigo-600">+16.2% Float Margin Realized</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── CONTEXT-SPECIFIC FILTERS, SEARCH & GRID/LIST TOGGLE ─────────── */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Context-Specific Categories for activeOrg */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar">
                    {categories.map(cat => {
                        const Icon = cat.icon
                        const isActive = selectedCategory === cat.value
                        return (
                            <button
                                key={cat.value}
                                onClick={() => setSelectedCategory(cat.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    isActive
                                        ? "bg-white dark:bg-slate-800 text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {cat.label}
                            </button>
                        )
                    })}
                </div>

                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder={`Search ${activeOrg.shortName} schemes...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9 text-xs rounded-xl"
                        />
                    </div>

                    {/* Grid vs List View Toggle */}
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-border/60 shrink-0">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === "grid"
                                    ? "bg-white dark:bg-slate-800 text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                            title="Grid Card View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === "list"
                                    ? "bg-white dark:bg-slate-800 text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                            title="Dense List/Table View"
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── SCHEMES DISPLAY (GRID OR LIST VIEW) ─────────────────────────── */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-sm font-bold text-muted-foreground">Loading {activeOrg.shortName} schemes...</p>
                </div>
            ) : filteredSchemes.length === 0 ? (
                <div className="p-10 text-center rounded-3xl border border-dashed border-border bg-card/50 space-y-3">
                    <TrendingUp className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                    <h3 className="text-base font-bold text-foreground">No schemes found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        No active schemes match the selected category for {activeOrg.shortName}. Underwrite a new program tranche to begin deployment.
                    </p>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4 mr-1.5" /> Underwrite Scheme Tranche
                    </Button>
                </div>
            ) : viewMode === "grid" ? (
                /* ── GRID CARD VIEW ─────────────────────────────────────────── */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                    {filteredSchemes.map(scheme => {
                        const pctDeployed = scheme.allocatedCapitalKobo > 0
                            ? Math.min(100, Math.round((scheme.deployedCapitalKobo / scheme.allocatedCapitalKobo) * 100))
                            : 0
                        const isHealth = scheme.sector === "health"

                        return (
                            <motion.div
                                key={scheme.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 sm:p-6 rounded-3xl bg-card border border-border/80 shadow-sm hover:border-blue-500/30 transition-all space-y-4 flex flex-col justify-between"
                            >
                                <div className="space-y-3.5">
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`p-2 rounded-xl shrink-0 ${
                                                isHealth
                                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                            }`}>
                                                {isHealth ? <HeartPulse className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-mono font-black text-muted-foreground">
                                                        {scheme.code}
                                                    </span>
                                                    <Badge variant="outline" className="text-[9px] font-black border-blue-500/20 text-blue-600 bg-blue-500/5 px-1.5 py-0">
                                                        {scheme.repaymentFrequency}
                                                    </Badge>
                                                </div>
                                                <p className="text-[11px] font-bold text-muted-foreground truncate">
                                                    {scheme.partnerName}
                                                </p>
                                            </div>
                                        </div>

                                        <Badge className={`text-[10px] font-black uppercase shrink-0 ${
                                            scheme.status === "active"
                                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                        }`}>
                                            {scheme.status}
                                        </Badge>
                                    </div>

                                    {/* Scheme Title & Description */}
                                    <div>
                                        <h3 className="text-base sm:text-lg font-black text-foreground leading-snug">
                                            {scheme.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1 font-semibold leading-relaxed line-clamp-2">
                                            {scheme.description}
                                        </p>
                                    </div>

                                    {/* Unit Economics Box */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-muted/40 border border-border/50 text-xs">
                                        <div>
                                            <span className="text-[9px] uppercase tracking-wider font-black text-muted-foreground block">Wholesale Bulk</span>
                                            <span className="font-black text-foreground">{fmt(scheme.wholesalePerUnitKobo / 100)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] uppercase tracking-wider font-black text-muted-foreground block">Retail Amortized</span>
                                            <span className="font-black text-foreground">{fmt(scheme.retailAmortizedPerUnitKobo / 100)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] uppercase tracking-wider font-black text-muted-foreground block">Micro-Due</span>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                                                {fmt(scheme.weeklyDueKobo / 100)}/{scheme.repaymentFrequency.slice(0, 2)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] uppercase tracking-wider font-black text-muted-foreground block">Repay Streak</span>
                                            <span className="font-black text-blue-600 dark:text-blue-400">{scheme.repaymentStreakRate}%</span>
                                        </div>
                                    </div>

                                    {/* Capital Float Progress Bar */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-muted-foreground">Capital Deployed</span>
                                            <span className="text-foreground">
                                                {fmt(scheme.deployedCapitalKobo / 100)} / {fmt(scheme.allocatedCapitalKobo / 100)} ({pctDeployed}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                                                style={{ width: `${pctDeployed}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer & Provider info */}
                                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Users2 className="h-3.5 w-3.5 text-blue-500" />
                                        <span>
                                            <strong className="text-foreground">{scheme.enrolledBeneficiaries.toLocaleString()}</strong> / {scheme.maxCapacityBeneficiaries.toLocaleString()} Enrollees
                                        </span>
                                    </div>

                                    <Link href={`/copteller/partner/beneficiaries?search=${scheme.code}`}>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-blue-600 dark:text-blue-400 px-2 gap-1">
                                            View Roster <ArrowRight className="h-3 w-3" />
                                        </Button>
                                    </Link>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            ) : (
                /* ── DENSE LIST/TABLE VIEW (OPTIMIZED FOR HIGH-DENSITY SCANNING) ─── */
                <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-xs font-sans text-left">
                            <thead className="bg-muted/50 border-b border-border text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="py-3 px-4">Scheme Code &amp; Title</th>
                                    <th className="py-3 px-4">Wholesale Capitation</th>
                                    <th className="py-3 px-4">Micro-Amortization</th>
                                    <th className="py-3 px-4">Capital Float Deployed</th>
                                    <th className="py-3 px-4">Enrollees</th>
                                    <th className="py-3 px-4">Streak Rate</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredSchemes.map(scheme => {
                                    const pct = scheme.allocatedCapitalKobo > 0
                                        ? Math.round((scheme.deployedCapitalKobo / scheme.allocatedCapitalKobo) * 100)
                                        : 0

                                    return (
                                        <tr key={scheme.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[10px] text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded font-black">
                                                        {scheme.code}
                                                    </span>
                                                    <div>
                                                        <p className="font-black text-foreground truncate max-w-[200px] sm:max-w-xs">{scheme.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{scheme.requiredProviderType}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-black text-foreground">
                                                {fmt(scheme.wholesalePerUnitKobo / 100)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-black text-emerald-600 block">
                                                    {fmt(scheme.weeklyDueKobo / 100)}/{scheme.repaymentFrequency.slice(0, 2)}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground font-semibold">
                                                    Total: {fmt(scheme.retailAmortizedPerUnitKobo / 100)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="space-y-1 min-w-[120px]">
                                                    <span className="font-bold text-foreground block">
                                                        {fmt(scheme.deployedCapitalKobo / 100)} <span className="text-[10px] text-muted-foreground">({pct}%)</span>
                                                    </span>
                                                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-foreground">
                                                {scheme.enrolledBeneficiaries.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">/ {scheme.maxCapacityBeneficiaries.toLocaleString()}</span>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-blue-600">
                                                {scheme.repaymentStreakRate}%
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                    {scheme.status}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Link href={`/copteller/partner/beneficiaries?search=${scheme.code}`}>
                                                    <Button variant="outline" size="sm" className="h-7 text-xs font-bold rounded-lg px-2">
                                                        Enrollees
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── UNDERWRITE SCHEME MODAL ────────────────────────────────────── */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-xl rounded-3xl font-sans max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleCreateScheme} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                                Underwrite New Scheme for {activeOrg.shortName}
                            </DialogTitle>
                            <DialogDescription className="text-xs font-semibold">
                                Allocate float capital from {activeOrg.name}&apos;s escrow facility and configure the wholesale-to-retail amortization spread.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-xs">
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border flex items-center justify-between">
                                <div>
                                    <span className="text-[9px] uppercase font-black text-muted-foreground block">Active Escrow Account</span>
                                    <span className="font-mono text-xs font-black text-foreground">
                                        {activeOrg.escrowAccount.accountNumber} ({activeOrg.escrowAccount.accountName})
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] uppercase font-black text-muted-foreground block">Available Float</span>
                                    <span className="font-mono text-xs font-black text-emerald-600">
                                        {fmt(activeOrg.escrowAccount.availableFloatKobo / 100)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-foreground block mb-1">Scheme / Program Title *</label>
                                <Input
                                    placeholder={activeOrg.sector === "health" ? "e.g. Aba Shoemaker Primary Health Capitation" : "e.g. Commercial Fleet Subvention"}
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="h-9 rounded-xl"
                                    required
                                />
                            </div>

                            <div>
                                <label className="font-bold text-foreground block mb-1">Mandate &amp; Coverage Description *</label>
                                <textarea
                                    rows={2}
                                    placeholder="Explain how the wholesale float is deployed and how members amortize..."
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full rounded-xl border border-input bg-background p-2.5 font-semibold text-foreground focus:outline-none text-xs"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Allocated Float Capital (Kobo) *</label>
                                    <Input
                                        type="number"
                                        placeholder="5000000000 (₦50M)"
                                        value={formData.allocatedCapitalKobo}
                                        onChange={(e) => setFormData(prev => ({ ...prev, allocatedCapitalKobo: Number(e.target.value) }))}
                                        className="h-9 rounded-xl"
                                        required
                                    />
                                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                        = {fmt(formData.allocatedCapitalKobo / 100)}
                                    </span>
                                </div>
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Target Beneficiary Capacity</label>
                                    <Input
                                        type="number"
                                        value={formData.maxCapacityBeneficiaries}
                                        onChange={(e) => setFormData(prev => ({ ...prev, maxCapacityBeneficiaries: Number(e.target.value) }))}
                                        className="h-9 rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Unit Economics Controls */}
                            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                                    Unit Economics &amp; Spread Configuration
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                        <label className="font-bold text-foreground block mb-1">Wholesale Cost (Kobo)</label>
                                        <Input
                                            type="number"
                                            value={formData.wholesalePerUnitKobo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, wholesalePerUnitKobo: Number(e.target.value) }))}
                                            className="h-8 rounded-lg text-xs"
                                        />
                                        <span className="text-[9px] text-muted-foreground">
                                            {fmt(formData.wholesalePerUnitKobo / 100)} / unit
                                        </span>
                                    </div>
                                    <div>
                                        <label className="font-bold text-foreground block mb-1">Retail Amortized (Kobo)</label>
                                        <Input
                                            type="number"
                                            value={formData.retailAmortizedPerUnitKobo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, retailAmortizedPerUnitKobo: Number(e.target.value) }))}
                                            className="h-8 rounded-lg text-xs"
                                        />
                                        <span className="text-[9px] text-muted-foreground">
                                            {fmt(formData.retailAmortizedPerUnitKobo / 100)} / unit
                                        </span>
                                    </div>
                                    <div>
                                        <label className="font-bold text-foreground block mb-1">Weekly Due (Kobo)</label>
                                        <Input
                                            type="number"
                                            value={formData.weeklyDueKobo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, weeklyDueKobo: Number(e.target.value) }))}
                                            className="h-8 rounded-lg text-xs"
                                        />
                                        <span className="text-[9px] text-emerald-600 font-bold">
                                            {fmt(formData.weeklyDueKobo / 100)} / wk
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Duration (Months)</label>
                                    <Input
                                        type="number"
                                        value={formData.durationMonths}
                                        onChange={(e) => setFormData(prev => ({ ...prev, durationMonths: Number(e.target.value) }))}
                                        className="h-9 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Required Provider Network</label>
                                    <Input
                                        placeholder={activeOrg.sector === "health" ? "Accredited ABSHIA Hospitals & PHCs" : "Accredited Inspection Depots"}
                                        value={formData.requiredProviderType}
                                        onChange={(e) => setFormData(prev => ({ ...prev, requiredProviderType: e.target.value }))}
                                        className="h-9 rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/80">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="h-9 rounded-xl text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="h-9 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {submitting ? "Deploying..." : "Underwrite & Deploy Scheme"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    )
}
