"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Zap, Building2, Shield, Settings, Sliders, CheckCircle2,
    RefreshCw, Layers, TrendingUp, DollarSign, Play, Sparkles,
    AlertCircle, Search, ArrowUpRight, HelpCircle, Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Link from "next/link"
import { ClientPortal } from "@/components/copteller/client-portal"

type UnionService = {
    id: string
    name: string
    description: string
    categoryName: string
    categorySlug: string
    fee_type: string
    fee_value: number
    union_markup_allowed: boolean
    settlement_type: string
    service_intent: string
    status: string
    unionEnabled: boolean
    unionFeeMarkup: number
    monthlyVolume: number
    transactionsCount: number
    form_schema: any[]
}

export default function CoopAdminServicesPage() {
    const [services, setServices] = React.useState<UnionService[]>([])
    const [cooperative, setCooperative] = React.useState<any>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [selectedService, setSelectedService] = React.useState<UnionService | null>(null)
    const [markupInput, setMarkupInput] = React.useState<number>(0)
    const [isSaving, setIsSaving] = React.useState(false)

    const fetchAdminServices = async () => {
        setIsLoading(true)
        try {
            const res = await fetch("/api/copteller/admin/services")
            const data = await res.json()
            if (data.success) {
                setServices(data.services || [])
                setCooperative(data.cooperative)
            }
        } catch (err) {
            console.error("Failed to load union services:", err)
            toast.error("Failed to load cooperative services")
        } finally {
            setIsLoading(false)
        }
    }

    React.useEffect(() => { fetchAdminServices() }, [])

    const handleToggleService = (serviceId: string) => {
        setServices(prev => prev.map(s => {
            if (s.id === serviceId) {
                const nextState = !s.unionEnabled
                toast.success(`Service "${s.name}" is now ${nextState ? "Enabled" : "Disabled"} for your union members.`)
                return { ...s, unionEnabled: nextState }
            }
            return s
        }))
    }

    const handleSaveMarkup = (serviceId: string) => {
        setIsSaving(true)
        setTimeout(() => {
            setServices(prev => prev.map(s => {
                if (s.id === serviceId) return { ...s, unionFeeMarkup: Number(markupInput) || 0 }
                return s
            }))
            toast.success(`Union commission updated to ₦${markupInput} for this service.`)
            setSelectedService(null)
            setIsSaving(false)
        }, 400)
    }

    const filtered = services.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const totalEnabled = services.filter(s => s.unionEnabled).length
    const totalVolume = services.reduce((acc, s) => acc + (s.unionEnabled ? s.monthlyVolume : 0), 0)

    return (
        <div className="min-h-[100dvh] bg-background text-foreground">
            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 left-[25%] w-[400px] h-[400px] bg-amber-500/3 dark:bg-amber-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-[15%] w-[300px] h-[300px] bg-emerald-500/3 dark:bg-emerald-500/4 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">

                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                                Cooperative Console · {cooperative?.name || "Abia Tricycle Operators Association"}
                                {cooperative?.sector && <span className="ml-1 text-muted-foreground normal-case">({cooperative.sector.toUpperCase()} Sector)</span>}
                            </p>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">Cooperative Services &amp; Member Provisioning</h1>
                        <p className="text-xs text-muted-foreground mt-1 max-w-2xl font-semibold">
                            Control which banking, transport lease, utility, and payment services are accessible to your union operators, and configure custom union commissions.
                        </p>
                    </div>
                    <div className="shrink-0">
                        <Link href="/copteller/superadmin/services/simulator">
                            <Button variant="outline" className="text-xs font-bold gap-2 h-9 rounded-xl">
                                <Play className="w-3.5 h-3.5 text-emerald-500" />
                                Union Test Sandbox
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* ── KPI STRIP ──────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: "Enabled Union Services", value: `${totalEnabled} / ${services.length}`, sub: "Live in Member Dashboard", color: "emerald" },
                        { label: "Est. Monthly Volume", value: `₦${totalVolume.toLocaleString()}`, sub: "Aggregated across all members", color: "muted" },
                        { label: "Target Sector", value: cooperative?.sector || "Transport", sub: "Keke Hire Purchase & Ajo Optimized", color: "amber" },
                    ].map((stat, i) => (
                        <div key={i} className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                            <p className={`text-2xl font-black capitalize ${stat.color === "emerald" ? "text-emerald-600 dark:text-emerald-400" : stat.color === "amber" ? "text-amber-600 dark:text-amber-400" : ""}`}>
                                {stat.value}
                            </p>
                            <span className="text-[11px] text-muted-foreground font-semibold">{stat.sub}</span>
                        </div>
                    ))}
                </div>

                {/* ── SEARCH BAR ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between gap-4 bg-card border border-border p-3 rounded-2xl">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search union service..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 text-xs rounded-xl h-9"
                        />
                    </div>
                    <Button onClick={fetchAdminServices} variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                </div>

                {/* ── SERVICES GRID ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {isLoading ? (
                        <div className="col-span-full py-16 text-center text-muted-foreground">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-500" />
                            Loading union authorized services...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-muted-foreground font-semibold text-sm">
                            No services found for your union.
                        </div>
                    ) : (
                        filtered.map(service => (
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                                    service.unionEnabled
                                        ? "bg-card border-border shadow-sm hover:shadow-md"
                                        : "bg-muted/20 border-border opacity-60"
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <button
                                            onClick={() => handleToggleService(service.id)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                                                service.unionEnabled
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                    : "bg-muted text-muted-foreground border-border"
                                            }`}
                                        >
                                            {service.unionEnabled ? "Active for Union" : "Disabled"}
                                        </button>
                                    </div>

                                    <h3 className="text-base font-black mb-1">{service.name}</h3>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                                        {service.description || "Platform service provisioned for cooperative union members."}
                                    </p>

                                    <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5 text-xs font-mono mb-4">
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Base Platform Fee:</span>
                                            <span className="font-bold text-foreground">
                                                {service.fee_type === "none" ? "Free" : service.fee_type === "flat" ? `₦${service.fee_value}` : `${service.fee_value}%`}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Union Markup:</span>
                                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                                                {service.unionFeeMarkup > 0 ? `+₦${service.unionFeeMarkup}` : "₦0 (None)"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                                    <Button
                                        onClick={() => { setSelectedService(service); setMarkupInput(service.unionFeeMarkup) }}
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 h-9 text-xs font-bold"
                                    >
                                        <Sliders className="w-3.5 h-3.5 mr-1.5" /> Configure Markup
                                    </Button>
                                    <Link href={`/copteller/superadmin/services/simulator?serviceId=${service.id}`}>
                                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-emerald-500 hover:bg-emerald-500/10 rounded-xl">
                                            <Play className="w-3.5 h-3.5" />
                                        </Button>
                                    </Link>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* ── UNION MARKUP MODAL (IN TRUE PORTAL) ────────────────────────── */}
            <ClientPortal>
                <AnimatePresence>
                    {selectedService && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="w-full max-w-md bg-background border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5 sm:space-y-6"
                            >
                                <div>
                                    <h3 className="text-lg font-black">Configure Union Markup</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Set a local cooperative commission on <span className="font-bold text-foreground">{selectedService.name}</span>.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">Union Welfare Commission (NGN)</Label>
                                    <Input
                                        type="number"
                                        value={markupInput}
                                        onChange={e => setMarkupInput(Number(e.target.value))}
                                        placeholder="e.g. 20"
                                        className="text-sm font-bold rounded-xl h-11"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        This fee is retained in your union&apos;s collections escrow account upon every member transaction.
                                    </p>
                                </div>

                                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-2">
                                    <Button onClick={() => setSelectedService(null)} variant="ghost" className="w-full sm:w-auto text-xs font-bold text-muted-foreground">
                                        Cancel
                                    </Button>
                                    <Button onClick={() => handleSaveMarkup(selectedService.id)} disabled={isSaving} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-2 rounded-xl">
                                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        Save Configuration
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </ClientPortal>
        </div>
    )
}
