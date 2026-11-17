"use client"

import * as React from "react"
import { motion, AnimatePresence, useInView } from "framer-motion"
import {
    Users, Truck, TrendingUp, ArrowRight, Check, ChevronRight,
    Coins, PiggyBank, Award, BarChart3, ShieldCheck, Zap,
    Building2, Activity, CircleDollarSign, Globe, Lock, Layers,
    KeyRound, Smartphone, Star, Clock, Target, Cpu, CheckCircle2,
    HeartHandshake, Upload, UserPlus, Wallet, CreditCard, Bell,
    FileText, Eye, Percent, RefreshCw, Car, Sparkles, ArrowUpRight,
    ShieldAlert, Printer, X
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PrintableFormDialog } from "@/components/copteller/printable-form"
import { PRESET_REGISTERED_COOPS, type RegisteredCoopDirectoryItem } from "@/lib/copteller/coop-form-specs"

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type UserClass = "member" | "admin" | "investor"

// â”€â”€â”€ STEP CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StepCard({ step, title, desc, icon: Icon, color, active, done, onClick }: {
    step: number, title: string, desc: string, icon: React.ElementType,
    color: "emerald" | "amber" | "orange", active: boolean, done: boolean, onClick: () => void
}) {
    const colors = {
        emerald: { ring: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", num: "bg-emerald-500" },
        amber: { ring: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", num: "bg-amber-500" },
        orange: { ring: "border-orange-500/40", bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", num: "bg-orange-500" },
    }
    const c = colors[color]
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${active
                ? `${c.ring} bg-white dark:bg-slate-950/60 shadow-lg`
                : done
                    ? 'border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20'
                    : 'border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-800'
                } space-y-3`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 mt-0.5 ${done ? 'bg-emerald-500' : active ? c.num : 'bg-slate-300 dark:bg-slate-700'}`}>
                    {done ? <Check className="h-3.5 w-3.5" /> : step}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${active ? c.text : done ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <p className={`text-sm font-black ${active ? 'text-foreground' : done ? 'text-slate-500' : 'text-muted-foreground'}`}>{title}</p>
                    </div>
                    <AnimatePresence>
                        {active && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-xs text-muted-foreground font-semibold leading-relaxed mt-1.5 overflow-hidden"
                            >
                                {desc}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </button>
    )
}

// â”€â”€â”€ FEATURE CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FeatureCard({ icon: Icon, title, desc, color, delay = 0 }: {
    icon: React.ElementType, title: string, desc: string, color: "emerald" | "amber" | "orange", delay?: number
}) {
    const ref = React.useRef(null)
    const inView = useInView(ref, { once: true })
    const colors = {
        emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    }
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay }}
            className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 space-y-4 hover:shadow-xl hover:border-emerald-500/20 transition-all duration-300 group"
        >
            <div className={`p-2.5 rounded-xl w-fit ${colors[color]} group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-black">{title}</h4>
            <p className="text-xs text-muted-foreground font-semibold leading-relaxed">{desc}</p>
        </motion.div>
    )
}

// â”€â”€â”€ PHONE MOCKUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PhoneMockup({ userClass }: { userClass: UserClass }) {
    const screens = {
        member: {
            title: "Member View",
            balance: "₦84,500",
            items: [
                { label: "Ajo Cycle", val: "65% · Slot 4/8", color: "amber" },
                { label: "HP Progress", val: "30% · ABA-404", color: "emerald" },
                { label: "Credit Score", val: "87 / 100", color: "emerald" },
                { label: "Active Grant", val: "₦200K Available", color: "amber" },
            ]
        },
        admin: {
            title: "Admin View",
            balance: "₦4.8M",
            items: [
                { label: "Operators Online", val: "5 Active", color: "emerald" },
                { label: "Weekly Collection", val: "₦90,000", color: "amber" },
                { label: "HP Assets", val: "5 Tracked", color: "emerald" },
                { label: "Pending Action", val: "1 Default Flag", color: "amber" },
            ]
        },
        investor: {
            title: "Investor View",
            balance: "₦8.46M",
            items: [
                { label: "Portfolio Yield", val: "+14.8% YTD", color: "emerald" },
                { label: "Next Payout", val: "₦124,800 · Q3", color: "amber" },
                { label: "Active Schemes", val: "2 Open", color: "emerald" },
                { label: "Collection Rate", val: "98.7%", color: "amber" },
            ]
        }
    }
    const s = screens[userClass]
    const accentColor = userClass === 'member' ? 'from-emerald-900' : userClass === 'admin' ? 'from-amber-900' : 'from-orange-900'

    return (
        <motion.div
            key={userClass}
            initial={{ opacity: 0, x: 30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-[260px] bg-[#0a0a0a] rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.7)] border-[7px] border-[#1a1a1a] mx-auto"
        >
            {/* Dynamic island */}
            <div className="flex justify-center pt-3 pb-1">
                <div className="w-24 h-7 bg-[#0a0a0a] rounded-full border border-[#222] flex items-center justify-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${userClass === 'member' ? 'bg-emerald-500' : userClass === 'admin' ? 'bg-amber-500' : 'bg-orange-500'} animate-pulse`} />
                    <span className="text-[7px] font-black text-slate-400 tracking-widest">{s.title.toUpperCase()}</span>
                </div>
            </div>

            <div className={`p-4 space-y-3 bg-[#0a0a0a] min-h-[380px]`}>
                {/* Balance */}
                <div className={`bg-gradient-to-br ${accentColor}/60 to-slate-950/40 border border-slate-800/40 rounded-2xl p-4 relative overflow-hidden`}>
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/5 rounded-full blur-xl" />
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        {userClass === 'member' ? 'Escrow Wallet' : userClass === 'admin' ? 'Weekly Flow' : 'Portfolio AUM'}
                    </p>
                    <p className="text-2xl font-black text-white mt-1">{s.balance}</p>
                    <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[8px] font-black ${userClass === 'member' ? 'bg-emerald-500/15 text-emerald-400' : userClass === 'admin' ? 'bg-amber-500/15 text-amber-400' : 'bg-orange-500/15 text-orange-400'}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        LIVE
                    </div>
                </div>

                {/* Data tiles */}
                <div className="grid grid-cols-2 gap-2">
                    {s.items.map((item, i) => (
                        <div key={i} className="bg-[#111] border border-[#222] rounded-xl p-2.5 space-y-0.5">
                            <p className="text-[8px] text-slate-500 font-bold">{item.label}</p>
                            <p className={`text-[10px] font-black ${item.color === 'emerald' ? 'text-emerald-400' : item.color === 'amber' ? 'text-amber-400' : 'text-orange-400'}`}>
                                {item.val}
                            </p>
                        </div>
                    ))}
                </div>

                {/* ─── CTA ─── */}
                <div className={`w-full py-2 rounded-xl text-center text-[9px] font-black ${userClass === 'member' ? 'bg-emerald-600 text-black' : userClass === 'admin' ? 'bg-amber-500 text-black' : 'bg-orange-500 text-black'}`}>
                    {userClass === 'member' ? 'Open Copteller Portal →' : userClass === 'admin' ? 'Access Admin Console →' : 'View Investor Dashboard →'}
                </div>
            </div>

            <div className="h-7 bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-20 h-1 bg-[#222] rounded-full" />
            </div>
        </motion.div>
    )
}


