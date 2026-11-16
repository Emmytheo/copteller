"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    History, Search, Download, ArrowUpRight, ArrowDownLeft,
    X, Wallet, PiggyBank, Truck, Award, Receipt, TrendingUp,
    RefreshCw, Filter, BarChart3, Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

type TxType = 'credit' | 'debit'
type TxCategory = 'transfer' | 'ajo' | 'hp' | 'grant' | 'dues' | 'scheme' | 'charge' | 'fee' | 'reversal'

interface AdminTx {
    id: string
    member: string
    memberNo: string
    narration: string
    amount: number
    type: TxType
    category: TxCategory
    reference: string
    date: string
    time: string
    cooperative: string
    channel: string
}

const CAT_ICON: Record<TxCategory, React.ElementType> = {
    transfer: Wallet, ajo: PiggyBank, hp: Truck, grant: Award,
    dues: Receipt, scheme: TrendingUp, charge: Receipt, fee: Receipt, reversal: RefreshCw
}

const CAT_LABEL: Record<TxCategory, string> = {
    transfer: 'Transfer', ajo: 'Ajo/Thrift', hp: 'Hire Purchase',
    grant: 'Grant', dues: 'Dues', scheme: 'Scheme',
    charge: 'Charge', fee: 'Fee', reversal: 'Reversal'
}

const TRANSACTIONS: AdminTx[] = [
    { id: 'atx_001', member: 'Kalu Onyekachi', memberNo: 'MBR-2024-001', narration: 'Wallet Top-up via Paystack', amount: 50000, type: 'credit', category: 'transfer', reference: 'PSK-2026-080792', date: 'Aug 5, 2026', time: '2:15 PM', cooperative: 'Aba Motor Union', channel: 'Paystack' },
    { id: 'atx_002', member: 'Kalu Onyekachi', memberNo: 'MBR-2024-001', narration: 'Monthly Ajo Contribution – Market Traders', amount: 5000, type: 'debit', category: 'ajo', reference: 'AJO-2026-080502', date: 'Aug 5, 2026', time: '8:00 AM', cooperative: 'Aba Motor Union', channel: 'Auto' },
    { id: 'atx_003', member: 'Amara Okafor', memberNo: 'MBR-2024-002', narration: 'Monthly Cooperative Dues – August 2026', amount: 5000, type: 'debit', category: 'dues', reference: 'DUE-2026-080301', date: 'Aug 3, 2026', time: '9:00 AM', cooperative: 'Aba Motor Union', channel: 'Auto' },
    { id: 'atx_004', member: 'Ngozi Eze', memberNo: 'MBR-2024-003', narration: 'HP Weekly Due – Bajaj RE4S ABA-088', amount: 15000, type: 'debit', category: 'hp', reference: 'HP-2026-080101', date: 'Aug 1, 2026', time: '8:00 AM', cooperative: 'Ariaria Traders Union', channel: 'Auto' },
    { id: 'atx_005', member: 'Chisom Nwosu', memberNo: 'MBR-2024-005', narration: 'Wallet Top-up via Bank Transfer', amount: 30000, type: 'credit', category: 'transfer', reference: 'BNK-2026-080101', date: 'Aug 1, 2026', time: '11:30 AM', cooperative: 'Garment Workers Union', channel: 'NIBSS NIP' },
    { id: 'atx_006', member: 'Kalu Onyekachi', memberNo: 'MBR-2024-001', narration: 'Ajo Maturity Payout – Cycle 11', amount: 160000, type: 'credit', category: 'ajo', reference: 'AJO-PAY-2026-073001', date: 'Jul 30, 2026', time: '10:00 AM', cooperative: 'Aba Motor Union', channel: 'Core Banking' },
    { id: 'atx_007', member: 'Chisom Nwosu', memberNo: 'MBR-2024-005', narration: 'Monthly Cooperative Dues – August 2026', amount: 5000, type: 'debit', category: 'dues', reference: 'DUE-2026-080201', date: 'Aug 2, 2026', time: '9:00 AM', cooperative: 'Garment Workers Union', channel: 'Auto' },
    { id: 'atx_008', member: 'Amara Okafor', memberNo: 'MBR-2024-002', narration: 'Scheme A Quarterly Yield', amount: 12000, type: 'credit', category: 'scheme', reference: 'SCH-YLD-2026-070101', date: 'Jul 1, 2026', time: '8:00 AM', cooperative: 'Aba Motor Union', channel: 'Core Banking' },
    { id: 'atx_009', member: 'Kalu Onyekachi', memberNo: 'MBR-2024-001', narration: 'HP Weekly Due – TVS King ABA-404', amount: 18000, type: 'debit', category: 'hp', reference: 'HP-2026-070401', date: 'Jul 4, 2026', time: '8:00 AM', cooperative: 'Aba Motor Union', channel: 'Auto' },
    { id: 'atx_010', member: 'Ngozi Eze', memberNo: 'MBR-2024-003', narration: 'Emergency Welfare Levy Q2 2026', amount: 2500, type: 'debit', category: 'dues', reference: 'LEV-2026-071801', date: 'Jul 18, 2026', time: '9:00 AM', cooperative: 'Ariaria Traders Union', channel: 'Auto' },
]

