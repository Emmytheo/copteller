"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, User, Users, Mail, Lock, ArrowLeft, RefreshCw, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { createCoptellerClient } from "@/lib/copteller/supabase/client"
import { CoptellerLogo } from "@/components/copteller/copteller-logo"

type AuthMode = 'login' | 'signup'
type CoptellerRole = 'member' | 'coop_admin'

const ROLE_DASHBOARD: Record<string, string> = {
    member: '/copteller/dashboard',
    coop_admin: '/copteller/admin',
    investor: '/copteller/investor',
    partner: '/copteller/partner',
    superadmin: '/copteller/superadmin',
    bank_staff: '/copteller/superadmin',
}

export default function CoptellerAuthPage() {
    const router = useRouter()
    const supabase = createCoptellerClient()

    const [mode, setMode] = React.useState<AuthMode>('login')
    const [role, setRole] = React.useState<CoptellerRole>('member')
    const [email, setEmail] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [name, setName] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const [showPassword, setShowPassword] = React.useState(false)
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
    const [signupSuccess, setSignupSuccess] = React.useState(false)

    // Redirect to portal if already signed in
    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.warn('[Copteller Auth] Stale session cleared:', error.message)
                supabase.auth.signOut().catch(() => {})
                return
            }
            if (session) {
                // Has a session — check profiles and route appropriately
                handlePostLoginRouting(session.user.id)
            }
        }).catch(() => {
            supabase.auth.signOut().catch(() => {})
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handlePostLoginRouting = async (userId: string) => {
        try {
            const res = await fetch('/api/copteller/profile?all=1')
            const data = await res.json()
            const profiles: any[] = data.profiles || []

            if (profiles.length === 0) {
                // Brand new user — no profiles yet
                router.replace('/copteller/onboarding')
            } else if (profiles.length === 1) {
                // Single profile — go straight to dashboard
                const p = profiles[0]
                localStorage.setItem('active_copteller_profile_id', p.id)
                localStorage.setItem('active_copteller_role', p.role)
                router.replace(ROLE_DASHBOARD[p.role] || '/copteller/dashboard')
            } else {
                // Multiple profiles — show selector
                router.replace('/copteller/select-profile')
            }
        } catch {
            router.replace('/copteller/onboarding')
        }
    }

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg(null)

        try {
            if (mode === 'login') {
                // ─── Sign In ────────────────────────────────────────────────
                const { data, error } = await supabase.auth.signInWithPassword({ email, password })

                if (error) {
                    setErrorMsg(error.message)
                    return
                }

                toast.success("Welcome back to Copteller!")
                await handlePostLoginRouting(data.user.id)

            } else {
                // ─── Sign Up ────────────────────────────────────────────────
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name, initial_role: role },
                    },
                })

                if (error) {
                    setErrorMsg(error.message)
                    return
                }

                if (data.user) {
                    // Create the initial profile server-side
                    try {
                        const profileRes = await fetch('/api/copteller/profile', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                role,
                                display_name: name,
                            }),
                        })
                        const profileData = await profileRes.json()

                        if (profileData.profile) {
                            localStorage.setItem('active_copteller_profile_id', profileData.profile.id)
                            localStorage.setItem('active_copteller_role', role)
                        }
                    } catch {
                        // Non-critical — user can still continue
                    }
                }

                // If email confirmation is required, Supabase won't have a session yet
                if (data.session) {
                    toast.success("Account created! Welcome to Copteller.")
                    router.replace('/copteller/onboarding')
                } else {
                    // Email confirmation pending
                    setSignupSuccess(true)
                }
            }
        } finally {
            setLoading(false)
        }
    }

    if (signupSuccess) {
        return (
            <div className="bg-background text-foreground min-h-[100dvh] flex flex-col justify-center items-center p-6 relative selection:bg-emerald-500/30">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/5 dark:bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-10 backdrop-blur-xl shadow-2xl text-center space-y-5"
                >
                    <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-black">Check Your Email</h2>
                    <p className="text-sm text-muted-foreground font-semibold leading-relaxed">
                        We sent a confirmation link to <span className="text-foreground font-black">{email}</span>.
                        Click it to activate your Copteller account, then come back to log in.
                    </p>
                    <Button
                        onClick={() => { setSignupSuccess(false); setMode('login') }}
                        className="w-full h-11 rounded-xl font-black bg-gradient-to-r from-emerald-500 to-amber-500 text-black border-0"
                    >
                        Back to Login
                    </Button>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="bg-background text-foreground min-h-[100dvh] flex flex-col justify-between items-center p-4 sm:p-6 relative selection:bg-emerald-500/30 overflow-x-clip">
            {/* Glowing backgrounds */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/5 dark:bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-600/5 dark:bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Back link */}
            <div className="w-full max-w-md pt-1 pb-4 relative z-10">
                <Link href="/copteller" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors py-1.5">
                    <ArrowLeft className="h-4 w-4" /> Back to landing
                </Link>
            </div>

            <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-5 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5 sm:space-y-6 relative my-auto">

                {/* Header */}
                <div className="text-center space-y-2.5">
                    <div className="flex justify-center pb-1">
                        <CoptellerLogo size="md" subtitle="Cooperative Escrow OS" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Sign In to Portal</h2>
                    <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                        Access your target savings, investment schemes, and hire purchase logs.
                    </p>
                </div>

                {/* Login / Signup tabs */}
                <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-900">
                    {(['login', 'signup'] as AuthMode[]).map(m => (
                        <button
                            key={m}
                            type="button"
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${mode === m ? 'bg-emerald-600 text-white dark:text-black shadow-sm font-black' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => { setMode(m); setErrorMsg(null) }}
                        >
                            {m === 'login' ? 'Login' : 'Sign Up'}
                        </button>
                    ))}
                </div>

                {/* Role selector — shown during signup */}
                <AnimatePresence>
                    {mode === 'signup' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-2 gap-4 overflow-hidden"
                        >
                            <button
                                type="button"
                                onClick={() => setRole('member')}
                                className={`p-4 border rounded-2xl flex flex-col items-center gap-2 transition-all ${role === 'member' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-900 bg-slate-100/40 dark:bg-slate-950/40 text-muted-foreground hover:text-foreground'}`}
                            >
                                <User className="h-5 w-5" />
                                <span className="text-xs font-extrabold">Coop Member</span>
                                <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight">Ajo thrift, HP, credit score</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('coop_admin')}
                                className={`p-4 border rounded-2xl flex flex-col items-center gap-2 transition-all ${role === 'coop_admin' ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-slate-200 dark:border-slate-900 bg-slate-100/40 dark:bg-slate-950/40 text-muted-foreground hover:text-foreground'}`}
                            >
                                <Users className="h-5 w-5" />
                                <span className="text-xs font-extrabold">Union Admin</span>
                                <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight">Manage members & assets</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error alert */}
                <AnimatePresence>
                    {errorMsg && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-xl p-3.5 text-xs font-semibold leading-relaxed"
                        >
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            {errorMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-4">
                    <AnimatePresence mode="wait">
                        {mode === 'signup' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1.5 overflow-hidden"
                            >
                                <label className="text-xs font-bold text-muted-foreground">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <input
                                        type="text" required placeholder="John Doe" value={name} onChange={e => setName(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl h-11 pl-10 pr-4 text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors text-foreground"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="email" required placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl h-11 pl-10 pr-4 text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors text-foreground"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-muted-foreground">Password</label>
                            {mode === 'login' && (
                                <Link href="/copteller/auth/forgot-password" className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                                    Forgot password?
                                </Link>
                            )}
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl h-11 pl-10 pr-10 text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors text-foreground"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(s => !s)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-foreground transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl font-black bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black shadow-lg shadow-emerald-950/20 text-xs border-0"
                    >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : mode === 'login' ? 'Login to Portal' : 'Create My Account'}
                    </Button>
                </form>
            </div>
            <div className="h-4 shrink-0" />
        </div>
    )
}
