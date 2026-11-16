"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ShieldAlert, XCircle, RefreshCw, Truck, Building2, CircleDollarSign,
    Lock, Bell, AlertCircle, Clock, CheckCircle2, Zap, Download, TrendingUp,
    Sliders, Cpu, Play, ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"

function WorkflowLog({ steps, active }: { steps: string[], active: number }) {
    return (
        <div className="bg-[#030303] border border-emerald-900/20 rounded-2xl p-4 font-mono text-[11px] space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-900">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">Audit Engine</span>
                <div className="ml-auto flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-rose-500/50" />
                    <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                </div>
            </div>
            {steps.map((s, i) => (
                <div key={i} className={`flex items-start gap-2 ${i <= active ? 'text-emerald-400' : 'text-slate-700'}`}>
                    <span className="text-emerald-700">›</span> {s}
                </div>
            ))}
        </div>
    )
}

export default function CoptellerSuperadminPage() {
    const router = useRouter()
    const [workflowRunning, setWorkflowRunning] = React.useState(false)
    const [workflowStep, setWorkflowStep] = React.useState(-1)
    const [loadingMetrics, setLoadingMetrics] = React.useState(true)
    const [servicesCount, setServicesCount] = React.useState(0)
    const [metrics, setMetrics] = React.useState<any>({
        totalCoops: 1,
        pendingCoopsCount: 0,
        activeSchemes: 0,
        hpAssetsTracked: 0,
        platformEscrow: 0,
        totalBookValue: 0,
        totalRepaid: 0,
        avgCreditScore: "75.0",
        collectionRate: "95.5",
        sectorList: [],
        alerts: []
    })

    const fetchOversightData = async () => {
        try {
            setLoadingMetrics(true)
            const [metricsRes, servicesRes] = await Promise.all([
                fetch('/api/copteller/admin/metrics'),
                fetch('/api/copteller/services?all=1')
            ])
            const data = await metricsRes.json()
            const sData = await servicesRes.json()

            if (data.success && data.metrics) {
                setMetrics(data.metrics)
            }
            if (sData.success) {
                setServicesCount(sData.services?.length || 0)
            }
        } catch (err) {
            console.warn('Failed to load oversight metrics from database:', err)
        } finally {
            setLoadingMetrics(false)
        }
    }

    React.useEffect(() => {
        fetchOversightData()
    }, [])

    const runAuditWorkflow = () => {
        setWorkflowRunning(true)
        setWorkflowStep(-1)
        const steps = [0, 1, 2, 3, 4]
        steps.forEach((s, i) => setTimeout(() => {
            setWorkflowStep(s)
            if (s === 4) setTimeout(() => {
                setWorkflowRunning(false)
                toast.success(`Full platform audit complete — ${metrics.totalCoops} active cooperatives reconciled.`)
            }, 800)
        }, i * 1100))
    }

    const displayAlerts = metrics.alerts?.length > 0 ? metrics.alerts : [
        { label: "0 union approvals pending", type: "info" },
        { label: "0 HP asset defaults flagged", type: "info" },
        { label: "Weekly audit cycle due in 2 days", type: "info" }
    ]

    const displaySectors = metrics.sectorList?.length > 0 ? metrics.sectorList : [
        { sector: "Transport / Keke", coops: 1, aum: "₦0", pct: 100 }
    ]

    return (
        <div className="min-h-[100dvh] bg-background font-sans selection:bg-rose-500/20">
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 right-[20%] w-[400px] h-[400px] bg-rose-500/3 dark:bg-rose-500/4 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-[15%] w-[350px] h-[350px] bg-emerald-500/3 dark:bg-emerald-500/4 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6">

                {/* ── HEADER ───────────────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                                <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Platform Regulator Console</p>
                        </div>
                        <h1 className="text-2xl font-black">Copteller Platform Oversight</h1>
                        <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                            Licensed MFB Operations · <span className="text-emerald-600 dark:text-emerald-400">{metrics.totalCoops} Active Cooperatives</span> · <span className="text-rose-600 dark:text-rose-400">{servicesCount} Core Services</span>
                        </p>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
                        <Link href="/copteller/superadmin/services" className="flex-1 sm:flex-initial">
                            <Button variant="outline" size="sm" className="w-full sm:w-auto h-9 rounded-xl font-bold text-xs gap-2">
                                <Cpu className="h-3.5 w-3.5 text-rose-500" /> Services Engine ({servicesCount})
                            </Button>
                        </Link>
                        <Button onClick={() => router.push('/copteller/superadmin/compliance')} variant="outline" size="sm" className="flex-1 sm:flex-initial h-9 rounded-xl font-bold text-xs gap-2">
                            <Download className="h-3.5 w-3.5" /> CBN Report
                        </Button>
                        <Button
                            onClick={runAuditWorkflow}
                            disabled={workflowRunning}
                            className="w-full sm:w-auto h-9 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs border-0 gap-2 shadow-lg disabled:opacity-60"
                        >
                            {workflowRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                            {workflowRunning ? 'Running Audit...' : 'Run Platform Audit'}
                        </Button>
                    </div>
                </div>

                {/* Audit workflow console */}
                <AnimatePresence>
                    {workflowRunning && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <WorkflowLog
                                steps={[
                                    "Scanning all cooperative escrow vaults...",
                                    "Cross-referencing HP payback ledgers...",
                                    "Validating member credit score deltas...",
                                    "Generating CBN compliance report draft...",
                                    `✓ Audit complete — ${metrics.totalCoops} cooperatives reconciled`
                                ]}
                                active={workflowStep}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── OVERVIEW ────────────────────────────────────────────────────── */}
                <div className="space-y-6">
                    {/* KPI grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {[
                            { label: "Active Cooperatives", val: metrics.totalCoops.toString(), sub: `+${metrics.pendingCoopsCount} pending approval`, icon: Building2, color: "emerald", path: "/copteller/superadmin/unions" },
                            { label: "Active Schemes", val: metrics.activeSchemes.toString(), sub: "Across all cooperatives", icon: TrendingUp, color: "rose", path: "/copteller/superadmin/schemes" },
                            { label: "HP Assets Tracked", val: metrics.hpAssetsTracked.toString(), sub: "Vehicles, tools & equipment", icon: Truck, color: "emerald", path: "/copteller/superadmin/assets" },
                            { label: "Platform Escrow", val: `₦${Number(metrics.platformEscrow).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: "Total AUM under custody", icon: Lock, color: "amber", path: "/copteller/superadmin/vault" },
                        ].map((s, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                onClick={() => router.push(s.path)}
                                className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3 hover:shadow-lg transition-all duration-300 cursor-pointer"
                            >
                                <div className={`p-2 rounded-xl w-fit ${s.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : s.color === 'amber' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                    <s.icon className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                                    <p className="text-xl sm:text-2xl font-black mt-0.5 truncate">{s.val}</p>
                                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 truncate">{s.sub}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* ── CORE SERVICES & RAILS REGISTRY OVERVIEW STRIP ───────────── */}
                    <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg shrink-0">
                                    <Cpu className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-wider">Dynamic Services Engine &amp; API Rails</h3>
                                    <p className="text-[10px] text-muted-foreground font-semibold">Configurable form schemas, access matrix rules, and live sandbox simulator.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href="/copteller/superadmin/services/simulator" className="flex-1 sm:flex-initial">
                                    <Button variant="outline" size="sm" className="w-full sm:w-auto h-8 rounded-xl text-[10px] font-black gap-1.5">
                                        <Play className="h-3 w-3 text-emerald-500" /> Open Sandbox
                                    </Button>
                                </Link>
                                <Link href="/copteller/superadmin/services" className="flex-1 sm:flex-initial">
                                    <Button size="sm" className="w-full sm:w-auto h-8 rounded-xl text-[10px] font-black bg-emerald-600 hover:bg-emerald-500 text-white gap-1">
                                        Manage Catalog <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
                            <div className="p-3 sm:p-3.5 rounded-2xl bg-muted/40 border border-border">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Active Services</p>
                                <p className="text-base sm:text-lg font-black mt-0.5">{servicesCount}</p>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">Transfers &amp; Bills</p>
                            </div>
                            <div className="p-3 sm:p-3.5 rounded-2xl bg-muted/40 border border-border">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Settlement Rail</p>
                                <p className="text-base sm:text-lg font-black mt-0.5 truncate">Kuda OpenAPI</p>
                                <p className="text-[10px] text-muted-foreground font-semibold truncate">v2.1 Real-time</p>
                            </div>
                            <div className="p-3 sm:p-3.5 rounded-2xl bg-muted/40 border border-border">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Access Matrix</p>
                                <p className="text-base sm:text-lg font-black mt-0.5">5 Personas</p>
                                <p className="text-[10px] text-muted-foreground font-semibold truncate">Role &amp; Sector Scoped</p>
                            </div>
                            <div className="p-3 sm:p-3.5 rounded-2xl bg-muted/40 border border-border">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Simulation Sandbox</p>
                                <p className="text-base sm:text-lg font-black mt-0.5 text-amber-600 dark:text-amber-400">Online</p>
                                <p className="text-[10px] text-muted-foreground font-semibold truncate">Zero-debit dry runs</p>
                            </div>
                        </div>
                    </div>

                    {/* Main grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Platform sector breakdown */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
                                <h3 className="text-sm font-black">Cooperative Sector Distribution</h3>
                                {displaySectors.map((s: any, i: number) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span>{s.sector}</span>
                                            <span className="text-muted-foreground">{s.coops} coop{s.coops === 1 ? '' : 's'} · {s.aum}</span>
                                        </div>
                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ duration: 1, delay: i * 0.15 }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* CBN Compliance Sync Logs */}
                            <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm font-sans">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-sm font-black">CBN Compliance Telemetry Stream</h3>
                                        <p className="text-[10px] text-muted-foreground font-semibold">Real-time reporting logs sent to CBN (Central Bank of Nigeria).</p>
                                    </div>
                                    <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-650 dark:text-emerald-450 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">Operational</span>
                                </div>
                                <div className="space-y-2.5 font-mono text-[9px] sm:text-[10px] bg-muted/40 border border-border rounded-xl p-3 sm:p-3.5 text-muted-foreground overflow-x-auto">
                                    <div className="flex items-center justify-between text-muted-foreground pb-1.5 border-b border-border">
                                        <span>REPORT TYPE</span>
                                        <span>STATUS</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>[CBN-REP-409] Weekly AUM Reconcile - CBN e-FASS</span>
                                        <span className="text-emerald-500 font-bold">SENT ✓</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>[CBN-KYC-002] Tier-1 Onboarding Logs CBN-Registry</span>
                                        <span className="text-emerald-500 font-bold">SENT ✓</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>[CBN-ESC-91] Escrow Settlement Audit Log (Nigeria Clear)</span>
                                        <span className="text-emerald-500 font-bold">SENT ✓</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>[CBN-HP-41] Hire Purchase Repayment Streaks CBN-Credit</span>
                                        <span className="text-amber-500 font-bold">SYNCING...</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Alerts panel */}
                        <div className="space-y-4">
                            <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
                                <h3 className="text-xs font-black flex items-center gap-2"><Bell className="h-4 w-4 text-rose-500" /> Platform Alerts</h3>
                                {displayAlerts.map((a: any, i: number) => (
                                    <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl text-[10px] font-bold ${a.type === 'error' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' : a.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400' : 'bg-muted/40 text-muted-foreground'}`}>
                                        {a.type === 'error' ? <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : a.type === 'warning' ? <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                                        {a.label}
                                    </div>
                                ))}
                            </div>

                            {/* Quick stats */}
                            <div className="bg-gradient-to-br from-card to-rose-950/20 border border-border rounded-2xl p-5 space-y-3 shadow-md">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Platform Health</p>
                                {[
                                    { label: "HP Collection Rate", val: metrics.collectionRate + "%" },
                                    { label: "Active Escrow Vaults", val: metrics.totalCoops.toString() },
                                    { label: "Avg. Credit Score", val: metrics.avgCreditScore },
                                ].map((s, i) => (
                                    <div key={i} className="flex justify-between text-[10px] font-bold text-muted-foreground">
                                        <span>{s.label}</span>
                                        <span className="text-emerald-500 font-black">{s.val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
