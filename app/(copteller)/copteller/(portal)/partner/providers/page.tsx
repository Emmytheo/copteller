"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
    Building2, HeartPulse, Truck, Wheat, Award, Plus, Search,
    MapPin, Phone, ShieldCheck, CheckCircle2, Clock, RefreshCw,
    Layers, ArrowUpRight, LayoutGrid, List
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
import { INSTITUTIONAL_PARTNERS, AccreditedProvider } from "@/lib/data/partner-directory"
import { usePartnerOrg } from "@/context/partner-org-context"

// Domain-specific facility categories
const CONTEXT_PROVIDER_CATEGORIES: Record<string, { value: string; label: string; icon: any }[]> = {
    health: [
        { value: "all", label: "All Health Facilities", icon: HeartPulse },
        { value: "tertiary_hospital", label: "Teaching & Tertiary", icon: Building2 },
        { value: "general_hospital", label: "General Hospitals", icon: Building2 },
        { value: "primary_health_centre", label: "Primary Health (PHC)", icon: HeartPulse },
        { value: "specialist_clinic", label: "Specialist Clinics", icon: ShieldCheck },
    ],
    transport: [
        { value: "all", label: "All Inspection & Depots", icon: Truck },
        { value: "fleet_inspection_workshop", label: "Vehicle Inspection Depots", icon: ShieldCheck },
        { value: "oem_hub", label: "OEM Diagnostic Hubs", icon: Truck },
    ],
    agriculture: [
        { value: "all", label: "All Agro Facilities", icon: Wheat },
        { value: "agro_inputs_depot", label: "Seed & Bio-Fertilizer", icon: Wheat },
        { value: "silos", label: "Silos & Off-Take Hubs", icon: Building2 },
    ],
    commerce: [
        { value: "all", label: "All MSME Centres", icon: Award },
        { value: "industrial", label: "Industrial Dev Centres", icon: Building2 },
        { value: "fablab", label: "Cluster FabLabs", icon: Award },
    ],
    multi_sector: [
        { value: "all", label: "All Accredited Network", icon: Layers },
    ]
}

const ZONE_OPTIONS = ["all", "Aba", "Umuahia", "Osisioma", "Ohafia", "Ukwa"]

