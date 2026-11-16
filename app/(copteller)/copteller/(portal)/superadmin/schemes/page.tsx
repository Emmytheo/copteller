"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp, PlusCircle, X, Search, ShieldCheck, FileText,
    ArrowRight, Building2, Filter, RefreshCw, ChevronDown,
    CheckCircle2, AlertCircle, Info, CircleDollarSign, Users, Layers,
    Pause, Play, Trash2, Edit2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

const SCHEME_TYPES = [
    { value: "ajo_rotation", label: "Ajo / Rotational Thrift", icon: "🔄" },
    { value: "hire_purchase", label: "Hire Purchase / Asset Lease", icon: "🚛" },
    { value: "loan_pool", label: "Micro Loan Pool", icon: "💰" },
    { value: "grant", label: "Grant Distribution", icon: "🏛️" },
    { value: "bond", label: "Cooperative Bond / Fixed Savings", icon: "🔐" },
    { value: "savings_drive", label: "Group Savings Drive", icon: "🐖" },
]

const CATEGORY_COLORS: Record<string, string> = {
    hire_purchase: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
    ajo_rotation:   'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    loan_pool:  'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400',
    grant: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    bond: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400',
    savings_drive: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
}

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    draft:  'bg-slate-500/10 text-slate-500 border-slate-500/20',
    pending_approval: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    paused: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    completed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    cancelled: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
}

