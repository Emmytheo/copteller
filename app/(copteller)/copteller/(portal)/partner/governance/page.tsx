"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Settings, Landmark, Building2, UserCheck, ShieldCheck,
    CreditCard, Layers, Plus, Mail, Phone, MapPin, CheckCircle2,
    Clock, RefreshCw, FileText, ArrowUpRight, AlertCircle, Edit3,
    LayoutGrid, List, Sparkles, ExternalLink
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
import { usePartnerOrg } from "@/context/partner-org-context"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

export default function PartnerGovernancePage() {
    const { activeOrg, allSubscopes } = usePartnerOrg()

    // Operational state for officers & subscopes
    const [officers, setOfficers] = React.useState(activeOrg.deskOfficers || [])
    const [escrowBalance, setEscrowBalance] = React.useState(activeOrg.escrowAccount?.availableFloatKobo || 0)
    const [officerViewMode, setOfficerViewMode] = React.useState<"grid" | "list">("list")
    
    // Modal states
    const [isAddOfficerOpen, setIsAddOfficerOpen] = React.useState(false)
    const [isTopUpFloatOpen, setIsTopUpFloatOpen] = React.useState(false)

    // Form inputs
    const [officerForm, setOfficerForm] = React.useState({
        name: "",
        title: "",
        email: "",
        phone: "",
        isLead: false
    })

    const [topUpAmountKobo, setTopUpAmountKobo] = React.useState(500000000) // ₦5,000,000

    React.useEffect(() => {
        setOfficers(activeOrg.deskOfficers || [])
        setEscrowBalance(activeOrg.escrowAccount?.availableFloatKobo || 0)
    }, [activeOrg])

    const handleAddOfficer = (e: React.FormEvent) => {
        e.preventDefault()
        if (!officerForm.name || !officerForm.title || !officerForm.email) {
            toast.error("Please fill in officer name, title, and email")
            return
        }

        const newOfficer = {
            id: `off_${Date.now()}`,
            name: officerForm.name,
            title: officerForm.title,
            email: officerForm.email,
            phone: officerForm.phone || "0803 000 0000",
            isLead: officerForm.isLead
        }

        setOfficers(prev => [newOfficer, ...prev])
        toast.success(`Desk Officer ${officerForm.name} accredited successfully`)
        setIsAddOfficerOpen(false)
        setOfficerForm({ name: "", title: "", email: "", phone: "", isLead: false })
    }

    const handleTopUpFloat = (e: React.FormEvent) => {
        e.preventDefault()
        if (!topUpAmountKobo || topUpAmountKobo <= 0) {
            toast.error("Please enter a valid top-up amount")
            return
        }

        const added = Number(topUpAmountKobo)
        setEscrowBalance(prev => prev + added)
        toast.success(`Float capital injected successfully: +${fmt(added / 100)} into Escrow ${activeOrg.escrowAccount.accountNumber}`)
        setIsTopUpFloatOpen(false)
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8 font-sans">
            
            {/* ── HEADER ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="h-3 w-3" /> Institutional Governance &amp; Escrow
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black border-blue-500/30 text-blue-600 bg-blue-500/5">
                            {activeOrg.shortName} Context
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-black border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                            Verified MOU Mandate
                        </Badge>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                        Governance, Legal Mandate &amp; Escrow Facility
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-3xl font-semibold">
                        Manage statutory legal authority, dedicated Abia MFB escrow float facilities, accredited desk signatories, and operational directorate sub-scopes.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        onClick={() => setIsTopUpFloatOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-4 rounded-xl flex items-center gap-2 shadow-sm border-0"
                    >
                        <Plus className="h-4 w-4" /> Inject Float Capital
                    </Button>
                </div>
            </div>

            {/* ── ESCROW FLOAT FACILITY CARD ─────────────────────────────────── */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white shadow-xl space-y-6 border border-white/10 relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div>
                        <span className="text-[9px] uppercase tracking-widest text-blue-400 font-black block">
                            Dedicated Parastatal Escrow Account
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                            {activeOrg.escrowAccount.accountName}
                        </h3>
                        <p className="text-xs text-white/70 font-semibold mt-0.5">
                            Bank: <strong className="text-white">{activeOrg.escrowAccount.bankName}</strong> • Dedicated Account: <strong className="text-emerald-400 font-mono text-sm">{activeOrg.escrowAccount.accountNumber}</strong>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            onClick={() => setIsTopUpFloatOpen(true)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-md border-0"
                        >
                            <Plus className="h-3.5 w-3.5" /> Top-Up Float
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-white/10 relative z-10">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-white/60 font-black block">Available Float Balance</span>
                        <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">{fmt(escrowBalance / 100)}</p>
                        <span className="text-[10px] text-white/60 font-semibold">Ready for wholesale pre-payments</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-white/60 font-black block">Committed Statutory Pool</span>
                        <p className="text-xl sm:text-2xl font-black text-white font-mono">{fmt(activeOrg.totalCommittedKobo / 100)}</p>
                        <span className="text-[10px] text-white/60 font-semibold">Total program allocation</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-white/60 font-black block">Cumulative Float Disbursed</span>
                        <p className="text-xl sm:text-2xl font-black text-blue-300 font-mono">{fmt(activeOrg.totalDisbursedKobo / 100)}</p>
                        <span className="text-[10px] text-emerald-400 font-bold">72.7% Active Recovery Rate</span>
                    </div>
                </div>
            </div>

            {/* ── TWO-COLUMN: LEGAL PROFILE & SUB-SCOPES ─────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                
                {/* 1. Legal Entity & Mandate Details */}
                <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-blue-600" />
                            <h3 className="text-base font-black text-foreground">Statutory Mandate &amp; Registration</h3>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                            {activeOrg.regNumber}
                        </span>
                    </div>

                    <div className="space-y-4 text-xs">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                                Official Parastatal Mandate
                            </span>
                            <p className="font-semibold text-foreground leading-relaxed bg-muted/30 p-3.5 rounded-2xl border border-border/50">
                                {activeOrg.mandate}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                                    Headquarters Address
                                </span>
                                <p className="font-bold text-foreground">{activeOrg.hqAddress}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                                    Sector &amp; Classification
                                </span>
                                <p className="font-bold text-foreground capitalize">{activeOrg.sector} Sector &bull; {activeOrg.category.replace(/_/g, " ")}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                                    Official Desk Email
                                </span>
                                <p className="font-bold text-blue-600">{activeOrg.contactEmail}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                                    Enrolment Helpline
                                </span>
                                <p className="font-bold text-foreground">{activeOrg.contactPhone}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Directorate Sub-scopes */}
                <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-blue-600" />
                            <h3 className="text-base font-black text-foreground">Operational Directorate Sub-Scopes</h3>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-black border-blue-500/30 text-blue-600">
                            {allSubscopes.length} Active Directorates
                        </Badge>
                    </div>

                    <div className="space-y-3">
                        {allSubscopes.map(sub => (
                            <div key={sub.id} className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-between gap-3 text-xs">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-mono font-black text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md">
                                            {sub.code}
                                        </span>
                                        <h4 className="font-black text-foreground truncate">{sub.name}</h4>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground font-semibold truncate mt-1">{sub.description}</p>
                                </div>

                                <div className="text-right shrink-0">
                                    <span className="font-bold text-foreground block">{sub.activeBeneficiaries.toLocaleString()} Enrollees</span>
                                    <span className="text-[10px] text-emerald-600 font-bold">{fmt(sub.deployedFloatKobo / 100)} float</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── AUTHORIZED DESK OFFICERS SECTION (WITH GRID / LIST TOGGLE) ──── */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                    <div>
                        <h3 className="text-base font-black text-foreground">Accredited Desk Officers &amp; Signatories</h3>
                        <p className="text-xs text-muted-foreground font-semibold">
                            Authorized personnel approved to sign off on float pre-payments, claim reconciliations, and facility accreditation.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Grid / List View Toggle */}
                        <div className="flex items-center bg-muted/40 border border-border/80 rounded-xl p-0.5 shadow-sm shrink-0">
                            <button
                                onClick={() => setOfficerViewMode("grid")}
                                title="Grid View"
                                className={`p-1.5 rounded-lg transition-all ${
                                    officerViewMode === "grid"
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => setOfficerViewMode("list")}
                                title="Table / List View"
                                className={`p-1.5 rounded-lg transition-all ${
                                    officerViewMode === "list"
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <List className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <Button
                            onClick={() => setIsAddOfficerOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-9 px-3 rounded-xl flex items-center gap-1.5"
                        >
                            <Plus className="h-4 w-4" /> Accredit Desk Officer
                        </Button>
                    </div>
                </div>

                {/* Desk Officers Grid View */}
                {officerViewMode === "grid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {officers.map(officer => (
                            <div key={officer.id} className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3 hover:border-blue-500/30 transition-all">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-xs">
                                            {officer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-foreground">{officer.name}</p>
                                            <p className="text-[10px] text-muted-foreground font-semibold">{officer.title}</p>
                                        </div>
                                    </div>
                                    {officer.isLead ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black">
                                            Principal
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[9px] font-semibold text-muted-foreground">
                                            Officer
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-[11px] space-y-1 pt-2 border-t border-border/40">
                                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                                        <Mail className="h-3 w-3 text-blue-500 shrink-0" />
                                        <span className="truncate">{officer.email}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                                        <Phone className="h-3 w-3 text-emerald-500 shrink-0" />
                                        <span className="truncate">{officer.phone}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Desk Officers Table List View */}
                {officerViewMode === "list" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-border/60 text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                    <th className="py-2.5 px-3">Officer Name</th>
                                    <th className="py-2.5 px-3">Official Role / Directorate</th>
                                    <th className="py-2.5 px-3">Contact Email</th>
                                    <th className="py-2.5 px-3">Phone</th>
                                    <th className="py-2.5 px-3 text-center">Authorization Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {officers.map(officer => (
                                    <tr key={officer.id} className="hover:bg-muted/20">
                                        <td className="py-3 px-3 font-bold text-foreground">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-[11px] shrink-0">
                                                    {officer.name.charAt(0)}
                                                </div>
                                                <span>{officer.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 font-semibold text-muted-foreground">
                                            {officer.title}
                                        </td>
                                        <td className="py-3 px-3 font-mono text-[11px] text-blue-600">
                                            {officer.email}
                                        </td>
                                        <td className="py-3 px-3 font-semibold text-muted-foreground">
                                            {officer.phone}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {officer.isLead ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-black">
                                                    Principal Signatory
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                                                    Desk Officer
                                                </Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── ACCREDIT DESK OFFICER MODAL ────────────────────────────────── */}
            <Dialog open={isAddOfficerOpen} onOpenChange={setIsAddOfficerOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl font-sans">
                    <form onSubmit={handleAddOfficer} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black flex items-center gap-2">
                                <UserCheck className="h-5 w-5 text-blue-600" />
                                Accredit Desk Officer
                            </DialogTitle>
                            <DialogDescription className="text-xs font-semibold">
                                Grant official signatory access to an institutional desk officer under {activeOrg.name}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-xs">
                            <div>
                                <label className="font-bold text-foreground block mb-1">Full Name *</label>
                                <Input
                                    placeholder="e.g. Dr. Ngozi Kalu"
                                    value={officerForm.name}
                                    onChange={(e) => setOfficerForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="h-9 rounded-xl"
                                    required
                                />
                            </div>

                            <div>
                                <label className="font-bold text-foreground block mb-1">Official Designation / Title *</label>
                                <Input
                                    placeholder="e.g. Zonal Directorate Head or Claims Lead"
                                    value={officerForm.title}
                                    onChange={(e) => setOfficerForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="h-9 rounded-xl"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Government Email *</label>
                                    <Input
                                        type="email"
                                        placeholder="e.g. nkalu@abshia.abia.gov.ng"
                                        value={officerForm.email}
                                        onChange={(e) => setOfficerForm(prev => ({ ...prev, email: e.target.value }))}
                                        className="h-9 rounded-xl"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Phone Number</label>
                                    <Input
                                        placeholder="e.g. 0803 123 4567"
                                        value={officerForm.phone}
                                        onChange={(e) => setOfficerForm(prev => ({ ...prev, phone: e.target.value }))}
                                        className="h-9 rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/80">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddOfficerOpen(false)}
                                className="h-9 rounded-xl text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="h-9 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Accredit Officer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── INJECT FLOAT CAPITAL MODAL ─────────────────────────────────── */}
            <Dialog open={isTopUpFloatOpen} onOpenChange={setIsTopUpFloatOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl font-sans">
                    <form onSubmit={handleTopUpFloat} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-emerald-500" />
                                Inject Escrow Float Capital
                            </DialogTitle>
                            <DialogDescription className="text-xs font-semibold">
                                Transfer statutory liquidity float into {activeOrg.escrowAccount.accountName} ({activeOrg.escrowAccount.accountNumber}).
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-xs">
                            <div>
                                <label className="font-bold text-foreground block mb-1">Top-Up Amount (Kobo) *</label>
                                <Input
                                    type="number"
                                    value={topUpAmountKobo}
                                    onChange={(e) => setTopUpAmountKobo(Number(e.target.value))}
                                    className="h-9 rounded-xl font-mono text-sm"
                                    required
                                />
                                <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                                    = {fmt(topUpAmountKobo / 100)} Net Liquidity Float
                                </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                                <span className="text-[9px] uppercase tracking-wider font-black text-muted-foreground block">
                                    Settlement Source
                                </span>
                                <p className="text-xs font-bold text-foreground">
                                    Abia MFB Core Banking Treasury Liquidity Line
                                </p>
                                <span className="text-[10px] text-muted-foreground font-semibold block">
                                    Instant credit to partner escrow account
                                </span>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/80">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsTopUpFloatOpen(false)}
                                className="h-9 rounded-xl text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="h-9 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                Authorize Float Injection
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    )
}
