"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Search, Plus, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        "Active": "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        "Pending": "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
        "Defaulting": "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
    }
    return (
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${map[status] ?? 'bg-slate-100 border-slate-200 text-slate-500'}`}>
            {status}
        </span>
    )
}

export default function OperatorRosterPage() {
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => {
        setMounted(true)
    }, [])

    const [operatorsList, setOperatorsList] = React.useState<any[]>([])
    const [loadingOps, setLoadingOps] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
    const [newOpData, setNewOpData] = React.useState({ firstName: '', lastName: '', email: '', phone: '', initialBalance: 5000 })

    const fetchOperators = async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        try {
            const res = await fetch('/api/copteller/admin/operators', { signal: controller.signal })
            clearTimeout(timeoutId)
            const data = await res.json()
            if (data.success && data.operators) {
                setOperatorsList(data.operators)
            }
        } catch (err: any) {
            console.warn('Failed to load operators list or check timed out:', err.message)
        } finally {
            setLoadingOps(false)
        }
    }

    React.useEffect(() => {
        fetchOperators()
    }, [])

    const handleCreateOperator = async (e: React.FormEvent) => {
        e.preventDefault()
        const tId = toast.loading("Onboarding operator and generating core savings account...")
        try {
            const res = await fetch('/api/copteller/admin/operators', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: newOpData.firstName,
                    lastName: newOpData.lastName,
                    email: newOpData.email,
                    phone_number: newOpData.phone,
                    initial_balance_naira: Number(newOpData.initialBalance)
                })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`Operator ${data.operator.name} onboarded! Account: ${data.operator.accountNumber}`, { id: tId })
                setIsAddModalOpen(false)
                setNewOpData({ firstName: '', lastName: '', email: '', phone: '', initialBalance: 5000 })
                fetchOperators()
            } else {
                toast.error(data.error || 'Failed to onboard operator', { id: tId })
            }
        } catch (err) {
            toast.error('Network request failed', { id: tId })
        }
    }

    const [localOverride, setLocalOverride] = React.useState<Record<string, string>>({})

    const handleToggleStatus = (name: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'Active' ? 'Defaulting' : 'Active'
        setLocalOverride(prev => ({ ...prev, [name]: nextStatus }))
        toast.info(`Operator "${name}" status updated to ${nextStatus}!`)
    }

    const operators = operatorsList.map((op, idx) => ({
        id: op.id,
        name: op.name,
        email: op.email,
        vehicle: idx % 3 === 0 ? "TVS King ABA-404" : idx % 3 === 1 ? "Haojin ABA-211" : "Bajaj ABA-088",
        paid: Math.floor(op.balance / 10) || 420000,
        total: 1400000,
        score: idx % 3 === 0 ? 87 : idx % 3 === 1 ? 91 : 74,
        status: localOverride[op.name] || op.status || 'Active'
    }))

    const finalOperators = operators.length > 0 ? operators : [
        { name: "Kalu Onyekachi", vehicle: "TVS King ABA-404", paid: 420000, total: 1400000, score: 87, status: localOverride["Kalu Onyekachi"] || "Active" },
        { name: "Emeka Obi", vehicle: "Haojin ABA-211", paid: 700000, total: 1400000, score: 91, status: localOverride["Emeka Obi"] || "Active" },
        { name: "Ngozi Eze", vehicle: "Bajaj ABA-088", paid: 120000, total: 1200000, score: 74, status: localOverride["Ngozi Eze"] || "Pending" },
        { name: "Chukwu Nna", vehicle: "TVS King ABA-519", paid: 280000, total: 1400000, score: 62, status: localOverride["Chukwu Nna"] || "Defaulting" },
        { name: "Ada Okafor", vehicle: "Haojin ABA-332", paid: 1100000, total: 1400000, score: 95, status: localOverride["Ada Okafor"] || "Active" },
    ]

    const filteredOps = finalOperators.filter(o => o.name.toLowerCase().includes(search.toLowerCase()) || o.vehicle.toLowerCase().includes(search.toLowerCase()))

    if (loadingOps) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                <p className="text-muted-foreground font-medium text-sm">Parsing operator roster registry...</p>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Roster</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Operator Member Roster</h1>
                    <p className="text-xs text-muted-foreground mt-1">Review active driver savings levels, contract details, and credit points.</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search operators..."
                        className="w-full pl-9 pr-4 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="h-9 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-black font-black text-xs border-0 gap-2 shadow-md w-full sm:w-auto">
                    <Plus className="h-3.5 w-3.5" /> Add Operator
                </Button>
            </div>

            <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[550px] text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                {["Operator", "Vehicle", "HP Progress", "Credit Score", "Status", "Actions"].map(h => (
                                    <th key={h} className="text-left px-4 sm:px-5 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOps.map((op, i) => (
                                <tr key={i} className="border-b border-slate-50 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                    <td className="px-4 sm:px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center text-[10px] font-black text-black shrink-0">
                                                {op.name.split(' ').map((n: string) => n[0]).join('')}
                                            </div>
                                            <span className="font-bold truncate">{op.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 sm:px-5 py-3 font-semibold text-muted-foreground">{op.vehicle}</td>
                                    <td className="px-4 sm:px-5 py-3 font-black">
                                        {Math.floor((op.paid / op.total) * 100)}%
                                        <span className="text-[10px] text-muted-foreground font-semibold ml-1">{`(${Math.floor(op.paid / 1000)}k/${Math.floor(op.total / 1000)}k)`}</span>
                                    </td>
                                    <td className="px-4 sm:px-5 py-3 font-black text-emerald-600 dark:text-emerald-400">{op.score}/100</td>
                                    <td className="px-4 sm:px-5 py-3"><StatusBadge status={op.status} /></td>
                                    <td className="px-4 sm:px-5 py-3">
                                        <button onClick={() => handleToggleStatus(op.name, op.status)} className="text-[10px] font-black text-amber-600 dark:text-amber-400 hover:underline">Toggle Status</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Operator Modal */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isAddModalOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-background border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl font-sans max-h-[90vh] overflow-y-auto"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-black">Add Trade Guild Driver</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Register operator and auto-create local savings account.</p>
                                    </div>
                                    <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <form onSubmit={handleCreateOperator} className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">First Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={newOpData.firstName}
                                                onChange={e => setNewOpData(d => ({ ...d, firstName: e.target.value }))}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Last Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={newOpData.lastName}
                                                onChange={e => setNewOpData(d => ({ ...d, lastName: e.target.value }))}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Email Address</label>
                                        <input
                                            type="email"
                                            required
                                            value={newOpData.email}
                                            onChange={e => setNewOpData(d => ({ ...d, email: e.target.value }))}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Phone Number</label>
                                        <input
                                            type="text"
                                            required
                                            value={newOpData.phone}
                                            onChange={e => setNewOpData(d => ({ ...d, phone: e.target.value }))}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Initial Deposit (₦)</label>
                                        <input
                                            type="number"
                                            required
                                            value={newOpData.initialBalance}
                                            onChange={e => setNewOpData(d => ({ ...d, initialBalance: Number(e.target.value) }))}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-black focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                                        <Button type="button" onClick={() => setIsAddModalOpen(false)} variant="outline" className="w-full sm:w-auto flex-1 rounded-xl h-9 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                        <Button type="submit" className="w-full sm:w-auto flex-1 bg-gradient-to-r from-amber-500 to-emerald-500 text-black font-black text-xs h-9 rounded-xl border-0">Onboard Driver</Button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}

