"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    BarChart3, TrendingUp, TrendingDown, CheckCircle2, XCircle,
    Clock, AlertTriangle, Shield, ArrowRight, RefreshCw,
    ChevronDown, Wallet, Truck, PiggyBank, Star, Award,
    Check, Zap, Info, Calculator, Percent, Sparkles, HelpCircle,
    FileText, UserCheck, ShieldCheck, ArrowUpRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

const SCORE_COLOR = (s: number) =>
    s >= 750 ? "text-emerald-500 dark:text-emerald-400"
    : s >= 650 ? "text-amber-500 dark:text-amber-400"
    : "text-rose-500 dark:text-rose-400"

const SCORE_LABEL = (s: number) =>
    s >= 750 ? "Excellent" : s >= 650 ? "Good" : s >= 550 ? "Fair" : "Poor"

interface CreditFactor {
    label: string
    score: number
    maxScore: number
    icon?: React.ElementType
    detail: string
    trend: 'up' | 'down' | 'stable'
}

interface CreditHistory {
    month: string
    score: number
    change?: string
    event?: string
}

interface LoanEligibility {
    id?: string
    product: string
    category?: string
    limit: number
    rate: string
    term: string
    eligible: boolean
    reason?: string
    description?: string
    requirements?: string[]
    actionUrl?: string
}

function resolveFactorIcon(label: string): React.ElementType {
    const l = label.toLowerCase()
    if (l.includes('ajo') || l.includes('esusu')) return PiggyBank
    if (l.includes('hp') || l.includes('asset') || l.includes('lease')) return Truck
    if (l.includes('wallet') || l.includes('velocity')) return Wallet
    if (l.includes('participation') || l.includes('guild')) return Shield
    if (l.includes('loan') || l.includes('default')) return Award
    return Star
}

const DEFAULT_FACTORS: CreditFactor[] = [
    { label: "Ajo Contribution Consistency", score: 88, maxScore: 100, trend: 'up', icon: PiggyBank, detail: "18 continuous weekly cycles verified on schedule. Zero missed contributions across active rotational tranches." },
    { label: "HP Repayment Compliance", score: 94, maxScore: 100, trend: 'up', icon: Truck, detail: "Hire-Purchase asset lease commitments maintained without repossession orders or delinquency warnings." },
    { label: "Cooperative Participation Index", score: 76, maxScore: 100, trend: 'stable', icon: Shield, detail: "Active standing in guild with continuous dues clearance and verified meeting attendance." },
    { label: "Wallet Activity & Velocity", score: 82, maxScore: 100, trend: 'up', icon: Wallet, detail: "High velocity float and utility settlements maintained across multiple active pockets." },
    { label: "Loan History & Default Index", score: 98, maxScore: 100, trend: 'stable', icon: Award, detail: "Zero micro-credit or dues defaults on your cooperative guild record. 100% on-time clearance rate." },
    { label: "Membership Duration & Standing", score: 72, maxScore: 100, trend: 'stable', icon: Star, detail: "Continuous verified tenure in Abia State Cooperatives Union registry." }
]

const DEFAULT_HISTORY: CreditHistory[] = [
    { month: "Sep 25", score: 682, change: "+6", event: "Joined Union & Completed KYC Tier 1" },
    { month: "Oct 25", score: 688, change: "+6", event: "First 4 Ajo Contributions Cleared" },
    { month: "Nov 25", score: 695, change: "+7", event: "Emergency Micro-Loan Repaid Early" },
    { month: "Dec 25", score: 700, change: "+5", event: "Year-End Cooperative Thrift Clearance" },
    { month: "Jan 26", score: 705, change: "+5", event: "Primary Account Daily Stash Active" },
    { month: "Feb 26", score: 710, change: "+5", event: "HP Tricycle Lease Approved & Disbursed" },
    { month: "Mar 26", score: 714, change: "+4", event: "30-Day Lease Payback Streak Verified" },
    { month: "Apr 26", score: 717, change: "+3", event: "Cooperative Insurance Levy Settled" },
    { month: "May 26", score: 720, change: "+3", event: "KYC Tier 2 NIBSS Verification Upgraded" },
    { month: "Jun 26", score: 722, change: "+2", event: "Social Circles Savings Target Met" },
    { month: "Jul 26", score: 723, change: "+1", event: "Biometric Audit Verification Complete" },
    { month: "Aug 26", score: 724, change: "+1", event: "Current Telemetry Rating (Tier 1 Verified)" }
]

