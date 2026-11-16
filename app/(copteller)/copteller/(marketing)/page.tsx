"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Wallet,
    Users,
    TrendingUp,
    ShieldCheck,
    ArrowRight,
    Car,
    Calculator,
    Award,
    Building2,
    CheckCircle2,
    Lock,
    BarChart3,
    PiggyBank,
    Truck,
    Layers,
    ArrowUpRight,
    Sparkles,
    RefreshCw,
    Clock,
    FileCheck2,
    Landmark,
    ChevronRight,
    Sprout,
    Hammer,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const HERO_PILLARS = [
    { icon: Landmark, title: "1:1 Escrow Custody", sub: "Held in licensed MFB vaults" },
    { icon: Layers, title: "Multi-Union Tenant", sub: "Isolated union ledgers" },
    { icon: FileCheck2, title: "Audit-Ready Trail", sub: "Double-entry settlement" },
    { icon: ShieldCheck, title: "Role-Scoped Access", sub: "Member, admin & MFB tiers" },
]

const CORE_ENGINES = [
    {
        code: "01",
        title: "Rotational Ajo Engine",
        accent: "emerald" as const,
        desc: "Configure deterministic payout queues, contribution cadences, and automated deductions without hand-written treasurer notebooks.",
        tags: ["Automated Schedules", "Verified Slots"],
    },
    {
        code: "02",
        title: "Hire-Purchase Registry",
        accent: "amber" as const,
        desc: "Bind vehicles, tricycles, or industrial tools to verified operators with transparent weekly amortization and ownership milestones.",
        tags: ["Asset Binding", "Amortization Ledger"],
    },
    {
        code: "03",
        title: "Behavioural Credit Index",
        accent: "emerald" as const,
        desc: "Every timely thrift contribution and installment clearing builds an auditable track record usable for working-capital underwriting.",
        tags: ["Repayment Streaks", "Credit Portability"],
    },
    {
        code: "04",
        title: "Multi-MFB Clearing Rails",
        accent: "amber" as const,
        desc: "Designed to plug into any partner Microfinance Bank and NIBSS settlement rail for clean, segregated escrow accounting.",
        tags: ["Bank-Agnostic", "NIBSS Settlement"],
    },
]

const STAKEHOLDERS = [
    {
        id: "members",
        label: "Members & Operators",
        badge: "Thrift, Assets & Credit",
        headline: "Save consistently, own productive assets, and unlock formal credit.",
        accent: "emerald" as const,
        ctaLabel: "Join as Member",
        ctaHref: "/copteller/onboarding/member",
        cards: [
            {
                icon: PiggyBank,
                title: "Automated Ajo Cycles",
                desc: "Join daily, weekly, or monthly savings rotations with transparent queue visibility and direct bank payout on your turn.",
            },
            {
                icon: Truck,
                title: "Hire-Purchase Ownership",
                desc: "Apply for tricycles, delivery vans, or trade machinery on structured weekly repayment schedules tracked down to ₦0.",
            },
            {
                icon: Award,
                title: "Verified Grant & Loan Access",
                desc: "Consistent repayment history unlocks eligibility for union-sponsored tool grants and partner MFB micro-credit.",
            },
        ],
    },
    {
        id: "admins",
        label: "Union Administrators",
        badge: "Operations & Reconciliation",
        headline: "Replace fragmented spreadsheets with one unified cooperative workspace.",
        accent: "amber" as const,
        ctaLabel: "Onboard Cooperative",
        ctaHref: "/copteller/onboarding/admin",
        cards: [
            {
                icon: Users,
                title: "Member Roster & KYC",
                desc: "Verify BVN/NIN records, issue digital member IDs, and manage union group hierarchies in a single registry.",
            },
            {
                icon: BarChart3,
                title: "Automated HP & Dues Tracking",
                desc: "Monitor weekly collections, catch overdue installments early, and inspect asset-to-operator assignments live.",
            },
            {
                icon: ShieldCheck,
                title: "Dual-Control Escrow Governance",
                desc: "Approve disbursements cleanly with role-based permissions, audit logs, and direct partner bank reconciliation.",
            },
        ],
    },
    {
        id: "partners",
        label: "Partner MFBs & Capital",
        badge: "Institutional Underwriting",
        headline: "Deploy asset-backed capital with real-time collection visibility.",
        accent: "emerald" as const,
        ctaLabel: "Partner Onboarding",
        ctaHref: "/copteller/onboarding/partner",
        cards: [
            {
                icon: Building2,
                title: "Escrow Vault Segregation",
                desc: "Ring-fence every cooperative pool and fleet program in dedicated partner MFB settlement accounts.",
            },
            {
                icon: Layers,
                title: "Custom Program Structuring",
                desc: "Define tenure, collateral buffers, clearing splits, and sector allocation across multiple cooperative unions.",
            },
            {
                icon: TrendingUp,
                title: "Automated Settlement Reporting",
                desc: "Track operator payback discipline, export reconciliation statements, and review risk exceptions at source.",
            },
        ],
    },
]

