"use client"

import * as React from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import {
    Cpu, PiggyBank, TrendingUp, ShieldCheck, Percent, ArrowRight, Coins,
    Users, Award, Zap, BarChart3, Target, Lock, Layers, RefreshCw,
    CheckCircle2, ChevronRight, FlaskConical, Smartphone, Activity,
    Building2, KeyRound, CircleDollarSign, Globe, Bell, Star, Clock,
    ArrowUpRight, Briefcase, Truck
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// â”€â”€ Animated step console â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function WorkflowConsole({ steps, active }: { steps: string[], active: number }) {
    return (
        <div className="bg-[#050505] border border-emerald-900/30 rounded-2xl p-5 font-mono text-xs text-slate-400 space-y-2 min-h-[160px]">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-900">
                <Cpu className="h-4 w-4 text-emerald-400 animate-spin" style={{ animationDuration: "3s" }} />
                <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest">Workflow Console</span>
                <div className="ml-auto flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
            </div>
            {steps.map((step, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: i <= active ? 1 : 0.2, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`flex items-start gap-2 ${i === active ? 'text-emerald-400 font-bold' : i < active ? 'text-slate-500' : 'text-slate-700'}`}
                >
                    <span className="text-emerald-700 shrink-0">â€º</span>
                    {step}
                </motion.div>
            ))}
        </div>
    )
}