// â”€â”€â”€ WIZARD DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const WIZARD_DATA = {
    member: {
        color: "emerald" as const,
        label: "Member / Operator",
        tagline: "Go from daily trader to asset owner — in structured, automated steps.",
        description: "Copteller members are transport operators, artisans, and market traders who want to save digitally, access Hire Purchase financing, build credit, and earn benefits through cooperative participation.",
        steps: [
            { icon: UserPlus, title: "Create Member Account", desc: "Sign up with your BVN and phone number. Our KYC engine verifies your identity in under 60 seconds via our NIBSS integration." },
            { icon: Building2, title: "Join or Register Your Cooperative", desc: "Search for your existing trade guild or union. If none exists, your cooperative admin can register your group. You'll be linked under their vault umbrella." },
            { icon: PiggyBank, title: "Configure Your Ajo Thrift", desc: "Set your daily, weekly, or monthly contribution amount. The platform auto-deducts from your wallet — no manual action needed each cycle." },
            { icon: Truck, title: "Apply for Hire Purchase", desc: "Your admin matches you to an available vehicle or asset. Once matched, your contract initializes and the repayment schedule kicks in automatically." },
            { icon: BarChart3, title: "Build Credit & Access Grants", desc: "Every on-time Ajo deduction and HP payback builds your Copteller credit score. When you hit thresholds, grant applications open automatically." },
            { icon: Car, title: "Unlock Mobility Suite Access", desc: "Maintain active membership and good scores to earn exclusive early access to the proprietary ride-hailing and mobility integration — coming soon." },
        ],
        features: [
            { icon: Wallet, title: "Escrow Wallet", desc: "A bank-cleared digital wallet for all income, paybacks, and savings — instantly accessible." },
            { icon: PiggyBank, title: "Automated Ajo Cycles", desc: "Set-and-forget rotational savings. You configure it once; the platform handles every deduction and payout." },
            { icon: Truck, title: "Hire Purchase Path", desc: "Structured asset ownership financing for tricycles, tools, and equipment. Own your keke in manageable weekly steps." },
            { icon: BarChart3, title: "Credit Score Dashboard", desc: "A real-time behavioral credit index built from your savings and payback habits — usable for loan and grant eligibility." },
            { icon: Award, title: "Non-Repayable Grants", desc: "Qualifying members receive tool grants and capital injections sponsored by unions and public programs." },
            { icon: Car, title: "Mobility Suite (Coming)", desc: "Exclusive ride-hailing booking feeds and automatic fare-to-payback sync for registered active members." },
        ]
    },
    admin: {
        color: "amber" as const,
        label: "Cooperative Admin",
        tagline: "Stop chasing cash. The platform collects, reconciles, and reports for you.",
        description: "Cooperative admins are union leaders, guild chairpersons, and scheme coordinators who manage member rosters, HP assets, and grant programs. Copteller automates everything so you can focus on growing your guild.",
        steps: [
            { icon: Building2, title: "Register Your Cooperative", desc: "Submit your CAC documents and member list via the Governance wizard. Our bank-licensed team reviews and approves within 48 hours." },
            { icon: Layers, title: "Configure Escrow Vault", desc: "Your cooperative gets a dedicated escrow vault under the licensed MFB umbrella. All member savings and HP collections route here." },
            { icon: Users, title: "Onboard & Verify Members", desc: "Upload your member roster or invite individually via phone number. Members verify their identity via BVN and are linked to your cooperative." },
            { icon: Truck, title: "Register HP Assets", desc: "Add vehicles, tools, or equipment to your fleet registry. Set HP contract terms: vehicle price, weekly payback rate, and operator assignment rules." },
            { icon: Target, title: "Match Operators to Assets", desc: "Use the operator matching engine to assign verified members to available assets. Contracts initialize automatically upon assignment confirmation." },
            { icon: CircleDollarSign, title: "Run Weekly Collections", desc: "Trigger the weekly workflow with one click. The platform deducts from all members, routes to escrow, and generates an audit-ready ledger entry." },
        ],
        features: [
            { icon: Users, title: "Member Roster Management", desc: "Full member directory with KYC status, credit scores, HP assignments, and Ajo participation rates." },
            { icon: Truck, title: "Fleet HP Engine", desc: "Register assets, set contract terms, match operators, and track payback progress across your entire fleet." },
            { icon: CircleDollarSign, title: "Automated Collections", desc: "One-click weekly collection workflow. No cash, no disputes — every deduction is logged and auditable." },
            { icon: Target, title: "Grant Distribution Tools", desc: "Define eligibility criteria and disburse grant capital to qualifying members with one-click bank clearance." },
            { icon: Activity, title: "Real-Time Audit Ledger", desc: "Every transaction, deduction, and payout is automatically logged in a tamper-proof cooperative ledger." },
            { icon: ShieldAlert, title: "Default Management", desc: "Automatic alerts for missed payments with escalation workflows and GPS-triggered asset immobilization options." },
        ]
    },
    investor: {
        color: "orange" as const,
        label: "Investor / Sponsor",
        tagline: "Deploy capital into real cooperative assets. Earn structured yields — guaranteed.",
        description: "Investors and sponsors deploy private capital into cooperative HP schemes (vehicles, tools, agro-equipment) and earn yield from the weekly payback collections — all cleared through licensed MFB escrow.",
        steps: [
            { icon: UserPlus, title: "Register as Investor", desc: "Complete an enhanced KYC with BVN, CAC (for corporate), and bank account verification. Our compliance team approves investor accounts within 24 hours." },
            { icon: Eye, title: "Browse Active Schemes", desc: "Review open investment schemes across sectors — transport, artisan, agriculture. Each scheme shows target capital, fill progress, yield rate, and duration." },
            { icon: FileText, title: "Review Scheme Terms", desc: "Download and review the formal escrow agreement and profit-sharing contract for your chosen scheme. All terms are standardized and MFB-audited." },
            { icon: CircleDollarSign, title: "Deploy Capital", desc: "Transfer your capital via bank transfer. Funds are immediately routed into the scheme's dedicated escrow vault — never co-mingled with operating funds." },
            { icon: BarChart3, title: "Track Performance", desc: "Access your investor dashboard for real-time operator scorecards, weekly collection progress, and your yield accrual timeline." },
            { icon: TrendingUp, title: "Receive Quarterly Payouts", desc: "Your yield is automatically calculated from actual HP collections and disbursed quarterly to your registered bank account via the escrow engine." },
        ],
        features: [
            { icon: Lock, title: "MFB Escrow Protection", desc: "All capital is held in a ring-fenced escrow vault under a licensed microfinance bank — never at risk of operational co-mingling." },
            { icon: Percent, title: "Configured Yield Splits", desc: "You set your profit-sharing percentage upfront in the contract. Platform auto-calculates from real weekly collection data." },
            { icon: BarChart3, title: "Live Operator Scorecards", desc: "Track every operator's repayment streak, thrift consistency, and asset utilization from your personal investor console." },
            { icon: CircleDollarSign, title: "Automated Quarterly Payouts", desc: "No manual requests. The escrow engine auto-disburses your yield quarterly to your registered account." },
            { icon: Globe, title: "Multi-Sector Portfolio", desc: "Diversify across transport, artisan, agro, and commerce cooperative schemes — all on one platform." },
            { icon: FileText, title: "CBN-Compliant Reporting", desc: "All investment transactions generate regulatory-grade reports for tax and compliance purposes, exportable on demand." },
        ]
    }
}

