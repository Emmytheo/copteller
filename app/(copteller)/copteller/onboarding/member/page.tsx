"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    UserPlus, Building2, PiggyBank, Truck, Wallet, ShieldCheck,
    Check, ArrowRight, ArrowLeft, Phone, CreditCard, User,
    MapPin, ChevronDown, Eye, EyeOff, Loader2, CheckCircle2,
    Sparkles, Lock, Bell, Star, Coins, FileText, Camera, Printer, X
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { PrintableFormDialog } from "@/components/copteller/printable-form"

const fmt = (n: number) => `₦${n.toLocaleString()}`

const STEPS = [
    { id: 1, icon: User, title: "Personal Identity", desc: "BVN & basic info", color: "emerald" },
    { id: 2, icon: Building2, title: "Join Cooperative", desc: "Find your guild", color: "amber" },
    { id: 3, icon: Wallet, title: "Setup Wallet", desc: "Fund your escrow", color: "emerald" },
    { id: 4, icon: ShieldCheck, title: "Secure Account", desc: "PIN & notifications", color: "amber" },
    { id: 5, icon: Sparkles, title: "You're In!", desc: "Start saving", color: "emerald" },
]

const COOPERATIVE_SECTORS = [
    { value: "transport", label: "Transport / Logistics", icon: "🚗", desc: "Keke, buses, drivers, dispatchers" },
    { value: "agriculture", label: "Agriculture / Agro-Allied", icon: "🌾", desc: "Farming, livestock, aquaculture" },
    { value: "commerce", label: "Commerce / Market Trade", icon: "🏪", desc: "Market stalls, retail, wholesale" },
    { value: "artisan", label: "Artisan / Craft Workers", icon: "⚒️", desc: "Tailors, welders, carpenters, cobblers" },
    { value: "health", label: "Health & Wellness", icon: "🏥", desc: "Nurses, midwives, pharmacists, CHOs" },
    { value: "education", label: "Education Workers", icon: "📚", desc: "Teachers, tutors, school workers" },
    { value: "technology", label: "Technology / Digital", icon: "💻", desc: "Developers, designers, tech workers" },
    { value: "professional", label: "Professional Services", icon: "💼", desc: "Lawyers, accountants, consultants" },
    { value: "housing", label: "Housing / Real Estate", icon: "🏠", desc: "Builders, landlords, estate agents" },
    { value: "manufacturing", label: "Manufacturing / Production", icon: "🏭", desc: "Factory workers, processors, makers" },
]

type StepId = 1 | 2 | 3 | 4 | 5

function ProgressBar({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-2">
            {Array.from({ length: total }).map((_, i) => (
                <React.Fragment key={i}>
                    <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < current ? 'bg-emerald-500' : i === current - 1 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                </React.Fragment>
            ))}
        </div>
    )
}

