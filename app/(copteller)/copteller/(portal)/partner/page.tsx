"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Landmark, TrendingUp, Building2, Users2, ShieldCheck,
    CircleDollarSign, ArrowUpRight, ArrowRight, HeartPulse,
    Truck, Award, Layers, Plus, Search, Filter, RefreshCw,
    Activity, Clock, FileText, CheckCircle2, AlertCircle,
    Download, PieChart, Sparkles, MapPin, Phone, Mail,
    CreditCard, ExternalLink, HelpCircle, ChevronDown, ChevronUp,
    LayoutGrid, List
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import Link from "next/link"
import { usePartnerOrg } from "@/context/partner-org-context"
import { LiquidityFlowChart } from "@/components/charts/liquidity-flow-chart"
import { SyndicationDonutChart } from "@/components/charts/syndication-donut-chart"
import { EcosystemSynergyCard } from "@/components/copteller/ecosystem-synergy-card"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

export default function InstitutionalPartnerDashboard() {
    const {
        activeOrg,
        activeOrgSlug,
        activeSubscopeId,
        activeSubscope,
        allSubscopes
    } = usePartnerOrg()

    const [data, setData] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)
    const [showArchitecture, setShowArchitecture] = React.useState(false)
    const [programViewMode, setProgramViewMode] = React.useState<"grid" | "list">("grid")

    // Modal state for Float Injection
    const [isInjectModalOpen, setIsInjectModalOpen] = React.useState(false)
    const [injectAmount, setInjectAmount] = React.useState("50000000") // ₦50M default
    const [injectSource, setInjectSource] = React.useState("Abia State Central Treasury / CBN Microfinance Facility")
    const [injecting, setInjecting] = React.useState(false)

    const fetchMetrics = async (slug: string, subscope: string) => {
        try {
            setLoading(true)
            const queryParams = new URLSearchParams()
            queryParams.set("partner", slug)
            if (subscope && subscope !== "all") {
                queryParams.set("subscope", subscope)
            }
            const res = await fetch(`/api/copteller/partner/metrics?${queryParams.toString()}`)
            const json = await res.json()
            if (json.success) {
                setData(json)
            }
        } catch (err) {
            console.error("Failed to load partner metrics:", err)
            toast.error("Failed to load institutional partner metrics")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchMetrics(activeOrgSlug, activeSubscopeId)
    }, [activeOrgSlug, activeSubscopeId])

    const handleInjectFloat = async (e: React.FormEvent) => {
        e.preventDefault()
        const amountNum = Number(injectAmount)
        if (!amountNum || amountNum <= 0) {
            toast.error("Please enter a valid float amount")
            return
        }

        try {
            setInjecting(true)
            const res = await fetch("/api/copteller/partner/float-injection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partnerSlug: activeOrgSlug,
                    amountKobo: Math.round(amountNum * 100),
                    sourceBank: injectSource,
                    purpose: `${activeOrg.shortName} Escrow Float Injection`
                })
            })
            const result = await res.json()
            if (result.success) {
                toast.success(result.message || "Float injected successfully into escrow account!")
                setIsInjectModalOpen(false)
                fetchMetrics(activeOrgSlug, activeSubscopeId)
            } else {
                toast.error(result.error || "Failed to inject float")
            }
        } catch (err: any) {
            toast.error("Network error during float injection")
        } finally {
            setInjecting(false)
        }
    }

    const handleExportAudit = () => {
        const timestamp = new Date().toISOString().split("T")[0]
        const csvContent =
            "data:text/csv;charset=utf-8," +
            [
                `"COPTELLER PARTNER MFB - INSTITUTIONAL ESCROW RECONCILIATION STATEMENT"`,
                `"Partner Entity:","${activeOrg.name}"`,
                `"Statutory Gazette / Reg:","${activeOrg.regNumber}"`,
                `"Dedicated Escrow Account:","${activeOrg.escrowAccount.accountNumber}"`,
                `"Active Directorate:","${activeSubscope ? activeSubscope.name : 'Statewide Apex Desk'}"`,
                `"Generated At:","${new Date().toLocaleString()}"`,
                `""`,
                `"Metric","Kobo Value","NGN Formatted"`,
                `"Total Committed Float Facility","${metrics.totalCommittedKobo || 0}","${fmt((metrics.totalCommittedKobo || 0) / 100)}"`,
                `"Total Deployed in Market","${metrics.totalDisbursedKobo || 0}","${fmt((metrics.totalDisbursedKobo || 0) / 100)}"`,
                `"Total Recycled / Recovered","${metrics.totalRecoveredKobo || 0}","${fmt((metrics.totalRecoveredKobo || 0) / 100)}"`,
                `"Net Accrued Spread Margin","${metrics.netSpreadMarginKobo || 0}","${fmt((metrics.netSpreadMarginKobo || 0) / 100)}"`,
                `"Active Enrolled Beneficiaries","${metrics.beneficiariesCount || 0}","${(metrics.beneficiariesCount || 0).toLocaleString()} Members"`,
                `"Accredited Facilities in Network","${metrics.accreditedProviderCount || 0}","${metrics.accreditedProviderCount || 0} Facilities"`
            ].join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `${activeOrg.slug}_audit_reconciliation_${timestamp}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success(`Audit statement downloaded for ${activeOrg.shortName}`)
    }

    const partner = data?.partner || activeOrg
    const metrics = data?.metrics || {}
    const programs = data?.programs || []
    const leadOfficer = activeOrg.deskOfficers?.find(o => o.isLead) || activeOrg.deskOfficers?.[0]

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-8 font-sans">
            
            {/* ── PARTNER APEX BANNER & OPERATIONAL ACTIONS ──────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <Landmark className="h-3 w-3" /> {activeOrg.shortName} Underwriting Console
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                            Dedicated Escrow: {activeOrg.escrowAccount.accountNumber}
                        </Badge>
                        {activeSubscope && (
                            <Badge variant="secondary" className="text-[10px] font-black bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                <Layers className="h-2.5 w-2.5 mr-1" /> {activeSubscope.name}
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                        Wholesale Liquidity &amp; Program Operations
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl font-semibold">
                        {activeOrg.mandate}
                    </p>
                </div>

                {/* Operational Action Buttons */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={handleExportAudit}
                        className="h-10 rounded-xl font-bold text-xs flex items-center gap-2 border-border bg-card"
                    >
                        <Download className="h-3.5 w-3.5" /> Export Audit Statement
                    </Button>

                    <Button
                        onClick={() => setIsInjectModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 rounded-xl flex items-center gap-2 shadow-sm border-0"
                    >
                        <Plus className="h-4 w-4" /> Inject Float
                    </Button>

                    <Link href="/copteller/partner/schemes">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-10 rounded-xl flex items-center gap-2 shadow-sm border-0">
                            <TrendingUp className="h-4 w-4" /> Underwrite Program
                        </Button>
                    </Link>
                </div>
            </div>

            {/* ── SUBCONTRACT / DIRECTORATE SCOPE ALERT ─────────────────────── */}
            {activeSubscope ? (
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                            <Layers className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-black text-blue-600 uppercase bg-blue-500/20 px-1.5 py-0.2 rounded">
                                    {activeSubscope.code}
                                </span>
                                <h3 className="text-xs font-black text-foreground">{activeSubscope.name}</h3>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 font-semibold">
                                {activeSubscope.description} &bull; Zone: <strong className="text-foreground">{activeSubscope.zone}</strong>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:text-right shrink-0">
                        <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-black block">Directorate Float</span>
                            <span className="text-xs font-black text-foreground">{fmt(activeSubscope.deployedFloatKobo / 100)}</span>
                        </div>
                        <div className="pl-3 border-l border-border">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-black block">Enrolled</span>
                            <span className="text-xs font-black text-foreground">{activeSubscope.activeBeneficiaries.toLocaleString()} Members</span>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* ── APEX METRIC TILES ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Committed Float Facility</span>
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Landmark className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-foreground">{fmt((metrics.totalCommittedKobo || 0) / 100)}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <span className="text-emerald-500 font-bold">{fmt((metrics.totalDisbursedKobo || 0) / 100)}</span> active in market
                    </p>
                </div>

                <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Active Beneficiaries</span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Users2 className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-foreground">{(metrics.beneficiariesCount || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        Across <span className="font-bold text-foreground">14 registered cooperatives</span>
                    </p>
                </div>

                <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Accrued Float Margin</span>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmt((metrics.netSpreadMarginKobo || 0) / 100)}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <span className="text-blue-500 font-bold">+16.2%</span> platform &amp; coop yield spread
                    </p>
                </div>

                <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Accredited Network</span>
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Building2 className="h-4 w-4" />
                        </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-foreground">{metrics.accreditedProviderCount || 0}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        {activeOrg.sector === 'health' ? 'Hospitals & Clinics' : activeOrg.sector === 'transport' ? 'Inspection Hubs' : 'Accredited Centers'}
                    </p>
                </div>
            </div>

            {/* ── TRIPARTITE ECOSYSTEM SYNERGY ARCHITECTURE ───────────────── */}
            <EcosystemSynergyCard
                partnerName={activeOrg.name}
                partnerShortName={activeOrg.shortName || activeOrg.name}
                partnerSector={activeOrg.sector}
                escrowAccountNumber={activeOrg.escrowAccount.accountNumber}
                availableFloat={activeOrg.escrowAccount.availableFloatKobo / 100}
                activeEnrollees={metrics.beneficiariesCount || activeOrg.activeBeneficiariesCount}
            />

            {/* ── VISUAL ANALYTICS & LIQUIDITY TELEMETRY ─────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-2">
                    <LiquidityFlowChart
                        title="Wholesale Deployed vs Micro-Amortization Recoveries"
                        subtitle={`Real-time velocity of bulk ${activeOrg.shortName} provider pre-payments recycled through automated ₦300/wk cooperative member deductions`}
                        defaultTimeframe="30D"
                        accentColor="#3b82f6"
                    />
                </div>
                <div className="lg:col-span-1">
                    <SyndicationDonutChart
                        title="Float Syndication Ratio"
                        subtitle={`Tripartite balance between ${activeOrg.shortName} statutory allocation, syndicated investor capital, and Partner MFB buffer`}
                        segments={[
                            {
                                label: `${activeOrg.shortName} Statutory Float`,
                                value: Math.round(((activeOrg.escrowAccount.availableFloatKobo || 10150000000) / 100) * 0.55),
                                color: "#3b82f6",
                                description: "Dedicated wholesale provider pre-payment allocation"
                            },
                            {
                                label: "Syndicated Private Capital",
                                value: Math.round(((activeOrg.escrowAccount.availableFloatKobo || 10150000000) / 100) * 0.35),
                                color: "#10b981",
                                description: "Diaspora & institutional investor underwritten tranches (+16.5% APY)"
                            },
                            {
                                label: "Partner MFB Liquidity Buffer",
                                value: Math.round(((activeOrg.escrowAccount.availableFloatKobo || 10150000000) / 100) * 0.10),
                                color: "#8b5cf6",
                                description: "Instant clearing reserve & emergency settlement pool"
                            }
                        ]}
                    />
                </div>
            </div>

            {/* ── 2-COLUMN SECTION: ACTIVE PROGRAMS & GEOGRAPHIC IMPACT ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Active Programs Underwritten */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <h2 className="text-base font-black text-foreground">Underwritten Programs &amp; Float Facilities</h2>
                            <p className="text-xs text-muted-foreground font-semibold">Active tranches, wholesale costs, and retail micro-amortization dues.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Grid / List View Toggle */}
                            <div className="flex items-center bg-card border border-border/80 rounded-xl p-0.5 shadow-sm">
                                <button
                                    onClick={() => setProgramViewMode("grid")}
                                    title="Grid View"
                                    className={`p-1.5 rounded-lg transition-all ${
                                        programViewMode === "grid"
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => setProgramViewMode("list")}
                                    title="Table / List View"
                                    className={`p-1.5 rounded-lg transition-all ${
                                        programViewMode === "list"
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <List className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            <Link href="/copteller/partner/schemes">
                                <Button variant="ghost" size="sm" className="text-xs font-bold text-blue-600 dark:text-blue-400 h-8">
                                    All Schemes <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Program Cards Grid View */}
                    {programViewMode === "grid" && (
                        <div className="space-y-3.5">
                            {programs.map((prog: any) => {
                                const percentFunded = Math.round((prog.deployedCapital / prog.allocatedCapital) * 100)
                                return (
                                    <div key={prog.id} className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-4 hover:border-blue-500/30 transition-all">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-black text-foreground">{prog.name}</h4>
                                                    <Badge className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                        Active Float
                                                    </Badge>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground mt-0.5 font-semibold">
                                                    {prog.enrolledBeneficiaries.toLocaleString()} members enrolled &bull; {prog.repaymentStreakRate}% on-time repayment streak
                                                </p>
                                            </div>
                                            <div className="text-left sm:text-right">
                                                <span className="text-xs font-black text-foreground block">{fmt(prog.deployedCapital / 100)}</span>
                                                <span className="text-[9px] text-muted-foreground font-bold uppercase">of {fmt(prog.allocatedCapital / 100)} Facility</span>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="space-y-1">
                                            <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden">
                                                <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percentFunded}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                                                <span>Float Uptake: {percentFunded}%</span>
                                                <span>Cap Recycled: ₦{((prog.deployedCapital * 0.72) / 100).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Unit Economics Pill */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/50 text-xs">
                                            <div>
                                                <span className="text-[9px] text-muted-foreground uppercase font-black block">Wholesale Bulk Paid</span>
                                                <span className="font-black text-foreground">{fmt(prog.wholesalePerUnit / 100)}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-muted-foreground uppercase font-black block">Retail Amortized</span>
                                                <span className="font-black text-emerald-600 dark:text-emerald-450">{fmt(prog.retailAmortizedPerUnit / 100)}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-muted-foreground uppercase font-black block">Weekly Micro-Due</span>
                                                <span className="font-black text-blue-600 dark:text-blue-400">{fmt(prog.weeklyDuePerUnit / 100)}/wk</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Program Table List View */}
                    {programViewMode === "list" && (
                        <div className="rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-border/80 bg-muted/30 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                            <th className="py-3 px-4">Program Name</th>
                                            <th className="py-3 px-4">Enrollees</th>
                                            <th className="py-3 px-4">Deployed / Facility</th>
                                            <th className="py-3 px-4">Uptake</th>
                                            <th className="py-3 px-4">Weekly Due</th>
                                            <th className="py-3 px-4">Repayment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {programs.map((prog: any) => {
                                            const percentFunded = Math.round((prog.deployedCapital / prog.allocatedCapital) * 100)
                                            return (
                                                <tr key={prog.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="py-3.5 px-4 font-bold text-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <span>{prog.name}</span>
                                                            <Badge className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                                Active
                                                            </Badge>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-semibold text-foreground">
                                                        {prog.enrolledBeneficiaries.toLocaleString()}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-black text-foreground">
                                                        {fmt(prog.deployedCapital / 100)} <span className="text-muted-foreground font-normal text-[10px]">/ {fmt(prog.allocatedCapital / 100)}</span>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <Badge variant="outline" className="text-[10px] font-bold">
                                                            {percentFunded}%
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-black text-blue-600 dark:text-blue-400">
                                                        {fmt(prog.weeklyDuePerUnit / 100)}/wk
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                            {prog.repaymentStreakRate}% streak
                                                        </span>
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

                {/* Right: Geographic Distribution & Desk Officers */}
                <div className="space-y-4">
                    <h2 className="text-base font-black text-foreground">Cluster &amp; Geographic Reach</h2>
                    <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
                        <div className="space-y-3">
                            {(data?.geographicSpread || []).map((geo: any, idx: number) => (
                                <div key={idx} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="truncate pr-2">{geo.zone}</span>
                                        <span className="font-black shrink-0 text-foreground">{geo.count.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className="bg-blue-500 h-1.5 rounded-full" 
                                            style={{ width: `${geo.percentage}%` }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-3 border-t border-border/80 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-semibold">Portfolio At Risk (PAR &lt;30d)</span>
                                <Badge variant="outline" className="text-[10px] font-black text-emerald-600 border-emerald-500/20 bg-emerald-500/10">
                                    {metrics.parRatePercent || 2.4}% (Prime)
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-semibold">Average Repayment Streak</span>
                                <span className="font-black text-foreground">{metrics.repaymentStreakAvg || 14.8} Weeks</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-semibold">Active Cooperative Partners</span>
                                <span className="font-black text-foreground">14 Registered</span>
                            </div>
                        </div>

                        <Link href="/copteller/partner/beneficiaries" className="block pt-2">
                            <Button variant="outline" className="w-full text-xs font-black rounded-xl h-9 border-border bg-background">
                                <Users2 className="h-3.5 w-3.5 mr-1.5" /> Beneficiary Directory
                            </Button>
                        </Link>
                    </div>

                    {/* Desk Officer Card */}
                    {leadOfficer && (
                        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                                Lead Desk Officer &bull; Signatory
                            </span>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-xs shrink-0">
                                    {leadOfficer.name.split(" ").map((n: string) => n[0]).join("")}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-foreground truncate">{leadOfficer.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{leadOfficer.title}</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-border flex items-center gap-2">
                                <a href={`tel:${leadOfficer.phone}`} className="flex-1">
                                    <Button variant="outline" size="sm" className="w-full h-8 text-[11px] font-bold rounded-xl gap-1">
                                        <Phone className="h-3 w-3" /> Call
                                    </Button>
                                </a>
                                <a href={`mailto:${leadOfficer.email}`} className="flex-1">
                                    <Button variant="outline" size="sm" className="w-full h-8 text-[11px] font-bold rounded-xl gap-1">
                                        <Mail className="h-3 w-3" /> Email
                                    </Button>
                                </a>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* ── FLOAT INJECTION MODAL ─────────────────────────────────────── */}
            <Dialog open={isInjectModalOpen} onOpenChange={setIsInjectModalOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl p-6 font-sans">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-emerald-600" />
                            Inject Float into {activeOrg.shortName} Escrow
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground font-semibold">
                            Credit statutory underwriting liquidity into {activeOrg.escrowAccount.accountName} (Account #{activeOrg.escrowAccount.accountNumber}) at Partner Microfinance Bank.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleInjectFloat} className="space-y-4 py-2">
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-black">Current Escrow Balance</span>
                            <p className="text-lg font-mono font-black text-emerald-600">
                                {fmt(activeOrg.escrowAccount.availableFloatKobo / 100)}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Top-Up Amount (NGN)</label>
                            <Input
                                type="number"
                                value={injectAmount}
                                onChange={(e) => setInjectAmount(e.target.value)}
                                placeholder="50,000,000"
                                className="h-10 text-sm font-bold rounded-xl"
                                required
                            />
                            <div className="flex gap-2 pt-1">
                                {[10000000, 50000000, 100000000].map(val => (
                                    <button
                                        type="button"
                                        key={val}
                                        onClick={() => setInjectAmount(String(val))}
                                        className="text-[10px] font-black bg-muted hover:bg-muted/80 text-foreground px-2 py-1 rounded-lg"
                                    >
                                        +₦{(val / 1000000)}M
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Liquidity Source Facility</label>
                            <Input
                                value={injectSource}
                                onChange={(e) => setInjectSource(e.target.value)}
                                className="h-10 text-xs rounded-xl"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsInjectModalOpen(false)}
                                className="h-10 rounded-xl font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={injecting}
                                className="h-10 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {injecting ? "Processing..." : `Inject ₦${Number(injectAmount || 0).toLocaleString()} Float`}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    )
}
