"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    CreditCard, PlusCircle, Shield, Lock, Unlock, X,
    Eye, EyeOff, Info, RefreshCw, Save,
    ShieldCheck, Check, Wifi, Sparkles, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

interface SmartCard {
    id: string
    card_type: 'Visa' | 'MasterCard' | 'Verve'
    card_number_masked: string
    card_number_full: string
    expiry: string
    cvv: string
    is_frozen: boolean
    dailyLimit: number
    atmLimit: number
    posLimit: number
    cardholder: string
    accentColor: string
}

export default function CoptellerMemberCardsPage() {
    const [cards, setCards] = React.useState<SmartCard[]>([])
    const [selectedCard, setSelectedCard] = React.useState<SmartCard | null>(null)
    const [panelMode, setPanelMode] = React.useState<'details' | 'request'>('details')
    const [activeCardCategory, setActiveCardCategory] = React.useState<'banking' | 'institutional'>('banking')
    const [loadingCards, setLoadingCards] = React.useState(true)
    
    const [revealedCard, setRevealedCard] = React.useState<string | null>(null)
    const [newCardType, setNewCardType] = React.useState<'Visa' | 'MasterCard' | 'Verve'>('Verve')
    const [newDailyLimit, setNewDailyLimit] = React.useState(150000)
    const [submitting, setSubmitting] = React.useState(false)
    const [updatingLimits, setUpdatingLimits] = React.useState(false)

    // Limit form states for selected card
    const [dailyLimit, setDailyLimit] = React.useState(150000)
    const [atmLimit, setAtmLimit] = React.useState(50000)
    const [posLimit, setPosLimit] = React.useState(100000)

    const fetchCards = async () => {
        try {
            setLoadingCards(true)
            const res = await fetch('/api/copteller/cards')
            const data = await res.json()
            if (data.success && data.cards) {
                setCards(data.cards)
                if (data.cards.length > 0) {
                    setSelectedCard(data.cards[0])
                }
            }
        } catch (err) {
            console.error('Failed to load smart cards', err)
            toast.error("Could not load card details from bank switch.")
        } finally {
            setLoadingCards(false)
        }
    }

    React.useEffect(() => {
        fetchCards()
    }, [])

    React.useEffect(() => {
        if (selectedCard) {
            setDailyLimit(selectedCard.dailyLimit)
            setAtmLimit(selectedCard.atmLimit)
            setPosLimit(selectedCard.posLimit)
        }
    }, [selectedCard])

    const handleToggleFreeze = async (card: SmartCard) => {
        const actionText = card.is_frozen ? 'Unfreezing' : 'Freezing'
        const tId = toast.loading(`${actionText} your card securely on MFB card switch...`)
        
        try {
            const res = await fetch('/api/copteller/cards', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardId: card.id,
                    action: 'toggle_freeze',
                    isFrozen: !card.is_frozen
                })
            })
            const data = await res.json()
            if (data.success) {
                const updated = { ...card, is_frozen: data.is_frozen }
                setCards(prev => prev.map(c => c.id === card.id ? updated : c))
                if (selectedCard?.id === card.id) {
                    setSelectedCard(updated)
                }
                toast.success(data.message || `Card successfully ${data.is_frozen ? 'frozen' : 'activated'}`, { id: tId })
            } else {
                toast.error(data.error || 'Failed to toggle card status', { id: tId })
            }
        } catch (err: any) {
            toast.error(err.message || 'Network error while contacting card switch', { id: tId })
        }
    }

    const handleRequestCard = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        const tId = toast.loading("Provisioning card on core banking rails...")
        
        try {
            const res = await fetch('/api/copteller/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardType: newCardType,
                    dailyLimit: newDailyLimit,
                    atmLimit: Math.floor(newDailyLimit * 0.3),
                    posLimit: Math.floor(newDailyLimit * 0.7)
                })
            })
            const data = await res.json()
            if (data.success && data.card) {
                setCards(prev => [data.card, ...prev])
                setSelectedCard(data.card)
                toast.success(data.message || `${newCardType} card issued successfully!`, { id: tId })
                setPanelMode('details')
            } else {
                toast.error(data.error || 'Failed to issue card', { id: tId })
            }
        } catch (err: any) {
            toast.error(err.message || 'Error communicating with card processor', { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    const handleSaveLimits = async () => {
        if (!selectedCard) return
        setUpdatingLimits(true)
        const tId = toast.loading("Updating card velocity limits in core banking database...")
        
        try {
            const res = await fetch('/api/copteller/cards', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardId: selectedCard.id,
                    action: 'update_limits',
                    posLimit,
                    atmLimit,
                    webLimit: dailyLimit - posLimit
                })
            })
            const data = await res.json()
            if (data.success) {
                const updated = {
                    ...selectedCard,
                    dailyLimit,
                    atmLimit,
                    posLimit,
                }
                setCards(prev => prev.map(c => c.id === selectedCard.id ? updated : c))
                setSelectedCard(updated)
                toast.success(data.message || "Velocity limits updated on core card switch!", { id: tId })
            } else {
                toast.error(data.error || 'Failed to update velocity limits', { id: tId })
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to update limits', { id: tId })
        } finally {
            setUpdatingLimits(false)
        }
    }

    return (
        <div className="min-h-[100dvh] bg-background text-foreground font-sans">
            {/* Ambient subtle glow */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 right-[20%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-[15%] w-[350px] h-[350px] bg-accent/5 rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-1.5">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Hardware-Encrypted Virtual Vault
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">My Smart Cards</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-semibold max-w-2xl">
                            Manage virtual and physical debit cards, adjust spending velocity limits in real-time, and freeze card access with one tap.
                        </p>
                    </div>
                    <Button 
                        onClick={() => setPanelMode('request')} 
                        className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shrink-0 flex items-center gap-2 shadow-md shadow-primary/25 border-0"
                    >
                        <PlusCircle className="h-4 w-4" /> Request Virtual Card
                    </Button>
                </div>

                {/* Scope Switcher: Banking Cards vs Institutional Passes */}
                <div className="flex items-center gap-2 p-1.5 bg-muted/60 rounded-2xl w-fit border border-border/60">
                    <button
                        onClick={() => setActiveCardCategory('banking')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                            activeCardCategory === 'banking'
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <CreditCard className="h-4 w-4" />
                        <span>Bank Smart Cards</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
                            {cards.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveCardCategory('institutional')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                            activeCardCategory === 'institutional'
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span>Institutional Passes & Credentials</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            3 Active
                        </span>
                    </button>
                </div>

                {activeCardCategory === 'institutional' ? (
                    /* ── INSTITUTIONAL CREDENTIAL PASSES VIEW ────────────────── */
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-base font-black text-foreground">
                                    State & Institutional Credential Passes
                                </h3>
                                <p className="text-xs text-muted-foreground font-semibold">
                                    Verifiable digital identification cards issued under active Abia State Government parastatals, healthcare agencies, and development partner programs.
                                </p>
                            </div>
                            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry Verified
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* 1. ABSHIA Healthcare Pass */}
                            <div className="relative rounded-3xl p-6 bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-950 border border-emerald-500/30 text-white shadow-xl space-y-4 flex flex-col justify-between overflow-hidden group">
                                <div className="absolute -right-12 -top-12 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                                
                                <div className="space-y-3 relative z-10">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">
                                                Abia State Government
                                            </span>
                                            <h4 className="text-sm font-black text-white">
                                                ABSHIA Social Health Pass
                                            </h4>
                                        </div>
                                        <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-black text-emerald-300">
                                            ACTIVE COVER
                                        </div>
                                    </div>

                                    <div className="py-2">
                                        <span className="text-[8px] uppercase tracking-wider text-emerald-200/70 font-semibold block">Principal Enrollee</span>
                                        <p className="text-base font-black tracking-wide text-white">Chinedu Okafor</p>
                                        <span className="text-[10px] text-emerald-300/80 font-mono">NIN: 29481048291</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-[10px]">
                                        <div>
                                            <span className="text-white/60 block">Policy ID</span>
                                            <span className="font-mono font-bold text-emerald-300">ABSHIA-ABA-26-1049</span>
                                        </div>
                                        <div>
                                            <span className="text-white/60 block">Micro-Due</span>
                                            <span className="font-bold text-white">₦300 / week</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase tracking-wider text-white/60 font-semibold block">Primary Hospital Provider</span>
                                        <p className="text-xs font-bold text-white leading-tight">
                                            Abia State Univ. Teaching Hospital (ABSUTH)
                                        </p>
                                        <span className="text-[9px] text-emerald-300/80">Umuoba Road, Aba • Code: ABSHIA-FAC-001</span>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10 text-[10px]">
                                    <span className="text-white/60 font-semibold">Triage QR Pass Ready</span>
                                    <span className="font-mono text-emerald-300">EXP: 2027-01-14</span>
                                </div>
                            </div>

                            {/* 2. ATMA Transport Transit Pass */}
                            <div className="relative rounded-3xl p-6 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 text-white shadow-xl space-y-4 flex flex-col justify-between overflow-hidden group">
                                <div className="absolute -right-12 -top-12 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

                                <div className="space-y-3 relative z-10">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 block">
                                                Ministry of Transport & ATMA
                                            </span>
                                            <h4 className="text-sm font-black text-white">
                                                Commercial Mobility Permit
                                            </h4>
                                        </div>
                                        <div className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-[9px] font-black text-blue-300">
                                            VERIFIED ROADWORTHY
                                        </div>
                                    </div>

                                    <div className="py-2">
                                        <span className="text-[8px] uppercase tracking-wider text-blue-200/70 font-semibold block">Authorized Operator</span>
                                        <p className="text-base font-black tracking-wide text-white">Chinedu Okafor</p>
                                        <span className="text-[10px] text-blue-300/80 font-mono">Guild: Aba Central Transport</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-[10px]">
                                        <div>
                                            <span className="text-white/60 block">Permit Code</span>
                                            <span className="font-mono font-bold text-blue-300">ATMA-COMM-2026-902</span>
                                        </div>
                                        <div>
                                            <span className="text-white/60 block">Vehicle Asset</span>
                                            <span className="font-bold text-white">TVS King Keke</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase tracking-wider text-white/60 font-semibold block">Inspection & Diagnostics Depot</span>
                                        <p className="text-xs font-bold text-white leading-tight">
                                            TVS Simba Assembly & Service Hub
                                        </p>
                                        <span className="text-[9px] text-blue-300/80">Faulks Road Light Industrial Zone, Aba</span>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10 text-[10px]">
                                    <span className="text-white/60 font-semibold">Plate: ABA-928-UM</span>
                                    <span className="font-mono text-blue-300">EXP: 2026-12-31</span>
                                </div>
                            </div>

                            {/* 3. USAID Agro Input e-Voucher */}
                            <div className="relative rounded-3xl p-6 bg-gradient-to-br from-amber-950 via-slate-900 to-stone-950 border border-amber-500/30 text-white shadow-xl space-y-4 flex flex-col justify-between overflow-hidden group">
                                <div className="absolute -right-12 -top-12 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

                                <div className="space-y-3 relative z-10">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block">
                                                USAID / Feed the Future & ADP
                                            </span>
                                            <h4 className="text-sm font-black text-white">
                                                Agro Input Grant Voucher
                                            </h4>
                                        </div>
                                        <div className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[9px] font-black text-amber-300">
                                            50% SUBVENTION
                                        </div>
                                    </div>

                                    <div className="py-2">
                                        <span className="text-[8px] uppercase tracking-wider text-amber-200/70 font-semibold block">Smallholder Farmer</span>
                                        <p className="text-base font-black tracking-wide text-white">Chinedu Okafor</p>
                                        <span className="text-[10px] text-amber-300/80 font-mono">Cluster: Umuahia Agro Union</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-[10px]">
                                        <div>
                                            <span className="text-white/60 block">Voucher Code</span>
                                            <span className="font-mono font-bold text-amber-300">AGRO-USAID-26-881</span>
                                        </div>
                                        <div>
                                            <span className="text-white/60 block">Package Allocated</span>
                                            <span className="font-bold text-white truncate block">Maize + NPK/Urea</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[9px] uppercase tracking-wider text-white/60 font-semibold block">Collection & Fertilizer Depot</span>
                                        <p className="text-xs font-bold text-white leading-tight">
                                            Abia ADP Central Seed Depot
                                        </p>
                                        <span className="text-[9px] text-amber-300/80">Min. of Agriculture Complex, Umuahia</span>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10 text-[10px]">
                                    <span className="text-white/60 font-semibold">Barcode Verification</span>
                                    <span className="font-mono text-amber-300">EXP: 2026-10-31</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                /* 2-column layout */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* Left Column: Cards Showcase Grid */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Active Smart Cards ({cards.length})</span>
                            <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Instant ATM / Online Active
                            </span>
                        </div>

                        {loadingCards ? (
                            <div className="h-56 rounded-3xl border border-dashed border-border/80 flex flex-col items-center justify-center p-8 text-center text-muted-foreground animate-pulse">
                                <RefreshCw className="h-6 w-6 animate-spin text-primary mb-2" />
                                <span className="text-xs font-bold">Querying core banking smart card register...</span>
                            </div>
                        ) : cards.length === 0 ? (
                            <div className="h-56 rounded-3xl border border-dashed border-border/80 flex flex-col items-center justify-center p-8 text-center space-y-3">
                                <CreditCard className="h-8 w-8 text-muted-foreground/60" />
                                <div>
                                    <p className="text-sm font-black text-foreground">No Cards Issued Yet</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Request a personalized physical or virtual card linked to your wallet.</p>
                                </div>
                                <Button size="sm" onClick={() => setPanelMode('request')} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-xl">
                                    Request Your First Card
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {cards.map(card => {
                                const isRevealed = revealedCard === card.id
                                const isSelected = selectedCard?.id === card.id

                                return (
                                    <div
                                        key={card.id}
                                        onClick={() => {
                                            setSelectedCard(card)
                                            setPanelMode('details')
                                        }}
                                        className={`group relative h-56 rounded-3xl p-6 flex flex-col justify-between overflow-hidden shadow-xl transition-all duration-300 cursor-pointer border ${
                                            card.is_frozen 
                                                ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-slate-700/60 grayscale' 
                                                : `bg-gradient-to-br ${card.accentColor}`
                                        } ${isSelected ? 'ring-2 ring-primary ring-offset-4 ring-offset-background scale-[1.01]' : 'hover:scale-[1.01] hover:shadow-2xl'}`}
                                    >
                                        {/* Card Metallic Sheen / Texture */}
                                        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
                                        <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                                        
                                        {/* Top Row: Scheme & Microchip */}
                                        <div className="relative z-10 flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                {/* Realistic EMV Gold Chip */}
                                                <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 p-0.5 shadow-sm border border-amber-300/60 relative overflow-hidden flex items-center justify-center">
                                                    <div className="w-full h-full border border-amber-700/30 rounded flex items-center justify-center">
                                                        <div className="w-2.5 h-3.5 border-r border-amber-800/40" />
                                                    </div>
                                                </div>
                                                <Wifi className="h-4 w-4 text-white/70 rotate-90" />
                                            </div>

                                            <div className="text-right">
                                                <span className="text-white font-black italic tracking-wider text-base drop-shadow-sm">
                                                    {card.card_type}
                                                </span>
                                                <span className="block text-[8px] font-black uppercase tracking-widest text-white/60">
                                                    DEBIT
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Middle Row: Card Number */}
                                        <div className="relative z-10 py-2">
                                            <p className="text-white font-mono text-lg sm:text-xl font-bold tracking-widest drop-shadow">
                                                {isRevealed ? card.card_number_full : card.card_number_masked}
                                            </p>
                                        </div>

                                        {/* Bottom Row: Cardholder & Expiry */}
                                        <div className="relative z-10 flex justify-between items-end text-white">
                                            <div>
                                                <p className="text-[7.5px] uppercase tracking-widest text-white/60 font-black">Cardholder</p>
                                                <p className="font-bold tracking-wider text-xs uppercase text-white/95 mt-0.5">{card.cardholder}</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div>
                                                    <p className="text-[7.5px] uppercase tracking-widest text-white/60 font-black">Valid Thru</p>
                                                    <p className="font-mono text-xs font-bold text-white/95 mt-0.5">{card.expiry}</p>
                                                </div>
                                                {isRevealed && (
                                                    <div>
                                                        <p className="text-[7.5px] uppercase tracking-widest text-white/60 font-black">CVV</p>
                                                        <p className="font-mono text-xs font-bold text-amber-300 mt-0.5">{card.cvv}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Frozen Frosted Overlay */}
                                        {card.is_frozen && (
                                            <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 space-y-1.5">
                                                <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full font-black text-[10px] flex items-center gap-1.5 shadow-xl">
                                                    <Lock className="h-3 w-3" /> CARD FROZEN
                                                </span>
                                                <span className="text-[9px] text-white/70 font-semibold">Transactions are currently blocked</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            </div>
                        )}

                        {/* Security feature card */}
                        <div className="bg-card border border-border rounded-3xl p-5 flex items-center gap-4 shadow-sm">
                            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div className="space-y-0.5 flex-1 min-w-0">
                                <h4 className="text-xs font-black text-foreground">Zero-Liability CBN Certified Protection</h4>
                                <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                                    All Copteller debit cards operate on PCI-DSS certified switches. Set daily limits or freeze cards instantly if misplaced.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Inline Details & Control Drawer */}
                    <div className="space-y-6">
                        <AnimatePresence mode="wait">
                            {panelMode === 'request' && (
                                <motion.div
                                    key="request"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-card text-card-foreground border border-border rounded-3xl p-6 shadow-sm space-y-5"
                                >
                                    <div className="flex justify-between items-start border-b border-border/60 pb-3">
                                        <div>
                                            <h3 className="text-sm font-black text-foreground">Request Smart Card</h3>
                                            <p className="text-[11px] text-muted-foreground mt-0.5 font-semibold">Issue a new virtual or physical card instantly.</p>
                                        </div>
                                        <button 
                                            onClick={() => setPanelMode('details')} 
                                            className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleRequestCard} className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block mb-1.5">Card Scheme</label>
                                            <select
                                                value={newCardType}
                                                onChange={e => setNewCardType(e.target.value as any)}
                                                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            >
                                                <option value="Verve">Verve (Local / Central Pay)</option>
                                                <option value="MasterCard">MasterCard (Global E-Commerce)</option>
                                                <option value="Visa">Visa (Global E-Commerce)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block mb-1.5">Initial Daily Velocity Limit (₦)</label>
                                            <input
                                                type="number"
                                                required
                                                min={10000}
                                                max={1000000}
                                                step={10000}
                                                value={newDailyLimit}
                                                onChange={e => setNewDailyLimit(Number(e.target.value))}
                                                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-black text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            />
                                        </div>

                                        <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-2xl">
                                            <p className="text-[11px] text-primary font-semibold leading-relaxed">
                                                Smart virtual cards are generated instantly upon confirmation. Spending limits can be adjusted anytime with no bank charges.
                                            </p>
                                        </div>

                                        <div className="flex gap-2.5 pt-2">
                                            <Button 
                                                type="button" 
                                                onClick={() => setPanelMode('details')} 
                                                variant="outline" 
                                                className="flex-1 rounded-xl h-10 text-xs font-bold border-border"
                                            >
                                                Cancel
                                            </Button>
                                            <Button 
                                                type="submit" 
                                                disabled={submitting} 
                                                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs h-10 rounded-xl shadow-md border-0"
                                            >
                                                {submitting ? 'Issuing...' : 'Issue Card'}
                                            </Button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {panelMode === 'details' && selectedCard && (
                                <motion.div
                                    key="details"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-card text-card-foreground border border-border rounded-3xl p-6 shadow-sm space-y-5"
                                >
                                    <div className="flex justify-between items-start border-b border-border/60 pb-3">
                                        <div>
                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Card Control Console</span>
                                            <h3 className="text-sm font-black text-foreground mt-0.5 leading-snug">{selectedCard.card_type} Smart Card</h3>
                                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5 font-bold">{selectedCard.card_number_masked}</p>
                                        </div>
                                        <button
                                            onClick={() => setRevealedCard(revealedCard === selectedCard.id ? null : selectedCard.id)}
                                            className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                            title={revealedCard === selectedCard.id ? "Hide card details" : "Show card details"}
                                        >
                                            {revealedCard === selectedCard.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>

                                    {/* Security Freeze Toggle */}
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleToggleFreeze(selectedCard)}
                                            variant="outline"
                                            className={`w-full h-10 text-xs font-black rounded-xl border-border transition-colors ${
                                                selectedCard.is_frozen 
                                                    ? 'text-primary bg-primary/10 hover:bg-primary/20 border-primary/30' 
                                                    : 'text-destructive hover:bg-destructive/10 border-destructive/20'
                                            }`}
                                        >
                                            {selectedCard.is_frozen ? (
                                                <><Unlock className="h-4 w-4 mr-1.5" /> Unfreeze Card</>
                                            ) : (
                                                <><Lock className="h-4 w-4 mr-1.5" /> Freeze Card Immediately</>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Velocity Limits Sliders */}
                                    <div className="space-y-4 pt-2 border-t border-border/60">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Spending Velocity Controls</p>
                                        
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-muted-foreground">Daily Aggregate Limit</span>
                                                <span className="text-foreground font-black">{fmt(dailyLimit)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={5000}
                                                max={500000}
                                                step={5000}
                                                value={dailyLimit}
                                                onChange={e => setDailyLimit(Number(e.target.value))}
                                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-muted-foreground">ATM Cash Limit</span>
                                                <span className="text-foreground font-black">{fmt(atmLimit)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={5000}
                                                max={200000}
                                                step={5000}
                                                value={atmLimit}
                                                onChange={e => setAtmLimit(Number(e.target.value))}
                                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-muted-foreground">POS / Online Limit</span>
                                                <span className="text-foreground font-black">{fmt(posLimit)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={5000}
                                                max={300000}
                                                step={5000}
                                                value={posLimit}
                                                onChange={e => setPosLimit(Number(e.target.value))}
                                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>

                                        <Button
                                            onClick={handleSaveLimits}
                                            disabled={updatingLimits}
                                            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black rounded-xl border-0 gap-2 shadow-sm"
                                        >
                                            {updatingLimits ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            Save Spending Limits
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                )}
            </div>
        </div>
    )
}
