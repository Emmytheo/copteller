"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
    Landmark, TrendingUp, ShieldCheck, Users2, ArrowRight,
    CircleDollarSign, Sparkles, Building2, ExternalLink, CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

interface EcosystemSynergyCardProps {
    partnerName?: string
    partnerBankName?: string
    partnerSector?: string
    escrowAccountNumber?: string
    availableFloat?: number
    syndicatedInvestorYield?: string
    activeEnrollees?: number
    compact?: boolean
    partnerShortName?: string
}

export function EcosystemSynergyCard({
    partnerName = "Abia State Health Insurance Agency (ABSHIA)",
    partnerBankName = "Partner MFB",
    partnerShortName = "ABSHIA Social Health",
    partnerSector = "Healthcare & Social Protection",
    escrowAccountNumber = "Live Provisioned Escrow NUBAN",
    availableFloat = 101500000,
    syndicatedInvestorYield = "+16.5% p.a.",
    activeEnrollees = 3420,
    compact = false
}: EcosystemSynergyCardProps) {
    const steps = [
        {
            num: "1",
            title: "Statutory Mandate",
            org: partnerShortName || partnerName,
            icon: Landmark,
            color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
            summary: "Parastatal sets policy, verifies providers & approves wholesale coverage terms.",
            metric: "Verified MOU"
        },
        {
            num: "2",
            title: "Investor Underwriting",
            org: "Syndicated Diaspora & Private Capital",
            icon: TrendingUp,
            color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
            summary: "Investors co-fund float tranches to expand capacity and earn sustainable yield.",
            metric: `${syndicatedInvestorYield} Yield`
        },
        {
            num: "3",
            title: `${partnerBankName} Escrow`,
            org: escrowAccountNumber.startsWith("Live") ? escrowAccountNumber : `Dedicated NUBAN ${escrowAccountNumber}`,
            icon: ShieldCheck,
            color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
            summary: "Automated liquidity pre-payments to accredited hospitals & inspection hubs.",
            metric: `${fmt(availableFloat)} Pool`
        },
        {
            num: "4",
            title: "Cooperative Members",
            org: "Grassroots Ajo & Union Clusters",
            icon: Users2,
            color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
            summary: "Instant 0-downpayment access, amortized automatically at affordable weekly dues.",
            metric: `${activeEnrollees.toLocaleString()} Enrollees`
        }
    ]

    return (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-blue-950/20 via-background to-emerald-950/20 border border-blue-500/20 shadow-sm space-y-5 font-sans relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3" /> Tripartite Holistic Architecture
                        </span>
                        <Badge variant="outline" className="text-[10px] font-black border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                            Institution ⇄ Investor ⇄ Cooperative
                        </Badge>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-foreground">
                        How Institutional Schemes &amp; Investor Underwriting Power Grassroots Growth
                    </h3>
                    <p className="text-xs text-muted-foreground font-semibold max-w-2xl">
                        Statutory parastatals deploy policy mandates, private investors underwrite expansion liquidity, and cooperative members repay effortlessly through automated weekly micro-dues.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Link href="/copteller/investor/schemes">
                        <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold text-xs gap-1.5 border-border bg-card">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            Underwrite as Investor
                        </Button>
                    </Link>
                </div>
            </div>

            {/* 4-Step Diagram Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative">
                {steps.map((step, idx) => {
                    const Icon = step.icon
                    return (
                        <div
                            key={step.num}
                            className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between space-y-3 relative group hover:border-blue-500/40 transition-all"
                        >
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className={`p-2 rounded-xl border ${step.color}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-mono font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                        Step {step.num}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                                        {step.title}
                                    </span>
                                    <h4 className="text-xs font-black text-foreground truncate mt-0.5">
                                        {step.org}
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground font-medium mt-1 leading-relaxed line-clamp-2">
                                        {step.summary}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                    Output
                                </span>
                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-[11px]">
                                    {step.metric}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Footer Summary Strip */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>
                        <strong>Zero-Default Guarantee:</strong> Float repayments are automatically deducted from members' daily Ajo wallet inflows prior to withdrawal.
                    </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px] font-bold">
                    <span className="text-blue-600 dark:text-blue-400">
                        Average Repayment Streak: <strong>14.8 Weeks</strong>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                        PAR (&lt;30d): <strong>2.4% (Prime)</strong>
                    </span>
                </div>
            </div>

        </div>
    )
}