export default function MemberOnboardingPage() {
    const router = useRouter()
    const [step, setStep] = React.useState<StepId>(1)
    const [loading, setLoading] = React.useState(false)
    const [showPrintModal, setShowPrintModal] = React.useState(false)
    const [authLoading, setAuthLoading] = React.useState(true)
    const [authenticated, setAuthenticated] = React.useState(false)

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

    // Step 1 — Identity
    const [firstName, setFirstName] = React.useState("")
    const [lastName, setLastName] = React.useState("")
    const [phone, setPhone] = React.useState("")
    const [bvn, setBvn] = React.useState("")
    const [dob, setDob] = React.useState("")
    const [bvnVerified, setBvnVerified] = React.useState(false)
    const [verifyingBvn, setVerifyingBvn] = React.useState(false)

    // Step 2 — Cooperative
    const [sector, setSector] = React.useState("")
    const [coopSearch, setCoopSearch] = React.useState("")
    const [selectedCoop, setSelectedCoop] = React.useState<any>(null)
    const [coopMode, setCoopMode] = React.useState<"join" | "create">("join")

    // Create Coop state
    const [newCoopName, setNewCoopName] = React.useState("")
    const [newCoopReg, setNewCoopReg] = React.useState("")
    const [newCoopState, setNewCoopState] = React.useState("")
    const [newCoopLga, setNewCoopLga] = React.useState("")
    const [newCoopSector, setNewCoopSector] = React.useState("commerce")

    // Step 3 — Wallet
    const [fundAmount, setFundAmount] = React.useState("5000")
    const [paymentMethod, setPaymentMethod] = React.useState<"transfer" | "card" | "ussd">("transfer")

    // Step 4 — Security
    const [pin, setPin] = React.useState(["", "", "", ""])
    const [pinConfirm, setPinConfirm] = React.useState(["", "", "", ""])
    const [smsAlerts, setSmsAlerts] = React.useState(true)
    const [pushAlerts, setPushAlerts] = React.useState(true)
    const pinRefs = React.useRef<(HTMLInputElement | null)[]>([])

    // Live Cooperatives
    const [dbCoops, setDbCoops] = React.useState<any[]>([])

    const [coopDetails, setCoopDetails] = React.useState<any>(null)
    const [loadingCoopDetails, setLoadingCoopDetails] = React.useState(false)
    const [selectedProduct, setSelectedProduct] = React.useState<any>(null)
    const [formAnswers, setFormAnswers] = React.useState<Record<string, string>>({})

    React.useEffect(() => {
        fetch('/api/copteller/admin/cooperatives?status=active')
            .then(r => r.json())
            .then(res => {
                if (res.data) setDbCoops(res.data)
            })
            .catch(err => console.warn("Failed to fetch active cooperatives", err))
    }, [])

    React.useEffect(() => {
        if (selectedCoop) {
            setLoadingCoopDetails(true)
            fetch(`/api/copteller/admin/cooperatives/${selectedCoop.id}`)
                .then(r => r.json())
                .then(res => {
                    if (res.data) {
                        setCoopDetails(res.data)
                    }
                })
                .catch(err => console.warn("Failed to fetch coop details", err))
                .finally(() => setLoadingCoopDetails(false))
        } else {
            setCoopDetails(null)
            setSelectedProduct(null)
            setFormAnswers({})
        }
    }, [selectedCoop])

    const finalCoops = dbCoops.length > 0 ? dbCoops.map((c: any) => ({
        id: String(c.id),
        name: c.name,
        sector: c.sector || 'commerce',
        members: c.members_count || 12,
        admin: c.union_leader?.firstName ? `${c.union_leader.firstName} ${c.union_leader.lastName || ''}` : 'Admin'
    })) : [
        { id: "1", name: "Aba Tricycle Operators Guild", sector: "transport", members: 142, admin: "Chukwuemeka Obi" },
        { id: "2", name: "Ariaria Market Women Cooperative", sector: "commerce", members: 89, admin: "Ngozi Eze" },
        { id: "3", name: "Umuahia Farmers Alliance", sector: "agriculture", members: 67, admin: "Emmanuel Nwosu" },
        { id: "4", name: "Aba Tailors & Garment Guild", sector: "artisan", members: 45, admin: "Adaeze Okafor" },
    ]

    const filteredCoops = finalCoops.filter(c =>
        (!sector || c.sector === sector) &&
        (!coopSearch || c.name.toLowerCase().includes(coopSearch.toLowerCase()))
    )

    const simulateBvnVerify = async () => {
        if (bvn.length < 11) { toast.error("Enter your full 11-digit BVN"); return }
        setVerifyingBvn(true)
        const tId = toast.loading("Verifying BVN via secure banking gateway...")
        try {
            const res = await fetch('/api/copteller/verify-identity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bvn })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Verification failed')
            setBvnVerified(true)
            toast.success("BVN identity verified successfully. Upgraded to KYC Tier 2.", { id: tId })
        } catch (err: any) {
            toast.error(err.message || "BVN verification failed", { id: tId })
        } finally {
            setVerifyingBvn(false)
        }
    }

    const handlePinInput = (index: number, value: string, isConfirm: boolean) => {
        if (!/^\d?$/.test(value)) return
        const setter = isConfirm ? setPinConfirm : setPin
        const arr = isConfirm ? [...pinConfirm] : [...pin]
        arr[index] = value
        setter(arr)
        if (value && index < 3) pinRefs.current[isConfirm ? index + 4 : index + 1]?.focus()
    }

    const handleSubmitOnboarding = async () => {
        setLoading(true)
        const tId = toast.loading("Completing registration and opening wallet...")

        try {
            let activeCoopId = selectedCoop?.id

            // 1. If create mode, create the cooperative first
            if (coopMode === "create") {
                const coopRes = await fetch('/api/copteller/admin/cooperatives', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: newCoopName,
                        cooperative_type: 'multipurpose',
                        sector: newCoopSector,
                        reg_number: newCoopReg,
                        state: newCoopState,
                        lga: newCoopLga,
                    })
                })
                const coopData = await coopRes.json()
                if (coopData.data) {
                    activeCoopId = coopData.data.id
                } else {
                    toast.error(coopData.error || "Failed to register cooperative.", { id: tId })
                    setLoading(false)
                    return
                }
            }

            // 2. Apply for membership linked to the coop
            const memberRes = await fetch('/api/copteller/memberships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cooperative: activeCoopId,
                    role: 'member',
                    metadata: {
                        selectedProduct: selectedProduct ? { id: selectedProduct.id, name: selectedProduct.name } : null,
                        applicationAnswers: formAnswers
                    }
                })
            })
            const memberData = await memberRes.json()

            if (memberData.data) {
                toast.success("Registration complete!", { id: tId })
                setStep(5)
            } else {
                toast.error(memberData.error || "Failed to link membership.", { id: tId })
            }
        } catch (err) {
            toast.error("Network error completing setup.", { id: tId })
        } finally {
            setLoading(false)
        }
    }

    const handleNext = async () => {
        if (step === 1 && !bvnVerified) { toast.error("Please verify your BVN first"); return }
        if (step === 2) {
            if (coopMode === "join" && !selectedCoop) { toast.error("Please select a cooperative"); return }
            if (coopMode === "create" && !newCoopName) { toast.error("Please enter a cooperative name"); return }
            
            // If dynamic form fields are rendered, make sure required fields are filled!
            if (coopMode === "join" && selectedProduct?.form_schema) {
                for (const f of selectedProduct.form_schema) {
                    if (f.required && !formAnswers[f.id]) {
                        toast.error(`Please answer required field: ${f.label}`)
                        return
                    }
                }
            }
        }
        if (step === 4) {
            if (pin.join("").length < 4) { toast.error("Set a 4-digit PIN"); return }
            if (pin.join("") !== pinConfirm.join("")) { toast.error("PINs don't match"); return }
            await handleSubmitOnboarding()
            return
        }
        if (step < 5) setStep(s => (s + 1) as StepId)
    }

    if (authLoading) {
        return (
            <div className="min-h-[100dvh] bg-background text-foreground flex flex-col justify-center items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                <p className="text-muted-foreground font-semibold text-[10px] uppercase tracking-widest animate-pulse">Verifying credentials...</p>
            </div>
        )
    }

    if (!authenticated) {
        return (
            <div className="min-h-[100dvh] bg-background text-foreground flex flex-col justify-center items-center p-6 relative font-sans selection:bg-emerald-500/20 overflow-hidden">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/4 rounded-full blur-[120px]" />
                </div>
                <div className="w-full max-w-md bg-white dark:bg-slate-95/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-6 relative z-10">
                    <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl mx-auto">
                        <Lock className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black">Authentication Required</h2>
                        <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                            To submit your member cooperative registration, please log in with your Copteller credentials first.
                        </p>
                    </div>
                    <div className="pt-2 flex flex-col gap-3">
                        <Button asChild className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-xl text-xs border-none shadow-lg">
                            <Link href="/copteller/auth?redirect=/copteller/onboarding/member">Log In to Continue</Link>
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
        <div className="min-h-[100dvh] bg-background text-foreground font-sans selection:bg-emerald-500/30">
            {/* Ambient */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/4 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex-1 flex items-start justify-center py-6 sm:py-10 px-3 sm:px-4">
                    <div className="w-full max-w-lg space-y-6">

                        {/* Progress */}
                        <div className="space-y-3">
                            <ProgressBar current={step} total={5} />
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                    {React.createElement(STEPS[step - 1].icon, { className: "h-5 w-5" })}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Step {step} of 5</p>
                                    <p className="text-lg font-black">{STEPS[step - 1].title}</p>
                                </div>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {/* ─── STEP 1: Identity ─────────────────────────────────────── */}
                            {step === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="space-y-4">
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                                        <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-black text-foreground uppercase">Prefer Paper Application?</p>
                                                <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">Print this form to collect details offline first.</p>
                                            </div>
                                            <Button onClick={() => setShowPrintModal(true)} variant="outline" type="button" className="w-full sm:w-auto h-8 text-[9px] font-black border-slate-300 dark:border-slate-800">
                                                <Printer className="h-3.5 w-3.5 mr-1" /> Print Form
                                            </Button>
                                        </div>
                                        <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                                            Your identity is verified securely via NIBSS BVN lookup. Your data stays encrypted and is never shared with third parties.
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                            {[
                                                { label: "First Name", value: firstName, setter: setFirstName, placeholder: "Kalu" },
                                                { label: "Last Name", value: lastName, setter: setLastName, placeholder: "Onyekachi" },
                                            ].map(({ label, value, setter, placeholder }) => (
                                                <div key={label} className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</label>
                                                    <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-805 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Phone Number</label>
                                            <div className="flex gap-2">
                                                <div className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center text-xs font-bold text-muted-foreground shrink-0">+234</div>
                                                <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="8012345678" type="tel"
                                                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Date of Birth</label>
                                            <input value={dob} onChange={e => setDob(e.target.value)} type="date"
                                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Bank Verification Number (BVN)</label>
                                            <div className="flex gap-2">
                                                <input value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="12345678901" type="tel" maxLength={11}
                                                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all" />
                                                {bvnVerified ? (
                                                    <div className="h-10 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-black shrink-0">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                                                    </div>
                                                ) : (
                                                    <Button onClick={simulateBvnVerify} disabled={verifyingBvn} size="sm" className="h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs px-4 border-0">
                                                        {verifyingBvn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify"}
                                                    </Button>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-semibold">Dial *565*0# on your registered phone to retrieve your BVN.</p>
                                        </div>

                                        {bvnVerified && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex gap-2.5">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">Identity Verified</p>
                                                    <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 font-semibold mt-0.5">BVN matched. Your account will be linked to your registered bank details.</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 2: Cooperative ───────────────────────────────────── */}
                            {step === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="space-y-4">
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                                        {/* Mode toggle */}
                                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl">
                                            {(["join", "create"] as const).map(m => (
                                                <button key={m} type="button" onClick={() => setCoopMode(m)}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${coopMode === m ? 'bg-white dark:bg-slate-800 shadow text-foreground' : 'text-muted-foreground'}`}>
                                                    {m === "join" ? "Join Existing" : "Register New Coop"}
                                                </button>
                                            ))}
                                        </div>

                                        {coopMode === "join" && (
                                            <div className="space-y-4">
                                                {/* Sector filter */}
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Your Occupation Sector</label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                                                        {COOPERATIVE_SECTORS.map(s => (
                                                            <button key={s.value} type="button" onClick={() => setSector(s.value === sector ? "" : s.value)}
                                                                className={`text-left p-2.5 rounded-xl border transition-all ${sector === s.value ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                                                                <span className="text-base">{s.icon}</span>
                                                                <p className="text-[10px] font-black mt-1 leading-tight">{s.label}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Search Cooperative</label>
                                                    <input value={coopSearch} onChange={e => setCoopSearch(e.target.value)} placeholder="Type cooperative name..."
                                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-805 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all" />
                                                </div>
                                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                                    {filteredCoops.map(c => (
                                                        <button key={c.id} type="button" onClick={() => setSelectedCoop(c)}
                                                            className={`w-full text-left p-3 rounded-xl border transition-all ${selectedCoop?.id === c.id ? 'border-emerald-500/50 bg-emerald-500/8' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <p className="text-xs font-black">{c.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{c.members} members &bull; Admin: {c.admin}</p>
                                                                </div>
                                                                {selectedCoop?.id === c.id && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
                                                            </div>
                                                        </button>
                                                    ))}
                                                    {filteredCoops.length === 0 && (
                                                        <p className="text-xs text-center text-muted-foreground py-4 font-semibold">No cooperatives found. Try registering a new one.</p>
                                                    )}
                                                </div>

                                                {selectedCoop && (
                                                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-900">
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Available Scheme Products</p>
                                                        {loadingCoopDetails ? (
                                                            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-emerald-500" /></div>
                                                        ) : !coopDetails?.authorized_product_types || coopDetails.authorized_product_types.length === 0 ? (
                                                            <p className="text-xs text-muted-foreground italic font-semibold">No active schemes authorized for this cooperative yet.</p>
                                                        ) : (
                                                            <div className="space-y-2.5">
                                                                {coopDetails.authorized_product_types.map((p: any) => {
                                                                    const isProdSelected = selectedProduct?.id === p.id
                                                                    return (
                                                                        <div key={p.id} onClick={() => { setSelectedProduct(p); setFormAnswers({}) }}
                                                                            className={`p-3 rounded-xl border cursor-pointer transition-all ${isProdSelected ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-800'}`}>
                                                                            <div className="flex justify-between items-center">
                                                                                <div>
                                                                                    <p className="text-xs font-black">{p.name}</p>
                                                                                    {p.tagline && <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">{p.tagline}</p>}
                                                                                </div>
                                                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isProdSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                                                                                    {isProdSelected && <Check className="h-2.5 w-2.5 text-black font-black" />}
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {/* Dynamic Form Schema Fields */}
                                                                            {isProdSelected && p.form_schema && p.form_schema.length > 0 && (
                                                                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5" onClick={e => e.stopPropagation()}>
                                                                                    <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Application Fields</p>
                                                                                    {p.form_schema.map((f: any) => (
                                                                                        <div key={f.id} className="space-y-1">
                                                                                            <label className="text-[9px] font-bold text-slate-500 uppercase">{f.label} {f.required && "*"}</label>
                                                                                            {f.type === "select" ? (
                                                                                                <select value={formAnswers[f.id] || ""} onChange={e => setFormAnswers(prev => ({ ...prev, [f.id]: e.target.value }))}
                                                                                                    className="w-full h-8 px-2 rounded-lg border border-slate-250 dark:border-slate-700 bg-background text-xs font-semibold focus:outline-none">
                                                                                                    <option value="">Select option...</option>
                                                                                                    {String(f.options || "").split(",").map(o => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
                                                                                                </select>
                                                                                            ) : f.type === "textarea" ? (
                                                                                                <textarea value={formAnswers[f.id] || ""} onChange={e => setFormAnswers(prev => ({ ...prev, [f.id]: e.target.value }))} rows={2}
                                                                                                    className="w-full px-2 py-1 rounded-lg border border-slate-250 dark:border-slate-700 bg-background text-xs font-semibold focus:outline-none resize-none" />
                                                                                            ) : (
                                                                                                <input type={f.type || "text"} value={formAnswers[f.id] || ""} onChange={e => setFormAnswers(prev => ({ ...prev, [f.id]: e.target.value }))}
                                                                                                    className="w-full h-8 px-2 rounded-lg border border-slate-250 dark:border-slate-700 bg-background text-xs font-semibold focus:outline-none" />
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {coopMode === "create" && (
                                            <div className="space-y-3">
                                                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl">
                                                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                                                        Registering a new cooperative requires bank superadmin approval (typically within 24 hrs). You can still start saving during the approval process.
                                                    </p>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Cooperative Name</label>
                                                    <input value={newCoopName} onChange={e => setNewCoopName(e.target.value)} placeholder="e.g. Aba Keke Operators Coop"
                                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Registration Number (Optional)</label>
                                                    <input value={newCoopReg} onChange={e => setNewCoopReg(e.target.value)} placeholder="CAC / Coop Society No."
                                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all" />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">State</label>
                                                        <input value={newCoopState} onChange={e => setNewCoopState(e.target.value)} placeholder="e.g. Abia"
                                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">LGA</label>
                                                        <input value={newCoopLga} onChange={e => setNewCoopLga(e.target.value)} placeholder="e.g. Aba North"
                                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Sector</label>
                                                    <select value={newCoopSector} onChange={e => setNewCoopSector(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none">
                                                        {COOPERATIVE_SECTORS.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 3: Wallet ──────────────────────────────────────── */}
                            {step === 3 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="space-y-4">
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5 shadow-sm">
                                        <div className="bg-gradient-to-br from-emerald-900 to-slate-950 rounded-2xl p-5 space-y-2 border border-emerald-900/40">
                                            <p className="text-[9px] font-black text-emerald-300/60 uppercase tracking-widest">Your Escrow Wallet</p>
                                            <p className="text-3xl font-black text-white">₦0.00</p>
                                            <p className="text-[10px] text-emerald-400/70 font-semibold">Fund now to start contributing to your Ajo cycle</p>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Select Funding Amount</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {["2000", "5000", "10000"].map(amt => (
                                                    <button key={amt} type="button" onClick={() => setFundAmount(amt)}
                                                        className={`py-3 rounded-xl border font-black text-xs transition-all ${fundAmount === amt ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-slate-250 dark:border-slate-800'}`}>
                                                        {fmt(Number(amt))}
                                                    </button>
                                                ))}
                                            </div>
                                            <input value={fundAmount} onChange={e => setFundAmount(e.target.value.replace(/\D/g, ""))} placeholder="Custom amount" type="tel"
                                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Payment Method</p>
                                            <div className="space-y-2">
                                                {[
                                                    { id: "transfer", label: "Bank Transfer", desc: "Pay via instant virtual account" },
                                                    { id: "card", label: "Card Payment", desc: "Fund securely via card checkout" },
                                                ].map(method => (
                                                    <label key={method.id} className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${paymentMethod === method.id ? 'border-emerald-500/40 bg-emerald-500/6' : 'border-slate-200 dark:border-slate-800'}`}>
                                                        <input type="radio" checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id as any)} className="mt-1" />
                                                        <div>
                                                            <p className="text-xs font-black">{method.label}</p>
                                                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{method.desc}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 4: Security ─────────────────────────────────────── */}
                            {step === 4 && (
                                <motion.div key="step4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="space-y-4">
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                                        <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                                            Secure your withdrawals and transaction clearances with a secure 4-digit PIN.
                                        </p>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Create 4-Digit PIN</label>
                                            <div className="flex gap-2.5 justify-center">
                                                {Array.from({ length: 4 }).map((_, i) => (
                                                    <input key={i} ref={el => { pinRefs.current[i] = el }} value={pin[i]} onChange={e => handlePinInput(i, e.target.value, false)} type="password" maxLength={1}
                                                        className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center font-black text-lg focus:outline-none focus:border-emerald-500" />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Confirm PIN</label>
                                            <div className="flex gap-2.5 justify-center">
                                                {Array.from({ length: 4 }).map((_, i) => (
                                                    <input key={i} ref={el => { pinRefs.current[i + 4] = el }} value={pinConfirm[i]} onChange={e => handlePinInput(i, e.target.value, true)} type="password" maxLength={1}
                                                        className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center font-black text-lg focus:outline-none focus:border-emerald-500" />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 dark:border-slate-900 pt-4 space-y-3">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Notification Preferences</p>
                                            {[
                                                { label: "SMS transaction alerts", sub: "Receive SMS for every wallet debit/credit", value: smsAlerts, setter: setSmsAlerts, icon: Phone },
                                                { label: "Push notifications", sub: "Get reminders for Ajo dues and HP payments", value: pushAlerts, setter: setPushAlerts, icon: Bell },
                                            ].map(({ label, sub, value, setter, icon: Icon }) => (
                                                <div key={label} className="flex items-center justify-between gap-3">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="p-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg mt-0.5">
                                                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black">{label}</p>
                                                            <p className="text-[10px] text-muted-foreground font-semibold">{sub}</p>
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => setter(!value)} className={`w-11 h-6 rounded-full transition-all relative ${value ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 5: Success ─────────────────────────────────────── */}
                            {step === 5 && (
                                <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="space-y-4 text-center">
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 shadow-sm">
                                        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
                                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                                            <div className="relative bg-emerald-500/15 border border-emerald-500/30 rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                                                <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-500" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h2 className="text-xl sm:text-2xl font-black">Welcome to Copteller!</h2>
                                            <p className="text-xs sm:text-sm text-muted-foreground font-semibold leading-relaxed">
                                                Your member account is live. Your cooperative membership request has been sent for admin approval.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left">
                                            {[
                                                { icon: PiggyBank, title: "Ajo Thrift", desc: "Join your first savings cycle" },
                                                { icon: Truck, title: "Hire Purchase", desc: "Apply for asset financing" },
                                                { icon: Star, title: "Credit Score", desc: "Start building your profile" },
                                                { icon: Coins, title: "Wallet Ready", desc: "Fund and start saving today" },
                                            ].map(({ icon: Icon, title, desc }) => (
                                                <div key={title} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-1 border border-slate-100 dark:border-slate-900">
                                                    <Icon className="h-4 w-4 text-emerald-500" />
                                                    <p className="text-xs font-black">{title}</p>
                                                    <p className="text-[10px] text-muted-foreground font-semibold">{desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <Button onClick={() => router.push("/copteller/dashboard")}
                                            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black text-sm border-0 shadow-lg shadow-emerald-950/20">
                                            Open My Dashboard →
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer nav */}
                        {step < 5 && (
                            <div className="flex gap-3">
                                {step > 1 && (
                                    <Button onClick={() => setStep(s => (s - 1) as StepId)} variant="outline"
                                        className="flex-1 h-12 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-sm">
                                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                                    </Button>
                                )}
                                <Button onClick={handleNext} disabled={loading}
                                    className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-sm border-0 shadow-lg shadow-emerald-950/15">
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                    ) : (
                                        <>
                                            {step === 4 ? "Finish Setup" : step === 3 ? "Skip & Continue" : "Continue"}
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        <p className="text-center text-[10px] text-muted-foreground font-semibold">
                            Already registered? <Link href="/copteller/auth?redirect=/copteller/dashboard" className="text-emerald-600 dark:text-emerald-400 hover:underline font-black">Sign in →</Link>
                        </p>
                    </div>
                </div>
            </div>

            <PrintableFormDialog
                open={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                roleType="member"
                formData={{ firstName, lastName, phone, bvn, dob }}
            />
        </div>
    )
}
