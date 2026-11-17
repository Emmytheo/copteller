"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Users, Truck, CircleDollarSign, BarChart3, AlertCircle, Clock, CheckCircle2,
    RefreshCw, Zap, TrendingUp, PiggyBank, Briefcase, Sliders, ArrowRight, ShieldCheck,
    CreditCard, Lightbulb, Smartphone, Tv, HeartPulse, Landmark, Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { UnionCollectionChart } from "@/components/charts/union-collection-chart"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        "Active": "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        "Pending": "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
        "Suspended": "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
        "Defaulting": "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
    }
    return (
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${map[status] ?? 'bg-muted border-border text-muted-foreground'}`}>
            {status}
        </span>
    )
}

const INITIAL_COOP = {
    id: "MTOU-01",
    name: "Metro Tricycle Operators Union (MTOU)",
    sector: "transport",
    description: "Central union governing commercial tricycle operators, route allocations, and asset-lease financing across Aba and Umuahia.",
    status: "active",
    tier: "tier_1",
    totalMembers: 1420,
}

const INITIAL_OPERATORS = [
    {
        id: "op_01",
        membershipId: "MBR-TRN-001",
        name: "Kalu Onyekachi",
        email: "kalu.onyekachi@gmail.com",
        phone: "0803 123 4567",
        balance: 84500,
        accountNumber: "0092819209",
        kycStatus: "verified",
        status: "Active",
        role: "member",
        shares: 12,
        creditScore: 87,
        ajoActive: true,
        hpActive: true,
        totalDuesPaid: 420000,
        duesArrears: 0,
        assignedVehicle: "TVS King Commercial",
        vehiclePlate: "ABA-404-TR",
        engineNumber: "ENG-TVS-991204",
        weeklyRent: 18000,
        paid: 420000,
        total: 1400000,
        streak: 14,
        route: "Aba North - Ariaria Market Corridor",
        licenseNo: "DRV-AB-992140",
        guarantor: "Elder Jonas Okafor",
        guarantorPhone: "0802 998 1234"
    },
    {
        id: "op_02",
        membershipId: "MBR-TRN-002",
        name: "Emeka Obi",
        email: "emeka.obi@yahoo.com",
        phone: "0802 987 6543",
        balance: 142000,
        accountNumber: "0088129021",
        kycStatus: "verified",
        status: "Active",
        role: "member",
        shares: 20,
        creditScore: 91,
        ajoActive: true,
        hpActive: true,
        totalDuesPaid: 700000,
        duesArrears: 0,
        assignedVehicle: "Haojin Commercial Hauler",
        vehiclePlate: "ABA-211-TR",
        engineNumber: "ENG-HJ-558129",
        weeklyRent: 18000,
        paid: 700000,
        total: 1400000,
        streak: 22,
        route: "Faulks Road - Ekeakpara Axis",
        licenseNo: "DRV-AB-441820",
        guarantor: "Chief Michael Eze",
        guarantorPhone: "0803 771 9090"
    },
    {
        id: "op_03",
        membershipId: "MBR-TRN-003",
        name: "Ngozi Eze",
        email: "ngozi.eze@outlook.com",
        phone: "0813 456 7890",
        balance: 31500,
        accountNumber: "0084712930",
        kycStatus: "verified",
        status: "Active",
        role: "member",
        shares: 8,
        creditScore: 74,
        ajoActive: true,
        hpActive: true,
        totalDuesPaid: 120000,
        duesArrears: 0,
        assignedVehicle: "Bajaj RE 4S Tricycle",
        vehiclePlate: "ABA-088-TR",
        engineNumber: "ENG-BJ-771902",
        weeklyRent: 15000,
        paid: 120000,
        total: 1200000,
        streak: 4,
        route: "Ogbor Hill - Opobo Road Route",
        licenseNo: "DRV-AB-102948",
        guarantor: "Madam Chinyere Eze",
        guarantorPhone: "0805 112 3344"
    },
    {
        id: "op_04",
        membershipId: "MBR-TRN-004",
        name: "Chukwu Nna",
        email: "chukwu.nna@gmail.com",
        phone: "0805 566 7788",
        balance: 4200,
        accountNumber: "0091002912",
        kycStatus: "verified",
        status: "Defaulting",
        role: "member",
        shares: 5,
        creditScore: 62,
        ajoActive: false,
        hpActive: true,
        totalDuesPaid: 280000,
        duesArrears: 36000,
        assignedVehicle: "TVS King Commercial",
        vehiclePlate: "ABA-519-TR",
        engineNumber: "ENG-TVS-330192",
        weeklyRent: 18000,
        paid: 280000,
        total: 1400000,
        streak: 0,
        route: "Osisioma Flyover - Brass Junction",
        licenseNo: "DRV-AB-772910",
        guarantor: "Pastor Godwin Nna",
        guarantorPhone: "0809 334 5566"
    },
    {
        id: "op_05",
        membershipId: "MBR-TRN-005",
        name: "Ada Okafor",
        email: "ada.okafor@gmail.com",
        phone: "0809 234 5670",
        balance: 215000,
        accountNumber: "0093827412",
        kycStatus: "verified",
        status: "Active",
        role: "member",
        shares: 35,
        creditScore: 95,
        ajoActive: true,
        hpActive: true,
        totalDuesPaid: 1100000,
        duesArrears: 0,
        assignedVehicle: "Haojin Commercial Hauler",
        vehiclePlate: "ABA-332-TR",
        engineNumber: "ENG-HJ-889012",
        weeklyRent: 18000,
        paid: 1100000,
        total: 1400000,
        streak: 36,
        route: "Aba Central - Shopping Centre",
        licenseNo: "DRV-AB-339182",
        guarantor: "Engr. Paul Okafor",
        guarantorPhone: "0812 556 7788"
    },
    {
        id: "op_06",
        membershipId: "MBR-TRN-006",
        name: "Ifeanyi Madu",
        email: "ifeanyi.madu@gmail.com",
        phone: "0816 789 0123",
        balance: 92000,
        accountNumber: "0066192831",
        kycStatus: "verified",
        status: "Active",
        role: "member",
        shares: 15,
        creditScore: 89,
        ajoActive: true,
        hpActive: true,
        totalDuesPaid: 850000,
        duesArrears: 0,
        assignedVehicle: "Piaggio Commercial Hauler",
        vehiclePlate: "ABA-712-TR",
        engineNumber: "ENG-PG-660192",
        weeklyRent: 20000,
        paid: 850000,
        total: 1500000,
        streak: 19,
        route: "Port Harcourt Road Industrial Zone",
        licenseNo: "DRV-AB-558291",
        guarantor: "Elder Simon Madu",
        guarantorPhone: "0803 889 0123"
    }
]

const INITIAL_SERVICES = [
    { id: "srv_toll", name: "Daily Route Toll & Sticker Dues", unionEnabled: true },
    { id: "srv_welfare", name: "Union Welfare & Emergency Relief", unionEnabled: true },
    { id: "srv_hp", name: "Hire Purchase Asset Lease Escrow", unionEnabled: true },
    { id: "srv_cng", name: "Subsidized Clean Energy Fuel Voucher", unionEnabled: true }
]

const INITIAL_CONTRACTS = [
    { id: "ct_01", status: "active", contract_type: "hire_purchase" },
    { id: "ct_02", status: "active", contract_type: "hire_purchase" },
    { id: "ct_03", status: "active", contract_type: "ajo_enrollment" },
    { id: "ct_04", status: "defaulted", contract_type: "hire_purchase" },
    { id: "ct_05", status: "active", contract_type: "hire_purchase" }
]

export default function CooperativeAdminConsole() {
    const router = useRouter()
    const [operatorsList, setOperatorsList] = React.useState<any[]>(INITIAL_OPERATORS)
    const [coopProfile, setCoopProfile] = React.useState<any>(INITIAL_COOP)
    const [schemes, setSchemes] = React.useState<any[]>([])
    const [contracts, setContracts] = React.useState<any[]>(INITIAL_CONTRACTS)
    const [services, setServices] = React.useState<any[]>(INITIAL_SERVICES)
    const [loading, setLoading] = React.useState(false)
    const [workflowRunning, setWorkflowRunning] = React.useState(false)
    const [workflowStep, setWorkflowStep] = React.useState<number | null>(null)

    const fetchAdminDashboardData = async () => {
        try {
            // Fetch profile, operators, and services concurrently
            const [coopRes, operatorsRes, servicesRes] = await Promise.allSettled([
                fetch('/api/copteller/admin/cooperative-profile').then(r => r.json()),
                fetch('/api/copteller/admin/operators').then(r => r.json()),
                fetch('/api/copteller/admin/services').then(r => r.json()),
            ])

            let coopId = INITIAL_COOP.id

            if (coopRes.status === 'fulfilled' && coopRes.value?.success && coopRes.value?.cooperative) {
                setCoopProfile(coopRes.value.cooperative)
                coopId = coopRes.value.cooperative.id || coopId
            }

            if (operatorsRes.status === 'fulfilled' && operatorsRes.value?.success && operatorsRes.value?.operators?.length) {
                setOperatorsList(operatorsRes.value.operators)
            }

            if (servicesRes.status === 'fulfilled' && servicesRes.value?.success && servicesRes.value?.services?.length) {
                setServices(servicesRes.value.services)
            }

            // Fetch schemes and contracts in parallel
            const [schemesRes, contractsRes] = await Promise.allSettled([
                fetch(`/api/copteller/schemes?cooperativeId=${coopId}`).then(r => r.json()),
                fetch(`/api/copteller/contracts?cooperativeId=${coopId}`).then(r => r.json()),
            ])

            if (schemesRes.status === 'fulfilled' && schemesRes.value?.data) {
                setSchemes(schemesRes.value.data)
            }
            if (contractsRes.status === 'fulfilled' && contractsRes.value?.data) {
                setContracts(contractsRes.value.data)
            }
        } catch (err) {
            console.error('Failed to load admin workspace stats:', err)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchAdminDashboardData()
    }, [])

    const runWorkflow = async () => {
        setWorkflowRunning(true)
        setWorkflowStep(0)
        
        const interval = setInterval(() => {
            setWorkflowStep(prev => {
                if (prev === null) return 0
                if (prev >= 3) {
                    clearInterval(interval)
                    return 3
                }
                return prev + 1
            })
        }, 800)

        const tId = toast.loading("Invoking esusu rotational contributions clearing engine...")
        try {
            const res = await fetch('/api/cooperatives/run-collection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await res.json()
            clearInterval(interval)
            
            if (data.success && data.summary?.length > 0) {
                const totalCleared = data.summary.reduce((acc: number, item: any) => acc + item.collected, 0)
                setWorkflowStep(4)
                setTimeout(() => {
                    setWorkflowRunning(false)
                    setWorkflowStep(null)
                    toast.success(`Cleared ₦${(totalCleared / 100).toLocaleString()} across cycles! Disbursed payouts to recipients.`, { id: tId })
                    fetchAdminDashboardData()
                }, 800)
            } else {
                setWorkflowStep(4)
                setTimeout(() => {
                    setWorkflowRunning(false)
                    setWorkflowStep(null)
                    toast.success("Weekly collection simulation complete — no active cycles found in database.", { id: tId })
                }, 800)
            }
        } catch (err) {
            clearInterval(interval)
            setWorkflowRunning(false)
            setWorkflowStep(null)
            toast.error("Collection execution failed: Network error", { id: tId })
        }
    }

    // Calculations
    const sector = coopProfile?.sector || 'commerce'
    const totalMemberBalances = operatorsList.reduce((sum, op) => sum + (op.balance || 0), 0) / 100
    const activeContracts = contracts.filter(c => c.status === 'active')
    const defaultedContracts = contracts.filter(c => c.status === 'defaulted')
    const enabledServicesCount = services.filter(s => s.unionEnabled).length

    if (loading) {
        return (
            <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Loading Admin Console...</p>
            </div>
        )
    }

    return (
        <div className="min-h-[100dvh] bg-background font-sans selection:bg-amber-500/20">
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute top-0 left-[25%] w-[400px] h-[400px] bg-amber-500/3 dark:bg-amber-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6">

                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cooperative Admin Workspace</p>
                        <h1 className="text-xl sm:text-2xl font-black">{coopProfile ? coopProfile.name : "Cooperative Guild Admin"}</h1>
                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                            <span className="capitalize">{sector}</span> Sector Group &bull; <span className="text-amber-600 dark:text-amber-400">{operatorsList.length} Registered Members</span>
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                        <Link href="/copteller/admin/services" className="w-full sm:w-auto">
                            <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold gap-2 w-full sm:w-auto">
                                <Zap className="h-3.5 w-3.5 text-amber-500" />
                                Provision Services ({enabledServicesCount}/{services.length})
                            </Button>
                        </Link>
                        <Button
                            onClick={runWorkflow}
                            disabled={workflowRunning}
                            className="h-9 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-black font-black text-xs border-0 gap-2 shadow-lg disabled:opacity-60 w-full sm:w-auto"
                        >
                            {workflowRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                            {workflowRunning ? 'Running...' : 'Run Weekly Clearing'}
                        </Button>
                    </div>
                </div>

                {/* Workflow execution console */}
                <AnimatePresence>
                    {workflowRunning && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-[#050505] border border-emerald-900/30 rounded-2xl p-4 font-mono text-xs space-y-1.5 overflow-hidden"
                        >
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest">Clearing Engine Running</span>
                            </div>
                            <div className="text-slate-400 space-y-1 mt-2">
                                <p className={workflowStep !== null && workflowStep >= 0 ? 'text-emerald-400' : 'opacity-40'}>› Indexing member active savings wallets...</p>
                                <p className={workflowStep !== null && workflowStep >= 1 ? 'text-emerald-400' : 'opacity-40'}>› Reconciling weekly rental and contribution dues...</p>
                                <p className={workflowStep !== null && workflowStep >= 2 ? 'text-emerald-400' : 'opacity-40'}>› Drafting Escrow collections ledger log...</p>
                                <p className={workflowStep !== null && workflowStep >= 3 ? 'text-emerald-400' : 'opacity-40'}>› Transferring pooled funds to active payouts slots...</p>
                                <p className={workflowStep !== null && workflowStep >= 4 ? 'text-emerald-400' : 'opacity-40'}>✓ Reconciled successfully.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Stat cards row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[
                        { label: "Coop Roster", val: `${operatorsList.length} Members`, icon: Users, color: "emerald", sub: "Active registry roster", path: "/copteller/admin/members" },
                        { label: "Active Agreements", val: `${activeContracts.length} active`, icon: Briefcase, color: "amber", sub: `${defaultedContracts.length} defaulting/delinquent`, path: "/copteller/admin/schemes" },
                        { 
                            label: "Total Vault Balance", 
                            val: `₦${totalMemberBalances.toLocaleString(undefined, {maximumFractionDigits: 2})}`,
                            icon: CircleDollarSign, 
                            color: "emerald", 
                            sub: "Pooled ledger deposits", 
                            path: "/copteller/admin/ledger" 
                        },
                        { label: "Union Services", val: `${enabledServicesCount} Live`, icon: Zap, color: "amber", sub: "Provisioned payment rails", path: "/copteller/admin/services" },
                    ].map((s, i) => (
                        <div
                            key={i}
                            onClick={() => router.push(s.path)}
                            className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3 cursor-pointer hover:shadow-md transition-all"
                        >
                            <div className={`p-2 rounded-xl w-fit ${s.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                <s.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                                <p className="text-base sm:text-lg font-black mt-0.5 truncate">{s.val}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 truncate">{s.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── UNION WEEKLY COLLECTIONS & CLEARING VELOCITY CHART ──────── */}
                <UnionCollectionChart
                    unionName={coopProfile ? coopProfile.name : "Cooperative Guild"}
                    memberCount={operatorsList.length || 450}
                    defaultTimeframe="12W"
                />

                {/* ── UNION SERVICES PROVISIONING OVERVIEW STRIP ────────────────── */}
                <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                <Zap className="h-3.5 w-3.5 text-amber-500" />
                                Union Service Offerings &amp; Commission Matrix
                            </h3>
                            <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                                Active banking, transport lease, utility and fee services available to your cooperative operators.
                            </p>
                        </div>
                        <Link href="/copteller/admin/services" className="shrink-0">
                            <Button variant="outline" size="sm" className="h-8 rounded-xl text-[10px] font-black gap-1 w-full sm:w-auto">
                                Manage Services <ArrowRight className="h-3 w-3" />
                            </Button>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {services.slice(0, 3).map((service: any) => (
                            <div
                                key={service.id}
                                className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                                    service.unionEnabled ? "bg-muted/30 border-border" : "bg-muted/10 border-border opacity-60"
                                }`}
                            >
                                <div className="space-y-0.5 min-w-0">
                                    <p className="text-xs font-bold truncate">{service.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                        Base: {service.fee_type === "none" ? "Free" : `₦${service.fee_value}`} · Markup: {service.unionFeeMarkup > 0 ? `+₦${service.unionFeeMarkup}` : "₦0"}
                                    </p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                    service.unionEnabled
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                        : "bg-muted text-muted-foreground border border-border"
                                }`}>
                                    {service.unionEnabled ? "Active" : "Off"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── INSTITUTIONAL WELFARE & SCHEME UPTAKE TELEMETRY ─────────── */}
                <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Landmark className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                    Institutional Schemes &amp; Welfare Uptake
                                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        100% Escrow Backed
                                    </span>
                                </h3>
                                <p className="text-[11px] text-muted-foreground font-semibold">
                                    State parastatal and private investor schemes amortized weekly via automated Ajo clearing.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/copteller/investor/schemes">
                                <Button variant="outline" size="sm" className="h-8 rounded-xl text-[10px] font-black gap-1">
                                    <TrendingUp className="h-3 w-3 text-emerald-500" /> Co-Funded Marketplace
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                    <HeartPulse className="h-3.5 w-3.5" /> Cooperative Health Cover
                                </span>
                                <span className="text-xs font-black text-foreground">84% Enrolled</span>
                            </div>
                            <div className="w-full h-2 bg-rose-500/20 rounded-full overflow-hidden">
                                <div className="bg-rose-500 h-full rounded-full" style={{ width: "84%" }} />
                            </div>
                            <p className="text-[10px] text-muted-foreground font-semibold">
                                ₦300/week automated deduction &bull; Active at Partner Medical Centres
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                    <Truck className="h-3.5 w-3.5" /> TVS Fleet Subvention
                                </span>
                                <span className="text-xs font-black text-foreground">38% Active</span>
                            </div>
                            <div className="w-full h-2 bg-blue-500/20 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full" style={{ width: "38%" }} />
                            </div>
                            <p className="text-[10px] text-muted-foreground font-semibold">
                                ₦18,000/week telemetry lease &bull; Guaranteed by Min of Transport
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <ShieldCheck className="h-3.5 w-3.5" /> Clearing SLA Streak
                                </span>
                                <span className="text-xs font-black text-foreground">94.8% Prime</span>
                            </div>
                            <div className="w-full h-2 bg-emerald-500/20 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: "94.8%" }} />
                            </div>
                            <p className="text-[10px] text-muted-foreground font-semibold">
                                Weekly automated settlement &bull; Escrow Account #3000881920
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Dashboard Rows */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Member Performance Ledger */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-black">Member Performance Ledger</h3>
                                <Button onClick={() => router.push('/copteller/admin/members')} variant="ghost" size="sm" className="h-7 rounded-xl text-[10px] font-bold text-muted-foreground">View All →</Button>
                            </div>
                            {operatorsList.length > 0 ? (
                                operatorsList.slice(0, 5).map((op, i) => (
                                    <div key={i} className="flex items-center gap-4 py-2.5 border-b border-border last:border-0">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center text-[10px] font-black text-black shrink-0">
                                            {op.name.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black truncate">{op.name}</p>
                                            <p className="text-[10px] text-muted-foreground font-semibold truncate">Role: <span className="capitalize">{op.role}</span> &bull; Bal: {fmt(op.balance / 100)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-black">{op.shares || 0}</p>
                                            <p className="text-[9px] text-muted-foreground font-semibold">Shares</p>
                                        </div>
                                        <StatusBadge status={op.status} />
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-xs font-bold text-muted-foreground">
                                    No cooperative members registered yet.
                                </div>
                            )}
                        </div>

                        {/* Recent Transactions cleared */}
                        <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-black">Escrow Clearing &amp; Funding Logs</h3>
                                    <p className="text-[10px] text-muted-foreground font-semibold">Underwritten leases, grants matching, and weekly rotational payouts history.</p>
                                </div>
                            </div>
                            <div className="space-y-2.5 font-sans text-xs">
                                {[
                                    { label: "Cooperative Ajo Thrift Disbursal", desc: "Completed target rotational payout cycle slot transfer", val: "Cleared", type: "success" },
                                    { label: "Marketplace Underwriting Pool Match", desc: "Cooperative lease scheme underwritten by local capital partners", val: "Allocated", type: "success" },
                                    { label: "Bank Service Commission Split", desc: "1.5% platform commission deducted automatically", val: "Settled", type: "settlement" },
                                ].map((tx, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-muted/40 p-3 rounded-2xl border border-border">
                                        <div>
                                            <p className="text-xs font-black">{tx.label}</p>
                                            <p className="text-[9px] text-muted-foreground font-semibold">{tx.desc}</p>
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{tx.val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Alerts & Penalties */}
                    <div className="space-y-4">
                        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                            <h3 className="text-xs font-black flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /> Pending Admin Alerts</h3>
                            {defaultedContracts.length > 0 ? (
                                defaultedContracts.map((c, i) => (
                                    <div key={i} className="flex items-start gap-2 p-3 rounded-xl text-[10px] font-bold bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                        <span>{c.member?.firstName || 'Member'} - HP Default on {c.asset_name}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-[10px] text-center text-muted-foreground py-4 font-semibold">
                                    ✓ All agreements are compliant and up-to-date.
                                </div>
                            )}
                        </div>

                        {/* Summary of Week */}
                        <div className="bg-gradient-to-br from-amber-950/30 to-background border border-amber-900/20 rounded-2xl p-5 space-y-4">
                            <p className="text-[9px] font-black text-amber-400/70 uppercase tracking-widest">Active Cooperative Schemes</p>
                            <p className="text-2xl font-black text-foreground">{schemes.length} Pools</p>
                            <div className="space-y-2 border-t border-border pt-3">
                                {schemes.slice(0, 3).map((s, idx) => (
                                    <div key={idx} className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                                        <span className="truncate max-w-[120px]">{s.name}</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">₦{(s.contribution_amount / 100).toLocaleString()}/cycle</span>
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
