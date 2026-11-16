"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Layers, ArrowDownToLine, X, Landmark, Search, Filter,
    CheckCircle2, Clock, HelpCircle, Download, Calendar,
    TrendingUp, ShieldCheck, Wallet, ArrowRight, RefreshCw, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"
import { LiquidityFlowChart } from "@/components/charts/liquidity-flow-chart"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

interface PayoutRecord {
    id: string
    date: string
    scheme: string
    schemeType: 'lease' | 'loan'
    principalInvested: number
    yieldRate: number
    grossAmt: number
    withholdingTax: number
    netAmt: number
    status: 'Cleared' | 'Pending' | 'Processing'
    ref: string
}

const SAMPLE_PAYOUTS: PayoutRecord[] = [
    { id: 'pay_001', date: "Jul 28, 2026", scheme: "Keke Fleet Expansion Pool C", schemeType: 'lease', principalInvested: 1000000, yieldRate: 14.8, grossAmt: 148000, withholdingTax: 14800, netAmt: 133200, status: "Cleared", ref: "YLD-KK-8902" },
    { id: 'pay_002', date: "Jul 15, 2026", scheme: "Ariaria Tailoring Tools Fund B", schemeType: 'loan', principalInvested: 500000, yieldRate: 12.0, grossAmt: 60000, withholdingTax: 6000, netAmt: 54000, status: "Cleared", ref: "YLD-TL-4210" },
    { id: 'pay_003', date: "Aug 15, 2026", scheme: "Aba Leather Guild Machinery Pool A", schemeType: 'lease', principalInvested: 2000000, yieldRate: 15.0, grossAmt: 300000, withholdingTax: 30000, netAmt: 270000, status: "Pending", ref: "YLD-LM-9901" },
    { id: 'pay_004', date: "Jun 30, 2026", scheme: "Keke Fleet Expansion Pool B", schemeType: 'lease', principalInvested: 1000000, yieldRate: 14.8, grossAmt: 148000, withholdingTax: 14800, netAmt: 133200, status: "Cleared", ref: "YLD-KK-8105" },
    { id: 'pay_005', date: "May 15, 2026", scheme: "Ariaria Tailoring Tools Fund A", schemeType: 'loan', principalInvested: 500000, yieldRate: 11.5, grossAmt: 57500, withholdingTax: 5750, netAmt: 51750, status: "Cleared", ref: "YLD-TL-3101" },
]