const SECTOR_BLUEPRINTS = [
    {
        icon: Truck,
        sector: "Transport & Fleet Guilds",
        title: "Structured Tricycle & Van HP",
        accent: "emerald" as const,
        summary: "Built for commercial rider associations managing vehicle financing, weekly remittances, and route-level compliance.",
        workflow: ["BVN + Guarantor Verification", "Vehicle Chassis Assignment", "Weekly Auto-Amortization"],
    },
    {
        icon: Sprout,
        sector: "Agro-Allied Societies",
        title: "Seasonal Input & Equipment Pools",
        accent: "amber" as const,
        summary: "Structured around harvest-linked thrift savings, shared processing equipment leasing, and institutional input grants.",
        workflow: ["Harvest-Aligned Cadence", "Group Storage Escrow", "Co-Op Output Settlement"],
    },
    {
        icon: Hammer,
        sector: "Artisan & Market Unions",
        title: "Rotational Working Capital",
        accent: "emerald" as const,
        summary: "Designed for traders, tailors, and workshops running disciplined Ajo rotations alongside micro-tool financing.",
        workflow: ["Daily / Weekly Esusu Queue", "Tool Grant Eligibility", "Direct Bank Payout"],
    },
]

const INTEGRATIONS = [
    {
        name: "Licensed Partner MFBs",
        role: "Core Ledger & Escrow",
        desc: "Segregated custodial accounts, deposit protection, and multi-bank treasury settlement.",
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        hoverClass: "hover:border-emerald-500/35",
    },
    {
        name: "Paystack & Flutterwave",
        role: "Collection Rails",
        desc: "Card, transfer, and virtual-account recurring deductions routed automatically into pools.",
        badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
        hoverClass: "hover:border-amber-500/35",
    },
    {
        name: "NIBSS / NIP & BVN",
        role: "Identity & Clearing",
        desc: "Account name enquiry, BVN verification, and instant inter-bank cooperative payouts.",
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        hoverClass: "hover:border-emerald-500/35",
    },
]

