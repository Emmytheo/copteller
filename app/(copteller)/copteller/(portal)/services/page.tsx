"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Zap, Search, RefreshCw, CheckCircle2, ArrowRight, ShieldCheck,
    CreditCard, Smartphone, Tv, Lightbulb, PiggyBank, Truck,
    Receipt, Award, DollarSign, X, Check, Copy, Sparkles, Building2,
    FileText, ArrowUpRight, Lock, HelpCircle, ChevronLeft, ChevronRight,
    Wallet
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ClientPortal } from "@/components/copteller/client-portal"
import { DynamicServiceForm } from "@/components/copteller/dynamic-service-form"

type ServiceItem = {
    id: string
    name: string
    description: string
    icon: string
    category: { id: string; name: string; slug: string; icon?: string } | null
    fee_type: string
    fee_value: number
    settlement_type: string
    service_intent: string
    form_schema: any[]
}

type CategoryItem = {
    id: string
    name: string
    slug: string
    icon?: string
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    transfers: CreditCard,
    bills: Lightbulb,
    airtime: Smartphone,
    cable: Tv,
    savings: PiggyBank,
    mobility: Truck,
    dues: Receipt,
    grants: Award,
    insurance: ShieldCheck,
}

export default function UniversalServicesHubPage() {
    const [services, setServices] = React.useState<ServiceItem[]>([])
    const [categories, setCategories] = React.useState<CategoryItem[]>([])
    const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
    const [searchQuery, setSearchQuery] = React.useState<string>("")
    const [isLoading, setIsLoading] = React.useState<boolean>(true)
    const categoryScrollRef = React.useRef<HTMLDivElement>(null)

    const scrollCategories = (direction: 'left' | 'right') => {
        if (categoryScrollRef.current) {
            const amount = direction === 'left' ? -220 : 220
            categoryScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
        }
    }

    // Execution Modal State
    const [activeService, setActiveService] = React.useState<ServiceItem | null>(null)
    const [formData, setFormData] = React.useState<Record<string, any>>({})
    const [isExecuting, setIsExecuting] = React.useState<boolean>(false)
    const [receipt, setReceipt] = React.useState<any>(null)
    const [walletBalance, setWalletBalance] = React.useState<number | null>(null)

    const fetchServices = async () => {
        setIsLoading(true)
        try {
            const [servicesRes, accRes] = await Promise.all([
                fetch("/api/copteller/services"),
                fetch("/api/copteller/accounts").catch(() => null)
            ])
            const data = await servicesRes.json()
            if (data.success) {
                setServices(data.services || [])
                setCategories(data.categories || [])
            }
            if (accRes) {
                const accData = await accRes.json().catch(() => null)
                if (accData?.success && accData.accounts?.length > 0) {
                    const primary = accData.accounts.find((a: any) => a.is_primary) || accData.accounts[0]
                    setWalletBalance(Number(primary.balance || 0) / 100)
                }
            }
        } catch (err) {
            console.error("Failed to load services catalog:", err)
            toast.error("Failed to load available services")
        } finally {
            setIsLoading(false)
        }
    }

    React.useEffect(() => {
        fetchServices()
    }, [])

    const handleOpenService = (service: ServiceItem) => {
        setActiveService(service)
        setReceipt(null)
        const defaults: Record<string, any> = {}
        if (Array.isArray(service.form_schema)) {
            service.form_schema.forEach(field => {
                if (field.name === "amount") defaults[field.name] = 5000
                else defaults[field.name] = ""
            })
        }
        setFormData(defaults)
    }

    const handleInputChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleExecute = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeService) return

        setIsExecuting(true)
        try {
            const res = await fetch("/api/copteller/services/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serviceId: activeService.id, formData }),
            })
            const data = await res.json()

            if (data.success && data.receipt) {
                toast.success(data.message || "Transaction completed successfully!")
                setReceipt(data.receipt)
                if (data.balance !== undefined) {
                    setWalletBalance(data.balance)
                }
            } else {
                toast.error(data.error || "Failed to execute service")
            }
        } catch (err: any) {
            toast.error(err.message || "Network error while processing service")
        } finally {
            setIsExecuting(false)
        }
    }

    const filteredServices = services.filter(service => {
        const matchesCat = selectedCategory === "all" || (service.category && service.category.slug === selectedCategory)
        const matchesSearch = searchQuery === "" ||
            service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.description.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCat && matchesSearch
    })

    let principalAmount = Number(formData.amount) || Number(formData.principal) || 0
    let calculatedFee = 0
    if (activeService) {
        if (activeService.fee_type === "flat") calculatedFee = Number(activeService.fee_value) || 0
        else if (activeService.fee_type === "percentage") calculatedFee = (principalAmount * (Number(activeService.fee_value) || 0)) / 100
    }
    const totalDebit = principalAmount + calculatedFee

    return (
        <div className="min-h-[100dvh] bg-background text-foreground">
            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 right-[20%] w-[400px] h-[400px] bg-emerald-500/3 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-[15%] w-[300px] h-[300px] bg-amber-500/3 dark:bg-amber-500/4 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="p-1.5 bg-primary/10 border border-primary/20 rounded-lg text-primary">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                                Universal Services Hub · Real-time Clearing
                            </p>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Services Catalog &amp; Transactions</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl font-semibold">
                            Execute instant transfers, utility token purchases, health &amp; auto insurance packages, thrift dues payments, and mobility lease settlements.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {walletBalance !== null && (
                            <div className="px-3.5 py-1.5 rounded-2xl bg-card border border-border flex items-center gap-2.5 shadow-sm">
                                <Wallet className="w-4 h-4 text-primary" />
                                <div className="text-right">
                                    <span className="text-[8.5px] text-muted-foreground uppercase font-black block leading-none tracking-wider">Spendable</span>
                                    <span className="text-xs font-black text-primary font-mono">₦{walletBalance.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-card border border-border flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            Kuda Real-time Switch Active
                        </span>
                    </div>
                </div>

                {/* ── CATEGORY PILLS + SEARCH ────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card border border-border/80 p-3 rounded-2xl shadow-sm">
                    <div className="relative w-full lg:w-72 shrink-0">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search services, bills, insurance..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 text-xs rounded-xl h-10 w-full bg-background border-border"
                        />
                    </div>

                    {/* Smooth Pill Carousel with Hidden Native Scrollbars and Desktop Arrow Navigators */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        <Button
                            type="button"
                            onClick={() => scrollCategories('left')}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground hidden sm:flex"
                            title="Scroll Left"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <div
                            ref={categoryScrollRef}
                            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 min-w-0"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <button
                                onClick={() => setSelectedCategory("all")}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                    selectedCategory === "all"
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-black"
                                        : "bg-muted/40 text-muted-foreground border border-border hover:text-foreground hover:bg-muted/70"
                                }`}
                            >
                                All ({services.length})
                            </button>

                            {categories.map(cat => {
                                const Icon = CATEGORY_ICONS[cat.slug] || Zap
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.slug)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                            selectedCategory === cat.slug
                                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-black"
                                                : "bg-muted/40 text-muted-foreground border border-border hover:text-foreground hover:bg-muted/70"
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {cat.name}
                                    </button>
                                )
                            })}
                        </div>

                        <Button
                            type="button"
                            onClick={() => scrollCategories('right')}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground hidden sm:flex"
                            title="Scroll Right"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>

                        <div className="h-5 w-px bg-border shrink-0 hidden sm:block mx-1" />

                        <Button onClick={fetchServices} variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0 text-muted-foreground hover:text-foreground">
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>

                {/* ── SERVICES GRID ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {isLoading ? (
                        <div className="col-span-full py-20 text-center text-muted-foreground">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
                            Loading authorized platform services...
                        </div>
                    ) : filteredServices.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-muted-foreground font-semibold text-sm">
                            No services available in this category.
                        </div>
                    ) : (
                        filteredServices.map(service => {
                            const Icon = CATEGORY_ICONS[service.category?.slug || ""] || Zap
                            return (
                                <motion.div
                                    key={service.id}
                                    whileHover={{ y: -4 }}
                                    transition={{ duration: 0.2 }}
                                    className="p-6 rounded-3xl bg-card border border-border/80 hover:border-primary/40 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl group"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted border border-border text-muted-foreground">
                                                {service.category?.name || "General"}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-black mb-1.5 text-foreground group-hover:text-primary transition-colors">{service.name}</h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-5 leading-relaxed font-semibold">
                                            {service.description || "Fast, automated payment and execution service for cooperative members."}
                                        </p>

                                        <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between text-xs font-mono mb-5">
                                            <span className="text-muted-foreground">Platform Fee:</span>
                                            <span className="text-primary font-black">
                                                {service.fee_type === "none" ? "Free" : service.fee_type === "flat" ? `₦${service.fee_value.toLocaleString()} Flat` : `${service.fee_value}%`}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleOpenService(service)}
                                        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black gap-2 shadow-md shadow-primary/25 rounded-xl border-0"
                                    >
                                        Proceed to Execute <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </motion.div>
                            )
                        })
                    )}
                </div>

            </div>

            {/* ── SERVICE EXECUTION MODAL (IN TRUE PORTAL) ────────────────────── */}
            <ClientPortal>
                <AnimatePresence>
                    {activeService && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="w-full max-w-lg bg-card text-card-foreground border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90dvh] flex flex-col"
                            >
                                {/* Modal Header */}
                                <div className="flex items-center justify-between border-b border-border/70 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-foreground">{activeService.name}</h3>
                                            <span className="text-[11px] text-muted-foreground font-semibold">{activeService.category?.name || "Service Action"}</span>
                                        </div>
                                    </div>
                                    <Button onClick={() => setActiveService(null)} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto space-y-5">
                                    {!receipt ? (
                                        <DynamicServiceForm
                                            service={activeService}
                                            formData={formData}
                                            onChange={handleInputChange}
                                            onSubmit={handleExecute}
                                            isSubmitting={isExecuting}
                                        />
                                    ) : (
                                        /* Digital Receipt */
                                        <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-4 font-mono text-xs">
                                            <div className="text-center pb-3 border-b border-border/70 space-y-1">
                                                <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto mb-2">
                                                    <Check className="w-6 h-6" />
                                                </div>
                                                <h4 className="text-sm font-black font-sans text-foreground">Payment Successful</h4>
                                                <p className="text-[11px] text-muted-foreground">{receipt.notes}</p>
                                            </div>

                                            <div className="space-y-2 text-muted-foreground">
                                                <div className="flex justify-between">
                                                    <span>Reference:</span>
                                                    <span className="text-primary font-bold">{receipt.reference}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Service:</span>
                                                    <span className="font-bold text-foreground">{receipt.serviceName}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Payer:</span>
                                                    <span className="font-bold text-foreground">{receipt.payer?.name}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Total Settled:</span>
                                                    <span className="text-primary font-bold">₦{receipt.totalAmount?.toLocaleString()}</span>
                                                </div>
                                                {receipt.payloadSummary?.generatedToken && (
                                                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center space-y-1 mt-3">
                                                        <span className="text-[10px] uppercase font-bold text-primary">Generated Token Code</span>
                                                        <p className="text-base font-black tracking-widest text-foreground font-mono">{receipt.payloadSummary.generatedToken}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                type="button"
                                                onClick={() => { setActiveService(null); setReceipt(null) }}
                                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black h-10 rounded-xl mt-4 shadow-sm"
                                            >
                                                Done / Close Receipt
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </ClientPortal>
        </div>
    )
}
