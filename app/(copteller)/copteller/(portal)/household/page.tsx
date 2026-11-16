'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Wallet,
    PiggyBank,
    Send,
    Plus,
    Lock,
    Unlock,
    ArrowUpRight,
    ArrowDownLeft,
    Sparkles,
    CheckCircle2,
    Clock,
    AlertCircle,
    Copy,
    Share2,
    Users,
    Zap,
    Home,
    GraduationCap,
    ShoppingBag,
    Shield,
    Flame,
    Check,
    Search,
    RefreshCw,
    X,
    ShieldCheck,
    ArrowRight,
    Tag,
    Receipt,
    CreditCard,
    TrendingUp,
    CheckCircle,
    Calendar,
    Coins,
    SlidersHorizontal,
    Wifi,
    LayoutGrid,
    List
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ClientPortal } from '@/components/copteller/client-portal'

interface Pocket {
    id: number
    name: string
    category: string
    target_amount: number
    balance: number
    icon: string
    color: string
    is_locked: boolean
    unlock_date: string | null
    status: string
    transaction_count: number
}

interface HouseholdSplit {
    id: number
    title: string
    total_amount: number
    split_type: string
    status: string
    notes: string
    created_at: string
    members: {
        id: number
        name: string
        phoneNumber: string | null
        shareAmount: number
        paidAmount: number
        status: string
        paidAt: string | null
    }[]
}

interface UtilityPreset {
    id: number
    title: string
    service_type: string
    provider: string
    identifier: string
    last_amount: number | null
}

const CATEGORY_ICONS: Record<string, any> = {
    feeding: ShoppingBag,
    school_fees: GraduationCap,
    rent: Home,
    utility: Zap,
    emergency: Shield,
    business: Flame,
    insurance: ShieldCheck,
    custom: PiggyBank
}

const CATEGORY_THEMES: Record<string, { bg: string, text: string, border: string, accentGradient: string, glow: string }> = {
    feeding: {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-500/25',
        accentGradient: 'from-emerald-500 to-teal-500',
        glow: 'rgba(16, 185, 129, 0.15)'
    },
    school_fees: {
        bg: 'bg-blue-500/10 dark:bg-blue-500/15',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-500/25',
        accentGradient: 'from-blue-500 to-indigo-500',
        glow: 'rgba(59, 130, 246, 0.15)'
    },
    rent: {
        bg: 'bg-purple-500/10 dark:bg-purple-500/15',
        text: 'text-purple-700 dark:text-purple-400',
        border: 'border-purple-500/25',
        accentGradient: 'from-purple-500 to-pink-500',
        glow: 'rgba(168, 85, 247, 0.15)'
    },
    utility: {
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-500/25',
        accentGradient: 'from-amber-500 to-orange-500',
        glow: 'rgba(245, 158, 11, 0.15)'
    },
    emergency: {
        bg: 'bg-rose-500/10 dark:bg-rose-500/15',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-500/25',
        accentGradient: 'from-rose-500 to-red-500',
        glow: 'rgba(244, 63, 94, 0.15)'
    },
    insurance: {
        bg: 'bg-teal-500/10 dark:bg-teal-500/15',
        text: 'text-teal-700 dark:text-teal-400',
        border: 'border-teal-500/25',
        accentGradient: 'from-teal-500 to-emerald-500',
        glow: 'rgba(20, 184, 166, 0.15)'
    },
    custom: {
        bg: 'bg-primary/10',
        text: 'text-primary',
        border: 'border-primary/20',
        accentGradient: 'from-primary to-emerald-600',
        glow: 'rgba(16, 185, 129, 0.15)'
    }
}

// Starter Envelopes for empty state or quick deployment
const STARTER_ENVELOPES = [
    {
        name: 'Family Feeding & Market Provisions',
        category: 'feeding',
        targetAmount: 50000,
        initialStash: 5000,
        isLocked: false,
        desc: 'Weekly food budget safe from impulsive card spending'
    },
    {
        name: 'Children School Fees (First Term)',
        category: 'school_fees',
        targetAmount: 150000,
        initialStash: 10000,
        isLocked: true,
        unlockDate: '2026-12-18',
        desc: 'Discipline locked until school resumption date'
    },
    {
        name: 'PHED Power & Household Gas',
        category: 'utility',
        targetAmount: 20000,
        initialStash: 3000,
        isLocked: false,
        desc: 'Prepaid electricity tokens & cooking cylinder buffer'
    },
    {
        name: 'Leadway Health HMO Medical Buffer',
        category: 'insurance',
        targetAmount: 40000,
        initialStash: 5000,
        isLocked: false,
        desc: 'Emergency family health and prescription drugs cushion'
    }
]