const DEFAULT_ELIGIBILITY: LoanEligibility[] = [
    {
        id: "micro-emergency",
        product: "Emergency Micro-Credit",
        category: "Cash Float",
        limit: 50000,
        rate: "2.5% flat",
        term: "30 days",
        eligible: true,
        description: "Immediate cash advance credited directly to your primary cooperative wallet for emergency supplies or repairs.",
        requirements: ["Active Membership > 30 days", "Minimum 550 Credit Score", "Zero Unsettled Micro-Debits"],
        actionUrl: "/copteller/schemes"
    },
    {
        id: "coop-working-cap",
        product: "Cooperative Working Capital",
        category: "SME Trade",
        limit: 350000,
        rate: "2.0% pm",
        term: "6 months",
        eligible: true,
        description: "Inventory purchase and working float financing for registered artisans, market traders, and fleet operators.",
        requirements: ["Continuous Ajo Streak > 90 days", "Minimum 620 Credit Score", "1 Guild Member Guarantor"],
        actionUrl: "/copteller/schemes"
    },
    {
        id: "hp-asset-financing",
        product: "HP Vehicle & Asset Financing",
        category: "Asset Lease",
        limit: 1400000,
        rate: "1.8% pm",
        term: "18 months",
        eligible: true,
        description: "Acquire brand new TVS King Keke or commercial motorcycle with 20% equity and structured weekly repayments.",
        requirements: ["Verified Driver License / Union Badge", "Minimum 680 Credit Score", "2 Union Executive Endorsements"],
        actionUrl: "/copteller/schemes"
    },
    {
        id: "govt-grant-voucher",
        product: "Abia State Agricultural & Trade Grant",
        category: "Government Grant",
        limit: 500000,
        rate: "0% interest",
        term: "Non-repayable",
        eligible: false,
        reason: "Requires minimum 750 Tier 1 credit score threshold for state economic recovery vouchers.",
        description: "State-backed financial empowerment grant for certified farmers, food processors, and leather fabricators.",
        requirements: ["Verified Business Premises in Abia State", "Minimum 750 Credit Score", "Tax Clearance Certificate"],
        actionUrl: "/copteller/schemes"
    },
    {
        id: "priority-liquidity",
        product: "Priority Cooperative Treasury Pool",
        category: "Institutional",
        limit: 2500000,
        rate: "1.5% pm",
        term: "24 months",
        eligible: false,
        reason: "Exclusive to Tier 1 Guild Executives and Senior Fleet Operators with 800+ credit score.",
        description: "Large-scale expansion credit line underwritten by Partner MFB partner liquidity vault.",
        requirements: ["Tenure > 12 Months", "Minimum 800 Credit Score", "Asset Collateralization Registry"],
        actionUrl: "/copteller/schemes"
    }
]

