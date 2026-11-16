"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
    Check, X, Loader2, CheckCircle2, Search, ChevronRight, AlertCircle, Banknote, Calendar, User, Package
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

const statusColors: Record<string, string> = {
    approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    disbursed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
}

export default function SuperadminGrantsPage() {
    const [applications, setApplications] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState("all")
    const [selected, setSelected] = React.useState<any | null>(null)
    const [rejectReason, setRejectReason] = React.useState("")
    const [showRejectForm, setShowRejectForm] = React.useState(false)
    const [acting, setActing] = React.useState(false)

    const fetchApplications = async () => {
        try {
            const res = await fetch('/api/copteller/applications')
            const data = await res.json()
            if (data.success) setApplications(data.applications)
        } catch (err) {
            console.warn('Failed to load applications', err)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => { fetchApplications() }, [])

    const updateApp = async (id: string, status: string) => {
        setActing(true)
        const tId = toast.loading(`Updating application...`)
        try {
            const res = await fetch('/api/copteller/applications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(status === 'disbursed' ? "Funds disbursed successfully!" : "Application rejected.", { id: tId })
                fetchApplications()
                setSelected(null)
                setShowRejectForm(false)
                setRejectReason("")
            } else {
                toast.error(data.error || "Action failed", { id: tId })
            }
        } catch {
            toast.error("Network error", { id: tId })
        } finally {
            setActing(false)
        }
    }

    const filtered = applications.filter(a => {
        const matchSearch = a.productName?.toLowerCase().includes(search.toLowerCase()) ||
            a.userName?.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === "all" || a.status === statusFilter
        return matchSearch && matchStatus
    })

    // Refresh selected after data reload
    React.useEffect(() => {
        if (selected) {
            const updated = applications.find(a => a.id === selected.id)
            if (updated) setSelected(updated)
        }
    }, [applications])

    if (loading) return (
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
            <p className="text-muted-foreground font-medium text-sm">Loading disbursement queue...</p>
        </div>
    )

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">

            {/* Header */}
            <div>
                <span className="text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Regulator</span>
                <h1 className="text-2xl sm:text-3xl font-black mt-2">Grant & Loan Applications</h1>
                <p className="text-xs text-muted-foreground mt-1">Review, approve and disburse capital from the central clearing vault.</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: "Total Applications", value: applications.length, color: "text-foreground" },
                    { label: "Pending Review", value: applications.filter(a => a.status === "pending").length, color: "text-amber-600 dark:text-amber-400" },
                    { label: "Disbursed", value: applications.filter(a => a.status === "disbursed").length, color: "text-blue-600 dark:text-blue-400" },
                    { label: "Rejected", value: applications.filter(a => a.status === "rejected").length, color: "text-rose-600 dark:text-rose-400" },
                ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                        <p className={`text-2xl sm:text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* 2-column layout: table + detail panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Applications Table */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filters */}
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name or product..."
                                className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm focus:outline-none focus:border-rose-500"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm font-bold focus:outline-none"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="disbursed">Disbursed</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
                        <div className="min-w-[550px]">
                            <div className="grid grid-cols-5 px-6 py-3 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <span className="col-span-2">Applicant / Product</span>
                                <span>Amount</span>
                                <span>Status</span>
                                <span>Date</span>
                            </div>

                            {filtered.length === 0 ? (
                                <div className="py-16 text-center">
                                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-30" />
                                    <p className="text-sm font-bold text-muted-foreground">No applications match your filters.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filtered.map((app, i) => (
                                        <motion.div
                                            key={app.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                            onClick={() => { setSelected(selected?.id === app.id ? null : app); setShowRejectForm(false) }}
                                            className={`grid grid-cols-5 px-6 py-4 items-center cursor-pointer transition-colors ${selected?.id === app.id ? "bg-rose-50 dark:bg-rose-950/20" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/30"}`}
                                        >
                                            <div className="col-span-2">
                                                <p className="text-sm font-black">{app.userName || "Coop Member"}</p>
                                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{app.productName || "Unknown Product"}</p>
                                            </div>
                                            <span className="text-sm font-black">{fmt(app.amount)}</span>
                                            <span>
                                                <Badge className={`text-[9px] font-black border uppercase ${statusColors[app.status] || statusColors.pending}`}>
                                                    {app.status}
                                                </Badge>
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-muted-foreground">{new Date(app.dateApplied).toLocaleDateString()}</span>
                                                <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${selected?.id === app.id ? "rotate-90" : ""}`} />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Detail Panel */}
                <div className="space-y-4">
                    {selected ? (
                        <motion.div
                            key={selected.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl shadow-sm overflow-hidden sticky top-20"
                        >
                            {/* Status bar */}
                            <div className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border-b ${
                                selected.status === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40' :
                                selected.status === 'disbursed' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40' :
                                'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
                            }`}>
                                {selected.status} Application
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Applicant */}
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Applicant Details</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-sm">
                                            {(selected.userName || "C")[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black">{selected.userName || "Coop Member"}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono">{String(selected.id).substring(0, 12).toUpperCase()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Product & Amount */}
                                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Product</span>
                                        <span className="text-xs font-black">{selected.productName || "Unknown"}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Banknote className="h-3.5 w-3.5" /> Amount</span>
                                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{fmt(selected.amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Applied</span>
                                        <span className="text-xs font-bold">{new Date(selected.dateApplied).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Actions — only for pending */}
                                {selected.status === "pending" && (
                                    <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                                        {!showRejectForm ? (
                                            <>
                                                <Button
                                                    onClick={() => updateApp(selected.id, 'disbursed')}
                                                    disabled={acting}
                                                    className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black text-xs border-0 shadow-lg gap-2"
                                                >
                                                    {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                    Approve & Disburse via Vault
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setShowRejectForm(true)}
                                                    disabled={acting}
                                                    className="w-full h-10 rounded-xl border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-black text-xs gap-2"
                                                >
                                                    <X className="h-4 w-4" /> Reject Application
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="space-y-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl">
                                                <label className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Reason for Rejection</label>
                                                <textarea
                                                    rows={3}
                                                    value={rejectReason}
                                                    onChange={e => setRejectReason(e.target.value)}
                                                    placeholder="Provide a reason for the applicant..."
                                                    className="w-full px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-background text-sm focus:outline-none focus:border-rose-500 resize-none"
                                                />
                                                <div className="flex flex-col-reverse sm:flex-row gap-2">
                                                    <Button variant="outline" onClick={() => { setShowRejectForm(false); setRejectReason("") }} className="w-full sm:flex-1 h-9 rounded-xl text-xs font-bold">
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        onClick={() => updateApp(selected.id, 'rejected')}
                                                        disabled={acting || !rejectReason.trim()}
                                                        className="w-full sm:flex-1 h-9 rounded-xl bg-rose-600 text-white font-black text-xs border-0"
                                                    >
                                                        {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Reject"}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selected.status !== "pending" && (
                                    <div className={`p-4 rounded-2xl text-center border ${selected.status === "disbursed" ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40" : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"}`}>
                                        <p className={`text-sm font-black ${selected.status === "disbursed" ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"}`}>
                                            {selected.status === "disbursed" ? "Funds Disbursed" : "Application Rejected"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">No further actions available.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center empty-state-card">
                            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-sm font-bold text-muted-foreground">Select an application row to review its details and take action.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}


