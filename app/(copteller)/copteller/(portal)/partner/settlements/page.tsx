"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    CircleDollarSign, Landmark, TrendingUp, ArrowDownLeft,
    ArrowUpRight, RefreshCw, Search, Plus, ShieldCheck,
    CheckCircle2, Clock, AlertCircle, Layers, FileText, Download,
    LayoutGrid, List, Sparkles, CreditCard
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { INSTITUTIONAL_PARTNERS } from "@/lib/data/partner-directory"
import { SettlementLedgerEntry } from "@/app/api/copteller/partner/settlements/route"
import { usePartnerOrg } from "@/context/partner-org-context"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

export default function FloatSettlementsPage() {
    const { activeOrg, activeOrgSlug, activeSubscope } = usePartnerOrg()

    const [ledger, setLedger] = React.useState<SettlementLedgerEntry[]>([])
    const [summary, setSummary] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)
    const [selectedType, setSelectedType] = React.useState("all")
    const [searchQuery, setSearchQuery] = React.useState("")
    const [viewMode, setViewMode] = React.useState<"list" | "grid">("list")
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
    const [submitting, setSubmitting] = React.useState(false)

    // Form state for recording a settlement outflow/claim
    const [formData, setFormData] = React.useState<{
        partnerSlug: string
        sector: string
        entryType: string
        description: string
        counterparty: string
        amountKobo: number
    }>({
        partnerSlug: activeOrgSlug,
        sector: activeOrg.sector === "multi_sector" ? "health" : activeOrg.sector,
        entryType: "wholesale_float_outflow",
        description: "",
        counterparty: "",
        amountKobo: 500000000 // ₦5,000,000
    })

    React.useEffect(() => {
        setFormData(prev => ({
            ...prev,
            partnerSlug: activeOrgSlug,
            sector: activeOrg.sector === "multi_sector" ? "health" : activeOrg.sector
        }))
    }, [activeOrgSlug, activeOrg])

    const fetchLedger = async () => {
        try {
            setLoading(true)
            const queryParams = new URLSearchParams()
            queryParams.set("partner", activeOrgSlug)
            if (selectedType !== "all") queryParams.set("type", selectedType)
            if (searchQuery.trim()) queryParams.set("search", searchQuery.trim())

            const res = await fetch(`/api/copteller/partner/settlements?${queryParams.toString()}`)
            const data = await res.json()
            if (data.success) {
                setLedger(data.ledger || [])
                setSummary(data.summary)
            }
        } catch (err) {
            console.error("Failed to load settlement ledger:", err)
            toast.error("Failed to load float settlements")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchLedger()
    }, [activeOrgSlug, selectedType, searchQuery])

    const handleCreateSettlement = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.description || !formData.counterparty || !formData.amountKobo) {
            toast.error("Please fill in description, counterparty, and amount")
            return
        }

        try {
            setSubmitting(true)
            const res = await fetch("/api/copteller/partner/settlements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (data.success) {
                toast.success(data.message || "Settlement recorded successfully")
                setIsAddModalOpen(false)
                setFormData({
                    partnerSlug: activeOrgSlug,
                    sector: activeOrg.sector === "multi_sector" ? "health" : activeOrg.sector,
                    entryType: "wholesale_float_outflow",
                    description: "",
                    counterparty: "",
                    amountKobo: 500000000
                })
                fetchLedger()
            } else {
                toast.error(data.error || "Failed to record settlement")
            }
        } catch (err) {
            toast.error("Network error recording settlement")
        } finally {
            setSubmitting(false)
        }
    }

    const handleExportStatement = () => {
        if (ledger.length === 0) {
            toast.error("No transactions to export")
            return
        }

        const headers = ["Reference", "Date", "Partner", "Type", "Direction", "Counterparty", "Amount (NGN)", "Status"]
        const rows = ledger.map(item => [
            `"${item.reference}"`,
            `"${item.timestamp}"`,
            `"${item.partnerName}"`,
            `"${item.entryType}"`,
            item.direction.toUpperCase(),
            `"${item.counterparty}"`,
            (item.amountKobo / 100).toFixed(2),
            item.status
        ])

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `${activeOrg.slug}_escrow_ledger_${Date.now()}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("Settlement statement exported successfully")
    }

    const isHealth = activeOrg.sector === "health"
    const typeFilters = [
        { value: "all", label: "All Transactions" },
        { value: "wholesale_float_outflow", label: "Wholesale Pre-Payments" },
        { value: "member_repayment_inflow", label: "Member Inflows" },
        { value: "margin_spread_accrual", label: "Spread Margin Realized" },
        { 
            value: "provider_claim_payout", 
            label: isHealth ? "Hospital Claims Payout" : "Workshop & Depot Claims" 
        },
    ]

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-6 font-sans">
            
            {/* ── HEADER ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <CircleDollarSign className="h-3 w-3" /> {activeOrg.shortName} Escrow Ledger
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                            Account: {activeOrg.escrowAccount.accountNumber}
                        </Badge>
                        {activeSubscope && (
                            <Badge variant="secondary" className="text-[10px] font-black bg-blue-500/10 text-blue-600">
                                {activeSubscope.name}
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground">
                        Float Liquidity &amp; Settlement Ledger
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-3xl font-semibold">
                        Audit trail of wholesale capital deployments, member micro-repayment daily sweeps, net financing spread margins, and accredited provider claim settlements.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        onClick={handleExportStatement}
                        className="h-9 sm:h-10 rounded-xl font-bold text-xs flex items-center gap-1.5 border-border bg-card"
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Export Statement</span>
                    </Button>

                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-9 sm:h-10 rounded-xl flex items-center gap-1.5 shadow-sm border-0"
                    >
                        <Plus className="h-4 w-4" /> Record Settlement
                    </Button>
                </div>
            </div>

            {/* ── METRIC STRIP ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Wholesale Outflows
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 leading-tight">
                        {fmt((summary?.totalWholesaleOutflowKobo || 0) / 100)}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold">Disbursed bulk float</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Micro-Inflows Recovered
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                        {fmt((summary?.totalMemberInflowsKobo || 0) / 100)}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold">Daily Ajo sweeps &amp; debits</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Net Spread Margin
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400 leading-tight">
                        {fmt((summary?.totalMarginSpreadKobo || 0) / 100)}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold">Realized yield spread</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Escrow Float Available
                    </span>
                    <p className="text-lg sm:text-2xl font-black text-foreground leading-tight">
                        {fmt(activeOrg.escrowAccount.availableFloatKobo / 100)}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold">Account #{activeOrg.escrowAccount.accountNumber}</p>
                </div>
            </div>

            {/* ── CONTEXT-SPECIFIC FILTERS & GRID/LIST TOGGLE ─────────────────── */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar">
                    {typeFilters.map(t => (
                        <button
                            key={t.value}
                            onClick={() => setSelectedType(t.value)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                                selectedType === t.value
                                    ? "bg-white dark:bg-slate-800 text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search reference, counterparty..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9 text-xs rounded-xl"
                        />
                    </div>

                    {/* Grid vs List View Toggle */}
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-border/60 shrink-0">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === "list"
                                    ? "bg-white dark:bg-slate-800 text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                            title="Dense List/Table View"
                        >
                            <List className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === "grid"
                                    ? "bg-white dark:bg-slate-800 text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                            title="Grid Card View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── SETTLEMENT LEDGER (LIST OR GRID VIEW) ───────────────────────── */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-sm font-bold text-muted-foreground">Loading settlement ledger...</p>
                </div>
            ) : ledger.length === 0 ? (
                <div className="p-10 text-center rounded-3xl border border-dashed border-border bg-card/50 space-y-3">
                    <CircleDollarSign className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                    <h3 className="text-base font-bold text-foreground">No ledger transactions found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        No settlement entries match the current filter parameters for {activeOrg.shortName}.
                    </p>
                </div>
            ) : viewMode === "list" ? (
                /* ── DENSE TABLE VIEW ────────────────────────────────────────── */
                <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse text-xs font-sans">
                            <thead>
                                <tr className="border-b border-border/80 bg-muted/40 text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                    <th className="py-3 px-4">Reference &amp; Date</th>
                                    <th className="py-3 px-4">Transaction Type</th>
                                    <th className="py-3 px-4">Description &amp; Counterparty</th>
                                    <th className="py-3 px-4 text-right">Amount</th>
                                    <th className="py-3 px-4 text-center">Direction</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {ledger.map(item => {
                                    const isCredit = item.direction === "credit"
                                    return (
                                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-4 font-bold text-foreground">
                                                <div className="font-mono text-xs">{item.reference}</div>
                                                <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(item.timestamp).toLocaleDateString("en-NG", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric"
                                                    })}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 font-semibold text-muted-foreground">
                                                <span className="capitalize">{item.entryType.replace(/_/g, " ")}</span>
                                            </td>

                                            <td className="py-3 px-4 max-w-xs">
                                                <div className="font-bold text-foreground truncate">{item.description}</div>
                                                <div className="text-[10px] text-muted-foreground font-semibold truncate mt-0.5">
                                                    Counterparty: {item.counterparty}
                                                </div>
                                            </td>

                                            <td className={`py-3 px-4 text-right font-black ${
                                                isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                            }`}>
                                                {isCredit ? "+" : "-"}{fmt(item.amountKobo / 100)}
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                    isCredit ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                                }`}>
                                                    {isCredit ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                                    {item.direction.toUpperCase()}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black uppercase">
                                                    {item.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ── GRID CARD VIEW ─────────────────────────────────────────── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {ledger.map(item => {
                        const isCredit = item.direction === "credit"
                        return (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-3xl bg-card border border-border/80 shadow-sm hover:border-blue-500/30 transition-all space-y-3 flex flex-col justify-between"
                            >
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[10px] font-black text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">
                                            {item.reference}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                                            isCredit ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                        }`}>
                                            {isCredit ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                            {item.direction.toUpperCase()}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-base font-black text-foreground">{item.description}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Counterparty: {item.counterparty}</p>
                                    </div>

                                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-black text-muted-foreground">Amount</span>
                                        <span className={`text-base font-black ${
                                            isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                        }`}>
                                            {isCredit ? "+" : "-"}{fmt(item.amountKobo / 100)}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-semibold">
                                    <span className="flex items-center gap-1 text-[10px]">
                                        <Clock className="h-3 w-3" />
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </span>
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black uppercase">
                                        {item.status}
                                    </Badge>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* ── RECORD SETTLEMENT MODAL ────────────────────────────────────── */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl font-sans">
                    <form onSubmit={handleCreateSettlement} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black flex items-center gap-2">
                                <CircleDollarSign className="h-5 w-5 text-blue-600" />
                                Record Settlement for {activeOrg.shortName}
                            </DialogTitle>
                            <DialogDescription className="text-xs font-semibold">
                                Record a wholesale float pre-payment, provider claim reimbursement, or micro-amortization batch.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-xs">
                            <div>
                                <label className="font-bold text-foreground block mb-1">Transaction Type *</label>
                                <select
                                    value={formData.entryType}
                                    onChange={(e) => setFormData(prev => ({ ...prev, entryType: e.target.value }))}
                                    className="w-full h-9 rounded-xl border border-input bg-background px-3 font-semibold text-foreground focus:outline-none capitalize"
                                >
                                    <option value="wholesale_float_outflow">Wholesale Float Pre-Payment (Outflow)</option>
                                    <option value="provider_claim_payout">{isHealth ? "Hospital Claim Settlement (Outflow)" : "Workshop & Depot Claim (Outflow)"}</option>
                                    <option value="member_repayment_inflow">Member Micro-Amortization Sweep (Inflow)</option>
                                    <option value="margin_spread_accrual">Spread Margin Yield Realization (Inflow)</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-foreground block mb-1">Description / Memo *</label>
                                <Input
                                    placeholder="e.g. Bulk capitation tranche 3 or surgical claim settlement"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="h-9 rounded-xl"
                                    required
                                />
                            </div>

                            <div>
                                <label className="font-bold text-foreground block mb-1">Counterparty (Beneficiary / Bank / Hospital) *</label>
                                <Input
                                    placeholder={isHealth ? "e.g. ABSUTH Teaching Hospital or Primary Cooperative" : "e.g. TVS Assembly Diagnostics Hub"}
                                    value={formData.counterparty}
                                    onChange={(e) => setFormData(prev => ({ ...prev, counterparty: e.target.value }))}
                                    className="h-9 rounded-xl"
                                    required
                                />
                            </div>

                            <div>
                                <label className="font-bold text-foreground block mb-1">Amount (Kobo) *</label>
                                <Input
                                    type="number"
                                    placeholder="500000000 (₦5,000,000)"
                                    value={formData.amountKobo}
                                    onChange={(e) => setFormData(prev => ({ ...prev, amountKobo: Number(e.target.value) }))}
                                    className="h-9 rounded-xl"
                                    required
                                />
                                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                    = {fmt(formData.amountKobo / 100)}
                                </span>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/80">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddModalOpen(false)}
                                className="h-9 rounded-xl text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="h-9 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {submitting ? "Posting..." : "Post Settlement Entry"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    )
}
