"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Zap, HeartPulse, Truck, Wheat, Award, Plus, Search,
    Filter, RefreshCw, CheckCircle2, Clock, ArrowUpRight,
    Building2, Users2, ShieldCheck, FileText, Layers, ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { toast } from "sonner"
import { INSTITUTIONAL_PARTNERS } from "@/lib/data/partner-directory"
import { usePartnerOrg } from "@/context/partner-org-context"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

interface ServiceItem {
    id: string
    name: string
    partnerSlug: string
    partnerName: string
    sector: string
    category: string
    icon: any
    iconColor: string
    description: string
    wholesaleCost: number
    retailCost: number
    weeklyDue: number
    subsidyPct: number
    activeEnrollees: number
    providerPickerRequired: boolean
    providerNetwork: string
    status: string
}

const ALL_PARTNER_SERVICES: ServiceItem[] = [
    // Health (ABSHIA)
    {
        id: "svc_abshia_basic",
        name: "Cooperative Health Cover (₦300/wk)",
        partnerSlug: "abshia",
        partnerName: "National Artisans Health Mutual",
        sector: "health",
        category: "Primary & Outpatient Care",
        icon: HeartPulse,
        iconColor: "text-rose-600 bg-rose-500/10",
        description: "Statutory health coverage with free primary consultation, maternal delivery, essential medicines, and emergency stabilization.",
        wholesaleCost: 12000,
        retailCost: 14400,
        weeklyDue: 300,
        subsidyPct: 0,
        activeEnrollees: 2840,
        providerPickerRequired: true,
        providerNetwork: "Partner Accredited Hospitals & PHCs",
        status: "active"
    },
    {
        id: "svc_abshia_family",
        name: "Cooperative Household Family Health Shield",
        partnerSlug: "abshia",
        partnerName: "National Artisans Health Mutual",
        sector: "health",
        category: "Family & Inpatient Shield",
        icon: HeartPulse,
        iconColor: "text-rose-600 bg-rose-500/10",
        description: "Comprehensive health coverage for primary member, spouse, and up to 4 children under 18 years across accredited hospitals.",
        wholesaleCost: 45000,
        retailCost: 52000,
        weeklyDue: 1000,
        subsidyPct: 0,
        activeEnrollees: 580,
        providerPickerRequired: true,
        providerNetwork: "Tertiary, General Hospitals & Specialist Centers",
        status: "active"
    },
    {
        id: "svc_abshia_maternal",
        name: "Maternal & Child Under-5 Subsidized Bundle",
        partnerSlug: "abshia",
        partnerName: "National Artisans Health Mutual",
        sector: "health",
        category: "Maternal & Child Health",
        icon: HeartPulse,
        iconColor: "text-rose-600 bg-rose-500/10",
        description: "Dedicated prenatal, post-partum, immunization, and infant nutrition coverage with zero co-pays at primary clinics.",
        wholesaleCost: 18000,
        retailCost: 21600,
        weeklyDue: 450,
        subsidyPct: 10,
        activeEnrollees: 1420,
        providerPickerRequired: true,
        providerNetwork: "Accredited Maternity Clinics & General Hospitals",
        status: "active"
    },
    // Transport (ATMA / Simba TVS)
    {
        id: "svc_transport_lease",
        name: "TVS King Commercial Tricycle Subvention Lease",
        partnerSlug: "simba-tvs",
        partnerName: "Simba Group & TVS Motors Nigeria",
        sector: "transport",
        category: "Asset Financing & Hire-Purchase",
        icon: Truck,
        iconColor: "text-blue-600 bg-blue-500/10",
        description: "Zero upfront downpayment hire-purchase lease with OEM manufacturer warranty, digital telemetry governor, and weekly installment.",
        wholesaleCost: 1400000,
        retailCost: 1620000,
        weeklyDue: 18000,
        subsidyPct: 15,
        activeEnrollees: 102,
        providerPickerRequired: true,
        providerNetwork: "TVS Simba Assembly & Master Diagnostics Hub",
        status: "active"
    },
    {
        id: "svc_transport_permit",
        name: "ATMA Roadworthiness & Digital Permit Micro-Financing",
        partnerSlug: "abia-transport",
        partnerName: "Partner Mobility & Transit Directorate",
        sector: "transport",
        category: "Statutory Permits & Verification",
        icon: Truck,
        iconColor: "text-blue-600 bg-blue-500/10",
        description: "Statutory annual vehicle roadworthiness test, emission tag, and digital transport levy financed upfront, repaid at ₦250/day.",
        wholesaleCost: 30000,
        retailCost: 34500,
        weeklyDue: 1750,
        subsidyPct: 0,
        activeEnrollees: 1348,
        providerPickerRequired: true,
        providerNetwork: "ATMA Computerized Vehicle Inspection Depots",
        status: "active"
    },
    {
        id: "svc_transport_fleet_maint",
        name: "Commercial Fleet Scheduled Servicing & Tire Voucher",
        partnerSlug: "abia-transport",
        partnerName: "Partner Mobility & Transit Directorate",
        sector: "transport",
        category: "Fleet Maintenance & Spares",
        icon: Truck,
        iconColor: "text-blue-600 bg-blue-500/10",
        description: "Quarterly preventative maintenance, tire replacement, and brake pad servicing at authorized cooperative depots.",
        wholesaleCost: 45000,
        retailCost: 51750,
        weeklyDue: 2200,
        subsidyPct: 5,
        activeEnrollees: 620,
        providerPickerRequired: true,
        providerNetwork: "Simba & ATMA Authorized Diagnostic Centers",
        status: "active"
    },
    // Agriculture (USAID / Ministry of Agriculture)
    {
        id: "svc_usaid_inputs",
        name: "USAID Seedling & Bio-Fertilizer 50% Matching Grant",
        partnerSlug: "usaid-agro",
        partnerName: "USAID / Feed the Future Agribusiness",
        sector: "agriculture",
        category: "High-Yield Inputs & Seeds",
        icon: Wheat,
        iconColor: "text-amber-600 bg-amber-500/10",
        description: "50% non-repayable input grant voucher paired with 50% input credit for cassava, maize, and vegetable farming clusters.",
        wholesaleCost: 80000,
        retailCost: 40000,
        weeklyDue: 2500,
        subsidyPct: 50,
        activeEnrollees: 950,
        providerPickerRequired: true,
        providerNetwork: "Regional Agro Seed & Fertilizer Depot",
        status: "active"
    },
    {
        id: "svc_agro_tractor",
        name: "Mechanized Tractor Tillage & Harvester Voucher",
        partnerSlug: "usaid-agro",
        partnerName: "USAID / Feed the Future Agribusiness",
        sector: "agriculture",
        category: "Equipment & Mechanization",
        icon: Wheat,
        iconColor: "text-amber-600 bg-amber-500/10",
        description: "Community tractor service hours pre-purchased wholesale to prepare farm acreage during planting seasons.",
        wholesaleCost: 60000,
        retailCost: 40000,
        weeklyDue: 2000,
        subsidyPct: 33,
        activeEnrollees: 410,
        providerPickerRequired: true,
        providerNetwork: "Regional Agro Mechanization Depots",
        status: "active"
    },
    // Commerce / MSME (SMEDAN)
    {
        id: "svc_smedan_tools",
        name: "Artisan Workshop Tooling & Equipment Facility",
        partnerSlug: "smedan",
        partnerName: "SMEDAN Federal Facility",
        sector: "commerce",
        category: "Tooling & Machinery",
        icon: Award,
        iconColor: "text-emerald-600 bg-emerald-500/10",
        description: "Industrial equipment financing for Aba shoe-makers, leather-workers, and metal fabricators with 10% SMEDAN subvention.",
        wholesaleCost: 280000,
        retailCost: 310000,
        weeklyDue: 6000,
        subsidyPct: 10,
        activeEnrollees: 328,
        providerPickerRequired: true,
        providerNetwork: "SMEDAN Industrial Development Centre Aba",
        status: "active"
    },
    {
        id: "svc_smedan_inventory",
        name: "Aba Cluster Inventory Pre-Financing Line",
        partnerSlug: "smedan",
        partnerName: "SMEDAN Federal Facility",
        sector: "commerce",
        category: "Working Capital & Raw Materials",
        icon: Award,
        iconColor: "text-emerald-600 bg-emerald-500/10",
        description: "Bulk raw leather, textiles, and hardware purchase financing for registered cooperative guilds at Ariaria.",
        wholesaleCost: 200000,
        retailCost: 220000,
        weeklyDue: 5500,
        subsidyPct: 0,
        activeEnrollees: 540,
        providerPickerRequired: true,
        providerNetwork: "SMEDAN Industrial Development Centre Aba",
        status: "active"
    }
]

