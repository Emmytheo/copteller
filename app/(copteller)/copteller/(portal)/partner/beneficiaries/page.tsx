"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Users2, HeartPulse, Truck, Wheat, Award, Search,
    Download, RefreshCw, CheckCircle2, Clock,
    CreditCard, QrCode, ExternalLink, ShieldCheck, MapPin,
    AlertCircle, Phone, ArrowUpRight, ChevronRight, X,
    LayoutGrid, List, Sparkles, Building2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { INSTITUTIONAL_PARTNERS } from "@/lib/data/partner-directory"
import { usePartnerOrg } from "@/context/partner-org-context"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

const CONTEXT_BENEFICIARY_CATEGORIES: Record<string, { value: string; label: string; icon: any }[]> = {
    health: [
        { value: "all", label: "All Health Enrollees", icon: HeartPulse },
        { value: "informal", label: "Informal Capitation (₦300/wk)", icon: Users2 },
        { value: "family", label: "Household Family Shield", icon: ShieldCheck },
        { value: "streaks", label: "12+ Wk Consistent Streaks", icon: Sparkles },
    ],
    transport: [
        { value: "all", label: "All Mobility Operators", icon: Truck },
        { value: "keke", label: "Tricycle Lease Operators", icon: Truck },
        { value: "permits", label: "Roadworthiness Permits", icon: ShieldCheck },
        { value: "streaks", label: "12+ Wk Consistent Streaks", icon: Sparkles },
    ],
    agriculture: [
        { value: "all", label: "All Agro Beneficiaries", icon: Wheat },
        { value: "inputs", label: "Bio-Fertilizer Grants", icon: Wheat },
        { value: "farmers", label: "Cassava Cluster Farmers", icon: Users2 },
    ],
    commerce: [
        { value: "all", label: "All MSME Artisans", icon: Award },
        { value: "leather", label: "Aba Leather Guild", icon: Award },
        { value: "garment", label: "Garment & Fabricators", icon: Building2 },
    ],
    multi_sector: [
        { value: "all", label: "All Beneficiaries", icon: Users2 },
    ]
}

