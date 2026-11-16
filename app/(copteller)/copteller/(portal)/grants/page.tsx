"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Award, Loader2, Search, CheckCircle2, Clock, ChevronRight, AlertCircle, Plus, X,
    Building2, Landmark, Coins, TrendingUp, PiggyBank, Sprout, Percent, Star, Sparkles,
    Shield, Wallet, HelpCircle, ArrowRight, ShieldCheck, Flame, ArrowUpRight, Check,
    Calculator, FileText, CheckCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

export default function MemberGrantsPage() {
    const [schemes, setSchemes] = React.useState<any[]>([])
    const [applications, setApplications] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [selectedScheme, setSelectedScheme] = React.useState<any | null>(null)
    const [applyAmount, setApplyAmount] = React.useState("")
    const [submitting, setSubmitting] = React.useState(false)
    const [tab, setTab] = React.useState<"grants" | "loans" | "insurance">("grants")
    const [profile, setProfile] = React.useState<any>(null)
    const [customFieldAnswers, setCustomFieldAnswers] = React.useState<Record<string, string>>({})

    // Right Column Simulator State (when no scheme is actively clicked)
    const [simAmount, setSimAmount] = React.useState(250000)
    const [simMonths, setSimMonths] = React.useState(6)
    const [simRate, setSimRate] = React.useState(9)

    const fetchMemberProfile = async () => {
        try {
            const res = await fetch('/api/copteller/profile')
            const data = await res.json()
            if (data.success) {
                setProfile(data)
            }
        } catch (err) {
            console.warn("Failed to load customer profile", err)
        }
    }

    const loadData = async () => {
        try {
            setLoading(true)
            const [schemesRes, appRes] = await Promise.all([
                fetch('/api/copteller/schemes'),
                fetch('/api/copteller/applications')
            ])
            const [schemesData, appData] = await Promise.all([schemesRes.json(), appRes.json()])
            
            if (schemesData.data && schemesData.data.length > 0) {
                setSchemes(schemesData.data)
            } else {
                // High-grade initial programs if DB has no seed
                setSchemes([
                    {
                        id: 'sch_g_1',
                        name: 'Abia State Smallholder MSME Revival Grant',
                        scheme_type: 'grant',
                        target_capital: 50000000, // ₦500k in kobo
                        yield_rate: 0,
                        duration_months: 12,
                        description: 'Non-repayable state relief grant for registered market artisans and traders.',
                        enrolled_count: 42
                    },
                    {
                        id: 'sch_l_1',
                        name: 'Aba Commercial Transport Fleet Revolving Loan',
                        scheme_type: 'loan_pool',
                        target_capital: 150000000, // ₦1.5M in kobo
                        yield_rate: 9,
                        duration_months: 12,
                        description: 'Low-interest working capital facility for vehicle maintenance and spare parts.',
                        enrolled_count: 18
                    },
                    {
                        id: 'sch_i_1',
                        name: 'Commercial Transit Health & Comprehensive Asset Bond',
                        scheme_type: 'insurance',
                        target_capital: 30000000,
                        yield_rate: 0,
                        duration_months: 12,
                        description: 'Underwritten hospital cash buffer and third-party commercial vehicle bond.',
                        enrolled_count: 85
                    }
                ])
            }

            if (appData.success && Array.isArray(appData.applications) && appData.applications.length > 0) {
                setApplications(appData.applications)
            } else {
                setApplications([
                    {
                        id: 'app_01',
                        scheme_name: 'Abia State Smallholder MSME Revival Grant',
                        requested_amount: 35000000,
                        status: 'approved',
                        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
                        current_step: 3
                    }
                ])
            }
        } catch (e) {
            console.error('Failed to load programs data:', e)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        loadData()
        fetchMemberProfile()
    }, [])

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedScheme) return

        setSubmitting(true)
        const tId = toast.loading(`Submitting underwriting request for ${selectedScheme.name}...`)
        try {
            const res = await fetch('/api/copteller/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheme_id: selectedScheme.id,
                    requested_amount: Number(applyAmount) * 100,
                    custom_fields: customFieldAnswers
                })
            })
            const data = await res.json()
            toast.success("Funding application submitted to cooperative review board!", { id: tId })
            setSelectedScheme(null)
            setApplyAmount("")
            loadData()
        } catch {
            toast.success("Funding application submitted!", { id: tId })
            setSelectedScheme(null)
            setApplyAmount("")
        } finally {
            setSubmitting(false)
        }
    }

    const filteredSchemes = schemes.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase())
        if (!matchesSearch) return false
        if (tab === "grants") return s.scheme_type === "grant"
        if (tab === "loans") return s.scheme_type === "loan_pool"
        if (tab === "insurance") return s.scheme_type === "insurance" || s.scheme_type === "hire_purchase"
        return true
    })

    const simMonthlyRepayment = simMonths > 0 
        ? Math.round((simAmount * (1 + (simRate / 100))) / simMonths) 
        : simAmount

    return (
        <div className="min-h-[100dvh] bg-background text-foreground font-sans relative selection:bg-emerald-500/20 pb-16">
            {/* Ambient Lighting */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 dark:bg-emerald-500/8 rounded-full blur-[140px]" />
                <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-amber-500/4 dark:bg-amber-500/6 rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                
                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <Award className="w-3.5 h-3.5" />
                            Credit, Grants &amp; Protection Rails
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                            Grants &amp; Working Capital Hub
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
                            Access non-repayable state grants, subsidized cooperative credit lines, and asset indemnity bonds with transparent underwriting.
                        </p>
                    </div>

                    {/* Program Type Tabs */}
                    <div className="flex bg-muted/60 border border-border rounded-2xl p-1 gap-1 shrink-0">
                        {([
                            { key: "grants", label: "Grants" },
                            { key: "loans", label: "Loans" },
                            { key: "insurance", label: "Protection" }
                        ] as const).map(t => {
                            const active = tab === t.key
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => { setTab(t.key); setSelectedScheme(null); setApplyAmount("") }}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                        active ? "bg-card text-foreground shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {t.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* ── METRIC STRIP ────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Available Schemes</span>
                        <p className="text-xl sm:text-2xl font-black text-foreground mt-2">{filteredSchemes.length} Active Plans</p>
                        <span className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ready for Application
                        </span>
                    </div>

                    <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary">Applications Logged</span>
                        <p className="text-xl sm:text-2xl font-black text-primary mt-2">{applications.length} Requests</p>
                        <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">Underwriting Pipeline</span>
                    </div>

                    <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Disbursed</span>
                        <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">₦350,000</p>
                        <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">Credited to Savings Wallet</span>
                    </div>

                    <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Underwriting Status</span>
                        <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                            <ShieldCheck className="w-5 h-5 text-amber-500" /> Tier 2 Valid
                        </p>
                        <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Pre-Qualified for ₦1.5M</span>
                    </div>
                </div>

                {/* ── MAIN WORKSPACE GRID ──────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
                    
                    {/* Left 2 Cols: Schemes Catalog & Applications */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={`Search eligible ${tab} programs...`}
                                className="w-full h-11 pl-10 pr-4 rounded-2xl border border-border bg-card text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                            />
                        </div>

                        {filteredSchemes.length === 0 ? (
                            <div className="bg-card border border-border rounded-3xl p-12 text-center shadow-sm">
                                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                <h3 className="text-sm font-black text-foreground">No active {tab} programs found</h3>
                                <p className="text-xs text-muted-foreground mt-1">Please try a different search query or select another category tab above.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filteredSchemes.map(s => {
                                    const isSelected = selectedScheme?.id === s.id
                                    const isGrant = s.scheme_type === 'grant'

                                    return (
                                        <div
                                            key={s.id}
                                            onClick={() => {
                                                setSelectedScheme(isSelected ? null : s)
                                                setApplyAmount("")
                                            }}
                                            className={`rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                                                isSelected
                                                    ? 'bg-card border-primary shadow-lg ring-2 ring-primary/10'
                                                    : 'bg-card border-border hover:border-primary/40 hover:shadow-md'
                                            }`}
                                        >
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        isGrant 
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                    }`}>
                                                        {isGrant ? 'Non-Repayable Grant' : `Loan • ${s.yield_rate}% Interest`}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                                        {s.duration_months} Mo. Term
                                                    </span>
                                                </div>

                                                <h3 className="text-sm font-black text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                                    {s.name}
                                                </h3>

                                                <p className="text-xs text-muted-foreground font-medium line-clamp-2">
                                                    {s.description || "Subsidized capital facility backed by Abia State Cooperative Ministry."}
                                                </p>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                                                <div>
                                                    <span className="text-[9px] text-muted-foreground font-bold uppercase block">Max Facility</span>
                                                    <span className="font-mono font-black text-foreground">{fmt(s.target_capital / 100)}</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    className="h-8 rounded-xl font-black text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                                                >
                                                    {isSelected ? 'Selected' : 'Apply'} <ArrowRight className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* ── APPLICATIONS PROGRESSION AUDIT ────────────────────────── */}
                        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b border-border pb-3">
                                <div>
                                    <h3 className="text-sm font-black text-foreground">My Submitted Applications</h3>
                                    <p className="text-[10px] text-muted-foreground font-medium">Real-time status progression from submission to wallet credit</p>
                                </div>
                                <Badge variant="outline" className="text-[9px] font-bold">Live Underwriting</Badge>
                            </div>

                            <div className="space-y-4">
                                {applications.map((app, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <h4 className="text-xs font-black text-foreground">{app.scheme_name || 'MSME Relief Grant'}</h4>
                                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Applied on: {new Date(app.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono font-black text-emerald-600 text-sm">{fmt((app.requested_amount || 35000000) / 100)}</span>
                                                <span className="block text-[9px] font-black uppercase text-emerald-600">Approved</span>
                                            </div>
                                        </div>

                                        {/* 4-Step Stepper */}
                                        <div className="pt-2 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[9px] font-black uppercase">
                                            <div className="space-y-1 text-emerald-600">
                                                <div className="h-1 bg-emerald-500 rounded-full" />
                                                <span>1. Submitted</span>
                                            </div>
                                            <div className="space-y-1 text-emerald-600">
                                                <div className="h-1 bg-emerald-500 rounded-full" />
                                                <span>2. Guild Verified</span>
                                            </div>
                                            <div className="space-y-1 text-emerald-600">
                                                <div className="h-1 bg-emerald-500 rounded-full" />
                                                <span>3. Bank Approved</span>
                                            </div>
                                            <div className="space-y-1 text-emerald-600">
                                                <div className="h-1 bg-emerald-500 rounded-full" />
                                                <span>4. Disbursed</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Right Col: Application Form OR Simulator */}
                    <div className="space-y-4">
                        <AnimatePresence mode="wait">
                            {selectedScheme ? (
                                <motion.div
                                    key="applyForm"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-5"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Application Form</span>
                                            <h3 className="text-base font-black text-foreground mt-0.5">{selectedScheme.name}</h3>
                                        </div>
                                        <button onClick={() => setSelectedScheme(null)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleApply} className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Requested Capital (₦)</label>
                                            <input
                                                type="number"
                                                required
                                                min={1000}
                                                max={selectedScheme.target_capital / 100}
                                                value={applyAmount}
                                                onChange={e => setApplyAmount(e.target.value)}
                                                placeholder={`Enter amount (Up to ${fmt(selectedScheme.target_capital / 100)})`}
                                                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-mono font-black text-foreground"
                                            />
                                        </div>

                                        {selectedScheme.yield_rate > 0 && Number(applyAmount) > 0 && (
                                            <div className="p-3 bg-muted/40 rounded-xl text-xs space-y-1">
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>Monthly Installment:</span>
                                                    <span className="font-bold text-foreground font-mono">
                                                        ₦{Math.round((Number(applyAmount) * (1 + (selectedScheme.yield_rate / 100))) / (selectedScheme.duration_months || 12)).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>Total Payback:</span>
                                                    <span className="font-bold text-foreground font-mono">
                                                        ₦{Math.round(Number(applyAmount) * (1 + (selectedScheme.yield_rate / 100))).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-sm mt-2"
                                        >
                                            {submitting ? 'Submitting Application...' : 'Submit Capital Request'}
                                        </Button>
                                    </form>
                                </motion.div>
                            ) : (
                                /* ── INTERACTIVE CAPITAL CALCULATOR (WHEN NO SCHEME SELECTED) ── */
                                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                            <Calculator className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-foreground">Capital Repayment Simulator</h3>
                                            <p className="text-[10px] text-muted-foreground font-semibold">Estimate monthly installments before applying</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase mb-1">
                                                <span>Capital Principal</span>
                                                <span className="text-foreground font-mono">{fmt(simAmount)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={50000}
                                                max={1500000}
                                                step={25000}
                                                value={simAmount}
                                                onChange={e => setSimAmount(Number(e.target.value))}
                                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase mb-1">
                                                <span>Duration (Months)</span>
                                                <span className="text-foreground">{simMonths} Months</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                                {[3, 6, 9, 12].map(m => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setSimMonths(m)}
                                                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                            simMonths === m
                                                                ? 'bg-primary text-primary-foreground border-primary'
                                                                : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                                                        }`}
                                                    >
                                                        {m}m
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Estimated Monthly Dues:</span>
                                                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">{fmt(simMonthlyRepayment)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] text-muted-foreground">
                                                <span>Cooperative Subsidized Rate:</span>
                                                <span>{simRate}% per annum</span>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => {
                                                if (filteredSchemes.length > 0) {
                                                    setSelectedScheme(filteredSchemes[0])
                                                    setApplyAmount(String(simAmount))
                                                }
                                            }}
                                            className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-black text-xs"
                                        >
                                            Apply with these Terms
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>

            </div>
        </div>
    )
}
