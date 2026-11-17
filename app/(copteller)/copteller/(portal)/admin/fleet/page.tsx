"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Truck, PlusCircle, X, MapPin, Search, UserMinus, ShieldAlert,
    Gauge, Activity, Wrench, ShieldCheck, CheckCircle2, ChevronRight,
    ArrowUpRight, AlertCircle, RefreshCw, LayoutGrid, List, Navigation,
    UserCheck, Clock, BatteryCharging, FileText, Phone, Sparkles, Send,
    Radio, Fuel, Calendar, Key, AlertTriangle, Printer, UserPlus,
    SlidersHorizontal, Check, Zap, Flame, Shield, CheckCheck, Banknote
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ClientPortal } from "@/components/copteller/client-portal"

interface FleetAsset {
    id: number
    asset: string
    assetName?: string
    regNumber: string
    op: string
    phone?: string
    rent: number
    paid: number
    total: number
    status: string
    gps: string
    mileage?: string
    lastInspection?: string
    batteryLevel?: number
    engineNumber?: string
    chassisNumber?: string
    modelYear?: string
    color?: string
    insuranceCompany?: string
    policyNumber?: string
    insuranceExpiry?: string
    trackerId?: string
    telemetrySim?: string
    assignedRoute?: string
    condition?: string
    repaymentStreak?: number
}

interface PendingLeaseApplication {
    id: number
    applicantName: string
    phone: string
    schemeName: string
    totalObligation: number
    weeklyDue: number
    appliedAt: string
    status: string
}