export default function InvestorPayoutsPage() {
    const [payouts, setPayouts] = React.useState<PayoutRecord[]>(SAMPLE_PAYOUTS)
    const [search, setSearch] = React.useState('')
    const [filter, setFilter] = React.useState<'all' | 'Cleared' | 'Pending'>('all')
    const [selectedPayout, setSelectedPayout] = React.useState<PayoutRecord | null>(null)
    const [panelMode, setPanelMode] = React.useState<'overview' | 'withdraw'>('overview')

    // Withdrawal Form State
    const [withdrawAmt, setWithdrawAmt] = React.useState('')
    const [submitting, setSubmitting] = React.useState(false)

    const totalEarned = payouts.filter(p => p.status === 'Cleared').reduce((sum, p) => sum + p.netAmt, 0)
    const totalPending = payouts.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.netAmt, 0)
    const availableBalance = totalEarned // For simplification, earned yields go to available balance

    const filtered = payouts.filter(p => {
        const matchesSearch = p.scheme.toLowerCase().includes(search.toLowerCase()) || p.ref.toLowerCase().includes(search.toLowerCase())
        const matchesFilter = filter === 'all' || p.status === filter
        return matchesSearch && matchesFilter
    })

    const handleWithdrawSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const amt = Number(withdrawAmt)
        if (!amt || amt < 5000) {
            toast.error("Minimum withdrawal is ₦5,000")
            return
        }
        if (amt > availableBalance) {
            toast.error("Withdrawal amount exceeds available cleared yields.")
            return
        }

        setSubmitting(true)
        const tId = toast.loading("Processing withdrawal to linked bank account...")
        try {
            const res = await fetch('/api/copteller/investments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amt, action: 'withdraw' })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Withdrawal failed')
            toast.success(`Withdrawal of ₦${amt.toLocaleString()} processed successfully. Ledger debit and audit log recorded.`, { id: tId })
            setWithdrawAmt('')
            setPanelMode('overview')
        } catch (err: any) {
            toast.error(err.message || 'Error processing withdrawal', { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-orange-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Treasury</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Yield Payout Ledgers</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold max-w-2xl">Track underwriting payouts, view gross-to-net breakdowns, and withdraw cleared yields.</p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-initial h-9 rounded-xl text-xs font-bold gap-2">
                        <Download className="h-3.5 w-3.5" /> Export Payouts
                    </Button>
                    {panelMode !== 'withdraw' ? (
                        <Button onClick={() => setPanelMode('withdraw')} className="flex-1 sm:flex-initial h-9 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-black text-xs border-0 gap-2 shadow-md">
                            <ArrowDownToLine className="h-3.5 w-3.5" /> Withdraw Yields
                        </Button>
                    ) : (
                        <Button onClick={() => setPanelMode('overview')} variant="outline" className="flex-1 sm:flex-initial h-9 rounded-xl text-xs font-bold">
                            View Overview
                        </Button>
                    )}
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                    { label: 'Cleared Yields (Available)', val: fmt(availableBalance), color: 'emerald' },
                    { label: 'Pending Yields (Locked)', val: fmt(totalPending), color: 'amber' },
                    { label: 'Total Underwritten Book', val: fmt(4500000), color: 'orange' },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-4 shadow-sm">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                        <p className={`text-xl font-black mt-1 text-${s.color}-600 dark:text-${s.color}-400 truncate`}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* ── YIELD REALIZATION & ESCROW RECOVERY TIMELINE ────────────── */}
            <LiquidityFlowChart
                title="Yield Realization & Liquidity Recovery Timeline"
                subtitle="Historical underwriting returns disbursed into investor settlement account vs pending principal"
                defaultTimeframe="90D"
                accentColor="#10b981"
            />

            {/* Main 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Column: Payout Ledger Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search scheme or reference..."
                                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {(['all', 'Cleared', 'Pending'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black capitalize transition-all ${filter === s ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-900 text-muted-foreground hover:text-foreground'}`}
                                >
                                    {s === 'all' ? 'All Status' : s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    {['Payout Date', 'Source Scheme', 'Net Return', 'Status'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
                                {filtered.map(row => (
                                    <tr
                                        key={row.id}
                                        onClick={() => {
                                             setSelectedPayout(selectedPayout?.id === row.id ? null : row)
                                            setPanelMode('overview')
                                        }}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer ${selectedPayout?.id === row.id ? 'bg-orange-500/10' : ''}`}
                                    >
                                        <td className="px-4 py-3 font-semibold text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <Layers className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                                                <span className="whitespace-nowrap">{row.date}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-black text-foreground">{row.scheme}</p>
                                            <p className="text-[9px] text-muted-foreground font-mono">{row.ref}</p>
                                        </td>
                                        <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(row.netAmt)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${row.status === 'Cleared' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Actions / Details panel */}
                <SidePanelWrapper
                    isOpen={panelMode === 'withdraw' || Boolean(selectedPayout)}
                    onClose={() => {
                        setPanelMode('overview')
                        setSelectedPayout(null)
                    }}
                    title={panelMode === 'withdraw' ? "Withdraw Yields" : "Payout Specs"}
                    emptyState={
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-sm">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit mx-auto">
                                <Layers className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            </div>
                            <p className="text-sm font-black text-muted-foreground font-black">Select a Payout</p>
                            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                                Click any yield payout row to review its gross-to-net tax breakdown, or click "Withdraw Yields" to transfer cleared funds.
                            </p>
                        </div>
                    }
                    className="w-full"
                >
                    {panelMode === 'withdraw' && (
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-black">Withdraw Yields</h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Transfer cleared returns to your registered bank account.</p>
                                </div>
                                <button onClick={() => setPanelMode('overview')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                        <Landmark className="h-4 w-4 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold">First Bank of Nigeria</p>
                                        <p className="text-[10px] text-slate-500 font-mono">**** 9081</p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black text-emerald-500 uppercase">Linked</span>
                            </div>

                            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Amount (₦)</label>
                                        <button
                                            type="button"
                                            onClick={() => setWithdrawAmt(String(availableBalance))}
                                            className="text-[9px] font-black text-orange-500 hover:underline font-mono"
                                        >
                                            Max: {fmt(availableBalance)}
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        required
                                        min={5000}
                                        max={availableBalance}
                                        value={withdrawAmt}
                                        onChange={e => setWithdrawAmt(e.target.value)}
                                        placeholder="e.g. 50,000"
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-sm font-black focus:outline-none focus:border-orange-500"
                                    />
                                </div>

                                <div className="flex flex-col-reverse sm:flex-row gap-2">
                                    <Button type="button" onClick={() => setPanelMode('overview')} variant="outline" className="w-full sm:flex-1 rounded-xl h-10 text-xs font-bold">Cancel</Button>
                                    <Button type="submit" disabled={submitting || availableBalance < 5000} className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-600 text-black font-black text-xs h-10 rounded-xl shadow-lg border-0">
                                        {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Confirm'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {panelMode === 'overview' && selectedPayout && (
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Payout Specs</span>
                                    <h3 className="text-base font-black mt-1 leading-snug">{selectedPayout.scheme}</h3>
                                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{selectedPayout.ref}</p>
                                </div>
                                <button onClick={() => setSelectedPayout(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-2.5 text-xs font-semibold border-y border-slate-100 dark:border-slate-800 py-4">
                                {[
                                    { label: 'Date Cleared', val: selectedPayout.date },
                                    { label: 'Principal Underwritten', val: fmt(selectedPayout.principalInvested) },
                                    { label: 'Yield ROI', val: `${selectedPayout.yieldRate}%` },
                                    { label: 'Gross Yield', val: fmt(selectedPayout.grossAmt) },
                                    { label: 'Withholding Tax (10%)', val: fmt(selectedPayout.withholdingTax) },
                                    { label: 'Net Payout Received', val: fmt(selectedPayout.netAmt) },
                                    { label: 'Status', val: selectedPayout.status.toUpperCase() },
                                ].map(({ label, val }) => (
                                    <div key={label} className="flex justify-between">
                                        <span className="text-muted-foreground">{label}</span>
                                        <span className={`font-bold text-right ${label === 'Net Payout Received' ? 'text-emerald-600' : ''}`}>{val}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl flex gap-2">
                                <Info className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-orange-700 dark:text-orange-400 font-semibold leading-relaxed">
                                    Yield is calculated automatically upon monthly contract clears of the underlying HP tricycle/equipment leases.
                                </p>
                            </div>
                        </div>
                    )}
                </SidePanelWrapper>
            </div>
        </div>
    )
}


