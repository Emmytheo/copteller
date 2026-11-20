"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, Award, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { CoptellerLogo } from "@/components/copteller/copteller-logo"
import { motion, AnimatePresence } from "framer-motion"

export default function CoptellerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

    // Dynamic routing path states based on session checks
    const [portalPath, setPortalPath] = React.useState("/copteller/onboarding")
    const [loginText, setLoginText] = React.useState("Login")
    const [loginPath, setLoginPath] = React.useState("/copteller/auth?redirect=/copteller/dashboard")
    const [isLoggedIn, setIsLoggedIn] = React.useState(false)

    React.useEffect(() => {
        setMobileMenuOpen(false)
    }, [pathname])

    React.useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch("/api/copteller/profile")
                if (res.status === 200) {
                    const data = await res.json()
                    if (data.success) {
                        setIsLoggedIn(true)
                        setLoginText("Portal Dashboard")
                        if (data.role === "superadmin" || data.role === "bank_staff") {
                            setPortalPath("/copteller/superadmin")
                            setLoginPath("/copteller/superadmin")
                        } else if (data.role === "coop_admin") {
                            setPortalPath("/copteller/admin")
                            setLoginPath("/copteller/admin")
                        } else if (data.role === "investor") {
                            setPortalPath("/copteller/investor")
                            setLoginPath("/copteller/investor")
                        } else {
                            setPortalPath("/copteller/dashboard")
                            setLoginPath("/copteller/dashboard")
                        }
                    }
                }
            } catch (err) {
                console.error("Session check failed", err)
            }
        }
        checkSession()
    }, [])

    return (
        <div className="bg-background text-foreground min-h-[100dvh] flex flex-col font-sans overflow-x-clip selection:bg-emerald-500/30">
            {/* Custom Copteller Glass Navbar */}
            <header className="sticky top-0 z-50 w-full border-b border-emerald-500/10 dark:border-emerald-500/5 bg-background/85 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 md:px-8">
                    
                    {/* Logo */}
                    <Link href="/copteller" className="flex items-center group transition-transform hover:scale-[1.01]">
                        <CoptellerLogo size="md" subtitle="Cooperative Escrow OS" />
                    </Link>

                    {/* Nav Links (Desktop) */}
                    <nav className="hidden lg:flex items-center gap-6 text-xs font-black text-muted-foreground uppercase tracking-widest">
                        <Link href="/copteller/features" className="hover:text-emerald-500 transition-colors">Features</Link>
                        <Link href="/copteller/products" className="hover:text-emerald-500 transition-colors">Registry</Link>
                        <Link href="/copteller/simulator" className="hover:text-emerald-500 transition-colors">Simulator</Link>
                        <Link href="/copteller/investment" className="hover:text-amber-500 transition-colors">Investment</Link>
                        <Link href="/copteller/mobility" className="hover:text-orange-500 transition-colors">Mobility</Link>
                        <Link href="/copteller/governance" className="hover:text-emerald-500 transition-colors">Governance</Link>
                    </nav>

                    {/* CTA Buttons & Theme Switcher (Desktop) */}
                    <div className="hidden lg:flex items-center gap-3">
                        <ThemeSwitcher />
                        <Link href={loginPath} className="text-xs font-black text-muted-foreground hover:text-foreground uppercase tracking-widest px-2 py-1.5 transition-colors">
                            {loginText}
                        </Link>
                        <Button asChild size="sm" className="bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black font-black rounded-xl px-5 h-9 text-xs">
                            <Link href={portalPath}>{isLoggedIn ? "Go to Dashboard" : "Launch Portal"}</Link>
                        </Button>
                    </div>

                    {/* Mobile Menu Actions */}
                    <div className="flex lg:hidden items-center gap-2">
                        <ThemeSwitcher />
                        <button 
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>

                </div>

                {/* Mobile Dropdown Panel */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="lg:hidden border-b border-emerald-500/10 bg-background/95 backdrop-blur-xl absolute top-16 left-0 right-0 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto shadow-2xl"
                        >
                            <nav className="flex flex-col p-4 sm:p-6 space-y-2 text-xs font-black text-muted-foreground uppercase tracking-widest border-t dark:border-slate-900">
                                <Link href="/copteller/features" className="hover:text-emerald-500 transition-colors py-3 border-b border-slate-100 dark:border-slate-900">Features</Link>
                                <Link href="/copteller/products" className="hover:text-emerald-500 transition-colors py-3 border-b border-slate-100 dark:border-slate-900">Registry</Link>
                                <Link href="/copteller/simulator" className="hover:text-emerald-500 transition-colors py-3 border-b border-slate-100 dark:border-slate-900">Simulator</Link>
                                <Link href="/copteller/investment" className="hover:text-amber-500 transition-colors py-3 border-b border-slate-100 dark:border-slate-900">Investment</Link>
                                <Link href="/copteller/mobility" className="hover:text-orange-500 transition-colors py-3 border-b border-slate-100 dark:border-slate-900">Mobility</Link>
                                <Link href="/copteller/governance" className="hover:text-emerald-500 transition-colors py-3 border-b border-slate-100 dark:border-slate-900">Governance</Link>
                                
                                <div className="flex flex-col xs:flex-row sm:flex-row gap-3 pt-4">
                                    <Button asChild variant="outline" className="flex-1 text-xs font-black h-11 rounded-xl">
                                        <Link href={loginPath}>{loginText}</Link>
                                    </Button>
                                    <Button asChild className="flex-1 bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black font-black h-11 rounded-xl text-xs border-none">
                                        <Link href={portalPath}>{isLoggedIn ? "Dashboard" : "Launch Portal"}</Link>
                                    </Button>
                                </div>
                            </nav>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Custom Copteller Footer */}
            <footer className="border-t border-emerald-500/10 bg-slate-50 dark:bg-[#080808] py-12">
                <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-4">
                        <Link href="/copteller" className="inline-flex items-center">
                            <CoptellerLogo size="sm" subtitle="Cooperative Escrow OS" />
                        </Link>
                        <p className="text-[10px] font-semibold text-muted-foreground leading-relaxed">
                            A secure, escrow-backed subdivision driving digital Ajo thrift cycles and automated fleet Hire Purchase models for trade guilds.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase text-foreground tracking-wider">Product Funnel</h4>
                        <ul className="text-[10px] font-bold text-muted-foreground space-y-2">
                            <li><Link href="/copteller/features" className="hover:text-foreground transition-colors">Digital Ajo Thrift</Link></li>
                            <li><Link href="/copteller/products" className="hover:text-foreground transition-colors">Cooperative Product Registry</Link></li>
                            <li><Link href="/copteller/simulator" className="hover:text-foreground transition-colors">Unified Finance Simulator</Link></li>
                            <li><Link href="/copteller/investment" className="hover:text-foreground transition-colors">Asset Partnerships</Link></li>
                            <li><Link href="/copteller/mobility" className="hover:text-foreground transition-colors">Mobility Fleet Suite</Link></li>
                            <li><Link href="/copteller/governance" className="hover:text-foreground transition-colors">Governance Mandate</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase text-foreground tracking-wider">Compliance</h4>
                        <ul className="text-[10px] font-bold text-muted-foreground space-y-2">
                            <li className="flex items-center gap-1.5 text-foreground"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Licensed Escrow Clearing</li>
                            <li className="flex items-center gap-1.5 text-foreground"><Award className="h-3.5 w-3.5 text-amber-500" /> Secure Vault Escrow</li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase text-foreground tracking-wider">Union Workspace</h4>
                        <p className="text-[10px] font-semibold text-muted-foreground leading-relaxed">
                            Access credentials or register your cooperative group to deploy tools and micro-savings models.
                        </p>
                        <div className="pt-1">
                            <Button asChild size="sm" variant="outline" className="border-emerald-500/25 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black h-8 rounded-lg">
                                <Link href={portalPath}>Access Portal</Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 md:px-8 pt-8 mt-8 border-t border-emerald-500/10 text-center">
                    <p className="text-[9px] font-bold text-muted-foreground">
                        &copy; 2026 Copteller Sub-Platform. Secure clearing operations are powered by our licensed partner microfinance vaults.
                    </p>
                </div>
            </footer>
        </div>
    )
}
