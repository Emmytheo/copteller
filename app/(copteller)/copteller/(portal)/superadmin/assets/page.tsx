"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Truck, Search, Filter, X, CheckCircle2, AlertCircle,
    Clock, MapPin, BarChart3, Download, Settings, RefreshCw,
    Eye, ShieldAlert, Users, CircleDollarSign
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

type AssetStatus = 'active' | 'defaulted' | 'completed' | 'pending' | 'suspended'

interface HPAsset {
    id: string
    assetName: string
    regNumber: string
    assetType: string
    cooperative: string
    operator: string
    operatorPhone: string
    totalValue: number
    amountPaid: number
    weeklyDue: number
    startDate: string
    expectedCompletion: string
    status: AssetStatus
    lastPayment: string
    location: string
    missedPayments: number
}

const STATUS_CFG: Record<AssetStatus, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    defaulted: { label: 'Defaulted', cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
    completed: { label: 'Completed', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    pending: { label: 'Pending', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    suspended: { label: 'Suspended', cls: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
}

export default function SuperadminAssetsPage() {
    const [assets, setAssets] = React.useState<HPAsset[]>([])
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState('')
    const [filter, setFilter] = React.useState<string>('all')
    const [selected, setSelected] = React.useState<HPAsset | null>(null)
    const [actioning, setActioning] = React.useState(false)

    const fetchAssets = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/copteller/contracts?contract_type=hire_purchase')
            const json = await res.json()
            if (json.data) {
                const mapped = json.data.map((c: any) => {
                    const memberObj = typeof c.member === 'object' ? c.member : null
                    const coopObj = typeof c.cooperative === 'object' ? c.cooperative : null
                    return {
                        id: String(c.id),
                        assetName: c.asset_name || 'Hire Purchase Asset',
                        regNumber: c.asset_identifier || '—',
                        assetType: 'Asset',
                        cooperative: coopObj ? coopObj.name : 'Independent Guild',
                        operator: memberObj ? `${memberObj.firstName || 'Member'} ${memberObj.lastName || ''}`.trim() : 'Coop Operator',
                        operatorPhone: memberObj?.phone_number || '—',
                        totalValue: (c.total_obligation || 0) / 100,
                        amountPaid: (c.total_paid || 0) / 100,
                        weeklyDue: (c.due_amount || 0) / 100,
                        startDate: c.start_date ? new Date(c.start_date).toLocaleDateString() : '—',
                        expectedCompletion: c.end_date ? new Date(c.end_date).toLocaleDateString() : '—',
                        status: c.status,
                        lastPayment: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : '—',
                        location: c.notes || 'No notes',
                        missedPayments: c.missed_payments || 0
                    }
                })
                setAssets(mapped)
            }
        } catch (err) {
            console.error('Failed to load HP assets:', err)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => { fetchAssets() }, [])

    const filtered = assets.filter(a => {
        const q = search.toLowerCase()
        const matchQ = a.assetName.toLowerCase().includes(q) || a.operator.toLowerCase().includes(q) ||
            a.cooperative.toLowerCase().includes(q) || a.regNumber.toLowerCase().includes(q)
        const matchF = filter === 'all' || a.status === filter
        return matchQ && matchF
    })

    const stats = {
        total: assets.length,
        active: assets.filter(a => a.status === 'active').length,
        defaulted: assets.filter(a => a.status === 'defaulted').length,
        completed: assets.filter(a => a.status === 'completed').length,
        totalBookValue: assets.reduce((sum, a) => sum + a.totalValue, 0),
        totalRepaid: assets.reduce((sum, a) => sum + a.amountPaid, 0),
    }

    const handleAction = async (action: 'suspend' | 'unsuspend' | 'flag', asset: HPAsset) => {
        setActioning(true)
        const tId = toast.loading(`${action === 'flag' ? 'Flagging' : action === 'suspend' ? 'Suspending' : 'Reinstating'} ${asset.assetName}…`)
        const newStatus: AssetStatus = action === 'suspend' ? 'suspended' : action === 'unsuspend' ? 'active' : 'defaulted'
        try {
            const res = await fetch('/api/copteller/contracts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: asset.id, status: newStatus })
            })
            const data = await res.json()
            if (data.data) {
                toast.success(`Asset status updated successfully.`, { id: tId })
                fetchAssets()
                setSelected(null)
            } else {
                throw new Error()
            }
        } catch {
            toast.error("Failed to update status on server", { id: tId })
        } finally {
            setActioning(false)
        }
    }

    if (loading) return (
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
            <RefreshCw className="h-10 w-10 animate-spin text-rose-500" />
            <p className="text-muted-foreground font-medium text-sm">Loading asset registry...</p>
        </div>
    )

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Regulator</span>
                    <h1 className="text-3xl font-black mt-2">HP Asset Registry</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">Audit all hire purchase asset distributions, repayment compliance, and operator risk profiles.</p>
                </div>
                <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold gap-2">
                    <Download className="h-3.5 w-3.5" /> Export Registry
                </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total Assets', val: stats.total.toString(), icon: Truck, color: 'rose' },
                    { label: 'Active', val: stats.active.toString(), icon: CheckCircle2, color: 'emerald' },
                    { label: 'Defaulted', val: stats.defaulted.toString(), icon: AlertCircle, color: 'rose' },
                    { label: 'Completed', val: stats.completed.toString(), icon: ShieldAlert, color: 'blue' },
                    { label: 'Book Value', val: `₦${(stats.totalBookValue / 1000000).toFixed(1)}M`, icon: CircleDollarSign, color: 'amber' },
                    { label: 'Repaid', val: `₦${(stats.totalRepaid / 1000000).toFixed(1)}M`, icon: BarChart3, color: 'emerald' },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-3 shadow-sm">
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                        <p className="text-xl font-black mt-1">{s.val}</p>
                    </div>
                ))}
            </div>

            {/* 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left: Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search asset, operator, coopâ€¦"
                                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none" />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            {(['all', 'active', 'defaulted', 'pending', 'completed', 'suspended'] as const).map(s => (
                                <button key={s} onClick={() => setFilter(s)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black capitalize transition-all ${filter === s ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-900 text-muted-foreground hover:text-foreground'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    {['Asset', 'Cooperative / Operator', 'Progress', 'Status'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
                                {filtered.map(asset => {
                                    const pct = Math.round((asset.amountPaid / asset.totalValue) * 100)
                                    return (
                                        <tr key={asset.id}
                                            onClick={() => setSelected(selected?.id === asset.id ? null : asset)}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer ${selected?.id === asset.id ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-rose-500/10 rounded-lg">
                                                        <Truck className="h-3.5 w-3.5 text-rose-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black">{asset.assetName}</p>
                                                        <p className="text-[9px] text-muted-foreground font-mono">{asset.regNumber}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-bold">{asset.cooperative}</p>
                                                <p className="text-[10px] text-muted-foreground font-semibold">{asset.operator}</p>
                                            </td>
                                            <td className="px-4 py-3 min-w-[120px]">
                                                <div className="flex justify-between text-[9px] font-bold mb-1">
                                                    <span>{fmt(asset.amountPaid)}</span>
                                                    <span className="text-muted-foreground">{pct}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${asset.status === 'defaulted' ? 'bg-rose-500' : asset.status === 'completed' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${pct}%` }} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${STATUS_CFG[asset.status].cls}`}>
                                                    {STATUS_CFG[asset.status].label}
                                                </span>
                                                {asset.missedPayments > 0 && (
                                                    <p className="text-[9px] text-rose-500 font-bold mt-0.5">{asset.missedPayments} missed</p>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Detail Panel */}
                <SidePanelWrapper
                    isOpen={Boolean(selected)}
                    onClose={() => setSelected(null)}
                    title="Asset Detail"
                    emptyState={
                        <div className="empty-state-card bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 text-center space-y-3 shadow-sm">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit mx-auto">
                                <Truck className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            </div>
                            <p className="text-sm font-black text-muted-foreground">Select an asset</p>
                            <p className="text-[11px] text-muted-foreground/70">Click any asset row to see full operator & contract details</p>
                        </div>
                    }
                    className="w-full"
                >
                    {selected && (
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 shadow-sm space-y-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Asset Detail</span>
                                    <h3 className="text-sm font-black mt-0.5 leading-snug">{selected.assetName}</h3>
                                    <p className="text-[10px] text-muted-foreground font-mono">{selected.regNumber}</p>
                                </div>
                                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Progress */}
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span>Repayment Progress</span>
                                    <span className="text-emerald-600">{Math.round((selected.amountPaid / selected.totalValue) * 100)}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${(selected.amountPaid / selected.totalValue) * 100}%` }}
                                        className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                                    <span>{fmt(selected.amountPaid)} paid</span>
                                    <span>{fmt(selected.totalValue - selected.amountPaid)} left</span>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-2.5 text-xs font-semibold border-y border-slate-100 dark:border-slate-800 py-4">
                                {[
                                    { label: 'Cooperative', val: selected.cooperative },
                                    { label: 'Operator', val: selected.operator },
                                    { label: 'Phone', val: selected.operatorPhone },
                                    { label: 'Asset Type', val: selected.assetType },
                                    { label: 'Location', val: selected.location },
                                    { label: 'Weekly Due', val: fmt(selected.weeklyDue) },
                                    { label: 'Start Date', val: selected.startDate },
                                    { label: 'Est. Completion', val: selected.expectedCompletion },
                                    { label: 'Last Payment', val: selected.lastPayment },
                                    { label: 'Missed Payments', val: `${selected.missedPayments} weeks` },
                                ].map(({ label, val }) => (
                                    <div key={label} className="flex justify-between">
                                        <span className="text-muted-foreground">{label}</span>
                                        <span className={`font-bold text-right ${label === 'Missed Payments' && selected.missedPayments > 0 ? 'text-rose-500' : ''}`}>{val}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="space-y-2">
                                {selected.status === 'active' && (
                                    <>
                                        <Button onClick={() => handleAction('flag', selected)} disabled={actioning} variant="outline"
                                            className="w-full h-9 rounded-xl text-xs font-bold border-rose-500/20 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                                            <AlertCircle className="h-3.5 w-3.5 mr-2" /> Flag as Defaulted
                                        </Button>
                                        <Button onClick={() => handleAction('suspend', selected)} disabled={actioning} variant="outline"
                                            className="w-full h-9 rounded-xl text-xs font-bold">
                                            <Settings className="h-3.5 w-3.5 mr-2" /> Suspend Contract
                                        </Button>
                                    </>
                                )}
                                {selected.status === 'suspended' && (
                                    <Button onClick={() => handleAction('unsuspend', selected)} disabled={actioning}
                                        className="w-full h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs border-0">
                                        <RefreshCw className="h-3.5 w-3.5 mr-2" /> Reinstate Contract
                                    </Button>
                                )}
                                {selected.status === 'defaulted' && (
                                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl">
                                        <p className="text-[10px] text-rose-700 dark:text-rose-400 font-bold">This contract is in default. Refer to cooperative collections department for recovery proceedings.</p>
                                    </div>
                                )}
                                {selected.status === 'completed' && (
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Asset fully paid off. Operator owns this asset outright.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </SidePanelWrapper>
            </div>
        </div>
    )
}


