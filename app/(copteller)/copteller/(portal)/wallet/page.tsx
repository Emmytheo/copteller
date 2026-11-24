"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Wallet, ArrowDownLeft, ArrowUpRight, X, RefreshCw,
    CheckCircle2, Copy, Check, ShieldCheck, FlaskConical,
    Loader2, Eye, EyeOff, PiggyBank, Truck, Send, Plus,
    ExternalLink, Landmark, Lock, Sparkles, Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { WalletCashflowChart } from "@/components/charts/wallet-cashflow-chart"
import {
    OlivePayWalletPanel,
    type OlivePaySubWalletState,
    type OlivePayHoldItem,
} from "@/components/copteller/olivepay-wallet-panel"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

function TxRow({ label, sub, amount, positive, icon: Icon, status }: any) {
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
                <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 block ${
                    status === 'pending' ? 'text-amber-500' : status === 'failed' ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                    {status || 'Cleared'}
                </span>
            </div>
        </motion.div>
    )
}

interface DynamicVaInfo {
    transactionId: string
    accountNumber: string
    accountName: string
    bankName: string
    amountNaira: number
    feeNaira: number
    amountPayableNaira: number
    expiresAt: string
    status: string
}

export default function MemberWalletPage() {
    const [balance, setBalance] = React.useState(0)
    const [accountNumber, setAccountNumber] = React.useState("")
    const [transactions, setTransactions] = React.useState<any[]>([])
    const [loadingData, setLoadingData] = React.useState(true)
    const [copied, setCopied] = React.useState(false)
    const [hideBalance, setHideBalance] = React.useState(false)
    const [txFilter, setTxFilter] = React.useState<'all' | 'credit' | 'debit'>('all')

    // OlivePay SubWallet & Compliance state
    const [railMode, setRailMode] = React.useState<string>('sandbox_simulator')
    const [subwallet, setSubwallet] = React.useState<OlivePaySubWalletState | null>(null)
    const [holds, setHolds] = React.useState<OlivePayHoldItem[]>([])
    const [nipBanks, setNipBanks] = React.useState<Array<{ label: string; value: string }>>([])

    // Right-hand Panel Action: 'deposit' | 'transfer' | 'none'
    const [actionTab, setActionTab] = React.useState<'deposit' | 'transfer' | 'none'>('none')

    // Deposit state (3 OlivePay rails: direct | dynamic_va | checkout)
    const [depositMethod, setDepositMethod] = React.useState<'direct' | 'dynamic_va' | 'checkout'>('dynamic_va')
    const [depositAmt, setDepositAmt] = React.useState(5000)
    const [dynamicVa, setDynamicVa] = React.useState<DynamicVaInfo | null>(null)
    const [simulatingDva, setSimulatingDva] = React.useState(false)

    // Transfer / External NIP Withdrawal state
    const [transferAmt, setTransferAmt] = React.useState(2000)
    const [transferDest, setTransferDest] = React.useState("")
    const [transferBankCode, setTransferBankCode] = React.useState("999999")
    const [transferNarration, setTransferNarration] = React.useState("Wallet Transfer")
    const [beneficiaryName, setBeneficiaryName] = React.useState<string | null>(null)
    const [beneficiaryLocal, setBeneficiaryLocal] = React.useState(false)
    const [lookupBusy, setLookupBusy] = React.useState(false)
    const [lookupError, setLookupError] = React.useState<string | null>(null)

    const [submitting, setSubmitting] = React.useState(false)

    const displayNuban = subwallet?.virtualAccountNumber || accountNumber || "Provisioning..."

    const copyToClipboard = (val?: string) => {
        const text = val || displayNuban
        if (!text || text.includes('Provision')) return
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success("Account number copied!")
        setTimeout(() => setCopied(false), 2000)
    }

    const loadDashboardData = React.useCallback(async (syncRemote = false) => {
        try {
            setLoadingData(true)
            const [accRes, txRes, swRes, bankRes] = await Promise.all([
                fetch('/api/copteller/accounts'),
                fetch('/api/copteller/transactions'),
                fetch(`/api/copteller/olivepay/subwallet${syncRemote ? '?refresh=1' : ''}`),
                fetch('/api/copteller/services/options?endpointId=banks'),
            ])

            const accData = await accRes.json().catch(() => ({}))
            if (accData.success && accData.accounts?.length > 0) {
                const primaryAcc = accData.accounts.find((a: any) => a.is_primary) || accData.accounts[0]
                if (primaryAcc) {
                    setBalance(Number(primaryAcc.balance || 0) / 100)
                    setAccountNumber(primaryAcc.account_number || "")
                }
            }

            const txData = await txRes.json().catch(() => ({}))
            if (txData.success && Array.isArray(txData.transactions)) {
                setTransactions(txData.transactions)
            }

            const swData = await swRes.json().catch(() => ({}))
            if (swData.success && swData.subwallet) {
                setSubwallet(swData.subwallet)
                setHolds(Array.isArray(swData.holds) ? swData.holds : [])
                setRailMode(swData.railMode || 'sandbox_simulator')
            }

            const bankData = await bankRes.json().catch(() => ({}))
            if (bankData.success && Array.isArray(bankData.options)) {
                setNipBanks(bankData.options)
            }
        } catch (err) {
            console.warn('Failed to load wallet ledger', err)
        } finally {
            setLoadingData(false)
        }
    }, [])

    React.useEffect(() => {
        loadDashboardData(false)
    }, [loadDashboardData])

    // Automatic NIP / Local Account Name Enquiry when 10-digit account entered
    React.useEffect(() => {
        const clean = transferDest.replace(/\D/g, '')
        if (actionTab !== 'transfer' || clean.length !== 10) {
            setBeneficiaryName(null)
            setBeneficiaryLocal(false)
            setLookupError(null)
            return
        }
        let cancelled = false
        const timer = setTimeout(async () => {
            setLookupBusy(true)
            setLookupError(null)
            try {
                const res = await fetch('/api/copteller/services/lookup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'account',
                        accountNumber: clean,
                        bankCode: transferBankCode,
                    }),
                })
                const data = await res.json()
                if (cancelled) return
                if (res.ok && data.success && data.accountName) {
                    setBeneficiaryName(data.accountName)
                    setBeneficiaryLocal(Boolean(data.isLocal))
                } else {
                    setBeneficiaryName(null)
                    setLookupError(data.error || 'Could not resolve account name')
                }
            } catch {
                if (!cancelled) setLookupError('Name enquiry network error')
            } finally {
                if (!cancelled) setLookupBusy(false)
            }
        }, 350)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [transferDest, transferBankCode, actionTab])

    const handleDepositSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        const label =
            depositMethod === 'dynamic_va'
                ? 'Generating one-time Dynamic Virtual Account...'
                : depositMethod === 'checkout'
                  ? 'Initializing OlivePay Hosted Checkout...'
                  : 'Funding SubWallet via OlivePay Settlement Rail...'
        const tId = toast.loading(label)

        try {
            const res = await fetch('/api/copteller/wallet/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method: depositMethod,
                    amount: depositAmt,
                }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                toast.error(data.error || 'Deposit initialization failed', { id: tId })
                return
            }

            if (depositMethod === 'dynamic_va' && data.virtualAccount) {
                setDynamicVa(data.virtualAccount)
                toast.success(`Dynamic VA ready! Transfer exact ${fmt(data.virtualAccount.amountPayableNaira)}.`, { id: tId })
                return
            }

            if (depositMethod === 'checkout' && data.paymentUrl) {
                toast.success('Redirecting to OlivePay Checkout...', { id: tId })
                window.location.href = data.paymentUrl
                return
            }

            toast.success(`Successfully credited ${fmt(depositAmt)} (${data.railMode || railMode})!`, { id: tId })
            setActionTab('none')
            await loadDashboardData(true)
        } catch (err: any) {
            toast.error(err.message || 'Network error while processing deposit', { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    const handleSimulateDynamicVaPayment = async () => {
        if (!dynamicVa) return
        setSimulatingDva(true)
        const tId = toast.loading("Sending signed HMAC-SHA256 payment.success webhook...")
        try {
            const res = await fetch('/api/copteller/olivepay/sandbox/simulate-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'payment.success',
                    transactionId: dynamicVa.transactionId,
                    amount: dynamicVa.amountPayableNaira,
                    subWalletId: subwallet?.id,
                }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                toast.error(data.error || 'Sandbox webhook simulation failed', { id: tId })
                return
            }
            toast.success(`Dynamic VA paid & settled! +${fmt(dynamicVa.amountNaira)} credited.`, { id: tId })
            setDynamicVa(null)
            setActionTab('none')
            await loadDashboardData(true)
        } catch (err: any) {
            toast.error(err.message || 'Simulation error', { id: tId })
        } finally {
            setSimulatingDva(false)
        }
    }

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (transferAmt > balance) {
            toast.error("Transfer amount exceeds available wallet balance")
            return
        }
        if (!transferDest.trim()) {
            toast.error("Please enter a 10-digit recipient account number")
            return
        }

        const isExternal = transferBankCode !== '999999' && !beneficiaryLocal
        setSubmitting(true)
        const tId = toast.loading(
            isExternal
                ? `Executing signed OlivePay NIP payout of ${fmt(transferAmt)}...`
                : `Executing instant zero-fee W2W transfer of ${fmt(transferAmt)}...`
        )
        try {
            const res = await fetch('/api/copteller/wallet/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: transferAmt,
                    destinationAccountNumber: transferDest.trim(),
                    destinationBankCode: isExternal ? transferBankCode : '999999',
                    beneficiaryName: beneficiaryName || undefined,
                    narration: transferNarration || 'Wallet Transfer',
                }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                toast.error(data.error || 'Transfer failed', { id: tId })
                return
            }

            if (data.isPending) {
                toast.warning(
                    `NIP Payout submitted as PENDING (code 09, Ref: ${data.reference}). Auto-reconciler will confirm settlement.`,
                    { id: tId }
                )
            } else {
                const feeNote = data.feeKobo ? ` (Fee: ${fmt(data.feeKobo / 100)})` : ' (₦0 W2W fee)'
                toast.success(`Transfer of ${fmt(transferAmt)} completed${feeNote}!`, { id: tId })
            }

            setActionTab('none')
            setTransferDest("")
            setBeneficiaryName(null)
            await loadDashboardData(true)
        } catch (err: any) {
            toast.error(err.message || 'Network error while transferring funds', { id: tId })
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
                status: tx.status || 'Cleared',
            }
        })

    const isSandbox = railMode === 'sandbox_simulator'
    const activeEscrowTotal = subwallet?.lienBalanceNaira ?? 0

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
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider shadow-sm">
                                <Wallet className="w-3.5 h-3.5" />
                                OlivePay Core Rails &bull; Member Wallet
                            </div>
                            {isSandbox && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                                    <FlaskConical className="w-3 h-3" /> Sandbox Testing Mode
                                </div>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                            Wallet &amp; Financial Pockets
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
                            Dedicated Static &amp; Dynamic Virtual Accounts, instant zero-fee cooperative W2W transfers, signed NIP bank withdrawals, and live KYC Tier &amp; Escrow Lien controls.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <Button
                            onClick={() => { setDynamicVa(null); setActionTab('deposit') }}
                            className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs gap-1.5 shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Deposit Funds
                        </Button>
                        <Button
                            onClick={() => setActionTab('transfer')}
                            variant="outline"
                            className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 border-border hover:bg-muted"
                        >
                            <Send className="w-3.5 h-3.5 text-primary" /> Transfer / Withdraw
                        </Button>
                    </div>
                </div>

                {/* ── MAIN WORKSPACE GRID ──────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">

                    {/* Left 2 Cols: Card + OlivePay Hub + Chart + Activity Ledger */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* ── LUXURY METALLIC DEBIT CARD BLOCK ────────────────────────── */}
                        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center">

                            {/* Card Object */}
                            <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-black rounded-3xl p-6 border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between h-52 w-full max-w-sm mx-auto group select-none text-white">
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-7 rounded-md bg-gradient-to-r from-amber-400 to-yellow-600 border border-yellow-300/40 flex items-center justify-center p-1 shadow-inner">
                                            <div className="w-full h-full border border-yellow-800/40 rounded-sm grid grid-cols-2 gap-0.5 opacity-80" />
                                        </div>
                                        <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">
                                            {isSandbox ? 'SANDBOX RAIL' : (subwallet?.bankName || 'OLIVEPAY')}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                        subwallet?.isTierLocked
                                            ? 'text-red-400 bg-red-500/20 border-red-500/30'
                                            : 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
                                    }`}>
                                        TIER {subwallet?.tier || 1}{subwallet?.isTierLocked ? ' LOCKED' : ''}
                                    </span>
                                </div>

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
                                    {activeEscrowTotal > 0 && (
                                        <p className="text-[10px] text-amber-400 font-mono font-bold">
                                            Escrow Lien Locked: {hideBalance ? '••••' : fmt(activeEscrowTotal)}
                                        </p>
                                    )}
                                </div>

                                <div className="flex justify-between items-end pt-3 border-t border-white/10 relative z-10">
                                    <div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Static NUBAN</span>
                                        <button
                                            onClick={() => copyToClipboard(displayNuban)}
                                            className="font-mono text-xs text-slate-200 hover:text-white flex items-center gap-1.5 font-bold tracking-wider mt-0.5"
                                        >
                                            {displayNuban}
                                            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
                                        </button>
                                    </div>
                                    <span className="text-xs font-black tracking-widest text-slate-300">NUBAN</span>
                                </div>
                            </div>

                            {/* Control Explainer */}
                            <div className="space-y-4">
                                <Badge variant="outline" className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25">
                                    <ShieldCheck className="w-3 h-3 mr-1" /> OlivePay SubWallet &bull; NIP Enabled
                                </Badge>
                                <h3 className="text-lg font-black text-foreground">Cooperative Clearing Hub</h3>
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                    Fund via your Static NUBAN, One-Time Dynamic Virtual Account, or Hosted Checkout. Withdraw to any Nigerian bank via verified NIP Name Enquiry or send ₦0 W2W transfers inside the cooperative.
                                </p>
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        onClick={() => { setDynamicVa(null); setActionTab('deposit') }}
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
                                        Withdraw / Send
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* ── OLIVEPAY SUBWALLET, KYC TIER UPGRADE & ESCROW HOLDS HUB ── */}
                        <OlivePayWalletPanel
                            subwallet={subwallet}
                            holds={holds}
                            railMode={railMode}
                            loading={loadingData}
                            onRefresh={loadDashboardData}
                        />

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
                                            status={tx.status}
                                        />
                                    ))
                                ) : (
                                    <div className="py-12 text-center text-xs text-muted-foreground">
                                        {loadingData ? 'Loading ledger transactions...' : 'No recorded transactions yet. Deposit funds to see real-time ledger entries.'}
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
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest block">
                                                {isSandbox ? 'Sandbox Settlement Rail' : 'OlivePay Collections'}
                                            </span>
                                            <h3 className="text-base font-black text-foreground mt-0.5">Deposit Funds</h3>
                                        </div>
                                        <button onClick={() => setActionTab('none')} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* 3 OlivePay Deposit Methods */}
                                    <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl">
                                        {([
                                            { id: 'dynamic_va', label: 'Dynamic VA' },
                                            { id: 'checkout', label: 'Checkout' },
                                            { id: 'direct', label: 'Instant TopUp' },
                                        ] as const).map(tab => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => { setDepositMethod(tab.id); setDynamicVa(null) }}
                                                className={`py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                                    depositMethod === tab.id
                                                        ? 'bg-card text-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {dynamicVa ? (
                                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/30 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                                                    One-Time Virtual Account
                                                </span>
                                                <Badge variant="outline" className="text-[9px] font-bold">
                                                    <Clock className="w-2.5 h-2.5 mr-1" /> 30m Window
                                                </Badge>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">{dynamicVa.bankName}</p>
                                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                                    <p className="font-mono text-xl font-black tracking-wider text-foreground">
                                                        {dynamicVa.accountNumber}
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => copyToClipboard(dynamicVa.accountNumber)}
                                                        className="h-7 px-2 rounded-lg text-[10px] font-bold"
                                                    >
                                                        <Copy className="w-3 h-3 mr-1" /> Copy
                                                    </Button>
                                                </div>
                                                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                                                    {dynamicVa.accountName}
                                                </p>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-muted-foreground">Transfer Exact Amount</span>
                                                <span className="font-mono text-sm font-black text-emerald-600">{fmt(dynamicVa.amountPayableNaira)}</span>
                                            </div>
                                            {isSandbox && (
                                                <Button
                                                    type="button"
                                                    onClick={handleSimulateDynamicVaPayment}
                                                    disabled={simulatingDva}
                                                    className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs gap-1.5"
                                                >
                                                    {simulatingDva ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                    Sandbox: Simulate Bank Payment Now
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDynamicVa(null)}
                                                className="w-full h-8 text-[11px] font-bold"
                                            >
                                                Generate Different Amount
                                            </Button>
                                        </div>
                                    ) : (
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
                                                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-sm mt-2 gap-1.5"
                                            >
                                                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                                {depositMethod === 'dynamic_va' && `Generate Dynamic VA for ${fmt(depositAmt)}`}
                                                {depositMethod === 'checkout' && (
                                                    <>Continue to Checkout ({fmt(depositAmt)}) <ExternalLink className="w-3.5 h-3.5" /></>
                                                )}
                                                {depositMethod === 'direct' && `Instant Fund ${fmt(depositAmt)}`}
                                            </Button>
                                        </form>
                                    )}
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
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest block">
                                                W2W &bull; Signed NIP Payout
                                            </span>
                                            <h3 className="text-base font-black text-foreground mt-0.5">Transfer / Withdraw</h3>
                                        </div>
                                        <button onClick={() => setActionTab('none')} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleTransferSubmit} className="space-y-3.5">
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Destination Bank (6-Digit NIP)</label>
                                            <select
                                                value={transferBankCode}
                                                onChange={e => setTransferBankCode(e.target.value)}
                                                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground"
                                            >
                                                <option value="999999">Copteller Cooperative W2W (₦0 Instant)</option>
                                                {nipBanks.map(b => (
                                                    <option key={b.value} value={b.value}>
                                                        {b.label} ({b.value})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">10-Digit Account Number</label>
                                            <input
                                                type="text"
                                                required
                                                maxLength={10}
                                                placeholder="e.g. 0123456789"
                                                value={transferDest}
                                                onChange={e => setTransferDest(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-mono font-bold text-foreground"
                                            />
                                            {lookupBusy && (
                                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Loader2 className="w-3 h-3 animate-spin" /> Running OlivePay NIP Name Enquiry...
                                                </p>
                                            )}
                                            {beneficiaryName && !lookupBusy && (
                                                <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1 truncate">
                                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {beneficiaryName}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase text-emerald-600 shrink-0">
                                                        {beneficiaryLocal ? '₦0 W2W' : 'NIP Verified'}
                                                    </span>
                                                </div>
                                            )}
                                            {lookupError && !lookupBusy && (
                                                <p className="text-[10px] text-red-500 font-semibold mt-1">{lookupError}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Amount (₦)</label>
                                            <input
                                                type="number"
                                                required
                                                min="100"
                                                max={Math.max(100, balance)}
                                                value={transferAmt}
                                                onChange={e => setTransferAmt(Number(e.target.value))}
                                                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-mono font-black text-foreground"
                                            />
                                            <span className="text-[10px] text-muted-foreground mt-1 block">Available balance: {fmt(balance)}</span>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">
                                                Narration (max 25 chars)
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={25}
                                                placeholder={isSandbox ? "Tip: SIM_PENDING or SIM_FAIL" : "e.g. Monthly Settlement"}
                                                value={transferNarration}
                                                onChange={e => setTransferNarration(e.target.value)}
                                                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground"
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={submitting || lookupBusy}
                                            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-sm mt-2"
                                        >
                                            {submitting ? 'Routing Payout...' : `Send ${fmt(transferAmt)}`}
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
                                            <p className="text-[10px] text-muted-foreground font-semibold">Real-time allocation on OlivePay SubWallet</p>
                                        </div>

                                        <div className="space-y-2.5">
                                            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                                                        <Wallet className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground">Available Balance</p>
                                                        <span className="text-[10px] text-muted-foreground">Spendable &amp; withdrawable</span>
                                                    </div>
                                                </div>
                                                <span className="font-mono text-xs font-black text-emerald-600">{fmt(balance)}</span>
                                            </div>

                                            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                                                        <Lock className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground">Active Escrow Lien</p>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {holds.filter(h => String(h.status).toUpperCase() === 'ACTIVE').length} active hold(s)
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="font-mono text-xs font-black text-amber-600">{fmt(activeEscrowTotal)}</span>
                                            </div>

                                            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                                        <Landmark className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground">Daily Debit Remaining</p>
                                                        <span className="text-[10px] text-muted-foreground">KYC Tier {subwallet?.tier || 1} limit</span>
                                                    </div>
                                                </div>
                                                <span className="font-mono text-xs font-black text-foreground">
                                                    {fmt(subwallet?.availableTodayNaira ?? 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-3">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Quick Financial Actions</h4>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <Button
                                                onClick={() => { setDynamicVa(null); setActionTab('deposit') }}
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
                                                <Send className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Send / NIP
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
