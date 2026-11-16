"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp, ShieldCheck, Percent, Cpu, ArrowRight, DollarSign,
    HeartHandshake, Truck, RefreshCw, Building2, Globe, BarChart3,
    Lock, Zap, ArrowUpRight, Check, CheckCircle2, ChevronRight,
    Target, Layers, CircleDollarSign, Award, Activity, KeyRound,
    PiggyBank, Clock, Star, Briefcase
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) {
    return <span>{prefix}{value.toLocaleString()}{suffix}</span>
}

export default function CoptellerInvestmentPage() {
    const [capitalVolume, setCapitalVolume] = React.useState<number>(2000000)
    const [yieldRate, setYieldRate] = React.useState<number>(18)
    const [termMonths, setTermMonths] = React.useState<number>(12)
    const [vehicleFleet, setVehicleFleet] = React.useState<number>(5)
    const [weeklyPayback, setWeeklyPayback] = React.useState<number>(15000)
    const [simulating, setSimulating] = React.useState(false)
    const [result, setResult] = React.useState<{ gross: number, net: number, weekly: number } | null>(null)
    const [activeScheme, setActiveScheme] = React.useState<number>(0)
    const [openFaq, setOpenFaq] = React.useState<number | null>(null)

    const annualReturn = (capitalVolume * yieldRate) / 100
    const termReturn = (annualReturn * termMonths) / 12
    const monthlyPayout = termReturn / termMonths

    const fleetCapital = vehicleFleet * 1400000
    const weeklyPoolFlow = vehicleFleet * weeklyPayback
    const annualFleetRevenue = weeklyPoolFlow * 52
    const fleetROI = ((annualFleetRevenue / fleetCapital) * 100).toFixed(1)

    const handleRunSim = (e: React.FormEvent) => {
        e.preventDefault()
        setSimulating(true)
        setTimeout(() => {
            setSimulating(false)
            setResult({
                gross: termReturn,
                net: termReturn * 0.92,
                weekly: weeklyPoolFlow
            })
            toast.success("Simulation complete! Projected yield updated.")
        }, 1200)
    }

    const schemes = [
        {
            name: "Logistics & Tricycle Fleet HP Scheme",
            sector: "Transport (Keke)",
            target: 24000000,
            filled: 14800000,
            partnerShare: 60,
            duration: "18 months",
            minEntry: 500000,
            roi: "67.2%",
            status: "Open",
            color: "emerald"
        },
        {
            name: "Ariaria Artisan Capital Pool",
            sector: "Artisan / Leatherwork",
            target: 8000000,
            filled: 7100000,
            partnerShare: 55,
            duration: "12 months",
            minEntry: 200000,
            roi: "52.4%",
            status: "Closing Soon",
            color: "amber"
        },
        {
            name: "Agro-Tools Cooperative Grant",
            sector: "Agriculture",
            target: 15000000,
            filled: 3200000,
            partnerShare: 65,
            duration: "24 months",
            minEntry: 1000000,
            roi: "81.0%",
            status: "Open",
            color: "emerald"
        }
    ]

    const currentScheme = schemes[activeScheme]
    const fillPercent = Math.floor((currentScheme.filled / currentScheme.target) * 100)

    return (
        <div className="bg-background text-foreground min-h-[100dvh] font-sans selection:bg-emerald-500/30 overflow-x-hidden relative">
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute top-0 left-[20%] w-[600px] h-[600px] bg-emerald-600/4 dark:bg-emerald-500/7 rounded-full blur-[160px]" />
                <div className="absolute bottom-0 right-[10%] w-[500px] h-[500px] bg-amber-600/4 dark:bg-amber-500/6 rounded-full blur-[150px]" />
            </div>

            {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="relative max-w-7xl mx-auto pt-24 pb-16 px-6 md:px-8 z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                    <div className="lg:col-span-7 space-y-7">
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-wrap gap-2"
                        >
                            {[
                                { icon: ShieldCheck, label: "MFB Escrow-Protected", color: "emerald" },
                                { icon: Percent, label: "Structured Yield Splits", color: "amber" },
                                { icon: Globe, label: "Multi-Sector Schemes", color: "emerald" },
                            ].map((p, i) => (
                                <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${p.color === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400' : 'border-amber-500/30 bg-amber-500/8 text-amber-600 dark:text-amber-400'}`}>
                                    <p.icon className="h-3.5 w-3.5" /> {p.label}
                                </div>
                            ))}
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.7 }}
                            className="text-5xl md:text-7xl font-black tracking-tight leading-[1.02]"
                        >
                            Capital That Works{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-amber-500 dark:from-emerald-400 dark:to-amber-400">
                                For Everyone
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-muted-foreground text-base md:text-lg font-medium max-w-xl leading-relaxed"
                        >
                            Deploy private capital into real cooperative logistics — vehicle fleets, artisan tools, and agro-equipment. Earn structured yields cleared by our licensed partner microfinance vaults, with full escrow protection and real-time operator performance tracking.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2"
                        >
                            {[
                                { val: "₦2.4B+", label: "Total AUM" },
                                { val: "~68%", label: "Avg. Annual Yield" },
                                { val: "100%", label: "Escrow Protected" },
                            ].map((s, i) => (
                                <div key={i} className="text-center space-y-1">
                                    <p className="text-2xl md:text-3xl font-black">{s.val}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                                </div>
                            ))}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black font-black h-14 px-8 rounded-2xl shadow-xl border-0 group">
                                <Link href="/copteller/onboarding">
                                    Invest Now <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="border-slate-200 dark:border-slate-800 font-bold h-14 px-8 rounded-2xl text-sm">
                                <a href="#schemes">Browse Schemes</a>
                            </Button>
                        </motion.div>
                    </div>

                    {/* Right: Visual yield card stack */}
                    <div className="lg:col-span-5 flex justify-center relative">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-72 h-72 bg-amber-500/8 rounded-full blur-[80px]" />
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="relative w-full max-w-sm space-y-4"
                        >
                            {/* Floating card 1 */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Portfolio Value</p>
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">+14.8% YTD</span>
                                </div>
                                <p className="text-4xl font-black">₦8,460,000</p>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="w-3/4 h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full" />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                                    <span>Logistics & Tricycle Fleet HP Scheme</span>
                                    <span>75% filled</span>
                                </div>
                            </div>

                            {/* Floating card 2 */}
                            <div className="bg-gradient-to-br from-emerald-600 to-amber-500 rounded-3xl p-6 shadow-2xl shadow-emerald-950/20 space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-black/60 uppercase tracking-widest">Next Yield Payout</p>
                                    <div className="flex items-center gap-1.5 bg-black/10 rounded-full px-2 py-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-black/40 animate-pulse" />
                                        <span className="text-[8px] font-black text-black/60">Automated</span>
                                    </div>
                                </div>
                                <p className="text-3xl font-black text-black">₦124,800</p>
                                <p className="text-[10px] text-black/60 font-bold">Quarterly disbursement â€¢ Q3 2026</p>
                                <div className="flex items-center gap-2 text-[10px] font-black text-black/70">
                                    <CheckCircle2 className="h-4 w-4 text-black/50" /> Escrow vault confirmed
                                </div>
                            </div>

                            {/* Floating stats */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { val: "₦67,200", label: "Monthly accrual", color: "emerald" },
                                    { val: "98.7%", label: "Collection rate", color: "amber" },
                                ].map((s, i) => (
                                    <div key={i} className={`bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-2xl p-4 text-center ${i === 0 ? 'border-emerald-500/10' : 'border-amber-500/10'}`}>
                                        <p className={`text-xl font-black ${s.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{s.val}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground mt-0.5">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* â”€â”€ VALUE PILLARS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="bg-slate-50 dark:bg-slate-950/50 border-y border-slate-200 dark:border-slate-900 py-20 px-6 md:px-8 relative z-10 overflow-hidden">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="text-center space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Why Invest Through Copteller</p>
                        <h2 className="text-3xl md:text-5xl font-black">Built for Serious Capital Deployment</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: ShieldCheck, title: "MFB Escrow Vaults", desc: "All capital pools are held in licensed microfinance escrow accounts with NDIC deposit protections. Your funds are never co-mingled.", color: "emerald" },
                            { icon: Percent, title: "Guaranteed Yield Splits", desc: "You set your profit-share percentage upfront. Platform auto-calculates your yield from actual HP payback collections every week.", color: "amber" },
                            { icon: Activity, title: "Real-Time Operator Scores", desc: "Track every operator's payback streak, thrift consistency, and asset utilization from a live investor performance dashboard.", color: "emerald" },
                            { icon: BarChart3, title: "CBN-Compliant Reporting", desc: "All transactions and disbursements are logged and exportable in CBN regulatory format for tax and compliance purposes.", color: "amber" },
                        ].map((item, i) => (
                            <div key={i} className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-7 space-y-4 group hover:border-emerald-500/20 hover:shadow-xl transition-all duration-300">
                                <div className={`p-3 rounded-2xl w-fit ${item.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <h4 className="text-base font-black">{item.title}</h4>
                                <p className="text-xs text-muted-foreground font-semibold leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* â”€â”€ ACTIVE INVESTMENT SCHEMES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section id="schemes" className="max-w-7xl mx-auto py-24 px-6 md:px-8 relative z-10">
                <div className="text-center space-y-3 mb-12">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Active Schemes</p>
                    <h2 className="text-3xl md:text-5xl font-black">Browse Open Investment Pools</h2>
                    <p className="text-sm text-muted-foreground max-w-lg mx-auto">Each scheme is backed by real cooperative assets and cleared through licensed bank escrow. Choose your sector exposure.</p>
                </div>

                {/* Scheme tabs */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                    {schemes.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveScheme(i)}
                            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 border ${activeScheme === i
                                ? 'bg-gradient-to-r from-emerald-500 to-amber-500 text-black border-transparent shadow-lg'
                                : 'border-slate-200 dark:border-slate-800 text-muted-foreground hover:text-foreground'}`}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeScheme}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                    >
                        <div className="lg:col-span-8 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 space-y-7">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{currentScheme.sector}</p>
                                    <h3 className="text-2xl font-black">{currentScheme.name}</h3>
                                </div>
                                <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase tracking-widest ${currentScheme.status === 'Open' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                                    {currentScheme.status}
                                </span>
                            </div>

                            {/* Fill progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                    <span>Capital Pool Progress</span>
                                    <span>{fillPercent}% filled â€¢ ₦{currentScheme.filled.toLocaleString()} / ₦{currentScheme.target.toLocaleString()}</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 p-0.5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${fillPercent}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: "Partner Yield", val: currentScheme.partnerShare + "%", color: "amber" },
                                    { label: "Duration", val: currentScheme.duration, color: "emerald" },
                                    { label: "Min. Entry", val: `₦${currentScheme.minEntry.toLocaleString()}`, color: "amber" },
                                    { label: "Projected ROI", val: currentScheme.roi + " / yr", color: "emerald" },
                                ].map((stat, i) => (
                                    <div key={i} className={`bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center`}>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                        <p className={`text-xl font-black mt-1 ${stat.color === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{stat.val}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                {[
                                    "Capital secured in licensed MFB escrow vault",
                                    "Weekly HP payback collections feed yield calculations",
                                    "Quarterly yield disbursement to partner bank account",
                                    "Real-time operator performance scorecards available",
                                    "Full CBN-compliant audit trail and reporting",
                                ].map((f, i) => (
                                    <div key={i} className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        {f}
                                    </div>
                                ))}
                            </div>

                            <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black font-black rounded-2xl text-sm border-0 shadow-lg">
                                Apply to Join This Scheme
                            </Button>
                        </div>

                        <div className="lg:col-span-4 space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 space-y-4">
                                <h4 className="text-sm font-black">Quick Investment Preview</h4>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-black">
                                            <span className="text-muted-foreground">Your Capital</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">₦{capitalVolume.toLocaleString()}</span>
                                        </div>
                                        <input type="range" min={200000} max={10000000} step={200000} value={capitalVolume} onChange={e => setCapitalVolume(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                                    </div>
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-4 space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-muted-foreground">Your Yield Share ({currentScheme.partnerShare}%)</span>
                                        <span className="font-black text-amber-600 dark:text-amber-400">
                                            ₦{((capitalVolume * parseFloat(currentScheme.roi) / 100) * currentScheme.partnerShare / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} / yr
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-muted-foreground">Scheme Duration</span>
                                        <span className="font-black">{currentScheme.duration}</span>
                                    </div>
                                </div>
                                <p className="text-[9px] text-muted-foreground font-semibold">Yield estimates based on historical HP collection rates. Not a guarantee of returns.</p>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* â”€â”€ YIELD SIMULATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-900 py-24 px-6 md:px-8 relative z-10">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="text-center space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Advanced Simulator</p>
                        <h2 className="text-3xl md:text-5xl font-black">Run Your Own Yield Projection</h2>
                    </div>

                    <form onSubmit={handleRunSim} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 space-y-6">
                            <h4 className="text-lg font-black flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-500" /> Capital Return Modeller</h4>

                            {[
                                { label: "Capital to Deploy (₦)", val: `₦${capitalVolume.toLocaleString()}`, min: 200000, max: 20000000, step: 200000, value: capitalVolume, onChange: setCapitalVolume, color: "emerald", accentClass: "accent-emerald-500" },
                                { label: "Annual Yield Rate (%)", val: `${yieldRate}% / yr`, min: 8, max: 80, step: 2, value: yieldRate, onChange: setYieldRate, color: "amber", accentClass: "accent-amber-500" },
                                { label: "Investment Term (months)", val: `${termMonths} months`, min: 3, max: 36, step: 3, value: termMonths, onChange: setTermMonths, color: "emerald", accentClass: "accent-emerald-500" },
                            ].map((s, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-xs font-black">
                                        <span className="text-muted-foreground">{s.label}</span>
                                        <span className={s.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{s.val}</span>
                                    </div>
                                    <input type="range" min={s.min} max={s.max} step={s.step} value={s.value} onChange={e => s.onChange(Number(e.target.value))} className={`w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer ${s.accentClass}`} />
                                </div>
                            ))}

                            {/* Live preview below sliders */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Gross Return</p>
                                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₦{termReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Monthly Payout</p>
                                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">₦{monthlyPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                </div>
                            </div>

                            <Button type="submit" disabled={simulating} className="w-full h-12 bg-gradient-to-r from-emerald-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-black font-black rounded-2xl border-0 shadow-lg">
                                {simulating ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Running Simulation...</> : "Run Full Simulation"}
                            </Button>
                        </div>

                        <div className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 space-y-6">
                            <h4 className="text-lg font-black flex items-center gap-2"><Truck className="h-5 w-5 text-amber-500" /> Fleet HP Revenue Estimator</h4>

                            {[
                                { label: "Number of Vehicles in Fleet", val: `${vehicleFleet} Vehicles`, min: 1, max: 20, step: 1, value: vehicleFleet, onChange: setVehicleFleet, color: "amber", accentClass: "accent-amber-500" },
                                { label: "Weekly Payback Rate / Operator", val: `₦${weeklyPayback.toLocaleString()}`, min: 8000, max: 30000, step: 1000, value: weeklyPayback, onChange: setWeeklyPayback, color: "emerald", accentClass: "accent-emerald-500" },
                            ].map((s, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-xs font-black">
                                        <span className="text-muted-foreground">{s.label}</span>
                                        <span className={s.color === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>{s.val}</span>
                                    </div>
                                    <input type="range" min={s.min} max={s.max} step={s.step} value={s.value} onChange={e => s.onChange(Number(e.target.value))} className={`w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer ${s.accentClass}`} />
                                </div>
                            ))}

                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
                                {[
                                    { label: "Total Fleet Capital", val: `₦${fleetCapital.toLocaleString()}`, color: "amber" },
                                    { label: "Weekly Revenue Pool", val: `₦${weeklyPoolFlow.toLocaleString()}`, color: "emerald" },
                                    { label: "Annual HP Revenue", val: `₦${annualFleetRevenue.toLocaleString()}`, color: "amber" },
                                    { label: "Projected Fleet ROI", val: `${fleetROI}% / yr`, color: "emerald" },
                                ].map((row, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs font-bold border-b border-slate-100 dark:border-slate-800/50 pb-2 last:border-0 last:pb-0">
                                        <span className="text-muted-foreground">{row.label}</span>
                                        <span className={`font-black text-sm ${row.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{row.val}</span>
                                    </div>
                                ))}
                            </div>

                            <AnimatePresence>
                                {result && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-4 space-y-2"
                                    >
                                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Simulation Result</p>
                                        <p className="text-lg font-black">Net Payout: ₦{result.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                        <p className="text-xs text-muted-foreground font-semibold">After 8% platform clearing fee over {termMonths} months.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </form>
                </div>
            </section>

            {/* â”€â”€ COMPLIANCE STRIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="bg-slate-950 dark:bg-[#020202] py-16 px-6 md:px-8 relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(16,185,129,0.05),transparent_60%)] pointer-events-none" />
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center text-center">
                        <div className="md:col-span-2 text-left space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Compliance & Safety</p>
                            <h3 className="text-2xl font-black text-white">Regulatory Backed & Investor-Safe</h3>
                            <p className="text-xs text-slate-500 font-semibold leading-relaxed">All investment schemes on Copteller operate within the regulatory framework of licensed Nigerian Microfinance Banks.</p>
                        </div>
                        {[
                            { label: "CBN Regulatory Guidelines", icon: ShieldCheck },
                            { label: "NDIC Deposit Insurance", icon: Lock },
                            { label: "CAC Registered Cooperatives", icon: Building2 },
                            { label: "FIRS Tax Compliance", icon: CheckCircle2 },
                        ].map((c, i) => (
                            <div key={i} className="border border-emerald-900/30 bg-emerald-950/10 rounded-2xl p-5 space-y-3 text-center">
                                <c.icon className="h-6 w-6 text-emerald-400 mx-auto" />
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider">{c.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── UNDERWRITER FAQS ── */}
            <section className="max-w-4xl mx-auto py-24 px-6 md:px-8 relative z-10 space-y-12">
                <div className="text-center space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-650 dark:text-emerald-450">Frequently Asked Questions</p>
                    <h2 className="text-3xl md:text-5xl font-black">Underwriting FAQ</h2>
                </div>

                <div className="space-y-4 font-bold">
                    {[
                        {
                            q: "How are yields calculated and when are payouts cleared?",
                            a: "Yields are derived from the weekly payback repayments collected from cooperative operators. Payouts are auto-split at source and cleared directly to your partner bank account quarterly."
                        },
                        {
                            q: "What protection do underwriters have against operator defaults?",
                            a: "All capital is held in licensed MFB escrow vaults. In the event of default, the vehicle/asset is remotely tracked and reclaimed via our transport guild enforcement bylaws, or offset against cooperative reserve capital buffers."
                        },
                        {
                            q: "Is there a minimum lock-up period for capital?",
                            a: "Yes, capital deployed into cooperative schemes has a locked duration matching the scheme term (typically 12 to 24 months) to ensure stable operator cycles and equipment leasing."
                        },
                        {
                            q: "Can I monitor the performance of operators in real-time?",
                            a: "Yes! The underwriter dashboard provides direct scores on weekly payback streaks, vehicle maintenance logs, and active routing metrics."
                        }
                    ].map((faq, idx) => {
                        const isOpen = openFaq === idx
                        return (
                            <div key={idx} className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-2xl overflow-hidden transition-all">
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                                    className="w-full px-6 py-5 flex justify-between items-center text-left text-xs font-black text-foreground"
                                >
                                    <span>{faq.q}</span>
                                    <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-90 text-emerald-500' : ''}`} />
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
                                            <div className="px-6 pb-5 text-xs text-muted-foreground font-semibold leading-relaxed border-t pt-3">
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

            {/* ── CTA ── */}
            <section className="py-8 px-6 md:px-8 pb-24 relative z-10">
                <div className="max-w-4xl mx-auto bg-gradient-to-r from-emerald-600 to-amber-500 rounded-[48px] p-14 md:p-20 text-center space-y-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none" />
                    <div className="relative z-10 space-y-5">
                        <h2 className="text-4xl md:text-5xl font-black text-black">Start Earning Structured Yields Today</h2>
                        <p className="text-black/70 max-w-xl mx-auto text-sm font-semibold">Join Copteller's investor network and deploy capital into real cooperative assets with MFB-protected escrow and automated quarterly payouts.</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button asChild size="lg" className="bg-black text-white hover:bg-slate-900 font-black h-14 px-8 rounded-2xl text-sm border-0 shadow-2xl">
                                <Link href="/copteller/onboarding">Invest Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="border-black/30 text-black hover:bg-black/10 font-bold h-14 px-8 rounded-2xl text-sm">
                                <Link href="/copteller/governance">View Governance & Compliance</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

