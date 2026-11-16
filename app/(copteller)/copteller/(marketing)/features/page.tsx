"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Cpu, PiggyBank, TrendingUp, ShieldCheck, Percent, ArrowRight, Coins,
    Users, Award, Zap, BarChart3, Target, Lock, Layers, RefreshCw,
    CheckCircle2, ChevronRight, FlaskConical, Activity,
    Building2, KeyRound, CircleDollarSign, Globe, Truck
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

function WorkflowConsole({ steps, active }: { steps: string[]; active: number }) {
    return (
        <div className="bg-[#050505] border border-emerald-900/30 rounded-2xl p-5 font-mono text-xs text-slate-400 space-y-2 min-h-[160px]">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-900">
                <Cpu className="h-4 w-4 text-emerald-400 animate-spin" style={{ animationDuration: "4s" }} />
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
                    animate={{ opacity: i <= active ? 1 : 0.25, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`flex items-start gap-2 ${
                        i === active ? "text-emerald-400 font-bold" : i < active ? "text-slate-400" : "text-slate-600"
                    }`}
                >
                    <ChevronRight className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{step}</span>
                </motion.div>
            ))}
        </div>
    )
}

const WORKFLOW_CODE_LINES = [
    { text: "// Rotational Ajo Clearing Workflow", className: "text-slate-500" },
    { text: "{", className: "text-slate-300" },
    { text: '  "trigger": "schedule.weekly",', className: "text-emerald-400" },
    { text: '  "action": "deduct_contribution",', className: "text-amber-400" },
    { text: '  "vault": "mfb_escrow_pool",', className: "text-emerald-400" },
    { text: '  "rail": "nibss.instant_transfer",', className: "text-slate-300" },
    { text: '  "amount": "member.cycle_commitment",', className: "text-amber-400" },
    { text: '  "verify": ["bvn_match", "role_guard"],', className: "text-emerald-400" },
    { text: '  "on_success": "append_double_entry",', className: "text-slate-300" },
    { text: '  "audit_log": true', className: "text-emerald-400" },
    { text: "}", className: "text-slate-300" },
    { text: "// Deterministic ledger state & idempotent retries", className: "text-slate-500" },
]

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
                "1. Union admin registers guild roster and binds MFB escrow account",
                "2. Members confirm recurring thrift cadence and slot order",
                "3. Platform compiles rotation topology and clearing rules",
                "4. Contributions aggregate into segregated pool for slot payout",
                "5. Ledger records payout and advances behavioural streak",
            ],
            features: [
                { icon: Coins, title: "Scheduled Deductions", desc: "Daily, weekly, or monthly savings cycles aligned with trade earnings." },
                { icon: Users, title: "Queue & Slot Transparency", desc: "Every member sees rotation position, contribution receipts, and payout schedule." },
                { icon: BarChart3, title: "Double-Entry Ledger", desc: "Every debit and payout posts cleanly with audit timestamps." },
                { icon: ShieldCheck, title: "MFB Escrow Custody", desc: "Cooperative pools sit inside partner Microfinance Bank accounts." },
            ],
        },
        {
            id: "hp",
            title: "Hire Purchase Contracts",
            tagline: "Structured asset ownership — vehicles, farm tools, and machinery.",
            color: "amber",
            icon: Truck,
            steps: [
                "1. Cooperative admin registers financed asset class and terms",
                "2. BVN-verified operator is bound to the asset serial or chassis",
                "3. Amortization schedule initializes with weekly payback checkpoints",
                "4. Collections reduce outstanding balance transparently",
                "5. Title release checklist unlocks when balance reaches zero",
            ],
            features: [
                { icon: Truck, title: "Asset & Serial Registry", desc: "Track every tricycle, van, generator, or tool assigned to an operator." },
                { icon: Target, title: "Operator Matching", desc: "Assign vetted members to open fleet assets with guarantor sign-off." },
                { icon: Percent, title: "Flexible Payback Cadence", desc: "Support weekly or bi-weekly remittance schedules per trade sector." },
                { icon: Lock, title: "Default & Recovery Rules", desc: "Arrears alerts escalate to guild officers and partner MFB compliance teams." },
            ],
        },
        {
            id: "credit",
            title: "Behavioural Credit History",
            tagline: "Build verifiable credit from real cooperative participation.",
            color: "orange",
            icon: BarChart3,
            steps: [
                "1. Consistent Ajo deposits establish baseline cashflow discipline",
                "2. On-time HP installments record verified repayment streaks",
                "3. Cooperative admin validates active trade guild standing",
                "4. Partner MFB reviews verifiable history for working-capital loans",
                "5. Audit-ready statements support formal banking onboarding",
            ],
            features: [
                { icon: Activity, title: "Repayment Streak Tracking", desc: "Objective ledger history replaces informal word-of-mouth vouching." },
                { icon: Award, title: "Tiered Eligibility", desc: "Qualification rules automatically check savings consistency before applications." },
                { icon: Building2, title: "MFB Review Format", desc: "Structured risk view formatted for Microfinance Bank credit committees." },
                { icon: Globe, title: "Portability Across Unions", desc: "Verified cooperative records strengthen long-term formal financial access." },
            ],
        },
        {
            id: "grants",
            title: "Tool Grants & Micro-Loans",
            tagline: "Sponsor-backed capital routed cleanly to verified members.",
            color: "emerald",
            icon: CircleDollarSign,
            steps: [
                "1. Sponsor or union defines grant rules, limits, and sector focus",
                "2. Platform validates candidate KYC and guild standing",
                "3. Qualifying members submit streamlined application + printable form",
                "4. Multi-level officer and bank review prevents duplicate claims",
                "5. Approved funds settle directly to member wallet or vendor account",
            ],
            features: [
                { icon: Layers, title: "Multi-Program Support", desc: "Run tool grants, working-capital micro-loans, and fleet pools side by side." },
                { icon: Zap, title: "Printable & Digital Intake", desc: "Submit online or download offline-ready forms for union field onboarding." },
                { icon: CircleDollarSign, title: "Direct Settlement", desc: "Disburse cleanly into member escrow wallets or vetted supplier accounts." },
                { icon: KeyRound, title: "Ring-Fenced Sponsor Funds", desc: "Sponsor grants stay isolated inside dedicated escrow accounts." },
            ],
        },
    ]

    const currentWorkflow = workflows[selectedWorkflow]

    React.useEffect(() => {
        setConsoleStep(0)
        const interval = setInterval(() => {
            setConsoleStep((prev) => (prev >= 4 ? 0 : prev + 1))
        }, 1400)
        return () => clearInterval(interval)
    }, [selectedWorkflow])

    return (
        <div className="bg-background text-foreground min-h-[100dvh] font-sans selection:bg-emerald-500/30 overflow-x-hidden relative">
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute -top-20 right-[15%] w-[480px] h-[480px] bg-emerald-600/5 dark:bg-emerald-500/8 rounded-full blur-[160px]" />
                <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] bg-amber-600/4 dark:bg-amber-500/6 rounded-full blur-[140px]" />
            </div>

            {/* ── HERO ────────────────────────────────────────────────────── */}
            <section className="relative max-w-7xl mx-auto pt-12 sm:pt-16 pb-12 px-4 sm:px-6 md:px-8 z-10">
                <div className="text-center space-y-5 max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 text-[11px] font-black uppercase tracking-widest"
                    >
                        <Cpu className="h-3.5 w-3.5" /> Platform Architecture
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.06, duration: 0.55 }}
                        className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.04]"
                    >
                        Every Workflow,{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-amber-500 dark:from-emerald-400 dark:to-amber-400">
                            Built for Real Cooperatives
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.12 }}
                        className="text-muted-foreground text-sm sm:text-base lg:text-lg font-medium max-w-2xl mx-auto leading-relaxed"
                    >
                        Rotational savings, asset Hire-Purchase contracts, behavioural credit tracking, and bank-audited grant disbursements — unified on one role-guarded ledger.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 }}
                        className="flex flex-wrap justify-center gap-2.5 pt-1"
                    >
                        {[
                            { icon: ShieldCheck, label: "MFB-Backed Escrow" },
                            { icon: Zap, label: "Automated Workflows" },
                            { icon: Globe, label: "Bank-Agnostic Rails" },
                            { icon: Lock, label: "Strict Role Guards" },
                        ].map((p, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground border border-border px-3.5 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900/50">
                                <p.icon className="h-3.5 w-3.5 text-emerald-500" /> {p.label}
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── INTERACTIVE WORKFLOW EXPLORER ────────────────────────────── */}
            <section className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:px-8 relative z-10">
                <div className="space-y-2 mb-8 text-center">
                    <p className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Interactive Workflow Explorer</p>
                    <h2 className="text-2xl sm:text-4xl font-black">Select a Core Module</h2>
                </div>

                <div className="flex flex-wrap justify-center gap-2.5 mb-8">
                    {workflows.map((w, i) => (
                        <button
                            key={w.id}
                            type="button"
                            onClick={() => setSelectedWorkflow(i)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border ${
                                selectedWorkflow === i
                                    ? w.color === "emerald"
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                                        : w.color === "amber"
                                          ? "bg-amber-500 text-black border-amber-500 shadow-md"
                                          : "bg-orange-500 text-black border-orange-500 shadow-md"
                                    : "border-border text-muted-foreground hover:text-foreground bg-background"
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
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                    >
                        <div className="lg:col-span-7 space-y-5">
                            <div className="space-y-2">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    currentWorkflow.color === "emerald"
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                        : currentWorkflow.color === "amber"
                                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                          : "bg-orange-500/10 text-orange-700 dark:text-orange-400"
                                }`}>
                                    <currentWorkflow.icon className="h-3.5 w-3.5" /> {currentWorkflow.title}
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black">{currentWorkflow.tagline}</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {currentWorkflow.features.map((f, i) => (
                                    <div key={i} className="bg-slate-50/70 dark:bg-slate-950/40 border border-border rounded-2xl p-5 space-y-2.5 hover:border-emerald-500/30 transition-colors">
                                        <div className={`p-2 rounded-xl w-fit ${
                                            currentWorkflow.color === "emerald"
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                : currentWorkflow.color === "amber"
                                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                  : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                        }`}>
                                            <f.icon className="h-4 w-4" />
                                        </div>
                                        <h4 className="text-sm font-black">{f.title}</h4>
                                        <p className="text-xs text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-5 space-y-4">
                            <div className="bg-slate-50/70 dark:bg-slate-950/40 border border-border rounded-3xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black flex items-center gap-2">
                                        <FlaskConical className="h-4 w-4 text-emerald-500" /> Execution Sequence
                                    </h4>
                                    <button type="button" onClick={() => setConsoleStep(0)} className="text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
                                        <RefreshCw className="h-3 w-3" /> Replay
                                    </button>
                                </div>
                                <WorkflowConsole steps={currentWorkflow.steps} active={consoleStep} />
                                <div className="flex gap-1.5 pt-1 justify-center">
                                    {currentWorkflow.steps.map((_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setConsoleStep(i)}
                                            aria-label={`Jump to step ${i + 1}`}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                i === consoleStep ? "w-6 bg-emerald-500" : "w-1.5 bg-slate-300 dark:bg-slate-700"
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <Button asChild className={`w-full h-12 font-black rounded-2xl text-sm border-0 shadow-md group ${
                                currentWorkflow.color === "emerald"
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    : currentWorkflow.color === "amber"
                                      ? "bg-amber-500 hover:bg-amber-400 text-black"
                                      : "bg-orange-500 hover:bg-orange-400 text-black"
                            }`}>
                                <Link href="/copteller/onboarding">
                                    Start with This Module <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* ── CAPABILITY MATRIX BY ROLE ────────────────────────────────── */}
            <section className="bg-slate-50/70 dark:bg-slate-950/50 border-t border-border py-16 sm:py-20 px-4 sm:px-6 md:px-8 relative z-10">
                <div className="max-w-7xl mx-auto space-y-10">
                    <div className="text-center space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Role Capability Matrix</p>
                        <h2 className="text-3xl sm:text-4xl font-black">Purpose-Built Controls Per Scope</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                category: "Members & Operators",
                                color: "emerald",
                                icon: Coins,
                                items: [
                                    "Daily / weekly automated Ajo cycle deductions",
                                    "Transparent rotational queue visibility",
                                    "Hire-Purchase asset schedule & payoff meter",
                                    "Digital wallet transfers & virtual account funding",
                                    "Micro-grant & working-capital applications",
                                    "Behavioural savings streak & credit profile",
                                    "Printable & downloadable application receipts",
                                    "Mobility dispatch & split preview access",
                                ],
                            },
                            {
                                category: "Cooperative Admins",
                                color: "amber",
                                icon: Activity,
                                items: [
                                    "Guild member roster & KYC approval workflow",
                                    "Segregated union vault & group setup",
                                    "Operator → Asset matching & guarantor assignment",
                                    "HP scheme installment schedule tracking",
                                    "Grant criteria definition & shortlist moderation",
                                    "Role-scoped permissions enforced server-side",
                                    "Real-time ledger & exception reconciliation",
                                    "Printable cooperative membership onboarding kits",
                                ],
                            },
                            {
                                category: "Institutional Partners & MFBs",
                                color: "orange",
                                icon: TrendingUp,
                                items: [
                                    "Multi-union oversight across partner cooperatives",
                                    "Configurable underwriting splits & fee rules",
                                    "Dedicated partner settlement account custody",
                                    "Real-time operator payback exception tracking",
                                    "Superadmin role approval & audit logs",
                                    "Bank-grade CSV / ledger reconciliation exports",
                                    "Compliance controls aligned with CBN MFB rules",
                                    "Program structuring across transport, agro & trade",
                                ],
                            },
                        ].map((col, i) => (
                            <div key={i} className="bg-background border border-border rounded-3xl p-6 sm:p-7 space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-border">
                                    <div className={`p-2.5 rounded-xl ${
                                        col.color === "emerald"
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                            : col.color === "amber"
                                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                              : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                    }`}>
                                        <col.icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-base sm:text-lg font-black">{col.category}</h3>
                                </div>
                                <ul className="space-y-2.5">
                                    {col.items.map((item, j) => (
                                        <li key={j} className="flex items-start gap-2.5 text-xs font-medium text-muted-foreground">
                                            <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${
                                                col.color === "emerald" ? "text-emerald-500" : col.color === "amber" ? "text-amber-500" : "text-orange-500"
                                            }`} />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── WORKSPACE BLUEPRINTS (No Inflated Metrics) ───────────────── */}
            <section className="border-y border-border bg-slate-100/60 dark:bg-slate-900/30 py-16 sm:py-20 px-4 sm:px-6 md:px-8 relative z-10 overflow-hidden">
                <div className="max-w-7xl mx-auto space-y-10">
                    <div className="text-center space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Role-Isolated Interfaces</p>
                        <h2 className="text-3xl sm:text-4xl font-black">Sample Workspace Views</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto font-medium">
                            Each account role signs into a strictly separated workspace backed by backend authorization checks.
                        </p>
                    </div>

                    <div className="flex justify-center">
                        <div className="flex bg-background p-1.5 rounded-2xl border border-border w-full max-w-lg shadow-sm">
                            {[
                                { id: "member", label: "Member Portal", desc: "Operators & Savers" },
                                { id: "admin", label: "Union Console", desc: "Cooperative Officers" },
                                { id: "super", label: "Bank / MFB Oversight", desc: "Escrow & Compliance" },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setMockupTab(t.id as "member" | "admin" | "super")}
                                    className={`flex-1 py-2.5 px-2 rounded-xl transition-all text-center flex flex-col items-center justify-center ${
                                        mockupTab === t.id
                                            ? "bg-slate-100 dark:bg-slate-800 text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <span className="text-xs font-black">{t.label}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium mt-0.5 hidden sm:block">{t.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-background border border-border rounded-[28px] p-6 sm:p-8 max-w-4xl mx-auto shadow-xl">
                        <AnimatePresence mode="wait">
                            {mockupTab === "member" && (
                                <motion.div key="member" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                                    <div className="flex justify-between items-center border-b border-border pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-xs">
                                                MV
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black">Sample Member Profile</h4>
                                                <p className="text-[11px] text-muted-foreground font-medium">Commercial Operators Cooperative</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-none font-black uppercase text-[10px]">KYC Verified</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-900/60 border border-border p-4 rounded-2xl space-y-1">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">Escrow Wallet</p>
                                            <p className="text-lg font-black text-foreground">MFB Sub-Ledger</p>
                                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Virtual account funding active</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/60 border border-border p-4 rounded-2xl space-y-1">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">Ajo Queue</p>
                                            <p className="text-lg font-black text-foreground">Deterministic Slot</p>
                                            <p className="text-[11px] text-muted-foreground font-medium">Fixed cycle payout turn</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/60 border border-border p-4 rounded-2xl space-y-1">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">Asset HP Ledger</p>
                                            <p className="text-lg font-black text-foreground">Weekly Amortization</p>
                                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">Tracks down to title release</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {mockupTab === "admin" && (
                                <motion.div key="admin" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                                    <div className="flex justify-between items-center border-b border-border pb-4">
                                        <div>
                                            <h4 className="text-sm font-black">Cooperative Management Console</h4>
                                            <p className="text-[11px] text-muted-foreground font-medium">Union-scoped operational controls</p>
                                        </div>
                                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-none font-black uppercase text-[10px]">Co-Op Admin Scope</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {[
                                            { label: "Roster & Forms", value: "BVN & Print Kits", sub: "Approve member onboarding" },
                                            { label: "Asset Assignment", value: "Chassis / Serial Link", sub: "Bind asset to operator" },
                                            { label: "Disbursements", value: "Dual Approval Queue", sub: "Logged to MFB audit trail" },
                                        ].map((card, idx) => (
                                            <div key={idx} className="bg-slate-50 dark:bg-slate-900/60 border border-border p-4 rounded-2xl space-y-1">
                                                <p className="text-[10px] text-muted-foreground font-black uppercase">{card.label}</p>
                                                <p className="text-lg font-black text-foreground">{card.value}</p>
                                                <p className="text-[11px] text-muted-foreground font-medium">{card.sub}</p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {mockupTab === "super" && (
                                <motion.div key="super" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                                    <div className="flex justify-between items-center border-b border-border pb-4">
                                        <div>
                                            <h4 className="text-sm font-black">Partner Microfinance Bank Oversight</h4>
                                            <p className="text-[11px] text-muted-foreground font-medium">Escrow treasury & compliance supervision</p>
                                        </div>
                                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-none font-black uppercase text-[10px]">MFB Compliant</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-900/60 border border-border p-4 rounded-2xl space-y-1">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">Custodial Structure</p>
                                            <p className="text-lg font-black text-foreground">1:1 Bank Escrow</p>
                                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Segregated union accounts</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/60 border border-border p-4 rounded-2xl space-y-1">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">Permission Boundary</p>
                                            <p className="text-lg font-black text-foreground">Verified Invite Only</p>
                                            <p className="text-[11px] text-muted-foreground font-medium">Server-enforced API guards</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/60 border border-border p-4 rounded-2xl space-y-1">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">Reconciliation</p>
                                            <p className="text-lg font-black text-foreground">Double-Entry Log</p>
                                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Full ledger export history</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </section>

            {/* ── PLATFORM PRIMITIVES & CODE SCHEMA ────────────────────────── */}
            <section className="max-w-7xl mx-auto py-16 sm:py-20 px-4 sm:px-6 md:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
                    <div className="space-y-5">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Platform Primitives</p>
                            <h2 className="text-3xl sm:text-4xl font-black leading-tight">Workflows, Escrow Vaults & Payment APIs</h2>
                        </div>
                        <p className="text-muted-foreground text-xs sm:text-sm font-medium leading-relaxed">
                            Every thrift deduction, loan schedule, and Hire-Purchase installment runs through an idempotent execution pipeline connected to identity checks and core banking settlement endpoints.
                        </p>
                        <div className="space-y-3">
                            {[
                                { icon: Cpu, label: "Workflow Engine", desc: "Deterministic multi-step clearing with idempotent retries" },
                                { icon: KeyRound, label: "Service Credential Isolation", desc: "Scoped API secrets separated per banking & settlement provider" },
                                { icon: Building2, label: "Partner MFB Treasury", desc: "Clean ledger synchronization with any licensed Partner MFB" },
                                { icon: Globe, label: "Payment Collectors", desc: "Paystack, Flutterwave, and NIBSS routing for automated inflows" },
                            ].map((api, i) => (
                                <div key={i} className="flex items-start gap-3.5 p-4 bg-slate-50/70 dark:bg-slate-950/40 border border-border rounded-2xl">
                                    <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                                        <api.icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black">{api.label}</p>
                                        <p className="text-xs text-muted-foreground font-medium mt-0.5">{api.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#050505] rounded-3xl border border-emerald-900/30 p-6 font-mono text-xs space-y-1.5 shadow-2xl overflow-x-auto">
                        <div className="flex items-center gap-2 pb-4 border-b border-slate-900">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                            </div>
                            <span className="text-slate-500 text-[11px]">copteller_workflow.json</span>
                        </div>
                        {WORKFLOW_CODE_LINES.map((line, i) => (
                            <div key={i} className={line.className}>
                                {line.text}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────────────────────── */}
            <section className="px-4 sm:px-6 md:px-8 pb-16 sm:pb-24 relative z-10">
                <div className="max-w-4xl mx-auto bg-gradient-to-r from-emerald-600 to-amber-500 rounded-[32px] p-8 sm:p-14 text-center space-y-5 relative overflow-hidden">
                    <div className="relative z-10 space-y-4">
                        <h2 className="text-3xl sm:text-4xl font-black text-black">Ready to Automate Your Cooperative?</h2>
                        <p className="text-black/80 max-w-xl mx-auto text-xs sm:text-sm font-semibold">
                            Choose your onboarding role or explore cooperative program structures designed for partner Microfinance Banks.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button asChild size="lg" className="bg-black text-white hover:bg-slate-900 font-black h-12 px-7 rounded-2xl text-sm border-0">
                                <Link href="/copteller/onboarding">Start Onboarding <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="border-black/30 text-black hover:bg-black/10 font-bold h-12 px-7 rounded-2xl text-sm">
                                <Link href="/copteller/investment">Institutional Programs</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