export default function HouseholdCompanionPage() {
    const [activeTab, setActiveTab] = useState<'pockets' | 'p2p' | 'splits' | 'presets'>('pockets')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [loading, setLoading] = useState(true)
    const [pockets, setPockets] = useState<Pocket[]>([])
    const [splits, setSplits] = useState<HouseholdSplit[]>([])
    const [presets, setPresets] = useState<UtilityPreset[]>([])
    const [primaryAccount, setPrimaryAccount] = useState<{ id: number, accountNumber: string, balanceNaira: number } | null>(null)
    const [metrics, setMetrics] = useState({ totalStashed: 0, primaryBalance: 0, totalNetWorth: 0, pocketCount: 0 })

    // Modals
    const [isCreatePocketOpen, setIsCreatePocketOpen] = useState(false)
    const [selectedPocketForStash, setSelectedPocketForStash] = useState<Pocket | null>(null)
    const [selectedPocketForWithdraw, setSelectedPocketForWithdraw] = useState<Pocket | null>(null)
    const [isCreateSplitOpen, setIsCreateSplitOpen] = useState(false)

    // Form inputs
    const [stashAmount, setStashAmount] = useState('')
    const [withdrawAmount, setWithdrawAmount] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // New Pocket Form
    const [newPocketName, setNewPocketName] = useState('')
    const [newPocketCategory, setNewPocketCategory] = useState('feeding')
    const [newPocketTarget, setNewPocketTarget] = useState('')
    const [newPocketInitialStash, setNewPocketInitialStash] = useState('')
    const [newPocketIsLocked, setNewPocketIsLocked] = useState(false)
    const [newPocketUnlockDate, setNewPocketUnlockDate] = useState('')

    // P2P State
    const [p2pQuery, setP2pQuery] = useState('')
    const [p2pSearching, setP2pSearching] = useState(false)
    const [p2pRecipient, setP2pRecipient] = useState<any | null>(null)
    const [p2pAmount, setP2pAmount] = useState('')
    const [p2pNarration, setP2pNarration] = useState('')
    const [p2pSuccessReceipt, setP2pSuccessReceipt] = useState<any | null>(null)

    // Split Bill Form
    const [splitTitle, setSplitTitle] = useState('')
    const [splitTotal, setSplitTotal] = useState('')
    const [splitMembers, setSplitMembers] = useState<{ name: string, phoneNumber: string }[]>([
        { name: '', phoneNumber: '' },
        { name: '', phoneNumber: '' }
    ])

    // Load initial data
    const fetchData = async () => {
        setLoading(true)
        try {
            const [pocketsRes, splitsRes, presetsRes] = await Promise.all([
                fetch('/api/copteller/pockets').then(r => r.json()),
                fetch('/api/copteller/household/splits').then(r => r.json()),
                fetch('/api/copteller/household/presets').then(r => r.json())
            ])

            if (pocketsRes.success) {
                setPockets(pocketsRes.pockets || [])
                setPrimaryAccount(pocketsRes.primaryAccount || null)
                setMetrics(pocketsRes.metrics || { totalStashed: 0, primaryBalance: 0, totalNetWorth: 0, pocketCount: 0 })
            }

            if (splitsRes.success) {
                setSplits(splitsRes.splits || [])
            }

            if (presetsRes.success) {
                setPresets(presetsRes.presets || [])
            }
        } catch (err) {
            console.error('Failed to load household data', err)
            toast.error('Could not load household data.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Quick Deploy Starter Envelope
    const handleQuickDeploy = async (envelope: typeof STARTER_ENVELOPES[0]) => {
        setIsSubmitting(true)
        try {
            const res = await fetch('/api/copteller/pockets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: envelope.name,
                    category: envelope.category,
                    targetAmount: envelope.targetAmount,
                    initialStash: envelope.initialStash,
                    isLocked: envelope.isLocked,
                    unlockDate: envelope.unlockDate || null
                })
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create pocket')

            toast.success(`Created "${envelope.name}" pocket with ₦${envelope.initialStash.toLocaleString()} stash!`)
            fetchData()
        } catch (err: any) {
            toast.error(err.message || 'Quick deploy failed')
        } finally {
            setIsSubmitting(false)
        }
    }

    // P2P Beneficiary Lookup
    const handleP2pSearch = async (val: string) => {
        setP2pQuery(val)
        if (val.trim().length < 3) {
            setP2pRecipient(null)
            return
        }

        setP2pSearching(true)
        try {
            const res = await fetch(`/api/copteller/p2p/lookup?query=${encodeURIComponent(val.trim())}`)
            const data = await res.json()
            if (data.success && data.matches?.length > 0) {
                setP2pRecipient(data.matches[0])
            } else {
                setP2pRecipient(null)
            }
        } catch {
            setP2pRecipient(null)
        } finally {
            setP2pSearching(false)
        }
    }

    // Execute P2P Transfer
    const handleExecuteP2p = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!p2pRecipient) {
            toast.error('Please search and select a verified Copteller recipient.')
            return
        }
        if (!p2pAmount || Number(p2pAmount) <= 0) {
            toast.error('Please enter a valid transfer amount.')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/copteller/p2p/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientAccountNumber: p2pRecipient.accountNumber,
                    amount: Number(p2pAmount),
                    narration: p2pNarration.trim() || 'Copteller Household P2P'
                })
            })
            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Transfer failed')
            }

            toast.success(`Sent ₦${Number(p2pAmount).toLocaleString()} to ${p2pRecipient.fullName}!`)
            setP2pSuccessReceipt(data)
            setP2pAmount('')
            setP2pNarration('')
            setP2pQuery('')
            setP2pRecipient(null)
            fetchData()
        } catch (err: any) {
            toast.error(err.message || 'Transfer failed.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Stash into pocket
    const handleStashSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPocketForStash || !stashAmount || Number(stashAmount) <= 0) return

        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/copteller/pockets/${selectedPocketForStash.id}/stash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(stashAmount) })
            })
            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to stash money')
            }

            toast.success(data.message)
            setSelectedPocketForStash(null)
            setStashAmount('')
            fetchData()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Withdraw from pocket
    const handleWithdrawSubmit = async (e: React.FormEvent, emergency = false) => {
        e.preventDefault()
        if (!selectedPocketForWithdraw || !withdrawAmount || Number(withdrawAmount) <= 0) return

        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/copteller/pockets/${selectedPocketForWithdraw.id}/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Number(withdrawAmount),
                    emergencyUnlock: emergency
                })
            })
            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to withdraw from pocket')
            }

            toast.success(data.message)
            setSelectedPocketForWithdraw(null)
            setWithdrawAmount('')
            fetchData()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Create Pocket
    const handleCreatePocket = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newPocketName.trim()) {
            toast.error('Please enter a pocket name.')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/copteller/pockets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newPocketName.trim(),
                    category: newPocketCategory,
                    targetAmount: Number(newPocketTarget) || 0,
                    initialStash: Number(newPocketInitialStash) || 0,
                    isLocked: newPocketIsLocked,
                    unlockDate: newPocketIsLocked && newPocketUnlockDate ? newPocketUnlockDate : null
                })
            })
            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to create pocket')
            }

            toast.success(data.message)
            setIsCreatePocketOpen(false)
            setNewPocketName('')
            setNewPocketTarget('')
            setNewPocketInitialStash('')
            setNewPocketIsLocked(false)
            setNewPocketUnlockDate('')
            fetchData()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Create Split
    const handleCreateSplit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!splitTitle.trim() || !splitTotal || Number(splitTotal) <= 0) {
            toast.error('Please fill in title and total amount.')
            return
        }

        const validMembers = splitMembers.filter(m => m.name.trim())
        if (validMembers.length < 2) {
            toast.error('Please add at least 2 participants.')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/copteller/household/splits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: splitTitle.trim(),
                    totalAmount: Number(splitTotal),
                    splitType: 'equal',
                    members: validMembers
                })
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create split')

            toast.success(data.message)
            setIsCreateSplitOpen(false)
            setSplitTitle('')
            setSplitTotal('')
            setSplitMembers([{ name: '', phoneNumber: '' }, { name: '', phoneNumber: '' }])
            fetchData()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Settle split member
    const handleSettleMember = async (splitId: number, memberId: number) => {
        try {
            const res = await fetch(`/api/copteller/household/splits/${splitId}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId })
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to mark payment')

            toast.success(data.message)
            fetchData()
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    // Formatted Currency
    const fmt = (num: number) => `₦${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    return (
        <div className="min-h-[100dvh] bg-background text-foreground font-sans relative selection:bg-primary/20">
            {/* Ambient Radial Mesh Background */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[140px]" />
                <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-teal-500/5 dark:bg-teal-500/8 rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                {/* ── UNBOXED COMMAND CENTER HEADER ────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <Sparkles className="w-3 h-3" />
                            Everyday Household Finance &amp; Disciplined Envelopes
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                            Household Companion
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
                            Quarantine feeding money, school fees, and rent into disciplined digital envelopes. Send zero-fee peer-to-peer transfers, manage health HMO plans, and split compound bills.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button
                            onClick={() => setIsCreatePocketOpen(true)}
                            className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs gap-2 shadow-sm shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4" />
                            New Pocket
                        </Button>
                        <Button
                            onClick={() => setActiveTab('p2p')}
                            variant="outline"
                            className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl text-xs font-bold gap-2 border-border/80 bg-card hover:bg-muted text-foreground transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Send className="w-3.5 h-3.5 text-primary" />
                            Send ₦0 Fee
                        </Button>
                    </div>
                </div>

                {/* ── STANDALONE RESPONSIVE METRIC STRIP ──────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    {/* Spendable Balance */}
                    <div className="bg-card/90 hover:bg-card border border-border/80 hover:border-primary/40 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">Spendable Wallet</span>
                            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-lg sm:text-2xl font-black text-foreground tracking-tight truncate">
                                {fmt(metrics.primaryBalance)}
                            </p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-1 truncate">
                                <CheckCircle className="w-3 h-3 text-primary shrink-0" /> Immediate Liquidity
                            </span>
                        </div>
                    </div>

                    {/* Total in Pockets */}
                    <div className="bg-card/90 hover:bg-card border border-border/80 hover:border-emerald-500/40 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">Total in Pockets</span>
                            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
                                {fmt(metrics.totalStashed)}
                            </p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-1 truncate">
                                <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" /> {metrics.pocketCount} Disciplined Stashes
                            </span>
                        </div>
                    </div>

                    {/* Combined Net Worth */}
                    <div className="bg-card/90 hover:bg-card border border-border/80 hover:border-teal-500/40 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 truncate">Combined Net Worth</span>
                            <div className="p-2 sm:p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
                                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-lg sm:text-2xl font-black text-teal-600 dark:text-teal-400 tracking-tight truncate">
                                {fmt(metrics.totalNetWorth)}
                            </p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-1 truncate">
                                <Shield className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" /> Escrow Protected Sum
                            </span>
                        </div>
                    </div>

                    {/* Shared Bills */}
                    <div className="bg-card/90 hover:bg-card border border-border/80 hover:border-blue-500/40 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 truncate">Shared Bills &amp; Dues</span>
                            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight truncate">
                                {splits.length} Active
                            </p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-1 truncate">
                                <CreditCard className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" /> Compound &amp; Family Pools
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── FLOATING SEGMENTED NAVIGATION TABS & VIEW TOGGLE ──────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="inline-flex flex-wrap p-1.5 rounded-2xl bg-muted/60 border border-border/70 gap-1.5 backdrop-blur-md shadow-inner">
                        <button
                            onClick={() => setActiveTab('pockets')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                activeTab === 'pockets'
                                    ? 'bg-card text-foreground shadow-sm font-black border border-border/40'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                            }`}
                        >
                            <PiggyBank className="w-3.5 h-3.5 text-primary" />
                            <span>Budget Envelopes</span>
                            <span className="bg-primary/15 text-primary text-[10px] font-black px-1.5 py-0.2 rounded-full">
                                {pockets.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('p2p')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                activeTab === 'p2p'
                                    ? 'bg-card text-foreground shadow-sm font-black border border-border/40'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                            }`}
                        >
                            <Send className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Instant P2P</span>
                            <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                                ₦0 Fee
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('splits')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                activeTab === 'splits'
                                    ? 'bg-card text-foreground shadow-sm font-black border border-border/40'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5 text-blue-500" />
                            <span>Shared Bill Splits</span>
                            <span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                                {splits.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('presets')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                activeTab === 'presets'
                                    ? 'bg-card text-foreground shadow-sm font-black border border-border/40'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                            }`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                            <span>Utilities &amp; HMO</span>
                            <span className="bg-teal-500/15 text-teal-600 dark:text-teal-400 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                                {presets.length}
                            </span>
                        </button>
                    </div>

                    {/* View Mode Toggle (Grid / List) */}
                    {activeTab === 'pockets' && pockets.length > 0 && (
                        <div className="inline-flex items-center gap-1 p-1 bg-card/90 border border-border/80 rounded-xl shadow-sm self-start sm:self-auto">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewMode === 'grid'
                                        ? 'bg-primary text-primary-foreground shadow-sm font-black'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="Compact 4-Column Grid"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Grid</span>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewMode === 'list'
                                        ? 'bg-primary text-primary-foreground shadow-sm font-black'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="Dense List View"
                            >
                                <List className="w-3.5 h-3.5" />
                                <span className="text-[11px]">List</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* ── TAB 1: POCKETS ENVELOPES ─────────────────────────────────── */}
                {activeTab === 'pockets' && (
                    <div className="space-y-6">
                        {loading ? (
                            <div className="p-16 text-center text-xs text-muted-foreground font-semibold animate-pulse">
                                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                                Loading your household envelopes...
                            </div>
                        ) : pockets.length === 0 ? (
                            /* SMART STARTER ENVELOPE STUDIO (REPLACES FLAT EMPTY STATE) */
                            <div className="rounded-3xl border border-border/80 bg-card/90 p-8 sm:p-12 shadow-sm space-y-8 backdrop-blur-xl">
                                <div className="text-center max-w-xl mx-auto space-y-3">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
                                        <PiggyBank className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-black text-foreground">Smart Household Discipline Studio</h3>
                                    <p className="text-muted-foreground text-xs font-medium leading-relaxed">
                                        Quarantine money away from impulsive everyday card spending. Pick a recommended starter envelope below or create a tailored budget pocket with custom lock dates.
                                    </p>
                                </div>

                                {/* Curated Starter Envelopes */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {STARTER_ENVELOPES.map((env, i) => {
                                        const theme = CATEGORY_THEMES[env.category] || CATEGORY_THEMES.custom
                                        const IconComp = CATEGORY_ICONS[env.category] || CATEGORY_ICONS.custom
                                        return (
                                            <div
                                                key={i}
                                                className="rounded-2xl bg-card border border-border/80 p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-lg transition-all duration-200 group"
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className={`p-2.5 rounded-xl ${theme.bg} ${theme.text} border ${theme.border}`}>
                                                            <IconComp className="w-5 h-5" />
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${theme.bg} ${theme.text} ${theme.border}`}>
                                                            {env.isLocked ? 'Locked' : 'Flexible'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-foreground group-hover:text-primary transition-colors">
                                                            {env.name}
                                                        </h4>
                                                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                                                            {env.desc}
                                                        </p>
                                                    </div>
                                                    <div className="pt-2 border-t border-border/60">
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-muted-foreground">Target Goal:</span>
                                                            <span className="font-bold text-foreground">₦{env.targetAmount.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[11px] mt-0.5">
                                                            <span className="text-muted-foreground">Starter Stash:</span>
                                                            <span className="font-bold text-primary">₦{env.initialStash.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button
                                                    onClick={() => handleQuickDeploy(env)}
                                                    disabled={isSubmitting}
                                                    size="sm"
                                                    className="w-full mt-4 h-9 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-black text-xs transition-all border border-primary/25"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" /> Deploy Envelope
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* COMPACT RESPONSIVE GRID (4 COLUMNS ON XL/LG, 2 ON SM/MD) */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                                {pockets.map(pocket => {
                                    const IconComponent = CATEGORY_ICONS[pocket.category] || CATEGORY_ICONS.custom
                                    const theme = CATEGORY_THEMES[pocket.category] || CATEGORY_THEMES.custom
                                    const target = Number(pocket.target_amount) || 0
                                    const balance = Number(pocket.balance) || 0
                                    const progress = target > 0 ? Math.min(Math.round((balance / target) * 100), 100) : 0

                                    return (
                                        <div
                                            key={pocket.id}
                                            className="relative rounded-2xl bg-card border border-border/80 hover:border-primary/40 p-4 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between group overflow-hidden"
                                        >
                                            {/* Category Top Gradient Glow Accent */}
                                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.accentGradient}`} />

                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <div className={`p-2 rounded-xl ${theme.bg} ${theme.text} border ${theme.border} shrink-0`}>
                                                        <IconComponent className="w-4 h-4" />
                                                    </div>

                                                    {pocket.is_locked ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                                                            <Lock className="w-2.5 h-2.5" />
                                                            {pocket.unlock_date ? `till ${new Date(pocket.unlock_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Locked'}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                                                            <Unlock className="w-2.5 h-2.5" />
                                                            Flexible
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-sm font-black text-foreground mt-3 truncate group-hover:text-primary transition-colors" title={pocket.name}>
                                                    {pocket.name}
                                                </h3>
                                                <p className="text-[10px] text-muted-foreground font-semibold capitalize mt-0.5 truncate">
                                                    {pocket.category.replace('_', ' ')} Reserve &bull; {pocket.transaction_count || 0} deposits
                                                </p>

                                                <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                                                    <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5 font-semibold">
                                                        <span>Quarantined</span>
                                                        {target > 0 && <span className="font-mono text-[9px]">Goal: ₦{target.toLocaleString()}</span>}
                                                    </div>
                                                    <p className="text-xl font-black text-foreground tracking-tight truncate font-mono">
                                                        ₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>

                                                {target > 0 && (
                                                    <div className="mt-3 space-y-1">
                                                        <div className="flex justify-between text-[10px] font-black">
                                                            <span className="text-muted-foreground">Target Progress</span>
                                                            <span className={theme.text}>{progress}%</span>
                                                        </div>
                                                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className={`bg-gradient-to-r ${theme.accentGradient} h-1.5 rounded-full transition-all duration-500`}
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/60">
                                                <Button
                                                    onClick={() => setSelectedPocketForStash(pocket)}
                                                    className="h-8 rounded-lg text-[11px] font-bold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
                                                >
                                                    <ArrowDownLeft className="w-3 h-3" />
                                                    Stash
                                                </Button>
                                                <Button
                                                    onClick={() => setSelectedPocketForWithdraw(pocket)}
                                                    variant="outline"
                                                    className="h-8 rounded-lg text-[11px] font-bold gap-1 border-border hover:bg-muted text-foreground transition-all"
                                                >
                                                    <ArrowUpRight className="w-3 h-3" />
                                                    Withdraw
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            /* SLEEK HIGH-DENSITY LIST VIEW (DATA ROWS) */
                            <div className="space-y-2.5">
                                {pockets.map(pocket => {
                                    const IconComponent = CATEGORY_ICONS[pocket.category] || CATEGORY_ICONS.custom
                                    const theme = CATEGORY_THEMES[pocket.category] || CATEGORY_THEMES.custom
                                    const target = Number(pocket.target_amount) || 0
                                    const balance = Number(pocket.balance) || 0
                                    const progress = target > 0 ? Math.min(Math.round((balance / target) * 100), 100) : 0

                                    return (
                                        <div
                                            key={pocket.id}
                                            className="relative rounded-2xl bg-card border border-border/80 hover:border-primary/40 p-3 sm:px-5 sm:py-3.5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group overflow-hidden"
                                        >
                                            {/* Left Accent indicator */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${theme.accentGradient}`} />

                                            {/* Left details */}
                                            <div className="flex items-center gap-3 min-w-0 md:w-1/3">
                                                <div className={`p-2 rounded-xl ${theme.bg} ${theme.text} border ${theme.border} shrink-0`}>
                                                    <IconComponent className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-black text-foreground truncate group-hover:text-primary transition-colors">
                                                            {pocket.name}
                                                        </h3>
                                                        {pocket.is_locked ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 shrink-0">
                                                                <Lock className="w-2.5 h-2.5" />
                                                                {pocket.unlock_date ? `till ${new Date(pocket.unlock_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Locked'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                                                                <Unlock className="w-2.5 h-2.5" />
                                                                Flexible
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground font-semibold capitalize mt-0.5 truncate">
                                                        {pocket.category.replace('_', ' ')} Reserve &bull; {pocket.transaction_count || 0} deposits
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Middle: Progress / Target */}
                                            <div className="md:w-1/3 min-w-0">
                                                <div className="flex items-baseline justify-between text-xs mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quarantined Balance</span>
                                                    {target > 0 && <span className="text-[10px] font-mono text-muted-foreground">Goal: ₦{target.toLocaleString()} ({progress}%)</span>}
                                                </div>
                                                {target > 0 && (
                                                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`bg-gradient-to-r ${theme.accentGradient} h-1.5 rounded-full transition-all duration-500`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Amount & Actions */}
                                            <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                                                <span className="text-base sm:text-lg font-black text-foreground font-mono">
                                                    ₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        onClick={() => setSelectedPocketForStash(pocket)}
                                                        size="sm"
                                                        className="h-8 px-3 rounded-lg text-xs font-bold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                                    >
                                                        <ArrowDownLeft className="w-3 h-3" />
                                                        Stash
                                                    </Button>
                                                    <Button
                                                        onClick={() => setSelectedPocketForWithdraw(pocket)}
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-3 rounded-lg text-xs font-bold gap-1 border-border hover:bg-muted text-foreground"
                                                    >
                                                        <ArrowUpRight className="w-3 h-3" />
                                                        Withdraw
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 2: INSTANT ZERO-FEE P2P TRANSFER ──────────────────────── */}
                {activeTab === 'p2p' && (
                    <div className="max-w-xl mx-auto space-y-6">
                        <div className="rounded-3xl bg-card border border-border/80 p-6 sm:p-8 shadow-sm relative overflow-hidden backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                                    <Send className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-foreground">Instant P2P Transfer</h2>
                                    <p className="text-xs text-muted-foreground font-semibold">Zero transaction fee (₦0.00) between household members &amp; Copteller users</p>
                                </div>
                            </div>

                            <form onSubmit={handleExecuteP2p} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                                        Recipient Phone Number, Handle, or Account Number
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            value={p2pQuery}
                                            onChange={(e) => handleP2pSearch(e.target.value)}
                                            placeholder="e.g. 08031234567, @chidi, or 3000..."
                                            className="h-12 pl-4 pr-10 text-sm font-semibold rounded-xl bg-background border-border text-foreground"
                                        />
                                        <div className="absolute right-3.5 top-3.5 text-muted-foreground">
                                            {p2pSearching ? <RefreshCw className="w-5 h-5 animate-spin text-primary" /> : <Search className="w-5 h-5" />}
                                        </div>
                                    </div>
                                </div>

                                {p2pRecipient && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-black flex items-center justify-center">
                                                {p2pRecipient.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-foreground text-sm">{p2pRecipient.fullName}</span>
                                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                                </div>
                                                <span className="text-[11px] text-muted-foreground font-mono">{p2pRecipient.accountNumber} &bull; {p2pRecipient.cooperativeName}</span>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="border-primary/40 text-primary font-bold text-[10px]">
                                            Verified
                                        </Badge>
                                    </motion.div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                                        Amount to Send (₦)
                                    </label>
                                    <Input
                                        type="number"
                                        value={p2pAmount}
                                        onChange={(e) => setP2pAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="100"
                                        className="h-14 text-2xl font-black rounded-xl bg-background border-border text-foreground"
                                    />

                                    <div className="flex flex-wrap gap-2 mt-2.5">
                                        {[1000, 2000, 5000, 10000, 20000].map(amt => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setP2pAmount(amt.toString())}
                                                className="px-3 py-1 rounded-lg bg-muted hover:bg-muted/80 text-[11px] text-foreground font-bold transition-all border border-border/50"
                                            >
                                                ₦{amt.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                                        Narration (Optional)
                                    </label>
                                    <Input
                                        type="text"
                                        value={p2pNarration}
                                        onChange={(e) => setP2pNarration(e.target.value)}
                                        placeholder="e.g. Dinner groceries, school bus fare"
                                        className="h-11 rounded-xl bg-background border-border text-xs text-foreground"
                                    />
                                </div>

                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground font-semibold">Copteller Instant Transfer Fee:</span>
                                    <span className="text-primary font-black uppercase tracking-wider">₦0.00 Free</span>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSubmitting || !p2pRecipient || !p2pAmount}
                                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm shadow-md gap-2"
                                >
                                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Send ₦{Number(p2pAmount || 0).toLocaleString()} Now
                                </Button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── TAB 3: HOUSEHOLD BILL SPLITS ─────────────────────────────── */}
                {activeTab === 'splits' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-foreground">Shared Bills &amp; Compound Splits</h2>
                                <p className="text-xs text-muted-foreground font-semibold">Collect and monitor contributions for generator diesel, compound security, and family dues</p>
                            </div>
                            <Button
                                onClick={() => setIsCreateSplitOpen(true)}
                                className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs gap-1.5 self-start shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Create Bill Split
                            </Button>
                        </div>

                        {splits.length === 0 ? (
                            <div className="rounded-3xl border border-border/80 bg-card p-12 text-center max-w-xl mx-auto shadow-sm">
                                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-60" />
                                <h3 className="text-base font-bold text-foreground">No Shared Bills Active</h3>
                                <p className="text-muted-foreground text-xs mt-1 mb-6 font-semibold">Start a split to coordinate contributions with flatmates or family members with automatic payment tracking.</p>
                                <Button
                                    onClick={() => setIsCreateSplitOpen(true)}
                                    variant="outline"
                                    className="h-9 px-5 rounded-xl text-xs font-bold"
                                >
                                    Start a Split
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {splits.map(split => {
                                    const paidCount = split.members.filter(m => m.status === 'paid').length
                                    const totalCount = split.members.length
                                    const percent = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0

                                    return (
                                        <div key={split.id} className="rounded-2xl bg-card border border-border/80 hover:border-blue-500/40 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="text-sm font-black text-foreground truncate">{split.title}</h3>
                                                        <span className="text-[10px] text-muted-foreground font-semibold">{new Date(split.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <Badge variant={split.status === 'completed' ? 'default' : 'secondary'} className="text-[9px] font-bold">
                                                        {split.status}
                                                    </Badge>
                                                </div>

                                                <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/50 flex justify-between items-baseline">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Bill</span>
                                                    <span className="text-lg font-black text-foreground font-mono">₦{Number(split.total_amount).toLocaleString()}</span>
                                                </div>

                                                <div className="mt-3 space-y-1">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span className="text-muted-foreground">Progress ({paidCount}/{totalCount} Paid)</span>
                                                        <span className="text-primary">{percent}%</span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                                                    </div>
                                                </div>

                                                <div className="mt-4 space-y-1.5">
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Contributors</span>
                                                    {split.members.map(member => (
                                                        <div key={member.id} className="p-2 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between text-xs">
                                                            <div>
                                                                <p className="font-bold text-foreground text-xs">{member.name}</p>
                                                                {member.phoneNumber && <span className="text-[10px] text-muted-foreground font-mono">{member.phoneNumber}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-foreground text-xs font-mono">₦{Number(member.shareAmount).toLocaleString()}</span>
                                                                {member.status === 'paid' ? (
                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                                                                        <Check className="w-2.5 h-2.5" /> Paid
                                                                    </span>
                                                                ) : (
                                                                    <Button
                                                                        onClick={() => handleSettleMember(split.id, member.id)}
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-6 px-2 text-[9px] font-black text-primary border-primary/30 hover:bg-primary/10 rounded-md"
                                                                    >
                                                                        Mark Paid
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 4: QUICK UTILITIES & INSURANCE COVER ─────────────────── */}
                {activeTab === 'presets' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-black text-foreground">Household Utilities &amp; Micro-Insurance Cover</h2>
                            <p className="text-xs text-muted-foreground font-semibold">Pre-authorized repeat payments for PHED light bills, Leadway HMO health plans, and home WiFi</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {presets.map(preset => (
                                <div key={preset.id} className="rounded-2xl bg-card border border-border/80 hover:border-teal-500/40 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                    <div className="space-y-3">
                                        <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 w-fit">
                                            {preset.service_type === 'electricity' ? <Zap className="w-5 h-5" /> :
                                             preset.service_type === 'insurance' ? <ShieldCheck className="w-5 h-5" /> :
                                             <Wifi className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-foreground truncate">{preset.title}</h3>
                                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{preset.identifier}</p>
                                        </div>
                                        <div className="pt-2 border-t border-border/60">
                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Provider</span>
                                            <span className="text-xs font-bold text-foreground">{preset.provider}</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => toast.success(`Initiating automated topup for ${preset.title}...`)}
                                        className="w-full mt-4 h-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-sm"
                                    >
                                        Pay Bill Now
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── MODALS (WRAPPED IN CLIENTPORTAL FOR VIEWPORT STABILITY) ─────────── */}

            {/* ── MODAL: CREATE POCKET ────────────────────────────────────────── */}
            {isCreatePocketOpen && (
                <ClientPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90dvh] overflow-y-auto"
                        >
                            <button
                                onClick={() => setIsCreatePocketOpen(false)}
                                className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                                    <PiggyBank className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-foreground">Create Digital Pocket</h3>
                                    <p className="text-xs text-muted-foreground font-semibold">Separate disciplined funds from your main card wallet</p>
                                </div>
                            </div>

                            <form onSubmit={handleCreatePocket} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Pocket Name</label>
                                    <Input
                                        type="text"
                                        value={newPocketName}
                                        onChange={(e) => setNewPocketName(e.target.value)}
                                        placeholder="e.g. Feeding &amp; Foodstuff, School Fees"
                                        className="h-11 rounded-xl bg-background border-border text-xs text-foreground"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Category</label>
                                        <select
                                            value={newPocketCategory}
                                            onChange={(e) => setNewPocketCategory(e.target.value)}
                                            className="w-full h-11 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                        >
                                            <option value="feeding">Feeding &amp; Food</option>
                                            <option value="school_fees">School Fees</option>
                                            <option value="rent">House Rent</option>
                                            <option value="utility">PHED Electricity</option>
                                            <option value="insurance">Health HMO</option>
                                            <option value="emergency">Emergency Cushion</option>
                                            <option value="custom">Custom Goal</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Target Goal (₦)</label>
                                        <Input
                                            type="number"
                                            value={newPocketTarget}
                                            onChange={(e) => setNewPocketTarget(e.target.value)}
                                            placeholder="50000"
                                            className="h-11 rounded-xl bg-background border-border text-xs text-foreground"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Initial Stash from Main Wallet (₦)</label>
                                    <Input
                                        type="number"
                                        value={newPocketInitialStash}
                                        onChange={(e) => setNewPocketInitialStash(e.target.value)}
                                        placeholder="0.00"
                                        className="h-11 rounded-xl bg-background border-border text-xs text-foreground"
                                    />
                                    <span className="text-[10px] text-muted-foreground mt-1 block">Available in wallet: ₦{metrics.primaryBalance.toLocaleString()}</span>
                                </div>

                                <div className="pt-2 border-t border-border">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newPocketIsLocked}
                                            onChange={(e) => setNewPocketIsLocked(e.target.checked)}
                                            className="rounded border-border text-primary focus:ring-0"
                                        />
                                        <span className="text-xs font-bold text-foreground">Lock Pocket to prevent impulsive withdrawals</span>
                                    </label>

                                    {newPocketIsLocked && (
                                        <div className="mt-3">
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">Unlock Date</label>
                                            <Input
                                                type="date"
                                                value={newPocketUnlockDate}
                                                onChange={(e) => setNewPocketUnlockDate(e.target.value)}
                                                className="h-10 rounded-xl bg-background border-border text-xs text-foreground"
                                            />
                                        </div>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs mt-4 shadow-sm"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Pocket'}
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                </ClientPortal>
            )}

            {/* ── MODAL: STASH MONEY ──────────────────────────────────────────── */}
            {selectedPocketForStash && (
                <ClientPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setSelectedPocketForStash(null)}
                                className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                                    <ArrowDownLeft className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-foreground">Stash Money</h3>
                                    <p className="text-xs text-muted-foreground">Into &ldquo;{selectedPocketForStash.name}&rdquo;</p>
                                </div>
                            </div>

                            <form onSubmit={handleStashSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Amount to Stash (₦)</label>
                                    <Input
                                        type="number"
                                        value={stashAmount}
                                        onChange={(e) => setStashAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="100"
                                        className="h-12 text-xl font-black rounded-xl bg-background border-border text-foreground"
                                        required
                                    />
                                    <span className="text-[10px] text-muted-foreground mt-1 block">Spendable balance: ₦{metrics.primaryBalance.toLocaleString()}</span>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-sm"
                                >
                                    {isSubmitting ? 'Stashing...' : 'Confirm Stash'}
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                </ClientPortal>
            )}

            {/* ── MODAL: WITHDRAW MONEY ───────────────────────────────────────── */}
            {selectedPocketForWithdraw && (
                <ClientPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setSelectedPocketForWithdraw(null)}
                                className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                    <ArrowUpRight className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-foreground">Withdraw to Main Wallet</h3>
                                    <p className="text-xs text-muted-foreground">From &ldquo;{selectedPocketForWithdraw.name}&rdquo;</p>
                                </div>
                            </div>

                            <form onSubmit={(e) => handleWithdrawSubmit(e, false)} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Amount to Withdraw (₦)</label>
                                    <Input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="100"
                                        max={selectedPocketForWithdraw.balance}
                                        className="h-12 text-xl font-black rounded-xl bg-background border-border text-foreground"
                                        required
                                    />
                                    <span className="text-[10px] text-muted-foreground mt-1 block">In pocket: ₦{Number(selectedPocketForWithdraw.balance).toLocaleString()}</span>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    variant="outline"
                                    className="w-full h-11 rounded-xl font-black text-xs"
                                >
                                    {isSubmitting ? 'Withdrawing...' : 'Release to Main Wallet'}
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                </ClientPortal>
            )}

            {/* ── MODAL: CREATE BILL SPLIT ────────────────────────────────────── */}
            {isCreateSplitOpen && (
                <ClientPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90dvh] overflow-y-auto"
                        >
                            <button
                                onClick={() => setIsCreateSplitOpen(false)}
                                className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-foreground">Create Shared Bill Split</h3>
                                    <p className="text-xs text-muted-foreground font-semibold">Coordinate and track shared contributions</p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateSplit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Bill Title</label>
                                    <Input
                                        type="text"
                                        value={splitTitle}
                                        onChange={(e) => setSplitTitle(e.target.value)}
                                        placeholder="e.g. Compound Generator Diesel (200L)"
                                        className="h-11 rounded-xl bg-background border-border text-xs text-foreground"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Total Amount (₦)</label>
                                    <Input
                                        type="number"
                                        value={splitTotal}
                                        onChange={(e) => setSplitTotal(e.target.value)}
                                        placeholder="e.g. 50000"
                                        className="h-11 rounded-xl bg-background border-border text-xs text-foreground"
                                        required
                                    />
                                </div>

                                <div className="space-y-2 pt-2 border-t border-border">
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase">Participants</label>
                                    {splitMembers.map((m, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Input
                                                type="text"
                                                value={m.name}
                                                onChange={(e) => {
                                                    const next = [...splitMembers]
                                                    next[idx].name = e.target.value
                                                    setSplitMembers(next)
                                                }}
                                                placeholder={`Participant ${idx + 1} Name`}
                                                className="flex-1 h-9 rounded-xl bg-background border-border text-xs text-foreground"
                                                required
                                            />
                                            <Input
                                                type="text"
                                                value={m.phoneNumber}
                                                onChange={(e) => {
                                                    const next = [...splitMembers]
                                                    next[idx].phoneNumber = e.target.value
                                                    setSplitMembers(next)
                                                }}
                                                placeholder="Phone (optional)"
                                                className="flex-1 h-9 rounded-xl bg-background border-border text-xs text-foreground"
                                            />
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => setSplitMembers([...splitMembers, { name: '', phoneNumber: '' }])}
                                        className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1 mt-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Another Person
                                    </button>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs mt-4 shadow-sm"
                                >
                                    {isSubmitting ? 'Creating Split...' : 'Generate Bill Split'}
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                </ClientPortal>
            )}
        </div>
    )
}
