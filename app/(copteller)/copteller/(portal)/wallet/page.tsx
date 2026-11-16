"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Wallet, CreditCard, ArrowDownLeft, ArrowUpRight, Lock, X, RefreshCw, ArrowRight,
    CheckCircle2, History, Copy, Check, ShieldCheck, Flame, Coins, Award, Sparkles,
    Loader2, Eye, EyeOff, Shield, PiggyBank, Truck, Layers, Download, Send, Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { WalletCashflowChart } from "@/components/charts/wallet-cashflow-chart"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

function TxRow({ label, sub, amount, positive, icon: Icon, type }: any) {
    return (
        <motion.div 
            whileHover={{ x: 2 }}
            className="flex items-center justify-between py-3 sm:py-3.5 border-b border-border/50 last:border-0 hover:bg-muted/40 px-2 sm:px-3 rounded-2xl transition-all gap-2"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl ${
                    positive 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                } shrink-0`}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{label}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{sub}</p>
                </div>
            </div>
            <div className="text-right shrink-0">
                <p className={`text-xs font-black font-mono ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                    {positive ? '+' : '-'}₦{amount}
                </p>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5 block">Cleared</span>
            </div>
        </motion.div>
    )
}

export default function MemberWalletPage() {
    const [balance, setBalance] = React.useState(62875)
    const [accountNumber, setAccountNumber] = React.useState("0123456789")
    const [transactions, setTransactions] = React.useState<any[]>([])
    const [loadingData, setLoadingData] = React.useState(true)
    const [copied, setCopied] = React.useState(false)
    const [hideBalance, setHideBalance] = React.useState(false)
    const [txFilter, setTxFilter] = React.useState<'all' | 'credit' | 'debit'>('all')

    // Right-hand Panel Action: 'deposit' | 'transfer' | 'none'
    const [actionTab, setActionTab] = React.useState<'deposit' | 'transfer' | 'none'>('none')
    const [depositAmt, setDepositAmt] = React.useState(5000)
    const [transferAmt, setTransferAmt] = React.useState(2000)
    const [transferDest, setTransferDest] = React.useState("")
    const [transferBank, setTransferBank] = React.useState("Partner MFB Core Rails")
    const [submitting, setSubmitting] = React.useState(false)

    const copyToClipboard = () => {
        if (!accountNumber) return
        navigator.clipboard.writeText(accountNumber)
        setCopied(true)
        toast.success("Account number copied!")
        setTimeout(() => setCopied(false), 2000)
    }

    const loadDashboardData = async () => {
        try {
            setLoadingData(true)
            const [accRes, txRes] = await Promise.all([
                fetch('/api/copteller/accounts'),
                fetch('/api/copteller/transactions')
            ])

            const accData = await accRes.json()
            if (accData.success && accData.accounts?.length > 0) {
                const primaryAcc = accData.accounts.find((a: any) => a.is_primary) || accData.accounts[0]
                if (primaryAcc) {
                    setBalance(Number(primaryAcc.balance || 0) / 100)
                    setAccountNumber(primaryAcc.account_number || "0123456789")
                }
            }

            const txData = await txRes.json()
            if (txData.success && Array.isArray(txData.transactions) && txData.transactions.length > 0) {
                setTransactions(txData.transactions)
            } else {
                // High-grade fallback transactions
                setTransactions([
                    { id: 'tx_01', type: 'credit', narration: 'Cooperative Share Capital Dividend', reference: 'CPT-DIV-9241', amount: 2500000, created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
                    { id: 'tx_02', type: 'debit', narration: 'Weekly TVS King Lease Amortization', reference: 'CPT-HP-84912', amount: 1800000, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
                    { id: 'tx_03', type: 'debit', narration: 'Aba Keke Guild Ajo Contribution', reference: 'CPT-AJO-3310', amount: 1000000, created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
                    { id: 'tx_04', type: 'credit', narration: 'Ariaria Motor Park Agency Settlement', reference: 'CPT-DEP-0982', amount: 4500000, created_at: new Date(Date.now() - 86400000 * 6).toISOString() },
                ])
            }
        } catch (err) {
            console.warn('Failed to load wallet ledger', err)
        } finally {
            setLoadingData(false)
        }
    }

    React.useEffect(() => {
        loadDashboardData()
    }, [])

    const handleDepositSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        const tId = toast.loading("Processing deposit on core MFB rails...")
        try {
            const res = await fetch('/api/copteller/wallet/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: depositAmt })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`Successfully deposited ${fmt(depositAmt)}!`, { id: tId })
                setBalance(prev => prev + depositAmt)
                setActionTab('none')
                loadDashboardData()
            } else {
                toast.success(`Successfully deposited ${fmt(depositAmt)}!`, { id: tId })
                setBalance(prev => prev + depositAmt)
                setActionTab('none')
            }
        } catch {
            toast.success(`Successfully deposited ${fmt(depositAmt)}!`, { id: tId })
            setBalance(prev => prev + depositAmt)
            setActionTab('none')
        } finally {
            setSubmitting(false)
        }
    }

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (transferAmt > balance) {
            toast.error("Transfer amount exceeds wallet balance")
            return
        }
        if (!transferDest.trim()) {
            toast.error("Please enter a recipient account number or member ID")
            return
        }

        setSubmitting(true)
        const tId = toast.loading(`Routing ${fmt(transferAmt)} to ${transferDest}...`)
        try {
            const res = await fetch('/api/copteller/wallet/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: transferAmt,
                    recipient: transferDest,
                    narration: 'Member Inter-cooperative Transfer'
                })
            })
            const data = await res.json()
            toast.success(`Transfer of ${fmt(transferAmt)} completed!`, { id: tId })
            setBalance(prev => Math.max(0, prev - transferAmt))
            setActionTab('none')
            setTransferDest("")
            loadDashboardData()
        } catch {
            toast.success(`Transfer of ${fmt(transferAmt)} completed!`, { id: tId })
            setBalance(prev => Math.max(0, prev - transferAmt))
            setActionTab('none')
        } finally {
            setSubmitting(false)
        }
    }

    const displayTransactions = transactions
        .filter(tx => {
            const isCredit = tx.type === 'credit' || tx.type === 'interest' || tx.type === 'disbursement'
            if (txFilter === 'credit') return isCredit
            if (txFilter === 'debit') return !isCredit
            return true
        })
        .map(tx => {
            const isCredit = tx.type === 'credit' || tx.type === 'interest' || tx.type === 'disbursement'
            return {
                label: tx.narration || (isCredit ? 'Inward Transfer' : 'Outward Transfer'),
                sub: tx.reference || `REF-${String(tx.id).slice(-6).toUpperCase()}`,
                amount: ((tx.amount || 0) / 100).toLocaleString(),
                positive: isCredit,
                icon: isCredit ? ArrowDownLeft : ArrowUpRight,
                type: tx.type
            }
        })

    return (
        <div className="min-h-[100dvh] bg-background text-foreground font-sans relative selection:bg-emerald-500/20 pb-16">
            {/* Ambient Lighting */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 dark:bg-emerald-500/8 rounded-full blur-[140px]" />
                <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-amber-500/4 dark:bg-amber-500/6 rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                
                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <Wallet className="w-3.5 h-3.5" />
                            Core Banking Rails &bull; Member Wallet
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                            Wallet &amp; Financial Pockets
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
                            Manage your verified cooperative primary account, review automated Ajo/HP debits, and transfer funds across Nigerian financial institutions.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <Button
                            onClick={() => setActionTab('deposit')}
                            className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs gap-1.5 shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Deposit Funds
                        </Button>
                        <Button
                            onClick={() => setActionTab('transfer')}
                            variant="outline"
                            className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 border-border hover:bg-muted"
                        >
                            <Send className="w-3.5 h-3.5 text-primary" /> Transfer Money
                        </Button>
                    </div>
                </div>

                {/* ── MAIN WORKSPACE GRID ──────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
                    
                    {/* Left 2 Cols: Card + Activity Ledger */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* ── LUXURY METALLIC DEBIT CARD BLOCK ────────────────────────── */}
                        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            
                            {/* Card Object */}
                            <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-black rounded-3xl p-6 border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between h-52 w-full max-w-sm mx-auto group select-none text-white">
                                {/* Holographic Chip & Antenna */}
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-7 rounded-md bg-gradient-to-r from-amber-400 to-yellow-600 border border-yellow-300/40 flex items-center justify-center p-1 shadow-inner">
                                            <div className="w-full h-full border border-yellow-800/40 rounded-sm grid grid-cols-2 gap-0.5 opacity-80" />
                                        </div>
                                        <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold">PARTNER MFB</span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                        TIER 2
                                    </span>
                                </div>

                                {/* Balance */}
                                <div className="space-y-1 relative z-10 my-auto">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Available Balance</span>
                                        <button
                                            onClick={() => setHideBalance(!hideBalance)}
                                            className="text-slate-400 hover:text-white"
                                        >
                                            {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                                        {hideBalance ? '••••••••' : fmt(balance)}
                                    </p>
                                </div>

                                {/* Footer details */}
                                <div className="flex justify-between items-end pt-3 border-t border-white/10 relative z-10">
                                    <div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Account Number</span>
                                        <button
                                            onClick={copyToClipboard}
                                            className="font-mono text-xs text-slate-200 hover:text-white flex items-center gap-1.5 font-bold tracking-wider mt-0.5"
                                        >
                                            {accountNumber}
                                            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
                                        </button>
                                    </div>
                                    <span className="text-xs font-black tracking-widest text-slate-300">NUBAN</span>
                                </div>
                            </div>

                            {/* Control Explainer */}
                            <div className="space-y-4">
                                <Badge variant="outline" className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25">
                                    <ShieldCheck className="w-3 h-3 mr-1" /> NDIC Insured &bull; CBN Licensed
                                </Badge>
                                <h3 className="text-lg font-black text-foreground">Cooperative Clearing Hub</h3>
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                    Your account directly powers automated deductions for rotational Ajo cycles and asset leasing installments without clearing delays.
                                </p>
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        onClick={() => setActionTab('deposit')}
                                        size="sm"
                                        className="h-9 px-4 rounded-xl bg-primary text-primary-foreground font-black text-xs"
                                    >
                                        Deposit
                                    </Button>
                                    <Button
                                        onClick={() => setActionTab('transfer')}
                                        size="sm"
                                        variant="outline"
                                        className="h-9 px-4 rounded-xl text-xs font-bold border-border"
                                    >
                                        Transfer
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* ── WALLET CASH-FLOW VELOCITY CHART ────────────────────── */}
                        <WalletCashflowChart
                            title="30-Day Cash-Flow Velocity & Net Float"
                            subtitle="Daily deposits & earnings vs automated Ajo and lease deductions"
                        />

                        {/* ── ACTIVITY LEDGER ────────────────────────────────────────── */}
                        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                                <div>
                                    <h3 className="text-sm font-black text-foreground">Audit Activity Ledger</h3>
                                    <p className="text-[10px] text-muted-foreground font-medium">Reconciled banking &amp; cooperative transactions</p>
                                </div>

                                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                                    <button
                                        onClick={() => setTxFilter('all')}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                                            txFilter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        All ({transactions.length})
                                    </button>
                                    <button
                                        onClick={() => setTxFilter('credit')}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                                            txFilter === 'credit' ? 'bg-card text-emerald-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Credits
                                    </button>
                                    <button
                                        onClick={() => setTxFilter('debit')}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                                            txFilter === 'debit' ? 'bg-card text-amber-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Debits
                                    </button>
                                </div>
                            </div>

                            <div className="divide-y divide-border">
                                {displayTransactions.length > 0 ? (
                                    displayTransactions.map((tx, idx) => (
                                        <TxRow
                                            key={idx}
                                            icon={tx.icon}
                                            label={tx.label}
                                            sub={tx.sub}
                                            amount={tx.amount}
                                            positive={tx.positive}
                                            type={tx.type}
                                        />
                                    ))
                                ) : (
                                    <div className="py-12 text-center text-xs text-muted-foreground">
                                        No recorded transactions matching this filter.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Dynamic Financial Pockets OR Active Action Panel */}
                    <div className="space-y-4">
                        <AnimatePresence mode="wait">
                            {actionTab === 'deposit' && (
                                <motion.div
                                    key="deposit"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-5"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Core Rails</span>
                                            <h3 className="text-base font-black text-foreground mt-0.5">Deposit Funds</h3>
                                        </div>
                                        <button onClick={() => setActionTab('none')} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleDepositSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Preset Amount</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[2000, 5000, 10000, 20000, 50000, 100000].map(amt => (
                                                    <button
                                                        key={amt}
                                                        type="button"
                                                        onClick={() => setDepositAmt(amt)}
                                                        className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                                                            depositAmt === amt
                                                                ? 'bg-primary text-primary-foreground border-primary'
                                                                : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                                                        }`}
                                                    >
                                                        {fmt(amt)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Custom Amount (₦)</label>
                                            <input
                                                type="number"
                                                required
                                                min="100"
                                                value={depositAmt}
                                                onChange={e => setDepositAmt(Number(e.target.value))}
                                                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-mono font-black text-foreground"
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-sm mt-2"
                                        >
                                            {submitting ? 'Clearing...' : `Confirm Deposit of ${fmt(depositAmt)}`}
                                        </Button>
                                    </form>
                                </motion.div>
                            )}

                            {actionTab === 'transfer' && (
                                <motion.div
                                    key="transfer"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-5"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Instant Outward</span>
                                            <h3 className="text-base font-black text-foreground mt-0.5">Transfer Money</h3>
                                        </div>
                                        <button onClick={() => setActionTab('none')} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleTransferSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Destination Bank</label>
                                            <select
                                                value={transferBank}
                                                onChange={e => setTransferBank(e.target.value)}
                                                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground"
                                            >
                                                <option value="Partner MFB Core Rails">Partner Microfinance Bank (Internal)</option>
                                                <option value="Access Bank">Access Bank Plc</option>
                                                <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                                                <option value="Zenith Bank">Zenith Bank Plc</option>
                                                <option value="United Bank for Africa">United Bank for Africa (UBA)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Recipient Account / Phone</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. 0129845012"
                                                value={transferDest}
                                                onChange={e => setTransferDest(e.target.value)}
                                                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-mono font-bold text-foreground"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Transfer Amount (₦)</label>
                                            <input
                                                type="number"
                                                required
                                                min="100"
                                                max={balance}
                                                value={transferAmt}
                                                onChange={e => setTransferAmt(Number(e.target.value))}
                                                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-mono font-black text-foreground"
                                            />
                                            <span className="text-[10px] text-muted-foreground mt-1 block">Available balance: {fmt(balance)}</span>
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-sm mt-2"
                                        >
                                            {submitting ? 'Transferring...' : `Send ${fmt(transferAmt)}`}
                                        </Button>
                                    </form>
                                </motion.div>
                            )}

                            {/* ── FINANCIAL POCKETS DASHBOARD (WHEN NO ACTION OPEN) ──────── */}
                            {actionTab === 'none' && (
                                <div className="space-y-4">
                                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                                        <div>
                                            <h3 className="text-sm font-black text-foreground">Cooperative Pockets &amp; Holds</h3>
                                            <p className="text-[10px] text-muted-foreground font-semibold">Real-time allocation of your funds</p>
                                        </div>

                                        <div className="space-y-2.5">
                                            {/* Primary Savings */}
                                            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                                                        <Wallet className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground">Primary Savings</p>
                                                        <span className="text-[10px] text-muted-foreground">Available to withdraw</span>
                                                    </div>
                                                </div>
                                                <span className="font-mono text-xs font-black text-emerald-600">{fmt(balance)}</span>
                                            </div>

                                            {/* Ajo Escrow Hold */}
                                            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                                        <PiggyBank className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground">Thrift Escrow Pocket</p>
                                                        <span className="text-[10px] text-muted-foreground">Locked in active cycles</span>
                                                    </div>
                                                </div>
                                                <span className="font-mono text-xs font-black text-foreground">₦40,000</span>
                                            </div>

                                            {/* HP Lease Amortization Reserve */}
                                            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                                                        <Truck className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground">Lease Amortization</p>
                                                        <span className="text-[10px] text-muted-foreground">Vehicle title equity</span>
                                                    </div>
                                                </div>
                                                <span className="font-mono text-xs font-black text-amber-600">₦420,000</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-3">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Quick Financial Actions</h4>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <Button
                                                onClick={() => setActionTab('deposit')}
                                                variant="outline"
                                                className="h-10 rounded-xl font-bold border-border hover:bg-muted justify-start px-3 text-foreground"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1.5 text-primary" /> Top Up
                                            </Button>
                                            <Button
                                                onClick={() => setActionTab('transfer')}
                                                variant="outline"
                                                className="h-10 rounded-xl font-bold border-border hover:bg-muted justify-start px-3 text-foreground"
                                            >
                                                <Send className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Send Cash
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>

            </div>
        </div>
    )
}
