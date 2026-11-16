"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp, PlusCircle, X, Search, ShieldCheck, FileText, ArrowRight, Check,
    PiggyBank, Users, Layers, Award, Calendar, CircleDollarSign, Info, Loader2,
    RotateCw, Users2, CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

export default function ActiveSchemesPage() {
    const [schemes, setSchemes] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [filterCategory, setFilterCategory] = React.useState<'all' | 'lease' | 'ajo' | 'loan'>('all')
    const [selectedScheme, setSelectedScheme] = React.useState<any | null>(null)
    const [panelMode, setPanelMode] = React.useState<'details' | 'form' | 'none'>('none')
    const [schemeContracts, setSchemeContracts] = React.useState<any[]>([])
    const [loadingContracts, setLoadingContracts] = React.useState(false)
    const [advancingSlot, setAdvancingSlot] = React.useState(false)

    const [submitting, setSubmitting] = React.useState(false)

    // Form fields
    const [poolName, setPoolName] = React.useState("")
    const [category, setCategory] = React.useState<'lease' | 'ajo' | 'loan' | 'grant'>('lease')
    const [schemeType, setSchemeType] = React.useState<string>('hire_purchase')
    const [targetCost, setTargetCost] = React.useState(500000)
    const [contributionAmount, setContributionAmount] = React.useState(10000)
    const [yieldRate, setYieldRate] = React.useState(12)
    const [duration, setDuration] = React.useState("12")
    const [memberLimit, setMemberLimit] = React.useState(20)

    // Bank product types authorized for this cooperative
    const [bankProducts, setBankProducts] = React.useState<any[]>([])
    const [selectedBankProduct, setSelectedBankProduct] = React.useState<any | null>(null)
    const [coopProfile, setCoopProfile] = React.useState<any | null>(null)

    const loadData = async () => {
        try {
            setLoading(true)
            // 1. Fetch cooperative profile
            const coopProfileRes = await fetch('/api/copteller/admin/cooperative-profile')
            const coopProfileData = await coopProfileRes.json()
            
            if (coopProfileData.success && coopProfileData.cooperative) {
                const coop = coopProfileData.cooperative
                setCoopProfile(coop)
                
                // Set authorized product types from relationship
                if (coop.authorized_product_types) {
                    setBankProducts(coop.authorized_product_types)
                }

                // 2. Fetch schemes created by this cooperative
                const schemesRes = await fetch(`/api/copteller/schemes?cooperativeId=${coop.id}`)
                const schemesData = await schemesRes.json()
                if (schemesData.data) {
                    setSchemes(schemesData.data)
                }
            }
        } catch (err) {
            console.error('Failed to load cooperative schemes:', err)
            toast.error("Failed to load cooperative schemes.")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        loadData()
    }, [])

    const handleSelectScheme = async (sch: any) => {
        setSelectedScheme(sch)
        setPanelMode('details')
        setLoadingContracts(true)
        try {
            const res = await fetch(`/api/copteller/contracts?schemeId=${sch.id}`)
            const json = await res.json()
            if (json.data && Array.isArray(json.data)) {
                setSchemeContracts(json.data)
            } else {
                setSchemeContracts([])
            }
        } catch {
            setSchemeContracts([])
        } finally {
            setLoadingContracts(false)
        }
    }

    const handleAdvanceSlot = async (scheme: any) => {
        setAdvancingSlot(true)
        const nextSlot = (Number(scheme.current_payout_slot) || 0) + 1
        const tId = toast.loading(`Advancing cycle rotation to Slot #${nextSlot}...`)
        try {
            const res = await fetch('/api/copteller/schemes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: scheme.id,
                    current_payout_slot: nextSlot
                })
            })
            const json = await res.json()
            if (json.data) {
                toast.success(`Cycle rotated! Current payout slot is now #${nextSlot}`, { id: tId })
                setSelectedScheme(json.data)
                setSchemes(prev => prev.map(s => s.id === scheme.id ? json.data : s))
            } else {
                toast.error(json.error || "Failed to rotate cycle", { id: tId })
            }
        } catch {
            toast.error("Network error advancing cycle", { id: tId })
        } finally {
            setAdvancingSlot(false)
        }
    }

    const handleSelectBankProduct = (product: any) => {
        setSelectedBankProduct(product)
        setPoolName(`${product.name} Cycle`)
        setCategory(product.category)
        
        // Map category to scheme_type
        if (product.product_type === 'ajo_rotation') setSchemeType('ajo_rotation')
        else if (product.product_type === 'hire_purchase') setSchemeType('hire_purchase')
        else if (product.product_type === 'micro_loan') setSchemeType('loan_pool')
        else setSchemeType('savings_drive')

        if (product.interest_rate) setYieldRate(product.interest_rate)
        if (product.min_amount) setTargetCost(Math.round(product.min_amount / 100))
        if (product.repayment_frequency) setContributionAmount(Math.round((product.min_amount || 1000000) / 50 / 100)) // approximation
    }

    const handleCreatePool = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!coopProfile) return

        setSubmitting(true)
        const tId = toast.loading("Structuring new scheme pool...")
        
        try {
            const res = await fetch('/api/copteller/schemes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: poolName,
                    cooperative: coopProfile.id,
                    product_type: selectedBankProduct?.id,
                    scheme_type: schemeType,
                    contribution_amount: contributionAmount * 100, // to kobo
                    target_capital: targetCost * 100, // to kobo
                    repayment_frequency: selectedBankProduct?.repayment_frequency || 'weekly',
                    duration_months: Number(duration),
                    yield_rate: Number(yieldRate),
                    max_participants: Number(memberLimit),
                    start_date: new Date().toISOString(),
                    description: `Structured scheme based on: ${selectedBankProduct?.name || 'Manual'}`
                })
            })
            const data = await res.json()
            if (data.data) {
                toast.success("New scheme cycle structured and opened successfully!", { id: tId })
                await loadData()
                await handleSelectScheme(data.data)
                // Reset form
                setPoolName("")
                setSelectedBankProduct(null)
            } else {
                toast.error(data.error || "Failed to structure pool.", { id: tId })
            }
        } catch (err) {
            toast.error("Network error saving scheme.", { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    const filtered = schemes.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase())
        if (filterCategory === 'all') return matchesSearch
        if (filterCategory === 'lease') return matchesSearch && s.scheme_type === 'hire_purchase'
        if (filterCategory === 'ajo') return matchesSearch && s.scheme_type === 'ajo_rotation'
        if (filterCategory === 'loan') return matchesSearch && s.scheme_type === 'loan_pool'
        return matchesSearch
    })

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Underwriting & Structuring</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Schemes & Cycles</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">Structure investment tranches for investors, or set up rotational Ajo thrift cycles for members.</p>
                </div>
                <Button onClick={() => setPanelMode('form')} className="bg-emerald-500 hover:bg-emerald-600 text-black font-black h-10 rounded-xl text-xs shrink-0 flex items-center gap-2 border-0 w-full sm:w-auto">
                    <PlusCircle className="h-4 w-4" /> Create Scheme / Cycle
                </Button>
            </div>

            {/* Tabs for category filter */}
            <div className="max-w-full overflow-x-auto no-scrollbar whitespace-nowrap">
                <div className="inline-flex gap-1.5 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
                    {(['all', 'lease', 'ajo', 'loan'] as const).map(cat => (
                        <button
                            key={cat}
                            onClick={() => {
                                setFilterCategory(cat)
                                setSelectedScheme(null)
                                setPanelMode('none')
                            }}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-black capitalize transition-all ${filterCategory === cat ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {cat === 'all' ? 'All Products' : cat === 'lease' ? 'Hire Purchase' : cat === 'ajo' ? 'Ajo Rotation' : 'Micro Loans'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Layout: Main 2-column details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Schemes list table */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search cooperative schemes or cycles..."
                            className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </div>

                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <div className="min-w-[550px]">
                                <div className="grid grid-cols-4 px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                    <span className="col-span-2">Scheme Name</span>
                                    <span>Target Capital</span>
                                    <span>Type / Yield</span>
                                </div>

                                {filtered.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground text-xs font-bold">No active cooperative schemes or cycles.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filtered.map(sch => {
                                            const isAjo = sch.scheme_type === 'ajo_rotation'
                                            return (
                                                <div
                                                    key={sch.id}
                                                    onClick={() => handleSelectScheme(sch)}
                                                    className={`grid grid-cols-4 px-4 sm:px-6 py-4 items-center cursor-pointer transition-colors ${selectedScheme?.id === sch.id ? "bg-emerald-50/50 dark:bg-emerald-950/20 font-bold" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/30"}`}
                                                >
                                                    <div className="col-span-2 flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl shrink-0 ${isAjo ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                            {isAjo ? <PiggyBank className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black">{sch.name}</p>
                                                            <p className="text-[10px] text-muted-foreground mt-0.5">{sch.duration_months || 0} Months &bull; {sch.enrolled_count || 0} enrolled</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-black">{fmt(sch.target_capital / 100)}</span>
                                                    <div className="flex items-center justify-between pr-4">
                                                        {isAjo ? (
                                                            <span className="text-xs font-black text-amber-600 dark:text-amber-400">Rotational</span>
                                                        ) : (
                                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-450">+{sch.yield_rate || 0}% Yield</span>
                                                        )}
                                                        <Badge variant="default" className={`text-[9px] uppercase font-black border ${isAjo ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                                                            {sch.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side details / form */}
                <div className="space-y-4">
                    <AnimatePresence mode="wait">
                        {panelMode === 'details' && selectedScheme && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 shadow-sm space-y-6"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                                            Scheme Specifications
                                        </span>
                                        <h3 className="text-base font-black mt-1 leading-snug">{selectedScheme.name}</h3>
                                    </div>
                                    <button onClick={() => setPanelMode('none')} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="space-y-3.5 text-xs border-y py-4 border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground font-semibold">Target Capital</span>
                                        <span className="font-black text-foreground">{fmt(selectedScheme.target_capital / 100)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground font-semibold">Funded Capital</span>
                                        <span className="font-black text-emerald-600 dark:text-emerald-450">{fmt(selectedScheme.funded_capital / 100)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground font-semibold">Contribution Cycle Dues</span>
                                        <span className="font-black">{fmt(selectedScheme.contribution_amount / 100)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground font-semibold">Frequency</span>
                                        <span className="font-black capitalize">{selectedScheme.repayment_frequency}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground font-semibold">Duration Cycle</span>
                                        <span className="font-black">{selectedScheme.duration_months || 'N/A'} Months</span>
                                    </div>
                                </div>

                                {/* Cycle Rotation Controls for Ajo */}
                                {selectedScheme.scheme_type === 'ajo_rotation' && (
                                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <RotateCw className={`h-4 w-4 text-amber-500 ${advancingSlot ? 'animate-spin' : ''}`} />
                                                <span className="text-xs font-black text-amber-700 dark:text-amber-400">Ajo Cycle Rotation</span>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-black border-amber-500/30 text-amber-600">
                                                Slot #{selectedScheme.current_payout_slot || 1} Active
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-semibold">
                                            Manage cycle rotation and advance member payout turn across the cooperative thrift pool.
                                        </p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={advancingSlot}
                                            onClick={() => handleAdvanceSlot(selectedScheme)}
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black text-xs h-8 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            <RotateCw className="h-3.5 w-3.5" />
                                            Advance to Slot #{(Number(selectedScheme.current_payout_slot) || 0) + 1}
                                        </Button>
                                    </div>
                                )}

                                {/* Enrolled Members / Cycle Roster */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Users2 className="h-4 w-4 text-emerald-500" />
                                            <span className="text-xs font-black">Enrolled Cycle Roster</span>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] font-black">
                                            {schemeContracts.length} / {selectedScheme.max_participants || 20}
                                        </Badge>
                                    </div>

                                    {loadingContracts ? (
                                        <div className="py-6 flex justify-center">
                                            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                                        </div>
                                    ) : schemeContracts.length === 0 ? (
                                        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                                            <p className="text-[10px] text-muted-foreground font-semibold">
                                                No members enrolled yet. Members can join via the Member Hub or Mobile App.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                            {schemeContracts.map((c: any, idx: number) => {
                                                const memberName = c.member?.full_name || c.member?.name || `Member #${c.member?.id || c.member || idx + 1}`
                                                const slot = c.ajo_slot_number || idx + 1
                                                const isCurrentTurn = selectedScheme.scheme_type === 'ajo_rotation' && Number(selectedScheme.current_payout_slot || 1) === slot
                                                return (
                                                    <div
                                                        key={c.id || idx}
                                                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                                                            isCurrentTurn
                                                                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                                                                : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 font-black text-[10px] flex items-center justify-center shrink-0">
                                                                #{slot}
                                                            </span>
                                                            <div className="truncate">
                                                                <p className="font-black text-[11px] truncate">{memberName}</p>
                                                                <p className="text-[9px] text-muted-foreground">Paid: {fmt((c.total_paid || 0) / 100)} &bull; Streak: {c.payment_streak || 0}</p>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className={`text-[9px] font-black shrink-0 ${isCurrentTurn ? 'border-amber-500 text-amber-600 font-black' : ''}`}>
                                                            {isCurrentTurn ? 'Current Turn' : c.status || 'Active'}
                                                        </Badge>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl flex gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold leading-relaxed">
                                        Official scheme under cooperative administration. Member repayments are tracked in real-time in the central ledger.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {panelMode === 'form' && (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 shadow-sm space-y-4"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-black">Structure New Scheme / Cycle</h3>
                                        <p className="text-[9px] text-muted-foreground mt-0.5">
                                            {selectedBankProduct
                                                ? `Based on: ${selectedBankProduct.name}`
                                                : 'Select a bank-authorized product type.'}
                                        </p>
                                    </div>
                                    <button onClick={() => { setPanelMode('none'); setSelectedBankProduct(null) }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Step 1: Picker */}
                                {!selectedBankProduct ? (
                                    <div className="space-y-2.5">
                                        <p className="text-[9px] font-black text-slate-500 uppercase">Select Product Template</p>
                                        {bankProducts.length === 0 ? (
                                            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                                                <p className="text-[10px] font-semibold text-muted-foreground">
                                                    No bank-authorized product templates.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                                                {bankProducts.map((product) => (
                                                    <div
                                                        key={product.id}
                                                        onClick={() => handleSelectBankProduct(product)}
                                                        className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer transition-all"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-black">{product.name}</p>
                                                            <p className="text-[8px] uppercase text-muted-foreground mt-0.5">{product.category}</p>
                                                        </div>
                                                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-1" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Step 2: Form */
                                    <form onSubmit={handleCreatePool} className="space-y-4 pt-2">
                                        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-450 truncate">{selectedBankProduct.name}</p>
                                            </div>
                                            <button type="button" onClick={() => setSelectedBankProduct(null)} className="text-[8px] text-muted-foreground hover:text-slate-700 font-bold underline">Change</button>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Scheme / Cycle Name</label>
                                            <input required value={poolName} onChange={e => setPoolName(e.target.value)} placeholder="e.g. Weekly Ajo Thrift Cycle" className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-emerald-500" />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Target Capital (₦)</label>
                                                <input required type="number" value={targetCost} onChange={e => setTargetCost(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-black focus:outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Dues / Contribution (₦)</label>
                                                <input required type="number" value={contributionAmount} onChange={e => setContributionAmount(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-black focus:outline-none" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Yield Rate (%)</label>
                                                <input required type="number" value={yieldRate} onChange={e => setYieldRate(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-black focus:outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Duration (Months)</label>
                                                <input required type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-black focus:outline-none" />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Max Participants</label>
                                            <input required type="number" value={memberLimit} onChange={e => setMemberLimit(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-black focus:outline-none" />
                                        </div>

                                        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                                            <Button type="button" onClick={() => { setPanelMode('none'); setSelectedBankProduct(null) }} variant="outline" className="w-full sm:w-auto flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                            <Button type="submit" disabled={submitting} className="w-full sm:w-auto flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs h-10 rounded-xl shadow-lg border-0">
                                                Structure Scheme
                                            </Button>
                                        </div>
                                    </form>
                                )}
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
                                <p className="text-xs font-bold text-muted-foreground">Select an active scheme or thrift cycle to view details or manage settings.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
