"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp, X, PlusCircle, Search, FileText, ShieldAlert, Loader2, CircleDollarSign,
    ShieldCheck, Sparkles, Landmark, HeartPulse, Truck, Wheat, Award, ArrowRight, CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

const SCHEME_TYPES = [
    { value: "ajo_rotation", label: "Ajo / Rotational Thrift", icon: "🔄" },
    { value: "hire_purchase", label: "Hire Purchase / Asset Lease", icon: "🚛" },
    { value: "loan_pool", label: "Micro Loan Pool", icon: "💰" },
    { value: "grant", label: "Grant Distribution", icon: "🏛️" },
    { value: "bond", label: "Cooperative Bond / Fixed Savings", icon: "🔐" },
    { value: "savings_drive", label: "Group Savings Drive", icon: "🐖" },
]

const SECTOR_FILTERS = [
    { id: "all", label: "All Sectors", icon: Sparkles },
    { id: "health", label: "Health Mutual", icon: HeartPulse },
    { id: "transport", label: "ATMA Mobility", icon: Truck },
    { id: "agriculture", label: "USAID Agro", icon: Wheat },
    { id: "commerce", label: "SMEDAN MSME", icon: Award },
]

export function getInstitutionalSponsor(s: any) {
    const text = `${s?.name || ''} ${s?.scheme_type || ''} ${s?.description || ''}`.toLowerCase()
    if (text.includes("health") || text.includes("abshia") || text.includes("medical") || text.includes("care")) {
        return {
            name: "National Artisans Health Mutual (NAHM)",
            short: "Health Mutual",
            sector: "health",
            escrow: "Escrow Acct #3000881920",
            color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
            icon: HeartPulse,
            mechanism: "₦300/week automated Ajo deduction"
        }
    }
    if (text.includes("tricycle") || text.includes("keke") || text.includes("tvs") || text.includes("mobility") || text.includes("transport") || text.includes("hire_purchase")) {
        return {
            name: "Ministry of Transport / ATMA",
            short: "ATMA Mobility",
            sector: "transport",
            escrow: "Escrow Acct #3000882104",
            color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
            icon: Truck,
            mechanism: "₦18,000/week telemetry-monitored lease"
        }
    }
    if (text.includes("farm") || text.includes("agro") || text.includes("feed") || text.includes("cassava") || text.includes("fertilizer")) {
        return {
            name: "USAID Feed the Future Agribusiness",
            short: "USAID Agro",
            sector: "agriculture",
            escrow: "Escrow Acct #3000882319",
            color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
            icon: Wheat,
            mechanism: "Harvest cluster amortization schedule"
        }
    }
    return {
        name: "SMEDAN Enterprise Growth Facility",
        short: "SMEDAN MSME",
        sector: "commerce",
        escrow: "Escrow Acct #3000882451",
        color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
        icon: Award,
        mechanism: "Bi-weekly market guild clearing"
    }
}

