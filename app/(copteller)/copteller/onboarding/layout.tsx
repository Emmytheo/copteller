"use client"

import * as React from "react"
import Link from "next/link"
import { Cpu } from "lucide-react"
import { ThemeCustomizer } from "@/components/theme-customizer"

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-emerald-500/30">
            {/* Onboarding global utility bar */}
            <header className="sticky top-0 z-40 w-full border-b border-emerald-500/10 dark:border-emerald-500/5 bg-background/80 backdrop-blur-xl shrink-0">
                <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 md:px-8">
                    {/* Logo */}
                    <Link href="/copteller" className="flex items-center gap-2 group">
                        <div className="p-1.5 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-xl shadow-lg">
                            <Cpu className="h-4 w-4 text-black font-black" />
                        </div>
                        <span className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-amber-500 dark:from-emerald-350 dark:to-amber-355">
                            COPTELLER
                        </span>
                    </Link>

                    {/* Theme Customizer / Switcher */}
                    <div className="flex items-center gap-3">
                        <ThemeCustomizer />
                        <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider hidden sm:inline-block">
                            Onboarding Workspace
                        </span>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col relative">
                {children}
            </main>
        </div>
    )
}
