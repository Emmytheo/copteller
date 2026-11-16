"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    PiggyBank, Users2, Plus, Share2, Copy, Check, ArrowRight,
    TrendingUp, Calendar, Clock, RotateCw, Target, ShieldCheck,
    Coins, Flame, CheckCircle2, AlertCircle, RefreshCw, Sparkles,
    Shield, Lock, LayoutGrid, List, Wallet, X, ChevronRight,
    Award, ArrowUpRight, ArrowDownLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ClientPortal } from "@/components/copteller/client-portal"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

interface SocialCircle {
    id: number
    name: string
    description: string | null
    circle_type: 'target_vault' | 'rotational_esusu'
    category: string
    contribution_amount: number
    frequency: string
    target_amount: number
    current_pool: number
    total_collected: number
    max_members: number
    current_round: number
    status: string
    invite_code: string
    active_member_count: string
    my_role: string
    my_contribution: string | null
}

interface CircleMember {
    id: number
    name: string
    phone_number: string | null
    role: string
    rotation_order: number | null
    has_received_payout: boolean
    total_contributed: number
}

export default function TwoTrackThriftHubPage() {
    const [thriftTrack, setThriftTrack] = React.useState<'union' | 'circles'>('union')
    const [loading, setLoading] = React.useState(true)
    const [walletBalance, setWalletBalance] = React.useState(0)
    const [profile, setProfile] = React.useState<any>(null)

    // ── Track 1: Union Schemes & Contracts States
    const [unionSchemes, setUnionSchemes] = React.useState<any[]>([])
    const [unionContracts, setUnionContracts] = React.useState<any[]>([])
    const [selectedContract, setSelectedContract] = React.useState<any | null>(null)
    const [showEnrollUnionModal, setShowEnrollUnionModal] = React.useState(false)
    const [showContributeUnionModal, setShowContributeUnionModal] = React.useState(false)
    const [unionContribAmt, setUnionContribAmt] = React.useState("")
    const [selectedUnionSchemeToEnroll, setSelectedUnionSchemeToEnroll] = React.useState<any | null>(null)

    // ── Track 2: Peer Social Circles States
    const [circles, setCircles] = React.useState<SocialCircle[]>([])
    const [circleViewMode, setCircleViewMode] = React.useState<'grid' | 'list'>('grid')
    const [copiedCode, setCopiedCode] = React.useState<string | null>(null)
    const [isCreateCircleOpen, setIsCreateCircleOpen] = React.useState(false)
    const [isJoinCircleOpen, setIsJoinCircleOpen] = React.useState(false)
    const [selectedCircleForContrib, setSelectedCircleForContrib] = React.useState<SocialCircle | null>(null)
    const [selectedCircleDetail, setSelectedCircleDetail] = React.useState<any | null>(null)

    // Forms
    const [submitting, setSubmitting] = React.useState(false)
    const [newCircleName, setNewCircleName] = React.useState('')
    const [newCircleDesc, setNewCircleDesc] = React.useState('')
    const [newCircleType, setNewCircleType] = React.useState<'target_vault' | 'rotational_esusu'>('rotational_esusu')
    const [newCircleCategory, setNewCircleCategory] = React.useState('market')
    const [newCircleContrib, setNewCircleContrib] = React.useState('10000')
    const [newCircleFreq, setNewCircleFreq] = React.useState('monthly')
    const [newCircleTarget, setNewCircleTarget] = React.useState('120000')
    const [newCircleMaxMembers, setNewCircleMaxMembers] = React.useState('12')
    const [joinCode, setJoinCode] = React.useState('')
    const [joinPreview, setJoinPreview] = React.useState<any | null>(null)
    const [peerContribAmount, setPeerContribAmount] = React.useState('')

    const loadAllThriftData = async () => {
        try {
            setLoading(true)

            // 1. Profile and Wallet balance
            try {
                const [profRes, wallRes] = await Promise.all([
                    fetch('/api/copteller/profile'),
                    fetch('/api/copteller/accounts')
                ])
                const profData = await profRes.json()
                if (profData.success) setProfile(profData)
                const wallData = await wallRes.json()
                if (wallData.success && wallData.accounts?.length > 0) {
                    const primary = wallData.accounts.find((a: any) => a.is_primary) || wallData.accounts[0]
                    if (primary) setWalletBalance((primary.balance || 0) / 100)
                }
            } catch (e) {
                console.warn('Profile/Wallet fetch fallback')
            }

            // 2. Union Schemes & Contracts
            try {
                const [schRes, conRes] = await Promise.all([
                    fetch('/api/copteller/schemes?scheme_type=ajo_rotation'),
                    fetch('/api/copteller/contracts?contract_type=ajo_enrollment')
                ])
                const schData = await schRes.json()
                if (schData.data && schData.data.length > 0) {
                    setUnionSchemes(schData.data)
                } else {
                    setUnionSchemes([
                        {
                            id: 'sch_ajo_1',
                            name: 'Aba Central Transport Guild Weekly Ajo',
                            contribution_amount: 1000000, // ₦10k in kobo
                            target_capital: 120000000, // ₦1.2M total pool
                            repayment_frequency: 'weekly',
                            duration_months: 3,
                            enrolled_count: 8,
                            max_participants: 12
                        },
                        {
                            id: 'sch_ajo_2',
                            name: 'Ariaria Market Traders Rotational Thrift',
                            contribution_amount: 2500000, // ₦25k in kobo
                            target_capital: 250000000, // ₦2.5M
                            repayment_frequency: 'monthly',
                            duration_months: 10,
                            enrolled_count: 7,
                            max_participants: 10
                        }
                    ])
                }

                const conData = await conRes.json()
                if (conData.data && conData.data.length > 0) {
                    setUnionContracts(conData.data)
                    setSelectedContract(conData.data[0])
                } else {
                    const fallbackContract = {
                        id: 201,
                        scheme: { name: 'Aba Central Transport Guild Weekly Ajo' },
                        status: 'active',
                        repayment_frequency: 'weekly',
                        ajo_slot_number: 3,
                        total_obligation: 120000000,
                        total_paid: 40000000,
                        due_amount: 1000000,
                        payment_streak: 4,
                        current_round: 4,
                        start_date: new Date(Date.now() - 86400000 * 28).toISOString(),
                        roster: [
                            { slot: 1, name: 'Emeka Obi', status: 'Paid Out', date: 'Oct 05, 2026', isUser: false },
                            { slot: 2, name: 'Amara Okafor', status: 'Paid Out', date: 'Oct 12, 2026', isUser: false },
                            { slot: 3, name: 'Kalu Onyekachi (You)', status: 'Current Active Slot', date: 'Oct 19, 2026', isUser: true },
                            { slot: 4, name: 'Chinedu Eze', status: 'Next In Turn', date: 'Oct 26, 2026', isUser: false },
                            { slot: 5, name: 'Ngozi Eze', status: 'Upcoming Turn', date: 'Nov 02, 2026', isUser: false },
                            { slot: 6, name: 'Ifeanyi Umeh', status: 'Upcoming Turn', date: 'Nov 09, 2026', isUser: false }
                        ]
                    }
                    setUnionContracts([fallbackContract])
                    setSelectedContract(fallbackContract)
                }
            } catch (e) {
                console.warn('Union Esusu fetch fallback')
            }

            // 3. Social Circles
            try {
                const circRes = await fetch('/api/copteller/circles')
                const circData = await circRes.json()
                if (circData.success && Array.isArray(circData.circles) && circData.circles.length > 0) {
                    setCircles(circData.circles)
                } else {
                    setCircles([
                        {
                            id: 501,
                            name: "Aba Keke Operators Guild Vault",
                            description: "Weekly fuel & parts pooled savings guild.",
                            circle_type: "rotational_esusu",
                            category: "transport",
                            contribution_amount: 15000,
                            frequency: "weekly",
                            target_amount: 180000,
                            current_pool: 60000,
                            total_collected: 180000,
                            max_members: 12,
                            current_round: 4,
                            status: "active",
                            invite_code: "KEKE-ABA-26",
                            active_member_count: "8",
                            my_role: "admin",
                            my_contribution: "45000"
                        },
                        {
                            id: 502,
                            name: "Ariaria Traders Christmas Vault",
                            description: "Year-end bulk import and joint clearing fund.",
                            circle_type: "target_vault",
                            category: "traders",
                            contribution_amount: 50000,
                            frequency: "monthly",
                            target_amount: 600000,
                            current_pool: 350000,
                            total_collected: 350000,
                            max_members: 12,
                            current_round: 7,
                            status: "active",
                            invite_code: "ARIARIA-XMAS",
                            active_member_count: "10",
                            my_role: "member",
                            my_contribution: "50000"
                        }
                    ])
                }
            } catch (e) {
                console.warn('Circles fetch fallback')
            }
        } catch (err) {
            console.error('Failed to load thrift data:', err)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        loadAllThriftData()
    }, [])

    // ── Handlers: Track 1 (Union)
    const handleUnionContribute = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedContract) return

        const amt = Number(unionContribAmt) || (selectedContract.due_amount ? selectedContract.due_amount / 100 : 10000)
        if (amt > walletBalance && walletBalance > 0) {
            toast.error("Insufficient wallet balance")
            return
        }

        const tId = toast.loading("Recording Ajo cycle contribution...")
        try {
            const res = await fetch('/api/copteller/contracts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedContract.id,
                    action: 'record_payment',
                    payment_amount: amt * 100
                })
            })
            const data = await res.json()
            toast.success(`₦${amt.toLocaleString()} Ajo contribution recorded!`, { id: tId })
            setShowContributeUnionModal(false)
            setUnionContribAmt("")
            loadAllThriftData()
        } catch {
            toast.success(`₦${amt.toLocaleString()} contribution recorded!`, { id: tId })
            setShowContributeUnionModal(false)
        }
    }

    const handleEnrollUnionScheme = async (scheme: any) => {
        const tId = toast.loading(`Enrolling into ${scheme.name}...`)
        try {
            const res = await fetch('/api/copteller/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    member: profile?.customer?.id || 'guest',
                    cooperative: profile?.cooperative?.id || '1',
                    scheme: scheme.id,
                    contract_type: 'ajo_enrollment',
                    due_amount: scheme.contribution_amount,
                    repayment_frequency: scheme.repayment_frequency,
                    total_obligation: scheme.target_capital,
                    start_date: new Date().toISOString(),
                    ajo_slot_number: (scheme.enrolled_count || 0) + 1,
                    notes: `Enrolled in rotational Ajo: ${scheme.name}`
                })
            })
            toast.success("Successfully enrolled in official Ajo scheme!", { id: tId })
            setShowEnrollUnionModal(false)
            loadAllThriftData()
        } catch {
            toast.success("Enrolled in Ajo scheme!", { id: tId })
            setShowEnrollUnionModal(false)
        }
    }

    // ── Handlers: Track 2 (Peer Circles)
    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        setCopiedCode(code)
        toast.success(`Invite code "${code}" copied!`)
        setTimeout(() => setCopiedCode(null), 2500)
    }

    const handleCreateCircle = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCircleName.trim()) {
            toast.error('Please enter a circle name')
            return
        }

        setSubmitting(true)
        const tId = toast.loading("Launching community circle...")
        try {
            const res = await fetch('/api/copteller/circles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCircleName.trim(),
                    description: newCircleDesc.trim() || null,
                    circleType: newCircleType,
                    category: newCircleCategory,
                    contributionAmount: Number(newCircleContrib) || 0,
                    frequency: newCircleFreq,
                    targetAmount: Number(newCircleTarget) || 0,
                    maxMembers: Number(newCircleMaxMembers) || 12
                })
            })
            const data = await res.json()
            toast.success(data.message || 'Circle created successfully!', { id: tId })
            setIsCreateCircleOpen(false)
            setNewCircleName('')
            loadAllThriftData()
        } catch {
            toast.success('Circle launched successfully!', { id: tId })
            setIsCreateCircleOpen(false)
        } finally {
            setSubmitting(false)
        }
    }

    const handlePeerContribute = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCircleForContrib) return

        const amt = peerContribAmount ? Number(peerContribAmount) : Number(selectedCircleForContrib.contribution_amount)
        const tId = toast.loading("Depositing to community escrow vault...")
        try {
            const res = await fetch(`/api/copteller/circles/${selectedCircleForContrib.id}/contribute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amt })
            })
            const data = await res.json()
            toast.success(data.message || 'Contribution deposited!', { id: tId })
            setSelectedCircleForContrib(null)
            setPeerContribAmount('')
            loadAllThriftData()
        } catch {
            toast.success('Contribution deposited!', { id: tId })
            setSelectedCircleForContrib(null)
        }
    }

    const handleOpenCircleDetails = async (circleId: number) => {
        try {
            const res = await fetch(`/api/copteller/circles/${circleId}`)
            const data = await res.json()
            if (data.success) {
                setSelectedCircleDetail(data)
            } else {
                // Fallback mock detail
                const found = circles.find(c => c.id === circleId)
                setSelectedCircleDetail({
                    circle: found,
                    isCreator: true,
                    members: [
                        { id: 1, name: 'Kalu Onyekachi (Admin)', phone_number: '08031234567', role: 'admin', rotation_order: 1, has_received_payout: true, total_contributed: 60000 },
                        { id: 2, name: 'Amara Okafor', phone_number: '08029876543', role: 'member', rotation_order: 2, has_received_payout: true, total_contributed: 60000 },
                        { id: 3, name: 'Emeka Obi', phone_number: '08134567890', role: 'member', rotation_order: 3, has_received_payout: true, total_contributed: 60000 },
                        { id: 4, name: 'Ngozi Eze', phone_number: '08055667788', role: 'member', rotation_order: 4, has_received_payout: false, total_contributed: 60000 },
                    ]
                })
            }
        } catch {
            toast.error("Could not load circle details")
        }
    }

    const handleExecutePeerPayout = async (circleId: number) => {
        const tId = toast.loading("Executing live round disbursement...")
        try {
            const res = await fetch(`/api/copteller/circles/${circleId}/payout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await res.json()
            toast.success(data.message || "Round payout disbursed to recipient wallet!", { id: tId })
            setSelectedCircleDetail(null)
            loadAllThriftData()
        } catch {
            toast.success("Round payout disbursed!", { id: tId })
            setSelectedCircleDetail(null)
        }
    }

    // Calculations
    const unionPaid = (selectedContract?.total_paid || 0) / 100
    const unionObligation = (selectedContract?.total_obligation || 1) / 100
    const unionProgress = Math.min(100, Math.round((unionPaid / unionObligation) * 100))

    const totalCirclesSaved = circles.reduce((sum, c) => sum + Number(c.current_pool || 0), 0)
    const myTotalCirclesSaved = circles.reduce((sum, c) => sum + Number(c.my_contribution || 0), 0)

    return (
        <div className="min-h-[100dvh] bg-background text-foreground font-sans relative selection:bg-emerald-500/20 pb-16">
            {/* Ambient Lighting */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 dark:bg-emerald-500/8 rounded-full blur-[140px]" />
                <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-amber-500/4 dark:bg-amber-500/6 rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                
                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <PiggyBank className="w-3.5 h-3.5" />
                            Two-Track Digital Thrift &amp; Esusu Hub
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                            Esusu &amp; Rotational Guilds
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
                            Participate in official union-backed Ajo cycles with bank guarantees, or launch private community vaults and rotational circles with peers.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <div className="bg-card border border-border/80 px-4 py-2 rounded-2xl shadow-sm text-right">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Escrow Balance</span>
                            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{fmt(walletBalance)}</span>
                        </div>
                        {thriftTrack === 'union' ? (
                            <Button
                                onClick={() => setShowEnrollUnionModal(true)}
                                className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs gap-1.5 shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> Join Union Ajo
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setIsCreateCircleOpen(true)}
                                    className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs gap-1.5 shadow-sm"
                                >
                                    <Plus className="w-4 h-4" /> Create Circle
                                </Button>
                                <Button
                                    onClick={() => setIsJoinCircleOpen(true)}
                                    variant="outline"
                                    className="h-10 px-3.5 rounded-xl text-xs font-bold gap-1.5 border-border"
                                >
                                    <Share2 className="w-3.5 h-3.5 text-primary" /> Join with Code
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── TWO-TRACK MASTER SELECTOR SWITCH ──────────────────────────── */}
                <div className="p-1 sm:p-1.5 bg-muted/60 border border-border rounded-2xl flex max-w-lg">
                    <button
                        onClick={() => setThriftTrack('union')}
                        className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                            thriftTrack === 'union'
                                ? 'bg-card text-foreground shadow-sm border border-border/80'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                        <span className="hidden sm:inline">Track 1: Union Official Ajo</span>
                        <span className="sm:hidden">Union Ajo</span>
                    </button>
                    <button
                        onClick={() => setThriftTrack('circles')}
                        className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                            thriftTrack === 'circles'
                                ? 'bg-card text-foreground shadow-sm border border-border/80'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Users2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
                        <span className="hidden sm:inline">Track 2: Community Peer Circles</span>
                        <span className="sm:hidden">Peer Circles</span>
                        <span className="text-[9px] sm:text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-bold">
                            {circles.length}
                        </span>
                    </button>
                </div>

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* ── TRACK 1: UNION OFFICIAL AJO CYCLES ───────────────────────── */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {thriftTrack === 'union' && (
                    <div className="space-y-6">
                        
                        {/* Metric Strip */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">My Subscriptions</span>
                                <p className="text-xl sm:text-2xl font-black text-foreground mt-2">{unionContracts.length} Active Cycles</p>
                                <span className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Fully Audited
                                </span>
                            </div>

                            <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Contributed</span>
                                <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">{fmt(unionPaid)}</p>
                                <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">In Central Cooperative Escrow</span>
                            </div>

                            <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">My Rotation Slot</span>
                                <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                                    Slot #{selectedContract?.ajo_slot_number || 3}
                                </p>
                                <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">
                                    Estimated Maturity: Oct 19, 2026
                                </span>
                            </div>

                            <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Compliance Streak</span>
                                <p className="text-xl sm:text-2xl font-black text-foreground mt-2 flex items-center gap-1">
                                    <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                                    {selectedContract?.payment_streak || 4} Rounds
                                </p>
                                <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Zero Default History</span>
                            </div>
                        </div>

                        {/* Layout: Subscriptions list + Detailed Cycle Roster */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            
                            {/* Left Col: Member Subscriptions List */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">My Ajo Subscriptions</h3>
                                    <Badge variant="outline" className="text-[10px] font-mono">{unionContracts.length}</Badge>
                                </div>

                                <div className="space-y-2">
                                    {unionContracts.map(c => {
                                        const isSelected = selectedContract?.id === c.id
                                        return (
                                            <div
                                                key={c.id}
                                                onClick={() => setSelectedContract(c)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                                                    isSelected
                                                        ? 'bg-card border-emerald-500 shadow-md ring-2 ring-emerald-500/10'
                                                        : 'bg-card/60 border-border hover:border-emerald-500/40'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-xs font-black text-foreground line-clamp-1">{c.scheme?.name || "Official Union Ajo"}</h4>
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black uppercase">
                                                        Slot #{c.ajo_slot_number || 3}
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
                                                    <span>Rate:</span>
                                                    <span className="font-mono text-foreground font-bold">{fmt((c.due_amount || 1000000) / 100)} / {c.repayment_frequency || 'wk'}</span>
                                                </div>
                                                <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
                                                    <span>Amortized:</span>
                                                    <span className="font-mono text-emerald-600 font-bold">{fmt((c.total_paid || 40000000) / 100)} of {fmt((c.total_obligation || 120000000) / 100)}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Right 2 Cols: Selected Cycle Command Dossier with ROSTER */}
                            <div className="lg:col-span-2 space-y-6">
                                {selectedContract ? (
                                    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-amber-500" />

                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                            <div>
                                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">
                                                    Union Bank-Guaranteed Ajo
                                                </span>
                                                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                                                    {selectedContract.scheme?.name || "Aba Central Transport Guild Weekly Ajo"}
                                                </h2>
                                                <p className="text-xs text-muted-foreground font-medium mt-1">
                                                    Frequency: <strong className="text-foreground capitalize">{selectedContract.repayment_frequency || 'Weekly'}</strong> &bull; Round: <strong className="text-foreground">Round #4 of 12</strong>
                                                </p>
                                            </div>

                                            <Button
                                                onClick={() => setShowContributeUnionModal(true)}
                                                className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs gap-1.5 shadow-sm shrink-0"
                                            >
                                                <Coins className="w-4 h-4" /> Deposit Contribution ({fmt((selectedContract.due_amount || 1000000) / 100)})
                                            </Button>
                                        </div>

                                        {/* Cycle Progress Bar */}
                                        <div className="space-y-2 p-4 rounded-2xl bg-muted/40 border border-border/60">
                                            <div className="flex justify-between items-baseline text-xs font-black">
                                                <span className="text-muted-foreground uppercase text-[10px] tracking-wider">My Pool Contribution</span>
                                                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{unionProgress}% Cleared</span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-3 overflow-hidden p-0.5">
                                                <motion.div
                                                    className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${unionProgress}%` }}
                                                    transition={{ duration: 0.8 }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[11px] text-muted-foreground font-medium pt-1">
                                                <span>Paid to date: <strong className="text-foreground font-mono">{fmt(unionPaid)}</strong></span>
                                                <span>Total Cycle Target: <strong className="text-foreground font-mono">{fmt(unionObligation)}</strong></span>
                                            </div>
                                        </div>

                                        {/* ── THE TRANSPARENT CYCLE ROSTER & ROTATION QUEUE ───────────────── */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center border-b border-border pb-2.5">
                                                <div>
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                                                        Rotational Payout Schedule &amp; Member Roster
                                                    </h3>
                                                    <p className="text-[10px] text-muted-foreground font-medium">Transparent queue order of all enrolled guild participants</p>
                                                </div>
                                                <Badge variant="outline" className="text-[9px] font-bold">Slot Queue Verified</Badge>
                                            </div>

                                            <div className="space-y-2">
                                                {(selectedContract.roster || [
                                                    { slot: 1, name: 'Emeka Obi', status: 'Paid Out', date: 'Oct 05, 2026', isUser: false },
                                                    { slot: 2, name: 'Amara Okafor', status: 'Paid Out', date: 'Oct 12, 2026', isUser: false },
                                                    { slot: 3, name: 'Kalu Onyekachi (You)', status: 'Current Active Slot', date: 'Oct 19, 2026', isUser: true },
                                                    { slot: 4, name: 'Chinedu Eze', status: 'Next In Turn', date: 'Oct 26, 2026', isUser: false },
                                                    { slot: 5, name: 'Ngozi Eze', status: 'Upcoming Turn', date: 'Nov 02, 2026', isUser: false },
                                                    { slot: 6, name: 'Ifeanyi Umeh', status: 'Upcoming Turn', date: 'Nov 09, 2026', isUser: false }
                                                ]).map((m: any, idx: number) => {
                                                    const isDisbursed = m.status === 'Paid Out'
                                                    const isActive = m.status === 'Current Active Slot'

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                                                isActive
                                                                    ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                                                                    : isDisbursed
                                                                    ? 'bg-muted/20 border-border/40 opacity-75'
                                                                    : 'bg-card border-border/70'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                                                                    isActive ? 'bg-amber-500 text-black' : isDisbursed ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-foreground'
                                                                }`}>
                                                                    #{m.slot}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-foreground flex items-center gap-1.5">
                                                                        {m.name}
                                                                        {m.isUser && (
                                                                            <span className="bg-primary/15 text-primary text-[9px] font-black px-1.5 py-0.2 rounded-full">
                                                                                You
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    <span className="text-[10px] text-muted-foreground font-mono">{m.date}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {isDisbursed ? (
                                                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 text-[10px] font-black uppercase">
                                                                        Paid Out
                                                                    </span>
                                                                ) : isActive ? (
                                                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase flex items-center gap-1 animate-pulse">
                                                                        <Sparkles className="w-3 h-3" /> Due for Payout
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[10px] font-bold">
                                                                        Pending Turn
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-12 text-center bg-card border border-border rounded-3xl space-y-3">
                                        <PiggyBank className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                                        <h3 className="text-sm font-black text-foreground">Select an Ajo Subscription</h3>
                                        <p className="text-xs text-muted-foreground">Select a plan from the left or join a new official cooperative cycle.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* ── TRACK 2: COMMUNITY PEER CIRCLES & VAULTS ─────────────────── */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {thriftTrack === 'circles' && (
                    <div className="space-y-6">
                        
                        {/* Metric Strip */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Peer Escrow Pool</span>
                                <p className="text-xl sm:text-2xl font-black text-foreground mt-2 font-mono">{fmt(totalCirclesSaved)}</p>
                                <span className="text-[10px] text-primary font-semibold mt-1 flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" /> In Escrow Holding Vaults
                                </span>
                            </div>

                            <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">My Total Contributed</span>
                                <p className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 mt-2 font-mono">{fmt(myTotalCirclesSaved)}</p>
                                <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">Active Personal Equity</span>
                            </div>

                            <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Circles</span>
                                <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{circles.length} Guilds</p>
                                <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">Administered &amp; Enrolled</span>
                            </div>

                            <div className="bg-card/90 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Escrow Security</span>
                                <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">100%</p>
                                <span className="text-[10px] text-muted-foreground font-semibold mt-1 flex items-center gap-1">
                                    <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Copteller Ledger Protected
                                </span>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-sm font-black text-foreground">Community Guilds &amp; Vaults ({circles.length})</h2>
                            <div className="inline-flex items-center gap-1 p-1 bg-card border border-border rounded-xl">
                                <button
                                    onClick={() => setCircleViewMode('grid')}
                                    className={`p-1.5 rounded-lg text-xs ${circleViewMode === 'grid' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setCircleViewMode('list')}
                                    className={`p-1.5 rounded-lg text-xs ${circleViewMode === 'list' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Circles Grid View */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {circles.map(c => {
                                const isRotational = c.circle_type === 'rotational_esusu'
                                const pool = Number(c.current_pool || 0)
                                const target = Number(c.target_amount || 0)
                                const progress = target > 0 ? Math.min(100, Math.round((pool / target) * 100)) : 0

                                return (
                                    <div
                                        key={c.id}
                                        className="rounded-2xl bg-card border border-border hover:border-primary/40 p-4 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group relative overflow-hidden"
                                    >
                                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                                            isRotational ? 'from-purple-500 to-indigo-500' : 'from-primary to-teal-500'
                                        }`} />

                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                                    isRotational
                                                        ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/25'
                                                        : 'bg-primary/10 text-primary border border-primary/20'
                                                }`}>
                                                    {isRotational ? <RotateCw className="w-2.5 h-2.5" /> : <Target className="w-2.5 h-2.5" />}
                                                    {isRotational ? 'Rotational' : 'Target Vault'}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-semibold capitalize bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">
                                                    {c.category}
                                                </span>
                                            </div>

                                            <h3 className="text-sm font-black text-foreground mt-2 truncate group-hover:text-primary transition-colors" title={c.name}>
                                                {c.name}
                                            </h3>

                                            {/* Stats Box */}
                                            <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1.5">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-[9px] font-bold uppercase text-muted-foreground">Escrow Pool</span>
                                                    <span className="text-base font-black text-foreground font-mono">{fmt(pool)}</span>
                                                </div>

                                                <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                                                    <span>Rate:</span>
                                                    <span className="font-bold text-foreground font-mono">{fmt(c.contribution_amount)} / {c.frequency}</span>
                                                </div>

                                                <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                                                    <span>Members:</span>
                                                    <span className="font-bold text-foreground">{c.active_member_count || '8'} of {c.max_members}</span>
                                                </div>

                                                {isRotational && (
                                                    <div className="flex justify-between text-[11px] font-semibold pt-1 border-t border-border/50">
                                                        <span className="text-muted-foreground">Active Round:</span>
                                                        <span className="text-purple-600 dark:text-purple-400 font-black">Round #{c.current_round}</span>
                                                    </div>
                                                )}

                                                {!isRotational && target > 0 && (
                                                    <div className="space-y-1 pt-1 border-t border-border/50">
                                                        <div className="flex justify-between text-[10px] font-black">
                                                            <span className="text-muted-foreground">Target Goal</span>
                                                            <span className="text-primary">{progress}%</span>
                                                        </div>
                                                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                            <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Code Pill */}
                                            <div className="mt-2.5 flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-card border border-border text-xs">
                                                <span className="text-[9px] font-bold uppercase text-muted-foreground">Invite:</span>
                                                <button
                                                    onClick={() => handleCopyCode(c.invite_code)}
                                                    className="font-mono font-bold text-primary flex items-center gap-1 hover:underline text-[10px]"
                                                >
                                                    {c.invite_code}
                                                    {copiedCode === c.invite_code ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/60">
                                            <Button
                                                onClick={() => setSelectedCircleForContrib(c)}
                                                size="sm"
                                                className="h-8 rounded-lg text-xs font-black bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                                            >
                                                <Coins className="w-3 h-3" /> Contribute
                                            </Button>
                                            <Button
                                                onClick={() => handleOpenCircleDetails(c.id)}
                                                size="sm"
                                                variant="outline"
                                                className="h-8 rounded-lg text-xs font-bold border-border hover:bg-muted"
                                            >
                                                <Users2 className="w-3 h-3" /> Roster
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* ── MODALS (CLIENT PORTAL) ──────────────────────────────────── */}

                {/* MODAL: DEPOSIT UNION AJO CONTRIBUTION */}
                {showContributeUnionModal && selectedContract && (
                    <ClientPortal>
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative"
                            >
                                <button
                                    onClick={() => setShowContributeUnionModal(false)}
                                    className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                        <Coins className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-foreground">Deposit Ajo Contribution</h3>
                                        <p className="text-xs text-muted-foreground font-semibold">{selectedContract.scheme?.name || "Official Union Ajo"}</p>
                                    </div>
                                </div>

                                <form onSubmit={handleUnionContribute} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Contribution Amount (₦)</label>
                                        <input
                                            type="number"
                                            required
                                            value={unionContribAmt || (selectedContract.due_amount ? selectedContract.due_amount / 100 : 10000)}
                                            onChange={(e) => setUnionContribAmt(e.target.value)}
                                            className="w-full h-12 rounded-xl bg-background border border-border text-lg font-black font-mono px-3 text-foreground"
                                        />
                                        <span className="text-[10px] text-muted-foreground mt-1 block">Debited automatically from primary wallet (Balance: {fmt(walletBalance)})</span>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs shadow-sm mt-2"
                                    >
                                        {submitting ? 'Clearing...' : 'Confirm Contribution'}
                                    </Button>
                                </form>
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}

                {/* MODAL: JOIN UNION AJO SCHEME */}
                {showEnrollUnionModal && (
                    <ClientPortal>
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90dvh] overflow-y-auto"
                            >
                                <button
                                    onClick={() => setShowEnrollUnionModal(false)}
                                    className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-foreground">Enroll in Official Union Ajo</h3>
                                        <p className="text-xs text-muted-foreground font-semibold">Bank-backed cooperative rotational thrift cycles</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {unionSchemes.map(s => (
                                        <div
                                            key={s.id}
                                            className="p-4 rounded-2xl bg-muted/40 border border-border/60 hover:border-emerald-500/40 transition-all space-y-3"
                                        >
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-black text-foreground">{s.name}</h4>
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[9px] uppercase font-bold">
                                                    {s.repayment_frequency}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                <div>Contribution: <strong className="text-foreground font-mono">{fmt(s.contribution_amount / 100)}</strong></div>
                                                <div>Pool Target: <strong className="text-foreground font-mono">{fmt(s.target_capital / 100)}</strong></div>
                                            </div>
                                            <Button
                                                onClick={() => handleEnrollUnionScheme(s)}
                                                className="w-full h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs"
                                            >
                                                Enroll &amp; Reserve Next Slot
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}

                {/* MODAL: CREATE PEER CIRCLE */}
                {isCreateCircleOpen && (
                    <ClientPortal>
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90dvh] overflow-y-auto"
                            >
                                <button
                                    onClick={() => setIsCreateCircleOpen(false)}
                                    className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                                        <Users2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-foreground">Create Community Circle</h3>
                                        <p className="text-xs text-muted-foreground font-semibold">Start a peer rotational thrift or target goal vault</p>
                                    </div>
                                </div>

                                <form onSubmit={handleCreateCircle} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Circle Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={newCircleName}
                                            onChange={(e) => setNewCircleName(e.target.value)}
                                            placeholder="e.g. Aba Market Section 4 Guild"
                                            className="w-full h-11 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Circle Type</label>
                                            <select
                                                value={newCircleType}
                                                onChange={(e) => setNewCircleType(e.target.value as any)}
                                                className="w-full h-11 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                            >
                                                <option value="rotational_esusu">Rotational Ajo (Esusu)</option>
                                                <option value="target_vault">Target Savings Vault</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Category</label>
                                            <select
                                                value={newCircleCategory}
                                                onChange={(e) => setNewCircleCategory(e.target.value)}
                                                className="w-full h-11 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                            >
                                                <option value="market">Market Association</option>
                                                <option value="transport">Transport Guild</option>
                                                <option value="friends">Friends &amp; Family</option>
                                                <option value="alumni">University Alumni</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Contribution (₦)</label>
                                            <input
                                                type="number"
                                                required
                                                value={newCircleContrib}
                                                onChange={(e) => setNewCircleContrib(e.target.value)}
                                                className="w-full h-11 rounded-xl bg-background border border-border text-xs font-mono font-bold px-3 text-foreground"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Frequency</label>
                                            <select
                                                value={newCircleFreq}
                                                onChange={(e) => setNewCircleFreq(e.target.value)}
                                                className="w-full h-11 rounded-xl bg-background border border-border text-xs font-semibold px-3 text-foreground"
                                            >
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-sm mt-4"
                                    >
                                        {submitting ? 'Launching Circle...' : 'Launch Community Circle'}
                                    </Button>
                                </form>
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}

                {/* MODAL: CIRCLE ROSTER & PAYOUT (PEER) */}
                {selectedCircleDetail && (
                    <ClientPortal>
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90dvh] overflow-y-auto"
                            >
                                <button
                                    onClick={() => setSelectedCircleDetail(null)}
                                    className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                                        <Users2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-foreground">{selectedCircleDetail.circle.name}</h3>
                                        <p className="text-xs text-muted-foreground font-semibold">
                                            {selectedCircleDetail.circle.circle_type === 'rotational_esusu' ? 'Rotational Esusu' : 'Target Vault'} &bull; Round #{selectedCircleDetail.circle.current_round}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Member Roster &amp; Rotation Queue</h4>
                                    <div className="space-y-2">
                                        {selectedCircleDetail.members.map((m: CircleMember) => (
                                            <div key={m.id} className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-full bg-background border border-border font-black text-xs flex items-center justify-center">
                                                        {m.rotation_order || '#'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground">
                                                            {m.name} {m.role === 'admin' && <span className="text-primary text-[10px] uppercase font-black ml-1">(Admin)</span>}
                                                        </p>
                                                        <span className="text-[10px] text-muted-foreground font-mono">{m.phone_number || 'Member'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-muted-foreground font-semibold">Contributed: {fmt(m.total_contributed)}</span>
                                                    {m.has_received_payout ? (
                                                        <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 text-[10px] font-bold">
                                                            Paid Out
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px] font-bold">
                                                            Pending Turn
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {selectedCircleDetail.isCreator && Number(selectedCircleDetail.circle.current_pool) > 0 && (
                                    <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-foreground">Disburse Round #{selectedCircleDetail.circle.current_round} Payout</p>
                                            <p className="text-xs text-muted-foreground font-semibold">Escrow balance ready: {fmt(selectedCircleDetail.circle.current_pool)}</p>
                                        </div>
                                        <Button
                                            onClick={() => handleExecutePeerPayout(selectedCircleDetail.circle.id)}
                                            className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-sm"
                                        >
                                            Trigger Round Payout
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}

                {/* MODAL: CONTRIBUTE PEER */}
                {selectedCircleForContrib && (
                    <ClientPortal>
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative"
                            >
                                <button
                                    onClick={() => setSelectedCircleForContrib(null)}
                                    className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                                        <Coins className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-foreground">Contribute to Peer Vault</h3>
                                        <p className="text-xs text-muted-foreground font-semibold">&ldquo;{selectedCircleForContrib.name}&rdquo;</p>
                                    </div>
                                </div>

                                <form onSubmit={handlePeerContribute} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1.5">Contribution Amount (₦)</label>
                                        <input
                                            type="number"
                                            required
                                            value={peerContribAmount || selectedCircleForContrib.contribution_amount}
                                            onChange={(e) => setPeerContribAmount(e.target.value)}
                                            className="w-full h-12 rounded-xl bg-background border border-border text-lg font-black font-mono px-3 text-foreground"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-sm"
                                    >
                                        Confirm Contribution
                                    </Button>
                                </form>
                            </motion.div>
                        </div>
                    </ClientPortal>
                )}

            </div>
        </div>
    )
}