export default function SuperadminSchemesPage() {
    const [schemes, setSchemes] = React.useState<any[]>([])
    const [cooperatives, setCooperatives] = React.useState<any[]>([])
    const [productTemplates, setProductTemplates] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [filterSchemeType, setFilterSchemeType] = React.useState<string>("all")
    const [selectedScheme, setSelectedScheme] = React.useState<any | null>(null)
    const [panelMode, setPanelMode] = React.useState<'detail' | 'create' | 'edit' | 'none'>('none')
    const [submitting, setSubmitting] = React.useState(false)

    // Create form state
    const [selectedCoop, setSelectedCoop] = React.useState("")
    const [selectedProductTemplate, setSelectedProductTemplate] = React.useState<any | null>(null)
    const [schemeName, setSchemeName] = React.useState("")
    const [targetCapital, setTargetCapital] = React.useState("")
    const [yieldRate, setYieldRate] = React.useState("")
    const [duration, setDuration] = React.useState("")
    const [contribAmount, setContribAmount] = React.useState("")
    const [maxParticipants, setMaxParticipants] = React.useState("")
    const [startDate, setStartDate] = React.useState("")
    const [endDate, setEndDate] = React.useState("")
    const [description, setDescription] = React.useState("")

    // Edit form states
    const [editName, setEditName] = React.useState("")
    const [editTargetCapital, setEditTargetCapital] = React.useState("")
    const [editYieldRate, setEditYieldRate] = React.useState("")
    const [editDuration, setEditDuration] = React.useState("")
    const [editContribAmount, setEditContribAmount] = React.useState("")
    const [editStatus, setEditStatus] = React.useState('draft')
    const [editApproved, setEditApproved] = React.useState(false)

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [schemesRes, coopsRes, productsRes] = await Promise.all([
                fetch('/api/copteller/schemes'),
                fetch('/api/copteller/admin/cooperatives'),
                fetch('/api/copteller/products'),
            ])
            const [schemesData, coopsData, productsData] = await Promise.all([
                schemesRes.json(), coopsRes.json(), productsRes.json()
            ])
            if (schemesData.data) setSchemes(schemesData.data)
            if (coopsData.data) setCooperatives(coopsData.data)
            if (productsData.data) setProductTemplates(productsData.data)
        } catch (e) {
            console.error("Failed to load platform registry data:", e)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => { fetchAll() }, [])

    React.useEffect(() => {
        if (selectedProductTemplate) {
            setSchemeName(`${selectedProductTemplate.name} Scheme`)
            setYieldRate(selectedProductTemplate.interest_rate || 0)
            setDuration(selectedProductTemplate.max_duration_months || 12)
            setTargetCapital(selectedProductTemplate.max_amount ? (selectedProductTemplate.max_amount / 100).toString() : "5000000")
            setContribAmount(selectedProductTemplate.min_amount ? (selectedProductTemplate.min_amount / 100).toString() : "10000")
            setMaxParticipants(selectedProductTemplate.max_members_per_cycle || "50")
        }
    }, [selectedProductTemplate])

    const handleCreateScheme = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCoop || !selectedProductTemplate) {
            toast.error("Cooperative and Product Template are required")
            return
        }
        setSubmitting(true)
        const tId = toast.loading("Structuring new scheme instance...")
        try {
            const res = await fetch('/api/copteller/schemes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: schemeName,
                    description,
                    cooperative: selectedCoop,
                    product_type: selectedProductTemplate.id,
                    scheme_type: selectedProductTemplate.product_type,
                    status: 'draft',
                    bank_approved: false,
                    target_capital: Number(targetCapital) * 100,
                    contribution_amount: Number(contribAmount) * 100,
                    yield_rate: Number(yieldRate),
                    repayment_frequency: selectedProductTemplate.repayment_frequency || 'weekly',
                    duration_months: Number(duration),
                    max_participants: Number(maxParticipants),
                    start_date: startDate || undefined,
                    end_date: endDate || undefined,
                })
            })
            const data = await res.json()
            if (data.data) {
                toast.success("Scheme instance created successfully under draft status!", { id: tId })
                setPanelMode('none')
                setSelectedProductTemplate(null)
                setSchemeName("")
                setDescription("")
                fetchAll()
            } else {
                throw new Error(data.error || "Failed to create scheme")
            }
        } catch (err: any) {
            toast.error(err.message, { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    const startEditScheme = (scheme: any) => {
        setEditName(scheme.name || "")
        setEditTargetCapital(scheme.target_capital ? (scheme.target_capital / 100).toString() : "0")
        setEditYieldRate(scheme.yield_rate || "0")
        setEditDuration(scheme.duration_months || "12")
        setEditContribAmount(scheme.contribution_amount ? (scheme.contribution_amount / 100).toString() : "0")
        setEditStatus(scheme.status || 'draft')
        setEditApproved(scheme.bank_approved || false)
        setPanelMode('edit')
    }

    const handleUpdateScheme = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedScheme) return
        setSubmitting(true)
        const tId = toast.loading("Saving scheme configuration...")
        try {
            const res = await fetch(`/api/copteller/schemes/${selectedScheme.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName,
                    target_capital: Number(editTargetCapital) * 100,
                    yield_rate: Number(editYieldRate),
                    duration_months: Number(editDuration),
                    contribution_amount: Number(editContribAmount) * 100,
                    status: editStatus,
                    bank_approved: editApproved,
                })
            })
            const data = await res.json()
            if (data.data) {
                toast.success("Scheme configuration updated successfully!", { id: tId })
                setSelectedScheme(data.data)
                setPanelMode('detail')
                fetchAll()
            } else {
                throw new Error(data.error || "Failed to update scheme")
            }
        } catch (err: any) {
            toast.error(err.message || "Error updating scheme", { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    const handleToggleApproval = async (scheme: any) => {
        const nextApproved = !scheme.bank_approved
        const tId = toast.loading(nextApproved ? "Approving scheme to go live..." : "Revoking scheme approval...")
        try {
            const res = await fetch(`/api/copteller/schemes/${scheme.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bank_approved: nextApproved,
                    status: nextApproved ? 'active' : scheme.status
                })
            })
            const data = await res.json()
            if (data.data) {
                toast.success(nextApproved ? "Scheme approved and live!" : "Scheme approval suspended.", { id: tId })
                if (selectedScheme?.id === scheme.id) {
                    setSelectedScheme(data.data)
                }
                fetchAll()
            } else {
                throw new Error(data.error)
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to alter scheme status", { id: tId })
        }
    }

    const filtered = schemes.filter(s => {
        const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase())
        const matchType = filterSchemeType === 'all' || s.scheme_type === filterSchemeType
        return matchSearch && matchType
    })

    const stats = {
        total: schemes.length,
        active: schemes.filter(s => s.status === 'active').length,
        totalCapital: schemes.reduce((sum, s) => sum + (s.target_capital || 0), 0),
        avgRate: schemes.filter(s => s.yield_rate > 0).length > 0
            ? (schemes.filter(s => s.yield_rate > 0).reduce((a, s) => a + s.yield_rate, 0) /
               schemes.filter(s => s.yield_rate > 0).length).toFixed(1)
            : "0",
    }

    return (
        <div className="min-h-screen bg-background font-sans px-3 sm:px-6 md:px-8 py-4 sm:py-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Platform Regulator</p>
                    </div>
                    <h1 className="text-2xl font-black">Scheme Management</h1>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                        Manage cycles & portfolios across all cooperatives · <span className="text-amber-500">{stats.active} active schemes</span>
                    </p>
                </div>
                <Button
                    onClick={() => { setPanelMode('create'); setSelectedScheme(null) }}
                    className="w-full sm:w-auto h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs border-0 gap-2 shadow-lg"
                >
                    <PlusCircle className="h-4 w-4" /> Instantiate Scheme
                </Button>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: "Total Schemes", val: stats.total.toString(), icon: Layers, color: "indigo" },
                    { label: "Active Schemes", val: stats.active.toString(), icon: CheckCircle2, color: "emerald" },
                    { label: "Total Capital Pool", val: fmt(stats.totalCapital / 100), icon: CircleDollarSign, color: "amber" },
                    { label: "Avg Yield Rate", val: `${stats.avgRate}%`, icon: TrendingUp, color: "blue" },
                ].map((kpi, i) => (
                    <div key={kpi.label} className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                        <div className={`p-2 rounded-xl w-fit ${
                            kpi.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                            kpi.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                            kpi.color === 'amber' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                            'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
                            <p className="text-xl font-black mt-0.5">{kpi.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Scheme Type Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 border-b no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
                <button onClick={() => setFilterSchemeType("all")} className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${filterSchemeType === "all" ? "bg-amber-500 text-white" : "hover:bg-muted text-muted-foreground"}`}>
                    All Types
                </button>
                {SCHEME_TYPES.map(tab => (
                    <button key={tab.value} onClick={() => setFilterSchemeType(tab.value)} className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${filterSchemeType === tab.value ? "bg-amber-500 text-white" : "hover:bg-muted text-muted-foreground"}`}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Main content split */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Schemes list */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                        <input
                            placeholder="Search scheme instances by name..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-amber-500"
                        />
                    </div>

                    {loading ? (
                        <div className="flex h-48 items-center justify-center">
                            <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="border border-dashed border-border rounded-3xl p-12 text-center bg-card">
                            <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-xs font-bold text-muted-foreground">No active schemes found</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1 font-semibold">Generate scheme cycles from cooperatives admin or configure one above.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map((scheme) => (
                                <div
                                    key={scheme.id}
                                    onClick={() => { setSelectedScheme(scheme); setPanelMode('detail') }}
                                    className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-sm ${
                                        selectedScheme?.id === scheme.id
                                            ? 'border-amber-500/50 bg-amber-500/5'
                                            : 'bg-card border-border hover:border-amber-500/40'
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm truncate">{scheme.name}</h3>
                                            <Badge variant="outline" className={`text-[9px] uppercase font-bold shrink-0 ${CATEGORY_COLORS[scheme.scheme_type] || ''}`}>
                                                {SCHEME_TYPES.find(t => t.value === scheme.scheme_type)?.label || scheme.scheme_type}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-semibold mt-1 truncate">
                                            Coop: <span className="font-bold text-foreground">{(scheme.cooperative as any)?.name || "External Platform"}</span>
                                        </p>
                                        <div className="flex items-center gap-4 mt-3 text-[10px] font-semibold text-muted-foreground">
                                            <span>Cap: <span className="font-black text-foreground">{fmt(scheme.target_capital / 100)}</span></span>
                                            <span>Cycle Repay: <span className="font-black text-foreground">{fmt(scheme.contribution_amount / 100)}</span></span>
                                            {scheme.yield_rate > 0 && <span>Yield: <span className="font-black text-emerald-600 dark:text-emerald-400">{scheme.yield_rate}%</span></span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <Badge className={`text-[9px] font-black uppercase ${STATUS_COLORS[scheme.status] || ''}`}>
                                            {scheme.status}
                                        </Badge>
                                        <span className="text-[9px] text-muted-foreground">{scheme.enrolled_count || 0} / {scheme.max_participants || "∞"} members</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar Detail / Create Panel */}
                <div className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                        {panelMode === 'none' && (
                            <div className="border border-dashed border-border rounded-3xl p-8 text-center bg-card/40 flex flex-col items-center justify-center h-full min-h-[300px]">
                                <Info className="h-6 w-6 text-muted-foreground/30 mb-2" />
                                <p className="text-xs font-bold text-muted-foreground">No Scheme Selected</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-1">Select a scheme from the list to manage licensing parameters or approve payout order.</p>
                            </div>
                        )}

                        {panelMode === 'detail' && selectedScheme && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-6 shadow-sm">
                                <div className="flex justify-between items-start border-b pb-4">
                                    <div>
                                        <h3 className="text-base font-black">{selectedScheme.name}</h3>
                                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Instance parameters and licensing telemetry</p>
                                    </div>
                                    <button onClick={() => setPanelMode('none')} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
                                </div>

                                <div className="space-y-4 text-xs font-semibold">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                                        <div className="p-3 bg-muted/40 rounded-xl">
                                            <p className="text-[9px] text-muted-foreground uppercase">Target Capital Pool</p>
                                            <p className="text-sm font-black mt-0.5">{fmt(selectedScheme.target_capital / 100)}</p>
                                        </div>
                                        <div className="p-3 bg-muted/40 rounded-xl">
                                            <p className="text-[9px] text-muted-foreground uppercase">Cycle Contribution</p>
                                            <p className="text-sm font-black mt-0.5">{fmt(selectedScheme.contribution_amount / 100)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between py-1 border-b">
                                            <span className="text-muted-foreground">Cooperative Guild</span>
                                            <span className="font-bold">{(selectedScheme.cooperative as any)?.name || "Universal Access"}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b">
                                            <span className="text-muted-foreground">Repayment Frequency</span>
                                            <span className="font-bold capitalize">{selectedScheme.repayment_frequency}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b">
                                            <span className="text-muted-foreground">Cycle Duration</span>
                                            <span className="font-bold">{selectedScheme.duration_months} Months</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b">
                                            <span className="text-muted-foreground">Platform Clear Status</span>
                                            <span className="font-bold">{selectedScheme.bank_approved ? "✓ Licensed" : "⚠️ Pending Bank Approval"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse sm:flex-row gap-2">
                                    <Button onClick={() => startEditScheme(selectedScheme)} className="w-full sm:flex-1 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs gap-1.5">
                                        <Edit2 className="h-3.5 w-3.5" /> Modify Parameters
                                    </Button>
                                    <Button onClick={() => handleToggleApproval(selectedScheme)} variant={selectedScheme.bank_approved ? "destructive" : "outline"} className="w-full sm:flex-1 h-9 rounded-xl text-xs font-bold gap-1.5">
                                        {selectedScheme.bank_approved ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                        {selectedScheme.bank_approved ? "Revoke License" : "Approve & Launch"}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {panelMode === 'create' && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5 shadow-sm">
                                <div className="flex justify-between items-start border-b pb-4">
                                    <div>
                                        <h3 className="text-sm font-black">Instantiate Product Scheme</h3>
                                        <p className="text-[10px] text-muted-foreground">Select a cooperative and template to create a cycle.</p>
                                    </div>
                                    <button onClick={() => setPanelMode('none')} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
                                </div>

                                <form onSubmit={handleCreateScheme} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Target Cooperative Society</label>
                                        <select value={selectedCoop} onChange={e => setSelectedCoop(e.target.value)} required
                                            className="w-full h-9 px-2 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none">
                                            <option value="">Select Cooperative...</option>
                                            {cooperatives.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Base Product Template</label>
                                        <select value={selectedProductTemplate?.id || ""} onChange={e => setSelectedProductTemplate(productTemplates.find(pt => pt.id === e.target.value) || null)} required
                                            className="w-full h-9 px-2 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none">
                                            <option value="">Select Template...</option>
                                            {productTemplates.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                                        </select>
                                    </div>

                                    {selectedProductTemplate && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-muted-foreground uppercase">Scheme Instance Name</label>
                                                <input value={schemeName} onChange={e => setSchemeName(e.target.value)} required
                                                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Target Capital (₦)</label>
                                                    <input type="number" value={targetCapital} onChange={e => setTargetCapital(e.target.value)} required
                                                        className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Contribution Amount (₦)</label>
                                                    <input type="number" value={contribAmount} onChange={e => setContribAmount(e.target.value)} required
                                                        className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Yield Rate (%)</label>
                                                    <input type="number" value={yieldRate} onChange={e => setYieldRate(e.target.value)} required
                                                        className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Duration (Months)</label>
                                                    <input type="number" value={duration} onChange={e => setDuration(e.target.value)} required
                                                        className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-muted-foreground uppercase">Max Slots / Participants</label>
                                                <input type="number" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} required
                                                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Start Date</label>
                                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                                        className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-bold text-muted-foreground uppercase">End Date</label>
                                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                                        className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none" />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-muted-foreground uppercase">Description</label>
                                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                                                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none resize-none focus:border-amber-500" />
                                            </div>
                                        </div>
                                    )}

                                    <Button type="submit" disabled={submitting} className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg border-0">
                                        {submitting ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null} Instantiate Scheme Cycle
                                    </Button>
                                </form>
                            </motion.div>
                        )}

                        {panelMode === 'edit' && selectedScheme && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5 shadow-sm">
                                <div className="flex justify-between items-start border-b pb-4">
                                    <div>
                                        <h3 className="text-sm font-black">Edit Scheme Instance</h3>
                                        <p className="text-[10px] text-muted-foreground">Modify parameters for active cycle.</p>
                                    </div>
                                    <button onClick={() => setPanelMode('detail')} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
                                </div>

                                <form onSubmit={handleUpdateScheme} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Scheme Instance Name</label>
                                        <input value={editName} onChange={e => setEditName(e.target.value)} required
                                            className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Target Capital (₦)</label>
                                            <input type="number" value={editTargetCapital} onChange={e => setEditTargetCapital(e.target.value)} required
                                                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Contribution Amount (₦)</label>
                                            <input type="number" value={editContribAmount} onChange={e => setEditContribAmount(e.target.value)} required
                                                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Yield Rate (%)</label>
                                            <input type="number" value={editYieldRate} onChange={e => setEditYieldRate(e.target.value)} required
                                                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Duration (Months)</label>
                                            <input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)} required
                                                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Operation Status</label>
                                        <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                                            className="w-full h-9 px-2 rounded-xl border border-border bg-background text-xs font-semibold focus:outline-none">
                                            <option value="draft">Draft</option>
                                            <option value="pending_approval">Pending Approval</option>
                                            <option value="active">Active</option>
                                            <option value="paused">Paused</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2 py-2">
                                        <input type="checkbox" id="editApproved" checked={editApproved} onChange={e => setEditApproved(e.target.checked)} className="w-3.5 h-3.5 accent-amber-500" />
                                        <label htmlFor="editApproved" className="text-[10px] font-bold text-muted-foreground cursor-pointer">Bank Approved (License Granted)</label>
                                    </div>

                                    <Button type="submit" disabled={submitting} className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg border-0">
                                        {submitting ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null} Save Scheme modifications
                                    </Button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
