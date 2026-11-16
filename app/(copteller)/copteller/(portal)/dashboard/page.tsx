"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Wallet, PiggyBank, Truck, Award, BarChart3, ArrowUpRight, ArrowDownLeft,
    TrendingUp, ChevronRight, Bell, Clock, Zap, CreditCard, CheckCircle2,
    CircleDollarSign, Star, Activity, Car, Sparkles, RefreshCw, Plus,
    ArrowRight, ShieldCheck, Coins, Lock, HelpCircle, FileText, Smartphone,
    Tv, Lightbulb, Receipt, X, Check, HeartPulse, Landmark
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ClientPortal } from "@/components/copteller/client-portal"
import { DynamicServiceForm } from "@/components/copteller/dynamic-service-form"
import { MemberCashflowChart } from "@/components/charts/member-cashflow-chart"

// ── Mini sparkline bars ──────────────────────────────────────────────────────
function Sparkline({ data, color = "#10b981" }: { data: number[], color?: string }) {
    const max = Math.max(...data, 1)
    return (
        <div className="flex items-end gap-0.5 h-8">
            {data.map((v, i) => (
                <div
                    key={i}
                    className="flex-1 rounded-sm transition-all duration-300 hover:opacity-80"
                    style={{
                        height: `${(v / max) * 100}%`,
                        backgroundColor: color,
                    }}
                />
            ))}
        </div>
    )
}

const SERVICE_ICONS: Record<string, React.ElementType> = {
    transfers: CreditCard,
    bills: Lightbulb,
    airtime: Smartphone,
    cable: Tv,
    savings: PiggyBank,
    mobility: Truck,
    dues: Receipt,
    grants: Award,
}

