"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Shield, Download, Search, FileBarChart, CheckCircle2,
    AlertTriangle, Clock, XCircle, Filter, Upload, Eye,
    RefreshCw, X, FileText, Calendar, BarChart3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"

type FilingStatus = 'submitted' | 'approved' | 'rejected' | 'draft' | 'overdue'
type RegulatoryBody = 'CBN' | 'NDIC' | 'CAC' | 'FIRS' | 'SEC'

interface ComplianceFiling {
    id: string
    ref: string
    title: string
    body: RegulatoryBody
    category: string
    period: string
    filingDate: string
    deadline: string
    status: FilingStatus
    notes?: string
}

interface AuditLog {
    id: string
    action: string
    actor: string
    timestamp: string
    category: 'access' | 'transaction' | 'configuration' | 'compliance'
}

const STATUS_CFG: Record<FilingStatus, { label: string; cls: string }> = {
    submitted: { label: 'Submitted', cls: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' },
    approved: { label: 'Approved', cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
    rejected: { label: 'Rejected', cls: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' },
    draft: { label: 'Draft', cls: 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300' },
    overdue: { label: 'Overdue', cls: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' },
}

const FILINGS: ComplianceFiling[] = [
    { id: 'fil_001', ref: 'CBN-AML-2026-Q2', title: 'Anti-Money Laundering (AML) Compliance Report Q2 2026', body: 'CBN', category: 'Anti-Money Laundering', period: 'Q2 2026', filingDate: 'Jul 10, 2026', deadline: 'Jul 15, 2026', status: 'approved' },
    { id: 'fil_002', ref: 'NDIC-DEP-2026-H1', title: 'NDIC Insured Deposit Roster — H1 2026', body: 'NDIC', category: 'Deposit Insurance', period: 'H1 2026', filingDate: 'Jun 30, 2026', deadline: 'Jun 30, 2026', status: 'approved' },
    { id: 'fil_003', ref: 'CBN-CAP-2026-06', title: 'Monthly Capital Adequacy Report — June 2026', body: 'CBN', category: 'Prudential', period: 'Jun 2026', filingDate: 'Jul 05, 2026', deadline: 'Jul 07, 2026', status: 'approved' },
    { id: 'fil_004', ref: 'CBN-CAP-2026-07', title: 'Monthly Capital Adequacy Report — July 2026', body: 'CBN', category: 'Prudential', period: 'Jul 2026', filingDate: 'Aug 03, 2026', deadline: 'Aug 07, 2026', status: 'submitted' },
    { id: 'fil_005', ref: 'FIRS-VAT-2026-Q2', title: 'Value Added Tax Return Q2 2026', body: 'FIRS', category: 'Tax', period: 'Q2 2026', filingDate: 'Jul 21, 2026', deadline: 'Jul 21, 2026', status: 'approved' },
    { id: 'fil_006', ref: 'CBN-COOP-2026-Q3', title: 'Cooperative Micro-lending Audit Report Q3 2026', body: 'CBN', category: 'Cooperative Lending', period: 'Q3 2026', filingDate: '', deadline: 'Oct 15, 2026', status: 'draft', notes: 'Data compilation in progress' },
    { id: 'fil_007', ref: 'CBN-AML-2026-Q3', title: 'Anti-Money Laundering (AML) Compliance Report Q3 2026', body: 'CBN', category: 'Anti-Money Laundering', period: 'Q3 2026', filingDate: '', deadline: 'Oct 15, 2026', status: 'draft' },
]

const AUDIT_LOGS: AuditLog[] = [
    { id: 'aud_001', action: 'API credential accessed for Core Banking API', actor: 'superadmin@abiamfb.ng', timestamp: 'Aug 7, 2026 11:42am', category: 'access' },
    { id: 'aud_002', action: 'Grant disbursement approved: ₦250,000 to Kalu Onyekachi', actor: 'admin@abiamfb.ng', timestamp: 'Aug 7, 2026 10:15am', category: 'transaction' },
    { id: 'aud_003', action: 'HP Asset ABA-519 status changed to Defaulted', actor: 'superadmin@abiamfb.ng', timestamp: 'Aug 7, 2026 9:30am', category: 'configuration' },
    { id: 'aud_004', action: 'New cooperative Ariaria Traders Union approved', actor: 'superadmin@abiamfb.ng', timestamp: 'Aug 6, 2026 4:45pm', category: 'compliance' },
    { id: 'aud_005', action: 'AML Report CBN-AML-2026-Q2 submitted to CBN portal', actor: 'compliance@abiamfb.ng', timestamp: 'Aug 6, 2026 2:00pm', category: 'compliance' },
    { id: 'aud_006', action: 'Member Ngozi Eze KYC upgraded to Tier 2', actor: 'admin@abiamfb.ng', timestamp: 'Aug 6, 2026 11:00am', category: 'configuration' },
    { id: 'aud_007', action: 'Workflow "Weekly Ajo Cycle" manually triggered', actor: 'superadmin@abiamfb.ng', timestamp: 'Aug 5, 2026 8:00am', category: 'configuration' },
]

const AUDIT_CAT_STYLE: Record<string, string> = {
    access: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    transaction: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    configuration: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    compliance: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
}

export default function SuperadminCompliancePage() {
    const [filings, setFilings] = React.useState<ComplianceFiling[]>(FILINGS)
    const [search, setSearch] = React.useState('')
    const [bodyFilter, setBodyFilter] = React.useState<string>('all')
    const [statusFilter, setStatusFilter] = React.useState<string>('all')
    const [selectedFiling, setSelectedFiling] = React.useState<ComplianceFiling | null>(null)
    const [generating, setGenerating] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState<'filings' | 'audit'>('filings')

    const stats = {
        total: filings.length,
        approved: filings.filter(f => f.status === 'approved').length,
        submitted: filings.filter(f => f.status === 'submitted').length,
        draft: filings.filter(f => f.status === 'draft').length,
        overdue: filings.filter(f => f.status === 'overdue').length,
    }

    const filtered = filings.filter(f => {
        const matchQ = f.title.toLowerCase().includes(search.toLowerCase()) || f.ref.toLowerCase().includes(search.toLowerCase())
        const matchBody = bodyFilter === 'all' || f.body === bodyFilter
        const matchStatus = statusFilter === 'all' || f.status === statusFilter
        return matchQ && matchBody && matchStatus
    })

    // Fetch live filings and database compliance records on mount
    React.useEffect(() => {
        const fetchCompliance = async () => {
            try {
                const res = await fetch('/api/copteller/superadmin/compliance')
                if (!res.ok) return
                const data = await res.json()
                if (data.filings && data.filings.length > 0) {
                    setFilings(prev => {
                        const existingRefs = new Set(prev.map(p => p.ref))
                        const fresh = data.filings.filter((f: any) => !existingRefs.has(f.ref))
                        return [...fresh, ...prev]
                    })
                }
            } catch (err) {
                console.warn('Failed to load live compliance records:', err)
            }
        }
        fetchCompliance()
    }, [])

    const handleGenerate = async () => {
        setGenerating(true)
        const tId = toast.loading('Compiling real regulatory audit data from live ledger...')
        try {
            const res = await fetch('/api/copteller/superadmin/compliance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regulator: 'CBN', category: 'Prudential Extract' })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to compile compliance report')

            if (data.filing) {
                setFilings(prev => [data.filing, ...prev])
                toast.success(`Audit report ${data.filing.ref} compiled from database and submitted.`, { id: tId })
            }
        } catch (err: any) {
            toast.error(err.message || 'Error generating compliance filing', { id: tId })
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Regulator</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Compliance & Audit Console</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold max-w-2xl">CBN, NDIC, CAC and FIRS regulatory filings, audit trail logs, and compliance metrics.</p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-initial h-9 rounded-xl text-xs font-bold gap-2">
                        <Download className="h-3.5 w-3.5" /> Export CBN Report
                    </Button>
                    <Button onClick={handleGenerate} disabled={generating} className="flex-1 sm:flex-initial h-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs border-0 gap-2">
                        <FileBarChart className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                        {generating ? 'Compiling...' : 'Generate Report'}
                    </Button>
                </div>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                {[
                    { label: 'Total Filings', val: stats.total, color: 'slate', icon: FileText },
                    { label: 'Approved', val: stats.approved, color: 'emerald', icon: CheckCircle2 },
                    { label: 'Submitted', val: stats.submitted, color: 'blue', icon: Upload },
                    { label: 'Drafts', val: stats.draft, color: 'amber', icon: Clock },
                    { label: 'Overdue', val: stats.overdue, color: 'rose', icon: AlertTriangle },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-3.5 sm:p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest truncate">{s.label}</p>
                            <s.icon className={`h-3.5 w-3.5 text-${s.color}-500 shrink-0`} />
                        </div>
                        <p className="text-xl sm:text-2xl font-black">{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl max-w-full overflow-x-auto no-scrollbar">
                {(['filings', 'audit'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-xs font-black capitalize whitespace-nowrap shrink-0 transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        {tab === 'audit' ? 'Audit Trail' : 'Regulatory Filings'}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'filings' && (
                    <motion.div key="filings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Filings Table */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search filings..."
                                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none" />
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {(['all', 'CBN', 'NDIC', 'FIRS'] as const).map(b => (
                                        <button key={b} onClick={() => setBodyFilter(b)}
                                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all ${bodyFilter === b ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-900 text-muted-foreground hover:text-foreground'}`}>
                                            {b === 'all' ? 'All Bodies' : b}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-900/50">
                                {filtered.map((fil, i) => (
                                    <motion.div key={fil.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                                        onClick={() => setSelectedFiling(selectedFiling?.id === fil.id ? null : fil)}
                                        className={`px-4 sm:px-5 py-3.5 sm:py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors ${selectedFiling?.id === fil.id ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}>
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{fil.body}</span>
                                                    <span className="text-[8px] text-muted-foreground font-mono font-bold truncate">{fil.ref}</span>
                                                </div>
                                                <p className="text-xs font-black text-foreground leading-snug">{fil.title}</p>
                                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                                                    {fil.category} · Period: {fil.period} · Deadline: {fil.deadline}
                                                </p>
                                                {fil.notes && <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">{fil.notes}</p>}
                                            </div>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${STATUS_CFG[fil.status].cls}`}>
                                                {STATUS_CFG[fil.status].label}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                                {filtered.length === 0 && (
                                    <div className="py-10 text-center text-[11px] text-muted-foreground">No filings match your search.</div>
                                )}
                            </div>
                        </div>

                        {/* Right: Detail Panel */}
                        <SidePanelWrapper
                            isOpen={Boolean(selectedFiling)}
                            onClose={() => setSelectedFiling(null)}
                            title="Filing Detail"
                            emptyState={
                                <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-sm">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit mx-auto">
                                        <Shield className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                                    </div>
                                    <p className="text-sm font-black text-muted-foreground">Select a filing</p>
                                    <p className="text-[11px] text-muted-foreground/70">Click any filing to see details, submit or download</p>
                                </div>
                            }
                            className="w-full"
                        >
                            {selectedFiling && (
                                <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Filing Detail</span>
                                            <h3 className="text-sm font-black mt-0.5 leading-snug">{selectedFiling.title}</h3>
                                        </div>
                                        <button onClick={() => setSelectedFiling(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-2.5 text-xs font-semibold border-y border-slate-100 dark:border-slate-800 py-4">
                                        {[
                                            { label: 'Reference', val: selectedFiling.ref },
                                            { label: 'Regulatory Body', val: selectedFiling.body },
                                            { label: 'Category', val: selectedFiling.category },
                                            { label: 'Period', val: selectedFiling.period },
                                            { label: 'Filing Date', val: selectedFiling.filingDate || 'Not yet filed' },
                                            { label: 'Deadline', val: selectedFiling.deadline },
                                            { label: 'Status', val: STATUS_CFG[selectedFiling.status].label },
                                        ].map(({ label, val }) => (
                                            <div key={label} className="flex justify-between">
                                                <span className="text-muted-foreground">{label}</span>
                                                <span className="font-bold text-right">{val}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        {selectedFiling.status === 'draft' && (
                                            <Button className="w-full h-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs border-0 gap-2">
                                                <Upload className="h-3.5 w-3.5" /> Submit to {selectedFiling.body}
                                            </Button>
                                        )}
                                        <Button variant="outline" className="w-full h-9 rounded-xl text-xs font-bold gap-2">
                                            <Download className="h-3.5 w-3.5" /> Download Filing PDF
                                        </Button>
                                        <Button variant="outline" className="w-full h-9 rounded-xl text-xs font-bold gap-2">
                                            <Eye className="h-3.5 w-3.5" /> View Submission Log
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </SidePanelWrapper>
                    </motion.div>
                )}

                {activeTab === 'audit' && (
                    <motion.div key="audit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-sm font-black">Platform Audit Trail</h3>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-1.5 rounded-xl">
                                <Download className="h-3.5 w-3.5" /> Export
                            </Button>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-900/50">
                            {AUDIT_LOGS.map((log, i) => (
                                <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                                    className="px-4 sm:px-5 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border capitalize shrink-0 ${AUDIT_CAT_STYLE[log.category]}`}>
                                            {log.category}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-foreground leading-snug">{log.action}</p>
                                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{log.actor}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-semibold shrink-0 sm:text-right pl-7 sm:pl-0">{log.timestamp}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}


