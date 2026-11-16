"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp, ShieldCheck, Percent, ArrowRight,
    Truck, RefreshCw, Building2, Globe, BarChart3,
    Lock, CheckCircle2, ChevronRight, Activity,
    Landmark, Layers, FileCheck2
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const PROGRAM_TEMPLATES = [
    {
        name: "Commercial Mobility & Fleet HP Pool",
        sector: "Transport & Logistics",
        custody: "MFB Escrow Vault",
        tenureRange: "12 – 24 Months",
        settlement: "Quarterly / Cycle Clearing",
        repaymentCadence: "Weekly Operator Remittance",
        status: "Configurable Template",
        color: "emerald" as const,
        controls: [
            "Capital ring-fenced inside licensed Partner MFB escrow accounts",
            "Operators matched after BVN verification and trade union endorsement",
            "Weekly installment deductions reconcile automatically to underwriting splits",
            "Default escalation backed by cooperative guild guarantor covenants",
        ],
    },
    {
        name: "Artisan & Workshop Equipment Pool",
        sector: "Fabrication, Tailoring & Crafts",
        custody: "MFB Escrow Vault",
        tenureRange: "9 – 18 Months",
        settlement: "Monthly / Cycle Clearing",
        repaymentCadence: "Weekly Thrift + Asset Split",
        status: "Configurable Template",
        color: "amber" as const,
        controls: [
            "Dedicated equipment procurement disbursements directly to vetted vendors",
            "Paired rotational Ajo savings buffer alongside active equipment repayments",
            "Milestone title release only upon 100% principal & margin clearance",
            "Full audit visibility through the Institutional Partner Console",
        ],
    },
    {
        name: "Agro-Processing & Inputs Cooperative Pool",
        sector: "Agriculture & Food Value Chain",
        custody: "MFB Escrow Vault",
        tenureRange: "6 – 18 Months",
        settlement: "Harvest / Milestone Clearing",
        repaymentCadence: "Seasonal & Bi-Weekly Splits",
        status: "Configurable Template",
        color: "emerald" as const,
        controls: [
            "Repayment schedules aligned with harvest and processing cash-flow cycles",
            "Cooperative society leadership co-manages member group accountability",
            "Escrow reserves segregated per trade association and MFB branch",
            "Exportable double-entry ledgers for regulatory & board review",
        ],
    },
]

const FAQS = [
    {
        q: "How is partner underwriting capital safeguarded?",
        a: "Capital deployed into cooperative schemes is held inside segregated settlement accounts at licensed Partner Microfinance Banks. Operational expenses are never co-mingled with escrow reserves.",
    },
    {
        q: "How are underwriting returns distributed?",
        a: "Returns are driven by verified Hire-Purchase or working-capital collections from cooperative members. Partner splits reconcile automatically on the ledger and settle per your program's payout cadence.",
    },
    {
        q: "How does Copteller handle operator vetting and risk mitigation?",
        a: "Operators undergo BVN/NIN identity checks, cooperative guild endorsement, and ongoing behavioural scoring based on daily/weekly thrift and repayment streaks before matching to financed assets.",
    },
    {
        q: "Can institutional partners track collections in real time?",
        a: "Yes. Approved Institutional Partner accounts gain dedicated portal access to inspect program health, weekly collection discipline, exception alerts, and settlement statements.",
    },
]

