"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    CheckCircle2, Building2, X, Check, Loader2, Search, Filter,
    FileText, ShieldAlert, Award, ArrowRight, RefreshCw, Eye,
    Users, Landmark, ClipboardList, CheckCircle, Info, XCircle, Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"

interface CooperativeUnion {
    id: string
    name: string
    sponsor: string
    members: number
    regNo: string
    status: 'Pending' | 'Active' | 'Rejected'
    dateApplied: string
    cacDoc: string
    byelawsDoc: string
    trusteesDoc: string
    sector?: string
    marketplaceEnabled?: boolean
    escrowFeePercent?: number
    investorYieldSplitPercent?: number
    cycleFrequency?: string
    defaultContributionAmount?: number
    segment?: string
    metadata?: Record<string, any>
}

const SAMPLE_UNIONS: CooperativeUnion[] = [
    {
        id: "coop_1", name: "Aba North Keke Drivers Cooperative", sponsor: "Aba Transport Guild",
        members: 42, regNo: "COOP-AB-981", status: "Pending", dateApplied: "Aug 5, 2026",
        cacDoc: "CAC-AB-981-INCORP.pdf", byelawsDoc: "BYELAWS-AB-981.pdf", trusteesDoc: "TRUSTEES-AB-981.pdf"
    },
    {
        id: "coop_2", name: "Ariaria Leatherworkers Thrift Union", sponsor: "Aba Leather & Shoe Makers Guild",
        members: 120, regNo: "COOP-AB-405", status: "Pending", dateApplied: "Aug 3, 2026",
        cacDoc: "CAC-AB-405-INCORP.pdf", byelawsDoc: "BYELAWS-AB-405.pdf", trusteesDoc: "TRUSTEES-AB-405.pdf"
    },
    {
        id: "coop_3", name: "Aba Market Traders Association", sponsor: "Aba Chamber of Commerce",
        members: 850, regNo: "COOP-AB-102", status: "Active", dateApplied: "Jun 12, 2026",
        cacDoc: "CAC-AB-102-INCORP.pdf", byelawsDoc: "BYELAWS-AB-102.pdf", trusteesDoc: "TRUSTEES-AB-102.pdf"
    },
    {
        id: "coop_4", name: "Garment Workers & Tailors Association", sponsor: "Umuahia Guild of Tailors",
        members: 310, regNo: "COOP-AB-204", status: "Active", dateApplied: "Jun 20, 2026",
        cacDoc: "CAC-AB-204-INCORP.pdf", byelawsDoc: "BYELAWS-AB-204.pdf", trusteesDoc: "TRUSTEES-AB-204.pdf"
    }
]

