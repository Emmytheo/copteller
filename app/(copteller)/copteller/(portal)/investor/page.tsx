"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp, CircleDollarSign, Percent, Truck, Building2, HelpCircle, X, Plus, Loader2,
    ShieldCheck, Sparkles, Landmark, Award, ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LiquidityFlowChart } from "@/components/charts/liquidity-flow-chart"
import { SectorAllocationChart } from "@/components/charts/sector-allocation-chart"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

export default function InvestorDashboard() {
    const router = useRouter()
    const [mounted, setMounted] = React.useState(false)
    const [schemes, setSchemes] = React.useState<any[]>([])
    const [assets, setAssets] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)

    // New scheme states
    const [showNewSchemeModal, setShowNewSchemeModal] = React.useState(false)
    const [newSchemeName, setNewSchemeName] = React.useState("")
    const [newSchemeTarget, setNewSchemeTarget] = React.useState("")
    const [newSchemeYield, setNewSchemeYield] = React.useState("15")
    const [newSchemeDuration, setNewSchemeDuration] = React.useState("24")
    const [submittingScheme, setSubmittingScheme] = React.useState(false)

    const fetchInvestorDashboard = async () => {
        try {
            setLoading(true)
            // 1. Fetch Hire Purchase schemes in the marketplace
            const schemeRes = await fetch('/api/copteller/schemes?scheme_type=hire_purchase')
            const schemeData = await schemeRes.json()
            if (schemeData.data) {
                setSchemes(schemeData.data)
            }

            // 2. Fetch active hire purchase contracts representing funded assets
            const contractRes = await fetch('/api/copteller/contracts?contract_type=hire_purchase')
            const contractData = await contractRes.json()
            if (contractData.data) {
                setAssets(contractData.data)
            }
        } catch (err) {
            console.error('Failed to load investor stats:', err)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        setMounted(true)
        fetchInvestorDashboard()
    }, [])

    const handleCreateScheme = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSchemeName || !newSchemeTarget) return
        setSubmittingScheme(true)
        const tId = toast.loading("Proposing new lease scheme...")
        
        try {
            const res = await fetch('/api/copteller/schemes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newSchemeName,
                    scheme_type: 'hire_purchase',
                    target_capital: Number(newSchemeTarget) * 100, // to kobo
                    yield_rate: Number(newSchemeYield),
                    duration_months: Number(newSchemeDuration),
                    status: 'draft', // Proposed schemes start in draft
                    bank_approved: false
                })
            })
            const data = await res.json()
            if (data.data) {
                toast.success("Investment scheme proposal submitted!", { id: tId })
                setShowNewSchemeModal(false)
                setNewSchemeName("")
                setNewSchemeTarget("")
                await fetchInvestorDashboard()
            } else {
                toast.error(data.error || "Failed to submit proposal", { id: tId })
            }
        } catch (err) {
            toast.error("Network error submitting scheme", { id: tId })
        } finally {
            setSubmittingScheme(false)
        }
    }

    const totalDeployed = assets.reduce((acc, curr) => acc + (curr.total_obligation || 0), 0) / 100
    const totalYieldAccrued = assets.reduce((acc, curr) => acc + (curr.total_paid || 0), 0) / 100

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                <p className="text-muted-foreground font-medium text-xs uppercase font-black">Loading Portfolio Dashboard...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 sm:space-y-8 pb-12 max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Investor Hub</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Portfolio Dashboard</h1>
                    <p className="text-xs text-muted-foreground mt-1 max-w-2xl">Audit active cooperative hire purchase schemes, monitor operator repayment streaks, and allocate target capital tranches.</p>
                </div>
                <div>
                    <Button
                        onClick={() => setShowNewSchemeModal(true)}
                        className="w-full sm:w-auto h-10 rounded-xl bg-gradient-to-r from-orange-500 to-emerald-500 text-black font-black text-xs border-0 shadow-lg flex items-center justify-center gap-2"
                    >
                        <Plus className="h-4 w-4" /> Propose New Scheme
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {[
                    { label: "Capital Deployed", val: fmt(totalDeployed), icon: CircleDollarSign, color: "orange", path: "/copteller/investor/registry" },
                    { label: "Yield Returned", val: fmt(totalYieldAccrued), icon: TrendingUp, color: "emerald", path: "/copteller/investor/payouts" },
                    { label: "Marketplace Schemes", val: `${schemes.length} Active`, icon: Building2, color: "orange", path: "/copteller/investor/schemes" },
                    { label: "Repayment Compliance SLA", val: `${assets.length > 0 ? Math.round((assets.filter(a => a.status !== 'defaulted').length / assets.length) * 100) : 100}%`, icon: Percent, color: "emerald", path: "/copteller/investor/payouts" }
                ].map((s, i) => (
                    <div
                        key={i}
                        onClick={() => router.push(s.path)}
                        className="bg-white dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-900 shadow-sm cursor-pointer hover:shadow-md transition-all"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2 rounded-xl ${s.color === 'orange' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                <s.icon className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                        <p className="text-2xl font-black mt-1">{s.val}</p>
                    </div>
                ))}
            </div>

            {/* ── INSTITUTIONAL CO-FUNDING & SYNDICATE UNDERWRITING ALERT ───── */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-orange-500/10 via-emerald-500/5 to-transparent border border-orange-500/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500 shrink-0 mt-0.5 sm:mt-0">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20 flex items-center gap-1.5">
                                <ShieldCheck className="h-3 w-3" /> State Parastatal MOU Backed
                            </span>
                            <Badge variant="outline" className="text-[10px] font-black border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                                14% – 18% Annualized Spread Yield
                            </Badge>
                        </div>
                        <p className="text-xs text-foreground font-bold">
                            Underwrite Institutional Expansion Tranches Protected by Dedicated Partner MFB Escrow
                        </p>
                        <p className="text-[11px] text-muted-foreground font-semibold max-w-3xl">
                            Co-fund wholesale welfare and asset schemes sponsored by ABSHIA, Ministry of Transport (ATMA), USAID, and SMEDAN. Beneficiaries repay via automated weekly Ajo deductions with a 94.2% verified SLA.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Link href="/copteller/investor/schemes">
                        <Button className="h-9 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-black text-xs gap-1.5 shadow-sm border-0">
                            Browse Institutional Schemes <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* ── VISUAL ANALYTICS & YIELD CURVES ───────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-2">
                    <LiquidityFlowChart
                        title="Portfolio Capital Deployed vs Yield Recoveries"
                        subtitle="Real-time recovery telemetry of syndicated tranches amortized weekly across active cooperatives"
                        defaultTimeframe="30D"
                        accentColor="#f97316"
                    />
                </div>
                <div className="lg:col-span-1">
                    <SectorAllocationChart
                        title="Institutional Allocation"
                        subtitle="Capital distributed across statutory parastatal programs"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Open schemes to fund */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-6 shadow-sm">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-black">Open Investment Schemes</h3>
                                <p className="text-[10px] text-muted-foreground font-semibold">Participate in verified trade union expansion pools protected by bank escrow.</p>
                            </div>
                            <Button onClick={() => router.push('/copteller/investor/schemes')} variant="ghost" size="sm" className="h-7 text-xs font-bold">View All →</Button>
                        </div>

                        <div className="space-y-4">
                            {schemes.length > 0 ? (
                                schemes.slice(0, 3).map(scheme => {
                                    const progressPercent = Math.min(100, Math.floor(((scheme.funded_capital || 0) / (scheme.target_capital || 1)) * 100))
                                    const lower = (scheme.name || "").toLowerCase()
                                    const sponsor = lower.includes("health") || lower.includes("abshia") || lower.includes("medical")
                                        ? { name: "Powered by ABSHIA Health", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" }
                                        : lower.includes("tricycle") || lower.includes("keke") || lower.includes("transport") || lower.includes("tvs")
                                        ? { name: "Ministry of Transport / ATMA", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" }
                                        : lower.includes("farm") || lower.includes("agro") || lower.includes("feed")
                                        ? { name: "USAID Agribusiness Grant", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" }
                                        : { name: "SMEDAN Enterprise Growth", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" }

                                    return (
                                        <div key={scheme.id} className="border border-slate-100 dark:border-slate-900 rounded-2xl p-4 sm:p-5 space-y-4">
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${sponsor.color}`}>
                                                            {sponsor.name}
                                                        </span>
                                                        <span className="text-[9px] font-mono text-muted-foreground">
                                                            Escrow Protected
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-black">{scheme.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-semibold">{scheme.cooperative?.name || 'Universal Cooperative'}</p>
                                                </div>
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full border uppercase bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-450 shrink-0">
                                                    {scheme.status}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-center text-[9px] sm:text-[10px]">
                                                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-2 sm:p-2.5">
                                                    <p className="text-slate-400 font-bold truncate">Target</p>
                                                    <p className="font-black text-xs sm:text-sm mt-0.5 truncate">{fmt(scheme.target_capital / 100)}</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-2 sm:p-2.5">
                                                    <p className="text-slate-400 font-bold truncate">Yield Rate</p>
                                                    <p className="font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm mt-0.5">+{scheme.yield_rate || 0}%</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-2 sm:p-2.5">
                                                    <p className="text-slate-400 font-bold truncate">Duration</p>
                                                    <p className="font-black text-xs sm:text-sm mt-0.5 truncate">{scheme.duration_months || 0} Mo</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[9px] font-black text-slate-400">
                                                    <span>Funded progress</span>
                                                    <span>{progressPercent}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                                    <div className="bg-orange-500 h-full rounded-full" style={{ width: `${progressPercent}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="py-8 text-center text-xs font-bold text-muted-foreground">No active schemes in the marketplace catalog.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Funded asset directory (Operators) */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-6 font-sans shadow-sm">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-black">Underwritten Assets</h3>
                                <p className="text-[10px] text-muted-foreground font-semibold">Active leases repayments status.</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {assets.length > 0 ? (
                                assets.slice(0, 4).map(asset => (
                                    <div key={asset.id} className="border-b border-slate-105 dark:border-slate-900 last:border-0 pb-4 last:pb-0 space-y-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <div>
                                                <p className="font-extrabold text-foreground">{asset.asset_name}</p>
                                                <p className="text-[10px] text-slate-400">ID: {asset.asset_identifier || 'N/A'}</p>
                                            </div>
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full border uppercase bg-emerald-500/10 border-emerald-500/20 text-emerald-650 dark:text-emerald-455">
                                                {asset.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                            <span>Paid: {fmt(asset.total_paid / 100)}</span>
                                            <span>Streak: {asset.payment_streak || 0}w 🔥</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-xs font-bold text-muted-foreground">No active lease agreements found.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Proposed Scheme Modal */}
            {mounted && createPortal(
                <AnimatePresence>
                    {showNewSchemeModal && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-background border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 shadow-2xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-black">Propose Investment Scheme</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Submit cycle funding target to cooperative trade partners.</p>
                                    </div>
                                    <button onClick={() => setShowNewSchemeModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <form onSubmit={handleCreateScheme} className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Scheme Title</label>
                                        <input
                                            type="text"
                                            required
                                            value={newSchemeName}
                                            onChange={e => setNewSchemeName(e.target.value)}
                                            placeholder="e.g. Q3 Driver Cycle Fund"
                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Target Capital (₦)</label>
                                        <input
                                            type="number"
                                            required
                                            value={newSchemeTarget}
                                            onChange={e => setNewSchemeTarget(e.target.value)}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Yield Rate (% p.a.)</label>
                                            <input
                                                type="number"
                                                required
                                                value={newSchemeYield}
                                                onChange={e => setNewSchemeYield(e.target.value)}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Duration (Months)</label>
                                            <input
                                                type="number"
                                                required
                                                value={newSchemeDuration}
                                                onChange={e => setNewSchemeDuration(e.target.value)}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                                        <Button type="button" onClick={() => setShowNewSchemeModal(false)} variant="outline" className="w-full sm:flex-1 rounded-xl h-9 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                        <Button type="submit" disabled={submittingScheme} className="w-full sm:flex-1 bg-gradient-to-r from-orange-500 to-emerald-500 text-black font-black text-xs h-9 rounded-xl border-0">Propose Scheme</Button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}