export default function MemberCreditPage() {
    const [overallScore, setOverallScore] = React.useState(724)
    const [dbScore, setDbScore] = React.useState(85)
    const [loading, setLoading] = React.useState(false)
    const [reviewRequested, setReviewRequested] = React.useState(false)
    const [requesting, setRequesting] = React.useState(false)
    const [selectedFactor, setSelectedFactor] = React.useState<CreditFactor | null>(null)
    const [activeTab, setActiveTab] = React.useState<'overview' | 'history' | 'eligibility'>('overview')
    const [factors, setFactors] = React.useState<CreditFactor[]>(DEFAULT_FACTORS)
    const [scoreHistory, setScoreHistory] = React.useState<CreditHistory[]>(DEFAULT_HISTORY)
    const [eligibilityProducts, setEligibilityProducts] = React.useState<LoanEligibility[]>(DEFAULT_ELIGIBILITY)
    const [selectedMonthIdx, setSelectedMonthIdx] = React.useState<number | null>(null)

    // Interactive Loan Calculator state
    const [calcAmount, setCalcAmount] = React.useState(350000)
    const [calcTenure, setCalcTenure] = React.useState(6)

    const loadCreditProfile = React.useCallback(async () => {
        try {
            const res = await fetch('/api/copteller/credit')
            if (!res.ok) return
            const data = await res.json()
            if (data.success) {
                if (data.overallScore) setOverallScore(data.overallScore)
                if (data.dbScore) setDbScore(data.dbScore)
                if (data.hasPendingReview !== undefined) setReviewRequested(data.hasPendingReview)

                if (Array.isArray(data.factors) && data.factors.length > 0) {
                    setFactors(data.factors.map((f: any) => ({
                        ...f,
                        icon: resolveFactorIcon(f.label)
                    })))
                }
                if (Array.isArray(data.scoreHistory) && data.scoreHistory.length > 0) {
                    setScoreHistory(data.scoreHistory)
                }
                if (Array.isArray(data.eligibility) && data.eligibility.length > 0) {
                    setEligibilityProducts(data.eligibility)
                }
            }
        } catch (err) {
            console.warn('Failed to load credit profile:', err)
        }
    }, [])

    React.useEffect(() => {
        loadCreditProfile()
    }, [loadCreditProfile])

    const handleRequestReview = async () => {
        setRequesting(true)
        const tId = toast.loading("Logging credit review request to risk committee…")
        try {
            const res = await fetch('/api/copteller/credit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: 'Routine credit rating and limits reassessment request.' })
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to submit credit review request')
            }
            setReviewRequested(true)
            toast.success(data.message || "Credit rating audit requested! Forwarded to committee.", { id: tId })
            loadCreditProfile()
        } catch (err: any) {
            toast.error(err.message || 'Error submitting review request', { id: tId })
        } finally {
            setRequesting(false)
        }
    }

    const scorePct = Math.round((overallScore / 850) * 100)
    const circumference = 2 * Math.PI * 72
    const dashOffset = circumference * (1 - scorePct / 100)

    const maxHistory = scoreHistory.length > 0 ? Math.max(...scoreHistory.map(h => h.score)) : 800
    const minHistory = scoreHistory.length > 0 ? Math.min(...scoreHistory.map(h => h.score)) : 600

    // Loan calculator math
    const interestRatePerMonth = 0.02
    const monthlyInterest = calcAmount * interestRatePerMonth
    const monthlyPrincipal = calcAmount / calcTenure
    const monthlyRepayment = Math.round(monthlyPrincipal + monthlyInterest)
    const totalInterest = Math.round(monthlyInterest * calcTenure)
    const insuranceFee = Math.round(calcAmount * 0.01)

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8 font-sans pb-16">
            {/* Top Navigation & Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5 sm:pb-6">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Credit Intelligence
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-500" /> NIBSS Telemetry Verified
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-foreground">Credit Score & Trust Ratings</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold max-w-2xl leading-relaxed">
                        Your real-time cooperative credit scoring profile — calculated dynamically from your weekly Ajo rotational compliance, Hire-Purchase lease records, and verified float velocity.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                        onClick={handleRequestReview}
                        disabled={reviewRequested || requesting}
                        className="w-full sm:w-auto h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs shadow-md border-0 gap-2 transition-transform active:scale-95"
                    >
                        <RefreshCw className={`h-4 w-4 ${requesting ? 'animate-spin' : ''}`} />
                        {reviewRequested ? 'Audit Pending (48h)' : 'Request Credit Review'}
                    </Button>
                </div>
            </div>

            {/* Top KPI Highlights Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Award className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground truncate">Credit Rating</p>
                        <p className="text-xl font-black text-foreground mt-0.5">{overallScore} <span className="text-xs font-bold text-emerald-500">/ 850</span></p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate">Top 6% in Cooperative</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Wallet className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground truncate">Pre-Approved Line</p>
                        <p className="text-xl font-black text-foreground mt-0.5">₦1,400,000</p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate">Instant HP Financing</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <PiggyBank className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground truncate">Ajo Cycle Streak</p>
                        <p className="text-xl font-black text-foreground mt-0.5">18 Cycles</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold truncate">100% On-Time Clearance</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Shield className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground truncate">Trust Standing</p>
                        <p className="text-xl font-black text-foreground mt-0.5">Tier 1 Prime</p>
                        <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold truncate">Clean Risk Audit Record</p>
                    </div>
                </div>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-2xl max-w-full overflow-x-auto no-scrollbar border border-slate-200 dark:border-slate-800">
                {[
                    { id: 'overview', label: 'Score & Factor Breakdown' },
                    { id: 'history', label: 'Trajectory & Audit Signals' },
                    { id: 'eligibility', label: 'Pre-Approved Loans & Calculator' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                            activeTab === tab.id
                                ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            <AnimatePresence mode="wait">
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-8"
                    >
                        {/* Upper Section: Score Gauge + Factors List */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Score Ring Gauge Card */}
                            <div className="lg:col-span-5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-sm space-y-6">
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                                        Live Algorithmic Assessment
                                    </span>
                                </div>

                                <div className="relative w-52 h-52 mx-auto flex items-center justify-center">
                                    <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                                        <circle
                                            cx="80" cy="80" r="72"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            className="text-slate-100 dark:text-slate-800"
                                        />
                                        <circle
                                            cx="80" cy="80" r="72"
                                            fill="none"
                                            stroke="url(#creditScoreGrad)"
                                            strokeWidth="12"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={dashOffset}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                        <defs>
                                            <linearGradient id="creditScoreGrad" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#10b981" />
                                                <stop offset="60%" stopColor="#059669" />
                                                <stop offset="100%" stopColor="#f59e0b" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className={`text-5xl font-black tracking-tight ${SCORE_COLOR(overallScore)}`}>
                                            {overallScore}
                                        </span>
                                        <span className="text-[11px] font-black uppercase text-muted-foreground tracking-widest mt-0.5">
                                            out of 850
                                        </span>
                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                            {SCORE_LABEL(overallScore)}
                                        </span>
                                    </div>
                                </div>

                                {/* Cooperative Standing Details */}
                                <div className="space-y-3 pt-2">
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase">Standing</p>
                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">Tier 1 Prime</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase">KYC Tier</p>
                                            <p className="text-xs font-black text-foreground mt-0.5">Level 2 (NIBSS)</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase">Audit Status</p>
                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{reviewRequested ? 'Under Review' : 'Verified'}</p>
                                        </div>
                                    </div>

                                    {/* Verification badges checklist */}
                                    <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                                                <UserCheck className="h-3.5 w-3.5 text-emerald-500" /> Identity Verification
                                            </span>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400">BVN + NIN Verified</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Cooperative Union
                                            </span>
                                            <span className="font-black text-foreground">Abia Tricycle Union</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Overdue Delinquencies
                                            </span>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400">₦0.00 (Zero Defaulter)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Credit Factors List */}
                            <div className="lg:col-span-7 space-y-3">
                                <div className="flex items-center justify-between pb-1">
                                    <h3 className="text-sm font-black text-foreground">Telemetry Scoring Factors</h3>
                                    <span className="text-[10px] text-muted-foreground font-bold">Click any factor for audit insights</span>
                                </div>

                                {factors.map((f, i) => {
                                    const IconComp = f.icon || Star
                                    const isSelected = selectedFactor?.label === f.label
                                    return (
                                        <motion.div
                                            key={i}
                                            onClick={() => setSelectedFactor(isSelected ? null : f)}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`bg-white dark:bg-slate-900/60 border rounded-2xl p-4 cursor-pointer transition-all shadow-sm ${
                                                isSelected
                                                    ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                                                    <IconComp className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className="text-xs font-black text-foreground">{f.label}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            {f.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                                                            {f.trend === 'down' && <TrendingDown className="h-3 w-3 text-rose-500" />}
                                                            <span className={`text-xs font-black ${
                                                                f.score >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                                                                : f.score >= 60 ? 'text-amber-600 dark:text-amber-400'
                                                                : 'text-rose-600 dark:text-rose-400'
                                                            }`}>
                                                                {f.score} / {f.maxScore}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Progress bar */}
                                                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            style={{ width: `${Math.min(100, (f.score / f.maxScore) * 100)}%` }}
                                                            className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${
                                                                f.score >= 80 ? 'from-emerald-500 to-teal-500'
                                                                : f.score >= 60 ? 'from-amber-500 to-orange-500'
                                                                : 'from-rose-500 to-red-500'
                                                            }`}
                                                        />
                                                    </div>
                                                </div>
                                                <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                                            </div>

                                            <AnimatePresence>
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-muted-foreground font-semibold pl-11 leading-relaxed"
                                                    >
                                                        {f.detail}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Middle Section: Score Optimization Playbook */}
                        <div className="bg-gradient-to-br from-emerald-500/5 via-transparent to-amber-500/5 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-emerald-500" />
                                <h3 className="text-base font-black text-foreground">Score Boost Simulator & Actionable Steps</h3>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium max-w-2xl">
                                Practical steps to boost your cooperative trust rating to 800+ Tier 1 Prime, unlocking zero-equity asset loans:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">+15 Points</span>
                                        <PiggyBank className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <h4 className="text-xs font-black text-foreground">Complete 8 More Ajo Cycles</h4>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Maintain your 100% on-time contribution record without missing a single rotational clear.
                                    </p>
                                </div>

                                <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">+12 Points</span>
                                        <Wallet className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <h4 className="text-xs font-black text-foreground">Hold ₦50,000 Float in Pocket</h4>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Maintain active savings float in your Household Pockets for 30 consecutive days.
                                    </p>
                                </div>

                                <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">+10 Points</span>
                                        <Truck className="h-4 w-4 text-amber-500" />
                                    </div>
                                    <h4 className="text-xs font-black text-foreground">Clear Lease 5 Days Early</h4>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Pay weekly vehicle HP lease installment 5 days ahead of schedule to demonstrate cash-flow strength.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section: Credit Rating Tiers & Privileges Table */}
                        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 md:p-8 space-y-4 shadow-sm">
                            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                                <Award className="h-4 w-4 text-emerald-500" /> Cooperative Credit Rating Brackets & Privileges
                            </h3>
                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full min-w-[550px] text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] uppercase font-black text-muted-foreground border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-xl">Bracket</th>
                                            <th className="px-4 py-3">Score Range</th>
                                            <th className="px-4 py-3">Borrowing Limit</th>
                                            <th className="px-4 py-3">Subsidized Rate</th>
                                            <th className="px-4 py-3 rounded-r-xl">Collateral Requirement</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        <tr className="bg-emerald-500/5 font-semibold">
                                            <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                                <Check className="h-3.5 w-3.5 text-emerald-500" /> Tier 1 Prime (Your Tier)
                                            </td>
                                            <td className="px-4 py-3 font-bold text-foreground">750 – 850</td>
                                            <td className="px-4 py-3 font-bold text-foreground">Up to ₦2,500,000</td>
                                            <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">1.5% – 1.8% pm</td>
                                            <td className="px-4 py-3 text-muted-foreground">0% Collateral (Union Guarantee only)</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 font-bold text-foreground">Tier 2 Standard</td>
                                            <td className="px-4 py-3 text-muted-foreground">650 – 749</td>
                                            <td className="px-4 py-3 text-foreground">Up to ₦750,000</td>
                                            <td className="px-4 py-3 text-foreground">2.0% – 2.5% pm</td>
                                            <td className="px-4 py-3 text-muted-foreground">1 Co-member Guarantor</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 font-bold text-foreground">Tier 3 Review</td>
                                            <td className="px-4 py-3 text-muted-foreground">550 – 649</td>
                                            <td className="px-4 py-3 text-foreground">Up to ₦150,000</td>
                                            <td className="px-4 py-3 text-foreground">3.0% pm</td>
                                            <td className="px-4 py-3 text-muted-foreground">2 Co-member Guarantors</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 font-bold text-slate-400">Tier 4 Credit Builder</td>
                                            <td className="px-4 py-3 text-slate-400">&lt; 550</td>
                                            <td className="px-4 py-3 text-slate-400">Emergency only (₦25k)</td>
                                            <td className="px-4 py-3 text-slate-400">Standard rate</td>
                                            <td className="px-4 py-3 text-slate-400">Secured savings cash lien</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 2. HISTORY TAB */}
                {activeTab === 'history' && (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6 sm:space-y-8"
                    >
                        {/* 12-Month Trajectory Chart */}
                        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                                <div>
                                    <h3 className="text-sm font-black text-foreground">Credit Score Trajectory (12 Months History)</h3>
                                    <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                                        Track your historical rating evolution across continuous Ajo rotational tranches and debt clearances.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                        +42 Points Gain in 12 Months
                                    </span>
                                </div>
                            </div>

                            {/* Interactive Active Month Inspection Telemetry Header */}
                            {(() => {
                                const activeItem = selectedMonthIdx !== null && scoreHistory[selectedMonthIdx] 
                                    ? scoreHistory[selectedMonthIdx] 
                                    : (scoreHistory[scoreHistory.length - 1] || null)
                                if (!activeItem) return null
                                return (
                                    <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center shrink-0">
                                                <span className="text-[8px] uppercase font-black text-muted-foreground leading-none">{activeItem.month.split(' ')[0]}</span>
                                                <span className="text-sm font-black leading-tight mt-0.5">{activeItem.score}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-black text-foreground">{activeItem.month} Rating Audit</span>
                                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                                        {activeItem.change ? `${activeItem.change} pts` : '+0 pts'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">· Trust Tier: {activeItem.score >= 750 ? 'Tier 1 Prime' : 'Tier 2 Standard'}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                                                    {activeItem.event || "Standard rotational thrift clearance and wallet compliance"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold shrink-0">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>Hover or tap any bar to inspect audit telemetry</span>
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Bar Chart with Non-Clipping Tooltips & Headspace */}
                            <div className="overflow-x-auto no-scrollbar pb-2">
                                <div className="flex items-end gap-2 sm:gap-4 h-64 px-2 pt-20 pb-2 min-w-[580px] relative">
                                    {scoreHistory.map((h, i) => {
                                        const heightPct = Math.max(15, Math.min(100, ((h.score - (minHistory - 20)) / ((maxHistory + 15) - (minHistory - 20))) * 100))
                                        const isLatest = i === scoreHistory.length - 1
                                        const isSelected = selectedMonthIdx === i || (selectedMonthIdx === null && isLatest)
                                        return (
                                            <div 
                                                key={i} 
                                                onMouseEnter={() => setSelectedMonthIdx(i)}
                                                onClick={() => setSelectedMonthIdx(i)}
                                                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative cursor-pointer"
                                            >
                                                {/* Tooltip positioned inside safe 80px headspace with downward pointer caret */}
                                                {h.event && (
                                                    <div className={`absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-950 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all duration-150 pointer-events-none whitespace-nowrap z-30 shadow-2xl border border-slate-700/80 flex items-center gap-1.5 ${
                                                        isSelected
                                                            ? 'opacity-100 scale-100'
                                                            : 'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'
                                                    }`}>
                                                        <span>{h.event}</span>
                                                        <span className="text-emerald-400 font-black">({h.change})</span>
                                                        {/* Downward pointer caret */}
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900 dark:border-t-slate-950" />
                                                    </div>
                                                )}

                                                {/* Value tag */}
                                                <span className={`text-[10px] font-black transition-all ${
                                                    isSelected
                                                        ? 'text-emerald-600 dark:text-emerald-400 scale-110 font-black'
                                                        : 'text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:text-foreground'
                                                }`}>
                                                    {h.score}
                                                </span>

                                                {/* Bar */}
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${heightPct}%` }}
                                                    transition={{ delay: i * 0.03, duration: 0.5 }}
                                                    className={`w-full rounded-t-xl transition-all ${
                                                        isSelected
                                                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 ring-2 ring-emerald-500/50 shadow-md shadow-emerald-500/30'
                                                            : 'bg-slate-200 dark:bg-slate-800 group-hover:bg-emerald-400/60 dark:group-hover:bg-emerald-600/60'
                                                    }`}
                                                />

                                                {/* Month label */}
                                                <span className={`text-[10px] font-black tracking-tight whitespace-nowrap transition-colors ${
                                                    isSelected ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                    {h.month}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Recent Credit Audit Signals Ledger */}
                        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                                <div>
                                    <h3 className="text-sm font-black text-foreground">Verified Credit Audit Events</h3>
                                    <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Immutable audit trail recorded on cooperative ledger.</p>
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold">Live Synced</span>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { date: "Current Cycle", event: "Weekly Ajo rotational cycle payout cleared without arrears", type: "positive", pts: "+8 pts", ref: "TX-AJO-88219" },
                                    { date: "2 days ago", event: "Biometric KYC Tier 2 validation and NIBSS registry match", type: "positive", pts: "+10 pts", ref: "KYC-NIBSS-902" },
                                    { date: "Last week", event: "TVS King HP Tricycle lease weekly repayment cleared 2 days early", type: "positive", pts: "+6 pts", ref: "HP-PAY-11029" },
                                    { date: "3 weeks ago", event: "Monthly cooperative dues and insurance premium debited on schedule", type: "positive", pts: "+5 pts", ref: "DUES-CLR-4491" },
                                    { date: "Last month", event: "Guarantor endorsement signed for fellow union artisan (Emeka Obi)", type: "positive", pts: "+4 pts", ref: "GUAR-END-092" },
                                ].map((ev, i) => (
                                    <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                                <TrendingUp className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-foreground">{ev.event}</p>
                                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{ev.date} · Ref: {ev.ref}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg shrink-0">
                                            {ev.pts}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Credit Bureau Cross-Check Certificate */}
                        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-foreground">Credit Bureau Verification Certificate</h4>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                        Audited with FirstCentral & CRC Credit Bureau API registry. Clean national credit footprint.
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800">
                                <FileText className="h-3.5 w-3.5 mr-1.5" /> Download Credit Report
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* 3. LOAN ELIGIBILITY TAB */}
                {activeTab === 'eligibility' && (
                    <motion.div
                        key="eligibility"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-8"
                    >
                        {/* Status Banner */}
                        <div className="p-5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-500/20 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-black shrink-0">
                                    ✓
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-foreground">
                                        Your score of {overallScore}/850 unlocks 3 Pre-Approved Credit Lines!
                                    </h4>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                        Zero upfront collateral required. Subsidized interest underwritten by Partner Microfinance Bank.
                                    </p>
                                </div>
                            </div>
                            <Link href="/copteller/schemes">
                                <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs h-9 rounded-xl border-0 shadow-md">
                                    View All Schemes <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                </Button>
                            </Link>
                        </div>

                        {/* Pre-Qualified Product Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {eligibilityProducts.map((prod, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className={`bg-white dark:bg-slate-900/60 border rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5 transition-all ${
                                        prod.eligible
                                            ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 hover:shadow-md'
                                            : 'border-slate-200 dark:border-slate-800/60 opacity-60 bg-slate-50/50 dark:bg-slate-950/40'
                                    }`}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                {prod.category || 'Credit Line'}
                                            </span>
                                            {prod.eligible ? (
                                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Pre-Approved
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <XCircle className="h-3 w-3" /> Criteria Unmet
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="text-base font-black text-foreground">{prod.product}</h4>
                                            <p className="text-[11px] text-muted-foreground font-medium mt-1 leading-relaxed">
                                                {prod.description}
                                            </p>
                                        </div>

                                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground font-semibold">Maximum Amount:</span>
                                                <span className="font-black text-foreground">{fmt(prod.limit)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground font-semibold">Interest Rate:</span>
                                                <span className="font-black text-emerald-600 dark:text-emerald-400">{prod.rate}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground font-semibold">Tenure:</span>
                                                <span className="font-black text-foreground">{prod.term}</span>
                                            </div>
                                        </div>

                                        {prod.requirements && (
                                            <div className="space-y-1.5 pt-1">
                                                <p className="text-[10px] font-black uppercase text-muted-foreground">Prerequisites Checklist:</p>
                                                {prod.requirements.map((req, rIdx) => (
                                                    <div key={rIdx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                                                        <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                                                        <span>{req}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {!prod.eligible && prod.reason && (
                                            <p className="text-[10px] text-rose-500 font-semibold bg-rose-500/5 p-2 rounded-xl border border-rose-500/20">
                                                {prod.reason}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        {prod.eligible ? (
                                            <Link href="/copteller/schemes" className="w-full">
                                                <Button className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs border-0 shadow-sm gap-1.5">
                                                    Apply for this Credit Line <ArrowRight className="h-3.5 w-3.5" />
                                                </Button>
                                            </Link>
                                        ) : (
                                            <Button disabled className="w-full h-10 rounded-xl text-xs font-bold opacity-60">
                                                Requires Higher Score
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Interactive Loan Repayment Calculator Widget */}
                        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm space-y-6">
                            <div className="flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-emerald-500" />
                                <div>
                                    <h3 className="text-base font-black text-foreground">Interactive Loan Repayment Calculator</h3>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                        Simulate monthly repayments and cooperative fee deductions before submitting an official scheme application.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 pt-2">
                                {/* Sliders */}
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-black text-foreground">Loan Principal Amount</label>
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{fmt(calcAmount)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={20000}
                                            max={1400000}
                                            step={10000}
                                            value={calcAmount}
                                            onChange={(e) => setCalcAmount(Number(e.target.value))}
                                            className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
                                        />
                                        <div className="flex justify-between text-[10px] text-muted-foreground font-bold mt-1">
                                            <span>₦20,000</span>
                                            <span>₦1,400,000 (Pre-Approved Limit)</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-black text-foreground">Repayment Tenure</label>
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{calcTenure} Months</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={1}
                                            max={18}
                                            step={1}
                                            value={calcTenure}
                                            onChange={(e) => setCalcTenure(Number(e.target.value))}
                                            className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
                                        />
                                        <div className="flex justify-between text-[10px] text-muted-foreground font-bold mt-1">
                                            <span>1 Month</span>
                                            <span>18 Months</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Calculation Breakdown Box */}
                                <div className="bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                                        <span className="text-xs font-black text-muted-foreground uppercase">Estimated Monthly Installment</span>
                                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{fmt(monthlyRepayment)}</span>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between text-muted-foreground font-medium">
                                            <span>Principal per Month:</span>
                                            <span className="text-foreground font-bold">{fmt(Math.round(monthlyPrincipal))}</span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground font-medium">
                                            <span>Total Interest ({calcTenure} mos @ 2.0% pm):</span>
                                            <span className="text-foreground font-bold">{fmt(totalInterest)}</span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground font-medium">
                                            <span>Cooperative Insurance Levy (1%):</span>
                                            <span className="text-foreground font-bold">{fmt(insuranceFee)}</span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground font-medium pt-2 border-t border-slate-200 dark:border-slate-800 font-black">
                                            <span>Total Payback Amount:</span>
                                            <span className="text-foreground font-black">{fmt(calcAmount + totalInterest)}</span>
                                        </div>
                                    </div>

                                    <Link href="/copteller/schemes" className="block pt-2">
                                        <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs h-10 rounded-xl border-0 shadow-md">
                                            Proceed to Apply with Calculated Terms <ArrowRight className="h-4 w-4 ml-1.5" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
