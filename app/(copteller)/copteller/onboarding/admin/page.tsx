"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Building2, Users, Settings, FileText, CheckCircle2, ArrowRight, ArrowLeft,
    Loader2, ShieldCheck, Sparkles, PiggyBank, Truck, BarChart3, Coins,
    Bell, Lock, Wallet, Star, Award, Plus, UserCheck, Globe, Percent, Calendar,
    Printer, X
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { PrintableFormDialog } from "@/components/copteller/printable-form"

const STEPS = [
    { id: 1, icon: Building2, title: "Cooperative Details", desc: "Register your group" },
    { id: 2, icon: Sparkles, title: "Product Catalog Selection", desc: "Configure savings, HP, loans & pools" },
    { id: 3, icon: Settings, title: "Operational Rules", desc: "Dues, limits & clearances" },
    { id: 4, icon: FileText, title: "Review & Submit", desc: "License registry submission" },
    { id: 5, icon: ShieldCheck, title: "Submitted!", desc: "Pending bank licensing approval" },
]

const COOP_TYPES = [
    { value: "thrift_credit", label: "Thrift & Credit", icon: "💰" },
    { value: "multipurpose", label: "Multipurpose", icon: "🔧" },
    { value: "agricultural", label: "Agricultural", icon: "🌾" },
    { value: "transport", label: "Transport / Fleet", icon: "🚗" },
    { value: "trade", label: "Trade & Commerce", icon: "🏪" },
    { value: "professional", label: "Professional", icon: "💼" },
    { value: "housing", label: "Housing", icon: "🏠" },
    { value: "consumer", label: "Consumer", icon: "🛒" },
]

const SECTORS = [
    "Transport / Logistics",
    "Agriculture / Agro-Allied",
    "Commerce / Market Trade",
    "Artisan / Craft Workers",
    "Health & Wellness",
    "Education Workers",
    "Technology / Digital",
    "Professional Services",
    "Housing / Real Estate",
    "Manufacturing / Production",
    "Other"
]

const PRODUCT_ICONS: Record<string, any> = {
    ajo_rotation: PiggyBank,
    hire_purchase: Truck,
    micro_loan: Coins,
    grant: Award,
    cooperative_bond: Lock,
    savings_drive: Wallet,
    insurance_pool: ShieldCheck,
}

function ProgressBar({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < current ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
            ))}
        </div>
    )
}

type StepId = 1 | 2 | 3 | 4 | 5

