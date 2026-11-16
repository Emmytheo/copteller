"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp, CircleDollarSign, ShieldCheck, FileText, CheckCircle2,
    ArrowRight, ArrowLeft, Loader2, Sparkles, Wallet, PiggyBank, Truck,
    BarChart3, Users, Globe, Star, Percent, Eye, EyeOff, Lock,
    Building2, CreditCard, Bell
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const STEPS = [
    { id: 1, icon: Users, title: "Investor Profile", desc: "Tell us about yourself", color: "orange" },
    { id: 2, icon: BarChart3, title: "Risk & Strategy", desc: "Define your investment goals", color: "orange" },
    { id: 3, icon: Wallet, title: "Fund Portfolio", desc: "Initial capital commitment", color: "orange" },
    { id: 4, icon: ShieldCheck, title: "Compliance", desc: "KYC & accreditation", color: "orange" },
    { id: 5, icon: Sparkles, title: "All Set!", desc: "Browse marketplace", color: "orange" },
]

const INVESTOR_TYPES = [
    { value: "individual", label: "Individual Investor", icon: "👤", desc: "Personal investment from personal funds" },
    { value: "corporate", label: "Corporate Investor", icon: "🏢", desc: "Investment on behalf of a registered company" },
    { value: "fund", label: "Investment Fund", icon: "📈", desc: "Fund manager investing pooled capital" },
    { value: "ngo", label: "NGO / Development", icon: "🌍", desc: "Grant-making or development finance" },
]

const RISK_PROFILES = [
    { value: "conservative", label: "Conservative", icon: "🛡️", yield: "8–12%", desc: "Prefer low-risk, stable returns. Prioritize capital preservation." },
    { value: "moderate", label: "Moderate", icon: "⚖️", yield: "12–18%", desc: "Balanced approach: moderate risk for competitive yields." },
    { value: "aggressive", label: "Growth", icon: "🚀", yield: "18–28%", desc: "Comfortable with higher risk for maximum yield potential." },
]

const PREFERRED_SECTORS = [
    { value: "transport", label: "Transport / Fleet", icon: "🚗" },
    { value: "agriculture", label: "Agriculture", icon: "🌾" },
    { value: "commerce", label: "Commerce", icon: "🏪" },
    { value: "artisan", label: "Artisan / Manufacturing", icon: "⚒️" },
    { value: "health", label: "Health", icon: "🏥" },
    { value: "education", label: "Education", icon: "📚" },
    { value: "housing", label: "Housing", icon: "🏠" },
    { value: "any", label: "Any Sector", icon: "🌐" },
]

function ProgressBar({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < current ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
            ))}
        </div>
    )
}

type StepId = 1 | 2 | 3 | 4 | 5

