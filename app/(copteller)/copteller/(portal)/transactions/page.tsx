"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    History, Search, Download, ArrowUpRight, ArrowDownLeft,
    Filter, X, Calendar, Wallet, PiggyBank, Truck, Award,
    Receipt, TrendingUp, ChevronDown, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

type TxType = 'credit' | 'debit'
type TxCategory = 'transfer' | 'ajo' | 'hp' | 'grant' | 'dues' | 'scheme' | 'charge' | 'interest'

interface Transaction {
    id: string
    narration: string
    amount: number
    type: TxType
    category: TxCategory
    reference: string
    date: string
    time: string
    balance: number
    channel: string
}

const CAT_ICON: Record<TxCategory, React.ElementType> = {
    transfer: Wallet,
    ajo: PiggyBank,
    hp: Truck,
    grant: Award,
    dues: Receipt,
    scheme: TrendingUp,
    charge: Receipt,
    interest: TrendingUp,
}

const CAT_LABEL: Record<TxCategory, string> = {
    transfer: 'Transfer', ajo: 'Ajo/Thrift', hp: 'Hire Purchase',
    grant: 'Grant', dues: 'Dues', scheme: 'Scheme',
    charge: 'Charge', interest: 'Interest'
}

const TRANSACTIONS: Transaction[] = [
    { id: 'tx_001', narration: 'Wallet Top-up via Paystack', amount: 50000, type: 'credit', category: 'transfer', reference: 'PSK-2026-080792', date: 'Aug 5, 2026', time: '2:15 PM', balance: 84500, channel: 'Paystack' },
    { id: 'tx_002', narration: 'Monthly Ajo Contribution – Market Traders', amount: 5000, type: 'debit', category: 'ajo', reference: 'AJO-2026-080502', date: 'Aug 5, 2026', time: '8:00 AM', balance: 34500, channel: 'Copteller Auto' },
    { id: 'tx_003', narration: 'HP Weekly Due – TVS King ABA-404', amount: 18000, type: 'debit', category: 'hp', reference: 'HP-2026-080101', date: 'Aug 1, 2026', time: '8:00 AM', balance: 39500, channel: 'Copteller Auto' },
    { id: 'tx_004', narration: 'Wallet Top-up via Bank Transfer', amount: 20000, type: 'credit', category: 'transfer', reference: 'BNK-2026-073188', date: 'Jul 31, 2026', time: '3:45 PM', balance: 57500, channel: 'NIBSS NIP' },
    { id: 'tx_005', narration: 'Ajo Maturity Payout – Cycle 11', amount: 160000, type: 'credit', category: 'ajo', reference: 'AJO-PAY-2026-073001', date: 'Jul 30, 2026', time: '10:00 AM', balance: 37500, channel: 'Core Banking' },
    { id: 'tx_006', narration: 'Monthly Cooperative Dues – July 2026', amount: 5000, type: 'debit', category: 'dues', reference: 'DUE-2026-073008', date: 'Jul 8, 2026', time: '9:00 AM', balance: 8500, channel: 'Copteller Auto' },
    { id: 'tx_007', narration: 'Emergency Welfare Levy Q2 2026', amount: 2500, type: 'debit', category: 'dues', reference: 'LEV-2026-071801', date: 'Jul 18, 2026', time: '9:00 AM', balance: 13500, channel: 'Copteller Auto' },
    { id: 'tx_008', narration: 'Scheme A Quarterly Yield', amount: 12000, type: 'credit', category: 'scheme', reference: 'SCH-YLD-2026-070101', date: 'Jul 1, 2026', time: '8:00 AM', balance: 16000, channel: 'Core Banking' },
    { id: 'tx_009', narration: 'Monthly Ajo Contribution – Market Traders', amount: 5000, type: 'debit', category: 'ajo', reference: 'AJO-2026-070501', date: 'Jul 5, 2026', time: '8:00 AM', balance: 4000, channel: 'Copteller Auto' },
    { id: 'tx_010', narration: 'HP Weekly Due – TVS King ABA-404', amount: 18000, type: 'debit', category: 'hp', reference: 'HP-2026-070401', date: 'Jul 4, 2026', time: '8:00 AM', balance: 9000, channel: 'Copteller Auto' },
]

