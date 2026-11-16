"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    Landmark, TrendingUp, Calendar, ArrowRight,
    PiggyBank, CheckCircle, Loader2, Play, Building2,
    DollarSign, PlusCircle, UserCheck, Info, Smartphone,
    Layers, FileText, Check, X, ShieldAlert
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface TerminalRequest {
    id: string
    agentName: string
    pos_model: string
    requestDate: string
    serial_number: string
    status: 'pending' | 'active' | 'assigned' | 'suspended'
}

interface CommissionLedger {
    id: string
    agentName: string
    terminalSerial: string
    amount: number
    totalCommission: number
    agentShare: number
    bankShare: number
    status: 'settled' | 'pending'
    timestamp: string
}

export default function CoptellerAgencyPage() {
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => {
        setMounted(true)
    }, [])

    const [terminals, setTerminals] = React.useState<TerminalRequest[]>([])
    const [commissions, setCommissions] = React.useState<CommissionLedger[]>([])
    const [loading, setLoading] = React.useState(true)
    const [activeTab, setActiveTab] = React.useState<'fleet' | 'requests' | 'commissions'>('fleet')

    // Request terminal states
    const [showRequestModal, setShowRequestModal] = React.useState(false)
    const [newAgentName, setNewAgentName] = React.useState("")
    const [newPosModel, setNewPosModel] = React.useState("Pax S900")
    const [submittingTerminal, setSubmittingTerminal] = React.useState(false)

    const handleRequestTerminal = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newAgentName) return
        setSubmittingTerminal(true)
        const tId = toast.loading("Submitting POS hardware request to database...")
        try {
            const res = await fetch('/api/copteller/agency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentName: newAgentName, posModel: newPosModel })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to submit request')

            if (data.terminal) {
                setTerminals(prev => [data.terminal, ...prev])
            }
            toast.success("POS Terminal request submitted successfully to union registry!", { id: tId })
            setShowRequestModal(false)
            setNewAgentName("")
        } catch (err: any) {
            toast.error(err.message || "Failed to request terminal", { id: tId })
        } finally {
            setSubmittingTerminal(false)
        }
    }

    // Allocate Serial Modal state
    const [selectedTerminal, setSelectedTerminal] = React.useState<TerminalRequest | null>(null)
    const [customSerial, setCustomSerial] = React.useState("")

    const handleDisableTerminal = async (id: string) => {
        if (confirm("Are you sure you want to disable and suspend this terminal?")) {
            const tId = toast.loading("Suspending POS terminal in core register...")
            try {
                const res = await fetch('/api/copteller/agency', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'suspend', terminalId: id })
                })
                if (!res.ok) throw new Error('Failed to suspend terminal')
                setTerminals(prev => prev.map(t => t.id === id ? { ...t, status: 'suspended' } : t))
                toast.success("Terminal suspended successfully. Audit log created.", { id: tId })
            } catch (err: any) {
                toast.error(err.message || 'Error suspending terminal', { id: tId })
            }
        }
    }

    React.useEffect(() => {
        const loadAgencyData = async () => {
            try {
                let fetchedTerminals: TerminalRequest[] = []
                let fetchedCommissions: CommissionLedger[] = []

                try {
                    const res = await fetch('/api/copteller/agency')
                    if (res.ok) {
                        const data = await res.json()
                        if (data.terminals?.length > 0) fetchedTerminals = data.terminals
                        if (data.commissions?.length > 0) fetchedCommissions = data.commissions
                    }
                } catch (e) {
                    console.warn('[Copteller Agency] Failed to load from /api/copteller/agency', e)
                }

                if (fetchedTerminals.length === 0) {
                    fetchedTerminals = [
                        { id: '1', agentName: 'Aba Central Cashpoint (Kalu)', pos_model: 'Pax S900', requestDate: new Date(Date.now() - 86400000 * 5).toISOString(), serial_number: 'POS_8871928091', status: 'active' },
                        { id: '2', agentName: 'Ariaria Wholesale Agents', pos_model: 'Pax A920 Smart POS', requestDate: new Date(Date.now() - 86400000 * 3).toISOString(), serial_number: 'POS_4492019920', status: 'active' },
                        { id: '3', agentName: 'Umuahia Junction Hub', pos_model: 'Pax S900', requestDate: new Date(Date.now() - 86400000).toISOString(), serial_number: 'POS_PENDING_1', status: 'pending' },
                        { id: '4', agentName: 'Ohafia Thrift Outlet', pos_model: 'Pax S900', requestDate: new Date(Date.now()).toISOString(), serial_number: 'POS_PENDING_2', status: 'pending' }
                    ]
                }
                if (fetchedCommissions.length === 0) {
                    fetchedCommissions = [
                        { id: 'comm_1', agentName: 'Aba Central Cashpoint (Kalu)', terminalSerial: 'POS_8871928091', amount: 2500000, totalCommission: 37500, agentShare: 26250, bankShare: 11250, status: 'settled', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
                        { id: 'comm_2', agentName: 'Ariaria Wholesale Agents', terminalSerial: 'POS_4492019920', amount: 5000000, totalCommission: 75000, agentShare: 52500, bankShare: 22500, status: 'settled', timestamp: new Date(Date.now() - 1800000).toISOString() }
                    ]
                }

                setTerminals(fetchedTerminals)
                setCommissions(fetchedCommissions)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        loadAgencyData()
    }, [])

    const triggerApproveModal = (term: TerminalRequest) => {
        setSelectedTerminal(term)
        setCustomSerial(`POS_${Math.floor(1000000000 + Math.random() * 9000000000)}`)
    }

    const confirmApproveTerminal = async () => {
        if (!selectedTerminal) return
        const tId = toast.loading("Allocating hardware serial and activating terminal...")
        try {
            const res = await fetch('/api/copteller/agency', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', terminalId: selectedTerminal.id, serialNumber: customSerial })
            })
            if (!res.ok) throw new Error('Activation failed')
            setTerminals(prev => prev.map(t => {
                if (t.id === selectedTerminal.id) {
                    return {
                        ...t,
                        serial_number: customSerial,
                        status: 'active' as const
                    }
                }
                return t
            }))
            toast.success(`POS terminal request for "${selectedTerminal.agentName}" approved! Serial ${customSerial} assigned.`, { id: tId })
            setSelectedTerminal(null)
        } catch (err: any) {
            toast.error(err.message || 'Error approving terminal', { id: tId })
        }
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                <p className="text-muted-foreground font-medium text-sm">Loading agency banking registers...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 sm:space-y-8 pb-12 max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">POS Outlets</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Union POS Terminals</h1>
                    <p className="text-xs text-muted-foreground mt-1 max-w-2xl">Audit merchant cashout POS terminal deployments, assign dynamic hardware serial numbers, and inspect split agent commission ledgers.</p>
                </div>
                <div>
                    <Button
                        onClick={() => setShowRequestModal(true)}
                        className="w-full sm:w-auto h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black text-xs border-0 shadow-lg flex items-center justify-center gap-2"
                    >
                        <PlusCircle className="h-4 w-4" /> Request POS Terminal
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-100 dark:border-slate-900 pb-3 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
                {[
                    { key: 'fleet', label: 'Active Terminals' },
                    { key: 'requests', label: 'Pending Requests' },
                    { key: 'commissions', label: 'Commission Splits' }
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 transition-all ${activeTab === t.key ? 'bg-slate-100 dark:bg-slate-900 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content Tab Renderers */}
            {activeTab === 'fleet' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {terminals.filter(t => t.status === 'active').map(t => (
                        <div key={t.id} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-5 sm:p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                                    <Smartphone className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full uppercase">
                                    {t.status}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black truncate">{t.agentName}</h3>
                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 break-all">{t.pos_model} · {t.serial_number}</p>
                            </div>
                            <Button 
                                onClick={() => handleDisableTerminal(t.id)}
                                variant="outline" size="sm" 
                                className="w-full mt-4 h-8 text-[10px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                                <X className="h-3 w-3 mr-1.5" /> Disable Terminal
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'requests' && (
                <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[550px] text-left text-xs font-sans">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-5 py-4">Agent Name</th>
                                    <th className="px-5 py-4">POS Model</th>
                                    <th className="px-5 py-4">Request Date</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                {terminals.filter(t => t.status === 'pending').map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors font-medium">
                                        <td className="px-5 py-4 font-bold">{t.agentName}</td>
                                        <td className="px-5 py-4 font-semibold text-slate-500">{t.pos_model}</td>
                                        <td className="px-5 py-4 text-slate-400">{new Date(t.requestDate).toLocaleDateString()}</td>
                                        <td className="px-5 py-4 text-right">
                                            <Button
                                                onClick={() => triggerApproveModal(t)}
                                                size="sm"
                                                className="bg-emerald-500 text-black hover:bg-emerald-400 text-[10px] font-black h-8 rounded-lg"
                                            >
                                                Allocate Serial
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'commissions' && (
                <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl overflow-hidden font-sans">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[550px] text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-5 py-4">Agent</th>
                                    <th className="px-5 py-4">Transaction Volume</th>
                                    <th className="px-5 py-4">Total Commission</th>
                                    <th className="px-5 py-4">MFB Share</th>
                                    <th className="px-5 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                {commissions.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors font-medium">
                                        <td className="px-5 py-4">
                                            <p className="font-extrabold">{c.agentName}</p>
                                            <p className="text-[10px] text-slate-400">{c.terminalSerial}</p>
                                        </td>
                                        <td className="px-5 py-4 font-black">₦{(c.amount / 100).toLocaleString()}</td>
                                        <td className="px-5 py-4 text-emerald-650 dark:text-emerald-450">₦{(c.totalCommission / 100).toLocaleString()}</td>
                                        <td className="px-5 py-4 text-amber-650 dark:text-amber-450">₦{(c.bankShare / 100).toLocaleString()} (30%)</td>
                                        <td className="px-5 py-4">
                                            <span className="text-[9px] font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase">
                                                {c.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Allocate Serial Modal */}
            {mounted && createPortal(
                <AnimatePresence>
                    {selectedTerminal && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-background border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 shadow-2xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-black">Assign Device Serial</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{selectedTerminal.agentName}</p>
                                    </div>
                                    <button onClick={() => setSelectedTerminal(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Hardware Serial Number</label>
                                        <input
                                            type="text"
                                            value={customSerial}
                                            onChange={e => setCustomSerial(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-sm font-bold focus:outline-none focus:border-emerald-500 font-mono"
                                        />
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                                        <Button onClick={() => setSelectedTerminal(null)} variant="outline" className="w-full sm:flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                        <Button onClick={confirmApproveTerminal} className="w-full sm:flex-1 bg-emerald-500 text-black font-black text-xs h-10 rounded-xl">Assign & Activate</Button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Request Terminal Modal */}
            {mounted && createPortal(
                <AnimatePresence>
                    {showRequestModal && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-background border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 shadow-2xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-black">Request POS Terminal</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Submit a deployment ticket for a new agent terminal</p>
                                    </div>
                                    <button onClick={() => setShowRequestModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <form onSubmit={handleRequestTerminal} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Agent Cashpoint / Outlet Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={newAgentName}
                                            onChange={e => setNewAgentName(e.target.value)}
                                            placeholder="e.g. Aba South Market Plaza Agent"
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-sm font-bold focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Hardware POS Model</label>
                                        <select
                                            value={newPosModel}
                                            onChange={e => setNewPosModel(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-sm font-bold focus:outline-none focus:border-emerald-500"
                                        >
                                            <option value="Pax S900">Pax S900 (Analog Dialup)</option>
                                            <option value="Pax A920 Smart POS">Pax A920 Smart POS (Android Touch)</option>
                                            <option value="Pax D210">Pax D210 (Portable)</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                                        <Button type="button" onClick={() => setShowRequestModal(false)} variant="outline" className="w-full sm:flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                        <Button type="submit" disabled={submittingTerminal} className="w-full sm:flex-1 bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black text-xs h-10 rounded-xl">
                                            {submittingTerminal ? 'Submitting...' : 'Request Deployment'}
                                        </Button>
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

