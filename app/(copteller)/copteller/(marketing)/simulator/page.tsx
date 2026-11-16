"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    PiggyBank, Truck, Coins, Sparkles, ArrowRight, ShieldCheck,
    TrendingUp, Calculator, HelpCircle, AlertCircle, Info, RefreshCw
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function SavingsFinanceSimulatorPage() {
    const [activeTab, setActiveTab] = React.useState<"ajo" | "hp" | "loans">("ajo")

    // Ajo Cycles State
    const [ajoContrib, setAjoContrib] = React.useState<number>(15000)
    const [ajoMembers, setAjoMembers] = React.useState<number>(10)
    const [ajoFreq, setAjoFreq] = React.useState<"daily" | "weekly" | "monthly">("weekly")

    // Hire Purchase State
    const [hpFleet, setHpFleet] = React.useState<number>(6)
    const [hpRate, setHpRate] = React.useState<number>(16000)
    const [hpMonths, setHpMonths] = React.useState<number>(18)

    // Micro Loans State
    const [loanAmount, setLoanAmount] = React.useState<number>(150000)
    const [loanMonths, setLoanMonths] = React.useState<number>(6)
    const [loanRate, setLoanRate] = React.useState<number>(15)

    // Calculations
    const ajoTotalPool = ajoContrib * ajoMembers
    const ajoDays = ajoMembers * (ajoFreq === "daily" ? 1 : ajoFreq === "weekly" ? 7 : 30)

    const hpVehiclePrice = 1400000 // sample asset cost in ₦
    const hpTotalCapital = hpFleet * hpVehiclePrice
    const hpWeeklyPool = hpFleet * hpRate
    const hpTotalWeeks = Math.round((hpMonths * 30.4) / 7)
    const hpTotalContractReturn = hpWeeklyPool * hpTotalWeeks
    const hpAnnualReturn = (hpWeeklyPool * 52)
    const hpPaybackWeeks = Math.ceil(hpVehiclePrice / hpRate)

    const loanTotalInterest = (loanAmount * loanRate * (loanMonths / 12)) / 100
    const loanTotalRepay = loanAmount + loanTotalInterest
    const loanMonthlyInstallment = loanTotalRepay / loanMonths
    const loanWeeklyInstallment = loanTotalRepay / (loanMonths * 4.34)

    const fmt = (n: number) => `₦${Math.round(n).toLocaleString()}`

    return (
        <div className="bg-background text-foreground min-h-[100dvh] py-16 px-6 md:px-8 relative overflow-hidden font-sans">
            {/* Ambient background glows */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/5 dark:bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-amber-600/5 dark:bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                
                {/* Header */}
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest">
                        Illustrative Planning Model
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                        Savings & Finance Simulator
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Model Ajo rotation pools, fleet Hire-Purchase repayment timelines, or micro-loan installments before registering your cooperative program.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex justify-center">
                    <div className="flex bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-900 w-full max-w-md">
                        {[
                            { id: "ajo", label: "Ajo Cycle", icon: PiggyBank },
                            { id: "hp", label: "Hire Purchase", icon: Truck },
                            { id: "loans", label: "Micro Loans", icon: Coins },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as any)}
                                className={`flex-1 py-3 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                    activeTab === t.id
                                        ? 'bg-white dark:bg-slate-900 text-foreground border border-slate-200 dark:border-slate-800 shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <t.icon className="h-4 w-4" />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Simulator Content Grid */}
                <div className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-[32px] p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch backdrop-blur-md">
                    
                    {/* Left: Inputs & Sliders */}
                    <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl md:text-2xl font-black">Configure Parameters</h3>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-semibold">Adjust the sliders to preview how contributions and repayment schedules scale across cycles.</p>
                            </div>

                            <AnimatePresence mode="wait">
                                {activeTab === "ajo" && (
                                    <motion.div key="ajo" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-black">
                                                <span className="text-muted-foreground">Daily/Weekly Contribution</span>
                                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{fmt(ajoContrib)}</span>
                                            </div>
                                            <input type="range" min={2000} max={100000} step={2000} value={ajoContrib} onChange={(e) => setAjoContrib(Number(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-black">
                                                <span className="text-muted-foreground">Cycle Members (Slots)</span>
                                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{ajoMembers} Members</span>
                                            </div>
                                            <input type="range" min={3} max={24} step={1} value={ajoMembers} onChange={(e) => setAjoMembers(Number(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                        </div>
                                        <div className="space-y-2.5">
                                            <span className="text-xs font-black text-muted-foreground block">Contribution Frequency</span>
                                            <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                                {(["daily", "weekly", "monthly"] as const).map(f => (
                                                    <button key={f} onClick={() => setAjoFreq(f)} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all capitalize ${ajoFreq === f ? 'bg-emerald-600 text-white dark:text-black shadow' : 'text-muted-foreground hover:text-foreground'}`}>{f}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === "hp" && (
                                    <motion.div key="hp" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-black">
                                                <span className="text-muted-foreground">Assets Leased (Keke / Vehicles)</span>
                                                <span className="text-amber-600 dark:text-amber-400 font-extrabold">{hpFleet} Units</span>
                                            </div>
                                            <input type="range" min={1} max={20} step={1} value={hpFleet} onChange={(e) => setHpFleet(Number(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-black">
                                                <span className="text-muted-foreground">Weekly Payback Rate per Driver</span>
                                                <span className="text-amber-600 dark:text-amber-400 font-extrabold">{fmt(hpRate)}</span>
                                            </div>
                                            <input type="range" min={8000} max={35000} step={1000} value={hpRate} onChange={(e) => setHpRate(Number(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-black">
                                                <span className="text-muted-foreground">Lease Term Duration</span>
                                                <span className="text-amber-600 dark:text-amber-400 font-extrabold">{hpMonths} Months</span>
                                            </div>
                                            <input type="range" min={6} max={24} step={6} value={hpMonths} onChange={(e) => setHpMonths(Number(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === "loans" && (
                                    <motion.div key="loans" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-black">
                                                <span className="text-muted-foreground">Loan Principal Volume</span>
                                                <span className="text-blue-600 dark:text-blue-400 font-extrabold">{fmt(loanAmount)}</span>
                                            </div>
                                            <input type="range" min={20000} max={1000000} step={10000} value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-black">
                                                <span className="text-muted-foreground">Repayment Term</span>
                                                <span className="text-blue-600 dark:text-blue-400 font-extrabold">{loanMonths} Months</span>
                                            </div>
                                            <input type="range" min={3} max={18} step={3} value={loanMonths} onChange={(e) => setLoanMonths(Number(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-black">
                                                <span className="text-muted-foreground">Interest Rate (Flat p.a.)</span>
                                                <span className="text-blue-600 dark:text-blue-400 font-extrabold">{loanRate}%</span>
                                            </div>
                                            <input type="range" min={5} max={30} step={1} value={loanRate} onChange={(e) => setLoanRate(Number(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border flex gap-3 text-xs leading-relaxed font-semibold">
                            <Info className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">
                                Estimates are generated based on baseline bank templates. Cooperatives reserve rights to configure specialized dues, fees, and split reserves during union registration.
                            </p>
                        </div>
                    </div>

                    {/* Right: Projected Output Display */}
                    <div className="lg:col-span-5 flex flex-col justify-center">
                        <div className="bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden flex flex-col justify-between h-full font-bold">
                            
                            <AnimatePresence mode="wait">
                                {activeTab === "ajo" && (
                                    <motion.div key="ajo-res" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                                        <div className="text-center pb-4 border-b">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Rotation Pool Payout</p>
                                            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{fmt(ajoTotalPool)}</p>
                                            <p className="text-[9px] text-muted-foreground mt-1.5">Disbursed to one member at the end of each {ajoFreq === "monthly" ? "month" : ajoFreq === "weekly" ? "week" : "day"}</p>
                                        </div>
                                        <div className="space-y-3.5 text-xs text-muted-foreground">
                                            <div className="flex justify-between items-center">
                                                <span>Individual Contribution</span>
                                                <span className="text-foreground font-black">{fmt(ajoContrib)} / {ajoFreq}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Total Cycle Members</span>
                                                <span className="text-foreground font-black">{ajoMembers} Members</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Total Cycle Duration</span>
                                                <span className="text-foreground font-black">{ajoDays} Days</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === "hp" && (
                                    <motion.div key="hp-res" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                                        <div className="text-center pb-4 border-b">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Sample Annual Collection Pool</p>
                                            <p className="text-4xl font-black text-amber-600 dark:text-amber-400 mt-1">{fmt(hpAnnualReturn)}</p>
                                            <p className="text-[9px] text-muted-foreground mt-1.5">Across {hpFleet} units financed on Hire Purchase</p>
                                        </div>
                                        <div className="space-y-3.5 text-xs text-muted-foreground">
                                            <div className="flex justify-between items-center">
                                                <span>Capital Outlay</span>
                                                <span className="text-foreground font-black">{fmt(hpTotalCapital)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Total Contract Collection</span>
                                                <span className="text-foreground font-black">{fmt(hpTotalContractReturn)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Principal Break-Even Horizon</span>
                                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{hpPaybackWeeks} weeks</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === "loans" && (
                                    <motion.div key="loans-res" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                                        <div className="text-center pb-4 border-b">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Est. Monthly Repayment</p>
                                            <p className="text-4xl font-black text-blue-600 dark:text-blue-400 mt-1">{fmt(loanMonthlyInstallment)}</p>
                                            <p className="text-[9px] text-muted-foreground mt-1.5">Payable in equal installments over {loanMonths} months</p>
                                        </div>
                                        <div className="space-y-3.5 text-xs text-muted-foreground">
                                            <div className="flex justify-between items-center">
                                                <span>Principal Borrowed</span>
                                                <span className="text-foreground font-black">{fmt(loanAmount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Cumulative Interest ({loanRate}%)</span>
                                                <span className="text-foreground font-black">{fmt(loanTotalInterest)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Total Payback Amount</span>
                                                <span className="text-foreground font-black">{fmt(loanTotalRepay)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Weekly Installment</span>
                                                <span className="text-foreground font-black">{fmt(loanWeeklyInstallment)} / week</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="pt-6 border-t">
                                <Button asChild className="w-full h-12 bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black font-black rounded-xl text-xs border-none shadow-lg">
                                    <Link href="/copteller/onboarding/member">Onboard & Submit Application</Link>
                                </Button>
                            </div>

                        </div>
                    </div>

                </div>

            </div>
        </div>
    )
}