export default function AccreditedNetworkPage() {
    const { activeOrg, activeOrgSlug, activeSubscope } = usePartnerOrg()

    const [providers, setProviders] = React.useState<AccreditedProvider[]>([])
    const [loading, setLoading] = React.useState(true)
    const [selectedCategory, setSelectedCategory] = React.useState("all")
    const [selectedZone, setSelectedZone] = React.useState("all")
    const [searchQuery, setSearchQuery] = React.useState("")
    const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
    const [submitting, setSubmitting] = React.useState(false)

    // Form state for new facility accreditation
    const [formData, setFormData] = React.useState<{
        name: string
        partnerSlug: string
        category: string
        sector: string
        zone: string
        lga: string
        address: string
        headOfFacility: string
        phone: string
        capacityBedsOrBays: number
        servicesOffered: string
    }>({
        name: "",
        partnerSlug: activeOrgSlug,
        category: activeOrg.sector === "health" ? "specialist_clinic" : "fleet_inspection_workshop",
        sector: activeOrg.sector === "multi_sector" ? "health" : activeOrg.sector,
        zone: activeSubscope?.zone && activeSubscope.zone !== "Statewide" ? activeSubscope.zone : "Aba",
        lga: "Aba South",
        address: "",
        headOfFacility: "",
        phone: "",
        capacityBedsOrBays: 40,
        servicesOffered: ""
    })

    // Synchronize form default with activeOrg
    React.useEffect(() => {
        setFormData(prev => ({
            ...prev,
            partnerSlug: activeOrgSlug,
            category: activeOrg.sector === "health" ? "specialist_clinic" : "fleet_inspection_workshop",
            sector: activeOrg.sector === "multi_sector" ? "health" : activeOrg.sector,
            zone: activeSubscope?.zone && activeSubscope.zone !== "Statewide" ? activeSubscope.zone : prev.zone
        }))
        setSelectedCategory("all")
    }, [activeOrgSlug, activeSubscope])

    const fetchProviders = async () => {
        try {
            setLoading(true)
            const queryParams = new URLSearchParams()
            queryParams.set("partner", activeOrgSlug)
            const zoneFilter = selectedZone !== "all" ? selectedZone : (activeSubscope?.zone && activeSubscope.zone !== "Statewide" ? activeSubscope.zone : "all")
            if (zoneFilter !== "all") queryParams.set("zone", zoneFilter)
            if (searchQuery.trim()) queryParams.set("search", searchQuery.trim())

            const res = await fetch(`/api/copteller/partner/providers?${queryParams.toString()}`)
            const data = await res.json()
            if (data.success) {
                setProviders(data.providers || [])
            }
        } catch (err) {
            console.error("Failed to load providers:", err)
            toast.error("Failed to load accredited facilities")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchProviders()
    }, [activeOrgSlug, activeSubscope, selectedZone, searchQuery])

    const handleCreateProvider = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name || !formData.address || !formData.phone) {
            toast.error("Please fill in all required fields")
            return
        }

        try {
            setSubmitting(true)
            const res = await fetch("/api/copteller/partner/providers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (data.success) {
                toast.success(data.message || "Facility accredited successfully")
                setIsAddModalOpen(false)
                setFormData({
                    name: "",
                    partnerSlug: activeOrgSlug,
                    category: activeOrg.sector === "health" ? "specialist_clinic" : "fleet_inspection_workshop",
                    sector: activeOrg.sector === "multi_sector" ? "health" : activeOrg.sector,
                    zone: "Aba",
                    lga: "Aba South",
                    address: "",
                    headOfFacility: "",
                    phone: "",
                    capacityBedsOrBays: 40,
                    servicesOffered: ""
                })
                fetchProviders()
            } else {
                toast.error(data.error || "Failed to accredit facility")
            }
        } catch (err) {
            toast.error("Network error accrediting facility")
        } finally {
            setSubmitting(false)
        }
    }

    // Filter by context-specific category
    const filteredProviders = providers.filter(p => {
        if (selectedCategory === "all") return true
        return p.category === selectedCategory || (selectedCategory === "oem_hub" && p.name.toLowerCase().includes("tvs"))
    })

    const categories = CONTEXT_PROVIDER_CATEGORIES[activeOrg.sector] || CONTEXT_PROVIDER_CATEGORIES.multi_sector
    const totalCapacity = filteredProviders.reduce((acc, p) => acc + (p.capacityBedsOrBays || 0), 0)
    const isHealth = activeOrg.sector === "health"

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-6 font-sans">
            
            {/* ── HEADER ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 className="h-3 w-3" /> {activeOrg.shortName} Provider Network
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                            {filteredProviders.length} Verified Facilities
                        </Badge>
                        {activeSubscope && (
                            <Badge variant="secondary" className="text-[10px] font-black bg-blue-500/10 text-blue-600">
                                {activeSubscope.name}
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground">
                        {isHealth ? "Accredited Hospital & Clinic Network" : "Accredited Inspection & Depot Network"}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-3xl font-semibold">
                        Authorized {isHealth ? "hospitals, clinics and primary health centers" : "depots, workshops and operational centers"} credentialed to serve enrolled cooperative members under {activeOrg.name}.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        onClick={fetchProviders}
                        className="h-9 sm:h-10 rounded-xl font-bold text-xs flex items-center gap-1.5 border-border bg-card"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-9 sm:h-10 rounded-xl flex items-center gap-1.5 shadow-sm border-0"
                    >
                        <Plus className="h-4 w-4" /> Accredit Facility
                    </Button>
                </div>
            </div>

            {/* ── METRIC TILES ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Total Facilities
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-foreground leading-tight">{filteredProviders.length}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">100% Active &amp; Inspected</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        {isHealth ? "Cumulative Bed Capacity" : "Cumulative Service Bays"}
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-foreground leading-tight">
                        {totalCapacity.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold">
                        {isHealth ? "Inpatient & emergency beds" : "Inspection bays & storage"}
                    </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Primary LGA Cluster
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400 leading-tight">
                        Aba &amp; Umuahia
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold">Urban &amp; rural PHC coverage</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Assigned Enrollees
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                        {activeOrg.activeBeneficiariesCount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold">Accessing accredited facilities</p>
                </div>
            </div>

            {/* ── CONTEXT-SPECIFIC FILTERS & GRID/LIST TOGGLE ─────────────────── */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Domain-specific category pills */}
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
                    {/* Zone Selector */}
                    <div className="flex items-center gap-1 px-2.5 py-1.5 bg-card border border-border/80 rounded-xl text-xs shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <select
                            value={selectedZone}
                            onChange={(e) => setSelectedZone(e.target.value)}
                            className="bg-transparent border-none text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                        >
                            {ZONE_OPTIONS.map(zone => (
                                <option key={zone} value={zone} className="bg-card text-foreground">
                                    {zone === "all" ? "All Zones" : `${zone} Zone`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 sm:w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search facility name, LGA..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9 text-xs rounded-xl"
                        />
                    </div>

                    {/* Grid vs List Toggle */}
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

            {/* ── FACILITIES DISPLAY (GRID OR LIST) ──────────────────────────── */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-sm font-bold text-muted-foreground">Loading {activeOrg.shortName} facilities...</p>
                </div>
            ) : filteredProviders.length === 0 ? (
                <div className="p-10 text-center rounded-3xl border border-dashed border-border bg-card/50 space-y-3">
                    <Building2 className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                    <h3 className="text-base font-bold text-foreground">No facilities found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        No accredited facilities match the current criteria for {activeOrg.shortName}. Register a new accredited hospital or depot.
                    </p>
                    <Button onClick={() => setIsAddModalOpen(true)} className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4 mr-1.5" /> Accredit Facility
                    </Button>
                </div>
            ) : viewMode === "grid" ? (
                /* ── GRID CARD VIEW ─────────────────────────────────────────── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {filteredProviders.map(provider => (
                        <motion.div
                            key={provider.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm hover:border-blue-500/30 transition-all flex flex-col justify-between space-y-4"
                        >
                            <div className="space-y-3">
                                {/* Top Bar */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-xl ${
                                            isHealth
                                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                        }`}>
                                            {isHealth ? <HeartPulse className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-mono font-black uppercase text-muted-foreground">
                                                {provider.facilityCode}
                                            </span>
                                            <p className="text-[10px] font-bold text-muted-foreground capitalize">
                                                {provider.category.replace(/_/g, " ")}
                                            </p>
                                        </div>
                                    </div>

                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-black">
                                        <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Accredited
                                    </Badge>
                                </div>

                                {/* Facility Name & Address */}
                                <div>
                                    <h3 className="text-base font-black text-foreground leading-snug">
                                        {provider.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 font-medium">
                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{provider.address}</span>
                                    </div>
                                </div>

                                {/* Key Details Box */}
                                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-muted/40 border border-border/50 text-[11px]">
                                    <div>
                                        <span className="text-[9px] uppercase tracking-wider font-black text-muted-foreground block">Zone / LGA</span>
                                        <span className="font-bold text-foreground">{provider.zone} ({provider.lga})</span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] uppercase tracking-wider font-black text-muted-foreground block">
                                            {isHealth ? "Bed Capacity" : "Bays / Capacity"}
                                        </span>
                                        <span className="font-bold text-foreground">{provider.capacityBedsOrBays} units</span>
                                    </div>
                                </div>

                                {/* Services Offered Tags */}
                                {provider.servicesOffered && provider.servicesOffered.length > 0 && (
                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase tracking-wider font-black text-muted-foreground block">Services</span>
                                        <div className="flex flex-wrap gap-1">
                                            {provider.servicesOffered.slice(0, 3).map((svc, idx) => (
                                                <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-background border border-border/60 text-muted-foreground">
                                                    {svc}
                                                </span>
                                            ))}
                                            {provider.servicesOffered.length > 3 && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-background border border-border/60 text-muted-foreground">
                                                    +{provider.servicesOffered.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Contact Footer */}
                            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold">
                                <a href={`tel:${provider.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-blue-600 transition-colors">
                                    <Phone className="h-3 w-3" />
                                    <span>{provider.phone}</span>
                                </a>
                                {provider.headOfFacility && (
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                                        {provider.headOfFacility}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                /* ── DENSE LIST/TABLE VIEW ───────────────────────────────────── */
                <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-xs font-sans text-left">
                            <thead className="bg-muted/50 border-b border-border text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="py-3 px-4">Facility Code &amp; Name</th>
                                    <th className="py-3 px-4">Category</th>
                                    <th className="py-3 px-4">Zone / LGA</th>
                                    <th className="py-3 px-4">{isHealth ? "Beds" : "Capacity"}</th>
                                    <th className="py-3 px-4">Contact Phone</th>
                                    <th className="py-3 px-4">Head of Facility</th>
                                    <th className="py-3 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredProviders.map(provider => (
                                    <tr key={provider.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded font-black">
                                                    {provider.facilityCode}
                                                </span>
                                                <div>
                                                    <p className="font-black text-foreground truncate max-w-[200px]">{provider.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{provider.address}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-muted-foreground capitalize">
                                            {provider.category.replace(/_/g, " ")}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-foreground">
                                            {provider.zone} <span className="text-[10px] text-muted-foreground">({provider.lga})</span>
                                        </td>
                                        <td className="py-3 px-4 font-black text-foreground">
                                            {provider.capacityBedsOrBays} units
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-foreground">
                                            {provider.phone}
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            {provider.headOfFacility || "—"}
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                Accredited
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── ACCREDIT FACILITY MODAL ────────────────────────────────────── */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-xl rounded-3xl font-sans">
                    <form onSubmit={handleCreateProvider} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-blue-600" />
                                Accredit Facility for {activeOrg.shortName}
                            </DialogTitle>
                            <DialogDescription className="text-xs font-semibold">
                                Register and accredit a authorized healthcare provider, inspection depot, or workshop under {activeOrg.name}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Facility Name *</label>
                                    <Input
                                        placeholder={isHealth ? "e.g. Living Word Mission Hospital" : "e.g. ATMA Computerized Depot"}
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="h-9 rounded-xl"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Facility Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full h-9 rounded-xl border border-input bg-background px-3 font-semibold text-foreground focus:outline-none capitalize"
                                    >
                                        {isHealth ? (
                                            <>
                                                <option value="specialist_clinic">Specialist Clinic</option>
                                                <option value="general_hospital">General Hospital</option>
                                                <option value="primary_health_centre">Primary Health Centre (PHC)</option>
                                                <option value="tertiary_hospital">Tertiary Hospital</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="fleet_inspection_workshop">Fleet Inspection Workshop</option>
                                                <option value="oem_hub">OEM Master Diagnostics</option>
                                                <option value="agro_inputs_depot">Agro Input Depot</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Zone</label>
                                    <select
                                        value={formData.zone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, zone: e.target.value }))}
                                        className="w-full h-9 rounded-xl border border-input bg-background px-3 font-semibold text-foreground focus:outline-none"
                                    >
                                        <option value="Aba">Aba</option>
                                        <option value="Umuahia">Umuahia</option>
                                        <option value="Osisioma">Osisioma</option>
                                        <option value="Ohafia">Ohafia</option>
                                        <option value="Ukwa">Ukwa</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold text-foreground block mb-1">LGA</label>
                                    <Input
                                        placeholder="e.g. Aba South"
                                        value={formData.lga}
                                        onChange={(e) => setFormData(prev => ({ ...prev, lga: e.target.value }))}
                                        className="h-9 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-foreground block mb-1">{isHealth ? "Beds Capacity" : "Bays Capacity"}</label>
                                    <Input
                                        type="number"
                                        value={formData.capacityBedsOrBays}
                                        onChange={(e) => setFormData(prev => ({ ...prev, capacityBedsOrBays: Number(e.target.value) }))}
                                        className="h-9 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-foreground block mb-1">Physical Address *</label>
                                <Input
                                    placeholder="Full street address and landmark"
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    className="h-9 rounded-xl"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Contact Phone *</label>
                                    <Input
                                        placeholder="e.g. 0803 123 4567"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        className="h-9 rounded-xl"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Head of Facility / CMD</label>
                                    <Input
                                        placeholder="e.g. Dr. Emeka Ikoro"
                                        value={formData.headOfFacility}
                                        onChange={(e) => setFormData(prev => ({ ...prev, headOfFacility: e.target.value }))}
                                        className="h-9 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-foreground block mb-1">Services Offered (comma separated)</label>
                                <Input
                                    placeholder={isHealth ? "e.g. Maternal Care, OPD, Laboratory, Emergency Surgery" : "e.g. Automated Brake Test, Emission Tagging, Diagnostics"}
                                    value={formData.servicesOffered}
                                    onChange={(e) => setFormData(prev => ({ ...prev, servicesOffered: e.target.value }))}
                                    className="h-9 rounded-xl"
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/80">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddModalOpen(false)}
                                className="h-9 rounded-xl text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="h-9 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {submitting ? "Accrediting..." : "Accredit & Register Facility"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    )
}