export default function CoptellerInvestmentPage() {
    const [capitalVolume, setCapitalVolume] = React.useState<number>(5000000)
    const [targetSharePercent, setTargetSharePercent] = React.useState<number>(18)
    const [termMonths, setTermMonths] = React.useState<number>(12)
    const [vehicleFleet, setVehicleFleet] = React.useState<number>(5)
    const [unitCost, setUnitCost] = React.useState<number>(1400000)
    const [weeklyPayback, setWeeklyPayback] = React.useState<number>(20000)
    const [simulating, setSimulating] = React.useState(false)
    const [result, setResult] = React.useState<{ gross: number; estNet: number; weeklyPool: number } | null>(null)
    const [activeScheme, setActiveScheme] = React.useState<number>(0)
    const [openFaq, setOpenFaq] = React.useState<number | null>(null)

    const termMargin = ((capitalVolume * targetSharePercent) / 100) * (termMonths / 12)
    const totalProjectedCollection = capitalVolume + termMargin
    const monthlyAccrual = termMargin / termMonths

    const fleetCapital = vehicleFleet * unitCost
    const weeklyPoolFlow = vehicleFleet * weeklyPayback
    const paybackWeeks = Math.ceil(unitCost / weeklyPayback)
    const paybackMonths = (paybackWeeks / 4.33).toFixed(1)

    const handleRunSim = (e: React.FormEvent) => {
        e.preventDefault()
        setSimulating(true)
        setTimeout(() => {
            setSimulating(false)
            setResult({
                gross: totalProjectedCollection,
                estNet: capitalVolume + termMargin * 0.92,
                weeklyPool: weeklyPoolFlow,
            })
            toast.success("Illustrative schedule updated.")
        }, 450)
    }

    const currentScheme = PROGRAM_TEMPLATES[activeScheme]

    return (
        <div className="bg-background text-foreground min-h-[100dvh] font-sans selection:bg-emerald-500/30 overflow-x-hidden relative">
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute -top-24 left-[18%] w-[520px] h-[520px] bg-emerald-600/5 dark:bg-emerald-500/8 rounded-full blur-[160px]" />
                <div className="absolute bottom-0 right-[10%] w-[460px] h-[460px] bg-amber-600/4 dark:bg-amber-500/6 rounded-full blur-[150px]" />
            </div>

            {/* ── HERO ────────────────────────────────────────────────────── */}
            <section className="relative max-w-7xl mx-auto pt-12 sm:pt-16 lg:pt-20 pb-14 sm:pb-18 px-4 sm:px-6 md:px-8 z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                    <div className="lg:col-span-7 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-wrap gap-2"
                        >
                            {[
                                { icon: ShieldCheck, label: "MFB Escrow-Protected", color: "emerald" },
                                { icon: Percent, label: "Structured Settlement Splits", color: "amber" },
                                { icon: Globe, label: "Multi-Sector Programs", color: "emerald" },
                            ].map((p, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black ${
                                        p.color === "emerald"
                                            ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400"
                                            : "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-400"
                                    }`}
                                >
                                    <p.icon className="h-3.5 w-3.5" /> {p.label}
                                </div>
                            ))}
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08, duration: 0.55 }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.04]"
                        >
                            Asset-Backed Capital{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-amber-500 dark:from-emerald-400 dark:to-amber-400">
                                Built on Escrow Custody
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.14 }}
                            className="text-muted-foreground text-sm sm:text-base lg:text-lg font-medium max-w-xl leading-relaxed"
                        >
                            Structure institutional or partner capital pools for verified cooperative fleets, artisan tools, and agricultural equipment — ring-fenced inside partner Microfinance Bank accounts with automated collection tracking.
                        </motion.p>

                        {/* Grounded Architecture Highlights (No Inflated AUM/ROI Counters) */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2"
                        >
                            {[
                                { icon: Landmark, title: "Segregated Custody", sub: "MFB escrow vaults per union" },
                                { icon: Layers, title: "Configurable Splits", sub: "Clear margin & fee rules" },
                                { icon: FileCheck2, title: "Double-Entry Audit", sub: "Source-verified settlements" },
                            ].map((s, i) => (
                                <div key={i} className="bg-slate-50 dark:bg-slate-950/50 border border-border rounded-2xl p-4 space-y-1">
                                    <div className="flex items-center gap-1.5 font-black text-xs text-foreground">
                                        <s.icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span>{s.title}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground font-medium">{s.sub}</p>
                                </div>
                            ))}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.26 }}
                            className="flex flex-col sm:flex-row gap-3"
                        >
                            <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black font-black h-12 sm:h-13 px-7 rounded-2xl shadow-lg border-0 group">
                                <Link href="/copteller/onboarding/partner">
                                    Apply as Institutional Partner <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="border-border font-bold h-12 sm:h-13 px-6 rounded-2xl text-sm">
                                <a href="#templates">View Program Templates</a>
                            </Button>
                        </motion.div>
                    </div>

                    {/* Right: Program Structuring Overview Card (Replaces Fake AUM/Yield Stack) */}
                    <div className="lg:col-span-5 flex justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.22 }}
                            className="w-full max-w-md bg-slate-950 text-white border border-slate-800 rounded-[28px] p-6 space-y-5 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Settlement Blueprint</p>
                                    <h3 className="text-base font-black text-white mt-0.5">How Underwriting Flows</h3>
                                </div>
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                    Partner Scope
                                </span>
                            </div>

                            <div className="space-y-3 text-xs">
                                {[
                                    {
                                        step: "01",
                                        title: "Capital Allocation into MFB Escrow",
                                        desc: "Funds are held in a designated settlement account rather than co-mingled operating balances.",
                                    },
                                    {
                                        step: "02",
                                        title: "Asset & Operator Matching",
                                        desc: "Union admins assign financed vehicles or tools only to BVN-verified operators with score history.",
                                    },
                                    {
                                        step: "03",
                                        title: "Automated Weekly Clearing",
                                        desc: "Installments split cleanly into principal recovery, partner share, and MFB reserve buffers.",
                                    },
                                ].map((flow) => (
                                    <div key={flow.step} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[10px] font-black text-amber-400">{flow.step}</span>
                                            <p className="font-black text-white">{flow.title}</p>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{flow.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400 font-semibold border-t border-slate-800">
                                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                                    <Lock className="h-3.5 w-3.5" /> Role-Protected Partner Portal
                                </span>
                                <Link href="/copteller/governance" className="hover:text-white underline">
                                    View Controls
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── VALUE PILLARS ────────────────────────────────────────────── */}
            <section className="bg-slate-50/70 dark:bg-slate-950/50 border-y border-border py-16 px-4 sm:px-6 md:px-8 relative z-10">
                <div className="max-w-7xl mx-auto space-y-10">
                    <div className="text-center space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Underwriting Controls</p>
                        <h2 className="text-3xl sm:text-4xl font-black">Built for Disciplined Capital Deployment</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[
                            { icon: ShieldCheck, title: "MFB Escrow Vaults", desc: "Capital pools sit inside licensed partner Microfinance Bank accounts with segregated union sub-ledgers.", color: "emerald" },
                            { icon: Percent, title: "Transparent Split Rules", desc: "Define profit-share, clearing fees, and principal recovery priority clearly before deployment.", color: "amber" },
                            { icon: Activity, title: "Operator Scorecards", desc: "Inspect collection discipline, active asset assignments, and arrears exceptions directly inside your portal.", color: "emerald" },
                            { icon: BarChart3, title: "Exportable Audit Logs", desc: "Download full ledger reconciliation history aligned with CBN MFB and cooperative registrar oversight.", color: "amber" },
                        ].map((item, i) => (
                            <div key={i} className="bg-background border border-border rounded-2xl p-6 space-y-3 hover:border-emerald-500/30 transition-colors">
                                <div className={`p-2.5 rounded-xl w-fit ${item.color === "emerald" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <h3 className="text-base font-black">{item.title}</h3>
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PROGRAM TEMPLATES ────────────────────────────────────────── */}
            <section id="templates" className="max-w-7xl mx-auto py-16 sm:py-20 px-4 sm:px-6 md:px-8 relative z-10">
                <div className="text-center space-y-2 mb-10">
                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Program Templates</p>
                    <h2 className="text-3xl sm:text-4xl font-black">Sector Underwriting Structures</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto font-medium">
                        Select a cooperative financing template to inspect custody rules, collection cadence, and risk safeguards before launching with a partner union.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2.5 mb-8">
                    {PROGRAM_TEMPLATES.map((s, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setActiveScheme(i)}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all border ${
                                activeScheme === i
                                    ? "bg-gradient-to-r from-emerald-500 to-amber-500 text-black border-transparent shadow-md"
                                    : "border-border text-muted-foreground hover:text-foreground bg-background"
                            }`}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeScheme}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                    >
                        <div className="lg:col-span-8 bg-background border border-border rounded-3xl p-6 sm:p-8 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{currentScheme.sector}</p>
                                    <h3 className="text-xl sm:text-2xl font-black">{currentScheme.name}</h3>
                                </div>
                                <span className="text-[10px] font-black px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider w-fit">
                                    {currentScheme.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: "Custody Layer", val: currentScheme.custody },
                                    { label: "Tenure Range", val: currentScheme.tenureRange },
                                    { label: "Collection", val: currentScheme.repaymentCadence },
                                    { label: "Distribution", val: currentScheme.settlement },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-slate-50 dark:bg-slate-900/50 border border-border rounded-2xl p-3.5 space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                                        <p className="text-xs sm:text-sm font-black text-foreground">{stat.val}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2.5">
                                {currentScheme.controls.map((f, i) => (
                                    <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{f}</span>
                                    </div>
                                ))}
                            </div>

                            <Button asChild className="w-full h-12 bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black font-black rounded-2xl text-sm border-0 shadow-md">
                                <Link href="/copteller/onboarding/partner">
                                    Request Program Structuring <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>

                        <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-950/50 border border-border rounded-3xl p-6 flex flex-col justify-between space-y-4">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black">Illustrative Allocation Check</h4>
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Model</span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-black">
                                        <span className="text-muted-foreground">Sample Commitment</span>
                                        <span className="text-emerald-600 dark:text-emerald-400">₦{capitalVolume.toLocaleString()}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={500000}
                                        max={25000000}
                                        step={500000}
                                        value={capitalVolume}
                                        onChange={(e) => setCapitalVolume(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                    />
                                </div>

                                <div className="bg-background border border-border rounded-2xl p-4 space-y-2.5 text-xs">
                                    <div className="flex justify-between font-bold">
                                        <span className="text-muted-foreground">Est. Asset Units (@ ₦1.4M)</span>
                                        <span className="font-black">{Math.floor(capitalVolume / 1400000)} Units</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span className="text-muted-foreground">Selected Tenure</span>
                                        <span className="font-black">{termMonths} Months</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span className="text-muted-foreground">Escrow Account</span>
                                        <span className="font-black text-emerald-600 dark:text-emerald-400">Partner MFB Only</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                                Live terms, margin splits, and collateral ratios are finalized directly with your onboarding Partner Microfinance Bank.
                            </p>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* ── PLANNING MODELLER ────────────────────────────────────────── */}
            <section className="bg-slate-50/70 dark:bg-slate-950/50 border-t border-border py-16 sm:py-20 px-4 sm:px-6 md:px-8 relative z-10">
                <div className="max-w-7xl mx-auto space-y-10">
                    <div className="text-center space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Illustrative Planning Suite</p>
                        <h2 className="text-3xl sm:text-4xl font-black">Schedule & Recovery Modeller</h2>
                    </div>

                    <form onSubmit={handleRunSim} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-background border border-border rounded-3xl p-6 sm:p-8 space-y-6">
                            <h3 className="text-lg font-black flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-emerald-500" /> Program Margin Modeller
                            </h3>

                            {[
                                { label: "Committed Pool Capital", val: `₦${capitalVolume.toLocaleString()}`, min: 500000, max: 25000000, step: 500000, value: capitalVolume, onChange: setCapitalVolume, color: "emerald", accentClass: "accent-emerald-500" },
                                { label: "Target Contract Margin (p.a.)", val: `${targetSharePercent}%`, min: 8, max: 36, step: 1, value: targetSharePercent, onChange: setTargetSharePercent, color: "amber", accentClass: "accent-amber-500" },
                                { label: "Program Horizon", val: `${termMonths} Months`, min: 6, max: 36, step: 3, value: termMonths, onChange: setTermMonths, color: "emerald", accentClass: "accent-emerald-500" },
                            ].map((s, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-xs font-black">
                                        <span className="text-muted-foreground">{s.label}</span>
                                        <span className={s.color === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>{s.val}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={s.min}
                                        max={s.max}
                                        step={s.step}
                                        value={s.value}
                                        onChange={(e) => s.onChange(Number(e.target.value))}
                                        className={`w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer ${s.accentClass}`}
                                    />
                                </div>
                            ))}

                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-border rounded-2xl p-4 grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Projected Term Margin</p>
                                    <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                        ₦{termMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Monthly Avg. Margin</p>
                                    <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                                        ₦{monthlyAccrual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                            </div>

                            <Button type="submit" disabled={simulating} className="w-full h-11 bg-gradient-to-r from-emerald-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-black font-black rounded-xl border-0 shadow-md">
                                {simulating ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Calculating...</> : "Generate Schedule Summary"}
                            </Button>
                        </div>

                        <div className="bg-background border border-border rounded-3xl p-6 sm:p-8 space-y-6">
                            <h3 className="text-lg font-black flex items-center gap-2">
                                <Truck className="h-5 w-5 text-amber-500" /> Fleet Payback Horizon Modeller
                            </h3>

                            {[
                                { label: "Units Financed", val: `${vehicleFleet} Units`, min: 1, max: 30, step: 1, value: vehicleFleet, onChange: setVehicleFleet, color: "amber", accentClass: "accent-amber-500" },
                                { label: "Unit Acquisition Cost", val: `₦${unitCost.toLocaleString()}`, min: 500000, max: 5000000, step: 100000, value: unitCost, onChange: setUnitCost, color: "emerald", accentClass: "accent-emerald-500" },
                                { label: "Weekly Installment / Operator", val: `₦${weeklyPayback.toLocaleString()}`, min: 10000, max: 75000, step: 2500, value: weeklyPayback, onChange: setWeeklyPayback, color: "amber", accentClass: "accent-amber-500" },
                            ].map((s, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-xs font-black">
                                        <span className="text-muted-foreground">{s.label}</span>
                                        <span className={s.color === "amber" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>{s.val}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={s.min}
                                        max={s.max}
                                        step={s.step}
                                        value={s.value}
                                        onChange={(e) => s.onChange(Number(e.target.value))}
                                        className={`w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer ${s.accentClass}`}
                                    />
                                </div>
                            ))}

                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-border rounded-2xl p-4 space-y-2.5">
                                {[
                                    { label: "Total Asset Outlay", val: `₦${fleetCapital.toLocaleString()}`, color: "amber" },
                                    { label: "Weekly Fleet Collection", val: `₦${weeklyPoolFlow.toLocaleString()}`, color: "emerald" },
                                    { label: "Principal Break-Even Horizon", val: `${paybackWeeks} weeks (~${paybackMonths} mos)`, color: "emerald" },
                                ].map((row, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs font-bold border-b border-border/60 pb-2 last:border-0 last:pb-0">
                                        <span className="text-muted-foreground">{row.label}</span>
                                        <span className={`font-black text-sm ${row.color === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{row.val}</span>
                                    </div>
                                ))}
                            </div>

                            <AnimatePresence>
                                {result && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-4 space-y-1"
                                    >
                                        <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Illustrative Program Summary</p>
                                        <p className="text-base font-black">Est. Gross Pool Recovery: ₦{result.gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Illustrative only across {termMonths} months before bank-configured clearing fees.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </form>
                </div>
            </section>

            {/* ── COMPLIANCE STRIP ─────────────────────────────────────────── */}
            <section className="bg-slate-950 py-14 px-4 sm:px-6 md:px-8 relative z-10 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                        <div className="md:col-span-2 space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Compliance & Custody</p>
                            <h3 className="text-2xl font-black text-white">Structured for Partner MFB Oversight</h3>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                Program rules, KYC records, and settlement splits operate inside the compliance framework of your licensed Nigerian Partner Microfinance Bank.
                            </p>
                        </div>
                        {[
                            { label: "CBN MFB Framework", icon: ShieldCheck },
                            { label: "Segregated Escrow", icon: Lock },
                            { label: "Cooperative Societies", icon: Building2 },
                            { label: "Double-Entry Audit", icon: CheckCircle2 },
                        ].map((c, i) => (
                            <div key={i} className="border border-emerald-900/40 bg-emerald-950/20 rounded-2xl p-5 space-y-2.5 text-center">
                                <c.icon className="h-5 w-5 text-emerald-400 mx-auto" />
                                <p className="text-[11px] font-black text-slate-200 uppercase tracking-wider">{c.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── UNDERWRITER FAQS ─────────────────────────────────────────── */}
            <section className="max-w-4xl mx-auto py-16 sm:py-20 px-4 sm:px-6 md:px-8 relative z-10 space-y-8">
                <div className="text-center space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Frequently Asked Questions</p>
                    <h2 className="text-3xl sm:text-4xl font-black">Partner Underwriting FAQ</h2>
                </div>

                <div className="space-y-3">
                    {FAQS.map((faq, idx) => {
                        const isOpen = openFaq === idx
                        return (
                            <div key={idx} className="bg-background border border-border rounded-2xl overflow-hidden transition-all">
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                                    className="w-full px-6 py-4 flex justify-between items-center text-left text-xs sm:text-sm font-black text-foreground"
                                >
                                    <span>{faq.q}</span>
                                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? "rotate-90 text-emerald-500" : ""}`} />
                                </button>
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-4 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed border-t border-border pt-3">
                                                {faq.a}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────────────────────── */}
            <section className="px-4 sm:px-6 md:px-8 pb-16 sm:pb-24 relative z-10">
                <div className="max-w-4xl mx-auto bg-gradient-to-r from-emerald-600 to-amber-500 rounded-[32px] p-8 sm:p-14 text-center space-y-5 relative overflow-hidden">
                    <div className="relative z-10 space-y-4">
                        <h2 className="text-3xl sm:text-4xl font-black text-black">Launch an Institutional Cooperative Program</h2>
                        <p className="text-black/80 max-w-xl mx-auto text-xs sm:text-sm font-semibold">
                            Submit a partner underwriting application for bank review or inspect governance and escrow documentation.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button asChild size="lg" className="bg-black text-white hover:bg-slate-900 font-black h-12 px-7 rounded-2xl text-sm border-0">
                                <Link href="/copteller/onboarding/partner">Partner Onboarding <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="border-black/30 text-black hover:bg-black/10 font-bold h-12 px-7 rounded-2xl text-sm">
                                <Link href="/copteller/governance">Governance & Compliance</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