function MemberDashboardContent() {
    const router = useRouter()
    const [walletVisible, setWalletVisible] = React.useState(true)
    const [balance, setBalance] = React.useState(0)
    const [accountNumber, setAccountNumber] = React.useState("----------")
    const [transactions, setTransactions] = React.useState<any[]>([])
    const [profile, setProfile] = React.useState<any>(null)
    const [contracts, setContracts] = React.useState<any[]>([])
    const [memberships, setMemberships] = React.useState<any[]>([])
    const [services, setServices] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)

    // Quick Service Execution State
    const [activeService, setActiveService] = React.useState<any | null>(null)
    const [formData, setFormData] = React.useState<Record<string, any>>({})
    const [isExecuting, setIsExecuting] = React.useState<boolean>(false)
    const [receipt, setReceipt] = React.useState<any>(null)

    const fetchWithTimeout = async (url: string, timeoutMs = 6000) => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)
        try {
            const res = await fetch(url, { signal: controller.signal })
            clearTimeout(timer)
            if (!res.ok) return null
            return await res.json()
        } catch (e) {
            clearTimeout(timer)
            return null
        }
    }

    const fetchDashboardData = async () => {
        const safetyTimer = setTimeout(() => {
            setLoading(false)
        }, 5000)

        try {
            setLoading(true)

            // Parallel execution: none of the 6 requests blocks any other
            const [
                profileData,
                accData,
                txData,
                contractsData,
                membershipsData,
                servicesData
            ] = await Promise.all([
                fetchWithTimeout('/api/copteller/profile'),
                fetchWithTimeout('/api/copteller/accounts'),
                fetchWithTimeout('/api/copteller/transactions'),
                fetchWithTimeout('/api/copteller/contracts'),
                fetchWithTimeout('/api/copteller/memberships'),
                fetchWithTimeout('/api/copteller/services'),
            ])

            // 1. Profile
            if (profileData?.success) {
                setProfile(profileData)
            }

            // 2. Ledger accounts
            if (accData?.success && accData.accounts?.length > 0) {
                const primaryAcc = accData.accounts.find((a: any) => a.is_primary) || accData.accounts[0]
                if (primaryAcc) {
                    setBalance((primaryAcc.balance || 0) / 100)
                    setAccountNumber(primaryAcc.account_number || "----------")
                }
            }

            // 3. Transactions
            if (txData?.success && txData.transactions?.length > 0) {
                setTransactions(txData.transactions)
            }

            // 4. Contracts
            if (contractsData?.data) {
                setContracts(contractsData.data)
            }

            // 5. Memberships
            if (membershipsData?.data) {
                setMemberships(membershipsData.data)
            }

            // 6. Services
            if (servicesData?.success) {
                setServices(servicesData.services || [])
            }
        } catch (err) {
            console.error('Failed to load member dashboard database records:', err)
        } finally {
            clearTimeout(safetyTimer)
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchDashboardData()
    }, [])

    const handleOpenService = (service: any) => {
        setActiveService(service)
        setReceipt(null)
        const defaults: Record<string, any> = {}
        if (Array.isArray(service.form_schema)) {
            service.form_schema.forEach((field: any) => {
                if (field.name === "amount") defaults[field.name] = 5000
                else defaults[field.name] = ""
            })
        }
        setFormData(defaults)
    }

    const handleExecuteService = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeService) return

        setIsExecuting(true)
        try {
            const res = await fetch("/api/copteller/services/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serviceId: activeService.id, formData }),
            })
            const data = await res.json()

            if (data.success && data.receipt) {
                toast.success(data.message || "Transaction completed successfully!")
                setReceipt(data.receipt)
                fetchDashboardData()
            } else {
                toast.error(data.error || "Failed to execute service")
            }
        } catch (err: any) {
            toast.error(err.message || "Network error while processing service")
        } finally {
            setIsExecuting(false)
        }
    }

    const sector = profile?.cooperative?.sector || 'commerce'
    
    // Categorize contracts
    const activeContracts = contracts.filter(c => c.status === 'active' || c.status === 'defaulted')
    const ajoContracts = activeContracts.filter(c => c.contract_type === 'ajo_enrollment')
    const hpContracts = activeContracts.filter(c => c.contract_type === 'hire_purchase')

    // Take primary active Ajo and HP contracts for status widgets
    const primaryAjo = ajoContracts[0]
    const primaryHp = hpContracts[0]

    // Calculate dynamic values
    const totalAjoPaid = ajoContracts.reduce((sum, c) => sum + (c.total_paid || 0), 0) / 100
    const totalHpPaid = hpContracts.reduce((sum, c) => sum + (c.total_paid || 0), 0) / 100
    const totalHpRemaining = hpContracts.reduce((sum, c) => sum + Math.max(0, (c.total_obligation || 0) - (c.total_paid || 0)), 0) / 100
    
    const activeMemberships = memberships.filter(m => m.status === 'active')
    const primaryMembership = activeMemberships[0]
    const creditScore = primaryMembership?.credit_score || 65

    // Transaction list adaptation
    const displayTransactions = transactions.length > 0
        ? transactions.map(tx => {
            const isCredit = tx.type === 'credit' || tx.type === 'interest' || tx.type === 'disbursement'
            return {
                label: tx.narration || (isCredit ? 'Inward Transfer' : 'Outward Transfer'),
                sub: tx.reference || `REF-${String(tx.id).slice(-6).toUpperCase()}`,
                amount: ((tx.amount || 0) / 100).toLocaleString(),
                positive: isCredit,
                icon: tx.type === 'repayment' || tx.type === 'disbursement' ? Truck : tx.type === 'fee' ? CircleDollarSign : PiggyBank,
                color: isCredit ? "bg-emerald-500/10 text-emerald-650 dark:text-emerald-450" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }
        })
        : [
            { label: "Ajo Auto-Deduction", sub: "Weekly cycle · Active", amount: "20,000", positive: false, icon: PiggyBank, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
            { label: "HP Repayment", sub: "Asset Lease deduction", amount: "18,000", positive: false, icon: Truck, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
            { label: "Union Fare Payout", sub: "Earnings distribution", amount: "12,400", positive: true, icon: ArrowDownLeft, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
        ]

    let principalAmount = Number(formData.amount) || Number(formData.principal) || 0
    let calculatedFee = 0
    if (activeService) {
        if (activeService.fee_type === "flat") calculatedFee = Number(activeService.fee_value) || 0
        else if (activeService.fee_type === "percentage") calculatedFee = (principalAmount * (Number(activeService.fee_value) || 0)) / 100
    }
    const totalDebit = principalAmount + calculatedFee

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Loading Member Workspace...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-emerald-500/30">
            {/* Ambient background */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute top-0 right-[20%] w-[400px] h-[400px] bg-emerald-500/4 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-[10%] w-[350px] h-[350px] bg-amber-500/3 dark:bg-amber-500/4 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6">

                {/* ── TOP GREETING ──────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Welcome back</p>
                        <h1 className="text-2xl font-black">
                          {profile?.customer ? `${profile.customer.firstName} ${profile.customer.lastName}` : "Cooperative Member"} 👋
                        </h1>
                        <p className="text-xs text-muted-foreground font-semibold">
                            {profile?.cooperative ? profile.cooperative.name : "Unassigned Member Group"} &bull; <span className="capitalize">{sector}</span> Sector &bull; <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/copteller/services">
                            <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold gap-2">
                                <Zap className="h-3.5 w-3.5 text-emerald-500" /> All Services ({services.length})
                            </Button>
                        </Link>
                        <Button onClick={() => router.push('/copteller/wallet')} className="h-9 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black text-xs border-0 gap-2 shadow-lg shadow-emerald-950/20">
                            <Plus className="h-3.5 w-3.5" /> Deposit
                        </Button>
                    </div>
                </div>

                {/* ── QUICK STAT CARDS ───────────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Escrow Balance", val: `₦${balance.toLocaleString()}`, icon: Wallet, color: "emerald", sub: `Acc: ${accountNumber}`, delta: true, path: "/copteller/wallet" },
                        { label: "Ajo Thrift Contributed", val: `₦${totalAjoPaid.toLocaleString()}`, icon: PiggyBank, color: "amber", sub: `${ajoContracts.length} Active Cycles`, delta: false, path: "/copteller/esusu" },
                        { label: "Hire Purchase Paid", val: `₦${totalHpPaid.toLocaleString()}`, icon: Truck, color: "emerald", sub: `₦${totalHpRemaining.toLocaleString()} remaining`, delta: false, path: "/copteller/hp" },
                        { label: "Credit Score", val: `${creditScore}/100`, icon: BarChart3, color: "amber", sub: "Calculated based on repayments", delta: true, path: "/copteller/credit" },
                    ].map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            onClick={() => router.push(s.path)}
                            className={`bg-card border border-border rounded-2xl p-5 space-y-3 hover:shadow-lg transition-all duration-300 group cursor-pointer`}
                        >
                            <div className="flex items-start justify-between">
                                <div className={`p-2 rounded-xl ${s.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                    <s.icon className="h-4 w-4" />
                                </div>
                                {s.delta && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                                <p className="text-xl font-black mt-0.5">{s.val}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{s.sub}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ── MEMBER WEEKLY VELOCITY & SAVINGS TRAJECTORY VISUAL ANALYTICS ── */}
                <MemberCashflowChart
                    title="Weekly Earnings, Ajo Thrift & Amortization Velocity"
                    subtitle="Track your weekly income velocity, rotational Ajo savings accumulation, and asset lease payback"
                    weeklyAjo={primaryAjo ? Math.round((primaryAjo.cycle_amount || 1000000) / 100) : 10000}
                    weeklyHp={primaryHp ? Math.round((primaryHp.repayment_amount || 1250000) / 100) : 12500}
                    weeklyHealth={300}
                />

                {/* ── QUICK SERVICES CAROUSEL / GRID STRIP ──────────────────────── */}
                <div className="bg-card border border-border rounded-3xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                                <Zap className="h-3.5 w-3.5" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-wider">Quick Platform Services &amp; Payments</h3>
                        </div>
                        <Link href="/copteller/services" className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                            Explore Catalog <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
                        {services.slice(0, 6).map((service: any) => {
                            const Icon = SERVICE_ICONS[service.category?.slug || ""] || Zap
                            return (
                                <button
                                    key={service.id}
                                    onClick={() => handleOpenService(service)}
                                    className="p-3.5 rounded-2xl bg-muted/40 hover:bg-muted/80 border border-border/80 hover:border-emerald-500/40 transition-all text-left flex flex-col justify-between group active:scale-95"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-background border border-border text-emerald-500 flex items-center justify-center mb-2.5 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold truncate">{service.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                            {service.fee_type === "none" ? "Free" : `Fee: ₦${service.fee_value}`}
                                        </p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* ── ACTIVE INSTITUTIONAL COVERAGE & STATE WELFARE STRIP ──────── */}
                <div className="bg-gradient-to-r from-blue-950/20 via-background to-emerald-950/20 border border-blue-500/20 rounded-3xl p-5 space-y-3.5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Landmark className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1">
                                        <Sparkles className="h-2.5 w-2.5" /> State Parastatal Welfare
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                        Escrow Account #3000881920
                                    </span>
                                </div>
                                <h3 className="text-xs font-black text-foreground mt-0.5">
                                    Your Active Institutional Protections &amp; Subsidies
                                </h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/copteller/cards">
                                <Button variant="outline" size="sm" className="h-8 rounded-xl text-[10px] font-black gap-1 border-border bg-card">
                                    <CreditCard className="h-3 w-3" /> Digital Health Card
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                        <div className="p-3.5 rounded-2xl bg-card border border-rose-500/20 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                    <HeartPulse className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-foreground truncate">ABSHIA Health Coverage</p>
                                    <p className="text-[10px] text-muted-foreground font-semibold truncate">Active at ABSUTH &amp; FMC Umuahia</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                                ₦300/wk Ajo
                            </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-card border border-blue-500/20 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <Truck className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-foreground truncate">ATMA Transit Roadworthiness</p>
                                    <p className="text-[10px] text-muted-foreground font-semibold truncate">Speed telemetry inspection pass</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 shrink-0">
                                Certified
                            </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-card border border-emerald-500/20 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-foreground truncate">Partner MFB Deposit Guarantee</p>
                                    <p className="text-[10px] text-muted-foreground font-semibold truncate">CBN licensed microfinance</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                                100% Insured
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── NO MEMBERSHIP BANNER ────────────────────────────────────────── */}
                {activeMemberships.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4"
                    >
                        <div className="space-y-1 text-center md:text-left">
                            <h3 className="text-sm font-black flex items-center justify-center md:justify-start gap-2">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                Welcome to Copteller!
                            </h3>
                            <p className="text-xs text-muted-foreground font-medium max-w-xl">
                                You are not currently enrolled in any active cooperative society. Join a cooperative to start participating in rotational thrift Ajo pools, hire purchase agreements, and credit programs.
                            </p>
                        </div>
                        <Button onClick={() => router.push('/copteller/onboarding/member')} className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs px-6 py-2.5 rounded-xl border-0">
                            Apply for Membership <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                    </motion.div>
                )}

                {/* ── MAIN WORKSPACE GRID ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Escrow Wallet widget — Left card */}
                    <div className="lg:col-span-1 bg-gradient-to-br from-emerald-900 to-slate-950 rounded-3xl p-6 space-y-5 relative overflow-hidden border border-emerald-900/40">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <p className="text-[9px] font-black text-emerald-300/60 uppercase tracking-widest">Escrow Wallet</p>
                                <button onClick={() => setWalletVisible(v => !v)} className="mt-2 flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors">
                                    {walletVisible
                                        ? <p className="text-3xl font-black text-white">₦{balance.toLocaleString()}</p>
                                        : <p className="text-3xl font-black text-white">₦ ·····</p>
                                    }
                                    <Lock className="h-3.5 w-3.5 opacity-40 hover:opacity-70 transition-opacity" />
                                </button>
                            </div>
                            <div className="bg-emerald-500/15 border border-emerald-500/20 px-2 py-1 rounded-full">
                                <span className="text-[9px] font-black text-emerald-400">● LIVE</span>
                            </div>
                        </div>

                        <Sparkline data={transactions.length > 0 ? transactions.slice(0, 7).map(t => t.amount).reverse() : [32, 45, 41, 60, 55, 72, 84]} color="#10b981" />

                        <div className="grid grid-cols-2 gap-2 relative z-10">
                            <button
                                onClick={() => router.push('/copteller/wallet')}
                                className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs py-2.5 rounded-xl active:scale-95 transition-all border-0"
                            >
                                <ArrowDownLeft className="h-3.5 w-3.5" /> Deposit
                            </button>
                            <button
                                onClick={() => router.push('/copteller/wallet')}
                                className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-black text-xs py-2.5 rounded-xl active:scale-95 transition-all border border-slate-700"
                            >
                                <ArrowUpRight className="h-3.5 w-3.5" /> Transfer
                            </button>
                        </div>

                        <div className="border-t border-emerald-900/50 pt-4 space-y-2 relative z-10">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Recent Transactions</p>
                            {displayTransactions.slice(0, 3).map((t, i) => (
                                <div key={i} className="flex justify-between text-[10px] font-bold text-slate-400">
                                    <span className="truncate max-w-[120px]">{t.label}</span>
                                    <span className={t.positive ? 'text-emerald-400' : 'text-slate-500'}>{t.positive ? '+' : '-'}₦{t.amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Middle / Right: Ajo + HP */}
                    <div className="lg:col-span-2 space-y-4">
                        
                        {/* AJO ROTATIONAL THRIFT WIDGET */}
                        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                                        <PiggyBank className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black">Ajo Rotation Status</p>
                                        <p className="text-[10px] text-muted-foreground font-semibold">
                                            {primaryAjo ? primaryAjo.scheme?.name || "Active Ajo Cycle" : "No active Ajo subscription"}
                                        </p>
                                    </div>
                                </div>
                                {primaryAjo && (
                                    <span className="text-[9px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full">
                                        Slot {primaryAjo.ajo_slot_number || 'N/A'}
                                    </span>
                                )}
                            </div>

                            {primaryAjo ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                        <span>Contribution Progress</span>
                                        <span className="text-amber-600 dark:text-amber-400 font-black">
                                            {Math.round(((primaryAjo.total_paid || 0) / (primaryAjo.total_obligation || 1)) * 100)}%
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden border border-border">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                                            style={{ width: `${Math.min(100, Math.round(((primaryAjo.total_paid || 0) / (primaryAjo.total_obligation || 1)) * 100))}%` }}
                                            layout
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                                        <span>₦{((primaryAjo.total_paid || 0) / 100).toLocaleString()} of ₦{((primaryAjo.total_obligation || 0) / 100).toLocaleString()} contributed</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 uppercase font-black tracking-wider">
                                            Streak: {primaryAjo.payment_streak || 0} 🔥
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-border">
                                    <p className="text-[10px] text-muted-foreground font-semibold">
                                        Join rotational thrift savings plans managed by your cooperative guilds.
                                    </p>
                                    <Button onClick={() => router.push('/copteller/esusu')} variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-black">
                                        Explore Ajo Schemes <ChevronRight className="h-3 w-3 ml-0.5" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* HIRE PURCHASE / ASSET LEASE WIDGET */}
                        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                        <Truck className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black">Hire Purchase / Asset Lease</p>
                                        <p className="text-[10px] text-muted-foreground font-semibold">
                                            {primaryHp ? `${primaryHp.asset_name} · ID: ${primaryHp.asset_identifier || 'N/A'}` : "No active lease contracts"}
                                        </p>
                                    </div>
                                </div>
                                {primaryHp && (
                                    <span className={`text-[9px] font-black border px-2 py-1 rounded-full uppercase tracking-wider ${
                                        primaryHp.status === 'defaulted'
                                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20'
                                    }`}>
                                        {primaryHp.status}
                                    </span>
                                )}
                            </div>

                            {primaryHp ? (
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: "Paid", val: `₦${((primaryHp.total_paid || 0) / 100).toLocaleString()}`, color: "emerald" },
                                        { label: "Remaining", val: `₦${Math.max(0, (primaryHp.total_obligation || 0) - (primaryHp.total_paid || 0) / 100).toLocaleString()}`, color: "amber" },
                                        { label: "Due amount", val: `₦${((primaryHp.due_amount || 0) / 100).toLocaleString()}`, color: "emerald" },
                                    ].map((s, i) => (
                                        <div key={i} className="text-center bg-muted/40 rounded-xl p-3">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                                            <p className={`text-xs font-black mt-1 ${s.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{s.val}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-border">
                                    <p className="text-[10px] text-muted-foreground font-semibold">
                                        Acquire productive assets like vehicles, machines, and tools with low-interest lease agreements.
                                    </p>
                                    <Button onClick={() => router.push('/copteller/hp')} variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-black">
                                        Explore Asset Leases <ChevronRight className="h-3 w-3 ml-0.5" />
                                    </Button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* ── QUICK EXECUTION MODAL (PORTAL) ──────────────────────────────── */}
            <ClientPortal>
                <AnimatePresence>
                    {activeService && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="w-full max-w-lg bg-background border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col"
                            >
                                <div className="flex items-center justify-between border-b border-border pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black">{activeService.name}</h3>
                                            <span className="text-[11px] text-muted-foreground">{activeService.category?.name || "Service Action"}</span>
                                        </div>
                                    </div>
                                    <Button onClick={() => setActiveService(null)} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-5">
                                    {!receipt ? (
                                        <DynamicServiceForm
                                            service={activeService}
                                            formData={formData}
                                            onChange={(name, val) => setFormData(prev => ({ ...prev, [name]: val }))}
                                            onSubmit={handleExecuteService}
                                            isSubmitting={isExecuting}
                                        />
                                    ) : (
                                        <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-4 font-mono text-xs">
                                            <div className="text-center pb-3 border-b border-border space-y-1">
                                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                                                    <Check className="w-6 h-6" />
                                                </div>
                                                <h4 className="text-sm font-black font-sans">Payment Successful</h4>
                                                <p className="text-[11px] text-muted-foreground">{receipt.notes}</p>
                                            </div>

                                            <div className="space-y-2 text-muted-foreground">
                                                <div className="flex justify-between">
                                                    <span>Reference:</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{receipt.reference}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Service:</span>
                                                    <span className="font-bold text-foreground">{receipt.serviceName}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Total Settled:</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">₦{receipt.totalAmount?.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                onClick={() => { setActiveService(null); setReceipt(null) }}
                                                className="w-full bg-muted hover:bg-muted/80 text-foreground text-xs font-bold h-10 rounded-xl mt-4"
                                            >
                                                Done / Close Receipt
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </ClientPortal>
        </div>
    )
}

export default function MemberDashboard() {
    return (
        <React.Suspense fallback={<div className="p-8 text-center text-xs font-black text-muted-foreground animate-pulse">Loading member workspace portal...</div>}>
            <MemberDashboardContent />
        </React.Suspense>
    )
}
