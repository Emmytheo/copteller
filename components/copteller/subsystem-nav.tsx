"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Server,
    Workflow,
    History,
    Clock,
    Globe,
    Plug,
    KeyRound,
    Link2,
    Zap,
    Play,
    Package,
    TrendingUp,
} from "lucide-react"

interface SubsystemItem {
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    exact?: boolean
}

const AUTOMATION_ITEMS: SubsystemItem[] = [
    { label: "Infrastructure", href: "/copteller/superadmin/infrastructure", icon: Server },
    { label: "Workflows", href: "/copteller/superadmin/workflows", icon: Workflow, exact: true },
    { label: "Run History", href: "/copteller/superadmin/workflows/runs", icon: History },
    { label: "Scheduled Jobs", href: "/copteller/superadmin/workflows/scheduled-jobs", icon: Clock },
    { label: "API Endpoints", href: "/copteller/superadmin/endpoints", icon: Globe },
    { label: "Service Providers", href: "/copteller/superadmin/providers", icon: Plug },
    { label: "Secret Vault", href: "/copteller/superadmin/vault", icon: KeyRound },
    { label: "Provider Mappings", href: "/copteller/superadmin/mappings", icon: Link2 },
]

const FACTORY_ITEMS: SubsystemItem[] = [
    { label: "Services Matrix", href: "/copteller/superadmin/services", icon: Zap, exact: true },
    { label: "Service Simulator", href: "/copteller/superadmin/services/simulator", icon: Play },
    { label: "Financial Products", href: "/copteller/superadmin/products", icon: Package },
    { label: "Schemes", href: "/copteller/superadmin/schemes", icon: TrendingUp },
]

export function CoptellerSubsystemNav({
    group = "automation",
    compact = false,
}: {
    group?: "automation" | "factory"
    compact?: boolean
}) {
    const pathname = usePathname() || ""
    const items = group === "automation" ? AUTOMATION_ITEMS : FACTORY_ITEMS

    return (
        <nav
            aria-label={group === "automation" ? "Automation & Infrastructure Subsystems" : "Product & Service Factory Subsystems"}
            className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
                compact
                    ? "px-4 py-2 bg-card/90 border-b border-border/80 shrink-0"
                    : "p-1.5 rounded-2xl bg-muted/50 border border-border/70"
            }`}
        >
            {items.map((item) => {
                const Icon = item.icon
                const active = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                            active
                                ? "bg-background text-primary shadow-sm border border-border/80"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                        }`}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                    </Link>
                )
            })}
        </nav>
    )
}
