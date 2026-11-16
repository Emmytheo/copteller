"use client"

import * as React from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import {
    Users, PiggyBank, ArrowRight, ShieldCheck, TrendingUp, DollarSign,
    Smartphone, ChevronRight, Award, Briefcase, Percent, Car, Activity,
    Coins, HeartHandshake, Wifi, Signal, Battery, Menu, Bell,
    Zap, Globe, Lock, BarChart3, Building2, Check, Star,
    ArrowUpRight, Truck, Target, Cpu, KeyRound, Sparkles, Clock,
    CircleDollarSign, Layers, FlaskConical
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// â”€â”€â”€ ANIMATED COUNTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AnimatedCounter({ target, prefix = "", suffix = "", duration = 2000 }: {
    target: number, prefix?: string, suffix?: string, duration?: number
}) {
    const [count, setCount] = React.useState(0)
    const ref = React.useRef(null)
    const inView = useInView(ref, { once: true })

    React.useEffect(() => {
        if (!inView) return
        let startTime: number | null = null
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)
            setCount(Math.floor(progress * target))
            if (progress < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
    }, [inView, target, duration])

    return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

// â”€â”€â”€ STAT CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({ label, value, sub, color = "emerald" }: {
    label: string, value: React.ReactNode, sub: string, color?: "emerald" | "amber" | "orange"
}) {
    const colors = {
        emerald: "from-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        amber: "from-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
        orange: "from-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
    }
    return (
        <div className={`bg-gradient-to-br ${colors[color]} to-transparent border rounded-2xl p-6 text-center space-y-2 backdrop-blur-md`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="text-3xl font-black">{value}</p>
            <p className="text-[10px] font-semibold text-muted-foreground">{sub}</p>
        </div>
    )
}

// â”€â”€â”€ FEATURE PILL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FeaturePill({ icon: Icon, label, color }: { icon: React.ElementType, label: string, color: string }) {
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${color}`}>
            <Icon className="h-3.5 w-3.5" />
            {label}
        </div>
    )
}

export default function CoptellerLandingPage() {
    const [contribAmount, setContribAmount] = React.useState<number>(20000)
    const [cycleSlots, setCycleSlots] = React.useState<number>(8)
    const [cycleFrequency, setCycleFrequency] = React.useState<'daily' | 'weekly' | 'monthly'>('weekly')
    const [kekeCount, setKekeCount] = React.useState<number>(4)
    const [weeklyRate, setWeeklyRate] = React.useState<number>(18000)
    const [mockBalance, setMockBalance] = React.useState<number>(84500)
    const [mockAjoProgress, setMockAjoProgress] = React.useState<number>(65)
    const [mockHailingTrips, setMockHailingTrips] = React.useState<number>(18)
    const [activeTab, setActiveTab] = React.useState<'members' | 'admins' | 'investors'>('members')

    const totalPool = contribAmount * cycleSlots
    const cycleDurationDays = cycleSlots * (cycleFrequency === 'daily' ? 1 : cycleFrequency === 'weekly' ? 7 : 30)
    const totalKekeInvestment = kekeCount * 1400000
    const weeklyRevenue = kekeCount * weeklyRate
    const annualHPRevenue = weeklyRevenue * 52
    const roiPercentage = ((annualHPRevenue / totalKekeInvestment) * 100).toFixed(1)

    const stakeholderContent = {
        members: {
            title: "For Members & Operators",
            tagline: "From daily hustler to asset owner — in structured steps.",
            color: "emerald",
            items: [
                { icon: PiggyBank, title: "Automated Ajo Thrift", desc: "Daily auto-deductions build your savings pool without lifting a finger. Set it, forget it, collect it." },
                { icon: Truck, title: "Path to Asset Ownership", desc: "Hire Purchase contracts give you a structured route to full ownership of your tools, equipment, or vehicle — no lump sum needed." },
                { icon: Award, title: "Non-Repayable Tool Grants", desc: "Qualifying members get ₦200K+ in tools and capital grants sponsored by trade unions and public programs." },
                { icon: CircleDollarSign, title: "Digital Wallet & Settlement", desc: "Instant settlement wallet for fares, trade income, and loan disbursements. One ledger, zero cash handling." },
            ]
        },
        admins: {
            title: "For Cooperative Admins",
            tagline: "Stop chasing cash. Let the platform collect, reconcile, and report.",
            color: "amber",
            items: [
                { icon: BarChart3, title: "Digital HP Collections", desc: "100% digital collection of dues and weekly repayments from every operator. No more disputes or errors." },
                { icon: Users, title: "Operator Matching Engine", desc: "Assign vehicles to unmatched members in seconds. Track payback performance in real-time." },
                { icon: Layers, title: "Automated Ledger Audit Trail", desc: "Every transaction, deduction, and payout is automatically logged, auditable, and compliant with MFB regulations." },
                { icon: Target, title: "Smart Grant Distribution", desc: "Define grant eligibility rules and disburse capital to qualifying members with one-click bank clearance." },
            ]
        },
        investors: {
            title: "For Investors & Sponsors",
            tagline: "Structured yields. Escrow security. Real-world impact.",
            color: "orange",
            items: [
                { icon: Percent, title: "Guaranteed Yield Splits", desc: "Configure your profit-sharing percentage upfront. Yields are auto-calculated and cleared by our licensed vaults." },
                { icon: ShieldCheck, title: "MFB-Backed Escrow Accounts", desc: "All capital pools are held in regulated microfinance escrow with full NDIC deposit protections." },
                { icon: Activity, title: "Real-Time Performance Scoring", desc: "Track every operator's repayment streak, thrift score, and asset utilization from the investor console." },
                { icon: Globe, title: "Scalable Portfolio Deployment", desc: "Deploy capital into multiple cooperative schemes across sectors — transport, agro, artisan, and more." },
            ]
        }
    }

    const tab = stakeholderContent[activeTab]

    return (
        <div className="bg-background text-foreground font-sans selection:bg-emerald-500/30 overflow-x-hidden relative">

            {/* Ambient orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[10%] w-[700px] h-[700px] bg-emerald-600/5 dark:bg-emerald-500/8 rounded-full blur-[180px]" />
                <div className="absolute top-[40%] right-[5%] w-[500px] h-[500px] bg-amber-600/5 dark:bg-amber-500/7 rounded-full blur-[160px]" />
                <div className="absolute bottom-0 left-[30%] w-[600px] h-[400px] bg-emerald-700/3 dark:bg-emerald-700/5 rounded-full blur-[140px]" />
            </div>

            {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="relative max-w-7xl mx-auto pt-28 pb-20 px-6 md:px-8 z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

                    {/* Left pitch */}
                    <div className="lg:col-span-7 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-wrap gap-2"
                        >
                            <FeaturePill icon={Award} label="Bank-Audited" color="border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400" />
                            <FeaturePill icon={ShieldCheck} label="MFB Licensed Escrow" color="border-amber-500/30 bg-amber-500/8 text-amber-600 dark:text-amber-400" />
                            <FeaturePill icon={Zap} label="Automated Settlements" color="border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" />
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1 }}
                            className="text-5xl md:text-7xl lg:text-[88px] font-black tracking-tight leading-[1.02]"
                        >
                            The Future of{" "}
                            <span className="relative">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 dark:from-emerald-400 dark:via-amber-400 dark:to-orange-400">
                                    Cooperative
                                </span>
                            </span>
                            {" "}Finance
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="text-muted-foreground text-base md:text-lg font-medium max-w-xl leading-relaxed"
                        >
                            Copteller is a dedicated, bank-audited sub-platform transforming how trade guilds, transport networks, and market unions manage savings, assets, and capital. Digitize your daily Ajo, automate Hire Purchase, unlock grants — all in one secure ecosystem.
                        </motion.p>

                        {/* Proof stats row */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.3 }}
                            className="flex flex-wrap gap-6 pt-2 text-sm"
                        >
                            {[
                                { val: "₦2.4B+", label: "Assets under management" },
                                { val: "4,800+", label: "Active operators" },
                                { val: "98.7%", label: "On-time repayment rate" },
                            ].map((s, i) => (
                                <div key={i} className="space-y-0.5">
                                    <p className="text-2xl font-black text-foreground">{s.val}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                                </div>
                            ))}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="flex flex-col sm:flex-row gap-4 pt-2"
                        >
                            <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black font-black h-14 px-8 rounded-2xl shadow-2xl shadow-emerald-950/20 text-sm border-0 group">
                                <Link href="/copteller/onboarding">
                                    Enter Portal <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-900/50 text-foreground font-bold h-14 px-8 rounded-2xl text-sm">
                                <a href="#simulators">Try Live Calculators</a>
                            </Button>
                        </motion.div>
                    </div>

                    {/* Right: Phone mockup */}
                    <div className="lg:col-span-5 flex justify-center relative">
                        {/* Glow behind phone */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-64 h-64 bg-emerald-500/15 rounded-full blur-[80px]" />
                        </div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
                            className="w-[300px] bg-[#0a0a0a] rounded-[3.5rem] overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.6)] relative border-[7px] border-[#1a1a1a] z-10 hover:scale-[1.03] hover:shadow-[0_50px_140px_rgba(16,185,129,0.15)] transition-all duration-700"
                        >
                            {/* Dynamic Island */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-28 h-8 bg-[#0a0a0a] rounded-full border border-[#222] flex items-center justify-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px] font-bold text-slate-400 tracking-wider">COPTELLER</span>
                                </div>
                            </div>

                            <div className="p-4 space-y-3 min-h-[500px] bg-[#0a0a0a]">
                                {/* Greeting */}
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold">Transport Cooperative Member</p>
                                        <h4 className="text-sm font-black text-slate-100">Kalu Onyekachi ðŸ‘‹</h4>
                                    </div>
                                    <div className="relative">
                                        <Bell className="text-amber-400 w-5 h-5 cursor-pointer" />
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#0a0a0a]" />
                                    </div>
                                </div>

                                {/* Wallet widget */}
                                <div className="bg-gradient-to-br from-emerald-900/60 to-emerald-950/40 border border-emerald-800/30 rounded-2xl p-4 relative overflow-hidden">
                                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl" />
                                    <p className="text-[9px] text-emerald-300/80 font-bold uppercase tracking-widest">Copteller Escrow Wallet</p>
                                    <div className="flex justify-between items-baseline mt-1.5">
                                        <p className="text-2xl font-black text-white">₦{mockBalance.toLocaleString()}</p>
                                        <span className="text-[8px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                                    </div>
                                    <div className="flex gap-2 text-[9px] font-black pt-3.5">
                                        <button onClick={() => setMockBalance(prev => prev + 5000)} className="bg-emerald-500 text-black py-1.5 rounded-xl flex-1 hover:bg-emerald-400 active:scale-95 transition-all border-0">+ Deposit</button>
                                        <button onClick={() => setMockBalance(prev => Math.max(0, prev - 5000))} className="bg-[#1a1a1a] text-slate-300 py-1.5 rounded-xl flex-1 hover:bg-[#222] active:scale-95 transition-all border border-slate-800">Transfer â†’</button>
                                    </div>
                                </div>

                                {/* Ajo tracker */}
                                <div className="bg-[#111] border border-[#222] p-3 rounded-2xl space-y-2">
                                    <div className="flex justify-between text-[8px] font-extrabold text-slate-400">
                                        <span>Rotational Ajo Cycle</span>
                                        <span className="text-amber-400">{mockAjoProgress}% Complete</span>
                                    </div>
                                    <div className="w-full bg-[#1a1a1a] h-2 rounded-full overflow-hidden">
                                        <div className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${mockAjoProgress}%` }} />
                                    </div>
                                    <div className="flex justify-between text-[7px] text-slate-500 font-bold">
                                        <span>Slot 4 of {cycleSlots}</span>
                                        <button className="hover:text-emerald-400 transition-colors" onClick={() => setMockAjoProgress(p => p >= 100 ? 10 : p + 10)}>Next Cycle â†’</button>
                                    </div>
                                </div>

                                {/* HP progress */}
                                <div className="bg-[#111] border border-[#222] p-3.5 rounded-2xl space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-extrabold text-slate-200">Asset lease (Keke / Equipment)</span>
                                        <span className="text-[7px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Active HP</span>
                                    </div>
                                    <div className="flex justify-between text-[8px] text-slate-500 font-bold">
                                        <span>Paid: ₦420,000</span><span>Goal: ₦1.4M</span>
                                    </div>
                                    <div className="w-full bg-[#1a1a1a] h-2 rounded-full overflow-hidden">
                                        <div className="bg-amber-500 h-full rounded-full" style={{ width: '30%' }} />
                                    </div>
                                </div>

                                {/* Mobility teaser */}
                                <div className="bg-gradient-to-br from-amber-950/30 to-transparent border border-amber-900/20 p-3 rounded-2xl space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-extrabold text-amber-300 flex items-center gap-1"><Car className="h-3 w-3" /> Mobility Suite</span>
                                        <span className="text-[7px] font-black text-emerald-400 animate-pulse">â— Online</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[8px]">
                                        <div className="bg-[#1a1a1a] rounded-xl p-2 text-center">
                                            <p className="text-slate-400 font-bold">Trips This Week</p>
                                            <p className="text-slate-100 font-black text-sm">{mockHailingTrips}</p>
                                        </div>
                                        <div className="bg-[#1a1a1a] rounded-xl p-2 text-center">
                                            <p className="text-slate-400 font-bold">Net Earnings</p>
                                            <p className="text-emerald-400 font-black text-sm">₦{(mockHailingTrips * 3500).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setMockHailingTrips(p => p + 1)} className="text-[8px] font-black text-amber-300 hover:text-amber-200 flex items-center gap-0.5 w-full justify-end">
                                        Complete Trip <ChevronRight className="h-2.5 w-2.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Home bar */}
                            <div className="h-8 bg-[#0a0a0a] flex items-center justify-center">
                                <div className="w-24 h-1 bg-[#2a2a2a] rounded-full" />
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Trust logos row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-20 pt-8 border-t border-slate-200 dark:border-slate-900/80 flex flex-wrap justify-center items-center gap-6 md:gap-12"
                >
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest w-full md:w-auto text-center">Compliant with & backed by</p>
                    {["CBN Guidelines", "NDIC Protected", "MFB Licensed Vaults", "CAC Registered Unions", "FIRS Tax Compliant"].map((l, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                            <Check className="h-3.5 w-3.5 text-emerald-500" /> {l}
                        </div>
                    ))}
                </motion.div>
            </section>

            {/* â”€â”€ HOW IT WORKS STRIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="bg-slate-50 dark:bg-slate-950/50 border-y border-slate-200 dark:border-slate-900 py-20 px-6 md:px-8 relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(16,185,129,0.04),transparent_60%)] pointer-events-none" />
                <div className="max-w-7xl mx-auto space-y-14">
                    <div className="text-center space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Platform Mechanics</p>
                        <h2 className="text-3xl md:text-5xl font-black">How Copteller Works</h2>
                        <p className="text-sm text-muted-foreground max-w-lg mx-auto">From onboarding to yield distribution — a fully automated, bank-cleared pipeline.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        {[
                            { step: "01", icon: Building2, title: "Union Registers", desc: "Cooperative admin onboards the guild with member rosters, escrow vaults, and sector classification. All verified under licensed microfinance mandate.", color: "emerald" },
                            { step: "02", icon: Cpu, title: "Platform Deploys", desc: "Smart workflow automations configure thrift cycles, HP contracts, grant eligibility rules, and API-linked payment routing — instantly.", color: "amber" },
                            { step: "03", icon: Coins, title: "Members Transact", desc: "Operators save daily, make HP paybacks, claim grants, and track assets from a single mobile-first workspace — fully digital, zero paper.", color: "emerald" },
                            { step: "04", icon: TrendingUp, title: "Yields Distribute", desc: "Partner investors receive automated split payouts. The bank clearing engine audits, settles, and logs every transaction in real time.", color: "amber" },
                        ].map((item, i) => (
                            <div key={i} className="bg-slate-50 dark:bg-slate-950/80 p-8 space-y-4 group hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className={`p-2.5 rounded-xl ${item.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <span className="text-3xl font-black text-slate-100 dark:text-slate-800 group-hover:text-emerald-100 dark:group-hover:text-emerald-900/50 transition-colors">{item.step}</span>
                                </div>
                                <h3 className="text-lg font-black">{item.title}</h3>
                                <p className="text-xs text-muted-foreground font-semibold leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* â”€â”€ STAKEHOLDER TABS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="max-w-7xl mx-auto py-24 px-6 md:px-8 relative z-10">
                <div className="text-center space-y-3 mb-14">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Built for Everyone in the Ecosystem</p>
                    <h2 className="text-3xl md:text-5xl font-black">A Triple-Win Platform</h2>
                    <p className="text-sm text-muted-foreground max-w-xl mx-auto">Copteller aligns the interests of every stakeholder — members grow wealth, admins gain control, investors earn yields.</p>
                </div>

                {/* Tab switcher */}
                <div className="flex justify-center mb-10">
                    <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 gap-1">
                        {([
                            { key: 'members', label: 'Members' },
                            { key: 'admins', label: 'Admins' },
                            { key: 'investors', label: 'Investors' }
                        ] as const).map(t => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all duration-300 ${activeTab === t.key
                                    ? 'bg-gradient-to-r from-emerald-500 to-amber-500 text-black shadow-lg'
                                    : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-black">{tab.title}</h3>
                            <p className="text-sm text-muted-foreground font-semibold italic">{tab.tagline}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {tab.items.map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 space-y-4 group hover:border-emerald-500/20 hover:shadow-xl hover:shadow-emerald-950/5 transition-all duration-300"
                                >
                                    <div className={`p-3 rounded-2xl w-fit ${tab.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : tab.color === 'amber' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <h4 className="text-sm font-black leading-snug">{item.title}</h4>
                                    <p className="text-xs text-muted-foreground font-semibold leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* â”€â”€ LIVE METRICS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="bg-slate-950 dark:bg-[#030303] py-20 px-6 md:px-8 relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.08),transparent_60%)] pointer-events-none" />
                <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                    <div className="text-center space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Platform Metrics</p>
                        <h2 className="text-3xl md:text-5xl font-black text-white">Numbers That Matter</h2>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: "Active Cooperative Unions", val: 47, suffix: "+", color: "emerald" as const, sub: "Across 12 trade sectors" },
                            { label: "Weekly HP Collections", val: 4, prefix: "₦", suffix: ".8M", color: "amber" as const, sub: "Automated clearance" },
                            { label: "Operators with HP Assets", val: 1240, suffix: "+", color: "emerald" as const, sub: "Active vehicle contracts" },
                            { label: "Avg. Member Credit Score", val: 91, suffix: "/100", color: "amber" as const, sub: "Behavioural credit index" },
                        ].map((s, i) => (
                            <div key={i} className={`border rounded-3xl p-6 text-center space-y-2 ${s.color === 'emerald' ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-amber-900/50 bg-amber-950/20'}`}>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{s.label}</p>
                                <p className={`text-4xl font-black ${s.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    <AnimatedCounter target={s.val} prefix={s.prefix ?? ""} suffix={s.suffix ?? ""} />
                                </p>
                                <p className="text-[10px] font-semibold text-slate-500">{s.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* â”€â”€ MOBILITY SUITE TEASER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="max-w-7xl mx-auto py-24 px-6 md:px-8 relative z-10">
                <div className="relative rounded-[48px] overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-amber-950 dark:from-[#050f08] dark:via-[#050505] dark:to-[#0f0a02] border border-emerald-900/30 p-10 md:p-16">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(16,185,129,0.12),transparent_50%)] pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(245,158,11,0.08),transparent_50%)] pointer-events-none" />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
                        <div className="lg:col-span-7 space-y-7">
                            <div className="flex items-center gap-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                    <Car className="h-3.5 w-3.5 animate-pulse" /> Exclusive Member Incentive
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-950/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                                    <Sparkles className="h-3 w-3" /> Coming Soon
                                </div>
                            </div>

                            <h3 className="text-4xl md:text-6xl font-black text-white leading-tight">
                                Proprietary Gig &
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-400"> Service Marketplace</span>
                            </h3>

                            <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed max-w-2xl">
                                We are building a proprietary gig and service matching platform purpose-built for cooperative operators — including transport drivers, farmers, and artisans. Active members in good standing will gain early access to job booking feeds, direct repayment integrations, and priority job allocations that competitors simply cannot offer.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {[
                                    { icon: Zap, label: "Payback deducted at source from jobs/fares", color: "text-emerald-400" },
                                    { icon: Star, label: "Priority bookings for top-rated HP operators", color: "text-amber-400" },
                                    { icon: Clock, label: "Zero-deposit upgrades for high scorers", color: "text-emerald-400" },
                                    { icon: Lock, label: "Member-only: not publicly available", color: "text-amber-400" },
                                ].map((f, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                                        <div className={`p-1.5 rounded-lg bg-slate-800/50 ${f.color}`}>
                                            <f.icon className="h-3.5 w-3.5" />
                                        </div>
                                        {f.label}
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2">
                                <p className="text-xs font-bold text-slate-500 italic">Register and maintain active membership to secure your place in the early-access rollout.</p>
                            </div>
                        </div>

                        <div className="lg:col-span-5 flex justify-center">
                            <div className="w-full max-w-xs bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 space-y-6 text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-amber-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-emerald-950/50">
                                    <Car className="h-8 w-8 text-black" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Roadmap Restricted</p>
                                    <h4 className="text-lg font-black text-white">Mobility Suite v1.0</h4>
                                    <p className="text-xs text-slate-500 font-semibold">Full details revealed exclusively to registered, active cooperative members upon platform launch.</p>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="w-2/3 h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full" />
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold">Development Progress: 68%</p>
                                <Button disabled className="w-full h-11 bg-slate-800 text-slate-500 border border-slate-700 rounded-2xl text-xs font-black cursor-not-allowed">
                                    Access Locked — Register to Qualify
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* â”€â”€ INTERACTIVE SIMULATORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section id="simulators" className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-900 py-24 px-6 md:px-8 relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(245,158,11,0.04),transparent_60%)] pointer-events-none" />
                <div className="max-w-7xl mx-auto space-y-14 relative z-10">
                    <div className="text-center space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Interactive Estimators</p>
                        <h2 className="text-3xl md:text-5xl font-black">Simulate Your Yields & Contracts</h2>
                        <p className="text-sm text-muted-foreground max-w-xl mx-auto">Drag the sliders to model your cooperative's financial potential — live and dynamic.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Ajo Pool Calculator */}
                        <div className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 shadow-xl space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                            <PiggyBank className="h-5 w-5" />
                                        </div>
                                        <h4 className="text-xl font-black">Ajo Cycle Pool Estimator</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground font-medium pl-10">Model contributions and payouts across your union circle.</p>
                                </div>
                                <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest">Rotational Esusu</span>
                            </div>

                            <div className="space-y-5">
                                {[
                                    { label: "Member Contribution Amount", val: `₦${contribAmount.toLocaleString()}`, min: 5000, max: 100000, step: 5000, value: contribAmount, onChange: setContribAmount, color: "accent-emerald-500" },
                                    { label: "Number of Members (Slots)", val: `${cycleSlots} Members`, min: 3, max: 24, step: 1, value: cycleSlots, onChange: setCycleSlots, color: "accent-emerald-500" },
                                ].map((slider, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-xs font-black">
                                            <span className="text-muted-foreground">{slider.label}</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">{slider.val}</span>
                                        </div>
                                        <input type="range" min={slider.min} max={slider.max} step={slider.step} value={slider.value} onChange={e => slider.onChange(Number(e.target.value))} className={`w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer ${slider.color}`} />
                                    </div>
                                ))}

                                <div className="space-y-2">
                                    <span className="text-xs font-black text-muted-foreground block">Rotation Frequency</span>
                                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        {(['daily', 'weekly', 'monthly'] as const).map(f => (
                                            <button key={f} onClick={() => setCycleFrequency(f)} className={`flex-1 py-2 text-xs font-black rounded-xl transition-all capitalize ${cycleFrequency === f ? 'bg-emerald-600 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>{f}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-slate-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-6 grid grid-cols-2 gap-6 text-center">
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total Cycle Pool</p>
                                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₦{totalPool.toLocaleString()}</p>
                                    <p className="text-[9px] text-muted-foreground mt-1">Each member receives this</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total Cycle Duration</p>
                                    <p className="text-3xl font-black mt-1">{cycleDurationDays} days</p>
                                    <p className="text-[9px] text-muted-foreground mt-1">{cycleSlots} rotation slots</p>
                                </div>
                            </div>
                        </div>

                        {/* HP Partnership Estimator */}
                        <div className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 shadow-xl space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                                            <Percent className="h-5 w-5" />
                                        </div>
                                        <h4 className="text-xl font-black">HP Yield Calculator</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground font-medium pl-10">Model fleet payouts, weekly rentals & annual partner yield.</p>
                                </div>
                                <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest">Asset Partnership</span>
                            </div>

                            <div className="space-y-5">
                                {[
                                    { label: "Leased Assets (Keke/Equipment)", val: `${kekeCount} Units`, min: 1, max: 20, step: 1, value: kekeCount, onChange: setKekeCount, color: "accent-amber-500" },
                                    { label: "Weekly Hire Payback Rate / Operator", val: `₦${weeklyRate.toLocaleString()}`, min: 8000, max: 30000, step: 1000, value: weeklyRate, onChange: setWeeklyRate, color: "accent-amber-500" },
                                ].map((slider, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-xs font-black">
                                            <span className="text-muted-foreground">{slider.label}</span>
                                            <span className="text-amber-600 dark:text-amber-400">{slider.val}</span>
                                        </div>
                                        <input type="range" min={slider.min} max={slider.max} step={slider.step} value={slider.value} onChange={e => slider.onChange(Number(e.target.value))} className={`w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer ${slider.color}`} />
                                    </div>
                                ))}

                                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                        <span>Total Capital Deployed</span>
                                        <span className="font-black text-foreground">₦{totalKekeInvestment.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                        <span>Weekly Collection Target</span>
                                        <span className="font-black text-foreground">₦{weeklyRevenue.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-amber-50 to-slate-50 dark:from-amber-950/30 dark:to-slate-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 grid grid-cols-2 gap-6 text-center">
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Projected Annual Revenue</p>
                                    <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">₦{annualHPRevenue.toLocaleString()}</p>
                                    <p className="text-[9px] text-muted-foreground mt-1">Across {kekeCount} asset units</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Est. Partner Yield (ROI)</p>
                                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">~{roiPercentage}%</p>
                                    <p className="text-[9px] text-muted-foreground mt-1">Annual return on capital</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TRUST & COMPLIANCE SECTION ── */}
            <section className="bg-slate-100/50 dark:bg-slate-900/30 border-y border-slate-200 dark:border-slate-800 py-24 px-6 md:px-8 relative z-10 overflow-hidden">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center font-sans">
                    <div className="lg:col-span-5 space-y-6">
                        <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
                            MFB Security Core
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black leading-tight">
                            Regulated Trust. Bank-Audited Security.
                        </h2>
                        <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                            Copteller is integrated into the core banking systems of our licensed partner Microfinance Banks. Every single transaction, contribution, or loan amortization pool is logged directly onto bank ledger records, providing unmatched regulatory safety.
                        </p>
                        <div className="space-y-4">
                            {[
                                { title: "NDIC Deposit Protection", desc: "Cooperative savings are held inside FDIC-equivalent insured escrow accounts." },
                                { title: "Regulator Portal Compliance", desc: "Abia State cooperative regulators hold dedicated audit logins to verify reserve capital pools." },
                                { title: "Double-Entry Ledger Integrity", desc: "No manual adjustments. Automated core ledgers align in real-time with banking clearing records." }
                            ].map((item, idx) => (
                                <div key={idx} className="flex gap-3">
                                    <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 shrink-0 h-fit">
                                        <Check className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black">{item.title}</h4>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { title: "Vault Protection", count: "100% Escrowed", sub: "Fully backed by microfinance clearing balances" },
                            { title: "Auditing Interval", count: "Real-time API", sub: "Instant ledger transaction audits" },
                            { title: "Capital Reserve Rate", count: "1:1 Backed", sub: "Every kobo of savings is fully backed by reserves" },
                            { title: "Compliance Rating", count: "A+ Audited", sub: "Fully cleared by state regulation officers" },
                        ].map((stat, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 space-y-2">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stat.count}</p>
                                <p className="text-[10px] text-slate-500 font-semibold mt-1">{stat.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS & TRUST STORIES ── */}
            <section className="py-24 px-6 md:px-8 relative z-10 max-w-7xl mx-auto space-y-12">
                <div className="text-center space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Success Stories</p>
                    <h2 className="text-3xl md:text-5xl font-black">Trusted by Leading Cooperative Guilds</h2>
                    <p className="text-sm text-muted-foreground max-w-xl mx-auto">See how transport unions, agricultural societies, and market trade guilds are transforming their savings and asset cycles.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        {
                            quote: "Copteller completely removed the headache of manually collecting daily contributions from our Keke operators. Payment compliance went from 60% to 98% in two months.",
                            author: "Chief Chinedu Nwachukwu",
                            role: "General Secretary, Abia Transport Guild",
                            tags: ["Transport", "Keke Fleet"]
                        },
                        {
                            quote: "The Hire Purchase asset allocation engine allowed us to easily verify which members were ready for tractor leases. The automated escrow payouts make our audits completely transparent.",
                            author: "Dr. Ngozi Okoronkwo",
                            role: "President, Abia Farmers Cooperative Union",
                            tags: ["Agriculture", "Asset Leasing"]
                        },
                        {
                            quote: "Our Ajo thrift rotational groups are now managed digitally with zero cash handling. The bank-regulated deposit protection gives our trade members absolute peace of mind.",
                            author: "Alhaji Ibrahim Danladi",
                            role: "Treasurer, Ariaria Market Traders Association",
                            tags: ["Commerce", "Ajo Savings"]
                        }
                    ].map((t, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 space-y-6 flex flex-col justify-between hover:border-amber-500/20 hover:shadow-md transition-all duration-300">
                            <p className="text-xs font-semibold text-muted-foreground leading-relaxed italic">
                                "{t.quote}"
                            </p>
                            <div className="space-y-3">
                                <div className="border-t pt-4">
                                    <h4 className="text-xs font-black text-foreground">{t.author}</h4>
                                    <p className="text-[9px] text-muted-foreground font-bold mt-0.5">{t.role}</p>
                                </div>
                                <div className="flex gap-1.5">
                                    {t.tags.map(tag => (
                                        <Badge key={tag} className="text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none px-2 py-0.5">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── INTEGRATIONS STRIP ── */}
            <section className="max-w-7xl mx-auto py-24 px-6 md:px-8 relative z-10">
                <div className="text-center space-y-3 mb-14">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Platform Integrations</p>
                    <h2 className="text-3xl md:text-5xl font-black">Powered by Best-in-Class APIs</h2>
                    <p className="text-sm text-muted-foreground max-w-lg mx-auto">Copteller connects to the entire Nigerian fintech ecosystem through a secure Service Vault layer.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: "Payment Processors", icon: CircleDollarSign, color: "emerald", desc: "Paystack, Flutterwave" },
                        { label: "Core Banking APIs", icon: Building2, color: "amber", desc: "Licensed MFB vaults" },
                        { label: "KYC & BVN Verify", icon: ShieldCheck, color: "emerald", desc: "NIBSS, Smile Identity" },
                        { label: "Loan & Credit APIs", icon: TrendingUp, color: "amber", desc: "Credit Bureau links" },
                        { label: "Workflow Engine", icon: Cpu, color: "emerald", desc: "Automated operations" },
                        { label: "Secure Vault", icon: Lock, color: "amber", desc: "API key management" },
                    ].map((int, i) => (
                        <div key={i} className={`bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 text-center space-y-3 group hover:border-${int.color}-500/20 hover:scale-105 transition-all duration-300`}>
                            <div className={`p-2.5 rounded-xl mx-auto w-fit ${int.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                <int.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-foreground">{int.label}</p>
                                <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">{int.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* â”€â”€ BOTTOM CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="relative z-10 py-8 px-6 md:px-8 pb-24">
                <div className="max-w-4xl mx-auto relative rounded-[48px] overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-amber-500 p-16 md:p-20 text-center space-y-6 relative">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
                        <div className="relative z-10 space-y-5">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/15 text-black text-[10px] font-black uppercase tracking-widest">
                                <ShieldCheck className="h-3.5 w-3.5" /> Bank-Audited & MFB Secure
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black text-black leading-tight">
                                Your Cooperative Deserves<br />a Modern Engine
                            </h2>
                            <p className="text-black/70 max-w-xl mx-auto text-sm font-semibold leading-relaxed">
                                Join the growing network of trade guilds, transport unions, and market cooperatives already leveraging Copteller's bank-audited infrastructure to automate savings, close asset ownership gaps, and drive real financial inclusion.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                                <Button asChild size="lg" className="bg-black text-white hover:bg-slate-900 font-black h-14 px-8 rounded-2xl text-sm border-0 shadow-2xl">
                                    <Link href="/copteller/onboarding">Launch Copteller Portal <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="border-black/30 text-black hover:bg-black/10 font-bold h-14 px-8 rounded-2xl text-sm">
                                    <Link href="/copteller/features">Explore All Features</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