export default function InvestorOnboardingPage() {
    const router = useRouter()
    const [step, setStep] = React.useState<StepId>(1)

    // Step 1 — Profile
    const [investorType, setInvestorType] = React.useState("")
    const [fullName, setFullName] = React.useState("")
    const [email, setEmail] = React.useState("")
    const [phone, setPhone] = React.useState("")
    const [companyName, setCompanyName] = React.useState("")

    // Step 2 — Risk & Strategy
    const [riskProfile, setRiskProfile] = React.useState("")
    const [preferredSectors, setPreferredSectors] = React.useState<string[]>([])
    const [minDuration, setMinDuration] = React.useState("6")
    const [maxDuration, setMaxDuration] = React.useState("36")
    const [minYield, setMinYield] = React.useState("12")

    // Step 3 — Funding
    const [portfolioTarget, setPortfolioTarget] = React.useState("")
    const [initialCommit, setInitialCommit] = React.useState("")
    const [autoReinvest, setAutoReinvest] = React.useState(true)
    const [payoutFrequency, setPayoutFrequency] = React.useState("quarterly")

    // Step 4 — Compliance
    const [bvn, setBvn] = React.useState("")
    const [idType, setIdType] = React.useState("nin")
    const [idNumber, setIdNumber] = React.useState("")
    const [accredited, setAccredited] = React.useState(false)
    const [agreeTerms, setAgreeTerms] = React.useState(false)
    const [kycVerified, setKycVerified] = React.useState(false)
    const [verifying, setVerifying] = React.useState(false)

    const fmt = (n: string | number) => `₦${Number(n).toLocaleString()}`

    const toggleSector = (v: string) => {
        if (v === "any") { setPreferredSectors(["any"]); return }
        setPreferredSectors(prev => {
            const without = prev.filter(s => s !== "any")
            return without.includes(v) ? without.filter(s => s !== v) : [...without, v]
        })
    }

    const simulateKyc = async () => {
        if (!bvn || bvn.length < 11) { toast.error("Enter your 11-digit BVN"); return }
        setVerifying(true)
        const tId = toast.loading("Verifying institutional investor KYC & BVN via NIBSS...")
        try {
            const res = await fetch('/api/copteller/verify-identity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bvn })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Verification failed')
            setKycVerified(true)
            toast.success("Investor identity verified successfully. Level 2 accredited.", { id: tId })
        } catch (err: any) {
            toast.error(err.message || 'Identity verification failed', { id: tId })
        } finally {
            setVerifying(false)
        }
    }

    const handleNext = () => {
        if (step === 1 && (!investorType || !fullName || !phone)) { toast.error("Fill investor type, name and phone"); return }
        if (step === 2 && (!riskProfile || preferredSectors.length === 0)) { toast.error("Select a risk profile and at least one sector"); return }
        if (step === 4 && !agreeTerms) { toast.error("Please accept the terms to proceed"); return }
        if (step < 4) setStep(s => (s + 1) as StepId)
        if (step === 4) setStep(5)
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-orange-500/20">
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/4 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex-1 flex items-start justify-center py-6 sm:py-10 px-3 sm:px-4">
                    <div className="w-full max-w-lg space-y-6">

                        <div className="space-y-3">
                            <ProgressBar current={step} total={5} />
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl">
                                    {React.createElement(STEPS[step - 1].icon, { className: "h-5 w-5" })}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Step {step} of 5</p>
                                    <p className="text-lg font-black">{STEPS[step - 1].title}</p>
                                </div>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {/* ─── STEP 1: Profile ─────────────────────────── */}
                            {step === 1 && (
                                <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Investor Type *</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {INVESTOR_TYPES.map(t => (
                                                    <button key={t.value} onClick={() => setInvestorType(t.value)}
                                                        className={`text-left p-3 rounded-xl border transition-all ${investorType === t.value ? 'border-orange-500/50 bg-orange-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                                                        <span className="text-xl">{t.icon}</span>
                                                        <p className="text-[10px] font-black mt-1">{t.label}</p>
                                                        <p className="text-[9px] text-muted-foreground font-semibold mt-0.5 leading-tight">{t.desc}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {[
                                            { label: "Full Legal Name *", value: fullName, setter: setFullName, placeholder: "As on your ID" },
                                            { label: "Email Address", value: email, setter: setEmail, placeholder: "investor@example.com", type: "email" },
                                        ].map(({ label, value, setter, placeholder, type }) => (
                                            <div key={label} className="space-y-1.5">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</label>
                                                <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder} type={type || "text"}
                                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all" />
                                            </div>
                                        ))}

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Phone Number *</label>
                                            <div className="flex gap-2">
                                                <div className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center text-xs font-bold text-muted-foreground shrink-0">+234</div>
                                                <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="8012345678" type="tel"
                                                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all" />
                                            </div>
                                        </div>

                                        {(investorType === "corporate" || investorType === "fund") && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Company / Fund Name</label>
                                                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Registered entity name"
                                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none" />
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 2: Risk & Strategy ─────────────────── */}
                            {step === 2 && (
                                <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-5 shadow-sm">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Risk Profile *</label>
                                            <div className="space-y-2">
                                                {RISK_PROFILES.map(r => (
                                                    <button key={r.value} onClick={() => setRiskProfile(r.value)}
                                                        className={`w-full text-left p-4 rounded-xl border transition-all ${riskProfile === r.value ? 'border-orange-500/50 bg-orange-500/8' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2.5">
                                                                <span className="text-xl">{r.icon}</span>
                                                                <div>
                                                                    <p className="text-sm font-black">{r.label}</p>
                                                                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 leading-snug">{r.desc}</p>
                                                                </div>
                                                            </div>
                                                            <div className={`text-xs font-black px-2 py-1 rounded-lg ${riskProfile === r.value ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' : 'bg-slate-100 dark:bg-slate-900 text-muted-foreground'}`}>
                                                                {r.yield} p.a.
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Preferred Cooperative Sectors *</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {PREFERRED_SECTORS.map(s => (
                                                    <button key={s.value} onClick={() => toggleSector(s.value)}
                                                        className={`p-2.5 rounded-xl border text-center transition-all ${preferredSectors.includes(s.value) ? 'border-orange-500/50 bg-orange-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                                                        <span className="text-lg">{s.icon}</span>
                                                        <p className="text-[9px] font-black mt-1 leading-tight">{s.label}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                                            {[
                                                { label: "Min Duration (mo)", value: minDuration, setter: setMinDuration },
                                                { label: "Max Duration (mo)", value: maxDuration, setter: setMaxDuration },
                                                { label: "Min Yield (%)", value: minYield, setter: setMinYield },
                                            ].map(({ label, value, setter }) => (
                                                <div key={label} className="space-y-1">
                                                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{label}</label>
                                                    <input value={value} onChange={e => setter(e.target.value.replace(/\D/g, ""))} type="tel"
                                                        className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-xs font-black focus:outline-none" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 3: Fund Portfolio ───────────────────── */}
                            {step === 3 && (
                                <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                                        <div className="p-4 bg-gradient-to-br from-orange-900/60 to-slate-950 rounded-2xl space-y-1 border border-orange-900/30">
                                            <p className="text-[9px] font-black text-orange-300/60 uppercase tracking-widest">Portfolio Target</p>
                                            <p className="text-2xl sm:text-3xl font-black text-white">{portfolioTarget ? `₦${Number(portfolioTarget).toLocaleString()}` : "₦—"}</p>
                                            <p className="text-[10px] text-orange-400/70 font-semibold">Your total planned investment across all cooperative schemes</p>
                                        </div>

                                        {[
                                            { label: "Portfolio Target (₦)", value: portfolioTarget, setter: setPortfolioTarget, desc: "Total capital you plan to deploy across schemes" },
                                            { label: "Initial Commitment (₦)", value: initialCommit, setter: setInitialCommit, desc: "Amount you'll fund immediately to unlock the marketplace" },
                                        ].map(({ label, value, setter, desc }) => (
                                            <div key={label} className="space-y-1.5">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</label>
                                                <input value={value} onChange={e => setter(e.target.value.replace(/\D/g, ""))} type="tel" placeholder="0"
                                                    className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-sm font-black focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all" />
                                                <p className="text-[10px] text-muted-foreground font-semibold">{desc}</p>
                                            </div>
                                        ))}

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Payout Frequency</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                {[{ v: "monthly", l: "Monthly" }, { v: "quarterly", l: "Quarterly" }, { v: "semi_annual", l: "Semi-Annual" }].map(({ v, l }) => (
                                                    <button key={v} onClick={() => setPayoutFrequency(v)}
                                                        className={`py-2.5 rounded-xl border text-xs font-black transition-all ${payoutFrequency === v ? 'border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'border-slate-200 dark:border-slate-800 text-muted-foreground hover:border-slate-300'}`}>
                                                        {l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-900">
                                            <div>
                                                <p className="text-xs font-black">Auto-reinvest payouts</p>
                                                <p className="text-[10px] text-muted-foreground font-semibold">Automatically roll yields into new schemes</p>
                                            </div>
                                            <button onClick={() => setAutoReinvest(!autoReinvest)}
                                                className={`w-11 h-6 rounded-full transition-all relative ${autoReinvest ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${autoReinvest ? 'left-5' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 4: Compliance ──────────────────────── */}
                            {step === 4 && (
                                <motion.div key="s4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">BVN (Bank Verification Number)</label>
                                            <div className="flex gap-2">
                                                <input value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="11-digit BVN" type="tel" maxLength={11}
                                                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all" />
                                                {kycVerified ? (
                                                    <div className="h-10 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-black shrink-0">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                                                    </div>
                                                ) : (
                                                    <Button onClick={simulateKyc} disabled={verifying} size="sm" className="h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-black text-xs px-4 border-0">
                                                        {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify"}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">ID Type</label>
                                                <select value={idType} onChange={e => setIdType(e.target.value)}
                                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none">
                                                    <option value="nin">NIN</option>
                                                    <option value="voters_card">Voter's Card</option>
                                                    <option value="intl_passport">International Passport</option>
                                                    <option value="drivers_license">Driver's License</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">ID Number</label>
                                                <input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Enter ID number"
                                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none" />
                                            </div>
                                        </div>

                                        <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl space-y-3">
                                            <p className="text-[10px] font-black text-orange-700 dark:text-orange-400">Investor Accreditation</p>
                                            <div className="flex items-start gap-2.5">
                                                <button onClick={() => setAccredited(!accredited)}
                                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${accredited ? 'bg-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                    {accredited && <Check className="h-2.5 w-2.5 text-white" />}
                                                </button>
                                                <p className="text-[10px] font-semibold text-muted-foreground leading-relaxed">
                                                    I confirm I am an accredited investor with verifiable income or assets and understand the risks associated with cooperative investment schemes.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2.5">
                                            <button onClick={() => setAgreeTerms(!agreeTerms)}
                                                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${agreeTerms ? 'bg-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {agreeTerms && <Check className="h-2.5 w-2.5 text-white" />}
                                            </button>
                                            <p className="text-[10px] font-semibold text-muted-foreground leading-relaxed">
                                                I agree to Copteller's <span className="text-orange-600 dark:text-orange-400 hover:underline cursor-pointer">Investor Terms of Service</span> and the platform's <span className="text-orange-600 dark:text-orange-400 hover:underline cursor-pointer">escrow clearing policy</span>. *
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── STEP 5: Success ─────────────────────────── */}
                            {step === 5 && (
                                <motion.div key="s5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="text-center">
                                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 shadow-sm">
                                        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
                                            <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" />
                                            <div className="relative bg-orange-500/15 border border-orange-500/30 rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                                                <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h2 className="text-xl sm:text-2xl font-black">Portfolio Activated!</h2>
                                            <p className="text-xs sm:text-sm text-muted-foreground font-semibold leading-relaxed">
                                                Welcome to the Copteller Investor Marketplace. You can now underwrite cooperative schemes and earn structured yields.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left">
                                            {[
                                                { icon: Globe, title: "Browse Marketplace", desc: "Explore live cooperative schemes" },
                                                { icon: BarChart3, title: "Track Portfolio", desc: "Monitor your yield performance" },
                                                { icon: Bell, title: "Payout Alerts", desc: "Get notified on all returns" },
                                                { icon: ShieldCheck, title: "Escrow Secured", desc: "Bank-guaranteed clearing" },
                                            ].map(({ icon: Icon, title, desc }) => (
                                                <div key={title} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-1 border border-slate-100 dark:border-slate-900">
                                                    <Icon className="h-4 w-4 text-orange-500" />
                                                    <p className="text-xs font-black">{title}</p>
                                                    <p className="text-[10px] text-muted-foreground font-semibold">{desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <Button onClick={() => router.push("/copteller/investor")}
                                            className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black text-sm border-0 shadow-lg">
                                            Open Investor Dashboard →
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {step < 5 && (
                            <div className="flex gap-3">
                                {step > 1 && (
                                    <Button onClick={() => setStep(s => (s - 1) as StepId)} variant="outline"
                                        className="flex-1 h-12 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-sm">
                                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                                    </Button>
                                )}
                                <Button onClick={handleNext}
                                    className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-black text-sm border-0 shadow-lg shadow-orange-950/15">
                                    {step === 4 ? "Complete Setup" : "Continue"} <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        )}

                        <p className="text-center text-[10px] text-muted-foreground font-semibold">
                            Already registered? <Link href="/copteller/auth?redirect=/copteller/investor" className="text-orange-600 dark:text-orange-400 hover:underline font-black">Sign in →</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Needed for checkbox icon
function Check({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}
