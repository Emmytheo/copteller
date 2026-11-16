"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Send, CheckCircle2, Clock, AlertCircle, Search, Filter,
    Layers, ArrowRight, X, Download, BarChart3, Users,
    CircleDollarSign, Calendar, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

interface Payout {
    id: string
    recipient: string
    accountNumber: string
    pool: string
    poolType: 'ajo' | 'scheme' | 'yield' | 'hp-rebate'
    amount: number
    scheduledDate: string
    status: 'upcoming' | 'pending' | 'processing' | 'cleared' | 'failed'
    narrative: string
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
    upcoming: { label: 'Upcoming', class: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700' },
    pending: { label: 'Pending', class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    processing: { label: 'Processing', class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    cleared: { label: 'Cleared', class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    failed: { label: 'Failed', class: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
}

const INITIAL_PAYOUTS: Payout[] = [
    { id: 'pay_001', recipient: 'Kalu Onyekachi', accountNumber: '0092819209', pool: 'Market Traders Ajo', poolType: 'ajo', amount: 160000, scheduledDate: 'Aug 12, 2026', status: 'upcoming', narrative: 'Cycle 12 maturity payout' },
    { id: 'pay_002', recipient: 'Amara Okafor', accountNumber: '0088129021', pool: 'Market Traders Ajo', poolType: 'ajo', amount: 160000, scheduledDate: 'Aug 19, 2026', status: 'upcoming', narrative: 'Cycle 13 maturity payout' },
    { id: 'pay_003', recipient: 'Chinedu Eze', accountNumber: '0091002912', pool: 'Keke Owners Esusu', poolType: 'ajo', amount: 320000, scheduledDate: 'Jul 28, 2026', status: 'pending', narrative: 'Cycle 8 maturity payout' },
    { id: 'pay_004', recipient: 'Ngozi Eze', accountNumber: '0084712930', pool: 'HP Rebate Pool Q2', poolType: 'hp-rebate', amount: 45000, scheduledDate: 'Jul 30, 2026', status: 'cleared', narrative: 'HP interest rebate Q2 2026' },
    { id: 'pay_005', recipient: 'Emeka Obi', accountNumber: '0077291821', pool: 'Cooperative Scheme A', poolType: 'scheme', amount: 85000, scheduledDate: 'Jul 25, 2026', status: 'cleared', narrative: 'Scheme A quarterly yield' },
    { id: 'pay_006', recipient: 'Chisom Nwosu', accountNumber: '0093827412', pool: 'Market Traders Ajo', poolType: 'ajo', amount: 160000, scheduledDate: 'Aug 26, 2026', status: 'upcoming', narrative: 'Cycle 14 maturity payout' },
]

const POOL_TYPE_BADGE: Record<string, string> = {
    ajo: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    scheme: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    'hp-rebate': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    yield: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
}

export default function AdminPayoutsPage() {
    const [payouts, setPayouts] = React.useState<Payout[]>([])
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState('')
    const [filter, setFilter] = React.useState<string>('all')
    const [selectedPayout, setSelectedPayout] = React.useState<Payout | null>(null)
    const [processing, setProcessing] = React.useState<string | null>(null)

    const fetchPayouts = React.useCallback(async () => {
        try {
            const res = await fetch('/api/copteller/admin/payouts')
            const data = await res.json()
            if (data.success && Array.isArray(data.payouts)) {
                setPayouts(data.payouts.map((p: any) => ({
                    id: p.id,
                    recipient: p.recipient,
                    accountNo: p.accountNumber,
                    bank: 'Partner MFB',
                    pool: p.cycle,
                    amount: p.amount,
                    maturityDate: p.dueDate,
                    status: p.status === 'cleared' ? 'cleared' : (p.status === 'processing' ? 'processing' : 'pending'),
                    clearedDate: p.clearedDate,
                    notes: `Cycle slot maturity disbursement for ${p.recipient}`
                })))
            }
        } catch (err) {
            console.error('Failed to load payouts:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchPayouts()
    }, [fetchPayouts])

    const pending = payouts.filter(p => p.status === 'pending')
    const cleared = payouts.filter(p => p.status === 'cleared')
    const totalPending = pending.reduce((a, p) => a + p.amount, 0)
    const totalCleared = cleared.reduce((a, p) => a + p.amount, 0)

    const filtered = payouts.filter(p => {
        const matchSearch = p.recipient.toLowerCase().includes(search.toLowerCase()) ||
            p.pool.toLowerCase().includes(search.toLowerCase()) ||
            p.id.toLowerCase().includes(search.toLowerCase())
        const matchFilter = filter === 'all' || p.status === filter
        return matchSearch && matchFilter
    })

    const handleDisburse = async (id: string) => {
        const payout = payouts.find(p => p.id === id)
        if (!payout) return

        setProcessing(id)
        const tId = toast.loading(`Executing live disbursement to ${payout.recipient}…`)
        setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'processing' } : p))

        try {
            const res = await fetch('/api/copteller/admin/payouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payoutId: id })
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to disburse payout')
            }

            setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'cleared', clearedDate: new Date().toISOString().slice(0, 10) } : p))
            setSelectedPayout(prev => prev?.id === id ? { ...prev, status: 'cleared', clearedDate: new Date().toISOString().slice(0, 10) } : prev)
            toast.success(data.message || `${fmt(payout.amount)} transferred to ${payout.recipient}`, { id: tId })
            fetchPayouts()
        } catch (err: any) {
            toast.error(err.message || 'Disbursement failed', { id: tId })
            setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'pending' } : p))
        } finally {
            setProcessing(null)
        }
    }

    const handleBatchDisburse = async () => {
        const pendingPayouts = payouts.filter(p => p.status === 'pending')
        if (pendingPayouts.length === 0) return toast.error('No pending payouts to process')

        const tId = toast.loading(`Executing batch cycle clearing across ${pendingPayouts.length} members…`)
        for (const p of pendingPayouts) {
            setPayouts(prev => prev.map(x => x.id === p.id ? { ...x, status: 'processing' } : x))
        }

        try {
            const res = await fetch('/api/copteller/admin/payouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch: true })
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Batch disbursement failed')
            }
            setPayouts(prev => prev.map(p => p.status === 'processing' ? { ...p, status: 'cleared', clearedDate: new Date().toISOString().slice(0, 10) } : p))
            toast.success(data.message || 'Payouts cleared successfully and reconciled on ledger', { id: tId })
            fetchPayouts()
        } catch (err: any) {
            toast.error(err.message || 'Batch disbursement failed', { id: tId })
            fetchPayouts()
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Disbursements</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Partner Payouts Schedule</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">Review upcoming cycle maturities and execute pending member payouts.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold gap-2 w-full sm:w-auto">
                        <Download className="h-3.5 w-3.5" /> Export
                    </Button>
                    {pending.length > 0 && (
                        <Button onClick={handleBatchDisburse} className="h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs border-0 gap-2 w-full sm:w-auto">
                            <Send className="h-3.5 w-3.5" /> Batch Disburse ({pending.length})
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: 'Pending Payouts', val: fmt(totalPending), sub: `${pending.length} transactions`, icon: Clock, color: 'amber' },
                    { label: 'Cleared This Month', val: fmt(totalCleared), sub: `${cleared.length} completed`, icon: CheckCircle2, color: 'emerald' },
                    { label: 'Total Scheduled', val: fmt(payouts.reduce((a, p) => a + p.amount, 0)), sub: `${payouts.length} payouts`, icon: Calendar, color: 'blue' },
                    { label: 'Active Pools', val: '3', sub: 'Ajo, scheme, HP rebate', icon: Layers, color: 'purple' },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-4 shadow-sm min-w-0">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest truncate">{s.label}</p>
                            <div className={`p-1.5 rounded-lg bg-${s.color}-500/10 shrink-0`}>
                                <s.icon className={`h-3.5 w-3.5 text-${s.color}-500`} />
                            </div>
                        </div>
                        <p className="text-xl font-black text-foreground truncate">{s.val}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 truncate">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Main 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left: Payouts Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                    {/* Table controls */}
                    <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recipient, pool..."
                                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none" />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            {(['all', 'pending', 'upcoming', 'cleared'] as const).map(s => (
                                <button key={s} onClick={() => setFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black capitalize transition-all ${filter === s ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-900 text-muted-foreground hover:text-foreground'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[550px] text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    {['Recipient', 'Pool', 'Amount', 'Scheduled', 'Status'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
                                {filtered.map(pay => (
                                    <tr key={pay.id}
                                        onClick={() => setSelectedPayout(selectedPayout?.id === pay.id ? null : pay)}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer ${selectedPayout?.id === pay.id ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center text-[9px] font-black text-black shrink-0">
                                                    {pay.recipient.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <p className="font-black text-foreground">{pay.recipient}</p>
                                                    <p className="text-[9px] text-muted-foreground font-mono">{pay.accountNumber}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${POOL_TYPE_BADGE[pay.poolType]}`}>{pay.pool}</span>
                                        </td>
                                        <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400">{fmt(pay.amount)}</td>
                                        <td className="px-4 py-3 font-semibold text-muted-foreground">{pay.scheduledDate}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${STATUS_CONFIG[pay.status].class}`}>
                                                {STATUS_CONFIG[pay.status].label}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={5} className="px-4 py-10 text-center text-[11px] text-muted-foreground">No payouts match your filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Detail / Action Panel */}
                <SidePanelWrapper
                    isOpen={Boolean(selectedPayout)}
                    onClose={() => setSelectedPayout(null)}
                    title="Payout Detail"
                    emptyState={
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 text-center space-y-3 shadow-sm">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit mx-auto">
                                <Layers className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            </div>
                            <p className="text-sm font-black text-muted-foreground">Select a payout</p>
                            <p className="text-[11px] text-muted-foreground/70">Click any payout row to see details and disbursement controls</p>
                        </div>
                    }
                    className="w-full"
                >
                    {selectedPayout && (
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 shadow-sm space-y-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Payout Detail</span>
                                    <h3 className="text-base font-black mt-0.5 leading-snug">{selectedPayout.recipient}</h3>
                                </div>
                                <button onClick={() => setSelectedPayout(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs font-semibold">
                                {[
                                    { label: 'Transaction ID', val: selectedPayout.id },
                                    { label: 'Account Number', val: selectedPayout.accountNumber },
                                    { label: 'Pool Source', val: selectedPayout.pool },
                                    { label: 'Pool Type', val: selectedPayout.poolType.toUpperCase() },
                                    { label: 'Narrative', val: selectedPayout.narrative },
                                    { label: 'Schedule Date', val: selectedPayout.scheduledDate },
                                ].map(({ label, val }) => (
                                    <div key={label} className="flex justify-between border-b border-slate-50 dark:border-slate-900 pb-2.5">
                                        <span className="text-muted-foreground">{label}</span>
                                        <span className="font-bold text-right max-w-[55%]">{val}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 text-center">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Disbursement Amount</p>
                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{fmt(selectedPayout.amount)}</p>
                            </div>

                            {selectedPayout.status === 'pending' && (
                                <Button
                                    onClick={() => handleDisburse(selectedPayout.id)}
                                    disabled={processing === selectedPayout.id}
                                    className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs border-0 gap-2"
                                >
                                    {processing === selectedPayout.id
                                        ? <><RefreshCw className="h-4 w-4 animate-spin" /> Processing...</>
                                        : <><Send className="h-4 w-4" /> Execute Disbursement</>}
                                </Button>
                            )}
                            {selectedPayout.status === 'cleared' && (
                                <div className="flex items-center justify-center gap-2 py-3 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="text-sm font-black">Transfer Cleared</span>
                                </div>
                            )}
                            {selectedPayout.status === 'upcoming' && (
                                <p className="text-center text-[11px] text-muted-foreground font-semibold py-2">Scheduled — not yet due for disbursement</p>
                            )}
                        </div>
                    )}
                </SidePanelWrapper>
            </div>
        </div>
    )
}