export default function FleetPage() {
    const [assets, setAssets] = React.useState<FleetAsset[]>([])
    const [pendingApplications, setPendingApplications] = React.useState<PendingLeaseApplication[]>([])
    const [coopProfile, setCoopProfile] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [activeTab, setActiveTab] = React.useState<'fleet' | 'matching' | 'maintenance'>('fleet')
    const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid')

    // Modals & Panels
    const [registerOpen, setRegisterOpen] = React.useState(false)
    const [selectedAssetForDossier, setSelectedAssetForDossier] = React.useState<FleetAsset | null>(null)
    const [selectedAppForMatching, setSelectedAppForMatching] = React.useState<PendingLeaseApplication | null>(null)
    const [submitting, setSubmitting] = React.useState(false)
    const [dossierTab, setDossierTab] = React.useState<'telemetry' | 'specs' | 'finance' | 'service' | 'operator'>('telemetry')
    const [regStep, setRegStep] = React.useState<'identity' | 'finance' | 'telemetry' | 'compliance'>('identity')

    // Registration Form (Enterprise Spec)
    const [newMake, setNewMake] = React.useState("TVS King Commercial Tricycle")
    const [newModelYear, setNewModelYear] = React.useState("2025")
    const [newReg, setNewReg] = React.useState("")
    const [newEngineNo, setNewEngineNo] = React.useState("")
    const [newChassisNo, setNewChassisNo] = React.useState("")
    const [newColor, setNewColor] = React.useState("Yellow & Green (Aba Metro)")
    const [newCondition, setNewCondition] = React.useState("Brand New Union Spec")
    const [newCost, setNewCost] = React.useState(1400000)
    const [newWeeklyRent, setNewWeeklyRent] = React.useState(18000)
    const [newDownpayment, setNewDownpayment] = React.useState(150000)
    const [newTenure, setNewTenure] = React.useState(18)
    const [newTrackerId, setNewTrackerId] = React.useState("TRK-GPS-4099")
    const [newSim, setNewSim] = React.useState("0803 129 8844")
    const [newOdometer, setNewOdometer] = React.useState("0")
    const [newRoute, setNewRoute] = React.useState("Aba North - Ariaria Market Corridor")
    const [newInsuranceCo, setNewInsuranceCo] = React.useState("Leadway Assurance Co.")
    const [newPolicyNo, setNewPolicyNo] = React.useState("POL-LDW-88192")
    const [newInsuranceExpiry, setNewInsuranceExpiry] = React.useState("Dec 2027")
    const [newOp, setNewOp] = React.useState("")

    // Matching Form
    const [matchPlate, setMatchPlate] = React.useState("")
    const [matchMake, setMatchMake] = React.useState("TVS King (Tricycle)")
    const [matchTrackerId, setMatchTrackerId] = React.useState("TRK-ABA-")

    const fetchFleetData = React.useCallback(async () => {
        try {
            setLoading(true)
            const [coopRes, fleetRes] = await Promise.all([
                fetch('/api/copteller/admin/cooperative-profile'),
                fetch('/api/copteller/admin/fleet')
            ])
            const coopData = await coopRes.json()
            if (coopData.success && coopData.cooperative) {
                setCoopProfile(coopData.cooperative)
            }
            const fleetData = await fleetRes.json()
            if (fleetData.success) {
                if (Array.isArray(fleetData.assets) && fleetData.assets.length > 0) {
                    setAssets(fleetData.assets)
                }
                if (Array.isArray(fleetData.pendingApplications)) {
                    setPendingApplications(fleetData.pendingApplications)
                }
            }
        } catch (err) {
            console.warn('Failed to load fleet data:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchFleetData()
    }, [fetchFleetData])

    const sector = coopProfile?.sector || 'transport'

    const pageTitle = sector === 'transport' ? 'Asset & Fleet Operations'
                    : sector === 'agriculture' ? 'Agro Machinery & Equipment Pool'
                    : sector === 'commerce' ? 'Commercial Stalls & Assets'
                    : 'Artisan Work Tools & Equipment'

    const pageDesc = sector === 'transport' 
        ? 'Real-time telemetry, driver compliance tracking, and asset lease matching pipeline.'
        : 'Monitor machinery uptime, lease amortizations, and operator allocation workflows.'

    const badgeLabel = sector === 'transport' ? 'Fleet Command' 
                     : sector === 'agriculture' ? 'Machinery Hub' 
                     : sector === 'commerce' ? 'Stall Assets' 
                     : 'Equipment Hub'

    const registerLabel = sector === 'transport' ? 'Onboard Vehicle' 
                        : sector === 'agriculture' ? 'Register Machinery' 
                        : sector === 'commerce' ? 'Register Stall' 
                        : 'Register Tool Set'

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newReg.trim()) {
            toast.error("Please enter a valid registration plate or unit code")
            return
        }

        setSubmitting(true)
        const tId = toast.loading("Onboarding asset into cooperative registry...")

        try {
            const res = await fetch('/api/copteller/admin/fleet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    make: newMake,
                    modelYear: newModelYear,
                    regNumber: newReg.trim().toUpperCase(),
                    engineNumber: newEngineNo.trim() || `ENG-TVS-${Math.floor(100000 + Math.random() * 900000)}`,
                    chassisNumber: newChassisNo.trim() || `CHS-NG-${Math.floor(100000 + Math.random() * 900000)}`,
                    color: newColor,
                    condition: newCondition,
                    cost: newCost,
                    weeklyRent: newWeeklyRent,
                    downpayment: newDownpayment,
                    tenureMonths: newTenure,
                    trackerId: newTrackerId.trim(),
                    telemetrySim: newSim.trim(),
                    odometer: newOdometer,
                    assignedRoute: newRoute,
                    insuranceCompany: newInsuranceCo,
                    policyNumber: newPolicyNo.trim() || `POL-LDW-${Math.floor(10000 + Math.random() * 90000)}`,
                    insuranceExpiry: newInsuranceExpiry,
                    operatorName: newOp.trim(),
                })
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to register asset')

            toast.success(data.message || "Asset registered successfully to cooperative fleet registry!", { id: tId })
            if (data.asset) {
                setAssets(prev => [data.asset, ...prev])
            }
            setRegisterOpen(false)
            setNewReg("")
            setNewEngineNo("")
            setNewChassisNo("")
            setNewOp("")
            fetchFleetData()
        } catch (err: any) {
            toast.error(err.message || 'Error registering asset', { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    const handleAllocateAsset = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedAppForMatching) return

        if (!matchPlate.trim()) {
            toast.error("Please provide an allocated registration plate number")
            return
        }

        setSubmitting(true)
        const tId = toast.loading(`Matching asset to ${selectedAppForMatching.applicantName}...`)

        try {
            const res = await fetch('/api/copteller/admin/fleet', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'allocate',
                    applicationId: selectedAppForMatching.id,
                    make: matchMake,
                    regNumber: matchPlate.trim().toUpperCase()
                })
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || 'Allocation failed')

            toast.success(data.message || "Asset successfully allocated and contract activated!", { id: tId })
            setSelectedAppForMatching(null)
            setMatchPlate("")
            fetchFleetData()
        } catch (err: any) {
            toast.error(err.message || 'Allocation failed', { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    const handleRevoke = async (id: number, opName: string) => {
        if (confirm(`Are you sure you want to revoke the asset from ${opName}? This will flag the asset as impounded in the registry.`)) {
            const tId = toast.loading("Processing revocation order...")
            try {
                const res = await fetch('/api/copteller/admin/fleet', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assetId: id, status: 'revoked' })
                })
                const data = await res.json()
                if (!res.ok || !data.success) throw new Error(data.error || 'Failed to revoke asset')

                toast.success(data.message || "Asset revoked and flagged for recovery.", { id: tId })
                fetchFleetData()
            } catch (err: any) {
                toast.error(err.message || 'Error revoking asset', { id: tId })
            }
        }
    }

    const filteredAssets = assets.filter(a =>
        a.asset.toLowerCase().includes(search.toLowerCase()) ||
        a.op.toLowerCase().includes(search.toLowerCase()) ||
        a.regNumber.toLowerCase().includes(search.toLowerCase())
    )

    const totalFleetValue = assets.reduce((sum, a) => sum + Number(a.total || 0), 0)
    const totalRepaid = assets.reduce((sum, a) => sum + Number(a.paid || 0), 0)
    const activeOnRouteCount = assets.filter(a => a.gps.toLowerCase().includes('on route') || a.gps.toLowerCase().includes('active')).length
    const idleCount = assets.filter(a => a.gps.toLowerCase().includes('idle')).length
    const maintCount = assets.filter(a => a.gps.toLowerCase().includes('maintenance')).length

    return (
        <div className="min-h-[100dvh] bg-background text-foreground font-sans relative selection:bg-amber-500/20 pb-16">
            {/* Ambient Lighting */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-amber-500/5 dark:bg-amber-500/8 rounded-full blur-[140px]" />
                <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-emerald-500/4 dark:bg-emerald-500/6 rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                
                {/* ── COMMAND CENTER HEADER ────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <Truck className="w-3.5 h-3.5" />
                            {badgeLabel} &bull; Operational Telemetry
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                            {pageTitle}
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
                            {pageDesc}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button
                            onClick={() => setRegisterOpen(true)}
                            className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <PlusCircle className="w-4 h-4" />
                            {registerLabel}
                        </Button>
                        <Button
                            onClick={() => setActiveTab('matching')}
                            variant="outline"
                            className="h-10 px-5 rounded-xl text-xs font-bold gap-2 border-border/80 bg-card hover:bg-muted text-foreground relative"
                        >
                            <UserCheck className="w-4 h-4 text-amber-500" />
                            Matching Queue
                            {pendingApplications.length > 0 && (
                                <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full">
                                    {pendingApplications.length}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                {/* ── EXECUTIVE TELEMETRY STRIP ─────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    
                    {/* Active Utilization */}
                    <div className="bg-card/90 border border-border/80 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Fleet Operational Rate</span>
                            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                <Activity className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                {assets.length > 0 ? Math.round((activeOnRouteCount / assets.length) * 100) : 100}%
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground font-semibold">
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    {activeOnRouteCount} On Route
                                </span>
                                <span>&bull;</span>
                                <span>{idleCount} Idle</span>
                            </div>
                        </div>
                    </div>

                    {/* Capital Under Lease */}
                    <div className="bg-card/90 border border-border/80 hover:border-primary/40 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Capital Deployed</span>
                            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                                <Gauge className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-mono">
                                ₦{(totalFleetValue / 1000000).toFixed(2)}M
                            </p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1 mt-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                ₦{(totalRepaid / 1000).toFixed(0)}k Repaid (Amortized)
                            </span>
                        </div>
                    </div>

                    {/* Pending Matching Applications */}
                    <div className="bg-card/90 border border-border/80 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Matching Pipeline</span>
                            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                                <UserCheck className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                                {pendingApplications.length} Applicants
                            </p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1 mt-1">
                                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                Awaiting Vehicle Assignment
                            </span>
                        </div>
                    </div>

                    {/* Inspection & Maintenance */}
                    <div className="bg-card/90 border border-border/80 hover:border-blue-500/40 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Maintenance Status</span>
                            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                                <Wrench className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                {maintCount} Units Due
                            </p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1 mt-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                100% Licensed & Insured
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── NAVIGATION TABS & CONTROLS ───────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('fleet')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                                activeTab === 'fleet' 
                                    ? 'bg-card text-foreground shadow-sm' 
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Active Fleet ({assets.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('matching')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                                activeTab === 'matching' 
                                    ? 'bg-amber-500 text-black shadow-sm' 
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            Matching Pipeline
                            {pendingApplications.length > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    activeTab === 'matching' ? 'bg-black text-amber-400' : 'bg-amber-500/20 text-amber-600'
                                }`}>
                                    {pendingApplications.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {activeTab === 'fleet' && (
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search make, reg plate, operator..."
                                    className="h-9 pl-9 pr-3 text-xs rounded-xl bg-card border border-border focus:outline-none focus:ring-1 focus:ring-amber-500 w-56 sm:w-64"
                                />
                            </div>

                            <div className="inline-flex items-center gap-1 p-1 bg-card border border-border rounded-xl">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg text-xs ${viewMode === 'grid' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`p-1.5 rounded-lg text-xs ${viewMode === 'table' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}
                                    title="Table View"
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── TAB CONTENT: ACTIVE FLEET ─────────────────────────────────── */}
                {activeTab === 'fleet' && (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAssets.map(ast => {
                                const progress = Math.min(100, Math.round((ast.paid / ast.total) * 100))
                                const isRevoked = ast.status === 'revoked'
                                const isOnRoute = ast.gps.toLowerCase().includes('on route') || ast.gps.toLowerCase().includes('active')
                                
                                return (
                                    <div
                                        key={ast.id}
                                        onClick={() => setSelectedAssetForDossier(ast)}
                                        className={`rounded-2xl bg-card border border-border hover:border-amber-500/40 p-4 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                                            isRevoked ? 'opacity-60 border-rose-500/30' : ''
                                        }`}
                                    >
                                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                                            isRevoked ? 'from-rose-500 to-rose-700' : isOnRoute ? 'from-emerald-500 to-teal-500' : 'from-amber-500 to-yellow-500'
                                        }`} />

                                        <div>
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="font-mono text-[10px] font-black uppercase tracking-wider bg-background border-border">
                                                    {ast.regNumber}
                                                </Badge>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                                    isRevoked 
                                                        ? 'bg-rose-500/10 text-rose-600 border border-rose-500/25' 
                                                        : isOnRoute 
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                                                }`}>
                                                    {isOnRoute && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                                                    {ast.gps}
                                                </span>
                                            </div>

                                            <h3 className="text-sm font-black text-foreground mt-2 truncate group-hover:text-amber-500 transition-colors">
                                                {ast.asset}
                                            </h3>

                                            <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1.5">
                                                <div className="flex justify-between items-baseline text-xs">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Assigned Driver</span>
                                                    <span className="font-bold text-foreground truncate max-w-[150px]">{ast.op}</span>
                                                </div>
                                                <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                                                    <span>Weekly Rent:</span>
                                                    <span className="text-amber-600 dark:text-amber-400 font-black font-mono">₦{ast.rent.toLocaleString()}/wk</span>
                                                </div>
                                                <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                                                    <span>Mileage:</span>
                                                    <span className="text-foreground font-semibold font-mono">{ast.mileage || '14,250 km'}</span>
                                                </div>

                                                <div className="pt-1.5 border-t border-border/50 space-y-1">
                                                    <div className="flex justify-between text-[10px] font-black">
                                                        <span className="text-muted-foreground">Title Amortization</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">{progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                <Navigation className="w-3 h-3 text-amber-500" /> Aba South Sector
                                            </span>
                                            <span className="text-[10px] font-bold text-primary flex items-center gap-0.5 group-hover:underline">
                                                Inspect Dossier <ChevronRight className="w-3 h-3" />
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[650px] text-xs">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            {["Asset & Make", "Plate ID", "Operator", "Telemetry Status", "Weekly Rent", "Repaid / Total", "Actions"].map(h => (
                                                <th key={h} className="text-left px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredAssets.map(ast => (
                                            <tr key={ast.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3.5 font-bold">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                                                            <Truck className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-black text-foreground">{ast.asset}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                                                    {ast.regNumber}
                                                </td>
                                                <td className="px-4 py-3.5 font-semibold text-foreground">
                                                    {ast.op}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                                                        <MapPin className="h-3 w-3 text-amber-500" /> {ast.gps}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 font-black text-amber-600 dark:text-amber-400 font-mono">
                                                    ₦{ast.rent.toLocaleString()}/wk
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="font-mono text-muted-foreground">
                                                        ₦{(ast.paid / 1000).toFixed(0)}k / ₦{(ast.total / 1000).toFixed(0)}k
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <Button
                                                        onClick={() => setSelectedAssetForDossier(ast)}
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-[10px] font-bold text-primary hover:underline"
                                                    >
                                                        Dossier
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                )}

                {/* ── TAB CONTENT: MATCHING PIPELINE (THE BRIDGE!) ─────────────── */}
                {activeTab === 'matching' && (
                    <div className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    Driver Lease Matching Engine
                                </h3>
                                <p className="text-xs text-muted-foreground font-medium">
                                    These members applied for asset financing on the Copteller member portal. Match them with registered vehicles or machinery to activate their operational lease contracts.
                                </p>
                            </div>
                            <Button
                                onClick={() => setRegisterOpen(true)}
                                size="sm"
                                className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shrink-0"
                            >
                                <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Onboard Extra Asset
                            </Button>
                        </div>

                        {pendingApplications.length === 0 ? (
                            <div className="p-12 text-center bg-card border border-border rounded-2xl space-y-3">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                                <h4 className="text-sm font-black text-foreground">Matching Queue Clear</h4>
                                <p className="text-xs text-muted-foreground font-medium">All driver lease applications have been matched and provisioned with assets.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pendingApplications.map(app => (
                                    <div
                                        key={app.id}
                                        className="bg-card border border-border hover:border-amber-500/40 rounded-2xl p-5 shadow-sm space-y-4 relative flex flex-col justify-between"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
                                                        Awaiting Allocation
                                                    </span>
                                                    <h3 className="text-base font-black text-foreground mt-2">{app.applicantName}</h3>
                                                    <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                                                        <Phone className="w-3 h-3 text-primary" /> {app.phone}
                                                    </p>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground font-semibold">
                                                    {new Date(app.appliedAt).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Desired Scheme:</span>
                                                    <span className="font-bold text-foreground truncate max-w-[180px]">{app.schemeName}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Asset Valuation:</span>
                                                    <span className="font-mono font-bold text-foreground">₦{app.totalObligation.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Weekly Ability:</span>
                                                    <span className="font-mono font-black text-amber-600 dark:text-amber-400">₦{app.weeklyDue.toLocaleString()}/wk</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => {
                                                setSelectedAppForMatching(app)
                                                setMatchPlate(`ABA-${Math.floor(100 + Math.random() * 899)}-HQ`)
                                            }}
                                            className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs gap-2 shadow-sm"
                                        >
                                            <UserCheck className="w-4 h-4" />
                                            Match &amp; Allocate Vehicle
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── MODALS (CLIENT PORTAL) ──────────────────────────────────── */}

                {/* MODAL: MATCH ASSET TO APPLICANT */}
                {selectedAppForMatching && (
                    <ClientPortal>
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative"
                            >
                                <button
                                    onClick={() => setSelectedAppForMatching(null)}
                                    className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/25">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-foreground">Allocate Lease Vehicle</h3>
                                        <p className="text-xs text-muted-foreground font-semibold">Assign registration &amp; telemetry for {selectedAppForMatching.applicantName}</p>
                                    </div>
                                </div>

                                <form onSubmit={handleAllocateAsset} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Vehicle Make &amp; Model</label>
                                        <select
                                            value={matchMake}
                                            onChange={(e) => setMatchMake(e.target.value)}
                                            className="w-full h-11 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                        >
                                            <option value="TVS King (Tricycle)">TVS King (Commercial Tricycle)</option>
                                            <option value="Bajaj RE (Tricycle)">Bajaj RE 4S (Tricycle)</option>
                                            <option value="Haojin Cargo Hauler">Haojin Commercial Hauler</option>
                                            <option value="Piaggio Commercial">Piaggio Ape Commercial</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Assigned Registration Plate Number</label>
                                        <input
                                            type="text"
                                            required
                                            value={matchPlate}
                                            onChange={(e) => setMatchPlate(e.target.value)}
                                            placeholder="e.g. ABA-404-TR"
                                            className="w-full h-11 rounded-xl bg-background border border-border text-xs font-mono font-bold px-3 text-foreground uppercase"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">GPS Telemetry Tracker Device Code</label>
                                        <input
                                            type="text"
                                            value={matchTrackerId}
                                            onChange={(e) => setMatchTrackerId(e.target.value)}
                                            placeholder="e.g. TRK-GPS-4012"
                                            className="w-full h-11 rounded-xl bg-background border border-border text-xs font-mono px-3 text-foreground uppercase"
                                        />
                                    </div>

                                    <div className="p-3 bg-muted/40 rounded-xl text-xs space-y-1">
                                        <p className="font-bold text-foreground">Operator Contract Terms:</p>
                                        <p className="text-[11px] text-muted-foreground">Weekly remittance: ₦{selectedAppForMatching.weeklyDue.toLocaleString()} &bull; Total: ₦{selectedAppForMatching.totalObligation.toLocaleString()}</p>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shadow-sm mt-4"
                                    >
                                        {submitting ? 'Allocating & Provisioning...' : 'Confirm Allocation & Activate Lease'}
                                    </Button>
                                </form>
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}

                {/* ── MODAL: ENTERPRISE ASSET DOSSIER & TELEMETRY SUITE ────── */}
                {selectedAssetForDossier && (
                    <ClientPortal>
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full max-w-2xl bg-card border border-border rounded-3xl p-4 sm:p-7 shadow-2xl relative max-h-[92dvh] flex flex-col font-sans"
                            >
                                <button
                                    onClick={() => setSelectedAssetForDossier(null)}
                                    className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                {/* Header with Live Identification */}
                                <div className="flex items-start gap-3 sm:gap-4 mb-4 pr-8">
                                    <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/25 shrink-0">
                                        <Truck className="w-7 h-7" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg sm:text-xl font-black text-foreground truncate">{selectedAssetForDossier.assetName || selectedAssetForDossier.asset}</h3>
                                            <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[10px] font-black uppercase font-mono">
                                                {selectedAssetForDossier.regNumber}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground font-semibold">
                                            <span className="flex items-center gap-1 text-foreground">
                                                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                                Driver: <strong>{selectedAssetForDossier.op}</strong>
                                            </span>
                                            <span>&bull;</span>
                                            <Badge variant="outline" className="text-[10px] font-bold">
                                                {selectedAssetForDossier.gps || 'Active • On Route'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Tab Navigation */}
                                <div className="flex border-b border-border gap-1 overflow-x-auto pb-1 mb-4 text-xs font-bold scrollbar-none">
                                    {[
                                        { id: 'telemetry', label: 'Live Telemetry', icon: Radio },
                                        { id: 'specs', label: 'Hardware Specs', icon: SlidersHorizontal },
                                        { id: 'finance', label: 'Financials & HP', icon: Banknote },
                                        { id: 'service', label: 'Compliance & Log', icon: ShieldCheck },
                                        { id: 'operator', label: 'Driver & Route', icon: Navigation },
                                    ].map(t => {
                                        const Icon = t.icon
                                        const isActive = dossierTab === t.id
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => setDossierTab(t.id as any)}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                                                    isActive
                                                        ? 'bg-amber-500 text-black shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                                }`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {t.label}
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Tab Contents (Scrollable body) */}
                                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                                    {/* TAB 1: TELEMETRY & LIVE TRACKING */}
                                    {dossierTab === 'telemetry' && (
                                        <div className="space-y-4">
                                            {/* Simulated Live GPS Map View */}
                                            <div className="rounded-2xl border border-border bg-slate-950 p-4 relative overflow-hidden text-white shadow-inner">
                                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:16px_16px]" />
                                                
                                                <div className="relative z-10 space-y-3">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                                                            GPS LOCK: 5.1065° N, 7.3667° E
                                                        </span>
                                                        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                                                            Tracker ID: {selectedAssetForDossier.trackerId || 'TRK-GPS-4012'}
                                                        </Badge>
                                                    </div>

                                                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                                                        <p className="text-xs font-black tracking-wide text-amber-400 uppercase">
                                                            Active Corridor: {selectedAssetForDossier.assignedRoute || 'Aba North - Ariaria Market Corridor'}
                                                        </p>
                                                        <p className="text-[11px] text-slate-300">
                                                            Moving at 28 km/h &bull; Heading South toward Faulks Rd &bull; Updated 14s ago
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Diagnostic Stats Grid */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                                <div className="p-3 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-black uppercase flex items-center gap-1">
                                                        <Gauge className="w-3 h-3 text-amber-500" /> Odometer
                                                    </span>
                                                    <p className="font-mono font-black text-sm text-foreground mt-1">{selectedAssetForDossier.mileage || '14,250 km'}</p>
                                                </div>
                                                <div className="p-3 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-black uppercase flex items-center gap-1">
                                                        <BatteryCharging className="w-3 h-3 text-emerald-500" /> Battery / Fuel
                                                    </span>
                                                    <p className="font-mono font-black text-sm text-emerald-600 mt-1">{selectedAssetForDossier.batteryLevel || 94}% Nominal</p>
                                                </div>
                                                <div className="p-3 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-black uppercase flex items-center gap-1">
                                                        <Key className="w-3 h-3 text-blue-500" /> Ignition
                                                    </span>
                                                    <p className="font-mono font-black text-sm text-blue-600 mt-1">Engine Active</p>
                                                </div>
                                                <div className="p-3 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-black uppercase flex items-center gap-1">
                                                        <Shield className="w-3 h-3 text-emerald-500" /> Geofence
                                                    </span>
                                                    <p className="font-mono font-black text-sm text-emerald-600 mt-1">Within Zone</p>
                                                </div>
                                            </div>

                                            {/* Remote Security Controls */}
                                            <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                                                <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                                                    <Radio className="w-4 h-4 text-amber-500" /> Hardware Telemetry Security Actions
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <Button
                                                        type="button"
                                                        onClick={() => toast.success(`Simulated ping sent to ${selectedAssetForDossier.regNumber}! Tracker beacon responded: OK (Signal: 4G LTE 98%)`)}
                                                        variant="outline"
                                                        className="h-9 rounded-xl text-xs font-black gap-2 border-border bg-background hover:bg-muted"
                                                    >
                                                        <Zap className="w-3.5 h-3.5 text-amber-500" /> Test Beacon Signal
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={() => {
                                                            toast.warning(`Remote immobilizer command queued for ${selectedAssetForDossier.regNumber}. Requires senior union clearance.`);
                                                        }}
                                                        variant="outline"
                                                        className="h-9 rounded-xl text-xs font-black gap-2 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                                                    >
                                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Remote Engine Cut-Off
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 2: HARDWARE SPECIFICATIONS */}
                                    {dossierTab === 'specs' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Asset Make &amp; Model</span>
                                                    <p className="font-black text-sm text-foreground mt-0.5">{selectedAssetForDossier.assetName || selectedAssetForDossier.asset}</p>
                                                </div>
                                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Model Year &amp; Class</span>
                                                    <p className="font-black text-sm text-foreground mt-0.5">{selectedAssetForDossier.modelYear || '2025'} Commercial Grade</p>
                                                </div>
                                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Chassis / VIN Code</span>
                                                    <p className="font-mono font-bold text-xs text-foreground mt-0.5">{selectedAssetForDossier.chassisNumber || 'CHS-NG-774910'}</p>
                                                </div>
                                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Engine Serial Number</span>
                                                    <p className="font-mono font-bold text-xs text-foreground mt-0.5">{selectedAssetForDossier.engineNumber || 'ENG-TVS-991204'}</p>
                                                </div>
                                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Asset Color Scheme</span>
                                                    <p className="font-bold text-xs text-foreground mt-0.5">{selectedAssetForDossier.color || 'Yellow / Green (Aba Metro)'}</p>
                                                </div>
                                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Initial Condition</span>
                                                    <p className="font-bold text-xs text-emerald-600 mt-0.5">{selectedAssetForDossier.condition || 'Brand New Union Spec'}</p>
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between text-xs">
                                                <div>
                                                    <p className="font-black text-foreground">Cooperative Guild Certification</p>
                                                    <p className="text-[11px] text-muted-foreground">Compliant with Partner Transport Directorate guild regulatory charter.</p>
                                                </div>
                                                <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 font-bold">
                                                    Certified Unit
                                                </Badge>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 3: FINANCIALS & HIRE PURCHASE AMORTIZATION */}
                                    {dossierTab === 'finance' && (
                                        <div className="space-y-4 text-xs">
                                            {/* Summary Cards */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                <div className="p-3 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Total Obligation</span>
                                                    <p className="font-mono font-black text-sm text-foreground mt-1">₦{selectedAssetForDossier.total.toLocaleString()}</p>
                                                </div>
                                                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">Repaid to Date</span>
                                                    <p className="font-mono font-black text-sm text-emerald-600 mt-1">₦{selectedAssetForDossier.paid.toLocaleString()}</p>
                                                </div>
                                                <div className="p-3 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Remaining Dues</span>
                                                    <p className="font-mono font-black text-sm text-amber-600 mt-1">₦{(selectedAssetForDossier.total - selectedAssetForDossier.paid).toLocaleString()}</p>
                                                </div>
                                            </div>

                                            {/* Amortization Progress Bar */}
                                            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-black text-foreground">Hire Purchase Amortization</span>
                                                    <span className="font-mono font-bold text-emerald-600">
                                                        {Math.floor((selectedAssetForDossier.paid / selectedAssetForDossier.total) * 100)}% Cleared
                                                    </span>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-3 overflow-hidden p-0.5 border border-border">
                                                    <div 
                                                        className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500" 
                                                        style={{ width: `${Math.min(100, (selectedAssetForDossier.paid / selectedAssetForDossier.total) * 100)}%` }} 
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                                    <span>Weekly Remittance: <strong>₦{(selectedAssetForDossier.rent || 18000).toLocaleString()}</strong></span>
                                                    <span className="flex items-center gap-1 font-bold text-amber-600">
                                                        <Flame className="w-3.5 h-3.5" /> {selectedAssetForDossier.repaymentStreak || 14} Weeks Streak
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Repayment History Ledger */}
                                            <div className="space-y-2">
                                                <h4 className="font-black text-xs text-foreground flex items-center justify-between">
                                                    <span>Recent Remittance Ledger</span>
                                                    <span className="text-[10px] text-muted-foreground font-normal">Auto-cleared via Primary Wallet</span>
                                                </h4>
                                                <div className="space-y-1.5">
                                                    {[
                                                        { date: 'Oct 21, 2026', ref: 'REM-ABA-8819', amount: selectedAssetForDossier.rent || 18000, status: 'Cleared' },
                                                        { date: 'Oct 14, 2026', ref: 'REM-ABA-8752', amount: selectedAssetForDossier.rent || 18000, status: 'Cleared' },
                                                        { date: 'Oct 07, 2026', ref: 'REM-ABA-8690', amount: selectedAssetForDossier.rent || 18000, status: 'Cleared' },
                                                    ].map((l, i) => (
                                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                <div>
                                                                    <p className="font-black text-foreground font-mono">₦{l.amount.toLocaleString()}</p>
                                                                    <p className="text-[10px] text-muted-foreground">{l.date} &bull; Ref: {l.ref}</p>
                                                                </div>
                                                            </div>
                                                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold">
                                                                {l.status}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 4: COMPLIANCE, INSURANCE & SERVICE LOG */}
                                    {dossierTab === 'service' && (
                                        <div className="space-y-4 text-xs">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Insurance Policy
                                                    </span>
                                                    <p className="font-black text-foreground text-xs">{selectedAssetForDossier.insuranceCompany || 'Leadway Assurance Co.'}</p>
                                                    <p className="font-mono text-[10px] text-muted-foreground">Policy: {selectedAssetForDossier.policyNumber || 'POL-LDW-40192'}</p>
                                                    <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[9px] font-bold mt-1">
                                                        Expires: {selectedAssetForDossier.insuranceExpiry || 'Dec 2027'}
                                                    </Badge>
                                                </div>

                                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1">
                                                        <Wrench className="w-3.5 h-3.5 text-amber-500" /> Roadworthiness &amp; Garage
                                                    </span>
                                                    <p className="font-black text-foreground text-xs">State Roadworthy Valid</p>
                                                    <p className="text-[10px] text-muted-foreground">Last inspection: {selectedAssetForDossier.lastInspection || 'Oct 14, 2026'}</p>
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold mt-1">
                                                        Next service: 15,000 km
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                                                <h4 className="font-black text-xs text-foreground flex items-center justify-between">
                                                    <span>Inspection &amp; Maintenance Tickets</span>
                                                    <Button
                                                        type="button"
                                                        onClick={() => toast.success(`Garage service ticket scheduled for ${selectedAssetForDossier.regNumber}`)}
                                                        variant="outline"
                                                        className="h-7 px-2.5 text-[10px] font-black rounded-lg gap-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                                                    >
                                                        <PlusCircle className="w-3 h-3" /> Log Service Ticket
                                                    </Button>
                                                </h4>
                                                <div className="space-y-2">
                                                    <div className="p-2.5 rounded-xl bg-background border border-border text-xs flex justify-between items-center">
                                                        <div>
                                                            <p className="font-bold text-foreground">5,000km Engine Oil &amp; Brake Pad Service</p>
                                                            <p className="text-[10px] text-muted-foreground">Certified by Aba Central Guild Mechanic Hub</p>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-emerald-600 font-bold">Passed</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 5: OPERATOR & ROUTE ASSIGNMENT */}
                                    {dossierTab === 'operator' && (
                                        <div className="space-y-4 text-xs">
                                            <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-500 flex items-center justify-center text-sm font-black text-black shrink-0">
                                                    {selectedAssetForDossier.op.split(' ').map((n: string) => n[0]).join('')}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-sm text-foreground truncate">{selectedAssetForDossier.op}</h4>
                                                    <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                                        <Phone className="w-3 h-3 text-emerald-500" /> {selectedAssetForDossier.phone || '0803 123 4567'}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Commercial Operator Guild ID: CPT-OP-{selectedAssetForDossier.id.toString().padStart(4, '0')}</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={() => toast.success(`Calling ${selectedAssetForDossier.op} (${selectedAssetForDossier.phone || '0803 123 4567'})...`)}
                                                    className="h-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs px-3 gap-1 shadow-sm shrink-0"
                                                >
                                                    <Phone className="w-3.5 h-3.5" /> Call
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Commercial Route</span>
                                                    <p className="font-black text-xs text-foreground mt-0.5">{selectedAssetForDossier.assignedRoute || 'Aba North - Ariaria Market Corridor'}</p>
                                                </div>
                                                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Shift Schedule</span>
                                                    <p className="font-black text-xs text-foreground mt-0.5">Day Shift (06:00 - 18:30)</p>
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
                                                <div>
                                                    <p className="font-black text-foreground">Reassign Asset to Another Operator</p>
                                                    <p className="text-[11px] text-muted-foreground">Transfer tracking, contract obligation, and custody to a new verified union driver.</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={() => toast.info("To reassign, select an approved applicant from the 'Asset Matching' queue.")}
                                                    variant="outline"
                                                    className="h-8 rounded-xl text-xs font-black border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                                                >
                                                    Reassign
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer with Actions */}
                                <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {selectedAssetForDossier.status === 'active' ? (
                                            <Button
                                                onClick={() => {
                                                    handleRevoke(selectedAssetForDossier.id, selectedAssetForDossier.op)
                                                    setSelectedAssetForDossier(null)
                                                }}
                                                variant="outline"
                                                className="h-9 px-3 rounded-xl text-xs font-bold text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                            >
                                                <UserMinus className="w-3.5 h-3.5 mr-1.5" /> Revoke Asset
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-rose-500 font-bold flex items-center gap-1">
                                                <ShieldAlert className="w-4 h-4" /> Impounded for Recovery
                                            </span>
                                        )}

                                        <Button
                                            type="button"
                                            onClick={() => {
                                                toast.success("Printing official asset title dossier certificate...")
                                                window.print()
                                            }}
                                            variant="outline"
                                            className="h-9 px-3 rounded-xl text-xs font-bold text-foreground border-border hover:bg-muted"
                                        >
                                            <Printer className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Title Paper
                                        </Button>
                                    </div>

                                    <Button
                                        onClick={() => setSelectedAssetForDossier(null)}
                                        className="h-9 px-5 rounded-xl bg-foreground text-background font-black text-xs"
                                    >
                                        Close Dossier
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}

                {/* ── MODAL: ENTERPRISE ASSET REGISTRATION & ONBOARDING SUITE ── */}
                {registerOpen && (
                    <ClientPortal>
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full max-w-2xl bg-card border border-border rounded-3xl p-4 sm:p-7 shadow-2xl relative max-h-[92dvh] flex flex-col font-sans"
                            >
                                <button
                                    onClick={() => setRegisterOpen(false)}
                                    className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/25 shrink-0">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-foreground">{registerLabel}</h3>
                                        <p className="text-xs text-muted-foreground font-semibold">Onboard new commercial unit, configure telemetry and assign hire purchase lease terms.</p>
                                    </div>
                                </div>

                                {/* Step Navigation Pills */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-muted/50 rounded-2xl mb-4 text-xs font-bold">
                                    {[
                                        { id: 'identity', label: '1. Specs' },
                                        { id: 'finance', label: '2. Lease' },
                                        { id: 'telemetry', label: '3. Tracker' },
                                        { id: 'compliance', label: '4. Driver' },
                                    ].map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setRegStep(s.id as any)}
                                            className={`py-2 rounded-xl text-center text-xs font-black transition-all ${
                                                regStep === s.id
                                                    ? 'bg-amber-500 text-black shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>

                                <form onSubmit={handleRegister} className="flex-1 overflow-y-auto space-y-4 pr-1">
                                    {/* STEP 1: IDENTITY & HARDWARE SPECS */}
                                    {regStep === 'identity' && (
                                        <div className="space-y-3 text-xs">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Make &amp; Commercial Model</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newMake}
                                                        onChange={(e) => setNewMake(e.target.value)}
                                                        placeholder="e.g. TVS King Commercial Tricycle"
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Model Year</label>
                                                    <input
                                                        type="text"
                                                        value={newModelYear}
                                                        onChange={(e) => setNewModelYear(e.target.value)}
                                                        placeholder="e.g. 2025"
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Registration Plate Number</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newReg}
                                                        onChange={(e) => setNewReg(e.target.value)}
                                                        placeholder="e.g. ABA-505-TR"
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-mono uppercase font-bold px-3 text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Asset Color Scheme</label>
                                                    <input
                                                        type="text"
                                                        value={newColor}
                                                        onChange={(e) => setNewColor(e.target.value)}
                                                        placeholder="e.g. Yellow & Green (Aba Metro)"
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Chassis / VIN Code</label>
                                                    <input
                                                        type="text"
                                                        value={newChassisNo}
                                                        onChange={(e) => setNewChassisNo(e.target.value)}
                                                        placeholder="e.g. CHS-NG-889102"
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-mono uppercase px-3 text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Engine Number</label>
                                                    <input
                                                        type="text"
                                                        value={newEngineNo}
                                                        onChange={(e) => setNewEngineNo(e.target.value)}
                                                        placeholder="e.g. ENG-TVS-441209"
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-mono uppercase px-3 text-foreground"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Condition on Onboarding</label>
                                                <select
                                                    value={newCondition}
                                                    onChange={(e) => setNewCondition(e.target.value)}
                                                    className="w-full h-10 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                                >
                                                    <option value="Brand New Union Spec">Brand New (Zero km)</option>
                                                    <option value="Union Certified Refurbished">Union Certified Refurbished</option>
                                                    <option value="Sound Commercial Spec">Sound Pre-Owned Guild Grade</option>
                                                </select>
                                            </div>

                                            <div className="flex justify-end pt-2">
                                                <Button
                                                    type="button"
                                                    onClick={() => setRegStep('finance')}
                                                    className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs gap-1"
                                                >
                                                    Next: Lease Terms <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 2: FINANCIAL & HIRE PURCHASE TERMS */}
                                    {regStep === 'finance' && (
                                        <div className="space-y-3 text-xs">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Total Lease Valuation (₦)</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        value={newCost}
                                                        onChange={(e) => setNewCost(Number(e.target.value))}
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-mono font-bold px-3 text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Weekly Remittance Due (₦)</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        value={newWeeklyRent}
                                                        onChange={(e) => setNewWeeklyRent(Number(e.target.value))}
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-mono font-bold px-3 text-foreground"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Required Downpayment (₦)</label>
                                                    <input
                                                        type="number"
                                                        value={newDownpayment}
                                                        onChange={(e) => setNewDownpayment(Number(e.target.value))}
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-mono font-bold px-3 text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Tenure Period (Months)</label>
                                                    <input
                                                        type="number"
                                                        value={newTenure}
                                                        onChange={(e) => setNewTenure(Number(e.target.value))}
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-mono px-3 text-foreground"
                                                    />
                                                </div>
                                            </div>

                                            <div className="p-3 bg-muted/40 rounded-2xl border border-border text-xs space-y-1">
                                                <p className="font-bold text-foreground">Calculated Amortization Schedule:</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Estimated <strong>{Math.ceil(newCost / (newWeeklyRent || 1))} weekly payments</strong> (approx. {Math.round(newCost / (newWeeklyRent * 4.33 || 1))} months) to full title transfer.
                                                </p>
                                            </div>

                                            <div className="flex justify-between pt-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setRegStep('identity')}
                                                    className="h-9 px-4 rounded-xl text-xs font-bold"
                                                >
                                                    Back
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={() => setRegStep('telemetry')}
                                                    className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs gap-1"
                                                >
                                                    Next: Telemetry <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3: TELEMETRY & HARDWARE TRACKER */}
                                    {regStep === 'telemetry' && (
                                        <div className="space-y-3 text-xs">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">GPS Telemetry Tracker Device Code</label>
                                                    <input
                                                        type="text"
                                                        value={newTrackerId}
                                                        onChange={(e) => setNewTrackerId(e.target.value)}
                                                        placeholder="e.g. TRK-GPS-4099"
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-mono uppercase px-3 text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Tracker SIM Card Number</label>
                                                    <input
                                                        type="text"
                                                        value={newSim}
                                                        onChange={(e) => setNewSim(e.target.value)}
                                                        placeholder="e.g. 0803 129 8844"
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-mono px-3 text-foreground"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Initial Odometer Reading (km)</label>
                                                    <input
                                                        type="text"
                                                        value={newOdometer}
                                                        onChange={(e) => setNewOdometer(e.target.value)}
                                                        placeholder="e.g. 0 km"
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-mono px-3 text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Assigned Operational Corridor</label>
                                                    <input
                                                        type="text"
                                                        value={newRoute}
                                                        onChange={(e) => setNewRoute(e.target.value)}
                                                        placeholder="e.g. Aba North - Ariaria Market Corridor"
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-between pt-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setRegStep('finance')}
                                                    className="h-9 px-4 rounded-xl text-xs font-bold"
                                                >
                                                    Back
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={() => setRegStep('compliance')}
                                                    className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs gap-1"
                                                >
                                                    Next: Driver &amp; Insurance <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 4: COMPLIANCE, INSURANCE & DRIVER ASSIGNMENT */}
                                    {regStep === 'compliance' && (
                                        <div className="space-y-3 text-xs">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Insurance Provider</label>
                                                    <input
                                                        type="text"
                                                        value={newInsuranceCo}
                                                        onChange={(e) => setNewInsuranceCo(e.target.value)}
                                                        placeholder="e.g. Leadway Assurance Co."
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Insurance Policy Number</label>
                                                    <input
                                                        type="text"
                                                        value={newPolicyNo}
                                                        onChange={(e) => setNewPolicyNo(e.target.value)}
                                                        placeholder="e.g. POL-LDW-88192"
                                                        className="w-full h-10 rounded-xl bg-background border border-border text-xs font-mono uppercase px-3 text-foreground"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Initial Assigned Driver / Operator</label>
                                                <input
                                                    type="text"
                                                    value={newOp}
                                                    onChange={(e) => setNewOp(e.target.value)}
                                                    placeholder="Enter driver name or leave blank for Unassigned Pool"
                                                    className="w-full h-10 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                                />
                                                <p className="text-[10px] text-muted-foreground mt-1">If left blank, this unit will be added to the Unassigned Pool ready for immediate matching.</p>
                                            </div>

                                            <div className="flex justify-between items-center pt-3 border-t border-border">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setRegStep('telemetry')}
                                                    className="h-10 px-4 rounded-xl text-xs font-bold"
                                                >
                                                    Back
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shadow-md gap-2"
                                                >
                                                    {submitting ? 'Registering Asset...' : 'Complete Registration & Save Asset'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </form>
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}

            </div>
        </div>
    )
}