export default function CoptellerFeaturesPage() {
    const [selectedWorkflow, setSelectedWorkflow] = React.useState<number>(0)
    const [consoleStep, setConsoleStep] = React.useState<number>(0)
    const [mockupTab, setMockupTab] = React.useState<"member" | "admin" | "super">("member")

    const workflows = [
        {
            id: "ajo",
            title: "Digital Ajo / Esusu Cycle",
            tagline: "Rotational savings, fully automated and bank-cleared.",
            color: "emerald",
            icon: PiggyBank,
            steps: [
                "1. Union leader registers guild roster and escrow vault",
                "2. Members configure auto-deduction schedules",
                "3. Platform compiles rotational queue and cycle topology",
                "4. Pool collects until target — instant primary bank payout",
                "5. Credit profile updated — next cycle auto-enrolls"
            ],
            features: [
                { icon: Coins, title: "Automated Deductions", desc: "Daily, weekly, or monthly deductions synced to member wallets and bank accounts." },
                { icon: Users, title: "Group Roster Management", desc: "Manage any number of members in a rotation cycle with real-time slot tracking." },
                { icon: BarChart3, title: "Transparent Ledger", desc: "Every contribution and payout is logged on the immutable cooperative ledger." },
                { icon: ShieldCheck, title: "Escrow-Cleared Payouts", desc: "Payout to each member's slot is cleared through licensed MFB escrow vaults." },
            ]
        },
        {
            id: "hp",
            title: "Hire Purchase Contracts",
            tagline: "Structured asset ownership — from vehicles to farming equipment and artisan tools.",
            color: "amber",
            icon: Truck,
            steps: [
                "1. Cooperative admin creates HP scheme and links asset",
                "2. Operator is matched to asset via Admin Console",
                "3. Contract is initialized with weekly payback schedule",
                "4. Deductions auto-clear each week against HP balance",
                "5. Full ownership unlocked when balance reaches ₦0"
            ],
            features: [
                { icon: Truck, title: "Asset & Tool Registry", desc: "Track every asset (vehicle, machinery, tools), its current operator, and payback progress in real time." },
                { icon: Target, title: "Operator Matching Engine", desc: "Match unmatched members to available assets in seconds. No paperwork." },
                { icon: Percent, title: "Flexible Payback Rates", desc: "Configurable weekly payback rates set per cooperative and asset type." },
                { icon: Lock, title: "GPS-Triggered Security", desc: "Remote immobilization and tracking for defaulting assets — automated enforcement." },
            ]
        },
        {
            id: "credit",
            title: "Alternative Credit Scoring",
            tagline: "Build bank-grade credit from informal trade behaviour.",
            color: "orange",
            icon: BarChart3,
            steps: [
                "1. Member's daily Ajo consistency is tracked from Day 1",
                "2. HP payback streak and on-time rate generates score delta",
                "3. Cooperative admin confirms member's sector engagement",
                "4. MFB-audited score used to unlock loans and zero-deposit HP",
                "5. Score report exportable to CBN-linked credit bureaus"
            ],
            features: [
                { icon: Activity, title: "Behavioural Scoring", desc: "Daily saving habits, payback streaks, and engagement build a real-time score." },
                { icon: Award, title: "Grant Eligibility Engine", desc: "Score thresholds unlock non-repayable grant applications automatically." },
                { icon: Building2, title: "MFB Audit Trail", desc: "All scoring data maintained in bank-compliant format for regulatory audit." },
                { icon: Globe, title: "Credit Bureau Export", desc: "Opt-in export to formal credit bureaus to build national credit history." },
            ]
        },
        {
            id: "grants",
            title: "Micro-Grants & Loans",
            tagline: "Capital that flows directly to the people who need it.",
            color: "emerald",
            icon: CircleDollarSign,
            steps: [
                "1. Sponsor defines grant type, amount, and eligibility criteria",
                "2. Platform scans all active members against criteria",
                "3. Qualifying members are notified via in-app alert",
                "4. Member submits one-click grant application",
                "5. Bank admin approves — funds routed to Copteller wallet"
            ],
            features: [
                { icon: Layers, title: "Multi-Scheme Support", desc: "Manage multiple grant types simultaneously — transport, artisan, agro, and more." },
                { icon: Zap, title: "One-Click Applications", desc: "Eligible members apply in a single tap. No forms, no bureaucracy." },
                { icon: CircleDollarSign, title: "Direct Wallet Disbursement", desc: "Approved funds clear directly into the member's Copteller wallet — instant." },
                { icon: KeyRound, title: "Secure Sponsor Vault", desc: "Grant capital held in sponsor-dedicated escrow, segregated from operating funds." },
            ]
        }
    ]

    const currentWorkflow = workflows[selectedWorkflow]

    // Auto-animate console steps
    React.useEffect(() => {
        setConsoleStep(0)
        const interval = setInterval(() => {
            setConsoleStep(prev => (prev >= 4 ? 0 : prev + 1))
        }, 1200)
        return () => clearInterval(interval)
    }, [selectedWorkflow])

    return (
        <div className="bg-background text-foreground min-h-screen font-sans selection:bg-emerald-500/30 overflow-x-hidden relative">
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute top-[-5%] right-[15%] w-[500px] h-[500px] bg-emerald-600/5 dark:bg-emerald-500/8 rounded-full blur-[160px]" />
                <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] bg-amber-600/4 dark:bg-amber-500/6 rounded-full blur-[140px]" />
            </div>

            {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="relative max-w-7xl mx-auto pt-24 pb-16 px-6 md:px-8 z-10">
                <div className="text-center space-y-6 max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest"
                    >
                        <Cpu className="h-4 w-4" /> Platform Architecture
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.7 }}
                        className="text-5xl md:text-7xl font-black tracking-tight leading-none"
                    >
                        Every Feature,{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-amber-500 dark:from-emerald-400 dark:to-amber-400">
                            Built for Trade
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-muted-foreground text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed"
                    >
                        Copteller's feature architecture is purpose-built for the informal economy — Ajo rotation cycles, Hire Purchase automation, alternative credit scoring, micro-grant disbursement, and an upcoming mobility integration layer.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-wrap justify-center gap-4"
                    >
                        {[
                            { icon: ShieldCheck, label: "MFB-Backed Escrow" },
                            { icon: Zap, label: "Automated Workflows" },
                            { icon: Globe, label: "API-Connected" },
                            { icon: Lock, label: "End-to-End Encrypted" },
                        ].map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-bold text-muted-foreground border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900/50">
                                <p.icon className="h-3.5 w-3.5 text-emerald-500" /> {p.label}
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* â”€â”€ INTERACTIVE WORKFLOW EXPLORER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="max-w-7xl mx-auto py-12 px-6 md:px-8 relative z-10">
                <div className="space-y-3 mb-10 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Interactive Workflow Explorer</p>
                    <h2 className="text-3xl md:text-4xl font-black">Select a Feature Module</h2>
                </div>

                {/* Workflow selector pills */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                    {workflows.map((w, i) => (
                        <button
                            key={w.id}
                            onClick={() => setSelectedWorkflow(i)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 border ${selectedWorkflow === i
                                ? w.color === 'emerald' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-950/20'
                                    : w.color === 'amber' ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-950/20'
                                    : 'bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-950/20'
                                : 'border-slate-200 dark:border-slate-800 text-muted-foreground hover:text-foreground hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                        >
                            <w.icon className="h-3.5 w-3.5" />
                            {w.title}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedWorkflow}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                    >
                        {/* Left: Info & steps */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="space-y-2">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${currentWorkflow.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : currentWorkflow.color === 'amber' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>
                                    <currentWorkflow.icon className="h-3.5 w-3.5" /> {currentWorkflow.title}
                                </div>
                                <h3 className="text-3xl md:text-4xl font-black">{currentWorkflow.tagline}</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {currentWorkflow.features.map((f, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.08 }}
                                        className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-3 hover:border-emerald-500/20 transition-all duration-300 group"
                                    >
                                        <div className={`p-2.5 rounded-xl w-fit ${currentWorkflow.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : currentWorkflow.color === 'amber' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>
                                            <f.icon className="h-4.5 w-4.5" />
                                        </div>
                                        <h4 className="text-sm font-black">{f.title}</h4>
                                        <p className="text-xs text-muted-foreground font-semibold leading-relaxed">{f.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Live Console */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black flex items-center gap-2"><FlaskConical className="h-4 w-4 text-emerald-500" /> Workflow Simulation</h4>
                                    <button onClick={() => setConsoleStep(0)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
                                        <RefreshCw className="h-3 w-3" /> Reset
                                    </button>
                                </div>
                                <WorkflowConsole steps={currentWorkflow.steps} active={consoleStep} />
                                <div className="flex gap-1.5 pt-1 justify-center">
                                    {currentWorkflow.steps.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setConsoleStep(i)}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${i === consoleStep ? 'w-6 bg-emerald-500' : 'w-1.5 bg-slate-300 dark:bg-slate-700'}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <Button asChild className={`w-full h-12 font-black rounded-2xl text-sm border-0 shadow-lg group ${currentWorkflow.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : currentWorkflow.color === 'amber' ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-orange-500 hover:bg-orange-400 text-black'}`}>
                                <Link href="/copteller/onboarding">
                                    Access This Feature <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* â”€â”€ FULL FEATURE TABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-900 py-24 px-6 md:px-8 relative z-10">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="text-center space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Complete Capability Matrix</p>
                        <h2 className="text-3xl md:text-5xl font-black">Everything in the Platform</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                category: "For Members",
                                color: "emerald",
                                icon: Coins,
                                items: [
                                    "Daily / Weekly Ajo Auto-Deductions",
                                    "Rotational Payout Queue System",
                                    "HP Payback Tracking Dashboard",
                                    "Digital Wallet & Instant Transfers",
                                    "Micro-Grant Application Portal",
                                    "Working Capital Micro-Loan Access",
                                    "Alternative Credit Score Dashboard",
                                    "Mobility Suite Early Access (Coming)",
                                ]
                            },
                            {
                                category: "For Admins",
                                color: "amber",
                                icon: Activity,
                                items: [
                                    "Member Roster & Onboarding Wizard",
                                    "Escrow Vault Deployment Console",
                                    "Operator â†’ Asset Matching Engine",
                                    "HP Contract Configuration & Tracking",
                                    "Grant Criteria Definition & Disbursement",
                                    "Investment Scheme Launch Tools",
                                    "Real-Time Ledger & Audit Logs",
                                    "Automated Compliance Reporting",
                                ]
                            },
                            {
                                category: "For Investors",
                                color: "orange",
                                icon: TrendingUp,
                                items: [
                                    "Private Capital Pool Registration",
                                    "Configurable Profit-Share Splits",
                                    "Automated Quarterly Yield Payouts",
                                    "Operator Performance Scorecards",
                                    "Escrow-Protected Capital Vaults",
                                    "Real-Time Portfolio Dashboard",
                                    "CBN-Compliant Reporting Exports",
                                    "Multi-Sector Scheme Participation",
                                ]
                            }
                        ].map((col, i) => (
                            <div key={i} className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-900">
                                    <div className={`p-2.5 rounded-xl ${col.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : col.color === 'amber' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>
                                        <col.icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-lg font-black">{col.category}</h3>
                                </div>
                                <ul className="space-y-3">
                                    {col.items.map((item, j) => (
                                        <li key={j} className="flex items-start gap-2.5 text-xs font-semibold text-muted-foreground">
                                            <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${col.color === 'emerald' ? 'text-emerald-500' : col.color === 'amber' ? 'text-amber-500' : 'text-orange-500'}`} />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── INTERACTIVE WORKSPACE PREVIEWS ── */}
            <section className="bg-slate-100/50 dark:bg-slate-900/30 border-y border-slate-200 dark:border-slate-800 py-24 px-6 md:px-8 relative z-10 overflow-hidden font-sans">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="text-center space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Portal Previews</p>
                        <h2 className="text-3xl md:text-5xl font-black">Experience the Platform Workspaces</h2>
                        <p className="text-sm text-muted-foreground max-w-xl mx-auto">Take a visual tour through our custom interfaces built for members, admins, and bank regulators.</p>
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center">
                        <div className="flex bg-white dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-850 w-full max-w-lg shadow-sm">
                            {[
                                { id: "member", label: "Member App", desc: "For Hustlers & Drivers" },
                                { id: "admin", label: "Admin Console", desc: "For Union Officers" },
                                { id: "super", label: "Regulator Portal", desc: "For MFB Superadmins" },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setMockupTab(t.id as any)}
                                    className={`flex-1 py-3 px-2 rounded-xl transition-all text-center flex flex-col items-center justify-center ${
                                        mockupTab === t.id
                                            ? 'bg-slate-50 dark:bg-slate-900 text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <span className="text-xs font-black">{t.label}</span>
                                    <span className="text-[9px] text-muted-foreground font-semibold mt-0.5">{t.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Live Preview Display */}
                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-[32px] p-6 md:p-8 max-w-4xl mx-auto shadow-2xl backdrop-blur-md min-h-[380px] flex flex-col justify-between">
                        <AnimatePresence mode="wait">
                            {mockupTab === "member" && (
                                <motion.div key="member" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <div className="flex justify-between items-center border-b pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-sm">KO</div>
                                            <div>
                                                <h4 className="text-sm font-black">Kalu Onyekachi</h4>
                                                <p className="text-[10px] text-muted-foreground font-semibold">Aba Keke Cooperative Society</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold uppercase text-[9px] tracking-wider">Verified Account</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-bold">
                                        <div className="bg-slate-50 dark:bg-slate-900/60 border p-5 rounded-2xl space-y-1.5">
                                            <p className="text-[9px] text-muted-foreground font-black uppercase">Escrow Wallet Balance</p>
                                            <p className="text-2xl font-black text-foreground">₦24,500.00</p>
                                            <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">● Active Auto-Funding</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/60 border p-5 rounded-2xl space-y-1.5">
                                            <p className="text-[9px] text-muted-foreground font-black uppercase">Ajo Rotation Slot</p>
                                            <p className="text-2xl font-black text-foreground">Slot #4 / 10</p>
                                            <p className="text-[9px] text-muted-foreground font-semibold">Est. Payout: ₦150,000</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/60 border p-5 rounded-2xl space-y-1.5">
                                            <p className="text-[9px] text-muted-foreground font-black uppercase">HP Asset Status</p>
                                            <p className="text-2xl font-black text-foreground">72% Cleared</p>
                                            <p className="text-[9px] text-amber-600 font-bold">12 / 18 Weekly Payments</p>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between text-xs font-bold">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                            <span className="text-muted-foreground">Current Cycle Payout Target reached. Your slot #4 is queued for August 22.</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-emerald-500 hidden sm:block shrink-0" />
                                    </div>
                                </motion.div>
                            )}

                            {mockupTab === "admin" && (
                                <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <div className="flex justify-between items-center border-b pb-4">
                                        <div>
                                            <h4 className="text-sm font-black">Aba Transport Operators Union</h4>
                                            <p className="text-[10px] text-muted-foreground font-semibold">Cooperative Management Workspace</p>
                                        </div>
                                        <Badge className="bg-amber-500/10 text-amber-600 border-none font-bold uppercase text-[9px] tracking-wider">License Status: Active</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-bold">
                                        {[
                                            { label: "Active Members", count: "124", sub: "98% verified KYC" },
                                            { label: "Total Asset Value", count: "₦14.2M", sub: "12 Keke units deployed" },
                                            { label: "Collection Streak", count: "98.5%", sub: "Weekly repayment rate" },
                                            { label: "Escrow Reserves", count: "₦2.8M", sub: "Audit reserve buffer" },
                                        ].map((card, idx) => (
                                            <div key={idx} className="bg-slate-50 dark:bg-slate-900/60 border p-5 rounded-2xl space-y-1.5">
                                                <p className="text-[9px] text-muted-foreground font-black uppercase">{card.label}</p>
                                                <p className="text-2xl font-black text-foreground">{card.count}</p>
                                                <p className="text-[9px] text-muted-foreground font-semibold">{card.sub}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border border-slate-200 dark:border-slate-900 rounded-2xl divide-y text-xs font-semibold overflow-hidden">
                                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/40 text-[9px] text-muted-foreground uppercase font-black tracking-wider border-b">Pending Scheme Applications</div>
                                        <div className="px-4 py-3 flex justify-between items-center">
                                            <span>Emeka Uzor · Tricycle HP Application · Score: A (94%)</span>
                                            <div className="flex gap-2">
                                                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[10px] h-7 rounded px-3 border-none">Approve</Button>
                                                <Button size="sm" variant="outline" className="text-[10px] h-7 rounded px-3">Decline</Button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {mockupTab === "super" && (
                                <motion.div key="super" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <div className="flex justify-between items-center border-b pb-4">
                                        <div>
                                            <h4 className="text-sm font-black">Partner Microfinance Bank Control Panel</h4>
                                            <p className="text-[10px] text-muted-foreground font-semibold">Regulator & Cleared Escrow Console</p>
                                        </div>
                                        <Badge className="bg-blue-500/10 text-blue-600 border-none font-bold uppercase text-[9px] tracking-wider">CBN Compliant</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-bold">
                                        <div className="bg-slate-50 dark:bg-slate-900/60 border p-5 rounded-2xl space-y-1.5">
                                            <p className="text-[9px] text-muted-foreground font-black uppercase">Bank-Wide Reserves</p>
                                            <p className="text-2xl font-black text-foreground">₦184.2M</p>
                                            <p className="text-[9px] text-emerald-650 dark:text-emerald-450 font-bold">● Fully backed 1:1 escrow</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/60 border p-5 rounded-2xl space-y-1.5">
                                            <p className="text-[9px] text-muted-foreground font-black uppercase">Licensed Unions</p>
                                            <p className="text-2xl font-black text-foreground">18 Societies</p>
                                            <p className="text-[9px] text-muted-foreground font-semibold">Across Transport & Agros</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/60 border p-5 rounded-2xl space-y-1.5">
                                            <p className="text-[9px] text-muted-foreground font-black uppercase">Audit System Latency</p>
                                            <p className="text-2xl font-black text-foreground">0.58s Avg.</p>
                                            <p className="text-[9px] text-emerald-650 dark:text-emerald-450 font-bold">Real-time ledger tracking</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#050505] text-[#10B981] font-mono text-[10px] p-4 rounded-xl space-y-1 border border-slate-900">
                                        <p>&gt; SECURE AUDITING HANDSHAKE ACTIVE: 184.2M matched deposits with clearing ledger records.</p>
                                        <p>&gt; AUDIT LOG: TVS King HP split executors validated for Aba Transport Union.</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </section>

            {/* â”€â”€ API INTEGRATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="max-w-7xl mx-auto py-24 px-6 md:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">Platform Primitives</p>
                            <h2 className="text-3xl md:text-5xl font-black leading-tight">Workflows, Vaults & Third-Party APIs</h2>
                        </div>
                        <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                            Copteller is built atop a powerful platform primitive layer. Every cooperative action — from thrift deductions to HP paybacks — is routed through an automated workflow engine that connects to external banking APIs, payment processors, identity verification providers, and loan scoring systems via a secure Service Vault.
                        </p>
                        <div className="space-y-3">
                            {[
                                { icon: Cpu, label: "Workflow Engine", desc: "Automated multi-step processing for every cooperative action" },
                                { icon: KeyRound, label: "Service Vault", desc: "Encrypted API credential management for all provider integrations" },
                                { icon: Building2, label: "Core Banking APIs", desc: "Direct MFB bank integration for ledger settlements and escrow clearing" },
                                { icon: Globe, label: "Payment Processors", desc: "Paystack, Flutterwave, NIBSS for instant fund routing and reconciliation" },
                            ].map((api, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-2xl hover:border-emerald-500/20 transition-colors group">
                                    <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                                        <api.icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black">{api.label}</p>
                                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">{api.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Code-like visual */}
                    <div className="bg-[#050505] rounded-3xl border border-emerald-900/20 p-6 font-mono text-xs space-y-1.5 shadow-2xl">
                        <div className="flex items-center gap-2 pb-4 border-b border-slate-900">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                            </div>
                            <span className="text-slate-600 text-[10px]">copteller_workflow.json</span>
                        </div>
                        {[
                            { t: "// Ajo Auto-Deduction Workflow", c: "slate-700" },
                            { t: `{`, c: "slate-400" },
                            { t: `  "trigger": "schedule.weekly",`, c: "emerald-400" },
                            { t: `  "action": "deduct_contribution",`, c: "amber-400" },
                            { t: `  "vault": "escrow_ajo_pool",`, c: "emerald-400" },
                            { t: `  "api": "core_banking.transfer",`, c: "slate-400" },
                            { t: `  "amount": member.contribution_amt,`, c: "amber-400" },
                            { t: `  "verify": ["bvn_check", "balance"],`, c: "emerald-400" },
                            { t: `  "on_success": "update_credit_score",`, c: "slate-400" },
                            { t: `  "notify": "push + sms",`, c: "amber-400" },
                            { t: `  "audit_log": true`, c: "emerald-400" },
                            { t: `}`, c: "slate-400" },
                            { t: `// â†’ Settlement: 0.58s avg. latency`, c: "slate-600" },
                        ].map((line, i) => (
                            <div key={i} className={`text-${line.c}`}>{line.t}</div>
                        ))}
                    </div>
                </div>
            </section>

            {/* â”€â”€ CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="py-8 px-6 md:px-8 pb-24 relative z-10">
                <div className="max-w-4xl mx-auto bg-gradient-to-r from-emerald-600 to-amber-500 rounded-[48px] p-14 md:p-20 text-center space-y-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none" />
                    <div className="relative z-10 space-y-5">
                        <h2 className="text-4xl md:text-5xl font-black text-black">Ready to Automate Your Cooperative?</h2>
                        <p className="text-black/70 max-w-xl mx-auto text-sm font-semibold">Every feature is production-ready. Join hundreds of trade guilds already running on Copteller's automated finance engine.</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                             <Button asChild size="lg" className="bg-black text-white hover:bg-slate-900 font-black h-14 px-8 rounded-2xl text-sm border-0">
                                <Link href="/copteller/onboarding">Enter Portal <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="border-black/30 text-black hover:bg-black/10 font-bold h-14 px-8 rounded-2xl text-sm">
                                <Link href="/copteller/investment">View Investment Yields</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