export default function InvestorSchemesPage() {
    const [schemes, setSchemes] = React.useState<any[]>([])
    const [selectedScheme, setSelectedScheme] = React.useState<any | null>(null)
    const [panelMode, setPanelMode] = React.useState<'details' | 'fund' | 'propose' | 'none'>('none')
    const [search, setSearch] = React.useState("")
    const [filterSchemeType, setFilterSchemeType] = React.useState<string>("all")
    const [filterSector, setFilterSector] = React.useState<string>("all")
    const [loading, setLoading] = React.useState(true)

    const [deployAmount, setDeployAmount] = React.useState<number>(100000)

    // Propose Investment Form state
    const [proposeSubmitting, setProposeSubmitting] = React.useState(false)
    const [newTitle, setNewTitle] = React.useState("")
    const [newType, setNewType] = React.useState("hire_purchase")
    const [newCapital, setNewCapital] = React.useState(5000000)
    const [newYield, setNewYield] = React.useState(12.5)
    const [newDuration, setNewDuration] = React.useState(18)

    const fetchSchemes = async () => {
        try {
            setLoading(true)
            const schemeRes = await fetch('/api/copteller/schemes')
            const schemeData = await schemeRes.json()
            if (schemeData.data) {
                setSchemes(schemeData.data)
            }
        } catch (err) {
            console.error('Failed to load schemes:', err)
            toast.error("Failed to load schemes registry.")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchSchemes()
    }, [])

    const handleFundScheme = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedScheme) return

        const deployKobo = deployAmount * 100
        const currentFunded = selectedScheme.funded_capital || 0
        const targetCapital = selectedScheme.target_capital || 0
        const newFunded = currentFunded + deployKobo

        const tId = toast.loading(`Deploying ${fmt(deployAmount)} to ${selectedScheme.name}...`)
        try {
            const res = await fetch(`/api/copteller/schemes/${selectedScheme.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    funded_capital: newFunded,
                    status: newFunded >= targetCapital ? 'active' : selectedScheme.status
                })
            })
            const data = await res.json()
            if (data.data) {
                toast.success(`Successfully deployed ${fmt(deployAmount)} to ${selectedScheme.name}!`, { id: tId })
                await fetchSchemes()
                setSelectedScheme(data.data)
                setPanelMode('details')
            } else {
                toast.error(data.error || "Funding allocation failed.", { id: tId })
            }
        } catch {
            toast.error("Network error allocating capital.", { id: tId })
        }
    }

    const handleProposeInvestment = async (e: React.FormEvent) => {
        e.preventDefault()
        setProposeSubmitting(true)
        const tId = toast.loading("Submitting investment proposal...")
        
        try {
            const res = await fetch('/api/copteller/schemes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newTitle,
                    scheme_type: newType,
                    target_capital: newCapital * 100, // to kobo
                    yield_rate: Number(newYield),
                    duration_months: Number(newDuration),
                    status: 'draft',
                    bank_approved: false
                })
            })
            const data = await res.json()
            if (data.data) {
                toast.success("Investment proposal submitted!", { id: tId })
                setPanelMode('none')
                setNewTitle("")
                await fetchSchemes()
            } else {
                toast.error(data.error || "Submission failed", { id: tId })
            }
        } catch (err) {
            toast.error("Network error submitting scheme", { id: tId })
        } finally {
            setProposeSubmitting(false)
        }
    }

    const filtered = schemes.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
            (s.cooperative?.name || '').toLowerCase().includes(search.toLowerCase())
        const matchType = filterSchemeType === 'all' || s.scheme_type === filterSchemeType
        const sponsor = getInstitutionalSponsor(s)
        const matchSector = filterSector === 'all' || sponsor.sector === filterSector
        return matchSearch && matchType && matchSector
    })

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                <p className="text-muted-foreground font-medium text-xs uppercase font-black">Loading marketplace catalog...</p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-orange-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Investments</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Underwrite Institutional Schemes</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold max-w-2xl">Co-fund verified state parastatal expansion tranches held in statutory Partner MFB escrow with scheduled weekly Ajo returns.</p>
                </div>
                <Button onClick={() => setPanelMode('propose')} className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-black font-black h-10 rounded-xl text-xs shadow-md shrink-0 flex items-center justify-center gap-2 border-0">
                    <PlusCircle className="h-4 w-4" /> Propose Investment
                </Button>
            </div>

            {/* Sponsoring Institutional Sector Tabs */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 text-orange-500" /> Sponsoring Institutional Parastatals
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> 100% Escrow Protected
                    </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
                    {SECTOR_FILTERS.map(sec => {
                        const Icon = sec.icon
                        const active = filterSector === sec.id
                        return (
                            <button
                                key={sec.id}
                                onClick={() => setFilterSector(sec.id)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border ${
                                    active
                                        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-black dark:border-white shadow-sm"
                                        : "bg-card border-border hover:bg-muted text-muted-foreground"
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {sec.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Scheme Type Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800 no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
                <button onClick={() => setFilterSchemeType("all")} className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${filterSchemeType === "all" ? "bg-orange-500 text-black" : "hover:bg-muted text-muted-foreground"}`}>
                    All Cycle Types
                </button>
                {SCHEME_TYPES.map(tab => (
                    <button key={tab.value} onClick={() => setFilterSchemeType(tab.value)} className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${filterSchemeType === tab.value ? "bg-orange-500 text-black" : "hover:bg-muted text-muted-foreground"}`}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left side: List / Search */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search active expansion schemes..."
                            className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filtered.map(scheme => {
                            const funded = scheme.funded_capital || 0
                            const target = scheme.target_capital || 1
                            const progressPercent = Math.min(100, Math.floor((funded / target) * 100))
                            const typeObj = SCHEME_TYPES.find(t => t.value === scheme.scheme_type)
                            const sponsor = getInstitutionalSponsor(scheme)
                            const SponsorIcon = sponsor.icon

                            return (
                                <div
                                    key={scheme.id}
                                    onClick={() => {
                                        setSelectedScheme(scheme)
                                        setDeployAmount(Math.max(0, (target - funded) / 100))
                                        setPanelMode('details')
                                    }}
                                    className={`bg-white dark:bg-slate-950/60 border rounded-3xl p-5 space-y-4 shadow-sm hover:shadow-md cursor-pointer transition-all ${selectedScheme?.id === scheme.id ? "border-orange-500 ring-2 ring-orange-500/10" : "border-slate-200 dark:border-slate-900"}`}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${sponsor.color}`}>
                                                    <SponsorIcon className="h-2.5 w-2.5" />
                                                    {sponsor.short}
                                                </span>
                                                <span className="text-[9px] font-mono text-muted-foreground">
                                                    {sponsor.escrow}
                                                </span>
                                            </div>
                                            <p className="text-sm font-black">{scheme.name}</p>
                                            <p className="text-[10px] text-slate-455 font-semibold mt-0.5">{scheme.cooperative?.name || 'Universal Cooperative'}</p>
                                        </div>
                                        <Badge className="text-[9px] font-black uppercase border bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-450 shrink-0">
                                            {scheme.status}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] font-black text-slate-450">
                                            <span>Funded progress</span>
                                            <span>{progressPercent}% ({fmt(funded / 100)} / {fmt(target / 100)})</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                            <div className="bg-orange-500 h-full rounded-full" style={{ width: `${progressPercent}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground pt-1.5 border-t">
                                        <span>Duration: {scheme.duration_months || 0} Mo</span>
                                        <span className="text-emerald-600 font-black">+{scheme.yield_rate || 0}% Yield</span>
                                    </div>
                                    <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                                        <span className="truncate">{sponsor.mechanism}</span>
                                        <span className="text-orange-500 font-bold flex items-center gap-0.5 shrink-0">
                                            Underwrite <ArrowRight className="h-3 w-3" />
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                        {filtered.length === 0 && (
                            <div className="col-span-2 py-8 text-center text-xs font-bold text-muted-foreground bg-card rounded-2xl border border-dashed">
                                No active programs found matching filters.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side Panel */}
                <div className="space-y-4">
                    <AnimatePresence mode="wait">
                        {panelMode === 'details' && selectedScheme && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-6"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Underwrite tranche</span>
                                        <h3 className="text-base font-black mt-1 leading-snug">{selectedScheme.name}</h3>
                                    </div>
                                    <button onClick={() => setPanelMode('none')} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="h-4 w-4" /></button>
                                </div>

                                {(() => {
                                    const sponsor = getInstitutionalSponsor(selectedScheme)
                                    return (
                                        <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-orange-500 shrink-0" />
                                                <span className="text-xs font-black text-foreground">Tripartite Institutional Guarantee</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                                                Co-funds the wholesale expansion facility under statutory MOU with <strong>{sponsor.name}</strong>. Capital is secured in <strong>{sponsor.escrow}</strong> and amortized at <strong>{sponsor.mechanism}</strong>.
                                            </p>
                                        </div>
                                    )
                                })()}

                                <div className="space-y-3.5 text-xs border-y py-4 border-slate-100 dark:border-slate-800 font-semibold">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Sponsoring Institution</span>
                                        <span className="font-bold text-foreground">{getInstitutionalSponsor(selectedScheme).short}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Escrow Account</span>
                                        <span className="font-mono text-foreground">{getInstitutionalSponsor(selectedScheme).escrow}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Cooperative</span>
                                        <span>{selectedScheme.cooperative?.name || 'Universal Cooperative'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Target Capital</span>
                                        <span>{fmt((selectedScheme.target_capital || 0) / 100)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Funded Capital</span>
                                        <span className="text-orange-500">{fmt((selectedScheme.funded_capital || 0) / 100)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Expected Yield</span>
                                        <span className="font-black text-emerald-600 dark:text-emerald-400">+{selectedScheme.yield_rate || 0}% ROI</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Term Period</span>
                                        <span>{selectedScheme.duration_months || 0} Months</span>
                                    </div>
                                </div>

                                {selectedScheme.status !== 'completed' ? (
                                    <Button onClick={() => setPanelMode('fund')} className="w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-black text-xs border-0">
                                        Underwrite & Allocate Capital
                                    </Button>
                                ) : (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-center">
                                        <p className="text-xs font-black text-slate-550 uppercase tracking-wider">Fully Funded</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">This tranche has reached target underwriting allocation.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {panelMode === 'fund' && selectedScheme && (
                            <motion.div
                                key="fund"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xs font-black">Allocate Underwriting Capital</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{selectedScheme.name}</p>
                                    </div>
                                    <button onClick={() => setPanelMode('details')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-455"><X className="h-4 w-4" /></button>
                                </div>
                                <form onSubmit={handleFundScheme} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-550 uppercase">Underwriting Capital (₦)</label>
                                        <input
                                            type="number"
                                            required
                                            min="100"
                                            value={deployAmount}
                                            onChange={e => setDeployAmount(Number(e.target.value))}
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-sm font-black focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                                        <Button type="button" onClick={() => setPanelMode('details')} variant="outline" className="w-full sm:flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                        <Button type="submit" className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-450 text-black font-black text-xs h-10 rounded-xl border-0 shadow-lg">Confirm Allocation</Button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {panelMode === 'propose' && (
                            <motion.div
                                key="propose"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 max-h-[85dvh] overflow-y-auto"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-black">Propose New Investment</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Submit custom scheme for underwriter review.</p>
                                    </div>
                                    <button onClick={() => setPanelMode('none')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-455"><X className="h-4 w-4" /></button>
                                </div>
                                <form onSubmit={handleProposeInvestment} className="space-y-4 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-550 uppercase">Investment Title</label>
                                        <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Export Processing Fund" className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-805 bg-background text-xs font-semibold focus:outline-none focus:border-orange-500" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-555 uppercase">Scheme Category / Type</label>
                                        <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none">
                                            {SCHEME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-555 uppercase">Target Capital (₦)</label>
                                            <input required type="number" value={newCapital} onChange={e => setNewCapital(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-black focus:outline-none focus:border-orange-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-555 uppercase">Expected Yield (%)</label>
                                            <input required type="number" step="0.1" value={newYield} onChange={e => setNewYield(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-black text-emerald-650 focus:outline-none focus:border-orange-500" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-555 uppercase">Duration (Months)</label>
                                        <input required type="number" value={newDuration} onChange={e => setNewDuration(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-black focus:outline-none" />
                                    </div>
                                    
                                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                                        <Button type="button" onClick={() => setPanelMode('none')} variant="outline" className="w-full sm:flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                        <Button type="submit" disabled={proposeSubmitting} className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-650 text-black font-black text-xs h-10 rounded-xl shadow-lg border-0">
                                            {proposeSubmitting ? 'Submitting...' : 'Propose Scheme'}
                                        </Button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {panelMode === 'none' && (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center"
                            >
                                <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                                <p className="text-xs font-bold text-muted-foreground">Select an active expansion scheme to inspect details, underwrite tranches, or deploy capital allocation.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
