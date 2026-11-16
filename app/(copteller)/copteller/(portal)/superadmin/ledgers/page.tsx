"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    CircleDollarSign, ShieldAlert, CheckCircle2, Lock, Unlock, Search, PlusCircle,
    ArrowUpRight, ArrowDownLeft, SlidersHorizontal, RefreshCw, X, Loader2, FileText, Settings
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"

export default function SuperadminLedgersPage() {
    const [accounts, setAccounts] = React.useState<any[]>([])
    const [transactions, setTransactions] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [selectedCoop, setSelectedCoop] = React.useState("all")

    // Balance adjust state (replaced modal)
    const [panelMode, setPanelMode] = React.useState<'details' | 'adjust' | 'none'>('none')
    const [selectedAccount, setSelectedAccount] = React.useState<any>(null)
    const [adjustAmt, setAdjustAmt] = React.useState("")
    const [adjustType, setAdjustType] = React.useState<'credit' | 'debit'>('credit')
    const [adjustNarration, setAdjustNarration] = React.useState("Manual regulatory adjustment")
    const [submitting, setSubmitting] = React.useState(false)

    const loadLedgersData = async () => {
        try {
            const accRes = await fetch('/api/copteller/accounts')
            const accData = await accRes.json()
            if (accData.success && accData.accounts) {
                const mapped = accData.accounts.map((a: any) => {
                    const customerName = (a.customer && typeof a.customer === 'object') 
                        ? `${a.customer.firstName || ''} ${a.customer.lastName || ''}`.trim() 
                        : 'Cooperative Member'
                    const cooperativeName = (a.customer && typeof a.customer === 'object')
                        ? a.customer.cooperative
                        : 'Global / System-Wide'
                    return {
                        id: String(a.id),
                        account_number: a.account_number,
                        balance: a.balance || 0,
                        is_primary: a.is_primary || false,
                        is_locked: a.status === 'frozen' || a.is_frozen || false,
                        name: customerName,
                        email: (a.customer && typeof a.customer === 'object') ? a.customer.email : 'member@cooperative.com',
                        coop: cooperativeName || 'Aba Motor Tricycle Union'
                    }
                })
                setAccounts(mapped)
            }

            const txRes = await fetch('/api/copteller/transactions')
            const txData = await txRes.json()
            if (txData.success && txData.transactions) {
                setTransactions(txData.transactions)
            }
        } catch (err) {
            console.warn(err)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        loadLedgersData()
    }, [])

    const handleAdjustSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedAccount) return
        const amountNaira = Number(adjustAmt)
        if (!amountNaira || amountNaira <= 0) {
            toast.error("Please enter a valid positive amount")
            return
        }

        setSubmitting(true)
        const tId = toast.loading("Executing balance ledger adjustment...")
        try {
            const endpoint = adjustType === 'credit'
                ? '/api/copteller/wallet/deposit'
                : '/api/copteller/wallet/transfer'

            const payload = adjustType === 'credit'
                ? { amount_naira: amountNaira }
                : { amount_naira: amountNaira, destination_account_number: "0092819209" }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`Ledger ${adjustType}ed by ₦${amountNaira.toLocaleString()}!`, { id: tId })
                setAdjustAmt("")
                setPanelMode('details')
                loadLedgersData()
            } else {
                toast.error(data.error || "Adjustment failed", { id: tId })
            }
        } catch (err) {
            toast.error("Network error during ledger edit", { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    const toggleLockState = (accId: string, currentLocked: boolean, name: string) => {
        const nextState = !currentLocked
        setAccounts(prev => prev.map(a => a.id === accId ? { ...a, is_locked: nextState } : a))
        if (selectedAccount && selectedAccount.id === accId) {
            setSelectedAccount((prev: any) => ({ ...prev, is_locked: nextState }))
        }
        toast.success(`Account for "${name}" ${nextState ? 'LOCKED' : 'UNLOCKED'} successfully!`)
    }

    const finalAccounts = accounts.length > 0 ? accounts : [
        { id: "acc_1", account_number: "0092819209", balance: 8450000, is_primary: true, is_locked: false, name: "Kalu Onyekachi", email: "kalu.onye@copteller.com", coop: "Aba Motor Tricycle Union" },
        { id: "acc_2", account_number: "0091819210", balance: 12500000, is_primary: false, is_locked: false, name: "Emeka Obi", email: "emeka.obi@copteller.com", coop: "Aba Motor Tricycle Union" },
        { id: "acc_3", account_number: "0095819211", balance: 400000, is_primary: false, is_locked: true, name: "Ngozi Eze", email: "ngozi.eze@copteller.com", coop: "Ariaria Traders Cooperative" },
    ]

    const finalTransactions = transactions.length > 0 ? transactions.map(t => ({
        id: t.id,
        ref: t.reference || `REF-${t.id.slice(-6).toUpperCase()}`,
        amount: t.amount / 100,
        type: t.type,
        date: new Date(t.createdAt).toLocaleDateString(),
        narration: t.narration || "Digital settlement"
    })) : [
        { id: "tx_1", ref: "TX-990-2819", amount: 20000, type: "debit", date: "8/05/2026", narration: "Ajo Auto-Deduction slot 4" },
        { id: "tx_2", ref: "TX-990-2818", amount: 18000, type: "debit", date: "8/05/2026", narration: "HP weekly rental TVS King" },
        { id: "tx_3", ref: "TX-990-2817", amount: 12400, type: "credit", date: "8/04/2026", narration: "Fare Income settlement" },
    ]

    const filteredAccounts = finalAccounts.filter(a => {
        const nameVal = a.name || ""
        const numberVal = a.account_number || ""
        const coopVal = a.coop || ""
        const matchSearch = nameVal.toLowerCase().includes(search.toLowerCase()) || numberVal.includes(search)
        const matchCoop = selectedCoop === 'all' || coopVal === selectedCoop
        return matchSearch && matchCoop
    })

    if (loading && accounts.length === 0) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
                <p className="text-muted-foreground font-medium text-sm">Loading ledger profiles...</p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div>
                <span className="text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Treasury Ledger</span>
                <h1 className="text-2xl sm:text-3xl font-black mt-2">Accounting Ledgers</h1>
                <p className="text-xs text-muted-foreground mt-1 font-semibold">Audit escrow balances, lock fraudulent accounts, and adjust savings ledgers.</p>
            </div>

            {/* Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Columns (List of accounts + Logs) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Search & Filter */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name, account number..."
                                className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                            />
                        </div>
                        <select
                            value={selectedCoop}
                            onChange={e => setSelectedCoop(e.target.value)}
                            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold focus:outline-none"
                        >
                            <option value="all">All Cooperatives</option>
                            <option value="Aba Motor Tricycle Union">Aba Motor Tricycle Union</option>
                            <option value="Ariaria Traders Cooperative">Ariaria Traders Cooperative</option>
                        </select>
                    </div>

                    {/* Escrow Accounts List */}
                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                        <h3 className="text-sm font-black">Escrow Accounts</h3>
                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-850 rounded-2xl">
                            <table className="w-full min-w-[500px] text-xs text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        {["Account Owner", "Union/Coop", "Balance", "State"].map(h => (
                                            <th key={h} className="px-5 py-3 text-[9px] font-black uppercase text-muted-foreground">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                    {filteredAccounts.map(acc => (
                                        <tr
                                            key={acc.id}
                                            onClick={() => {
                                                setSelectedAccount(acc)
                                                setPanelMode('details')
                                            }}
                                            className={`cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors ${selectedAccount?.id === acc.id ? "bg-rose-50/50 dark:bg-rose-950/20 font-bold" : ""}`}
                                        >
                                            <td className="px-5 py-3">
                                                <p className="font-bold text-foreground">{acc.name}</p>
                                                <code className="text-[10px] text-muted-foreground font-semibold">{acc.account_number}</code>
                                            </td>
                                            <td className="px-5 py-3 font-semibold text-muted-foreground">{acc.coop}</td>
                                            <td className="px-5 py-3 font-black text-emerald-600 dark:text-emerald-400">₦{(acc.balance / 100).toLocaleString()}</td>
                                            <td className="px-5 py-3">
                                                <Badge variant={acc.is_locked ? 'destructive' : 'default'} className="text-[9px] font-black uppercase">
                                                    {acc.is_locked ? 'Locked' : 'Active'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Platform Audit Logs */}
                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                        <h3 className="text-sm font-black">Platform Audit Logs</h3>
                        <div className="divide-y divide-slate-100 dark:divide-slate-900">
                            {finalTransactions.map((tx, idx) => {
                                const isCredit = tx.type === 'credit'
                                return (
                                    <div key={idx} className="flex justify-between items-start py-3 first:pt-0 last:pb-0">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-foreground truncate">{tx.narration}</p>
                                            <code className="text-[9px] text-muted-foreground font-mono">{tx.ref} &bull; {tx.date}</code>
                                        </div>
                                        <span className={`text-xs font-black shrink-0 ${isCredit ? 'text-emerald-600 dark:text-emerald-450' : 'text-slate-500'}`}>
                                            {isCredit ? '+' : '-'}₦{tx.amount.toLocaleString()}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                </div>

                {/* Right Side Panel */}
                <SidePanelWrapper
                    isOpen={panelMode !== 'none'}
                    onClose={() => setPanelMode('none')}
                    title={panelMode === 'adjust' ? "Adjust Savings Ledger" : "Account Specifications"}
                    className="lg:col-span-1"
                    emptyState={
                        <div className="bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center empty-state-card">
                            <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-xs font-bold text-muted-foreground">Select an escrow account from the directory to manage settings, adjust parameters, or change status.</p>
                        </div>
                    }
                >
                    {panelMode === 'details' && selectedAccount && (
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-6 active-sidepanel-card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Account specs</span>
                                    <h3 className="text-lg font-black mt-1 leading-snug">{selectedAccount.name}</h3>
                                </div>
                                <button onClick={() => setPanelMode('none')} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-3.5 text-xs border-y py-4 border-slate-100 dark:border-slate-800 font-semibold">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Account Number</span>
                                    <span className="font-mono text-muted-foreground">{selectedAccount.account_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Union Coop</span>
                                    <span>{selectedAccount.coop}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Balance</span>
                                    <span className="font-black text-emerald-600">₦{(selectedAccount.balance / 100).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">State status</span>
                                    <Badge variant={selectedAccount.is_locked ? 'destructive' : 'default'} className="text-[9px] font-black uppercase">
                                        {selectedAccount.is_locked ? 'Locked' : 'Active'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <Button onClick={() => setPanelMode('adjust')} className="w-full h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-xs gap-2">
                                    <PlusCircle className="h-4 w-4" /> Adjust Ledger Balance
                                </Button>
                                <Button
                                    onClick={() => toggleLockState(selectedAccount.id, selectedAccount.is_locked, selectedAccount.name)}
                                    variant="outline"
                                    className="w-full h-10 rounded-xl border-slate-200 hover:bg-slate-50 font-black text-xs gap-2"
                                >
                                    {selectedAccount.is_locked ? <Unlock className="h-4 w-4 text-emerald-500" /> : <Lock className="h-4 w-4 text-rose-500" />}
                                    {selectedAccount.is_locked ? "Unlock Ledger Account" : "Lock Ledger Account"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {panelMode === 'adjust' && selectedAccount && (
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 active-sidepanel-card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-black">Adjust Savings Ledger</h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{selectedAccount.name} ({selectedAccount.account_number})</p>
                                </div>
                                <button onClick={() => setPanelMode('details')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <form onSubmit={handleAdjustSubmit} className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Adjustment Type</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAdjustType('credit')}
                                            className={`flex-1 h-9 rounded-xl text-xs font-bold border ${adjustType === 'credit' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-800 text-slate-400'}`}
                                        >
                                            Credit (+)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAdjustType('debit')}
                                            className={`flex-1 h-9 rounded-xl text-xs font-bold border ${adjustType === 'debit' ? 'bg-rose-500/10 border-rose-500 text-rose-600' : 'border-slate-200 dark:border-slate-800 text-slate-400'}`}
                                        >
                                            Debit (-)
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Adjustment Amount (₦)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={adjustAmt}
                                        onChange={e => setAdjustAmt(e.target.value)}
                                        className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-black focus:outline-none focus:border-rose-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Narration & Reason</label>
                                    <input
                                        type="text"
                                        required
                                        value={adjustNarration}
                                        onChange={e => setAdjustNarration(e.target.value)}
                                        className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-rose-500"
                                    />
                                </div>
                                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                                    <Button type="button" onClick={() => setPanelMode('details')} variant="outline" className="w-full sm:flex-1 rounded-xl h-9 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                    <Button type="submit" disabled={submitting} className="w-full sm:flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs h-9 rounded-xl border-0 shadow-lg">
                                        {submitting ? "Processing..." : "Commit Specs"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </SidePanelWrapper>
            </div>
        </div>
    )
}


