"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

function CallbackInner() {
    const searchParams = useSearchParams()
    const transactionId = searchParams.get("transactionId") || searchParams.get("reference") || ""
    const [state, setState] = React.useState<{ loading: boolean; verified: boolean; message: string; payment?: any }>({
        loading: true,
        verified: false,
        message: "Verifying transaction server-side with OlivePay...",
    })

    React.useEffect(() => {
        if (!transactionId) {
            setState({ loading: false, verified: false, message: "Missing transactionId in callback URL." })
            return
        }
        fetch("/api/copteller/wallet/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId, type: "checkout" }),
        })
            .then((r) => r.json())
            .then((data) => {
                setState({
                    loading: false,
                    verified: Boolean(data.verified),
                    message: data.verified
                        ? `Payment verified (${data.railMode}) and credited to your Copteller Wallet!`
                        : data.error || "Payment has not succeeded.",
                    payment: data.payment,
                })
            })
            .catch((err) => {
                setState({ loading: false, verified: false, message: err.message || "Verification error." })
            })
    }, [transactionId])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center space-y-5 shadow-lg">
                {state.loading ? (
                    <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto" />
                ) : state.verified ? (
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                ) : (
                    <XCircle className="h-12 w-12 text-rose-500 mx-auto" />
                )}

                <h1 className="text-xl font-black">
                    {state.loading ? "Verifying Settlement..." : state.verified ? "Wallet Credited" : "Payment Incomplete"}
                </h1>
                <p className="text-xs text-muted-foreground font-semibold">{state.message}</p>

                {state.payment && (
                    <div className="p-4 rounded-2xl bg-muted/40 border text-xs font-mono space-y-1.5 text-left">
                        <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-bold">{state.payment.transactionId}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold text-emerald-600">₦{state.payment.amount}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-bold uppercase">{state.payment.status}</span></div>
                    </div>
                )}

                <Button asChild className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs">
                    <Link href="/copteller/wallet">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Return to Copteller Wallet
                    </Link>
                </Button>
            </div>
        </div>
    )
}

export default function WalletCallbackPage() {
    return (
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <CallbackInner />
        </React.Suspense>
    )
}
