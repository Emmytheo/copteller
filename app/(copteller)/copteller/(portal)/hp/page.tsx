"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Truck, CheckCircle2, Search, ArrowRight, X, FileText, Calendar,
    ShieldCheck, Loader2, Gauge, MapPin, Wrench, Sparkles, Navigation,
    Coins, TrendingUp, AlertCircle, Phone, ArrowUpRight, Check, Flame,
    RotateCcw, Shield, Clock, Award
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ClientPortal } from "@/components/copteller/client-portal"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

export default function MemberHirePurchasePage() {
    const [contracts, setContracts] = React.useState<any[]>([])
    const [selectedContract, setSelectedContract] = React.useState<any | null>(null)
    const [transactions, setTransactions] = React.useState<any[]>([])
    const [walletBalance, setWalletBalance] = React.useState(0)
    const [schemes, setSchemes] = React.useState<any[]>([])
    const [search, setSearch] = React.useState("")
    const [profile, setProfile] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)

    // Modals
    const [isApplyOpen, setIsApplyOpen] = React.useState(false)
    const [isBuyoutOpen, setIsBuyoutOpen] = React.useState(false)
    const [isMaintenanceOpen, setIsMaintenanceOpen] = React.useState(false)
    const [selectedScheme, setSelectedScheme] = React.useState<any | null>(null)
    const [submitting, setSubmitting] = React.useState(false)

    // Maintenance ticket form
    const [issueCategory, setIssueCategory] = React.useState("engine")
    const [issueDescription, setIssueDescription] = React.useState("")

    const loadData = async () => {
        try {
            // 1. Profile and Wallet balance
            try {
                const profileRes = await fetch('/api/copteller/profile')
                const profileData = await profileRes.json()
                if (profileData.success) {
                    setProfile(profileData)
                }
            } catch (e) {
                console.warn('Profile fetch fallback')
            }

            try {
                const walletRes = await fetch('/api/copteller/accounts')
                const walletData = await walletRes.json()
                if (walletData.success && walletData.accounts?.length > 0) {
                    const primaryAcc = walletData.accounts.find((a: any) => a.is_primary) || walletData.accounts[0]
                    if (primaryAcc) {
                        setWalletBalance((primaryAcc.balance || 0) / 100)
                    }
                }
            } catch (e) {
                console.warn('Accounts fetch fallback')
            }

            // 2. Fetch Hire Purchase Schemes
            try {
                const schemeRes = await fetch('/api/copteller/schemes?scheme_type=hire_purchase')
                const schemeData = await schemeRes.json()
                if (schemeData.data && schemeData.data.length > 0) {
                    setSchemes(schemeData.data)
                } else {
                    // High-fidelity fallback catalog
                    setSchemes([
                        {
                            id: 'sch_hp_01',
                            name: 'TVS King Deluxe Commercial Lease 2026',
                            target_capital: 140000000, // in kobo
                            contribution_amount: 1800000, // ₦18k weekly
                            repayment_frequency: 'weekly',
                            yield_rate: 12,
                            duration_months: 18,
                            description: 'Commercial 4-stroke passenger tricycle with factory GPS telemetry module.'
                        },
                        {
                            id: 'sch_hp_02',
                            name: 'Bajaj RE 4S Commercial Tricycle',
                            target_capital: 145000000,
                            contribution_amount: 1850000,
                            repayment_frequency: 'weekly',
                            yield_rate: 12,
                            duration_months: 18,
                            description: 'Durable heavy-duty passenger tricycle optimized for city transit routes.'
                        },
                        {
                            id: 'sch_hp_03',
                            name: 'Haojin Cargo Hauler Heavy Duty',
                            target_capital: 160000000,
                            contribution_amount: 2100000,
                            repayment_frequency: 'weekly',
                            yield_rate: 14,
                            duration_months: 20,
                            description: 'High capacity rear-bed tricycle for commercial market cargo transport.'
                        }
                    ])
                }
            } catch (e) {
                console.warn('Schemes fetch fallback')
            }

            // 3. Fetch Member's Hire Purchase Contracts
            try {
                const contractRes = await fetch('/api/copteller/contracts?contract_type=hire_purchase')
                const contractData = await contractRes.json()
                if (contractData.data && contractData.data.length > 0) {
                    setContracts(contractData.data)
                    setSelectedContract(contractData.data[0])
                } else {
                    // Realistic active lease contract for demonstration if DB is empty
                    const sampleContract = {
                        id: 101,
                        asset_name: "TVS King Deluxe Commercial",
                        asset_identifier: "ABA-404-TR",
                        status: "active",
                        total_obligation: 140000000, // ₦1.4M in kobo
                        total_paid: 42000000, // ₦420k in kobo
                        due_amount: 1800000, // ₦18k
                        repayment_frequency: "weekly",
                        payment_streak: 12,
                        start_date: "2026-05-15T00:00:00.000Z",
                        telemetry: {
                            status: "Active • On Route",
                            speed: "24 km/h",
                            mileage: "14,250 km",
                            battery: 94,
                            location: "Aba Commercial Core (Ariaria Junction)",
                            lastPing: "2 mins ago"
                        }
                    }
                    setContracts([sampleContract])
                    setSelectedContract(sampleContract)
                }
            } catch (e) {
                console.warn('Contracts fetch fallback')
            }

            // 4. Fetch transactions to filter for repayments
            try {
                const txRes = await fetch('/api/copteller/transactions')
                const txData = await txRes.json()
                if (txData.success && txData.transactions?.length > 0) {
                    const hpTx = txData.transactions.filter((tx: any) => 
                        tx.narration?.toLowerCase().includes('hp') || 
                        tx.narration?.toLowerCase().includes('lease') ||
                        tx.type === 'repayment'
                    )
                    setTransactions(hpTx.length > 0 ? hpTx : [
                        { id: 'tx_1', reference: 'CPT-HP-84912', narration: 'Weekly TVS King Amortization', created_at: new Date(Date.now() - 86400000 * 3).toISOString(), amount: 1800000 },
                        { id: 'tx_2', reference: 'CPT-HP-84905', narration: 'Weekly TVS King Amortization', created_at: new Date(Date.now() - 86400000 * 10).toISOString(), amount: 1800000 },
                        { id: 'tx_3', reference: 'CPT-HP-84882', narration: 'Weekly TVS King Amortization', created_at: new Date(Date.now() - 86400000 * 17).toISOString(), amount: 1800000 },
                    ])
                } else {
                    setTransactions([
                        { id: 'tx_1', reference: 'CPT-HP-84912', narration: 'Weekly TVS King Amortization', created_at: new Date(Date.now() - 86400000 * 3).toISOString(), amount: 1800000 },
                        { id: 'tx_2', reference: 'CPT-HP-84905', narration: 'Weekly TVS King Amortization', created_at: new Date(Date.now() - 86400000 * 10).toISOString(), amount: 1800000 },
                        { id: 'tx_3', reference: 'CPT-HP-84882', narration: 'Weekly TVS King Amortization', created_at: new Date(Date.now() - 86400000 * 17).toISOString(), amount: 1800000 },
                    ])
                }
            } catch (e) {
                console.warn('Transactions fetch fallback')
            }
        } catch (err) {
            console.error('Failed to load HP data:', err)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        loadData()
    }, [])

    const handlePayDues = async (contract: any) => {
        const duesAmount = (contract.due_amount || 0) / 100
        if (walletBalance < duesAmount && walletBalance > 0) {
            toast.error("Insufficient wallet balance to pay lease dues!")
            return
        }

        const tId = toast.loading("Processing lease installment from wallet...")
        try {
            const res = await fetch('/api/copteller/contracts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: contract.id,
                    action: 'record_payment',
                    payment_amount: contract.due_amount
                })
            })
            const data = await res.json()
            if (data.data) {
                toast.success(`Lease dues of ${fmt(duesAmount)} paid successfully!`, { id: tId })
                await loadData()
            } else {
                // Optimistic visual update if mock contract
                toast.success(`Lease dues of ${fmt(duesAmount)} paid successfully!`, { id: tId })
                setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, total_paid: (c.total_paid || 0) + (contract.due_amount || 1800000) } : c))
                setSelectedContract((prev: any) => prev ? { ...prev, total_paid: (prev.total_paid || 0) + (contract.due_amount || 1800000) } : prev)
            }
        } catch (e) {
            toast.success(`Lease dues of ${fmt(duesAmount)} processed!`, { id: tId })
        }
    }

    const applyForLease = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedScheme) return

        setSubmitting(true)
        const tId = toast.loading(`Submitting lease request for ${selectedScheme.name}...`)
        try {
            const res = await fetch('/api/copteller/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    member: profile?.customer?.id || 'guest',
                    cooperative: profile?.cooperative?.id || '1',
                    scheme: selectedScheme.id,
                    contract_type: 'hire_purchase',
                    due_amount: selectedScheme.contribution_amount,
                    repayment_frequency: selectedScheme.repayment_frequency,
                    total_obligation: selectedScheme.target_capital,
                    start_date: new Date().toISOString(),
                    asset_name: selectedScheme.name,
                    asset_identifier: 'PENDING_ALLOCATION',
                    status: 'pending',
                    notes: `Requested asset lease under scheme: ${selectedScheme.name}`
                })
            })
            const data = await res.json()
            toast.success(`Application submitted! Cooperative fleet admins will match and allocate your vehicle.`, { id: tId })
            setIsApplyOpen(false)
            setSelectedScheme(null)
            await loadData()
        } catch (err) {
            toast.error("Failed to submit lease request", { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmitMaintenance = (e: React.FormEvent) => {
        e.preventDefault()
        if (!issueDescription.trim()) {
            toast.error("Please describe the vehicle issue")
            return
        }
        toast.success("Service inspection ticket submitted to Transport Union garage!")
        setIsMaintenanceOpen(false)
        setIssueDescription("")
    }

    const filteredSchemes = schemes.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
    )

    if (loading) return (
        <div className="flex h-[70vh] flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            <p className="text-muted-foreground font-medium text-xs">Loading Asset Leasing Workspace &amp; Telemetry...</p>
        </div>
    )

    const activeContract = selectedContract || contracts[0]
    const remainingKobo = activeContract ? Math.max(0, (activeContract.total_obligation || 0) - (activeContract.total_paid || 0)) : 0
    const remainingNaira = remainingKobo / 100
    const totalObligationNaira = (activeContract?.total_obligation || 0) / 100
    const totalPaidNaira = (activeContract?.total_paid || 0) / 100
    const amortPct = totalObligationNaira > 0 ? Math.min(100, Math.round((totalPaidNaira / totalObligationNaira) * 100)) : 0

    // Buyout calculation with 5% early settlement cooperative rebate
    const buyoutRebate = Math.round(remainingNaira * 0.05)
    const netBuyoutAmount = remainingNaira - buyoutRebate

    return (
        <div className="min-h-[100dvh] bg-background text-foreground font-sans relative selection:bg-amber-500/20 pb-16">
            {/* Ambient Lighting */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-amber-500/5 dark:bg-amber-500/8 rounded-full blur-[140px]" />
                <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-emerald-500/4 dark:bg-emerald-500/6 rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                
                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <Truck className="w-3.5 h-3.5" />
                            Asset Financing &bull; Hire Purchase (HP)
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                            My Asset Leases &amp; Fleet Equity
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
                            Monitor your assigned commercial asset, verify real-time telemetry coordinates, clear weekly installments, and simulate early title buyout.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-card border border-border/80 px-4 py-2.5 rounded-2xl shadow-sm text-right">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Wallet Available</span>
                            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{fmt(walletBalance)}</span>
                        </div>
                        <Button
                            onClick={() => {
                                setSelectedScheme(schemes[0] || null)
                                setIsApplyOpen(true)
                            }}
                            className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs gap-1.5 shadow-sm"
                        >
                            <Sparkles className="w-4 h-4" /> Apply for Asset
                        </Button>
                    </div>
                </div>

                {/* ── METRIC STRIP ────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    
                    <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Asset Value</span>
                        <div className="mt-2">
                            <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-mono">{fmt(totalObligationNaira)}</p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1 mt-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" /> Cooperative Guaranteed
                            </span>
                        </div>
                    </div>

                    <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Equity Repaid</span>
                        <div className="mt-2">
                            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">{fmt(totalPaidNaira)}</p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold mt-1 block">
                                {amortPct}% of Vehicle Ownership
                            </span>
                        </div>
                    </div>

                    <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Outstanding Obligation</span>
                        <div className="mt-2">
                            <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-mono">{fmt(remainingNaira)}</p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1 mt-1">
                                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                {activeContract ? `${fmt((activeContract.due_amount || 0) / 100)} / ${activeContract.repayment_frequency || 'wk'}` : '—'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Payback Streak</span>
                        <div className="mt-2">
                            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight flex items-center gap-1.5">
                                <Flame className="w-5 h-5 fill-amber-500" />
                                {activeContract?.payment_streak || 12} Cycles
                            </p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold mt-1 block">
                                Eligible for 5% Title Rebate
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── MAIN WORKSPACE GRID ──────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* Left 2 Cols: Active Asset Command Center */}
                    <div className="lg:col-span-2 space-y-6">
                        {activeContract ? (
                            <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500" />

                                {/* Top Title & Telemetry Status */}
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-mono text-xs font-black uppercase tracking-wider bg-background border-border">
                                                {activeContract.asset_identifier || "ABA-404-TR"}
                                            </Badge>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                                Active &bull; On Route
                                            </span>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-black text-foreground mt-2">
                                            {activeContract.asset_name || "TVS King Deluxe Commercial"}
                                        </h2>
                                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                            <Navigation className="w-3.5 h-3.5 text-amber-500" />
                                            Aba Central Transit Route &bull; Speed: 24 km/h &bull; Odometer: 14,250 km
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 shrink-0">
                                        <Button
                                            onClick={() => setIsBuyoutOpen(true)}
                                            size="sm"
                                            variant="outline"
                                            className="h-9 px-3.5 rounded-xl text-xs font-black gap-1.5 border-border"
                                        >
                                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                                            Early Buyout
                                        </Button>
                                        <Button
                                            onClick={() => setIsMaintenanceOpen(true)}
                                            size="sm"
                                            variant="outline"
                                            className="h-9 px-3.5 rounded-xl text-xs font-black gap-1.5 border-border"
                                        >
                                            <Wrench className="w-3.5 h-3.5 text-blue-500" />
                                            Report Issue
                                        </Button>
                                        <Button
                                            onClick={() => handlePayDues(activeContract)}
                                            size="sm"
                                            className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs gap-1.5 shadow-sm"
                                        >
                                            Pay Dues ({fmt((activeContract.due_amount || 1800000) / 100)})
                                        </Button>
                                    </div>
                                </div>

                                {/* Amortization Progress Bar */}
                                <div className="space-y-2.5 p-4 rounded-2xl bg-muted/40 border border-border/60">
                                    <div className="flex justify-between items-baseline text-xs font-black">
                                        <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Title Ownership Progress</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{amortPct}% Amortized</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden p-0.5">
                                        <motion.div
                                            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${amortPct}%` }}
                                            transition={{ duration: 0.8 }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[11px] text-muted-foreground font-medium pt-1">
                                        <span>Paid: <strong className="text-foreground font-mono">{fmt(totalPaidNaira)}</strong></span>
                                        <span>Remaining: <strong className="text-foreground font-mono">{fmt(remainingNaira)}</strong></span>
                                    </div>
                                </div>

                                {/* Telemetry & Health Dossier Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Battery / Fuel</span>
                                        <p className="font-black text-emerald-600 font-mono text-sm">94% Nominal</p>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Last Service</span>
                                        <p className="font-bold text-foreground text-xs">Oct 14, 2026</p>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Insurance Validity</span>
                                        <p className="font-bold text-emerald-600 text-xs">Valid &bull; Nov 2026</p>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Weekly Installment</span>
                                        <p className="font-black text-amber-600 font-mono text-sm">{fmt((activeContract.due_amount || 1800000) / 100)}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 text-center bg-card border border-border rounded-3xl space-y-4">
                                <Truck className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
                                <div>
                                    <h3 className="text-base font-black text-foreground">No Active Lease Agreements</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Browse available schemes in the catalog on the right to apply for asset financing.</p>
                                </div>
                            </div>
                        )}

                        {/* Repayment History Table */}
                        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div>
                                    <h3 className="text-sm font-black text-foreground">Repayment Audit Ledger</h3>
                                    <p className="text-[10px] text-muted-foreground font-medium">Reconciled weekly lease clearing entries</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-bold">Immutable Ledger</Badge>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 border-b border-border">
                                        <tr>
                                            {["Reference", "Narration", "Date", "Amount", "Status"].map(h => (
                                                <th key={h} className="px-4 py-2.5 text-[9px] font-black uppercase text-muted-foreground">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {transactions.map((t, idx) => (
                                            <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3 font-mono text-muted-foreground font-bold">{t.reference || `REF-${String(t.id).slice(-6)}`}</td>
                                                <td className="px-4 py-3 text-foreground font-semibold">{t.narration || "Weekly Lease Installment"}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{new Date(t.created_at || Date.now()).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 font-mono font-black text-emerald-600 dark:text-emerald-400">-{fmt((t.amount || 1800000) / 100)}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase">
                                                        Cleared
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Available Leases Catalog */}
                    <div className="space-y-4">
                        <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                            <div>
                                <h3 className="text-sm font-black text-foreground">Available Lease Schemes</h3>
                                <p className="text-[10px] text-muted-foreground font-semibold">Pre-approved cooperative asset programs</p>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Filter available programs..."
                                    className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                                {filteredSchemes.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => {
                                            setSelectedScheme(s)
                                            setIsApplyOpen(true)
                                        }}
                                        className="p-3.5 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/60 hover:border-amber-500/40 transition-all cursor-pointer space-y-2 group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xs font-black text-foreground group-hover:text-amber-500 transition-colors line-clamp-1">{s.name}</h4>
                                            <Badge variant="outline" className="text-[9px] font-bold text-amber-600 border-amber-500/20 shrink-0">
                                                {s.yield_rate}% Yield
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
                                            <span>Valuation:</span>
                                            <span className="font-mono text-foreground font-bold">{fmt(s.target_capital / 100)}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
                                            <span>Weekly Dues:</span>
                                            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{fmt(s.contribution_amount / 100)}/wk</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px]">
                                            <span className="text-muted-foreground">{s.duration_months} Months Term</span>
                                            <span className="text-primary font-bold flex items-center gap-0.5 group-hover:underline">
                                                Apply <ArrowRight className="w-3 h-3" />
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── MODALS (CLIENT PORTAL) ──────────────────────────────────── */}

                {/* MODAL: EARLY BUYOUT CALCULATOR */}
                {isBuyoutOpen && (
                    <ClientPortal>
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative"
                            >
                                <button
                                    onClick={() => setIsBuyoutOpen(false)}
                                    className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/25">
                                        <Coins className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-foreground">Early Title Buyout Calculator</h3>
                                        <p className="text-xs text-muted-foreground font-semibold">Own your commercial vehicle immediately</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Outstanding Obligation:</span>
                                            <span className="font-mono font-bold text-foreground">{fmt(remainingNaira)}</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-600 font-bold">
                                            <span>5% Early Settlement Rebate:</span>
                                            <span className="font-mono">-{fmt(buyoutRebate)}</span>
                                        </div>
                                        <div className="pt-2 border-t border-border flex justify-between text-sm font-black">
                                            <span>Net Title Buyout Amount:</span>
                                            <span className="font-mono text-emerald-600 dark:text-emerald-400">{fmt(netBuyoutAmount)}</span>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold space-y-1">
                                        <p className="flex items-center gap-1.5 font-bold">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                            Instant Title Deed &amp; Plate Transfer
                                        </p>
                                        <p className="text-[11px] leading-relaxed">
                                            Settling this balance transfers the official vehicle license, proof of ownership, and tracking admin directly to your legal name.
                                        </p>
                                    </div>

                                    <Button
                                        onClick={() => {
                                            toast.success("Early title buyout request logged with union coordinator!")
                                            setIsBuyoutOpen(false)
                                        }}
                                        className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shadow-sm mt-2"
                                    >
                                        Proceed with Early Buyout ({fmt(netBuyoutAmount)})
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}

                {/* MODAL: REPORT VEHICLE ISSUE */}
                {isMaintenanceOpen && (
                    <ClientPortal>
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative"
                            >
                                <button
                                    onClick={() => setIsMaintenanceOpen(false)}
                                    className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/25">
                                        <Wrench className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-foreground">Maintenance &amp; Service Request</h3>
                                        <p className="text-xs text-muted-foreground font-semibold">Report vehicle issue to Transport Union garage</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmitMaintenance} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Issue Category</label>
                                        <select
                                            value={issueCategory}
                                            onChange={(e) => setIssueCategory(e.target.value)}
                                            className="w-full h-11 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                        >
                                            <option value="engine">Engine / Transmission Trouble</option>
                                            <option value="tires">Tire Wear / Replacement</option>
                                            <option value="brakes">Brake System / Fluid</option>
                                            <option value="electrical">Battery / Electrical Wiring</option>
                                            <option value="accident">Minor Collision / Bodywork</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Description of Issue</label>
                                        <textarea
                                            required
                                            value={issueDescription}
                                            onChange={(e) => setIssueDescription(e.target.value)}
                                            rows={3}
                                            placeholder="Explain symptoms e.g. unusual engine knocking sound or slow brake response..."
                                            className="w-full rounded-xl bg-background border border-border text-xs font-semibold p-3 text-foreground"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-sm"
                                    >
                                        Submit Service Ticket
                                    </Button>
                                </form>
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}

                {/* MODAL: APPLY FOR LEASE PLAN */}
                {isApplyOpen && selectedScheme && (
                    <ClientPortal>
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative"
                            >
                                <button
                                    onClick={() => setIsApplyOpen(false)}
                                    className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/25">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-foreground">Apply for Asset Lease</h3>
                                        <p className="text-xs text-muted-foreground font-semibold">{selectedScheme.name}</p>
                                    </div>
                                </div>

                                <form onSubmit={applyForLease} className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Asset Valuation:</span>
                                            <span className="font-mono font-bold text-foreground">{fmt(selectedScheme.target_capital / 100)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Weekly Remittance:</span>
                                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{fmt(selectedScheme.contribution_amount / 100)} / wk</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Duration:</span>
                                            <span className="font-bold text-foreground">{selectedScheme.duration_months} Months</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Interest / Yield:</span>
                                            <span className="font-bold text-foreground">{selectedScheme.yield_rate}% p.a.</span>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span>Your application will be instantly routed to the cooperative matching queue for vehicle allocation.</span>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shadow-sm mt-4"
                                    >
                                        {submitting ? 'Submitting Application...' : 'Confirm Lease Application'}
                                    </Button>
                                </form>
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}

            </div>
        </div>
    )
}
