"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Banknote, Search, Plus, X, CheckCircle2, AlertCircle,
    Clock, Download, Send, Settings, Users, RefreshCw,
    Calendar, Edit2, TrendingUp, Receipt, AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

interface DuesConfig {
    id: string
    category: string
    description: string
    amount: number
    frequency: 'monthly' | 'quarterly' | 'annual' | 'one-off'
    mandatory: boolean
    active: boolean
    totalCollected: number
    compliance: number // percentage
}

interface MemberDueRecord {
    id: string
    memberNo: string
    memberName: string
    phone: string
    category: string
    period: string
    amount: number
    status: 'paid' | 'pending' | 'overdue'
    dueDate: string
    paidDate?: string
    paymentRef?: string
    channel?: string
}

export default function AdminDuesPage() {
    const [configs, setConfigs] = React.useState<DuesConfig[]>([])
    const [records, setRecords] = React.useState<MemberDueRecord[]>([])
    const [coopName, setCoopName] = React.useState('Transport Union')
    const [search, setSearch] = React.useState('')
    const [activeTab, setActiveTab] = React.useState<'schedule' | 'records' | 'new'>('schedule')
    const [selected, setSelected] = React.useState<DuesConfig | null>(null)
    const [reminding, setReminding] = React.useState(false)
    const [loading, setLoading] = React.useState(true)

    // New dues form
    const [newCategory, setNewCategory] = React.useState('')
    const [newDesc, setNewDesc] = React.useState('')
    const [newAmount, setNewAmount] = React.useState('')
    const [newFreq, setNewFreq] = React.useState<'monthly' | 'quarterly' | 'annual' | 'one-off'>('monthly')
    const [newMandatory, setNewMandatory] = React.useState(true)
    const [saving, setSaving] = React.useState(false)

    const fetchDuesData = React.useCallback(async () => {
        try {
            const res = await fetch('/api/copteller/admin/dues')
            const data = await res.json()
            if (data.success) {
                setConfigs(data.configs || [])
                setRecords(data.records || [])
                if (data.cooperativeName) setCoopName(data.cooperativeName)
            }
        } catch (err) {
            console.error('Failed to load admin dues data:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchDuesData()
    }, [fetchDuesData])

    const totalCollected = configs.reduce((a, c) => a + (Number(c.totalCollected) || 0), 0)
    const pendingCount = records.filter(r => r.status === 'pending').length
    const overdueCount = records.filter(r => r.status === 'overdue').length

    const filteredRecords = records.filter(r => {
        const q = search.toLowerCase()
        return r.memberName.toLowerCase().includes(q) || r.memberNo.toLowerCase().includes(q) || r.period.toLowerCase().includes(q)
    })

    const handleSendReminder = async () => {
        setReminding(true)
        const tId = toast.loading('Dispatching SMS & in-app dues reminders…')
        try {
            const res = await fetch('/api/copteller/admin/dues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'remind',
                    count: pendingCount + overdueCount
                })
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to dispatch reminders')
            }
            toast.success(data.message || `SMS reminders sent to members`, { id: tId })
        } catch (err: any) {
            toast.error(err.message || 'Error dispatching reminders', { id: tId })
        } finally {
            setReminding(false)
        }
    }

    const handleToggleConfig = async (id: string) => {
        const nextConfigs = configs.map(c => c.id === id ? { ...c, active: !c.active } : c)
        setConfigs(nextConfigs)
        try {
            await fetch('/api/copteller/admin/dues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'toggle_config',
                    id
                })
            })
            toast.success('Dues configuration updated in core database')
        } catch (err) {
            console.error('Error toggling config:', err)
        }
    }

    const handleSaveNew = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCategory || !newAmount) return toast.error('Category and amount are required')
        setSaving(true)
        const tId = toast.loading('Creating dues schedule in cooperative database…')
        try {
            const res = await fetch('/api/copteller/admin/dues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_schedule',
                    category: newCategory,
                    description: newDesc,
                    amount: Number(newAmount),
                    frequency: newFreq,
                    mandatory: newMandatory
                })
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to create schedule')
            }
            toast.success('Dues schedule created and saved to database!', { id: tId })
            setNewCategory('')
            setNewDesc('')
            setNewAmount('')
            setActiveTab('schedule')
            fetchDuesData()
        } catch (err: any) {
            toast.error(err.message || 'Failed to create dues schedule', { id: tId })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">{coopName}</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Membership Dues Management</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">Configure dues schedules, track live collection ledger entries, and dispatch member reminders.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button onClick={handleSendReminder} disabled={reminding} variant="outline" className="h-9 rounded-xl text-xs font-bold gap-2 w-full sm:w-auto">
                        <Send className={`h-3.5 w-3.5 ${reminding ? 'animate-spin' : ''}`} /> {reminding ? 'Sending…' : 'Send Reminders'}
                    </Button>
                    <Button onClick={() => setActiveTab('new')} className="h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs border-0 gap-2 w-full sm:w-auto">
                        <Plus className="h-3.5 w-3.5" /> New Due Type
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: 'Total Collected (All Time)', val: fmt(totalCollected), icon: Banknote, color: 'emerald' },
                    { label: 'Active Due Types', val: configs.filter(c => c.active).length.toString(), icon: Settings, color: 'amber' },
                    { label: 'Pending Payments', val: pendingCount.toString(), icon: Clock, color: 'amber' },
                    { label: 'Overdue Members', val: overdueCount.toString(), icon: AlertTriangle, color: 'rose' },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-4 shadow-sm min-w-0">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest truncate">{s.label}</p>
                            <s.icon className={`h-3.5 w-3.5 text-${s.color}-500 shrink-0`} />
                        </div>
                        <p className="text-xl font-black truncate">{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="max-w-full overflow-x-auto no-scrollbar whitespace-nowrap">
                <div className="inline-flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                    {(['schedule', 'records', 'new'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-xs font-black capitalize transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                            {tab === 'schedule' ? 'Due Schedules' : tab === 'records' ? 'Member Records' : '+ New Due Type'}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'schedule' && (
                    <motion.div key="schedule" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        <div className="lg:col-span-2 space-y-3">
                            {configs.map((config, i) => (
                                <motion.div key={config.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                    onClick={() => setSelected(selected?.id === config.id ? null : config)}
                                    className={`bg-white dark:bg-slate-950/60 border rounded-2xl p-5 shadow-sm cursor-pointer transition-all ${selected?.id === config.id ? 'border-amber-500/30 ring-1 ring-amber-500/30' : 'border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2.5 rounded-xl ${config.active ? 'bg-amber-500/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                            <Banknote className={`h-4 w-4 ${config.active ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-black">{config.category}</p>
                                                <div className="flex items-center gap-2">
                                                    {config.mandatory && <span className="text-[8px] font-black bg-rose-500/10 text-rose-600 border border-rose-500/20 px-1.5 py-0.5 rounded-full">Mandatory</span>}
                                                    <button onClick={(e) => { e.stopPropagation(); handleToggleConfig(config.id) }}
                                                        className={`text-[9px] font-black px-2.5 py-1 rounded-full border transition-all ${config.active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                                        {config.active ? 'Active' : 'Inactive'}
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">{config.description}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs">
                                                <span className="font-black text-amber-600 dark:text-amber-400">{fmt(config.amount)}</span>
                                                <span className="text-muted-foreground font-semibold capitalize">/ {config.frequency}</span>
                                                <span className="text-muted-foreground font-semibold">Collected: {fmt(config.totalCollected)}</span>
                                            </div>
                                            {config.compliance > 0 && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${config.compliance >= 90 ? 'bg-emerald-500' : config.compliance >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                            style={{ width: `${config.compliance}%` }} />
                                                    </div>
                                                    <span className="text-[9px] font-black text-muted-foreground">{config.compliance}% compliance</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <SidePanelWrapper
                            isOpen={Boolean(selected)}
                            onClose={() => setSelected(null)}
                            title="Dues Category"
                            emptyState={
                                <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 text-center space-y-3 shadow-sm">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit mx-auto"><Banknote className="h-8 w-8 text-slate-300 dark:text-slate-700" /></div>
                                    <p className="text-sm font-black text-muted-foreground">Select a dues type to view details</p>
                                </div>
                            }
                            className="w-full"
                        >
                            {selected && (
                                <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 shadow-sm space-y-4 active-sidepanel-card">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-sm font-black">{selected.category}</h3>
                                        <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 text-center space-y-1">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Collection Rate</p>
                                        <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{selected.compliance}%</p>
                                        <p className="text-xs text-muted-foreground font-semibold">Total collected: {fmt(selected.totalCollected)}</p>
                                    </div>
                                    <div className="space-y-2.5 text-xs font-semibold border-y border-slate-100 dark:border-slate-800 py-4">
                                        {[
                                            { label: 'Amount', val: fmt(selected.amount) },
                                            { label: 'Frequency', val: selected.frequency },
                                            { label: 'Mandatory', val: selected.mandatory ? 'Yes' : 'No' },
                                            { label: 'Status', val: selected.active ? 'Active' : 'Inactive' },
                                        ].map(({ label, val }) => (
                                            <div key={label} className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-bold">{val}</span></div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </SidePanelWrapper>
                    </motion.div>
                )}

                {activeTab === 'records' && (
                    <motion.div key="records" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member, period…"
                                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[550px] text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        {['Member', 'Phone', 'Due Type', 'Period', 'Amount', 'Status'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
                                    {filteredRecords.map((rec, i) => (
                                         <tr key={`${rec.id}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                             <td className="px-4 py-3">
                                                 <p className="font-black">{rec.memberName}</p>
                                                 <p className="text-[9px] text-muted-foreground font-mono">{rec.memberNo}</p>
                                             </td>
                                             <td className="px-4 py-3 font-semibold text-muted-foreground">{rec.phone}</td>
                                             <td className="px-4 py-3 font-bold">{rec.category}</td>
                                             <td className="px-4 py-3 font-semibold text-muted-foreground">{rec.period}</td>
                                             <td className="px-4 py-3 font-black">{fmt(rec.amount)}</td>
                                             <td className="px-4 py-3">
                                                 <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${rec.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : rec.status === 'overdue' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                                     {rec.status}
                                                 </span>
                                                 {rec.paidDate && <p className="text-[9px] text-muted-foreground mt-0.5">{rec.paidDate}</p>}
                                             </td>
                                         </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'new' && (
                    <motion.div key="new" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="max-w-xl">
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                            <h3 className="text-sm font-black">Create New Dues Schedule</h3>
                            <form onSubmit={handleSaveNew} className="space-y-4">
                                {[
                                    { label: 'Category Name', val: newCategory, set: setNewCategory, ph: 'e.g., Development Fund', req: true },
                                    { label: 'Description', val: newDesc, set: setNewDesc, ph: 'Brief description of this dues type', req: false },
                                    { label: 'Amount (₦)', val: newAmount, set: setNewAmount, ph: '5000', req: true, type: 'number' },
                                ].map(({ label, val, set, ph, req, type }) => (
                                    <div key={label}>
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">
                                            {label} {req && <span className="text-rose-500">*</span>}
                                        </label>
                                        <input value={val} onChange={e => set(e.target.value)} placeholder={ph} required={req} type={type || 'text'}
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                    </div>
                                ))}
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Frequency</label>
                                    <select value={newFreq} onChange={e => setNewFreq(e.target.value as any)}
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none">
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annual">Annual</option>
                                        <option value="one-off">One-Off</option>
                                    </select>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={newMandatory} onChange={e => setNewMandatory(e.target.checked)}
                                        className="rounded" />
                                    <span className="text-xs font-bold">Mandatory (members must pay to remain in good standing)</span>
                                </label>
                                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                                    <Button type="button" onClick={() => setActiveTab('schedule')} variant="outline" className="w-full sm:w-auto flex-1 h-10 rounded-xl text-xs font-bold">Cancel</Button>
                                    <Button type="submit" disabled={saving} className="w-full sm:w-auto flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs border-0">
                                        {saving ? <><RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />Saving…</> : 'Create Dues Schedule'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
