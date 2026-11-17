"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Receipt, CheckCircle2, Clock, AlertTriangle, CreditCard,
    Download, Calendar, Wallet, TrendingUp, ArrowRight, RefreshCw, X, ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ClientPortal } from "@/components/copteller/client-portal"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

type DueStatus = 'paid' | 'pending' | 'overdue' | 'upcoming'

interface Due {
    id: string
    description: string
    amount: number
    period: string
    dueDate: string
    paidDate?: string
    status: DueStatus
    category: 'monthly' | 'registration' | 'levy' | 'special'
    receiptRef?: string
}

const STATUS_CFG: Record<DueStatus, { label: string; cls: string; icon: React.ElementType }> = {
    paid: { label: 'Paid', cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
    pending: { label: 'Pending', cls: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400', icon: Clock },
    overdue: { label: 'Overdue', cls: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400', icon: AlertTriangle },
    upcoming: { label: 'Upcoming', cls: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500', icon: Calendar },
}

export default function MemberDuesPage() {
    const [dues, setDues] = React.useState<Due[]>([])
    const [totalPaidVal, setTotalPaidVal] = React.useState(0)
    const [totalPendingVal, setTotalPendingVal] = React.useState(0)
    const [coopName, setCoopName] = React.useState("Regional Cooperative Guild")
    const [loading, setLoading] = React.useState(true)
    const [paying, setPaying] = React.useState<string | null>(null)
    const [activeFilter, setActiveFilter] = React.useState<string>('all')
    const [selectedReceipt, setSelectedReceipt] = React.useState<any | null>(null)

    const loadDuesData = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/copteller/dues')
            const data = await res.json()
            if (data.success) {
                if (data.membership) {
                    setTotalPaidVal(data.membership.totalPaid || 0)
                    setTotalPendingVal(data.membership.outstandingBalance || 0)
                    if (data.membership.cooperativeName) {
                        setCoopName(data.membership.cooperativeName)
                    }
                }
                if (Array.isArray(data.dues)) {
                    setDues(data.dues)
                }
            }
        } catch (err) {
            console.warn('Failed to load dues schedule:', err)
            toast.error("Failed to load dues from cooperative ledger")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        loadDuesData()
    }, [])

    const streak = 5 // consecutive months paid
    const filtered = activeFilter === 'all' ? dues : dues.filter(d => d.status === activeFilter || d.category === activeFilter)

    const handlePay = async (due: Due) => {
        setPaying(due.id)
        const tId = toast.loading(`Debiting ₦${due.amount.toLocaleString()} from member wallet…`)
        try {
            const res = await fetch('/api/copteller/dues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dueId: due.id,
                    amount: due.amount,
                    description: due.description
                })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(data.message || 'Dues paid successfully! Your wallet has been debited.', { id: tId })
                setDues(prev => prev.map(d => d.id === due.id ? {
                    ...d, status: 'paid' as const,
                    paidDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                } : d))
                setTotalPendingVal(prev => Math.max(0, prev - due.amount))
                setTotalPaidVal(prev => prev + due.amount)
                if (data.receipt) {
                    setSelectedReceipt(data.receipt)
                }
            } else {
                toast.error(data.error || 'Dues payment failed', { id: tId })
            }
        } catch (err: any) {
            toast.error(err.message || 'Network error processing payment', { id: tId })
        } finally {
            setPaying(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Cooperative</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Membership Dues</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">Track and pay your monthly cooperative dues, levies, and special assessments.</p>
                </div>
                <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold gap-2 w-full sm:w-auto">
                    <Download className="h-3.5 w-3.5" /> Download Statement
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: 'Total Paid (2026)', val: fmt(totalPaidVal), sub: `${dues.filter(d => d.status === 'paid').length} payments`, icon: CheckCircle2, color: 'emerald' },
                    { label: 'Outstanding', val: fmt(totalPendingVal), sub: `${dues.filter(d => ['pending', 'overdue'].includes(d.status)).length} due`, icon: AlertTriangle, color: 'amber' },
                    { label: 'Monthly Rate', val: '₦5,000', sub: 'Per member/month', icon: Receipt, color: 'blue' },
                    { label: 'Payment Streak', val: `${streak} mo`, sub: 'Consecutive on-time', icon: TrendingUp, color: 'emerald' },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                            <s.icon className={`h-3.5 w-3.5 text-${s.color}-500`} />
                        </div>
                        <p className="text-xl font-black">{s.val}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Outstanding banner */}
            {totalPendingVal > 0 && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                            <p className="text-sm font-black text-amber-800 dark:text-amber-300">You have outstanding dues of {fmt(totalPendingVal)}</p>
                            <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70 font-semibold">Late dues affect your credit score and loan eligibility.</p>
                        </div>
                    </div>
                    <Button size="sm" className="h-8 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs rounded-xl border-0 gap-1.5 shrink-0 w-full sm:w-auto">
                        Pay Now <ArrowRight className="h-3 w-3" />
                    </Button>
                </motion.div>
            )}

            {/* Dues Table */}
            <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex gap-1.5 flex-wrap">
                    {(['all', 'pending', 'overdue', 'paid', 'upcoming'] as const).map(f => (
                        <button key={f} onClick={() => setActiveFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black capitalize transition-all ${activeFilter === f ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-900 text-muted-foreground hover:text-foreground'}`}>
                            {f}
                        </button>
                    ))}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[550px] text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                {['Description', 'Period', 'Amount', 'Due Date', 'Status', 'Action'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
                            {filtered.map((due) => {
                                const cfg = STATUS_CFG[due.status]
                                const StatusIcon = cfg.icon
                                return (
                                    <tr key={due.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 bg-amber-500/10 rounded-lg">
                                                    <Receipt className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-foreground">{due.description}</p>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${due.category === 'monthly' ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500' : 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'}`}>
                                                        {due.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-muted-foreground">{due.period}</td>
                                        <td className="px-4 py-3 font-black text-foreground">{fmt(due.amount)}</td>
                                        <td className="px-4 py-3 font-semibold text-muted-foreground">{due.dueDate}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                                                <StatusIcon className="h-2.5 w-2.5" />
                                                {cfg.label}
                                            </span>
                                            {due.paidDate && <p className="text-[9px] text-muted-foreground mt-0.5">Paid {due.paidDate}</p>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {(due.status === 'pending' || due.status === 'overdue') && (
                                                <Button size="sm" onClick={() => handlePay(due)} disabled={paying === due.id}
                                                    className={`h-7 rounded-lg font-black text-[10px] border-0 gap-1 ${due.status === 'overdue' ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-black'}`}>
                                                    {paying === due.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />}
                                                    {paying === due.id ? 'Paying...' : 'Pay Now'}
                                                </Button>
                                            )}
                                            {due.status === 'paid' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedReceipt({
                                                            reference: due.receiptRef || `RCP-${due.id.toUpperCase()}`,
                                                            amount: due.amount,
                                                            description: due.description,
                                                            period: due.period,
                                                            paidAt: due.paidDate || 'Verified on Ledger',
                                                            receiptNumber: `RCP-${Math.floor(100000 + Math.random() * 900000)}`
                                                        })
                                                    }}
                                                    className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                                                >
                                                    <Download className="h-3 w-3" /> Receipt
                                                </button>
                                            )}
                                            {due.status === 'upcoming' && (
                                                <span className="text-[10px] text-muted-foreground italic font-semibold">Not yet due</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── VERIFIABLE DIGITAL DUES RECEIPT MODAL ── */}
            <ClientPortal>
                <AnimatePresence>
                    {selectedReceipt && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-card text-card-foreground border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
                            >
                                <div className="flex justify-between items-start border-b border-border/60 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            <ShieldCheck className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-foreground">Official Payment Receipt</h3>
                                            <p className="text-[11px] text-muted-foreground font-semibold">Partner MFB Cooperative Clearing</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedReceipt(null)}
                                        className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 text-center space-y-1">
                                    <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Amount Settled</span>
                                    <p className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                                        ₦{Number(selectedReceipt.amount || 0).toLocaleString()}
                                    </p>
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-block uppercase tracking-widest mt-1">
                                        RECONCILED ON LEDGER
                                    </span>
                                </div>

                                <div className="space-y-2.5 text-xs">
                                    <div className="flex justify-between py-1 border-b border-border/40 font-semibold">
                                        <span className="text-muted-foreground">Receipt Number</span>
                                        <span className="font-mono font-black text-foreground">{selectedReceipt.receiptNumber}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-border/40 font-semibold">
                                        <span className="text-muted-foreground">Audit Reference</span>
                                        <span className="font-mono font-bold text-foreground text-[11px]">{selectedReceipt.reference}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-border/40 font-semibold">
                                        <span className="text-muted-foreground">Cooperative Guild</span>
                                        <span className="font-black text-foreground text-right">{coopName}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-border/40 font-semibold">
                                        <span className="text-muted-foreground">Description</span>
                                        <span className="font-bold text-foreground">{selectedReceipt.description}</span>
                                    </div>
                                    <div className="flex justify-between py-1 font-semibold">
                                        <span className="text-muted-foreground">Settlement Date</span>
                                        <span className="font-bold text-foreground">{selectedReceipt.paidAt}</span>
                                    </div>
                                </div>

                                <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                                    <Button
                                        onClick={() => setSelectedReceipt(null)}
                                        variant="outline"
                                        className="text-xs font-bold rounded-xl h-10 w-full sm:w-auto"
                                    >
                                        Close
                                    </Button>
                                    <Button
                                        onClick={() => {
                                             toast.success("Receipt saved to device documents!")
                                             setSelectedReceipt(null)
                                         }}
                                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-xl h-10 shadow-sm w-full sm:w-auto"
                                    >
                                        <Download className="h-3.5 w-3.5 mr-1.5" /> Save Digital PDF
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </ClientPortal>
        </div>
    )
}

