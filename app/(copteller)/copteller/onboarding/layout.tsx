"use client"

import * as React from "react"
import Link from "next/link"
import { ThemeCustomizer } from "@/components/theme-customizer"
import { CoptellerLogo } from "@/components/copteller/copteller-logo"

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans selection:bg-emerald-500/30">
            {/* Onboarding global utility bar */}
            <header className="sticky top-0 z-40 w-full border-b border-emerald-500/10 dark:border-emerald-500/5 bg-background/80 backdrop-blur-xl shrink-0">
                <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 md:px-8">
                    {/* Logo */}
                    <Link href="/copteller" className="flex items-center group transition-transform hover:scale-[1.01]">
                        <CoptellerLogo size="sm" subtitle="Cooperative Escrow OS" />
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
