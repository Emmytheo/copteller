"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { CircleDollarSign, PlusCircle, X, Search, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function CollectionsLedgerPage() {
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => {
        setMounted(true)
    }, [])

    const [logs, setLogs] = React.useState([
        { id: 1, label: "Weekly Auto-Deduction Run", ref: "TX-990-2819", amount: 90000, type: "Automated", status: "Cleared", date: "Jul 29, 2026" },
        { id: 2, label: "Cash Deposit - Fleet Arrears", ref: "TX-MAN-2811", amount: 45000, type: "Manual", status: "Cleared", date: "Jul 22, 2026" },
        { id: 3, label: "Weekly Auto-Deduction Run", ref: "TX-990-2804", amount: 72000, type: "Automated", status: "Cleared", date: "Jul 15, 2026" },
    ])
    
    const [recordOpen, setRecordOpen] = React.useState(false)
    const [submitting, setSubmitting] = React.useState(false)

    // Lock body scroll and handle ESC key when modal is open
    React.useEffect(() => {
        if (!recordOpen) return
        const origOverflow = document.body.style.overflow
        const origPadding = document.body.style.paddingRight
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
        if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
        document.body.style.overflow = 'hidden'

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setRecordOpen(false)
        }
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.body.style.overflow = origOverflow
            document.body.style.paddingRight = origPadding
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [recordOpen])
    
    // Form fields
    const [amount, setAmount] = React.useState("")
    const [desc, setDesc] = React.useState("")
    const [member, setMember] = React.useState("")

    const handleRecordCollection = (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        const tId = toast.loading("Recording manual cash collection to ledger...")
        
        setTimeout(() => {
            setLogs(prev => [{
                id: Date.now(),
                label: desc || `Cash Deposit - ${member}`,
                ref: `TX-MAN-${Math.floor(1000 + Math.random() * 9000)}`,
                amount: Number(amount),
                type: "Manual",
                status: "Cleared",
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            }, ...prev])
            
            toast.success("Cash collection securely recorded in the ledger.", { id: tId })
            setSubmitting(false)
            setRecordOpen(false)
            setAmount("")
            setDesc("")
            setMember("")
        }, 1000)
    }

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Treasury</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Collections Ledger</h1>
                    <p className="text-xs text-muted-foreground mt-1">Audit rotational collections and record manual cash deposits.</p>
                </div>
                <Button onClick={() => setRecordOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-black h-10 rounded-xl text-xs w-full sm:w-auto">
                    <PlusCircle className="h-4 w-4 mr-2" /> Record Collection
                </Button>
            </div>

            <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="text" placeholder="Search by reference or label..." className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold focus:outline-none focus:border-amber-500 transition-colors" />
                    </div>
                    <Button variant="outline" className="h-9 text-xs font-bold border-slate-200 dark:border-slate-800 w-full sm:w-auto">
                        <FileText className="h-4 w-4 mr-1.5" /> Export CSV
                    </Button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[550px] text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                {["Transaction Label", "Reference ID", "Collection Type", "Amount", "Date", "Status"].map(h => (
                                    <th key={h} className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                    <td className="px-5 py-4 font-bold flex items-center gap-2">
                                        <CircleDollarSign className="h-4 w-4 text-amber-500 shrink-0" />
                                        <span className="truncate">{log.label}</span>
                                    </td>
                                    <td className="px-5 py-4 font-mono font-semibold text-slate-500">{log.ref}</td>
                                    <td className="px-5 py-4 font-bold text-slate-500">{log.type}</td>
                                    <td className="px-5 py-4 font-black text-emerald-600 dark:text-emerald-400">₦{log.amount.toLocaleString()}</td>
                                    <td className="px-5 py-4 font-bold text-slate-500">{log.date}</td>
                                    <td className="px-5 py-4">
                                        <span className="text-[9px] font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">{log.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Record Manual Collection Modal */}
            {mounted && createPortal(
                <AnimatePresence>
                    {recordOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-auto">
                            <div onClick={() => setRecordOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: 20 }} 
                                className="relative bg-background border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[28px] sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl z-10 max-h-[88dvh] flex flex-col"
                            >
                                {/* Mobile pull handle indicator */}
                                <div className="sm:hidden w-10 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto -mt-1 mb-3 shrink-0" />

                                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-900 pb-3 shrink-0">
                                    <div>
                                        <h3 className="text-sm font-black">Record Cash Collection</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Manually book physical cash payments.</p>
                                    </div>
                                    <button onClick={() => setRecordOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="overflow-y-auto overscroll-contain flex-1 pt-3 pr-0.5">
                                    <form onSubmit={handleRecordCollection} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Amount Paid (₦)</label>
                                            <input required type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 50000" className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-sm font-black focus:outline-none focus:border-amber-500" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Member Name / ID</label>
                                            <input required value={member} onChange={e => setMember(e.target.value)} placeholder="e.g. Uzo Okafor" className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-sm font-bold focus:outline-none focus:border-amber-500" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Description</label>
                                            <input required value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Weekly Ajo arrears payment" className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-sm font-bold focus:outline-none focus:border-amber-500" />
                                        </div>
                                        
                                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl">
                                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                                                Note: Manual collections are instantly credited to the member's wallet for reconciliation.
                                            </p>
                                        </div>
                                        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                                            <Button type="button" onClick={() => setRecordOpen(false)} variant="outline" className="w-full sm:w-auto flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                            <Button type="submit" disabled={submitting} className="w-full sm:w-auto flex-1 bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black text-xs h-10 rounded-xl shadow-lg">
                                                {submitting ? 'Recording...' : 'Save to Ledger'}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}

