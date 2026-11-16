"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ShieldCheck, Download, Search, FileBarChart, Filter,
    CheckCircle2, XCircle, Info, RefreshCw, X, Shield,
    Activity, Clock, ChevronRight, Lock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"

interface AuditReport {
    id: string
    title: string
    ref: string
    date: string
    hash: string
    type: 'Settlement' | 'Compliance' | 'Ledger Extract' | 'Risk Review'
    blockRange: string
    verifiedItems: number
    status: 'Verified' | 'Pending'
    reconciled: boolean
    componentsChecked: string[]
}

const INITIAL_REPORTS: AuditReport[] = [
    {
        id: 'aud_90', title: "Weekly Rotational Cycle Settlement Report", ref: "AUD-2026-90",
        date: "Jul 29, 2026", hash: "sha256:88fa7d2011b981f9a2e374ffc189bb519213192084500ea742b981920977bc01",
        type: "Settlement", blockRange: "BLK-89020 - BLK-89190", verifiedItems: 1420, status: "Verified",
        reconciled: true, componentsChecked: ["Ajo Cycle Balances", "Maturity Rotations", "Member Wallets"]
    },
    {
        id: 'aud_89', title: "Weekly Rotational Cycle Settlement Report", ref: "AUD-2026-89",
        date: "Jul 22, 2026", hash: "sha256:77bc0210b981f9a2e374ffc189bb519213192084500ea742b981920988fa7d20",
        type: "Settlement", blockRange: "BLK-88850 - BLK-89019", verifiedItems: 1390, status: "Verified",
        reconciled: true, componentsChecked: ["Ajo Cycle Balances", "Maturity Rotations", "Member Wallets"]
    },
    {
        id: 'aud_06', title: "Monthly Reserve Escrow Compliance Audit", ref: "AUD-2026-06",
        date: "Jul 01, 2026", hash: "sha256:119ea73456ff1239aa88fa7d2011b981f9a2e374ffc189bb519213192084500ea",
        type: "Compliance", blockRange: "BLK-87200 - BLK-88849", verifiedItems: 5210, status: "Verified",
        reconciled: true, componentsChecked: ["Reserve Escrow Balance", "Compliance Ratio (30%)", "CAC/CBN Limits"]
    },
    {
        id: 'aud_91', title: "Active HP Asset Risk & Collateral Audit", ref: "AUD-2026-91",
        date: "Aug 02, 2026", hash: "sha256:fa90a2e374ffc189bb519213192084500ea742b981920977bc0188fa7d2011b981",
        type: "Risk Review", blockRange: "BLK-89191 - BLK-89250", verifiedItems: 48, status: "Verified",
        reconciled: true, componentsChecked: ["HP Asset Repayments", "Missed Dues Tracker", "Operator Scores"]
    }
]

