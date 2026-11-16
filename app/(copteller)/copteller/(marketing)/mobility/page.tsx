"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { 
    Car, 
    TrendingUp, 
    ShieldCheck, 
    ArrowRight, 
    Smartphone, 
    Users, 
    Activity, 
    Award,
    Sparkles,
    CheckCircle2
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CoptellerMobilityPage() {
    const [mockTrips, setMockTrips] = React.useState<number>(12)
    const mockFarePerTrip = 3000
    const mockHpPercent = 15 // 15% auto-deduct

    const totalFares = mockTrips * mockFarePerTrip
    const hpDeduction = (totalFares * mockHpPercent) / 100

    return (
        <div className="bg-background text-foreground min-h-[100dvh] py-16 px-6 md:px-8 relative overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-600/5 dark:bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-600/5 dark:bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto space-y-16 relative z-10">
                
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <Sparkles className="h-3.5 w-3.5" /> Coming Soon
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                        Proprietary Mobility Suite
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                        An exclusive gig booking and ride-hailing framework designed specifically for cooperative transport networks, logistics providers, and delivery operators.
                    </p>
                </div>

                {/* Grid: Why the mobility suite is a game-changer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 space-y-4 backdrop-blur-md">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl w-fit">
                            <Car className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-black">Automated Booking Engine</h3>
                        <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                            Instead of hunting for passengers in gridlock, operators receive pre-routed bookings directly on their mobile screens. Active transport cooperative members get priority routing in commercial transit hubs.
                        </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 space-y-4 backdrop-blur-md">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl w-fit">
                            <Activity className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-black">Earning Deductions at Source</h3>
                        <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                            No more manual ledger repayments. A union-configured share of completed passenger fares is automatically allocated directly to the operator's hire-purchase contract vault.
                        </p>
                    </div>
                </div>

                {/* Ride Hailing Live simulator */}
                <div className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-[32px] p-8 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center backdrop-blur-md">
                    
                    <div className="lg:col-span-7 space-y-6">
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            Illustrative Earnings Split Model
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black">Trip Deduction Simulator</h3>
                        <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                            Adjust completed weekly trips to model how a booking fare automatically splits between the cooperative Hire-Purchase contract ledger and operator settlement.
                        </p>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-muted-foreground">Weekly Completed Trips</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{mockTrips} Trips</span>
                                </div>
                                <input 
                                    type="range" min={5} max={40} step={1} value={mockTrips} onChange={(e) => setMockTrips(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 flex justify-center">
                        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm text-xs font-bold space-y-4 divide-y divide-slate-200 dark:divide-slate-800/80 shadow-lg">
                            
                            <div className="pb-3 text-center font-black">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Sample Gross Weekly Revenue</p>
                                <p className="text-3xl font-black mt-1">₦{totalFares.toLocaleString()}</p>
                            </div>

                            <div className="pt-3 flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                                <span>HP Contract Allocation ({mockHpPercent}%)</span>
                                <span className="text-amber-600 dark:text-amber-400 font-black">-₦{hpDeduction.toLocaleString()}</span>
                            </div>

                            <div className="pt-3 flex justify-between items-center text-[10px] text-foreground">
                                <span>Net Driver Settlement</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-black">₦{(totalFares - hpDeduction).toLocaleString()}</span>
                            </div>

                        </div>
                    </div>

                </div>

                {/* Benefits List to drive adoptions */}
                <div className="max-w-4xl mx-auto space-y-6">
                    <h3 className="text-xl font-black text-center">Planned Ecosystem Capabilities for Fleet Members</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            "Structured priority access to union-managed commercial vehicle allocations.",
                            "Transparent trip-history scoring to qualify for lower deposit requirements.",
                            "Scheduled maintenance and insurance deductions tied cleanly to fare splits.",
                            "Direct syncing with partner garage and inspection schedules."
                        ].map((ben, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-xl">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="text-xs text-muted-foreground font-semibold">{ben}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}

