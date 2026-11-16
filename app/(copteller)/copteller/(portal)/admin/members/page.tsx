"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    BookUser, Search, Plus, X, CheckCircle2, Clock, AlertCircle,
    Users, BarChart3, Wallet, Shield, Phone, MapPin, Calendar,
    Edit2, RefreshCw, TrendingUp, ChevronDown, Banknote, Activity, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString()}`

type MemberStatus = 'active' | 'suspended' | 'pending' | 'exited'
type KYCTier = 'Tier 1' | 'Tier 2' | 'Tier 3'

interface Member {
    id: string
    memberNo: string
    fullName: string
    phone: string
    email: string
    address: string
    cooperative: string
    joinDate: string
    status: MemberStatus
    kycTier: KYCTier
    walletBalance: number
    creditScore: number
    ajoActive: boolean
    hpActive: boolean
    totalDuesPaid: number
    duesArrears: number
    accountNumber: string
    bvn: string
}

const STATUS_CFG: Record<MemberStatus, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    suspended: { label: 'Suspended', cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
    pending: { label: 'Pending KYC', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    exited: { label: 'Exited', cls: 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700' },
}

const SAMPLE_MEMBERS: Member[] = [
    { id: 'mem_001', memberNo: 'MBR-2024-001', fullName: 'Kalu Onyekachi', phone: '0801 234 5678', email: 'kalu.o@email.com', address: 'Ariaria Market, Aba', cooperative: 'Aba Motor Union', joinDate: 'Jan 15, 2024', status: 'active', kycTier: 'Tier 2', walletBalance: 84500, creditScore: 724, ajoActive: true, hpActive: true, totalDuesPaid: 75000, duesArrears: 0, accountNumber: '0092819209', bvn: '221234â€¢â€¢â€¢â€¢â€¢â€¢' },
    { id: 'mem_002', memberNo: 'MBR-2024-002', fullName: 'Amara Okafor', phone: '0807 654 3210', email: 'amara.o@email.com', address: 'Ogbor Hill, Aba', cooperative: 'Aba Motor Union', joinDate: 'Feb 10, 2024', status: 'active', kycTier: 'Tier 2', walletBalance: 23400, creditScore: 690, ajoActive: true, hpActive: false, totalDuesPaid: 65000, duesArrears: 0, accountNumber: '0088129021', bvn: '221567â€¢â€¢â€¢â€¢â€¢â€¢' },
    { id: 'mem_003', memberNo: 'MBR-2024-003', fullName: 'Ngozi Eze', phone: '0803 912 7654', email: 'ngozi.e@email.com', address: 'Ariaria Market, Aba', cooperative: 'Ariaria Traders Union', joinDate: 'Mar 05, 2024', status: 'active', kycTier: 'Tier 1', walletBalance: 12100, creditScore: 640, ajoActive: false, hpActive: true, totalDuesPaid: 45000, duesArrears: 5000, accountNumber: '0084712930', bvn: '221890â€¢â€¢â€¢â€¢â€¢â€¢' },
    { id: 'mem_004', memberNo: 'MBR-2024-004', fullName: 'Chinedu Eze', phone: '0812 345 6789', email: 'chinedu.e@email.com', address: 'Faulks Road, Aba', cooperative: 'Aba Motor Union', joinDate: 'Apr 20, 2024', status: 'suspended', kycTier: 'Tier 2', walletBalance: 4200, creditScore: 510, ajoActive: false, hpActive: true, totalDuesPaid: 30000, duesArrears: 15000, accountNumber: '0091002912', bvn: '221345â€¢â€¢â€¢â€¢â€¢â€¢' },
    { id: 'mem_005', memberNo: 'MBR-2024-005', fullName: 'Chisom Nwosu', phone: '0809 234 5670', email: 'chisom.n@email.com', address: 'Ekpu Market, Umuahia', cooperative: 'Garment Workers Union', joinDate: 'May 12, 2024', status: 'active', kycTier: 'Tier 2', walletBalance: 56000, creditScore: 755, ajoActive: true, hpActive: false, totalDuesPaid: 55000, duesArrears: 0, accountNumber: '0093827412', bvn: '221678â€¢â€¢â€¢â€¢â€¢â€¢' },
    { id: 'mem_006', memberNo: 'MBR-2025-001', fullName: 'Emeka Obi', phone: '0815 678 9012', email: 'emeka.o@email.com', address: 'Township, Umuahia', cooperative: 'Umuahia Welders Coop', joinDate: 'Jan 10, 2025', status: 'pending', kycTier: 'Tier 1', walletBalance: 2000, creditScore: 0, ajoActive: false, hpActive: false, totalDuesPaid: 5000, duesArrears: 0, accountNumber: '0077291821', bvn: '' },
]

type EditMode = 'status' | 'kyc' | null

export default function AdminMembersPage() {
    const router = useRouter()
    const [mounted, setMounted] = React.useState(false)
    const [members, setMembers] = React.useState<Member[]>(SAMPLE_MEMBERS)
    
    React.useEffect(() => {
        setMounted(true)
    }, [])

    const [loading, setLoading] = React.useState(true)
    const [coopProfile, setCoopProfile] = React.useState<any>(null)
    const [search, setSearch] = React.useState('')
    const [statusFilter, setStatusFilter] = React.useState<string>('all')
    const [selected, setSelected] = React.useState<Member | null>(null)
    const [editMode, setEditMode] = React.useState<EditMode>(null)
    const [editValue, setEditValue] = React.useState('')
    const [saving, setSaving] = React.useState(false)

    // Onboarding Form States
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
    const [firstName, setFirstName] = React.useState('')
    const [lastName, setLastName] = React.useState('')
    const [email, setEmail] = React.useState('')
    const [phone, setPhone] = React.useState('')
    const [initialBalance, setInitialBalance] = React.useState(5000)
    const [submitting, setSubmitting] = React.useState(false)

    // Lock body scroll and handle ESC key when onboard modal is open
    React.useEffect(() => {
        if (!isAddModalOpen) return
        const origOverflow = document.body.style.overflow
        const origPadding = document.body.style.paddingRight
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
        if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
        document.body.style.overflow = 'hidden'

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsAddModalOpen(false)
        }
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.body.style.overflow = origOverflow
            document.body.style.paddingRight = origPadding
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isAddModalOpen])

    // Sector-specific inputs
    const [metaLicenseNumber, setMetaLicenseNumber] = React.useState("")
    const [metaVehicleReg, setMetaVehicleReg] = React.useState("")
    const [metaVehicleType, setMetaVehicleType] = React.useState("TVS King")
    const [metaChassisNumber, setMetaChassisNumber] = React.useState("")

    const [metaFarmSize, setMetaFarmSize] = React.useState("")
    const [metaCropType, setMetaCropType] = React.useState("")
    const [metaFarmLocation, setMetaFarmLocation] = React.useState("")

    const [metaShopId, setMetaShopId] = React.useState("")
    const [metaTradeType, setMetaTradeType] = React.useState("")
    const [metaBusinessCAC, setMetaBusinessCAC] = React.useState("")

    const [metaGuildName, setMetaGuildName] = React.useState("")
    const [metaCertNumber, setMetaCertNumber] = React.useState("")
    const [metaWorkshopLocation, setMetaWorkshopLocation] = React.useState("")

    const fetchCoopProfile = async () => {
        try {
            const res = await fetch('/api/copteller/admin/cooperative-profile')
            const data = await res.json()
            if (data.success && data.cooperative) {
                setCoopProfile(data.cooperative)
            }
        } catch (err) {
            console.warn("Failed to load cooperative profile", err)
        }
    }

    const fetchMembers = async () => {
        try {
            const res = await fetch('/api/copteller/admin/operators')
            const data = await res.json()
            if (data.success && data.operators) {
                const mapped = data.operators.map((op: any) => {
                    const lowStatus = String(op.status || '').toLowerCase()
                    return {
                        id: op.id,
                        memberNo: `MBR-2026-${String(op.id).slice(-3).toUpperCase()}`,
                        fullName: op.name,
                        phone: op.phone || '080X XXX XXXX',
                        email: op.email,
                        address: 'Aba Trade Zone',
                        cooperative: coopProfile?.name || 'Aba Motor Union',
                        joinDate: 'Jan 10, 2026',
                        status: lowStatus === 'active' ? 'active' : (lowStatus === 'pending' ? 'pending' : 'suspended'),
                        kycTier: (op.kycStatus === 'verified' || op.kycStatus === 'tier_2') ? 'Tier 2' : (op.kycStatus === 'tier_3' ? 'Tier 3' : 'Tier 1'),
                        walletBalance: (op.balance || 0) / 100,
                        creditScore: op.creditScore > 100 ? op.creditScore : Math.round(300 + (op.creditScore || 50) * 5.5),
                        ajoActive: !!op.ajoActive,
                        hpActive: !!op.hpActive,
                        totalDuesPaid: (op.totalDuesPaid || 0) / 100,
                        duesArrears: (op.duesArrears || 0) / 100,
                        accountNumber: op.accountNumber || 'Pending',
                        bvn: '221234••••••',
                    }
                })
                setMembers(prev => {
                    const filteredPrev = prev.filter(p => p.id.startsWith('mem_'))
                    return [...mapped, ...filteredPrev]
                })
            }
        } catch (err) {
            console.warn("Failed to load DB operators:", err)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchMembers()
        fetchCoopProfile()
    }, [])

    const sector = coopProfile?.sector || 'transport'
    const memberWord = sector === 'transport' ? 'Driver' : sector === 'agriculture' ? 'Farmer' : sector === 'commerce' ? 'Trader' : 'Artisan'
    const memberLabel = sector === 'transport' ? 'Operators' : sector === 'agriculture' ? 'Farmers' : sector === 'commerce' ? 'Traders' : 'Artisans'

    const handleCreateMember = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!firstName || !lastName || !email) {
            toast.error("Required fields missing")
            return
        }
        setSubmitting(true)
        const tId = toast.loading("Onboarding cooperative member and creating savings wallet...")

        const metadata: Record<string, any> = {}
        if (sector === 'transport') {
            metadata.licenseNumber = metaLicenseNumber
            metadata.vehicleReg = metaVehicleReg
            metadata.vehicleType = metaVehicleType
            metadata.chassisNumber = metaChassisNumber
        } else if (sector === 'agriculture') {
            metadata.farmSize = Number(metaFarmSize)
            metadata.cropType = metaCropType
            metadata.farmLocation = metaFarmLocation
        } else if (sector === 'commerce') {
            metadata.shopId = metaShopId
            metadata.tradeType = metaTradeType
            metadata.businessCAC = metaBusinessCAC
        } else if (sector === 'artisan') {
            metadata.guildName = metaGuildName
            metadata.certificationNumber = metaCertNumber
            metadata.workshopLocation = metaWorkshopLocation
        }

        try {
            const res = await fetch('/api/copteller/admin/operators', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    phone_number: phone,
                    initial_balance_naira: Number(initialBalance),
                    metadata
                })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`Member ${data.operator.name} onboarded! Account: ${data.operator.accountNumber}`, { id: tId })
                setIsAddModalOpen(false)
                setFirstName("")
                setLastName("")
                setEmail("")
                setPhone("")
                setInitialBalance(5000)
                
                // Clear sector metadata inputs
                setMetaLicenseNumber("")
                setMetaVehicleReg("")
                setMetaVehicleType("TVS King")
                setMetaChassisNumber("")
                setMetaFarmSize("")
                setMetaCropType("")
                setMetaFarmLocation("")
                setMetaShopId("")
                setMetaTradeType("")
                setMetaBusinessCAC("")
                setMetaGuildName("")
                setMetaCertNumber("")
                setMetaWorkshopLocation("")
                
                fetchMembers()
            } else {
                toast.error(data.error || 'Failed to onboard member', { id: tId })
            }
        } catch (err) {
            toast.error('Network request failed', { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    const stats = {
        total: members.length,
        active: members.filter(m => m.status === 'active').length,
        pending: members.filter(m => m.status === 'pending').length,
        totalBalance: members.reduce((a, m) => a + m.walletBalance, 0),
        arrearsCount: members.filter(m => m.duesArrears > 0).length,
    }

    const filtered = members.filter(m => {
        const q = search.toLowerCase()
        const matchQ = m.fullName.toLowerCase().includes(q) || m.memberNo.toLowerCase().includes(q) ||
            m.phone.includes(q) || m.accountNumber.includes(q)
        const matchStatus = statusFilter === 'all' || m.status === statusFilter
        return matchQ && matchStatus
    })

    const handleSaveEdit = async () => {
        if (!selected || !editValue) return
        setSaving(true)
        const tId = toast.loading('Saving member record in core ledger…')
        try {
            const res = await fetch('/api/copteller/admin/operators', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    memberId: selected.id,
                    membershipId: (selected as any).membershipId,
                    status: editMode === 'status' ? editValue : undefined,
                    kycTier: editMode === 'kyc' ? editValue : undefined,
                })
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update member')
            }

            if (editMode === 'status') {
                setMembers(prev => prev.map(m => m.id === selected.id ? { ...m, status: editValue as MemberStatus } : m))
                setSelected(prev => prev ? { ...prev, status: editValue as MemberStatus } : prev)
            } else if (editMode === 'kyc') {
                setMembers(prev => prev.map(m => m.id === selected.id ? { ...m, kycTier: editValue as KYCTier } : m))
                setSelected(prev => prev ? { ...prev, kycTier: editValue as KYCTier } : prev)
            }
            toast.success(data.message || 'Member record updated in database.', { id: tId })
            setEditMode(null)
            fetchMembers()
        } catch (err: any) {
            toast.error(err.message || 'Error updating member record', { id: tId })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                <p className="text-muted-foreground font-medium text-sm">Loading member directory...</p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Administration</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">{coopProfile ? `${coopProfile.name} Directory` : "Member Accounts"}</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">Manage cooperative member profiles, KYC tiers, wallet status, and account standing.</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs border-0 gap-2 w-full sm:w-auto">
                    <Plus className="h-3.5 w-3.5" /> Onboard Member
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                {[
                    { label: `Total ${memberLabel}`, val: stats.total.toString(), icon: Users },
                    { label: 'Active', val: stats.active.toString(), icon: CheckCircle2 },
                    { label: 'Pending KYC', val: stats.pending.toString(), icon: Clock },
                    { label: 'Total Wallet Balance', val: `₦${(stats.totalBalance / 1000).toFixed(0)}K`, icon: Wallet },
                    { label: 'Dues Arrears', val: stats.arrearsCount.toString(), icon: AlertCircle },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-3 shadow-sm min-w-0">
                        <div className="flex justify-between items-start">
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest truncate">{s.label}</p>
                            <s.icon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        </div>
                        <p className="text-lg sm:text-xl font-black mt-1 truncate">{s.val}</p>
                    </div>
                ))}
            </div>

            {/* 2-col layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Member Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, account, phone..."
                                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none" />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            {(['all', 'active', 'pending', 'suspended'] as const).map(s => (
                                <button key={s} onClick={() => setStatusFilter(s)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black capitalize transition-all ${statusFilter === s ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-900 text-muted-foreground hover:text-foreground'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[550px] text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    {['Member', 'Cooperative', 'KYC / Score', 'Wallet', 'Status'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
                                {filtered.map(m => (
                                    <tr key={m.id}
                                        onClick={() => { setSelected(selected?.id === m.id ? null : m); setEditMode(null) }}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer ${selected?.id === m.id ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-emerald-500 flex items-center justify-center text-[9px] font-black text-black shrink-0">
                                                    {m.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="font-black">{m.fullName}</p>
                                                    <p className="text-[9px] text-muted-foreground font-mono">{m.memberNo}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-foreground">{coopProfile ? coopProfile.name : m.cooperative}</p>
                                            <p className="text-[9px] text-muted-foreground">Since {m.joinDate.split(',')[1] || m.joinDate}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${m.kycTier === 'Tier 3' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : m.kycTier === 'Tier 2' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                                                    {m.kycTier}
                                                </span>
                                            </div>
                                            {m.creditScore > 0 && <p className="text-[9px] text-muted-foreground mt-0.5">Score: {m.creditScore}/850</p>}
                                        </td>
                                        <td className="px-4 py-3 font-black text-foreground">{fmt(m.walletBalance)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${STATUS_CFG[m.status].cls}`}>
                                                {STATUS_CFG[m.status].label}
                                            </span>
                                            {m.duesArrears > 0 && <p className="text-[9px] text-rose-500 font-bold mt-0.5">₦{(m.duesArrears / 1000).toFixed(0)}K arrears</p>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right detail */}
                <SidePanelWrapper
                    isOpen={Boolean(selected)}
                    onClose={() => { setSelected(null); setEditMode(null); }}
                    title="Member Details"
                    className="lg:col-span-1"
                    emptyState={
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 text-center space-y-3 shadow-sm empty-state-card">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit mx-auto">
                                <BookUser className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            </div>
                            <p className="text-sm font-black text-muted-foreground">Select a member</p>
                            <p className="text-[11px] text-muted-foreground/70">Click any member row to manage their account</p>
                        </div>
                    }
                >
                    {selected && (
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 max-h-[80vh] overflow-y-auto active-sidepanel-card">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-emerald-500 flex items-center justify-center text-xs font-black text-black">
                                        {selected.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black">{selected.fullName}</h3>
                                        <p className="text-[10px] text-muted-foreground font-semibold">{selected.memberNo}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setSelected(null); setEditMode(null) }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Quick stats */}
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Wallet', val: fmt(selected.walletBalance), icon: Wallet },
                                    { label: 'Credit Score', val: selected.creditScore || 'N/A', icon: BarChart3 },
                                    { label: 'Dues Paid', val: fmt(selected.totalDuesPaid), icon: Banknote },
                                    { label: 'Arrears', val: selected.duesArrears > 0 ? fmt(selected.duesArrears) : 'None', icon: AlertCircle },
                                ].map((s, i) => (
                                    <div key={i} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-2.5 space-y-0.5">
                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                                        <p className="text-xs font-black">{s.val}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Details */}
                            <div className="space-y-2.5 text-xs font-semibold border-y border-slate-100 dark:border-slate-800 py-4">
                                {[
                                    { label: 'Phone', val: selected.phone },
                                    { label: 'Email', val: selected.email },
                                    { label: 'Address', val: selected.address },
                                    { label: 'Cooperative', val: coopProfile ? coopProfile.name : selected.cooperative },
                                    { label: 'Joined', val: selected.joinDate },
                                    { label: 'Account Number', val: selected.accountNumber },
                                    { label: 'BVN', val: selected.bvn || 'Not submitted' },
                                    { label: 'Ajo Active', val: selected.ajoActive ? 'Yes' : 'No' },
                                    { label: 'HP Active', val: selected.hpActive ? 'Yes' : 'No' },
                                ].map(({ label, val }) => (
                                    <div key={label} className="flex justify-between">
                                        <span className="text-muted-foreground">{label}</span>
                                        <span className="font-bold text-right max-w-[60%]">{val}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Editable fields */}
                            <div className="space-y-2.5">
                                <Button
                                    onClick={() => router.push(`/copteller/admin/members/${selected.id}`)}
                                    className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-foreground font-black text-xs border border-slate-200 dark:border-slate-850 gap-2 mb-2"
                                >
                                    Open Fullscreen Profile &rarr;
                                </Button>
                                <div>
                                    <div className="flex justify-between items-center mb-1.5 border-t border-slate-100 dark:border-slate-900 pt-2.5">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Account Status</p>
                                        <button onClick={() => { setEditMode('status'); setEditValue(selected.status) }}
                                            className="text-[9px] font-black text-amber-600 hover:underline"><Edit2 className="h-3 w-3 inline mr-0.5" />Edit</button>
                                    </div>
                                    {editMode === 'status' ? (
                                        <div className="flex gap-2">
                                            <select value={editValue} onChange={e => setEditValue(e.target.value)}
                                                className="flex-1 h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold">
                                                {['active', 'suspended', 'exited'].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <Button size="sm" onClick={handleSaveEdit} disabled={saving}
                                                className="h-8 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-black border-0">
                                                {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Save'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${STATUS_CFG[selected.status].cls}`}>{STATUS_CFG[selected.status].label}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">KYC Tier</p>
                                        <button onClick={() => { setEditMode('kyc'); setEditValue(selected.kycTier) }}
                                            className="text-[9px] font-black text-amber-600 hover:underline"><Edit2 className="h-3 w-3 inline mr-0.5" />Upgrade</button>
                                    </div>
                                    {editMode === 'kyc' ? (
                                        <div className="flex gap-2">
                                            <select value={editValue} onChange={e => setEditValue(e.target.value)}
                                                className="flex-1 h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold">
                                                {['Tier 1', 'Tier 2', 'Tier 3'].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <Button size="sm" onClick={handleSaveEdit} disabled={saving}
                                                className="h-8 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-black border-0">
                                                {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Save'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <span className="text-xs font-bold">{selected.kycTier}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </SidePanelWrapper>
            </div>
            {/* Onboard Member Modal */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isAddModalOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-auto">
                            <div onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="relative bg-background border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[28px] sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl font-sans max-h-[88vh] flex flex-col z-10"
                            >
                                {/* Mobile pull handle indicator */}
                                <div className="sm:hidden w-10 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto -mt-1 mb-3 shrink-0" />

                                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-900 pb-3 shrink-0">
                                    <div>
                                        <h3 className="text-sm font-black">Onboard Cooperative Member</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Register new {memberWord.toLowerCase()} profile and auto-create local savings account.</p>
                                    </div>
                                    <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="overflow-y-auto overscroll-contain flex-1 pt-3 pr-0.5">
                                <form onSubmit={handleCreateMember} className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">First Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={firstName}
                                                onChange={e => setFirstName(e.target.value)}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Last Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={lastName}
                                                onChange={e => setLastName(e.target.value)}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Email Address</label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-250 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Phone Number</label>
                                        <input
                                            type="text"
                                            required
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-250 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    {/* Sector-Specific Fields */}
                                    {sector === 'transport' && (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase">License No.</label>
                                                    <input required type="text" value={metaLicenseNumber} onChange={e => setMetaLicenseNumber(e.target.value)} placeholder="e.g. DL-182910" className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Plate Number</label>
                                                    <input required type="text" value={metaVehicleReg} onChange={e => setMetaVehicleReg(e.target.value)} placeholder="e.g. ABA-499" className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500 uppercase" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Vehicle Type</label>
                                                    <select value={metaVehicleType} onChange={e => setMetaVehicleType(e.target.value)} className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-amber-500">
                                                        <option value="TVS King">TVS King (Tricycle)</option>
                                                        <option value="Bajaj">Bajaj (Tricycle)</option>
                                                        <option value="Haojin">Haojin (Motorcycle)</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Chassis No.</label>
                                                    <input required type="text" value={metaChassisNumber} onChange={e => setMetaChassisNumber(e.target.value)} placeholder="e.g. 1928019" className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-mono focus:outline-none focus:border-amber-500" />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {sector === 'agriculture' && (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Farm Size (ha)</label>
                                                    <input required type="number" value={metaFarmSize} onChange={e => setMetaFarmSize(e.target.value)} placeholder="e.g. 5.5" className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Primary Crops</label>
                                                    <input required type="text" value={metaCropType} onChange={e => setMetaCropType(e.target.value)} placeholder="e.g. Cassava, Maize" className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Farm Community / LGA</label>
                                                <input required type="text" value={metaFarmLocation} onChange={e => setMetaFarmLocation(e.target.value)} placeholder="e.g. Obingwa LGA" className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                            </div>
                                        </>
                                    )}

                                    {sector === 'commerce' && (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Shop / Stall ID</label>
                                                    <input required type="text" value={metaShopId} onChange={e => setMetaShopId(e.target.value)} placeholder="e.g. ART-B2-99" className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Trade Goods</label>
                                                    <input required type="text" value={metaTradeType} onChange={e => setMetaTradeType(e.target.value)} placeholder="e.g. Leather Materials" className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Business CAC (Optional)</label>
                                                <input type="text" value={metaBusinessCAC} onChange={e => setMetaBusinessCAC(e.target.value)} placeholder="e.g. RC-991029" className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500 uppercase" />
                                            </div>
                                        </>
                                    )}

                                    {sector === 'artisan' && (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Artisan Guild Name</label>
                                                    <input required type="text" value={metaGuildName} onChange={e => setMetaGuildName(e.target.value)} placeholder="e.g. Shoe Makers Association" className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Certification ID</label>
                                                    <input required type="text" value={metaCertNumber} onChange={e => setMetaCertNumber(e.target.value)} placeholder="e.g. CERT-2024-910" className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Workshop Address</label>
                                                <input required type="text" value={metaWorkshopLocation} onChange={e => setMetaWorkshopLocation(e.target.value)} placeholder="e.g. 10 Faulks Road, Aba" className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                            </div>
                                        </>
                                    )}

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Initial Deposit (₦)</label>
                                        <input
                                            type="number"
                                            required
                                            value={initialBalance}
                                            onChange={e => setInitialBalance(Number(e.target.value))}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-250 dark:border-slate-800 bg-background text-xs font-black focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                                        <Button type="button" onClick={() => setIsAddModalOpen(false)} variant="outline" className="w-full sm:w-auto flex-1 rounded-xl h-9 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                        <Button type="submit" disabled={submitting} className="w-full sm:w-auto flex-1 bg-gradient-to-r from-amber-500 to-emerald-500 text-black font-black text-xs h-9 rounded-xl border-0">
                                            {submitting ? 'Onboarding...' : 'Onboard Member'}
                                        </Button>
                                    </div>
                                </form>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}


