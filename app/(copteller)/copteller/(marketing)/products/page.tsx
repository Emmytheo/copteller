"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Search, ArrowRight, X, ShieldCheck, Award,
    PiggyBank, Truck, Coins, Lock, Wallet, Info,
    AlertCircle
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ClientPortal } from "@/components/copteller/client-portal"

const CATEGORIES = [
    { value: "all", label: "All Products", icon: "🌐" },
    { value: "ajo_rotation", label: "Ajo / Thrift", icon: "🔄" },
    { value: "hire_purchase", label: "Hire Purchase", icon: "🚛" },
    { value: "micro_loan", label: "Micro Loans", icon: "💰" },
    { value: "grant", label: "Grants & Tools", icon: "🏛️" },
    { value: "cooperative_bond", label: "Savings Bonds", icon: "🔐" },
]

export default function CooperativeProductRegistryPage() {
    const [products, setProducts] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [selectedCategory, setSelectedCategory] = React.useState("all")
    const [activeProduct, setActiveProduct] = React.useState<any | null>(null)

    React.useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/copteller/products?status=active')
                const json = await res.json()
                if (json.data) {
                    setProducts(json.data)
                }
            } catch (err) {
                console.error("Failed to load products:", err)
                toast.error("Failed to load active cooperative products")
            } finally {
                setLoading(false)
            }
        }
        fetchProducts()
    }, [])

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesCategory = selectedCategory === "all" || p.product_type === selectedCategory
        return matchesSearch && matchesCategory
    })

    const formatAmount = (num: number) => {
        return `₦${(num / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`
    }

    const getIcon = (type: string) => {
        switch (type) {
            case "ajo_rotation": return <PiggyBank className="h-6 w-6" />
            case "hire_purchase": return <Truck className="h-6 w-6" />
            case "micro_loan": return <Coins className="h-6 w-6" />
            case "grant": return <Award className="h-6 w-6" />
            case "cooperative_bond": return <Lock className="h-6 w-6" />
            default: return <Wallet className="h-6 w-6" />
        }
    }

    const getCategoryBadge = (type: string) => {
        switch (type) {
            case "ajo_rotation": return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-bold uppercase text-[9px] tracking-wider">Ajo Cycle</Badge>
            case "hire_purchase": return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none font-bold uppercase text-[9px] tracking-wider">Hire Purchase</Badge>
            case "micro_loan": return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none font-bold uppercase text-[9px] tracking-wider">Micro Loan</Badge>
            case "grant": return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-none font-bold uppercase text-[9px] tracking-wider">Tool Grant</Badge>
            default: return <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-none font-bold uppercase text-[9px] tracking-wider">Savings Bond</Badge>
        }
    }

    return (
        <div className="bg-background text-foreground min-h-[100dvh] py-16 px-6 md:px-8 relative overflow-hidden font-sans">
            {/* Ambient background glows */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/5 dark:bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-amber-600/5 dark:bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                {/* Header */}
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest">
                        Union Product Catalog
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                        Cooperative Schemes Registry
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Explore financial product templates approved and audited by partner Microfinance Banks. Filter schemes, review eligibility terms, and apply directly.
                    </p>
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 flex flex-col md:flex-row gap-4 items-center shadow-sm">
                    <div className="relative w-full md:flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search schemes, assets, or loan criteria..."
                            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setSelectedCategory(cat.value)}
                                className={`px-4 h-11 rounded-xl text-xs font-black shrink-0 transition-all border ${
                                    selectedCategory === cat.value
                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                                        : 'border-slate-200 dark:border-slate-800 bg-background text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <span className="mr-1.5">{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading state */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <svg className="animate-spin h-8 w-8 text-emerald-500" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider animate-pulse">Loading active schemes registry...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-950/20 border-2 border-dashed rounded-3xl space-y-3">
                        <AlertCircle className="h-10 w-10 text-slate-400 mx-auto" />
                        <h4 className="text-base font-black">No Schemes Found</h4>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">No cooperative product templates match your search criteria. Check back later or adjust filters.</p>
                    </div>
                ) : (
                    /* Products Grid */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {filteredProducts.map(p => {
                            const showRate = p.interest_rate > 0
                            return (
                                <motion.div
                                    key={p.id}
                                    layout
                                    className="bg-white dark:bg-slate-950/30 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 flex flex-col justify-between hover:border-emerald-500/20 hover:shadow-lg transition-all duration-300 relative group"
                                >
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="p-3 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-emerald-400 rounded-2xl">
                                                {getIcon(p.product_type)}
                                            </div>
                                            {getCategoryBadge(p.product_type)}
                                        </div>

                                        <div className="space-y-1.5">
                                            <h3 className="text-lg font-black text-foreground">{p.name}</h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed font-semibold line-clamp-2">{p.description}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 dark:border-slate-900 text-xs font-bold">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground font-black uppercase">Limits</p>
                                                <p className="font-extrabold text-foreground mt-0.5">
                                                    {formatAmount(p.min_amount)} - {formatAmount(p.max_amount)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground font-black uppercase">Rate / Yield</p>
                                                <p className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                    {showRate ? `${p.interest_rate}% p.a.` : "Interest Free"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between">
                                        <button
                                            onClick={() => setActiveProduct(p)}
                                            className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                                        >
                                            View Requirements <Info className="h-3.5 w-3.5 shrink-0" />
                                        </button>
                                        <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs px-4 h-8 rounded-lg border-none shadow-md">
                                            <Link href="/copteller/onboarding/member">Apply →</Link>
                                        </Button>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )}

                {/* Testimonials or trust summary */}
                <div className="bg-gradient-to-br from-emerald-500/5 to-amber-500/5 border border-emerald-500/10 rounded-3xl p-8 max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 justify-between text-center md:text-left">
                    <div className="space-y-2 font-bold">
                        <h4 className="text-lg font-black text-foreground">Need a custom product for your Union?</h4>
                        <p className="text-xs text-muted-foreground font-semibold leading-relaxed max-w-md">
                            Trade guild administrators can request customized savings cycles, special Hire Purchase split pools, or dedicated tools grants cleared by the Microfinance Bank.
                        </p>
                    </div>
                    <Button asChild className="bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black h-12 px-6 rounded-xl text-xs shrink-0 border-none shadow-lg">
                        <Link href="/copteller/onboarding/admin">Register Cooperative Admin <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </div>
            </div>

            {/* Slide-out detail drawer / Modal for requirements (wrapped in ClientPortal for absolute viewport precision) */}
            <ClientPortal>
                <AnimatePresence>
                    {activeProduct && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setActiveProduct(null)}
                                className="fixed inset-0 bg-transparent"
                            />

                            {/* Modal Dialog Content */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                                className="relative w-full max-w-lg bg-card text-card-foreground border border-border rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 overflow-y-auto max-h-[90dvh] z-10"
                            >
                                <div className="flex justify-between items-start border-b border-border/60 pb-4">
                                    <div className="space-y-1">
                                        {getCategoryBadge(activeProduct.product_type)}
                                        <h3 className="text-xl font-black text-foreground mt-1.5">{activeProduct.name}</h3>
                                    </div>
                                    <button
                                        onClick={() => setActiveProduct(null)}
                                        className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-all"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                                    {activeProduct.description || "No description specified for this scheme product."}
                                </p>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase text-foreground tracking-wider">Baseline Parameters</h4>
                                    <div className="grid grid-cols-2 gap-4 text-xs bg-muted/40 p-4 border border-border/60 rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-border/60">
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">Contribution Limit</p>
                                            <p className="font-extrabold text-foreground">{formatAmount(activeProduct.min_amount)} - {formatAmount(activeProduct.max_amount)}</p>
                                        </div>
                                        <div className="space-y-1.5 pl-0 sm:pl-4 pt-3 sm:pt-0">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">Clearing Rate / Yield</p>
                                            <p className="font-extrabold text-primary">
                                                {activeProduct.interest_rate > 0 ? `${activeProduct.interest_rate}% Interest Yield` : "Interest-Free Cycle"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Eligibility rules */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black uppercase text-foreground tracking-wider">Eligibility Requirements</h4>
                                    <div className="space-y-2.5">
                                        {[
                                            { title: "NIBSS BVN Verification", desc: "Must verify identity via matching Bank Verification Number." },
                                            { title: "Active Trade Union Membership", desc: "Requires joining an approved local transport or market cooperative society." },
                                            { title: "Escrow Reserve Handshake", desc: "Must fund initial member deposits inside Partner MFB vaults." }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex gap-3 text-xs">
                                                <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                                                <div>
                                                    <p className="font-black text-foreground">{item.title}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed font-semibold">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border/60 flex gap-3">
                                    <Button
                                        onClick={() => setActiveProduct(null)}
                                        variant="outline"
                                        className="flex-1 h-11 rounded-xl border-border text-xs font-bold"
                                    >
                                        Close Details
                                    </Button>
                                    <Button asChild className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl text-xs shadow-md border-0">
                                        <Link href="/copteller/onboarding/member">Apply to Scheme</Link>
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