export default function CoptellerLandingPage() {
    const [activeTab, setActiveTab] = React.useState<"members" | "admins" | "partners">("members")

    // Interactive sample wallet preview
    const [sampleBalance, setSampleBalance] = React.useState<number>(85000)
    const [sampleSlot, setSampleSlot] = React.useState<number>(4)
    const [sampleTrips, setSampleTrips] = React.useState<number>(4)

    // Compact Planner State (Ajo & HP Amortization)
    const [plannerMode, setPlannerMode] = React.useState<"ajo" | "hp">("ajo")
    const [ajoContrib, setAjoContrib] = React.useState<number>(15000)
    const [ajoMembers, setAjoMembers] = React.useState<number>(12)
    const [hpUnits, setHpUnits] = React.useState<number>(5)
    const [hpAssetCost, setHpAssetCost] = React.useState<number>(1400000)
    const [hpWeeklyRate, setHpWeeklyRate] = React.useState<number>(20000)

    const ajoTotalPool = ajoContrib * ajoMembers
    const ajoCycleDays = ajoMembers * 7

    const hpTotalAssetValue = hpUnits * hpAssetCost
    const hpWeeklyPool = hpUnits * hpWeeklyRate
    const hpPaybackWeeks = Math.ceil(hpAssetCost / hpWeeklyRate)
    const hpPaybackMonths = (hpPaybackWeeks / 4.33).toFixed(1)

    const currentStakeholder = STAKEHOLDERS.find((s) => s.id === activeTab) || STAKEHOLDERS[0]

    return (
        <div className="bg-background text-foreground min-h-[100dvh] font-sans selection:bg-emerald-500/30 overflow-x-hidden relative">
            {/* Ambient background light */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute -top-24 left-[8%] w-[520px] h-[520px] bg-emerald-600/6 dark:bg-emerald-500/8 rounded-full blur-[160px]" />
                <div className="absolute top-[35%] right-[4%] w-[440px] h-[440px] bg-amber-600/5 dark:bg-amber-500/7 rounded-full blur-[150px]" />
            </div>

            {/* ── HERO ────────────────────────────────────────────────────────── */}
            <section className="relative max-w-7xl mx-auto pt-10 sm:pt-14 lg:pt-20 pb-14 sm:pb-20 px-4 sm:px-6 md:px-8 z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                    {/* Left Pitch */}
                    <div className="lg:col-span-7 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45 }}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 text-[11px] font-black uppercase tracking-wider"
                        >
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                            <span>Bank-Agnostic Cooperative Infrastructure</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.05 }}
                            className="text-4xl sm:text-5xl lg:text-[4.15rem] font-black tracking-tight leading-[1.03] text-foreground"
                        >
                            The Operating System for{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 dark:from-emerald-400 dark:via-emerald-300 dark:to-amber-400">
                                Cooperative Finance
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.55, delay: 0.12 }}
                            className="text-muted-foreground text-sm sm:text-base lg:text-lg font-medium max-w-xl leading-relaxed"
                        >
                            Digitize rotational thrift (Ajo/Esusu), manage fleet and tool Hire-Purchase contracts, and disburse verified grants through segregated partner Microfinance Bank escrow accounts.
                        </motion.p>

                        {/* Primary & Secondary CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.18 }}
                            className="flex flex-col sm:flex-row gap-3 pt-1"
                        >
                            <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black font-black h-12 sm:h-13 px-7 rounded-2xl shadow-lg shadow-emerald-600/15 text-sm border-0 group">
                                <Link href="/copteller/onboarding">
                                    Launch Onboarding
                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="border-slate-200 dark:border-slate-800 hover:bg-muted text-foreground font-bold h-12 sm:h-13 px-6 rounded-2xl text-sm">
                                <Link href="/copteller/features">
                                    Explore Architecture
                                </Link>
                            </Button>
                        </motion.div>

                        {/* Grounded Architecture Pillars (Replaces Fabricated Proof Metrics) */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.24 }}
                            className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/70"
                        >
                            {HERO_PILLARS.map((item, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-foreground font-black text-xs">
                                        <item.icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span>{item.title}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground font-medium leading-snug">{item.sub}</p>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Right: Interactive Sample Workspace Preview */}
                    <div className="lg:col-span-5 flex justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="w-full max-w-[390px] bg-slate-950 text-slate-100 rounded-[30px] border border-slate-800 shadow-2xl p-5 space-y-4 relative overflow-hidden"
                        >
                            <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

                            {/* Card Top Bar */}
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center text-black font-black text-xs">
                                        KO
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sample Member View</p>
                                        <h4 className="text-xs font-black text-white">Interactive Demo Ledger</h4>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSampleBalance(85000)
                                        setSampleSlot(4)
                                        setSampleTrips(4)
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-emerald-400 transition-colors"
                                    title="Reset sample preview"
                                >
                                    <RefreshCw className="h-3 w-3" /> Reset
                                </button>
                            </div>

                            {/* Sample Escrow Card */}
                            <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Escrow Wallet Preview</span>
                                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">MFB Custody</span>
                                </div>
                                <p className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                                    ₦{sampleBalance.toLocaleString()}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSampleBalance((b) => b + 5000)}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] py-2 rounded-xl transition-colors"
                                    >
                                        + Sample Deposit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSampleBalance((b) => Math.max(0, b - 5000))}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] py-2 rounded-xl transition-colors border border-slate-700"
                                    >
                                        Test Clearing
                                    </button>
                                </div>
                            </div>

                            {/* Rotational Thrift & Hire-Purchase Preview Rows */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-bold text-slate-400">Ajo Rotation</span>
                                        <button
                                            type="button"
                                            onClick={() => setSampleSlot((s) => (s >= 10 ? 1 : s + 1))}
                                            className="font-black text-emerald-400 hover:underline"
                                        >
                                            Next →
                                        </button>
                                    </div>
                                    <p className="text-base font-black text-white">Slot {sampleSlot} / 10</p>
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                            style={{ width: `${sampleSlot * 10}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-bold text-slate-400">HP Schedule</span>
                                        <button
                                            type="button"
                                            onClick={() => setSampleTrips((t) => (t >= 12 ? 1 : t + 1))}
                                            className="font-black text-amber-400 hover:underline"
                                        >
                                            Pay +1 →
                                        </button>
                                    </div>
                                    <p className="text-base font-black text-white">Wk {sampleTrips} / 12</p>
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                            style={{ width: `${Math.round((sampleTrips / 12) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-center text-slate-500 font-semibold">
                                Interactive UI preview with sample amounts — connect your union ledger on onboarding.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS STRIP ──────────────────────────────────────────── */}
            <section className="border-y border-border bg-slate-50/70 dark:bg-slate-950/50 py-14 sm:py-16 px-4 sm:px-6 md:px-8 relative z-10">
                <div className="max-w-7xl mx-auto space-y-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">How Copteller Works</p>
                            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Three Steps from Cash Ledger to Escrow</h2>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-md font-medium">
                            Built for trade associations, driver cooperatives, and partner Microfinance Banks operating across branches.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                step: "01",
                                title: "Verify & Enroll Guilds",
                                desc: "Register your cooperative society, bind a partner MFB settlement account, and onboard members with BVN/NIN KYC verification.",
                                icon: Users,
                            },
                            {
                                step: "02",
                                title: "Configure Thrift & Assets",
                                desc: "Launch rotational Ajo queues, match verified operators to Hire-Purchase vehicles or tools, and publish grant criteria.",
                                icon: Layers,
                            },
                            {
                                step: "03",
                                title: "Settle & Audit Continuously",
                                desc: "Deductions clear automatically into double-entry bank escrow with downloadable member forms and real-time oversight.",
                                icon: ShieldCheck,
                            },
                        ].map((item, i) => (
                            <div key={i} className="bg-background border border-border rounded-2xl p-6 space-y-3 hover:border-emerald-500/30 transition-colors">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                        Step {item.step}
                                    </span>
                                    <item.icon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-black">{item.title}</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── STAKEHOLDER WORKSPACES ──────────────────────────────────────── */}
            <section className="max-w-7xl mx-auto py-16 sm:py-20 px-4 sm:px-6 md:px-8 relative z-10 space-y-10">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Role-Specific Portals</p>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">One Ledger, Dedicated Workspaces</h2>
                    </div>

                    {/* Tab Switcher */}
                    <div className="inline-flex bg-slate-100 dark:bg-slate-900/70 border border-border p-1.5 rounded-2xl gap-1 overflow-x-auto max-w-full">
                        {STAKEHOLDERS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as "members" | "admins" | "partners")}
                                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                                    activeTab === tab.id
                                        ? "bg-background text-foreground shadow-sm border border-border"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStakeholder.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-6"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/50 border border-border rounded-2xl p-5 sm:p-6">
                            <div className="space-y-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${currentStakeholder.accent === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                    {currentStakeholder.badge}
                                </span>
                                <h3 className="text-lg sm:text-xl font-black">{currentStakeholder.headline}</h3>
                            </div>
                            <Button asChild size="sm" className="bg-foreground text-background hover:opacity-90 font-black rounded-xl h-10 px-5 shrink-0">
                                <Link href={currentStakeholder.ctaHref}>
                                    {currentStakeholder.ctaLabel} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {currentStakeholder.cards.map((card, idx) => (
                                <div key={idx} className="bg-background border border-border rounded-2xl p-6 space-y-3 hover:border-emerald-500/30 transition-colors">
                                    <div className={`p-2.5 rounded-xl w-fit ${currentStakeholder.accent === "emerald" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                                        <card.icon className="h-5 w-5" />
                                    </div>
                                    <h4 className="text-base font-black">{card.title}</h4>
                                    <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">{card.desc}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* ── CORE CLEARING ENGINES (Replaces "Numbers That Matter") ──────── */}
            <section className="bg-slate-950 text-white py-16 sm:py-20 px-4 sm:px-6 md:px-8 relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.08),transparent_60%)] pointer-events-none" />
                <div className="max-w-7xl mx-auto space-y-10 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Core Platform Engines</p>
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">Built for Verifiable Custody & Collection</h2>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-400 max-w-md font-medium">
                            Every transaction routes through strict permission guards and immutable double-entry reconciliation — no inflated vanity counters.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {CORE_ENGINES.map((engine) => (
                            <div
                                key={engine.code}
                                className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 hover:border-emerald-500/40 transition-colors"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className={`font-mono text-xs font-black ${engine.accent === "emerald" ? "text-emerald-400" : "text-amber-400"}`}>
                                            ENGINE {engine.code}
                                        </span>
                                        <Lock className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <h3 className="text-lg font-black text-white">{engine.title}</h3>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">{engine.desc}</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                                    {engine.tags.map((tag) => (
                                        <span key={tag} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PLANNING STUDIO & MOBILITY ROADMAP (Tight & Accurate) ───────── */}
            <section className="max-w-7xl mx-auto py-16 sm:py-20 px-4 sm:px-6 md:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    {/* Interactive Contract & Cycle Planner */}
                    <div className="lg:col-span-7 bg-slate-50/70 dark:bg-slate-950/50 border border-border rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
                                    <Calculator className="h-3.5 w-3.5" /> Illustrative Planning Model
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black">Schedule & Contract Planner</h2>
                            </div>
                            <div className="inline-flex bg-background border border-border p-1 rounded-xl shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setPlannerMode("ajo")}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${plannerMode === "ajo" ? "bg-emerald-500 text-black" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    Ajo Cycle
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPlannerMode("hp")}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${plannerMode === "hp" ? "bg-amber-500 text-black" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    Hire Purchase
                                </button>
                            </div>
                        </div>

                        {plannerMode === "ajo" ? (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-muted-foreground">Weekly Contribution</span>
                                            <span className="font-black">₦{ajoContrib.toLocaleString()}</span>
                                        </div>
                                        <input
                                            type="range" min={5000} max={100000} step={2500}
                                            value={ajoContrib} onChange={(e) => setAjoContrib(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-muted-foreground">Cycle Members</span>
                                            <span className="font-black">{ajoMembers} Members</span>
                                        </div>
                                        <input
                                            type="range" min={5} max={30} step={1}
                                            value={ajoMembers} onChange={(e) => setAjoMembers(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-background border border-border rounded-2xl p-4 sm:p-5">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Payout Per Turn</p>
                                        <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                            ₦{ajoTotalPool.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Full Rotation Span</p>
                                        <p className="text-2xl sm:text-3xl font-black mt-1">
                                            {ajoCycleDays} Days
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-muted-foreground">Fleet Units</span>
                                            <span className="font-black">{hpUnits}</span>
                                        </div>
                                        <input
                                            type="range" min={1} max={30} step={1}
                                            value={hpUnits} onChange={(e) => setHpUnits(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-muted-foreground">Asset Price</span>
                                            <span className="font-black">₦{(hpAssetCost / 1000000).toFixed(1)}M</span>
                                        </div>
                                        <input
                                            type="range" min={500000} max={5000000} step={100000}
                                            value={hpAssetCost} onChange={(e) => setHpAssetCost(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-muted-foreground">Weekly Remittance</span>
                                            <span className="font-black">₦{hpWeeklyRate.toLocaleString()}</span>
                                        </div>
                                        <input
                                            type="range" min={10000} max={75000} step={2500}
                                            value={hpWeeklyRate} onChange={(e) => setHpWeeklyRate(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 bg-background border border-border rounded-2xl p-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fleet Outlay</p>
                                        <p className="text-lg sm:text-xl font-black mt-1">₦{hpTotalAssetValue.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Weekly Pool</p>
                                        <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-1">₦{hpWeeklyPool.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Break-Even</p>
                                        <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{hpPaybackMonths} mos</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
                            <p className="text-[11px] text-muted-foreground font-medium">
                                Figures adjust dynamically from your inputs to model contract duration before launch.
                            </p>
                            <Link href="/copteller/simulator" className="text-xs font-black text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 hover:underline shrink-0">
                                Open Full Simulator <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Mobility Suite Roadmap Card */}
                    <div className="lg:col-span-5 bg-slate-950 text-white border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 relative overflow-hidden">
                        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

                        <div className="space-y-4 relative z-10">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                                <Sparkles className="h-3 w-3" /> Roadmap Module
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black leading-tight">
                                Automated Mobility &{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-400">
                                    Deduction at Source
                                </span>
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                                Built for fleet cooperatives: route bookings directly to verified operators while automatically splitting trip proceeds toward active Hire-Purchase balances.
                            </p>

                            <div className="space-y-2.5 pt-2">
                                {[
                                    "Union-prioritized passenger and logistics dispatch",
                                    "Automatic fare split straight to HP repayment ledger",
                                    "Live operator trip history synced to MFB scorecard",
                                ].map((line) => (
                                    <div key={line} className="flex items-start gap-2.5 text-xs text-slate-200 font-semibold">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <span>{line}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2 relative z-10">
                            <Button asChild variant="outline" className="w-full h-11 rounded-xl border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-white font-black text-xs">
                                <Link href="/copteller/mobility">
                                    Preview Mobility Framework <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SECTOR BLUEPRINTS & GOVERNANCE CONTROLS ─────────────────────── */}
            <section className="border-t border-border bg-slate-50/70 dark:bg-slate-950/50 py-16 sm:py-20 px-4 sm:px-6 md:px-8 relative z-10">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Sector Blueprints</p>
                            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Designed for Real Trade Cooperatives</h2>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl border-border text-xs font-black w-fit">
                            <Link href="/copteller/products">Browse Product Registry <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {SECTOR_BLUEPRINTS.map((bp, i) => (
                            <div key={i} className="bg-background border border-border rounded-2xl p-6 flex flex-col justify-between space-y-5">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${bp.accent === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                            {bp.sector}
                                        </span>
                                        <bp.icon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-black">{bp.title}</h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">{bp.summary}</p>
                                </div>
                                <div className="space-y-1.5 pt-3 border-t border-border/60">
                                    {bp.workflow.map((step) => (
                                        <div key={step} className="flex items-center gap-2 text-xs font-bold text-foreground">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span>{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bank-Grade Governance Box */}
                    <div className="bg-background border border-border rounded-3xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-4">
                            <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                <Lock className="h-3.5 w-3.5" /> Trust & Compliance Architecture
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black leading-tight">Segregated Escrow Backed by Partner Microfinance Banks</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                                Copteller does not hold unregistered retail deposits. Cooperative wallets, thrift pools, and partner underwriting programs operate transparently under partner Microfinance Bank compliance oversight and cooperative bylaws.
                            </p>
                            <div className="pt-1">
                                <Link href="/copteller/governance" className="text-xs font-black text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 hover:underline">
                                    Inspect Governance & Escrow Controls <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>

                        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                            {[
                                { label: "Ledger Model", value: "Double-Entry", sub: "Immutable audit trail" },
                                { label: "Custody Rule", value: "1:1 Escrow", sub: "MFB settlement vaults" },
                                { label: "Role Security", value: "Strict RBAC", sub: "Portal & API enforcement" },
                                { label: "Onboarding Forms", value: "Offline HTML", sub: "Print or download anytime" },
                            ].map((ctrl) => (
                                <div key={ctrl.label} className="bg-slate-50 dark:bg-slate-900/60 border border-border rounded-2xl p-4 space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{ctrl.label}</p>
                                    <p className="text-base sm:text-lg font-black text-foreground">{ctrl.value}</p>
                                    <p className="text-[11px] text-muted-foreground font-medium">{ctrl.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── BANKING & PAYMENT RAILS ─────────────────────────────────────── */}
            <section className="max-w-7xl mx-auto py-14 sm:py-16 px-4 sm:px-6 md:px-8 relative z-10 space-y-8">
                <div className="text-center space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Settlement Infrastructure</p>
                    <h2 className="text-2xl sm:text-3xl font-black">Connected to Proven Nigerian Financial Rails</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {INTEGRATIONS.map((int, i) => (
                        <div key={i} className={`bg-slate-50/70 dark:bg-slate-950/40 border border-border ${int.hoverClass} rounded-2xl p-6 space-y-2.5 transition-colors`}>
                            <span className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full border ${int.badgeClass}`}>
                                {int.role}
                            </span>
                            <h3 className="text-base font-black">{int.name}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">{int.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
            <section className="px-4 sm:px-6 md:px-8 pb-16 sm:pb-24 relative z-10">
                <div className="max-w-5xl mx-auto bg-gradient-to-r from-emerald-600 to-amber-500 rounded-[32px] sm:rounded-[40px] p-8 sm:p-14 text-center space-y-5 relative overflow-hidden shadow-2xl shadow-emerald-600/15">
                    <div className="relative z-10 space-y-4">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-black leading-tight">
                            Ready to Digitize Your Cooperative?
                        </h2>
                        <p className="text-black/80 max-w-xl mx-auto text-xs sm:text-sm font-semibold">
                            Onboard members, structure Hire-Purchase pools, or configure Microfinance Bank oversight in minutes.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
                            <Button asChild size="lg" className="bg-black text-white hover:bg-slate-900 font-black h-12 sm:h-13 px-7 rounded-2xl text-sm border-0">
                                <Link href="/copteller/onboarding">Start Onboarding <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="border-black/30 text-black hover:bg-black/10 font-bold h-12 sm:h-13 px-7 rounded-2xl text-sm">
                                <Link href="/copteller/products">View Product Templates</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