// â”€â”€â”€ COMPARISON TABLE DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const COMPARE_ROWS = [
    { feature: "Escrow Wallet", member: true, admin: true, investor: true },
    { feature: "Ajo / Thrift Cycles", member: true, admin: true, investor: false },
    { feature: "Hire Purchase Contract", member: true, admin: true, investor: false },
    { feature: "Credit Score Building", member: true, admin: false, investor: false },
    { feature: "Grant Application Access", member: true, admin: true, investor: false },
    { feature: "Operator Roster Management", member: false, admin: true, investor: false },
    { feature: "Fleet HP Asset Registry", member: false, admin: true, investor: true },
    { feature: "Weekly Collection Workflow", member: false, admin: true, investor: false },
    { feature: "Investment Scheme Access", member: false, admin: true, investor: true },
    { feature: "Yield & Payout Dashboard", member: false, admin: false, investor: true },
    { feature: "Audit Log & CBN Reports", member: false, admin: true, investor: true },
    { feature: "Mobility Suite (Early Access)", member: true, admin: false, investor: false },
    { feature: "API Vault & Integrations", member: false, admin: true, investor: false },
]

// â”€â”€â”€ MAIN PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function OnboardingPage() {
    const [activeClass, setActiveClass] = React.useState<UserClass>("member")
    const [activeStep, setActiveStep] = React.useState(0)
    const [doneSteps, setDoneSteps] = React.useState<Set<number>>(new Set())
    const [showPrintModal, setShowPrintModal] = React.useState(false)

    const data = WIZARD_DATA[activeClass]

    const handleStepClick = (i: number) => {
        if (i > activeStep) {
            const newDone = new Set(doneSteps)
            for (let j = activeStep; j < i; j++) newDone.add(j)
            setDoneSteps(newDone)
        }
        setActiveStep(i)
    }

    const advanceStep = () => {
        const newDone = new Set(doneSteps)
        newDone.add(activeStep)
        setDoneSteps(newDone)
        if (activeStep < data.steps.length - 1) setActiveStep(s => s + 1)
    }

    const [registeredCoops, setRegisteredCoops] = React.useState<RegisteredCoopDirectoryItem[]>(PRESET_REGISTERED_COOPS)
    const [selectedOfflineCoopId, setSelectedOfflineCoopId] = React.useState<string>(PRESET_REGISTERED_COOPS[0].id)

    React.useEffect(() => {
        fetch("/api/copteller/cooperatives?status=active")
            .then((r) => (r.ok ? r.json() : null))
            .then((res) => {
                if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
                    setRegisteredCoops(res.data)
                    setSelectedOfflineCoopId(res.data[0].id)
                }
            })
            .catch(() => {})
    }, [])

    const selectedOfflineCoop = React.useMemo(
        () => registeredCoops.find((c) => c.id === selectedOfflineCoopId) || registeredCoops[0],
        [registeredCoops, selectedOfflineCoopId]
    )

    // Reset wizard when class changes
    React.useEffect(() => {
        setActiveStep(0)
        setDoneSteps(new Set())
    }, [activeClass])

    const classConfig = {
        member: { label: "Member / Operator", icon: Coins, gradient: "from-emerald-500 to-emerald-600", ring: "ring-emerald-500/30", activeStyle: "bg-emerald-600 text-white border-emerald-600" },
        admin: { label: "Cooperative Admin", icon: Building2, gradient: "from-amber-500 to-amber-600", ring: "ring-amber-500/30", activeStyle: "bg-amber-500 text-black border-amber-500" },
        investor: { label: "Investor / Sponsor", icon: TrendingUp, gradient: "from-orange-500 to-orange-600", ring: "ring-orange-500/30", activeStyle: "bg-orange-500 text-black border-orange-500" },
    }

    return (
        <div className="bg-background text-foreground min-h-[100dvh] font-sans selection:bg-emerald-500/30 overflow-x-hidden relative">
            {/* Ambient orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute top-[-5%] left-[10%] w-[600px] h-[600px] bg-emerald-500/4 dark:bg-emerald-500/6 rounded-full blur-[160px]" />
                <div className="absolute top-[50%] right-[5%] w-[400px] h-[400px] bg-amber-500/3 dark:bg-amber-500/5 rounded-full blur-[140px]" />
            </div>

            {/* ─── HERO ─────────────────────────────────────────────────── */}
            <section className="relative max-w-7xl mx-auto pt-16 sm:pt-24 pb-10 sm:pb-12 px-3 sm:px-6 md:px-8 z-10 text-center space-y-5 sm:space-y-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest"
                >
                    <Sparkles className="h-3.5 w-3.5" /> Platform Onboarding Guide
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.7 }}
                    className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.08] sm:leading-[1.02] max-w-4xl mx-auto"
                >
                    Get Started With{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-amber-500 to-orange-500 dark:from-emerald-400 dark:via-amber-400 dark:to-orange-400">
                        Copteller
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-muted-foreground text-sm sm:text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed px-2"
                >
                    Whether you're a cooperative member building credit, an admin running a guild, or an investor deploying capital — Copteller has a tailored onboarding path for you. Select your role to explore.
                </motion.p>

                {/* Class selector pills */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap justify-center gap-2.5 sm:gap-4 pt-2 sm:pt-4"
                >
                    {(["member", "admin", "investor"] as UserClass[]).map((cls) => {
                        const cfg = classConfig[cls]
                        const Icon = cfg.icon
                        const isActive = activeClass === cls
                        return (
                            <button
                                key={cls}
                                onClick={() => setActiveClass(cls)}
                                className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-black transition-all duration-300 ${isActive
                                    ? `${cfg.activeStyle} shadow-xl ring-2 sm:ring-4 ${cfg.ring}`
                                    : 'border-slate-200 dark:border-slate-800 text-muted-foreground hover:text-foreground hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/40'
                                    }`}
                            >
                                <div className={`p-1.5 rounded-lg sm:rounded-xl ${isActive ? 'bg-white/20' : `bg-gradient-to-br ${cfg.gradient} opacity-80`}`}>
                                    <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isActive ? 'text-current' : 'text-white'}`} />
                                </div>
                                {cfg.label}
                            </button>
                        )
                    })}
                </motion.div>
            </section>

            {/* â”€â”€ USER CLASS INTRO BANNER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="max-w-7xl mx-auto px-6 md:px-8 pb-8 relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeClass}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className={`rounded-3xl p-8 md:p-12 border relative overflow-hidden ${activeClass === 'member'
                            ? 'bg-gradient-to-br from-emerald-50 to-slate-50 dark:from-emerald-950/20 dark:to-slate-950/20 border-emerald-200 dark:border-emerald-900/30'
                            : activeClass === 'admin'
                                ? 'bg-gradient-to-br from-amber-50 to-slate-50 dark:from-amber-950/20 dark:to-slate-950/20 border-amber-200 dark:border-amber-900/30'
                                : 'bg-gradient-to-br from-orange-50 to-slate-50 dark:from-orange-950/20 dark:to-slate-950/20 border-orange-200 dark:border-orange-900/30'
                            }`}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-4">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${activeClass === 'member' ? 'text-emerald-600 dark:text-emerald-400' : activeClass === 'admin' ? 'text-amber-600 dark:text-amber-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                    {data.label}
                                </p>
                                <h2 className="text-3xl md:text-4xl font-black leading-tight">{data.tagline}</h2>
                                <p className="text-sm text-muted-foreground font-semibold leading-relaxed">{data.description}</p>
                                <Button asChild className={`h-11 px-6 rounded-2xl font-black text-sm border-0 shadow-lg gap-2 ${activeClass === 'member'
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : activeClass === 'admin'
                                        ? 'bg-amber-500 hover:bg-amber-400 text-black'
                                        : 'bg-orange-500 hover:bg-orange-400 text-black'
                                    }`}>
                                    <Link href={activeClass === 'member' ? '/copteller/onboarding/member' : activeClass === 'admin' ? '/copteller/onboarding/admin' : '/copteller/onboarding/investor'}>
                                        Start Onboarding <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            <div className="hidden md:flex justify-center">
                                <AnimatePresence mode="wait">
                                    <PhoneMockup key={activeClass} userClass={activeClass} />
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* â”€â”€ INTERACTIVE WIZARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="max-w-7xl mx-auto px-6 md:px-8 py-16 relative z-10">
                <div className="text-center space-y-3 mb-12">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${activeClass === 'member' ? 'text-emerald-600 dark:text-emerald-400' : activeClass === 'admin' ? 'text-amber-600 dark:text-amber-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        Interactive Walkthrough
                    </p>
                    <h2 className="text-3xl md:text-5xl font-black">
                        Your {data.label} Journey
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-lg mx-auto">Click each step to expand the details. Walk through the entire onboarding flow in under 2 minutes.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Steps list */}
                    <div className="lg:col-span-5 space-y-3">
                        {data.steps.map((step, i) => (
                            <StepCard
                                key={i}
                                step={i + 1}
                                title={step.title}
                                desc={step.desc}
                                icon={step.icon}
                                color={data.color}
                                active={activeStep === i}
                                done={doneSteps.has(i)}
                                onClick={() => handleStepClick(i)}
                            />
                        ))}

                        <Button
                            onClick={advanceStep}
                            className={`w-full h-12 rounded-2xl font-black text-sm border-0 shadow-lg gap-2 mt-2 ${activeClass === 'member'
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                                : activeClass === 'admin'
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black'
                                    : 'bg-gradient-to-r from-orange-500 to-orange-600 text-black'
                                }`}
                        >
                            {doneSteps.size === data.steps.length - 1 ? (
                                <><CheckCircle2 className="h-4 w-4" /> All Steps Complete — Enter Portal</>
                            ) : (
                                <>Next Step <ChevronRight className="h-4 w-4" /></>
                            )}
                        </Button>
                    </div>

                    {/* Right: step detail visual */}
                    <div className="lg:col-span-7">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${activeClass}-${activeStep}`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl overflow-hidden shadow-xl"
                            >
                                {/* Header */}
                                <div className={`p-6 bg-gradient-to-br ${activeClass === 'member'
                                    ? 'from-emerald-600 to-emerald-700'
                                    : activeClass === 'admin'
                                        ? 'from-amber-500 to-amber-600'
                                        : 'from-orange-500 to-orange-600'
                                    } relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(255,255,255,0.15),transparent_60%)]" />
                                    <div className="relative z-10 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-white/20 rounded-xl">
                                                {React.createElement(data.steps[activeStep].icon, { className: "h-5 w-5 text-white" })}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Step {activeStep + 1} of {data.steps.length}</p>
                                                <h3 className="text-lg font-black text-white">{data.steps[activeStep].title}</h3>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-8 space-y-6">
                                    <p className="text-sm text-muted-foreground font-semibold leading-relaxed">
                                        {data.steps[activeStep].desc}
                                    </p>

                                    {/* Progress dots */}
                                    <div className="flex items-center gap-2">
                                        {data.steps.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleStepClick(i)}
                                                className={`h-2 rounded-full transition-all duration-300 ${i === activeStep
                                                    ? `w-8 ${activeClass === 'member' ? 'bg-emerald-500' : activeClass === 'admin' ? 'bg-amber-500' : 'bg-orange-500'}`
                                                    : doneSteps.has(i)
                                                        ? 'w-2 bg-emerald-400'
                                                        : 'w-2 bg-slate-200 dark:bg-slate-800'
                                                    }`}
                                            />
                                        ))}
                                    </div>

                                    {/* What you'll need / checklist panel */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">What you'll need</p>
                                        {activeClass === 'member' && activeStep === 0 && [
                                            "Valid BVN (Bank Verification Number)",
                                            "Active Nigerian phone number",
                                            "Bank account linked to BVN",
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                {item}
                                            </div>
                                        ))}
                                        {activeClass === 'admin' && activeStep === 0 && [
                                            "CAC Registration Certificate",
                                            "Union / Guild meeting minutes (most recent)",
                                            "Member list (name, BVN, phone)",
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground">
                                                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                                                {item}
                                            </div>
                                        ))}
                                        {activeClass === 'investor' && activeStep === 0 && [
                                            "BVN and NIN (individual) or CAC RC Number (corporate)",
                                            "Bank account with minimum ₦200,000 balance",
                                            "Proof of address (utility bill or bank statement)",
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground">
                                                <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0" />
                                                {item}
                                            </div>
                                        ))}
                                        {[1, 2, 3, 4, 5].includes(activeStep) && [
                                            "This step happens inside your Copteller workspace",
                                            `Estimated time: ${activeStep < 3 ? '2–5 minutes' : 'Automated'}`,
                                            "Support available 24/7 via in-app chat",
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground">
                                                <CheckCircle2 className={`h-4 w-4 shrink-0 ${activeClass === 'member' ? 'text-emerald-500' : activeClass === 'admin' ? 'text-amber-500' : 'text-orange-500'}`} />
                                                {item}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Completion timeline */}
                                    <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                                        <Clock className="h-4 w-4 shrink-0" />
                                        <span>
                                            Full onboarding for a {data.label}: <span className="font-black text-foreground">
                                                {activeClass === 'member' ? '~10 minutes' : activeClass === 'admin' ? '~2 business days (document review)' : '~24 hours (compliance review)'}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </section>

            {/* â”€â”€ FEATURE BREAKDOWN PER CLASS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-900 py-20 px-6 md:px-8 relative z-10 overflow-hidden">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="text-center space-y-3">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${activeClass === 'member' ? 'text-emerald-600 dark:text-emerald-400' : activeClass === 'admin' ? 'text-amber-600 dark:text-amber-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            Feature Breakdown · {data.label}
                        </p>
                        <h2 className="text-3xl md:text-5xl font-black">Everything You Get</h2>
                        <p className="text-sm text-muted-foreground max-w-lg mx-auto">Every feature available to {data.label.toLowerCase()}s — ready from day one.</p>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeClass}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {data.features.map((f, i) => (
                                <FeatureCard
                                    key={f.title}
                                    icon={f.icon}
                                    title={f.title}
                                    desc={f.desc}
                                    color={data.color}
                                    delay={i * 0.08}
                                />
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </section>

            {/* ─── COMPARISON TABLE ────────────────────────────────────────────────── */}
            <section className="max-w-7xl mx-auto py-12 sm:py-20 px-3 sm:px-6 md:px-8 relative z-10">
                <div className="text-center space-y-3 mb-8 sm:mb-12">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Capability Matrix</p>
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-black">What Each Role Can Do</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">A full breakdown of capabilities across all three Copteller user classes.</p>
                </div>

                <div className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl overflow-x-auto">
                    <div className="min-w-[520px]">
                        {/* Header row */}
                        <div className="grid grid-cols-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                            <div className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Feature</div>
                            {([
                                { key: "member", label: "Member", icon: Coins, color: "text-emerald-600 dark:text-emerald-400" },
                                { key: "admin", label: "Admin", icon: Building2, color: "text-amber-600 dark:text-amber-400" },
                                { key: "investor", label: "Investor", icon: TrendingUp, color: "text-orange-600 dark:text-orange-400" },
                            ] as const).map((col) => (
                                <div key={col.key} className="px-3 sm:px-4 py-4 text-center">
                                    <div className={`flex items-center justify-center gap-1.5 text-[10px] font-black ${col.color}`}>
                                        <col.icon className="h-3.5 w-3.5" /> {col.label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Data rows */}
                        {COMPARE_ROWS.map((row, i) => (
                            <div
                                key={i}
                                className={`grid grid-cols-4 border-b border-slate-50 dark:border-slate-900 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors`}
                            >
                                <div className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-foreground flex items-center">{row.feature}</div>
                                {[row.member, row.admin, row.investor].map((has, j) => (
                                    <div key={j} className="px-3 sm:px-4 py-3.5 flex justify-center items-center">
                                        {has ? (
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${j === 0 ? 'bg-emerald-500/15' : j === 1 ? 'bg-amber-500/15' : 'bg-orange-500/15'}`}>
                                                <Check className={`h-3.5 w-3.5 ${j === 0 ? 'text-emerald-600 dark:text-emerald-400' : j === 1 ? 'text-amber-600 dark:text-amber-400' : 'text-orange-600 dark:text-orange-400'}`} />
                                            </div>
                                        ) : (
                                            <div className="w-5 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* â”€â”€ FAQ / COMMON QUESTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="bg-slate-950 dark:bg-[#020202] py-20 px-6 md:px-8 relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.06),transparent_60%)] pointer-events-none" />
                <div className="max-w-4xl mx-auto space-y-10 relative z-10">
                    <div className="text-center space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Common Questions</p>
                        <h2 className="text-3xl md:text-5xl font-black text-white">Before You Join</h2>
                    </div>
                    <div className="space-y-3">
                        {[
                            { q: "Is my money safe on Copteller?", a: "Yes. All funds are held in ring-fenced escrow accounts under a licensed Nigerian Microfinance Bank, with full NDIC deposit insurance coverage. Your capital is never co-mingled with operational funds." },
                            { q: "Do I need a bank account to join?", a: "Yes, but any Nigerian bank account works. Your wallet is linked via BVN. If you don't have a formal account, our partner MFB can help open one during onboarding." },
                            { q: "How long does the HP process take?", a: "Once your cooperative admin matches you to an available asset, your HP contract initializes within 24 hours. The first deduction begins the following weekly cycle." },
                            { q: "Can a cooperative admin also be a member?", a: "Yes. Admins can hold member wallets and participate in Ajo cycles. However, their admin-level actions (HP matching, collection workflows) are separate from member activity." },
                            { q: "What's the minimum investment for investors?", a: "Minimum entry varies by scheme — from ₦200,000 for artisan pools to ₦1,000,000+ for larger transport fleet schemes. All minimums are displayed on each scheme's detail page." },
                            { q: "When is the Mobility Suite launching?", a: "The proprietary ride-hailing integration is currently in late-stage development. Registered active members will receive priority early-access invitations ahead of the public launch." },
                        ].map((faq, i) => (
                            <FAQItem key={i} q={faq.q} a={faq.a} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA ─────────────────────────────────────────────────── */}
            <section className="relative z-10 py-6 sm:py-8 px-3 sm:px-6 md:px-8 pb-16 sm:pb-24">
                <div className="max-w-4xl mx-auto relative rounded-3xl sm:rounded-[48px] overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 via-amber-500 to-orange-500 p-6 sm:p-12 md:p-20 text-center space-y-5 sm:space-y-6 relative">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
                        <div className="relative z-10 space-y-4 sm:space-y-5">
                            <h2 className="text-2xl sm:text-4xl md:text-6xl font-black text-black leading-tight">
                                Ready to{" "}
                                {activeClass === 'member' ? 'Start Saving?' : activeClass === 'admin' ? 'Automate Your Guild?' : 'Deploy Capital?'}
                            </h2>
                            <p className="text-black/80 max-w-xl mx-auto text-xs sm:text-sm font-semibold leading-relaxed">
                                {activeClass === 'member'
                                    ? "Join thousands of cooperative members already automating their savings, building credit, and accessing asset financing on Copteller."
                                    : activeClass === 'admin'
                                        ? "Register your cooperative today and take control of your union's finances with a fully automated, bank-audited platform."
                                        : "Browse active investment schemes and start earning structured yields from real cooperative assets — protected by MFB escrow."
                                }
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                                <Button asChild size="lg" className="w-full sm:w-auto bg-black text-white hover:bg-slate-900 font-black h-12 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-xs sm:text-sm border-0 shadow-2xl">
                                    <Link href={activeClass === 'member' ? '/copteller/onboarding/member' : activeClass === 'admin' ? '/copteller/onboarding/admin' : '/copteller/onboarding/investor'}>
                                        {activeClass === 'member' ? 'Start Member Onboarding' : activeClass === 'admin' ? 'Register Your Cooperative' : 'Begin Investor Setup'} <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto border-black/30 text-black hover:bg-black/10 font-bold h-12 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-xs sm:text-sm">
                                    <Link href="/copteller/auth?redirect=/copteller/dashboard">Already registered? Sign in</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── OFFLINE DATA COLLECTION ─── */}
            <section className="max-w-5xl mx-auto py-10 sm:py-16 px-3 sm:px-6 md:px-8 relative z-10">
                <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 flex flex-col md:flex-row items-center gap-6 sm:gap-8 shadow-sm">
                    <div className="space-y-4 flex-1">
                        <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                            <Printer className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl sm:text-2xl font-black">Offline Guild Onboarding</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                Operating in transport hubs or markets with limited internet? Choose a registered cooperative below to generate an official A4 paper application form tailored with its exact declaration and member field specifications.
                            </p>
                        </div>

                        <div className="space-y-2 pt-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                                Registered Cooperative Form Specification
                            </label>
                            <select
                                value={selectedOfflineCoopId}
                                onChange={(e) => setSelectedOfflineCoopId(e.target.value)}
                                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-foreground focus:outline-none focus:border-emerald-500"
                            >
                                {registeredCoops.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            {selectedOfflineCoop && (
                                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    Declaration: &ldquo;...for the purposes of {selectedOfflineCoop.memberFormSpec.declarationPurpose}&rdquo; &bull;{" "}
                                    {selectedOfflineCoop.memberFormSpec.requireUnionClearance
                                        ? "Includes Union Leader Clearance signature"
                                        : "Voluntary engagement (No Union Leader Clearance required)"}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-2">
                            <Button onClick={() => setShowPrintModal(true)} variant="outline" className="w-full sm:w-auto border-emerald-500/30 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold h-10 sm:h-11 px-5 rounded-xl text-xs">
                                Preview Form Layout
                            </Button>
                            <Button onClick={() => {
                                setShowPrintModal(true)
                                setTimeout(() => window.print(), 350)
                            }} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-black font-black h-10 sm:h-11 px-5 rounded-xl text-xs border-0">
                                Download Printable Form (PDF)
                            </Button>
                        </div>
                    </div>
                    <div className="w-full md:w-[260px] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl bg-white dark:bg-slate-950 shadow-inner flex flex-col items-center select-none scale-95 opacity-85 hover:opacity-100 hover:scale-100 transition-all">
                        <div className="w-full aspect-[1/1.4] bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-3">
                            <div className="w-10 h-10 border border-dashed border-slate-400 flex items-center justify-center rounded text-[8px] font-bold text-slate-400 mb-2">Photo</div>
                            <p className="text-[10px] font-black uppercase text-foreground">A4 Member Form</p>
                            <p className="text-[8px] text-muted-foreground mt-1">
                                {selectedOfflineCoop?.name || "Tailored cooperative specs & BVN clearance guidelines"}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <PrintableFormDialog
                open={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                roleType={activeClass}
                selectedCoopId={selectedOfflineCoopId}
                registeredCoops={registeredCoops}
            />
        </div>
    )
}


// â”€â”€â”€ FAQ ACCORDION ITEM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FAQItem({ q, a }: { q: string, a: string }) {
    const [open, setOpen] = React.useState(false)
    return (
        <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-slate-900/50 transition-colors"
            >
                <span className="text-sm font-black text-slate-200">{q}</span>
                <ChevronRight className={`h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <p className="px-5 pb-5 text-sm text-slate-400 font-semibold leading-relaxed border-t border-slate-800 pt-4">{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