export default function AdminOnboardingPage() {
    const router = useRouter()
    const [step, setStep] = React.useState<StepId>(1)
    const [authLoading, setAuthLoading] = React.useState(true)
    const [authenticated, setAuthenticated] = React.useState(false)
    const [showPrintModal, setShowPrintModal] = React.useState(false)

    React.useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/copteller/profile')
                if (res.status === 200) {
                    setAuthenticated(true)
                }
            } catch (err) {
                console.error("Auth check failed", err)
            } finally {
                setAuthLoading(false)
            }
        }
        checkAuth()
    }, [])

    // Step 1 — Cooperative details
    const [coopName, setCoopName] = React.useState("")
    const [coopType, setCoopType] = React.useState("")
    const [sector, setSector] = React.useState("")
    const [regNumber, setRegNumber] = React.useState("")
    const [state, setState] = React.useState("")
    const [lga, setLga] = React.useState("")
    const [address, setAddress] = React.useState("")
    const [description, setDescription] = React.useState("")

    // Step 2 — dynamic products
    const [availableProducts, setAvailableProducts] = React.useState<any[]>([])
    const [selectedProducts, setSelectedProducts] = React.useState<string[]>([])
    const [loadingProducts, setLoadingProducts] = React.useState(true)

    // Step 3 — Collection rules
    const [membershipFee, setMembershipFee] = React.useState("2000")
    const [monthlyDues, setMonthlyDues] = React.useState("1000")
    const [escrowFee, setEscrowFee] = React.useState("1.5")
    const [latePaymentFee, setLatePaymentFee] = React.useState("500")
    const [maxMembers, setMaxMembers] = React.useState("100")
    const [investorSplit, setInvestorSplit] = React.useState("80")

    // Step 4 — Review & submission
    const [submitting, setSubmitting] = React.useState(false)

    // Load active products from API
    React.useEffect(() => {
        const loadProducts = async () => {
            try {
                const res = await fetch('/api/copteller/products?status=active')
                const json = await res.json()
                if (json.data) {
                    setAvailableProducts(json.data)
                }
            } catch (err) {
                console.error("Failed to load products registry", err)
            } finally {
                setLoadingProducts(false)
            }
        }
        loadProducts()
    }, [])

    const handleSubmit = async () => {
        setSubmitting(true)
        const tId = toast.loading("Registering cooperative society & submitting license request...")
        
        try {
            // Map sector label to database code
            const mappedSector = sector.toLowerCase().includes('transport') ? 'transport'
                               : sector.toLowerCase().includes('agri') ? 'agriculture'
                               : sector.toLowerCase().includes('comm') ? 'commerce'
                               : sector.toLowerCase().includes('artisan') ? 'artisan'
                               : 'other'

            const payload = {
                name: coopName,
                cooperative_type: coopType || 'multipurpose',
                sector: mappedSector,
                registration_number: regNumber || undefined,
                state,
                lga,
                address,
                description,
                authorized_product_types: selectedProducts,
                membership_fee_kobo: Number(membershipFee) * 100,
                monthly_dues_kobo: Number(monthlyDues) * 100,
                late_payment_penalty_kobo: Number(latePaymentFee) * 100,
                max_members: Number(maxMembers),
                escrowFeePercent: Number(escrowFee),
                investorYieldSplitPercent: Number(investorSplit),
            }

            const res = await fetch('/api/copteller/admin/cooperatives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (data.data) {
                toast.success("Cooperative registration submitted successfully!", { id: tId })
                setStep(5)
            } else {
                toast.error(data.error || "Failed to submit registration.", { id: tId })
            }
        } catch {
            toast.error("Network error submitting registration.", { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    const handleNext = () => {
        if (step === 1 && (!coopName || !coopType || !sector || !state || !lga)) {
            toast.error("Fill in cooperative name, type, sector, state, and LGA")
            return
        }
        if (step === 2 && selectedProducts.length === 0) {
            toast.error("Please select at least one product template for your cooperative schemes.")
            return
        }
        if (step < 4) setStep(s => (s + 1) as StepId)
        if (step === 4) handleSubmit()
    }

    const toggleProductSelect = (id: string) => {
        setSelectedProducts(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        )
    }

    const fmt = (n: string | number) => `₦${Number(n).toLocaleString()}`

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                <p className="text-muted-foreground font-semibold text-[10px] uppercase tracking-widest animate-pulse">Verifying credentials...</p>
            </div>
        )
    }

    if (!authenticated) {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-6 relative font-sans selection:bg-amber-500/20 overflow-hidden">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/4 rounded-full blur-[120px]" />
                </div>
                <div className="w-full max-w-md bg-white dark:bg-slate-95/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-6 relative z-10">
                    <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl mx-auto">
                        <Lock className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black">Authentication Required</h2>
                        <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                            To configure a cooperative workspace and apply for automated group licensing, please log in with your Copteller credentials first.
                        </p>
                    </div>
                    <div className="pt-2 flex flex-col gap-3">
                        <Button asChild className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl text-xs border-none shadow-lg">
                            <Link href="/copteller/auth?redirect=/copteller/onboarding/admin">Log In to Continue</Link>
                        </Button>
                        <Button asChild variant="ghost" className="w-full h-12 text-muted-foreground hover:text-foreground text-xs font-bold">
                            <Link href="/copteller">Back to Landing Page</Link>
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-amber-500/20">
            {/* Ambient */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/4 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex-1 flex items-start justify-center py-6 sm:py-10 px-3 sm:px-4">
                    <div className="w-full max-w-2xl space-y-6">

                        {/* Progress */}
                        <div className="space-y-3">
                            <ProgressBar current={step} total={5} />
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                                    {React.createElement(STEPS[step - 1].icon, { className: "h-5 w-5" })}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Step {step} of 5</p>
                                    <p className="text-lg font-black">{STEPS[step - 1].title}</p>
                                </div>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {/* ─── STEP 1: Coop Details ────────────────────────── */}
                            {step === 1 && (
                                <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                                        <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-black text-foreground uppercase">Prefer Paper Application?</p>
                                                <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">Collect operator and guild details offline first.</p>
                                            </div>
                                            <Button onClick={() => setShowPrintModal(true)} variant="outline" type="button" className="w-full sm:w-auto h-8 text-[9px] font-black border-slate-300 dark:border-slate-800">
                                                <Printer className="h-3.5 w-3.5 mr-1" /> Print Form
                                            </Button>
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Cooperative Name *</label>
                                            <input value={coopName} onChange={e => setCoopName(e.target.value)} placeholder="e.g. Aba Tricycle Operators Guild"
                                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all" />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Cooperative Type *</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {COOP_TYPES.map(t => (
                                                    <button key={t.value} onClick={() => setCoopType(t.value)}
                                                        className={`p-3 rounded-xl border text-center transition-all ${coopType === t.value ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                                                        <span className="text-xl">{t.icon}</span>
                                                        <p className="text-[9px] font-black mt-1 leading-tight">{t.label}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Primary Sector *</label>
                                            <select value={sector} onChange={e => setSector(e.target.value)}
                                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50">
                                                <option value="">Select sector...</option>
                                                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                            {[
                                                { label: "State *", value: state, setter: setState, placeholder: "e.g. Abia" },
                                                { label: "LGA *", value: lga, setter: setLga, placeholder: "e.g. Aba North" },
                                            ].map(({ label, value, setter, placeholder }) => (
                                                <div key={label} className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</label>
                                                    <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all" />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Physical Address</label>
                                            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Office/Meeting house street address..."
                                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all" />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">CAC / Cooperative Registration Number (Optional)</label>
                                            <input value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="RC123456 or Coop Reg No."
                                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all" />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Brief Description</label>
                                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                                                placeholder="Describe what your cooperative does and who it serves..."
                                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none resize-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 2: Scheme Setup (Dynamic Products Catalog) ─── */}
                            {step === 2 && (
                                <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5 shadow-sm">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                                                Select the bank-defined product templates that your cooperative will offer. Selected products will populate your member schemes dashboard.
                                            </p>
                                        </div>

                                        {loadingProducts ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                                            </div>
                                        ) : availableProducts.length === 0 ? (
                                            <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-xl">
                                                No active product templates available at this time.
                                            </div>
                                        ) : (
                                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                                {availableProducts.map(p => {
                                                    const Icon = PRODUCT_ICONS[p.product_type] || Award
                                                    const isSelected = selectedProducts.includes(p.id)
                                                    return (
                                                        <div key={p.id} onClick={() => toggleProductSelect(p.id)}
                                                            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${isSelected ? 'border-amber-500/50 bg-amber-500/5 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                                                            <div className="flex items-start gap-3">
                                                                <div className={`p-2 rounded-xl ${isSelected ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>
                                                                    <Icon className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-black flex items-center gap-1.5">
                                                                        {p.name}
                                                                        {p.interest_rate > 0 && <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">{p.interest_rate}% Yield</span>}
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 leading-relaxed">{p.tagline || p.description}</p>
                                                                </div>
                                                            </div>
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'}`}>
                                                                {isSelected && <CheckCircle2 className="h-4 w-4 text-black font-black" />}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 3: Collection Rules ────────────────────── */}
                            {step === 3 && (
                                <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                                        {[
                                            { label: "One-Time Membership Fee (₦)", value: membershipFee, setter: setMembershipFee, desc: "Charged when a new member joins your cooperative" },
                                            { label: "Monthly Dues (₦)", value: monthlyDues, setter: setMonthlyDues, desc: "Recurring operational dues collected from all active members" },
                                            { label: "Platform Escrow Fee (%)", value: escrowFee, setter: setEscrowFee, desc: "Percentage charged by Copteller per transaction (default 1.5%)" },
                                            { label: "Late Payment Penalty (₦)", value: latePaymentFee, setter: setLatePaymentFee, desc: "Fixed penalty for missed Ajo contributions or HP repayments" },
                                            { label: "Maximum Member Limit", value: maxMembers, setter: setMaxMembers, desc: "Cap on total active members your cooperative can accommodate" },
                                            { label: "Investor Yield Split (%)", value: investorSplit, setter: setInvestorSplit, desc: "Percentage of yield paid to investors (default 80%)" },
                                        ].map(({ label, value, setter, desc }) => (
                                            <div key={label} className="space-y-1.5">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</label>
                                                <input value={value} onChange={e => setter(e.target.value.replace(/[^\d.]/g, ""))} type="tel"
                                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all" />
                                                <p className="text-[10px] text-muted-foreground font-semibold">{desc}</p>
                                            </div>
                                        ))}

                                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl">
                                            <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 leading-relaxed">
                                                💡 All parameters are baseline values. Individual scheme configurations will be validated against these limits.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 4: Review ──────────────────────────────── */}
                            {step === 4 && (
                                <motion.div key="s4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                                        <h3 className="text-sm font-black">Review Your Application</h3>

                                        <div className="space-y-3">
                                            {[
                                                { section: "Cooperative Identity", items: [
                                                    { label: "Name", val: coopName || "—" },
                                                    { label: "Type", val: COOP_TYPES.find(t => t.value === coopType)?.label || "—" },
                                                    { label: "Sector", val: sector || "—" },
                                                    { label: "Location", val: [lga, state].filter(Boolean).join(", ") || "—" },
                                                    { label: "Address", val: address || "—" },
                                                    { label: "Reg No.", val: regNumber || "Not provided" },
                                                ]},
                                                { section: "Authorized Products Selection", items: [
                                                    { label: "Product Templates", val: `${selectedProducts.length} selected templates` },
                                                    { label: "Enabled Schemes", val: availableProducts.filter(p => selectedProducts.includes(p.id)).map(p => p.name).join(", ") || "None" },
                                                ]},
                                                { section: "Operational Baseline Rules", items: [
                                                    { label: "Membership Fee", val: fmt(membershipFee) },
                                                    { label: "Monthly Dues", val: `${fmt(monthlyDues)}/month` },
                                                    { label: "Escrow Fee", val: `${escrowFee}%` },
                                                    { label: "Late Penalty", val: fmt(latePaymentFee) },
                                                    { label: "Max Members", val: maxMembers },
                                                    { label: "Investor Yield Split", val: `${investorSplit}%` },
                                                ]},
                                            ].map(({ section, items }) => (
                                                <div key={section} className="rounded-2xl border border-slate-100 dark:border-slate-900 overflow-hidden">
                                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-900">
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{section}</p>
                                                    </div>
                                                    <div className="divide-y divide-slate-50 dark:divide-slate-900/60">
                                                        {items.map(({ label, val }) => (
                                                            <div key={label} className="flex justify-between px-3 sm:px-4 py-2.5 text-xs font-semibold gap-2">
                                                                <span className="text-muted-foreground shrink-0">{label}</span>
                                                                <span className="font-bold text-right max-w-[70%] line-clamp-2">{val}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl">
                                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                                                By submitting, you agree to the licensing guidelines set by Abia Microfinance Bank and declare that all details are accurate.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 5: Submitted ───────────────────────────── */}
                            {step === 5 && (
                                <motion.div key="s5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="text-center">
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 shadow-sm">
                                        <div className="relative mx-auto w-24 h-24">
                                            <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping" />
                                            <div className="relative bg-amber-500/15 border border-amber-500/30 rounded-full w-24 h-24 flex items-center justify-center">
                                                <CheckCircle2 className="h-10 w-10 text-amber-500" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h2 className="text-2xl font-black">Application Submitted!</h2>
                                            <p className="text-sm text-muted-foreground font-semibold leading-relaxed">
                                                <strong>{coopName || "Your cooperative"}</strong> has been submitted for bank review. You will receive an SMS and email notification once licensing is approved.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 text-left">
                                            {[
                                                { icon: Bell, title: "Expect SMS verification", desc: "Our compliance agents will review your CAC and Byelaws details" },
                                                { icon: Users, title: "Invite your members", desc: "Start generating sign-up codes from the admin console" },
                                                { icon: Settings, title: "Complete configurations", desc: "Baseline guidelines are pre-allocated for launch" },
                                            ].map(({ icon: Icon, title, desc }) => (
                                                <div key={title} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-900">
                                                    <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg shrink-0 mt-0.5"><Icon className="h-3.5 w-3.5" /></div>
                                                    <div>
                                                        <p className="text-xs font-black">{title}</p>
                                                        <p className="text-[10px] text-muted-foreground font-semibold">{desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <Button onClick={() => router.push("/copteller/admin")}
                                            className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-black font-black text-sm border-0 shadow-lg">
                                            Open Admin Console →
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Nav */}
                        {step < 5 && (
                            <div className="flex gap-3">
                                {step > 1 && (
                                    <Button onClick={() => setStep(s => (s - 1) as StepId)} variant="outline"
                                        className="flex-1 h-12 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-sm">
                                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                                    </Button>
                                )}
                                <Button onClick={handleNext} disabled={submitting}
                                    className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-sm border-0 shadow-lg shadow-amber-950/15">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : step === 4 ? "Submit Application" : "Continue"}
                                    {!submitting && <ArrowRight className="h-4 w-4 ml-2" />}
                                </Button>
                            </div>
                        )}
                        <p className="text-center text-[10px] text-muted-foreground font-semibold">
                            Already registered? <Link href="/copteller/auth?redirect=/copteller/admin" className="text-amber-600 dark:text-amber-400 hover:underline font-black">Sign in →</Link>
                        </p>
                    </div>
                </div>
            </div>
            
            <PrintableFormDialog
                open={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                roleType="admin"
                coopName={coopName}
                sector={sector}
                accentClassName="bg-amber-500 hover:bg-amber-600 text-black"
            />
        </div>
    )
}
