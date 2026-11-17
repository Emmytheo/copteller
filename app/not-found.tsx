import Link from "next/link"
import { ArrowLeft, Compass, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
    return (
        <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6 border border-border bg-card rounded-3xl p-8 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                    <Compass className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">404 — Route Not Found</p>
                    <h1 className="text-2xl font-black tracking-tight">Page Unavailable</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                        The Copteller page or scheme link you requested may have moved or requires an authorized cooperative session.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <Button asChild className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl">
                        <Link href="/copteller">
                            <ArrowLeft className="mr-1.5 h-4 w-4" /> Copteller Home
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1 rounded-xl font-bold">
                        <Link href="/copteller/dashboard">
                            <ShieldCheck className="mr-1.5 h-4 w-4" /> Portal
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
