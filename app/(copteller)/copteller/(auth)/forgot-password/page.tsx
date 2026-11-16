"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Mail, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createCoptellerClient } from "@/lib/copteller/supabase/client"

export default function CoptellerForgotPasswordPage() {
    const supabase = createCoptellerClient()
    const [email, setEmail] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const [sent, setSent] = React.useState(false)
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/copteller/auth/update-password`,
        })

        setLoading(false)

        if (error) {
            setErrorMsg(error.message)
        } else {
            setSent(true)
        }
    }

    return (
        <div className="bg-background text-foreground min-h-screen flex flex-col justify-center items-center p-6 relative selection:bg-emerald-500/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/5 dark:bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-600/5 dark:bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="absolute top-6 left-6">
                <Link href="/copteller/auth" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to login
                </Link>
            </div>

            <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6 relative">

                <AnimatePresence mode="wait">
                    {sent ? (
                        <motion.div
                            key="sent"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-5 py-4"
                        >
                            <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black">Reset Link Sent</h2>
                                <p className="text-sm text-muted-foreground font-semibold leading-relaxed">
                                    We sent a password reset link to{" "}
                                    <span className="text-foreground font-black">{email}</span>.
                                    Check your inbox and follow the instructions.
                                </p>
                            </div>
                            <Button asChild className="w-full h-11 rounded-xl font-black bg-gradient-to-r from-emerald-500 to-amber-500 text-black border-0">
                                <Link href="/copteller/auth">Back to Login</Link>
                            </Button>
                        </motion.div>
                    ) : (
                        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-black tracking-tight">Forgot Password?</h2>
                                <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                                    Enter the email address associated with your Copteller account. We'll send you a reset link.
                                </p>
                            </div>

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

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <input
                                            type="email" required placeholder="m@example.com"
                                            value={email} onChange={e => setEmail(e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl h-11 pl-10 pr-4 text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors text-foreground"
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 rounded-xl font-black bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black shadow-lg text-xs border-0"
                                >
                                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                                </Button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