export default function AdminTransactionsPage() {
    const [search, setSearch] = React.useState('')
    const [typeFilter, setTypeFilter] = React.useState<string>('all')
    const [catFilter, setCatFilter] = React.useState<string>('all')
    const [selected, setSelected] = React.useState<AdminTx | null>(null)

    const totalCredit = TRANSACTIONS.filter(t => t.type === 'credit').reduce((a, t) => a + t.amount, 0)
    const totalDebit = TRANSACTIONS.filter(t => t.type === 'debit').reduce((a, t) => a + t.amount, 0)

    const filtered = TRANSACTIONS.filter(t => {
        const q = search.toLowerCase()
        const matchQ = t.narration.toLowerCase().includes(q) || t.member.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q)
        const matchType = typeFilter === 'all' || t.type === typeFilter
        const matchCat = catFilter === 'all' || t.category === catFilter
        return matchQ && matchType && matchCat
    })

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Ledger</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Transaction History</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">All member wallet transactions across the cooperative — contributions, payouts, dues, HP dues.</p>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto h-9 rounded-xl text-xs font-bold gap-2">
                    <Download className="h-3.5 w-3.5" /> Export Ledger
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                    { label: 'Total Inflows', val: fmt(totalCredit), cls: 'text-emerald-600 dark:text-emerald-400', icon: ArrowDownLeft },
                    { label: 'Total Outflows', val: fmt(totalDebit), cls: 'text-rose-500', icon: ArrowUpRight },
                    { label: 'Net Flow', val: fmt(totalCredit - totalDebit), cls: 'text-foreground', icon: BarChart3 },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                            <s.icon className={`h-4 w-4 ${s.cls}`} />
                        </div>
                        <p className={`text-lg sm:text-xl font-black ${s.cls}`}>{s.val}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member, narration, reference..."
                                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none" />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            {(['all', 'credit', 'debit'] as const).map(f => (
                                <button key={f} onClick={() => setTypeFilter(f)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black capitalize transition-all ${typeFilter === f ? (f === 'credit' ? 'bg-emerald-500 text-black' : f === 'debit' ? 'bg-rose-500 text-white' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900') : 'bg-slate-100 dark:bg-slate-900 text-muted-foreground hover:text-foreground'}`}>
                                    {f === 'all' ? 'All' : f === 'credit' ? '↓ Credits' : '↑ Debits'}
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
                                <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                    onClick={() => setSelected(selected?.id === tx.id ? null : tx)}
                                    className={`px-4 sm:px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors ${selected?.id === tx.id ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}>
                                    <div className={`p-2 rounded-xl shrink-0 ${tx.type === 'credit' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                        {tx.type === 'credit'
                                            ? <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            : <ArrowUpRight className="h-4 w-4 text-rose-500" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-black text-foreground truncate">{tx.narration}</p>
                                        </div>
                                        <p className="text-[9px] text-muted-foreground font-semibold mt-0.5 truncate">{tx.member} · {tx.date} {tx.time}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-xs sm:text-sm font-black ${tx.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                            {tx.type === 'credit' ? '+' : '-'}{fmt(tx.amount)}
                                        </p>
                                        <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-muted-foreground">{CAT_LABEL[tx.category]}</span>
                                    </div>
                                </motion.div>
                            )
                        })}
                        {filtered.length === 0 && (
                            <div className="py-12 text-center text-[11px] text-muted-foreground">No transactions match your filters.</div>
                        )}
                    </div>
                </div>

                {/* Right detail */}
                <SidePanelWrapper
                    isOpen={Boolean(selected)}
                    onClose={() => setSelected(null)}
                    title="Transaction Record"
                    className="lg:col-span-1"
                    emptyState={
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 text-center space-y-3 shadow-sm empty-state-card">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit mx-auto">
                                <History className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            </div>
                            <p className="text-sm font-black text-muted-foreground">Select a transaction</p>
                            <p className="text-[11px] text-muted-foreground/70">Click any row to view full details</p>
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
                                        {selected.type === 'credit' ? '+' : '-'}{fmt(selected.amount)}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3 text-xs font-semibold">
                                {[
                                    { label: 'Member', val: selected.member },
                                    { label: 'Member No', val: selected.memberNo },
                                    { label: 'Cooperative', val: selected.cooperative },
                                    { label: 'Reference', val: selected.reference },
                                    { label: 'Date & Time', val: `${selected.date} ${selected.time}` },
                                    { label: 'Category', val: CAT_LABEL[selected.category] },
                                    { label: 'Channel', val: selected.channel },
                                ].map(({ label, val }) => (
                                    <div key={label} className="flex justify-between border-b border-slate-50 dark:border-slate-900 pb-2.5">
                                        <span className="text-muted-foreground">{label}</span>
                                        <span className="font-bold text-right max-w-[55%]">{val}</span>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" className="w-full h-9 rounded-xl text-xs font-bold gap-2">
                                <Download className="h-3.5 w-3.5" /> Download Record
                            </Button>
                        </div>
                    )}
                </SidePanelWrapper>
            </div>
        </div>
    )
}


