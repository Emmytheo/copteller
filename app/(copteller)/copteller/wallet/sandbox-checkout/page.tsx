"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ShieldCheck, CheckCircle2, XCircle, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function SandboxCheckoutInner() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const transactionId = searchParams.get("transactionId") || `SBX-${Date.now()}`
    const amount = searchParams.get("amount") || "5000.00"
    const callbackUrl = searchParams.get("callbackUrl") || "/copteller/wallet/callback"

    const [processing, setProcessing] = React.useState<"success" | "failed" | null>(null)

    const simulateOutcome = async (outcome: "success" | "failed") => {
        setProcessing(outcome)
        try {
            const res = await fetch("/api/copteller/olivepay/sandbox/simulate-webhook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event: outcome === "success" ? "payment.success" : "payment.failed",
                    transactionId,
                    amount: Number(amount),
                }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "Webhook dispatch failed")

            toast.success(
                outcome === "success"
                    ? "Signed payment.success webhook delivered! Redirecting to verification callback..."
                    : "Signed payment.failed webhook delivered!"
            )

            const sep = callbackUrl.includes("?") ? "&" : "?"
            router.push(`${callbackUrl}${sep}transactionId=${encodeURIComponent(transactionId)}&status=${outcome}`)
        } catch (err: any) {
            toast.error(err.message || "Simulation failed")
            setProcessing(null)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
            <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        <Sparkles className="h-3 w-3" /> OlivePay Sandbox Checkout
                    </span>
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>

                <div>
                    <p className="text-xs text-slate-400 font-semibold">Amount Payable</p>
                    <p className="text-3xl font-black font-mono text-emerald-400 mt-1">
                        ₦{Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 mt-2">Ref: {transactionId}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                    Clicking below cryptographically signs an authentic OlivePay webhook with HMAC-SHA256, dispatches it to{" "}
                    <code className="text-emerald-400">/api/webhooks/olivepay</code>, and redirects you to{" "}
                    <code className="text-emerald-400">/copteller/wallet/callback</code> for server-side verification.
                </div>

                <div className="space-y-3">
                    <Button
                        onClick={() => simulateOutcome("success")}
                        disabled={processing !== null}
                        className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs gap-2"
                    >
                        {processing === "success" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Simulate Payment Success (Card / Transfer)
                    </Button>
                    <Button
                        onClick={() => simulateOutcome("failed")}
                        disabled={processing !== null}
                        variant="outline"
                        className="w-full h-11 rounded-xl border-rose-500/30 text-rose-400 hover:bg-rose-950/30 font-bold text-xs gap-2"
                    >
                        {processing === "failed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Simulate Payment Failure / Cancellation
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default function SandboxCheckoutPage() {
    return (
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-950 text-white"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <SandboxCheckoutInner />
        </React.Suspense>
    )
}
