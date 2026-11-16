"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Landmark, HeartPulse, Truck, Wheat, Award, ChevronDown, Check,
    Layers, CreditCard, Settings, Sparkles, Building2, ShieldCheck
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePartnerOrg } from "@/context/partner-org-context"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

const SECTOR_ICON_MAP: Record<string, any> = {
    health: HeartPulse,
    transport: Truck,
    agriculture: Wheat,
    commerce: Award,
    multi_sector: Landmark
}

const SECTOR_COLOR_MAP: Record<string, { bg: string, text: string, border: string }> = {
    health: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
    transport: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
    agriculture: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
    commerce: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
    multi_sector: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" }
}

export function PartnerScopeBar() {
    const pathname = usePathname()
    const {
        activeOrg,
        activeOrgSlug,
        activeSubscopeId,
        activeSubscope,
        switchOrg,
        switchSubscope,
        allOrgs,
        allSubscopes
    } = usePartnerOrg()

    const OrgIcon = SECTOR_ICON_MAP[activeOrg.sector] || Landmark
    const orgColors = SECTOR_COLOR_MAP[activeOrg.sector] || SECTOR_COLOR_MAP.multi_sector

    return (
        <div className="font-sans mb-2">
            {/* ── UNIFIED APEX SCOPE CONSOLE (NO REDUNDANT TABS) ──────────────── */}
            <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 transition-all">
                
                {/* Left: Organization Identity & Switcher */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 sm:p-3 rounded-2xl ${orgColors.bg} ${orgColors.text} border ${orgColors.border} shrink-0`}>
                        <OrgIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                Institutional Desk
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md truncate max-w-[120px] sm:max-w-none">
                                {activeOrg.regNumber}
                            </span>
                            <Badge variant="outline" className="text-[9px] font-black border-emerald-500/30 text-emerald-600 bg-emerald-500/5 px-1.5 py-0">
                                Verified MOU
                            </Badge>
                        </div>

                        {/* Organization Dropdown */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-1.5 text-sm sm:text-base md:text-lg font-black text-foreground hover:text-blue-600 transition-colors text-left group">
                                        <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-md">{activeOrg.name}</span>
                                        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 shrink-0" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-80 rounded-2xl p-2 font-sans z-50">
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                                        Switch Institutional Partner
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {allOrgs.map(org => {
                                        const ItemIcon = SECTOR_ICON_MAP[org.sector] || Landmark
                                        return (
                                            <DropdownMenuItem
                                                key={org.slug}
                                                onClick={() => switchOrg(org.slug)}
                                                className={`rounded-xl p-2.5 cursor-pointer flex items-center justify-between gap-2.5 ${
                                                    activeOrgSlug === org.slug ? "bg-muted font-black" : "font-semibold"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="p-1.5 rounded-lg bg-muted text-foreground shrink-0">
                                                        <ItemIcon className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-foreground truncate">{org.name}</p>
                                                        <p className="text-[10px] text-muted-foreground capitalize">{org.sector} Sector &bull; {org.category.replace(/_/g, " ")}</p>
                                                    </div>
                                                </div>
                                                {activeOrgSlug === org.slug && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                                            </DropdownMenuItem>
                                        )
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Right: Sub-Scope Selector & Escrow Float Badge */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 shrink-0">
                    
                    {/* Operational Subscope Dropdown */}
                    <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/60">
                        <Layers className="h-3.5 w-3.5 text-blue-600 ml-1.5 shrink-0" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 sm:h-8 rounded-xl font-black text-xs gap-1 px-2 text-foreground hover:bg-background"
                                >
                                    <span className="truncate max-w-[130px] sm:max-w-[170px]">
                                        {activeSubscope ? activeSubscope.name : "Statewide Apex Pool"}
                                    </span>
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-72 rounded-2xl p-2 font-sans z-50">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                                    Sub-Scope / Directorate Cluster
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => switchSubscope("all")}
                                    className={`rounded-xl p-2.5 cursor-pointer flex items-center justify-between gap-2 ${
                                        activeSubscopeId === "all" ? "bg-muted font-black" : "font-semibold"
                                    }`}
                                >
                                    <div>
                                        <p className="text-xs text-foreground">Consolidated Apex Desk</p>
                                        <p className="text-[10px] text-muted-foreground">Macro Statewide Portfolio & Reserve</p>
                                    </div>
                                    {activeSubscopeId === "all" && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {allSubscopes.map(sub => (
                                    <DropdownMenuItem
                                        key={sub.id}
                                        onClick={() => switchSubscope(sub.id)}
                                        className={`rounded-xl p-2.5 cursor-pointer flex items-center justify-between gap-2 ${
                                            activeSubscopeId === sub.id ? "bg-muted font-black" : "font-semibold"
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-mono text-blue-600 bg-blue-500/10 px-1.5 py-0.2 rounded font-black">
                                                    {sub.code}
                                                </span>
                                                <p className="text-xs text-foreground truncate font-bold">{sub.name}</p>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{sub.description}</p>
                                        </div>
                                        {activeSubscopeId === sub.id && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Escrow Float Account Indicator */}
                    <Link href="/copteller/partner/settlements" className="block">
                        <div className="px-3 py-1.5 sm:py-2 rounded-2xl bg-slate-900 text-white shadow-sm border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-2.5">
                            <div className="p-1 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                                <CreditCard className="h-3.5 w-3.5" />
                            </div>
                            <div className="text-left">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold truncate">
                                        Escrow {activeOrg.escrowAccount.accountNumber}
                                    </span>
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                </div>
                                <p className="text-xs font-mono font-black text-emerald-400 leading-tight">
                                    {fmt(activeOrg.escrowAccount.availableFloatKobo / 100)} <span className="text-[9px] font-sans font-bold text-slate-400">Float</span>
                                </p>
                            </div>
                        </div>
                    </Link>

                    {/* Governance & Escrow Link */}
                    <Link href="/copteller/partner/governance">
                        <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 sm:h-9 rounded-xl border-border bg-card hover:bg-muted font-bold text-xs gap-1.5 px-2.5 ${
                                pathname.startsWith("/copteller/partner/governance") || pathname.startsWith("/copteller/partner/settings")
                                    ? "border-blue-500 text-blue-600 bg-blue-500/10 shadow-sm"
                                    : "text-foreground"
                            }`}
                            title="Institutional Governance & Escrow Console"
                        >
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                            <span className="hidden sm:inline">Governance &amp; Escrow</span>
                        </Button>
                    </Link>

                </div>
            </div>
        </div>
    )
}