// Domain-tailored category tabs for each sector
const DOMAIN_CATEGORIES: Record<string, string[]> = {
    health: ["All Health Services", "Primary & Outpatient Care", "Family & Inpatient Shield", "Maternal & Child Health"],
    transport: ["All Mobility Services", "Asset Financing & Hire-Purchase", "Statutory Permits & Verification", "Fleet Maintenance & Spares"],
    agriculture: ["All Agro Services", "High-Yield Inputs & Seeds", "Equipment & Mechanization"],
    commerce: ["All Enterprise Services", "Tooling & Machinery", "Working Capital & Raw Materials"],
    multi_sector: ["All Services", "Primary & Outpatient Care", "Asset Financing & Hire-Purchase", "High-Yield Inputs & Seeds", "Tooling & Machinery"]
}

export default function SubsidizedServicesPage() {
    const { activeOrg, activeOrgSlug } = usePartnerOrg()
    const [services, setServices] = React.useState<ServiceItem[]>(ALL_PARTNER_SERVICES)
    const [scopeFilter, setScopeFilter] = React.useState<"org" | "all">("org")
    const [selectedCategory, setSelectedCategory] = React.useState("all")
    const [searchQuery, setSearchQuery] = React.useState("")
    const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")

    // Active domain category tabs based on activeOrg
    const domainCategories = DOMAIN_CATEGORIES[activeOrg.sector] || DOMAIN_CATEGORIES.multi_sector

    // Reset selectedCategory if activeOrg changes and category is not applicable
    React.useEffect(() => {
        setSelectedCategory("all")
    }, [activeOrgSlug])

    const filteredServices = services.filter(svc => {
        // Scope filter
        if (scopeFilter === "org") {
            // Check matching slug or sector
            if (svc.partnerSlug !== activeOrgSlug && svc.sector !== activeOrg.sector) {
                return false
            }
        }
        // Category filter
        if (selectedCategory !== "all") {
            if (svc.category !== selectedCategory) return false
        }
        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            return svc.name.toLowerCase().includes(q) ||
                svc.description.toLowerCase().includes(q) ||
                svc.partnerName.toLowerCase().includes(q) ||
                svc.providerNetwork.toLowerCase().includes(q)
        }
        return true
    })

    // Compute tailored metrics based on filtered set
    const totalEnrollees = filteredServices.reduce((acc, s) => acc + s.activeEnrollees, 0)
    const totalWeeklyFlow = filteredServices.reduce((acc, s) => acc + (s.weeklyDue * s.activeEnrollees), 0)
    const avgWholesale = filteredServices.length > 0 
        ? Math.round(filteredServices.reduce((acc, s) => acc + s.wholesaleCost, 0) / filteredServices.length)
        : 0

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8 font-sans">
            
            {/* ── HEADER ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <Zap className="h-3 w-3" /> Subsidized Services &amp; Catalogs
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black border-blue-500/30 text-blue-600 bg-blue-500/5">
                            {activeOrg.shortName} Context
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-black border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                            {filteredServices.length} Published
                        </Badge>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                        {activeOrg.sector === "health"
                            ? "Healthcare Subsidized Services"
                            : activeOrg.sector === "transport"
                            ? "Mobility & Transport Services"
                            : activeOrg.sector === "agriculture"
                            ? "Agricultural Subsidized Packages"
                            : "Institutional Subsidized Services"}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl font-semibold">
                        Configure published products and services accessible to cooperative members in the service marketplace, including provider network bindings and micro-amortization pricing.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Link href="/copteller/services">
                        <Button
                            variant="outline"
                            className="h-10 rounded-xl font-bold text-xs flex items-center gap-2 border-border bg-card shadow-sm"
                        >
                            <ExternalLink className="h-3.5 w-3.5" /> View Member Marketplace
                        </Button>
                    </Link>
                </div>
            </div>

            {/* ── DOMAIN-TAILORED METRIC TILES ────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Published Services
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-foreground">{filteredServices.length}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold truncate">
                        {activeOrg.shortName} Active Catalog
                    </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Active Enrollees
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {totalEnrollees.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold truncate">
                        Subscribed members
                    </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Weekly Micro-Dues Flow
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                        {fmt(totalWeeklyFlow)}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold truncate">
                        Per week automated recovery
                    </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Average Wholesale Cost
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
                        {fmt(avgWholesale)}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold truncate">
                        Pre-paid by Copteller Float
                    </p>
                </div>
            </div>

            {/* ── FILTER & VIEW TOGGLE TOOLBAR ─────────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    
                    {/* Left: Organization Scope Switcher */}
                    <div className="flex items-center gap-1.5 p-1 bg-blue-500/10 rounded-2xl border border-blue-500/20 shrink-0 w-fit">
                        <button
                            onClick={() => {
                                setScopeFilter("org")
                                setSelectedCategory("all")
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                scopeFilter === "org"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                            }`}
                        >
                            {activeOrg.shortName} Catalog
                        </button>
                        <button
                            onClick={() => {
                                setScopeFilter("all")
                                setSelectedCategory("all")
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                scopeFilter === "all"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                            }`}
                        >
                            All Partner Catalog
                        </button>
                    </div>

                    {/* Right: Search + Grid/List View Switcher */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search service, partner, provider..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-9 text-xs rounded-xl bg-card border-border"
                            />
                        </div>

                        {/* Grid / List View Toggle */}
                        <div className="flex items-center bg-card border border-border/80 rounded-xl p-0.5 shadow-sm shrink-0">
                            <button
                                onClick={() => setViewMode("grid")}
                                title="Grid View"
                                className={`p-1.5 rounded-lg transition-all ${
                                    viewMode === "grid"
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                title="Table / List View"
                                className={`p-1.5 rounded-lg transition-all ${
                                    viewMode === "list"
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Specific Category Tabs (Strictly domain-relevant to activeOrg or scope) */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar">
                    {domainCategories.map((cat, idx) => {
                        const isAll = idx === 0
                        const isSelected = isAll ? selectedCategory === "all" : selectedCategory === cat
                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(isAll ? "all" : cat)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                                    isSelected
                                        ? "bg-white dark:bg-slate-800 text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {cat}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ── EMPTY STATE ─────────────────────────────────────────────────── */}
            {filteredServices.length === 0 && (
                <div className="text-center py-12 border border-dashed border-border rounded-3xl space-y-3">
                    <Zap className="h-8 w-8 text-muted-foreground mx-auto" />
                    <h3 className="text-base font-bold text-foreground">No published services found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        No service matched the active category filter for {activeOrg.shortName}. Try clearing search or selecting "All Services".
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setSelectedCategory("all")
                            setSearchQuery("")
                            setScopeFilter("all")
                        }}
                        className="text-xs font-bold rounded-xl"
                    >
                        Reset All Filters
                    </Button>
                </div>
            )}

            {/* ── GRID VIEW ───────────────────────────────────────────────────── */}
            {viewMode === "grid" && filteredServices.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {filteredServices.map(svc => {
                        const Icon = svc.icon
                        return (
                            <motion.div
                                key={svc.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                            >
                                <div className="space-y-3">
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`p-2 rounded-xl shrink-0 ${svc.iconColor}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                                                    {svc.category}
                                                </span>
                                                <p className="text-[10px] font-bold text-muted-foreground truncate">
                                                    {svc.partnerName}
                                                </p>
                                            </div>
                                        </div>

                                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-black shrink-0">
                                            Active
                                        </Badge>
                                    </div>

                                    {/* Title & Description */}
                                    <div>
                                        <h3 className="text-sm sm:text-base font-black text-foreground leading-snug">
                                            {svc.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1.5 font-semibold leading-relaxed line-clamp-2">
                                            {svc.description}
                                        </p>
                                    </div>

                                    {/* Pricing Breakdown Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-2 p-3 rounded-2xl bg-muted/40 border border-border/50 text-[11px]">
                                        <div>
                                            <span className="text-[9px] uppercase tracking-wider font-black text-muted-foreground block">Wholesale</span>
                                            <span className="font-bold text-foreground">{fmt(svc.wholesaleCost)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] uppercase tracking-wider font-black text-muted-foreground block">Retail Dues</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(svc.weeklyDue)}/wk</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] uppercase tracking-wider font-black text-muted-foreground block">Enrolled</span>
                                            <span className="font-bold text-blue-600 dark:text-blue-400">{svc.activeEnrollees.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Network Binding */}
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase tracking-wider font-black text-muted-foreground block">
                                            Required Provider Network
                                        </span>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                            <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                            <span className="truncate">{svc.providerNetwork}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                        Form: Dynamic Picker
                                    </span>
                                    <Link href="/copteller/services">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                                            Test Form <ArrowUpRight className="h-3 w-3" />
                                        </span>
                                    </Link>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* ── LIST / TABLE VIEW ───────────────────────────────────────────── */}
            {viewMode === "list" && filteredServices.length > 0 && (
                <div className="rounded-3xl bg-card border border-border/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/80 bg-muted/30 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                    <th className="py-3 px-4">Service &amp; Sector</th>
                                    <th className="py-3 px-4">Category</th>
                                    <th className="py-3 px-4">Wholesale Paid</th>
                                    <th className="py-3 px-4">Member Due</th>
                                    <th className="py-3 px-4">Enrollees</th>
                                    <th className="py-3 px-4">Provider Network Binding</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 text-xs">
                                {filteredServices.map(svc => {
                                    const Icon = svc.icon
                                    return (
                                        <tr key={svc.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-foreground">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-1.5 rounded-lg shrink-0 ${svc.iconColor}`}>
                                                        <Icon className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-foreground">{svc.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-semibold">{svc.partnerName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-muted-foreground font-medium">
                                                <Badge variant="outline" className="text-[10px] font-semibold">
                                                    {svc.category}
                                                </Badge>
                                            </td>
                                            <td className="py-3.5 px-4 font-black text-foreground">
                                                {fmt(svc.wholesaleCost)}
                                            </td>
                                            <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400">
                                                {fmt(svc.weeklyDue)}/wk
                                            </td>
                                            <td className="py-3.5 px-4 font-black text-blue-600 dark:text-blue-400">
                                                {svc.activeEnrollees.toLocaleString()}
                                            </td>
                                            <td className="py-3.5 px-4 text-muted-foreground font-medium max-w-[200px] truncate">
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="h-3 w-3 text-blue-500 shrink-0" />
                                                    <span className="truncate">{svc.providerNetwork}</span>
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-black">
                                                    Active
                                                </Badge>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <Link href="/copteller/services">
                                                    <Button variant="ghost" size="sm" className="h-7 text-[11px] font-bold text-blue-600 dark:text-blue-400 gap-1 px-2">
                                                        Test <ArrowUpRight className="h-3 w-3" />
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

        </div>
    )
}