export default function PartnerBeneficiariesPage() {
    const { activeOrg, activeOrgSlug, activeSubscope } = usePartnerOrg()

    const [beneficiaries, setBeneficiaries] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [selectedCategory, setSelectedCategory] = React.useState("all")
    const [searchQuery, setSearchQuery] = React.useState("")
    const [viewMode, setViewMode] = React.useState<"grid" | "list">("list")
    const [selectedBen, setSelectedBen] = React.useState<any>(null)
    const [isPassModalOpen, setIsPassModalOpen] = React.useState(false)

    const fetchBeneficiaries = async () => {
        try {
            setLoading(true)
            const queryParams = new URLSearchParams()
            queryParams.set("partner", activeOrgSlug)
            if (searchQuery.trim()) queryParams.set("search", searchQuery.trim())

            const res = await fetch(`/api/copteller/partner/beneficiaries?${queryParams.toString()}`)
            const data = await res.json()
            if (data.success) {
                setBeneficiaries(data.beneficiaries || [])
            }
        } catch (err) {
            console.error("Failed to load beneficiaries:", err)
            toast.error("Failed to load beneficiary roster")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchBeneficiaries()
        setSelectedCategory("all")
    }, [activeOrgSlug, searchQuery])

    const handleExportCSV = () => {
        if (beneficiaries.length === 0) {
            toast.error("No records to export")
            return
        }

        const headers = ["Beneficiary Name", "Phone", "NIN", "Cooperative", "Program", "Policy Code", "Assigned Provider", "Wholesale Cost (NGN)", "Total Obligation (NGN)", "Total Paid (NGN)", "Streak (Weeks)", "Status"]
        const rows = beneficiaries.map(b => [
            `"${b.memberName}"`,
            `"${b.phone}"`,
            `"${b.nin}"`,
            `"${b.cooperativeName}"`,
            `"${b.packageName}"`,
            `"${b.policyCode}"`,
            `"${b.assignedProvider}"`,
            (b.wholesaleFloatCost / 100).toFixed(2),
            (b.totalObligation / 100).toFixed(2),
            (b.totalPaid / 100).toFixed(2),
            b.repaymentStreakWeeks,
            b.status
        ])

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `${activeOrg.slug}_beneficiaries_${Date.now()}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("Roster exported to CSV successfully")
    }

    const openPassModal = (ben: any) => {
        setSelectedBen(ben)
        setIsPassModalOpen(true)
    }

    // Filter by context sub-category
    const filteredBeneficiaries = beneficiaries.filter(b => {
        if (selectedCategory === "all") return true
        if (selectedCategory === "streaks") return (b.repaymentStreakWeeks || 0) >= 12
        const text = `${b.packageName} ${b.policyCode}`.toLowerCase()
        if (selectedCategory === "informal") return text.includes("informal") || text.includes("basic")
        if (selectedCategory === "family") return text.includes("family") || text.includes("shield")
        if (selectedCategory === "keke") return text.includes("keke") || text.includes("lease") || text.includes("tricycle")
        if (selectedCategory === "permits") return text.includes("permit") || text.includes("road")
        return true
    })

    const categories = CONTEXT_BENEFICIARY_CATEGORIES[activeOrg.sector] || CONTEXT_BENEFICIARY_CATEGORIES.multi_sector
    const totalObligations = filteredBeneficiaries.reduce((acc, b) => acc + (b.totalObligation || 0), 0)
    const totalRecovered = filteredBeneficiaries.reduce((acc, b) => acc + (b.totalPaid || 0), 0)
    const activeStreakCount = filteredBeneficiaries.filter(b => (b.repaymentStreakWeeks || 0) >= 12).length

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-6 font-sans">
            
            {/* ── HEADER ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <Users2 className="h-3 w-3" /> {activeOrg.shortName} Enrollee Directory
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                            {filteredBeneficiaries.length} Live Enrollees
                        </Badge>
                        {activeSubscope && (
                            <Badge variant="secondary" className="text-[10px] font-black bg-blue-500/10 text-blue-600">
                                {activeSubscope.name}
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground">
                        Cooperative Beneficiary Directory &amp; Passes
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-3xl font-semibold">
                        Real-time verified registry of enrolled cooperative members, assigned healthcare facilities/workshops, micro-repayment telemetry, and digital credential passes.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        onClick={fetchBeneficiaries}
                        className="h-9 sm:h-10 rounded-xl font-bold text-xs flex items-center gap-1.5 border-border bg-card"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button
                        onClick={handleExportCSV}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 sm:h-10 rounded-xl flex items-center gap-1.5 shadow-sm border-0"
                    >
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* ── METRIC STRIP ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Total Enrollees
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-foreground leading-tight">{filteredBeneficiaries.length.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">Active policy &amp; pass holders</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Cumulative Obligation
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-foreground leading-tight">{fmt(totalObligations / 100)}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">Amortized retail schedule</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Collected Micro-Dues
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                        {fmt(totalRecovered / 100)}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold">
                        {totalObligations > 0 ? ((totalRecovered / totalObligations) * 100).toFixed(1) : 0}% Amortized
                    </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Consistent Streaks
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400 leading-tight">
                        {activeStreakCount}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold">12+ consecutive weeks</p>
                </div>
            </div>

            {/* ── CONTEXT-SPECIFIC FILTERS & GRID/LIST TOGGLE ─────────────────── */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder={`Search ${activeOrg.shortName} beneficiaries...`}
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

            {/* ── BENEFICIARIES DISPLAY (GRID OR LIST VIEW) ───────────────────── */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-sm font-bold text-muted-foreground">Loading {activeOrg.shortName} enrollees...</p>
                </div>
            ) : filteredBeneficiaries.length === 0 ? (
                <div className="p-10 text-center rounded-3xl border border-dashed border-border bg-card/50 space-y-3">
                    <Users2 className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                    <h3 className="text-base font-bold text-foreground">No beneficiaries found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        No member records matched your selected criteria for {activeOrg.shortName}.
                    </p>
                </div>
            ) : viewMode === "grid" ? (
                /* ── GRID CARD VIEW ─────────────────────────────────────────── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {filteredBeneficiaries.map(ben => {
                        const pct = ben.totalObligation > 0
                            ? Math.min(100, Math.round((ben.totalPaid / ben.totalObligation) * 100))
                            : 0

                        return (
                            <motion.div
                                key={ben.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm hover:border-blue-500/30 transition-all flex flex-col justify-between space-y-4"
                            >
                                <div className="space-y-3">
                                    {/* Top Card Bar */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-[10px] font-black text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">
                                                {ben.policyCode}
                                            </span>
                                            <Badge variant="outline" className="text-[9px] font-bold border-border">
                                                NIN: {ben.nin.slice(0, 4)}***
                                            </Badge>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-black text-[10px]">
                                            {ben.repaymentStreakWeeks} wks streak
                                        </span>
                                    </div>

                                    {/* Member Details */}
                                    <div>
                                        <h3 className="text-base font-black text-foreground">{ben.memberName}</h3>
                                        <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                                            <Phone className="h-3 w-3" /> {ben.phone} &bull; {ben.cooperativeName}
                                        </p>
                                    </div>

                                    {/* Program & Facility */}
                                    <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/50 text-xs space-y-1">
                                        <div className="font-bold text-foreground truncate">{ben.packageName}</div>
                                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                            <Building2 className="h-3 w-3 text-blue-500 shrink-0" />
                                            <span className="truncate">{ben.assignedProvider}</span>
                                        </div>
                                    </div>

                                    {/* Micro-Repayment Progress */}
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between font-bold">
                                            <span className="text-muted-foreground">Amortized ({pct}%)</span>
                                            <span className="text-foreground">{fmt(ben.totalPaid / 100)} / {fmt(ben.totalObligation / 100)}</span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer & Digital Pass Button */}
                                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                                    <span className="text-[10px] text-emerald-600 font-black uppercase flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active Cover
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openPassModal(ben)}
                                        className="h-8 rounded-xl font-bold text-xs gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                                    >
                                        <CreditCard className="h-3.5 w-3.5" /> Inspect Pass
                                    </Button>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            ) : (
                /* ── DENSE LIST/TABLE VIEW ───────────────────────────────────── */
                <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-xs font-sans text-left">
                            <thead className="bg-muted/50 border-b border-border text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="py-3 px-4">Beneficiary &amp; Phone</th>
                                    <th className="py-3 px-4">Cooperative</th>
                                    <th className="py-3 px-4">Program &amp; Policy</th>
                                    <th className="py-3 px-4">Assigned Facility</th>
                                    <th className="py-3 px-4 text-right">Amortization</th>
                                    <th className="py-3 px-4 text-center">Streak</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-center">Digital Pass</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredBeneficiaries.map(ben => {
                                    const pct = ben.totalObligation > 0
                                        ? Math.min(100, Math.round((ben.totalPaid / ben.totalObligation) * 100))
                                        : 0

                                    return (
                                        <tr key={ben.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-4 font-bold text-foreground">
                                                <div>{ben.memberName}</div>
                                                <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                                                    <span>{ben.phone}</span>
                                                    <span>&bull;</span>
                                                    <span>NIN: {ben.nin}</span>
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-muted-foreground font-semibold max-w-[150px] truncate">
                                                {ben.cooperativeName}
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="font-bold text-foreground truncate max-w-[180px]">
                                                    {ben.packageName}
                                                </div>
                                                <span className="text-[10px] font-mono font-black text-blue-600">
                                                    {ben.policyCode}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4 font-semibold text-foreground max-w-[180px] truncate">
                                                <div className="truncate">{ben.assignedProvider}</div>
                                                <span className="text-[10px] text-muted-foreground block truncate">
                                                    {ben.assignedProviderCode}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4 text-right">
                                                <div className="font-bold text-foreground">
                                                    {fmt(ben.totalPaid / 100)} / {fmt(ben.totalObligation / 100)}
                                                </div>
                                                <div className="text-[10px] text-emerald-600 font-bold">
                                                    {pct}% ({fmt(ben.weeklyDue / 100)}/wk)
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-black text-[10px]">
                                                    {ben.repaymentStreakWeeks} wks
                                                </span>
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black uppercase">
                                                    Active
                                                </Badge>
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openPassModal(ben)}
                                                    className="h-7 px-2 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 font-bold text-xs"
                                                >
                                                    <CreditCard className="h-3.5 w-3.5 mr-1" /> View Pass
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── DIGITAL PASS PREVIEW MODAL ─────────────────────────────────── */}
            <Dialog open={isPassModalOpen} onOpenChange={setIsPassModalOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl font-sans p-5 sm:p-6">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="text-lg font-black flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-blue-600" />
                                Institutional Digital Pass
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-black uppercase">
                                Verified
                            </Badge>
                        </DialogTitle>
                        <DialogDescription className="text-xs font-semibold">
                            Encrypted QR credential for verification at accredited service points.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBen && (
                        <div className="space-y-4">
                            {/* Card Simulation */}
                            <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl border border-blue-500/20 space-y-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                                            <ShieldCheck className="h-4 w-4" />
                                        </div>
                                        <span className="text-[10px] uppercase tracking-wider font-black text-slate-300">
                                            {activeOrg.shortName} DIGITAL PASS
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono font-black text-emerald-400">
                                        {selectedBen.policyCode}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-[9px] uppercase tracking-wider font-black text-slate-400 block">Beneficiary Name</span>
                                    <p className="text-base font-black text-white">{selectedBen.memberName}</p>
                                    <p className="text-xs text-slate-300 font-semibold">{selectedBen.cooperativeName}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                                    <div>
                                        <span className="text-[9px] uppercase tracking-wider font-black text-slate-400 block">Assigned Provider</span>
                                        <p className="font-bold text-white text-[11px] truncate">{selectedBen.assignedProvider}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9px] uppercase tracking-wider font-black text-slate-400 block">NIN Verification</span>
                                        <p className="font-mono text-emerald-400 font-bold text-[11px]">NIN: {selectedBen.nin}</p>
                                    </div>
                                </div>

                                {/* QR Code Simulation */}
                                <div className="p-3 rounded-2xl bg-white text-slate-950 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <QrCode className="h-9 w-9 text-slate-900" />
                                        <div>
                                            <span className="text-[9px] uppercase font-black text-slate-500 block">Scan at Intake</span>
                                            <span className="text-[10px] font-mono font-black text-slate-900">VERIFIED-MOU-LIVE</span>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 font-black text-[9px]">
                                        ACTIVE PASS
                                    </span>
                                </div>
                            </div>

                            {/* Repayment Stats */}
                            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs font-semibold">
                                <div>
                                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-black block">Weekly Sweep</span>
                                    <span className="font-black text-foreground">{fmt(selectedBen.weeklyDue / 100)}/week</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-black block">Total Amortized</span>
                                    <span className="font-black text-emerald-600">{fmt(selectedBen.totalPaid / 100)} of {fmt(selectedBen.totalObligation / 100)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    )
}