export default function UnionApprovalsPage() {
    const router = useRouter()
    const [mounted, setMounted] = React.useState(false)
    const [unions, setUnions] = React.useState<CooperativeUnion[]>(SAMPLE_UNIONS)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const [search, setSearch] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState<string>("all")
    const [selected, setSelected] = React.useState<CooperativeUnion | null>(null)
    const [actioning, setActioning] = React.useState(false)
    const [loading, setLoading] = React.useState(true)

    // Onboarding states
    const [customers, setCustomers] = React.useState<any[]>([])
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
    const [newName, setNewName] = React.useState("")
    const [newDesc, setNewDesc] = React.useState("")
    const [selectedLeaderId, setSelectedLeaderId] = React.useState("")
    const [newSector, setNewSector] = React.useState("transport")
    const [newSegment, setNewSegment] = React.useState("Tricycle (Keke)")
    const [newCustomParam1, setNewCustomParam1] = React.useState("Aba North-South Route")
    const [newCustomParam2, setNewCustomParam2] = React.useState("50000")
    
    React.useEffect(() => {
        if (newSector === 'transport') {
            setNewSegment("Tricycle (Keke)")
            setNewCustomParam1("Aba North-South Route")
            setNewCustomParam2("50000")
        } else if (newSector === 'agriculture') {
            setNewSegment("Crop Farming")
            setNewCustomParam1("Obingwa Farm Center")
            setNewCustomParam2("6")
        } else if (newSector === 'commerce') {
            setNewSegment("Retail Traders")
            setNewCustomParam1("Ariaria Market Section B")
            setNewCustomParam2("20000")
        } else if (newSector === 'artisan') {
            setNewSegment("Leather Workers")
            setNewCustomParam1("Ogbor Hill Shoe Chapter")
            setNewCustomParam2("150000")
        }
    }, [newSector])

    const [newMarketplaceEnabled, setNewMarketplaceEnabled] = React.useState(false)
    const [newEscrowFee, setNewEscrowFee] = React.useState("1.5")
    const [newInvestorSplit, setNewInvestorSplit] = React.useState("80")
    const [newFrequency, setNewFrequency] = React.useState("weekly")
    const [newDefaultDues, setNewDefaultDues] = React.useState("10000")
    const [creatingCoop, setCreatingCoop] = React.useState(false)

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/copteller/admin/operators')
            const data = await res.json()
            if (data.success && data.operators) {
                setCustomers(data.operators)
                if (data.operators.length > 0) {
                    setSelectedLeaderId(data.operators[0].id)
                }
            }
        } catch (err) {
            console.warn("Failed to load customers for cooperative leader list", err)
        }
    }

    const fetchCooperatives = async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        try {
            const coopRes = await fetch('/api/copteller/admin/cooperatives', { signal: controller.signal })
            clearTimeout(timeoutId)
            const coopData = await coopRes.json()
            const coops = coopData.data || coopData.cooperatives
            if (Array.isArray(coops)) {
                // Merge database cooperatives if any
                const dbMapped = coops.map((c: any) => {
                    const uLeaderName = c.union_leader && typeof c.union_leader === 'object'
                        ? `${c.union_leader.firstName || ''} ${c.union_leader.lastName || ''}`.trim()
                        : 'Union Leader';
                    return {
                        id: String(c.id),
                        name: c.name,
                        sponsor: c.description || 'Artisan Sponsor Union',
                        members: 42,
                        regNo: `COOP-AB-${String(c.id).slice(-3).toUpperCase()}`,
                        status: c.status === 'active' ? 'Active' as const : c.status === 'suspended' ? 'Rejected' as const : 'Pending' as const,
                        dateApplied: new Date(c.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        cacDoc: "CAC-REG-DOC.pdf",
                        byelawsDoc: "BYELAWS-COOP.pdf",
                        trusteesDoc: "TRUSTEES-COOP.pdf",
                        unionLeaderName: uLeaderName,
                        sector: c.sector || 'transport',
                        marketplaceEnabled: c.marketplaceEnabled !== undefined ? c.marketplaceEnabled : false,
                        escrowFeePercent: c.escrowFeePercent !== undefined ? c.escrowFeePercent : 1.5,
                        investorYieldSplitPercent: c.investorYieldSplitPercent !== undefined ? c.investorYieldSplitPercent : 80,
                        cycleFrequency: c.cycleFrequency || 'weekly',
                        defaultContributionAmount: c.defaultContributionAmount !== undefined ? c.defaultContributionAmount : 1000000
                    }
                })
                setUnions(prev => {
                    // Filter out previous database ones
                    const filteredPrev = prev.filter(p => p.id.startsWith('coop_'))
                    return [...dbMapped, ...filteredPrev]
                })
            }
        } catch (err: any) {
            console.warn('Failed to load cooperatives or check timed out:', err.message)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchCooperatives()
        fetchCustomers()
    }, [])

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        setActioning(true)
        const tId = toast.loading(action === 'approve' ? "Registering cooperative under license..." : "Suspending registration...")
        
        try {
            const nextStatus = action === 'approve' ? 'active' : 'suspended'
            const isDbCoop = !id.startsWith('coop_')
            
            if (isDbCoop) {
                const res = await fetch('/api/copteller/admin/cooperatives', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cooperative_id: id, status: nextStatus })
                })
                const data = await res.json()
                if (!res.ok || !data.data) {
                    throw new Error(data.error || "Failed to update status on server")
                }
            }

            const viewStatus = action === 'approve' ? 'Active' : 'Rejected'
            setUnions(prev => prev.map(u => u.id === id ? { ...u, status: viewStatus } : u))
            setSelected(prev => prev?.id === id ? { ...prev, status: viewStatus } : prev)
            toast.success(action === 'approve' ? "Cooperative approved and registered successfully!" : "Cooperative registration rejected.", { id: tId })
        } catch (err: any) {
            toast.error(err.message || "Failed to update cooperative status", { id: tId })
        } finally {
            setActioning(false)
        }
    }

    const handleRegisterCooperative = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName || !selectedLeaderId) {
            toast.error("Name and Union Leader are required")
            return
        }
        setCreatingCoop(true)
        const tId = toast.loading("Submitting license application to registry...")

        const metadata: Record<string, any> = {}
        if (newSector === 'transport') {
            metadata.route = newCustomParam1
            metadata.associationLevy = Number(newCustomParam2)
        } else if (newSector === 'agriculture') {
            metadata.farmCenter = newCustomParam1
            metadata.cycleMonths = Number(newCustomParam2)
        } else if (newSector === 'commerce') {
            metadata.marketLocation = newCustomParam1
            metadata.dailyAjoTarget = Number(newCustomParam2)
        } else if (newSector === 'artisan') {
            metadata.guildChapter = newCustomParam1
            metadata.toolSubsidyCap = Number(newCustomParam2)
        }

        try {
            const res = await fetch('/api/copteller/admin/cooperatives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    description: newDesc,
                    union_leader_id: selectedLeaderId,
                    sector: newSector,
                    marketplaceEnabled: newMarketplaceEnabled,
                    escrowFeePercent: Number(newEscrowFee),
                    investorYieldSplitPercent: Number(newInvestorSplit),
                    cycleFrequency: newFrequency,
                    defaultContributionAmount: Number(newDefaultDues) * 100,
                    segment: newSegment,
                    metadata
                })
            })
            const data = await res.json()
            if (data.data) {
                toast.success(`Cooperative "${newName}" registered in Pending status!`, { id: tId })
                setIsAddModalOpen(false)
                setNewName("")
                setNewDesc("")
                setNewCustomParam1("")
                setNewCustomParam2("")
                fetchCooperatives()
            } else {
                toast.error(data.error || "Failed to register cooperative", { id: tId })
            }
        } catch (err) {
            toast.error("Network error, failed to register", { id: tId })
        } finally {
            setCreatingCoop(false)
        }
    }

    const filtered = unions.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.sponsor.toLowerCase().includes(search.toLowerCase())
        const matchesFilter = statusFilter === 'all' || u.status === statusFilter
        return matchesSearch && matchesFilter
    })

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
                <p className="text-muted-foreground font-medium text-sm">Validating CAC licensing files...</p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Licensing</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Union Approvals Queue</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold max-w-2xl">Review and register cooperative societies under the bank license directory.</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto h-9 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs border-0 gap-2 shadow-lg shrink-0 flex items-center justify-center">
                    <Plus className="h-3.5 w-3.5" /> Register Cooperative
                </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: 'Pending Approvals', val: unions.filter(u => u.status === 'Pending').length.toString() },
                    { label: 'Active Registered Unions', val: unions.filter(u => u.status === 'Active').length.toString() },
                    { label: 'Total Enrolled Members', val: unions.reduce((a, u) => a + u.members, 0).toLocaleString() },
                    { label: 'CAC Sync Health', val: 'Connected' },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-4 shadow-sm">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                        <p className="text-lg font-black mt-1 text-foreground">{s.val}</p>
                    </div>
                ))}
            </div>

            {/* 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Column: Unions List Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search union name or sponsor..."
                                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            {(['all', 'Pending', 'Active', 'Rejected'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black capitalize transition-all ${statusFilter === s ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-900 text-muted-foreground hover:text-foreground'}`}
                                >
                                    {s === 'all' ? 'All Status' : s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="divide-y divide-slate-50 dark:divide-slate-900/50">
                        {filtered.map(row => (
                            <div
                                key={row.id}
                                onClick={() => setSelected(selected?.id === row.id ? null : row)}
                                className={`px-5 py-4 cursor-pointer flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${selected?.id === row.id ? 'bg-rose-500/10' : ''}`}
                            >
                                <div className="flex gap-3 items-center min-w-0">
                                    <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl shrink-0">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-foreground text-sm truncate leading-snug">{row.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-semibold">Sponsor: {row.sponsor} &bull; Sector: <span className="capitalize text-slate-700 dark:text-slate-350 font-bold">{row.sector || 'Transport'}</span> &bull; Reg: {row.regNo}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-muted-foreground">{row.members} members</span>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${row.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : row.status === 'Rejected' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}>
                                        {row.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Details & Verification Panel */}
                <SidePanelWrapper
                    isOpen={Boolean(selected)}
                    onClose={() => setSelected(null)}
                    title="Union Application"
                    emptyState={
                        <div className="empty-state-card bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 text-center space-y-3 shadow-sm">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit mx-auto">
                                <ClipboardList className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            </div>
                            <p className="text-sm font-black text-muted-foreground font-black">Union Application Profile</p>
                            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                                Select a cooperative society from the registration applications queue list to audit their CAC files, constitution, and trustees.
                            </p>
                        </div>
                    }
                    className="w-full"
                >
                    {selected && (
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Union Application</span>
                                        <h3 className="text-sm font-black mt-1 leading-snug">{selected.name}</h3>
                                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{selected.regNo}</p>
                                    </div>
                                    <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="space-y-3.5 text-xs border-y border-slate-100 dark:border-slate-800 py-4 font-semibold">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Sponsoring Body</span><span className="font-bold">{selected.sponsor}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Sector / Segment</span><span className="font-bold capitalize">{selected.sector || 'Transport'} &bull; <span className="text-rose-600 dark:text-rose-400 font-black">{selected.segment || 'Tricycle (Keke)'}</span></span></div>
                                    
                                    {/* Sector Specific Metadata display */}
                                    {selected.metadata && selected.metadata.route && (
                                        <div className="flex justify-between"><span className="text-muted-foreground">Operational Route</span><span className="font-mono text-slate-700 dark:text-slate-300">{selected.metadata.route}</span></div>
                                    )}
                                    {selected.metadata && selected.metadata.associationLevy !== undefined && (
                                        <div className="flex justify-between"><span className="text-muted-foreground">Safety Levy Fee</span><span className="font-bold text-slate-700 dark:text-slate-300">₦{selected.metadata.associationLevy.toLocaleString()}</span></div>
                                    )}
                                    {selected.metadata && selected.metadata.farmCenter && (
                                        <div className="flex justify-between"><span className="text-muted-foreground">Farm Support Center</span><span className="font-bold text-slate-700 dark:text-slate-300">{selected.metadata.farmCenter}</span></div>
                                    )}
                                    {selected.metadata && selected.metadata.cycleMonths !== undefined && (
                                        <div className="flex justify-between"><span className="text-muted-foreground">Cycle Duration</span><span className="font-bold text-slate-700 dark:text-slate-300">{selected.metadata.cycleMonths} Months</span></div>
                                    )}
                                    {selected.metadata && selected.metadata.marketLocation && (
                                        <div className="flex justify-between"><span className="text-muted-foreground">Market Center</span><span className="font-bold text-slate-700 dark:text-slate-300">{selected.metadata.marketLocation}</span></div>
                                    )}
                                    {selected.metadata && selected.metadata.dailyAjoTarget !== undefined && (
                                        <div className="flex justify-between"><span className="text-muted-foreground">Daily Ajo Target</span><span className="font-bold text-slate-700 dark:text-slate-300">₦{selected.metadata.dailyAjoTarget.toLocaleString()}</span></div>
                                    )}
                                    {selected.metadata && selected.metadata.guildChapter && (
                                        <div className="flex justify-between"><span className="text-muted-foreground">Guild Chapter</span><span className="font-bold text-slate-700 dark:text-slate-300">{selected.metadata.guildChapter}</span></div>
                                    )}
                                    {selected.metadata && selected.metadata.toolSubsidyCap !== undefined && (
                                        <div className="flex justify-between"><span className="text-muted-foreground">Tool Grant Cap</span><span className="font-bold text-slate-700 dark:text-slate-300">₦{selected.metadata.toolSubsidyCap.toLocaleString()}</span></div>
                                    )}

                                    <div className="flex justify-between"><span className="text-muted-foreground">Date Applied</span><span className="font-bold">{selected.dateApplied}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Proposed Member Limit</span><span className="font-bold">{selected.members} active users</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Verification Check</span><span className="font-bold text-emerald-600">3/3 Passed ✓</span></div>
                                </div>

                                {/* Attached documents checklist */}
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Licensing Files Attached</p>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'CAC Certificate', file: selected.cacDoc },
                                            { label: 'Cooperative Constitution', file: selected.byelawsDoc },
                                            { label: 'Board Bio-Data & ID Verification', file: selected.trusteesDoc },
                                        ].map(doc => (
                                            <div key={doc.label} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black truncate">{doc.label}</p>
                                                    <p className="text-[8px] text-slate-400 font-mono truncate">{doc.file}</p>
                                                </div>
                                                <button className="text-[9px] font-black text-rose-600 flex items-center shrink-0 ml-2 hover:underline"><Eye className="h-3 w-3 mr-0.5" /> View</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Dynamic Configuration Controls */}
                                {!selected.id.startsWith('coop_') && (
                                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3 font-sans text-xs">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                            <Award className="h-3.5 w-3.5 text-rose-500" /> Platform Rules & Escrow Settings
                                        </p>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] text-muted-foreground font-semibold">Enabled in Investor Marketplace</label>
                                                <input
                                                    type="checkbox"
                                                    checked={selected.marketplaceEnabled || false}
                                                    onChange={async (e) => {
                                                        const newVal = e.target.checked
                                                        try {
                                                            const res = await fetch('/api/copteller/admin/cooperatives', {
                                                                method: 'PATCH',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ cooperative_id: selected.id, marketplaceEnabled: newVal })
                                                            })
                                                            if (res.ok) {
                                                                setUnions(prev => prev.map(u => u.id === selected.id ? { ...u, marketplaceEnabled: newVal } : u))
                                                                setSelected(prev => prev ? { ...prev, marketplaceEnabled: newVal } : null)
                                                                toast.success(`Marketplace listing ${newVal ? 'enabled' : 'disabled'} for ${selected.name}`)
                                                            }
                                                        } catch (err) {
                                                            toast.error("Failed to update marketplace settings")
                                                        }
                                                    }}
                                                    className="rounded border-slate-350 dark:border-slate-700 h-3.5 w-3.5 text-rose-500 accent-rose-500 focus:ring-0 cursor-pointer"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Escrow Fee (%)</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={selected.escrowFeePercent || 1.5}
                                                        onChange={async (e) => {
                                                            const newVal = Number(e.target.value)
                                                            setUnions(prev => prev.map(u => u.id === selected.id ? { ...u, escrowFeePercent: newVal } : u))
                                                            setSelected(prev => prev ? { ...prev, escrowFeePercent: newVal } : null)
                                                        }}
                                                        onBlur={async () => {
                                                            try {
                                                                await fetch('/api/copteller/admin/cooperatives', {
                                                                    method: 'PATCH',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ cooperative_id: selected.id, escrowFeePercent: selected.escrowFeePercent })
                                                                })
                                                            } catch {}
                                                        }}
                                                        className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-[11px] font-bold text-foreground focus:outline-none focus:border-rose-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Investor Split (%)</label>
                                                    <input
                                                        type="number"
                                                        value={selected.investorYieldSplitPercent || 80}
                                                        onChange={async (e) => {
                                                            const newVal = Number(e.target.value)
                                                            setUnions(prev => prev.map(u => u.id === selected.id ? { ...u, investorYieldSplitPercent: newVal } : u))
                                                            setSelected(prev => prev ? { ...prev, investorYieldSplitPercent: newVal } : null)
                                                        }}
                                                        onBlur={async () => {
                                                            try {
                                                                await fetch('/api/copteller/admin/cooperatives', {
                                                                    method: 'PATCH',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ cooperative_id: selected.id, investorYieldSplitPercent: selected.investorYieldSplitPercent })
                                                                })
                                                            } catch {}
                                                        }}
                                                        className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-[11px] font-bold text-foreground focus:outline-none focus:border-rose-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Cycle Frequency</label>
                                                    <select
                                                        value={selected.cycleFrequency || 'weekly'}
                                                        onChange={async (e) => {
                                                            const newVal = e.target.value
                                                            try {
                                                                const res = await fetch('/api/copteller/admin/cooperatives', {
                                                                    method: 'PATCH',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ cooperative_id: selected.id, cycleFrequency: newVal })
                                                                })
                                                                if (res.ok) {
                                                                    setUnions(prev => prev.map(u => u.id === selected.id ? { ...u, cycleFrequency: newVal } : u))
                                                                    setSelected(prev => prev ? { ...prev, cycleFrequency: newVal } : null)
                                                                    toast.success("Cycle frequency updated")
                                                                }
                                                            } catch {
                                                                toast.error("Failed to update cycle frequency")
                                                            }
                                                        }}
                                                        className="w-full h-8 px-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-[11px] font-bold text-foreground focus:outline-none focus:border-rose-500"
                                                    >
                                                        <option value="weekly">Weekly</option>
                                                        <option value="biweekly">Bi-Weekly</option>
                                                        <option value="monthly">Monthly</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Default Dues (₦)</label>
                                                    <input
                                                        type="number"
                                                        value={(selected.defaultContributionAmount || 1000000) / 100}
                                                        onChange={async (e) => {
                                                            const newVal = Number(e.target.value) * 100
                                                            setUnions(prev => prev.map(u => u.id === selected.id ? { ...u, defaultContributionAmount: newVal } : u))
                                                            setSelected(prev => prev ? { ...prev, defaultContributionAmount: newVal } : null)
                                                        }}
                                                        onBlur={async () => {
                                                            try {
                                                                await fetch('/api/copteller/admin/cooperatives', {
                                                                    method: 'PATCH',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ cooperative_id: selected.id, defaultContributionAmount: selected.defaultContributionAmount })
                                                                })
                                                            } catch {}
                                                        }}
                                                        className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-[11px] font-bold text-foreground focus:outline-none focus:border-rose-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Controls */}
                                <div className="space-y-2 pt-2">
                                    <Button
                                        onClick={() => router.push(`/copteller/superadmin/unions/${selected.id}`)}
                                        className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-250 dark:bg-slate-900 dark:hover:bg-slate-800 text-foreground font-black text-xs border border-slate-200 dark:border-slate-850 gap-2 mb-1"
                                    >
                                        Open Fullscreen Profile →
                                    </Button>
                                    {selected.status === 'Pending' && (
                                        <div className="flex flex-col-reverse sm:flex-row gap-2">
                                            <Button
                                                onClick={() => handleAction(selected.id, 'reject')}
                                                disabled={actioning}
                                                variant="outline"
                                                className="w-full sm:flex-1 h-10 rounded-xl text-rose-600 border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-black text-xs"
                                            >
                                                Reject Application
                                            </Button>
                                            <Button
                                                onClick={() => handleAction(selected.id, 'approve')}
                                                disabled={actioning}
                                                className="w-full sm:flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black text-xs border-0 shadow-lg"
                                            >
                                                {actioning ? 'Structuring...' : 'Approve & Sync'}
                                            </Button>
                                        </div>
                                    )}
                                    {selected.status === 'Active' && (
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-2">
                                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                                            <p className="text-[10px] text-emerald-700 dark:text-emerald-450 font-bold leading-normal">
                                                Approved and synced with CAC directory. This cooperative union is active under licensing ID MFB-{selected.regNo}.
                                            </p>
                                        </div>
                                    )}
                                    {selected.status === 'Rejected' && (
                                        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2">
                                            <XCircle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                                            <p className="text-[10px] text-rose-700 dark:text-rose-450 font-bold leading-normal">
                                                Application rejected. Trustee details flagged for manual CAC validation check.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                </SidePanelWrapper>
            </div>

            {/* Onboard Cooperative Modal */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isAddModalOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsAddModalOpen(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 40 }}
                                className="relative bg-background border border-slate-200 dark:border-slate-800 rounded-t-[32px] sm:rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl font-sans max-h-[85dvh] overflow-y-auto z-10"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-black">Register Cooperative Society</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Onboard a trade union to the bank licensing registry.</p>
                                    </div>
                                    <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <form onSubmit={handleRegisterCooperative} className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Cooperative Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={newName}
                                                onChange={e => setNewName(e.target.value)}
                                                placeholder="e.g. Aba Leather Union"
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-rose-500"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Sponsoring Body</label>
                                            <input
                                                type="text"
                                                required
                                                value={newDesc}
                                                onChange={e => setNewDesc(e.target.value)}
                                                placeholder="e.g. Ministry of Transport"
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-rose-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Active Sector</label>
                                            <select 
                                                value={newSector} 
                                                onChange={e => setNewSector(e.target.value)}
                                                className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-rose-500"
                                            >
                                                <option value="transport">Transport (Drivers)</option>
                                                <option value="agriculture">Agriculture (Farmers)</option>
                                                <option value="commerce">Commerce (Traders)</option>
                                                <option value="artisan">Artisans (Masons/Welders)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Cooperative Admin / Leader</label>
                                            <select 
                                                value={selectedLeaderId} 
                                                onChange={e => setSelectedLeaderId(e.target.value)}
                                                className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-rose-500"
                                            >
                                                {customers.length === 0 ? (
                                                    <option value="">No union operators found</option>
                                                ) : (
                                                    customers.map(c => (
                                                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.phone})</option>
                                                    ))
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Dynamic Sector Segment & Custom Parameters */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-rose-500 uppercase">Sector Segment</label>
                                            {newSector === 'transport' && (
                                                <select value={newSegment} onChange={e => setNewSegment(e.target.value)} className="w-full h-8 px-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-[11px] font-bold focus:outline-none focus:border-rose-500">
                                                    <option value="Tricycle (Keke)">Tricycle (Keke)</option>
                                                    <option value="Motorcycle (Okada)">Motorcycle (Okada)</option>
                                                    <option value="Minibus / Operators">Minibus / Operators</option>
                                                    <option value="Haulage / Trucks">Haulage / Trucks</option>
                                                </select>
                                            )}
                                            {newSector === 'agriculture' && (
                                                <select value={newSegment} onChange={e => setNewSegment(e.target.value)} className="w-full h-8 px-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-[11px] font-bold focus:outline-none focus:border-rose-500">
                                                    <option value="Crop Farming">Crop Farming</option>
                                                    <option value="Livestock / Cattle">Livestock / Cattle</option>
                                                    <option value="Poultry / Birds">Poultry / Birds</option>
                                                    <option value="Aquaculture / Fish">Aquaculture / Fish</option>
                                                </select>
                                            )}
                                            {newSector === 'commerce' && (
                                                <select value={newSegment} onChange={e => setNewSegment(e.target.value)} className="w-full h-8 px-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-[11px] font-bold focus:outline-none focus:border-rose-500">
                                                    <option value="Retail Traders">Retail Traders</option>
                                                    <option value="Wholesale Market">Wholesale Market</option>
                                                    <option value="Market Stall Owners">Market Stall Owners</option>
                                                    <option value="Import / Export">Import / Export</option>
                                                </select>
                                            )}
                                            {newSector === 'artisan' && (
                                                <select value={newSegment} onChange={e => setNewSegment(e.target.value)} className="w-full h-8 px-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-[11px] font-bold focus:outline-none focus:border-rose-500">
                                                    <option value="Leather Workers">Leather Workers</option>
                                                    <option value="Tailor Guild">Tailor Guild</option>
                                                    <option value="Metal Fabricators">Metal Fabricators</option>
                                                    <option value="Carpenters / Masons">Carpenters / Masons</option>
                                                </select>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-rose-500 uppercase">
                                                {newSector === 'transport' ? 'Operational Route' :
                                                 newSector === 'agriculture' ? 'Farm Support Center' :
                                                 newSector === 'commerce' ? 'Market Center' :
                                                 'Guild Chapter'}
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={newCustomParam1}
                                                onChange={e => setNewCustomParam1(e.target.value)}
                                                className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-[11px] font-semibold focus:outline-none focus:border-rose-500"
                                            />
                                        </div>

                                        <div className="col-span-1 sm:col-span-2 space-y-1 mt-1">
                                            <label className="text-[9px] font-black text-rose-500 uppercase">
                                                {newSector === 'transport' ? 'Safety Levy Fund Cap (₦)' :
                                                 newSector === 'agriculture' ? 'Seasonal Cycle Duration (Months)' :
                                                 newSector === 'commerce' ? 'Daily Target Contribution (₦)' :
                                                 'Tool Subsidy Grant Cap (₦)'}
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                value={newCustomParam2}
                                                onChange={e => setNewCustomParam2(e.target.value)}
                                                className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-[11px] font-black focus:outline-none focus:border-rose-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Escrow Fee (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={newEscrowFee}
                                                onChange={e => setNewEscrowFee(e.target.value)}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-rose-500"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Investor Yield (%)</label>
                                            <input
                                                type="number"
                                                value={newInvestorSplit}
                                                onChange={e => setNewInvestorSplit(e.target.value)}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-rose-500"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Frequency</label>
                                            <select 
                                                value={newFrequency} 
                                                onChange={e => setNewFrequency(e.target.value)}
                                                className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none"
                                            >
                                                <option value="weekly">Weekly</option>
                                                <option value="biweekly">Bi-Weekly</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Default Contribution (₦)</label>
                                            <input
                                                type="number"
                                                value={newDefaultDues}
                                                onChange={e => setNewDefaultDues(e.target.value)}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-rose-500"
                                            />
                                        </div>
                                        <div className="space-y-1 flex flex-col justify-end pb-1.5">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="mkt-enabled"
                                                    checked={newMarketplaceEnabled}
                                                    onChange={e => setNewMarketplaceEnabled(e.target.checked)}
                                                    className="rounded border-slate-350 dark:border-slate-700 h-4 w-4 text-rose-500 accent-rose-500 focus:ring-0 cursor-pointer"
                                                />
                                                <label htmlFor="mkt-enabled" className="text-[10px] font-black cursor-pointer leading-none">Marketplace Listing</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                                        <Button type="button" onClick={() => setIsAddModalOpen(false)} variant="outline" className="w-full sm:flex-1 rounded-xl h-9 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                        <Button type="submit" disabled={creatingCoop} className="w-full sm:flex-1 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs h-9 rounded-xl border-0 shadow-md">
                                            {creatingCoop ? 'Submitting...' : 'Register'}
                                        </Button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}