export default function MemberTransactionsPage() {
    const router = useRouter()
    const [transactions, setTransactions] = React.useState<Transaction[]>([])
    const [balance, setBalance] = React.useState(0)
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState('')
    const [typeFilter, setTypeFilter] = React.useState<string>('all')
    const [catFilter, setCatFilter] = React.useState<string>('all')
    const [selected, setSelected] = React.useState<Transaction | null>(null)

    React.useEffect(() => {
        async function loadData() {
            try {
                let primaryAcc: any = null
                const accRes = await fetch('/api/copteller/accounts')
                const accData = await accRes.json()
                if (accData.success && accData.accounts?.length > 0) {
                    primaryAcc = accData.accounts.find((a: any) => a.is_primary) || accData.accounts[0]
                    if (primaryAcc) {
                        setBalance((primaryAcc.balance || 0) / 100)
                    }
                }

                // Fetch transactions
                const txRes = await fetch('/api/copteller/transactions')
                const txData = await txRes.json()
                if (txData.success && txData.transactions) {
                    let currentRunningBalance = (primaryAcc ? primaryAcc.balance || 0 : 0) / 100
                    const mapped: Transaction[] = txData.transactions.map((t: any) => {
                        const lowNarr = (t.narration || '').toLowerCase()
                        let category: TxCategory = 'transfer'
                        if (lowNarr.includes('hp') || lowNarr.includes('lease') || t.type === 'repayment') category = 'hp'
                        else if (lowNarr.includes('ajo') || lowNarr.includes('thrift') || lowNarr.includes('rotation')) category = 'ajo'
                        else if (lowNarr.includes('dues') || lowNarr.includes('membership')) category = 'dues'
                        else if (lowNarr.includes('grant') || lowNarr.includes('award')) category = 'grant'
                        else if (lowNarr.includes('scheme') || lowNarr.includes('yield')) category = 'scheme'

                        const dateObj = new Date(t.createdAt || t.created_at)
                        const amount = (t.amount || 0) / 100
                        const type = (t.type === 'credit' || t.type === 'interest' || t.type === 'disbursement') ? 'credit' : 'debit'

                        const balanceAfter = currentRunningBalance
                        if (type === 'credit') {
                            currentRunningBalance -= amount
                        } else {
                            currentRunningBalance += amount
                        }

                        return {
                            id: String(t.id),
                            narration: t.narration || (type === 'credit' ? 'Inward Transfer' : 'Outward Transfer'),
                            amount,
                            type,
                            category,
                            reference: t.reference || `REF-${String(t.id).slice(-6).toUpperCase()}`,
                            date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            time: dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                            balance: balanceAfter,
                            channel: t.channel || 'System'
                        }
                    })
                    setTransactions(mapped)
                }
            } catch (err) {
                console.warn('Failed to load transaction history:', err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    const totalCredit = transactions.filter(t => t.type === 'credit').reduce((a, t) => a + t.amount, 0)
    const totalDebit = transactions.filter(t => t.type === 'debit').reduce((a, t) => a + t.amount, 0)

    const filtered = transactions.filter(t => {
        const q = search.toLowerCase()
        const matchQ = t.narration.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q)
        const matchType = typeFilter === 'all' || t.type === typeFilter
        const matchCat = catFilter === 'all' || t.category === catFilter
        return matchQ && matchType && matchCat
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">My Account</span>
                    <h1 className="text-3xl font-black mt-2">Transaction History</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">Full ledger of all wallet transactions, contributions, dues, and payouts.</p>
                </div>
                <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold gap-2">
                    <Download className="h-3.5 w-3.5" /> Download Statement
                </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Inflows', val: fmt(totalCredit), icon: ArrowDownLeft, cls: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Total Outflows', val: fmt(totalDebit), icon: ArrowUpRight, cls: 'text-rose-500' },
                    { label: 'Current Balance', val: fmt(balance), icon: Wallet, cls: 'text-foreground' },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                            <s.icon className={`h-4 w-4 ${s.cls}`} />
                        </div>
                        <p className={`text-xl font-black ${s.cls}`}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Main layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search narration, referenceâ€¦"
                                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none" />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            {(['all', 'credit', 'debit'] as const).map(f => (
                                <button key={f} onClick={() => setTypeFilter(f)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black capitalize transition-all ${typeFilter === f ? (f === 'credit' ? 'bg-emerald-500 text-black' : f === 'debit' ? 'bg-rose-500 text-white' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900') : 'bg-slate-100 dark:bg-slate-900 text-muted-foreground hover:text-foreground'}`}>
                                    {f === 'all' ? 'All Types' : f === 'credit' ? 'â†“ Credits' : 'â†‘ Debits'}
                                </button>
                            ))}
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 self-center" />
                            {(['all', 'transfer', 'ajo', 'hp', 'dues', 'grant', 'scheme'] as const).map(f => (
                                <button key={f} onClick={() => setCatFilter(f)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black capitalize transition-all ${catFilter === f ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-900 text-muted-foreground hover:text-foreground'}`}>
                                    {f === 'all' ? 'All' : CAT_LABEL[f]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-900/50">
                        {filtered.map((tx, i) => {
                            const Icon = CAT_ICON[tx.category]
                            return (
                                <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                                    onClick={() => setSelected(selected?.id === tx.id ? null : tx)}
                                    className={`px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors ${selected?.id === tx.id ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
                                    <div className={`p-2 rounded-xl ${tx.type === 'credit' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                        {tx.type === 'credit'
                                            ? <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            : <ArrowUpRight className="h-4 w-4 text-rose-500" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-foreground truncate">{tx.narration}</p>
                                        <p className="text-[9px] text-muted-foreground font-mono font-semibold mt-0.5">{tx.reference} · {tx.date} {tx.time}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-sm font-black ${tx.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                            {tx.type === 'credit' ? '+' : 'âˆ’'}{fmt(tx.amount)}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground font-semibold">Bal: {fmt(tx.balance)}</p>
                                    </div>
                                </motion.div>
                            )
                        })}
                        {filtered.length === 0 && (
                            <div className="py-12 text-center text-[11px] text-muted-foreground">No transactions match your filters.</div>
                        )}
                    </div>
                </div>

                {/* Right: Detail */}
                <SidePanelWrapper
                    isOpen={Boolean(selected)}
                    onClose={() => setSelected(null)}
                    title="Transaction Detail"
                    className="lg:col-span-1"
                    emptyState={
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 text-center space-y-3 shadow-sm empty-state-card">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit mx-auto">
                                <History className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            </div>
                            <p className="text-sm font-black text-muted-foreground">Select a transaction</p>
                            <p className="text-[11px] text-muted-foreground/70">Click any transaction row to see full details</p>
                        </div>
                    }
                >
                    {selected && (
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 active-sidepanel-card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Transaction Detail</span>
                                    <h3 className="text-sm font-black mt-0.5 leading-snug">{selected.narration}</h3>
                                </div>
                                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className={`flex items-center justify-center p-6 rounded-2xl ${selected.type === 'credit' ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-rose-50 dark:bg-rose-950/20'}`}>
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Amount</p>
                                    <p className={`text-3xl font-black ${selected.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                        {selected.type === 'credit' ? '+' : '−'}{fmt(selected.amount)}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 text-xs font-semibold">
                                {[
                                    { label: 'Reference', val: selected.reference },
                                    { label: 'Date & Time', val: `${selected.date} ${selected.time}` },
                                    { label: 'Category', val: CAT_LABEL[selected.category] },
                                    { label: 'Channel', val: selected.channel },
                                    { label: 'Type', val: selected.type === 'credit' ? 'Inflow (Credit)' : 'Outflow (Debit)' },
                                    { label: 'Balance After', val: fmt(selected.balance) },
                                ].map(({ label, val }) => (
                                    <div key={label} className="flex justify-between border-b border-slate-50 dark:border-slate-900 pb-2.5">
                                        <span className="text-muted-foreground">{label}</span>
                                        <span className="font-bold text-right">{val}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    onClick={() => router.push(`/copteller/transactions/${selected.id}`)} 
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs h-9.5 rounded-xl border-0"
                                >
                                    Open Fullscreen Details
                                </Button>
                                <Button 
                                    onClick={() => toast.success("Receipt downloaded!")} 
                                    variant="outline" 
                                    className="h-9.5 rounded-xl text-xs font-bold px-3 border-slate-200 dark:border-slate-800"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </SidePanelWrapper>
            </div>
        </div>
    )
}