export default function AuditReportsPage() {
    const [reports, setReports] = React.useState<AuditReport[]>(INITIAL_REPORTS)
    const [search, setSearch] = React.useState("")
    const [filterType, setFilterType] = React.useState<string>("all")
    const [selected, setSelected] = React.useState<AuditReport | null>(null)
    const [generating, setGenerating] = React.useState(false)

    const filtered = reports.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.ref.toLowerCase().includes(search.toLowerCase())
        const matchesFilter = filterType === 'all' || r.type === filterType
        return matchesSearch && matchesFilter
    })

    const handleGenerateReport = () => {
        setGenerating(true)
        const tId = toast.loading("Compiling cryptographic audit logs from core ledgers...")
        
        setTimeout(() => {
            const newRep: AuditReport = {
                id: `aud_${Date.now()}`,
                title: "On-Demand Core Ledger Audit Extract",
                ref: `AUD-2026-${Math.floor(100 + Math.random() * 900)}`,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                hash: `sha256:${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}...`,
                type: "Ledger Extract",
                blockRange: `BLK-${Math.floor(89251 + Math.random() * 100)} - BLK-${Math.floor(89350 + Math.random() * 100)}`,
                verifiedItems: Math.floor(500 + Math.random() * 2000),
                status: "Verified",
                reconciled: true,
                componentsChecked: ["Core Ledger Balances", "Escrow Accounts", "Clearing History"]
            }
            setReports(prev => [newRep, ...prev])
            setSelected(newRep)
            toast.success("Audit PDF Report compiled, hashed, and verified successfully.", { id: tId })
            setGenerating(false)
        }, 1500)
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Security & Audit</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Audit Reports Logs</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">Audit logs and cryptographic proof seals compiled from daily clearance blocks for regulatory inspection.</p>
                </div>
                <Button onClick={handleGenerateReport} disabled={generating} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-black h-10 rounded-xl text-xs shrink-0 flex items-center justify-center gap-2 border-0 shadow-lg">
                    <FileBarChart className="h-4 w-4" /> {generating ? 'Compiling PDF...' : 'Generate Audit PDF'}
                </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: 'Verified Reports', val: reports.filter(r => r.status === 'Verified').length.toString() },
                    { label: 'Total Verified Entries', val: reports.reduce((a, r) => a + r.verifiedItems, 0).toLocaleString() },
                    { label: 'Audit Status', val: '100% Reconciled' },
                    { label: 'Last Audited Block', val: 'BLK-89250' },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-4 shadow-sm">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                        <p className="text-base sm:text-lg font-black mt-1 text-foreground">{s.val}</p>
                    </div>
                ))}
            </div>

            {/* 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Column: Reports Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search report or reference..."
                                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            {(['all', 'Settlement', 'Compliance', 'Risk Review'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setFilterType(t)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black capitalize transition-all ${filterType === t ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-900 text-muted-foreground hover:text-foreground'}`}
                                >
                                    {t === 'all' ? 'All Types' : t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="divide-y divide-slate-50 dark:divide-slate-900/50">
                        {filtered.map((rep) => (
                            <div
                                key={rep.id}
                                onClick={() => setSelected(selected?.id === rep.id ? null : rep)}
                                className={`px-5 py-4 cursor-pointer flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${selected?.id === rep.id ? 'bg-amber-500/10' : ''}`}
                            >
                                <div className="flex gap-4 items-center min-w-0">
                                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-amber-500 shadow-sm shrink-0">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{rep.type}</span>
                                            <span className="text-[9px] text-muted-foreground font-mono font-bold">{rep.ref}</span>
                                        </div>
                                        <p className="font-bold text-foreground text-sm truncate leading-snug">{rep.title}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Checked {rep.date} · Range: {rep.blockRange}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[9px] font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                        {rep.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Audit details & proof */}
                <SidePanelWrapper
                    isOpen={Boolean(selected)}
                    onClose={() => setSelected(null)}
                    title="Audit Verification"
                    emptyState={
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 text-center space-y-3 shadow-sm">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit mx-auto">
                                <Shield className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            </div>
                            <p className="text-sm font-black text-muted-foreground font-black">Audit Detail Panel</p>
                            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                                Click any cryptographic seal in the ledger list to view its full SHA-256 block proof hash, verified components checked, and verification certifications.
                            </p>
                        </div>
                    }
                    className="w-full"
                >
                    {selected && (
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 shadow-sm space-y-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Audit Verification</span>
                                    <h3 className="text-base font-black mt-1 leading-snug">{selected.title}</h3>
                                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{selected.ref}</p>
                                </div>
                                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 space-y-3">
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Cryptographic Seal (SHA-256)</p>
                                    <code className="block text-[10px] text-slate-500 font-mono bg-white dark:bg-slate-950 p-2.5 rounded border border-slate-100 dark:border-slate-800 break-all mt-1.5 leading-relaxed font-bold">
                                        {selected.hash}
                                    </code>
                                </div>
                            </div>

                            <div className="space-y-3 text-xs font-semibold border-y border-slate-100 dark:border-slate-800 py-4">
                                <div className="flex justify-between"><span className="text-muted-foreground">Block Coverage</span><span className="font-bold">{selected.blockRange}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Verified Entries</span><span className="font-bold">{selected.verifiedItems.toLocaleString()} records</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Ledger Reconciled</span><span className="font-bold text-emerald-600">YES ✓</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Encryption Seal</span><span className="font-bold">AES-GCM-256</span></div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Components Checked</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {selected.componentsChecked.map(c => (
                                        <span key={c} className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Button variant="outline" className="w-full h-9 rounded-xl text-xs font-bold gap-2">
                                    <Download className="h-3.5 w-3.5" /> Download Hashed PDF
                                </Button>
                            </div>
                        </div>
                    )}
                </SidePanelWrapper>
            </div>
        </div>
    )
}

