"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    React.useEffect(() => {
        console.error("[Copteller Error Boundary]", error?.message || error)
    }, [error])

    return (
        <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6 border border-border bg-card rounded-3xl p-8 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Session Recovery</p>
                    <h1 className="text-2xl font-black tracking-tight">Something Went Wrong</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                        We encountered an unexpected issue loading this view. You can retry safely or return to the main workspace.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <Button onClick={reset} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl">
                        <RefreshCw className="mr-1.5 h-4 w-4" /> Try Again
                    </Button>
                    <Button asChild variant="outline" className="flex-1 rounded-xl font-bold">
                        <Link href="/copteller">
                            <Home className="mr-1.5 h-4 w-4" /> Home
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
