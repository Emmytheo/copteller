"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import {
    ArrowLeft, User, CheckCircle2, ShieldAlert,
    Wallet, Banknote, AlertCircle, X, Check,
    RefreshCw, CircleDollarSign, Lock, Unlock, Phone, Mail, MapPin, Building2, BarChart3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Member {
    id: string
    memberNo: string
    fullName: string
    phone: string
    email: string
    address: string
    cooperative: string
    joinDate: string
    status: 'active' | 'suspended' | 'exited' | 'pending'
    kycTier: 'Tier 1' | 'Tier 2' | 'Tier 3'
    walletBalance: number
    creditScore: number
    ajoActive: boolean
    hpActive: boolean
    totalDuesPaid: number
    duesArrears: number
    accountNumber?: string
    bvn?: string
    metadata?: Record<string, any>
}

const SAMPLE_MEMBERS: Member[] = [
    { id: 'mem_001', memberNo: 'MBR-2024-001', fullName: 'Kalu Onyekachi', phone: '0801 234 5678', email: 'kalu.o@email.com', address: 'Ariaria Market, Aba', cooperative: 'Aba Motor Union', joinDate: 'Jan 15, 2024', status: 'active', kycTier: 'Tier 2', walletBalance: 8450000, creditScore: 724, ajoActive: true, hpActive: true, totalDuesPaid: 7500000, duesArrears: 0, accountNumber: '0092819209', bvn: '221234••••••', metadata: { licenseNumber: "DL-1092810", vehicleReg: "ABA-404", vehicleType: "TVS King", chassisNumber: "VEH-992019" } },
    { id: 'mem_002', memberNo: 'MBR-2024-002', fullName: 'Amara Okafor', phone: '0807 654 3210', email: 'amara.o@email.com', address: 'Ogbor Hill, Aba', cooperative: 'Aba Motor Union', joinDate: 'Feb 10, 2024', status: 'active', kycTier: 'Tier 2', walletBalance: 2340000, creditScore: 690, ajoActive: true, hpActive: false, totalDuesPaid: 6500000, duesArrears: 0, accountNumber: '0088129021', bvn: '221567••••••', metadata: { licenseNumber: "DL-1088210", vehicleReg: "ABA-211", vehicleType: "Haojin", chassisNumber: "VEH-992011" } },
    { id: 'mem_003', memberNo: 'MBR-2024-003', fullName: 'Ngozi Eze', phone: '0803 912 7654', email: 'ngozi.e@email.com', address: 'Ariaria Market, Aba', cooperative: 'Ariaria Traders Union', joinDate: 'Mar 05, 2024', status: 'active', kycTier: 'Tier 1', walletBalance: 1210000, creditScore: 640, ajoActive: false, hpActive: true, totalDuesPaid: 4500000, duesArrears: 500000, accountNumber: '0084712930', bvn: '221890••••••', metadata: { shopId: "STALL-102", tradeType: "Foodstuff", businessCAC: "RC-99881" } },
    { id: 'mem_004', memberNo: 'MBR-2024-004', fullName: 'Chinedu Eze', phone: '0812 345 6789', email: 'chinedu.e@email.com', address: 'Faulks Road, Aba', cooperative: 'Aba Motor Union', joinDate: 'Apr 20, 2024', status: 'suspended', kycTier: 'Tier 2', walletBalance: 420000, creditScore: 510, ajoActive: false, hpActive: true, totalDuesPaid: 3000000, duesArrears: 1500000, accountNumber: '0091002912', bvn: '221345••••••', metadata: { licenseNumber: "DL-1099812", vehicleReg: "ABA-088", vehicleType: "Bajaj", chassisNumber: "VEH-998801" } },
    { id: 'mem_005', memberNo: 'MBR-2024-005', fullName: 'Chisom Nwosu', phone: '0809 234 5670', email: 'chisom.n@email.com', address: 'Ekpu Market, Umuahia', cooperative: 'Garment Workers Union', joinDate: 'May 12, 2024', status: 'active', kycTier: 'Tier 2', walletBalance: 5600000, creditScore: 755, ajoActive: true, hpActive: false, totalDuesPaid: 5500000, duesArrears: 0, accountNumber: '0093827412', bvn: '221678••••••', metadata: { guildName: "Umuahia Tailor Guild", certificationNumber: "CERT-992019", workshopLocation: "Township, Umuahia" } },
    { id: 'mem_006', memberNo: 'MBR-2025-001', fullName: 'Emeka Obi', phone: '0815 678 9012', email: 'emeka.o@email.com', address: 'Township, Umuahia', cooperative: 'Umuahia Welders Coop', joinDate: 'Jan 10, 2025', status: 'active', kycTier: 'Tier 1', walletBalance: 200000, creditScore: 0, ajoActive: false, hpActive: false, totalDuesPaid: 500000, duesArrears: 0, accountNumber: '0077291821', bvn: '', metadata: { guildName: "Umuahia Welders Guild", certificationNumber: "CERT-992022", workshopLocation: "Industrial Layout, Umuahia" } },
]

interface PageProps {
    params: React.Usable<{ id: string }>
}

export default function AdminMemberDetailPage({ params }: PageProps) {
    const router = useRouter()
    const resolvedParams = React.use(params)
    const { id } = resolvedParams

    const [member, setMember] = React.useState<Member | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [coopProfile, setCoopProfile] = React.useState<any>(null)

    // Form inputs
    const [phone, setPhone] = React.useState("")
    const [email, setEmail] = React.useState("")
    const [address, setAddress] = React.useState("")
    const [status, setStatus] = React.useState<'active' | 'suspended' | 'exited' | 'pending'>("active")
    const [kycTier, setKycTier] = React.useState<'Tier 1' | 'Tier 2' | 'Tier 3'>("Tier 1")

    // Dynamic metadata fields
    const [metaLicenseNumber, setMetaLicenseNumber] = React.useState("")
    const [metaVehicleReg, setMetaVehicleReg] = React.useState("")
    const [metaVehicleType, setMetaVehicleType] = React.useState("")
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

    const fetchMemberData = async () => {
        try {
            setLoading(true)
            const coopRes = await fetch('/api/copteller/admin/cooperative-profile')
            const coopData = await coopRes.json()
            if (coopData.success && coopData.cooperative) {
                setCoopProfile(coopData.cooperative)
            }

            let found: any = null
            try {
                const opsRes = await fetch('/api/copteller/admin/operators')
                const opsData = await opsRes.json()
                if (opsData.success && opsData.operators) {
                    found = opsData.operators.find((op: any) => String(op.id) === String(id))
                }
            } catch (err) {
                console.warn("Database operators fetch failed, trying mock fallback", err)
            }

            if (!found) {
                const mockFound = SAMPLE_MEMBERS.find(m => String(m.id) === String(id))
                if (mockFound) {
                    found = {
                        id: mockFound.id,
                        name: mockFound.fullName,
                        email: mockFound.email,
                        phone: mockFound.phone,
                        balance: mockFound.walletBalance,
                        accountNumber: mockFound.accountNumber || "1029102901",
                        kycStatus: mockFound.status === 'active' ? 'active' : 'suspended',
                        address: mockFound.address,
                        metadata: mockFound.metadata || {}
                    }
                }
            }

            if (found) {
                const lowStatus = String(found.status || '').toLowerCase()
                const mapped: Member = {
                    id: found.id,
                    memberNo: `MBR-2026-${String(found.id).slice(-3).toUpperCase()}`,
                    fullName: found.name,
                    phone: found.phone || '080X XXX XXXX',
                    email: found.email,
                    address: found.address || 'Commercial Trade Zone',
                    cooperative: coopProfile?.name || 'Aba Motor Union',
                    joinDate: 'Jan 10, 2026',
                    status: lowStatus === 'active' ? 'active' : (lowStatus === 'pending' ? 'pending' : 'suspended'),
                    kycTier: (found.kycStatus === 'verified' || found.kycStatus === 'tier_2') ? 'Tier 2' : (found.kycStatus === 'tier_3' ? 'Tier 3' : 'Tier 1'),
                    walletBalance: found.balance !== undefined && found.balance !== null ? (found.balance / 100) : 0,
                    creditScore: found.creditScore > 100 ? found.creditScore : Math.round(300 + (found.creditScore || 50) * 5.5),
                    ajoActive: !!found.ajoActive,
                    hpActive: !!found.hpActive,
                    totalDuesPaid: (found.totalDuesPaid || 0) / 100,
                    duesArrears: (found.duesArrears || 0) / 100,
                    accountNumber: found.accountNumber || 'Pending',
                    bvn: '221234••••••',
                    metadata: found.metadata || {}
                }
                setMember(mapped)
                setPhone(mapped.phone)
                setEmail(mapped.email)
                setAddress(mapped.address)
                setStatus(mapped.status)
                setKycTier(mapped.kycTier)

                const meta = found.metadata || {}
                setMetaLicenseNumber(meta.licenseNumber || "")
                setMetaVehicleReg(meta.vehicleReg || "")
                setMetaVehicleType(meta.vehicleType || "TVS King")
                setMetaChassisNumber(meta.chassisNumber || "")
                setMetaFarmSize(meta.farmSize ? String(meta.farmSize) : "")
                setMetaCropType(meta.cropType || "")
                setMetaFarmLocation(meta.farmLocation || "")
                setMetaShopId(meta.shopId || "")
                setMetaTradeType(meta.tradeType || "")
                setMetaBusinessCAC(meta.businessCAC || "")
                setMetaGuildName(meta.guildName || "")
                setMetaCertNumber(meta.certificationNumber || "")
                setMetaWorkshopLocation(meta.workshopLocation || "")
            } else {
                toast.error("Member account profile not found")
                router.push('/copteller/admin/members')
            }
        } catch (e) {
            toast.error("Failed to load member profile details")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchMemberData()
    }, [id])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!member) return
        setSaving(true)
        const tId = toast.loading("Saving member updates...")

        const sector = coopProfile?.sector || 'transport'
        const updatedMeta: Record<string, any> = {}
        if (sector === 'transport') {
            updatedMeta.licenseNumber = metaLicenseNumber
            updatedMeta.vehicleReg = metaVehicleReg
            updatedMeta.vehicleType = metaVehicleType
            updatedMeta.chassisNumber = metaChassisNumber
        } else if (sector === 'agriculture') {
            updatedMeta.farmSize = Number(metaFarmSize)
            updatedMeta.cropType = metaCropType
            updatedMeta.farmLocation = metaFarmLocation
        } else if (sector === 'commerce') {
            updatedMeta.shopId = metaShopId
            updatedMeta.tradeType = metaTradeType
            updatedMeta.businessCAC = metaBusinessCAC
        } else if (sector === 'artisan') {
            updatedMeta.guildName = metaGuildName
            updatedMeta.certificationNumber = metaCertNumber
            updatedMeta.workshopLocation = metaWorkshopLocation
        }

        try {
            const res = await fetch('/api/copteller/admin/operators', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operator_id: member.id,
                    phone,
                    email,
                    address,
                    kycStatus: status === 'active' ? 'active' : 'inactive',
                    metadata: updatedMeta
                })
            })
            const data = await res.json()
            if (data.success) {
                toast.success("Profile saved successfully!", { id: tId })
                fetchMemberData()
            } else {
                throw new Error(data.error || "Update rejected")
            }
        } catch (err: any) {
            toast.error(err.message || "Network error while saving settings", { id: tId })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
                <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
                <p className="text-muted-foreground font-medium text-xs">Resolving member profile and transaction ledger...</p>
            </div>
        )
    }

    if (!member) return null

    const sector = coopProfile?.sector || 'transport'
    const memberWord = sector === 'transport' ? 'Driver' : sector === 'agriculture' ? 'Farmer' : sector === 'commerce' ? 'Trader' : 'Artisan'

    const fmt = (val: number) => `₦${(val / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            
            {/* Back Navigation Button */}
            <div className="flex items-center justify-between">
                <Button
                    onClick={() => router.push('/copteller/admin/members')}
                    variant="ghost"
                    className="h-9 px-3 text-xs font-bold text-muted-foreground hover:text-foreground gap-1.5"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Member Accounts
                </Button>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">ID: {member.id.slice(-6).toUpperCase()}</span>
                    <Badge className="text-[9px] uppercase font-bold bg-amber-500 text-black border-0">
                        {member.status}
                    </Badge>
                </div>
            </div>

            {/* Header Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 rounded-3xl p-4 sm:p-6 shadow-sm">
                <div className="flex gap-3 sm:gap-4 items-center min-w-0">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-500 flex items-center justify-center text-base sm:text-lg font-black text-black shrink-0">
                        {member.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-black text-foreground truncate">{member.fullName}</h1>
                        <p className="text-xs text-muted-foreground font-semibold mt-1">Cooperative: <span className="font-bold text-foreground">{coopProfile ? coopProfile.name : member.cooperative}</span> &bull; {memberWord} Account</p>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    <div className="bg-slate-100 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-right">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">SAVINGS WALLET</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{fmt(member.walletBalance)}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Sections split in 3 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Column 1 & 2: General settings profile edit */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSave} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-4 sm:p-6 space-y-5 shadow-sm">
                        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-900 pb-4">
                            <div>
                                <h3 className="text-sm font-black">Edit Member Profile Details</h3>
                                <p className="text-[10px] text-muted-foreground font-semibold">Change KYC status, contact information, and primary addresses.</p>
                            </div>
                            <User className="h-4 w-4 text-amber-500" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">First & Last Name</label>
                                <input
                                    type="text"
                                    disabled
                                    value={member.fullName}
                                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none opacity-60"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Phone Number</label>
                                <input
                                    type="text"
                                    required
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Residential/Office Address</label>
                                <input
                                    type="text"
                                    required
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">Account Status</label>
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value as any)}
                                    className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-amber-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="exited">Exited / Inactive</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase">KYC Level</label>
                                <select
                                    value={kycTier}
                                    onChange={e => setKycTier(e.target.value as any)}
                                    className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-amber-500"
                                >
                                    <option value="Tier 1">Tier 1 - Basic Registration</option>
                                    <option value="Tier 2">Tier 2 - Verified ID & Address</option>
                                    <option value="Tier 3">Tier 3 - Full CAC & Board Clear</option>
                                </select>
                            </div>
                        </div>

                        {/* Sector Credentials Block */}
                        <div className="border-t border-slate-100 dark:border-slate-900 pt-4 space-y-4">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Sector Specific Credentials</h4>
                            
                            {sector === 'transport' && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">License Number</label>
                                            <input type="text" value={metaLicenseNumber} onChange={e => setMetaLicenseNumber(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Vehicle Plate No.</label>
                                            <input type="text" value={metaVehicleReg} onChange={e => setMetaVehicleReg(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500 uppercase" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Vehicle Model</label>
                                            <select value={metaVehicleType} onChange={e => setMetaVehicleType(e.target.value)} className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-amber-500">
                                                <option value="TVS King">TVS King (Tricycle)</option>
                                                <option value="Bajaj">Bajaj (Tricycle)</option>
                                                <option value="Haojin">Haojin (Motorcycle)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Chassis Number</label>
                                            <input type="text" value={metaChassisNumber} onChange={e => setMetaChassisNumber(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-mono focus:outline-none focus:border-amber-500" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {sector === 'agriculture' && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Farm Size (Hectares)</label>
                                            <input type="number" value={metaFarmSize} onChange={e => setMetaFarmSize(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Primary Crop / Sector</label>
                                            <input type="text" value={metaCropType} onChange={e => setMetaCropType(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Farm Community Location</label>
                                        <input type="text" value={metaFarmLocation} onChange={e => setMetaFarmLocation(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                    </div>
                                </>
                            )}

                            {sector === 'commerce' && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Ariaria Stall / Shop ID</label>
                                            <input type="text" value={metaShopId} onChange={e => setMetaShopId(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Trade Goods Classification</label>
                                            <input type="text" value={metaTradeType} onChange={e => setMetaTradeType(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Registered Business CAC No.</label>
                                        <input type="text" value={metaBusinessCAC} onChange={e => setMetaBusinessCAC(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500 uppercase" />
                                    </div>
                                </>
                            )}

                            {sector === 'artisan' && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Guild / Association Name</label>
                                            <input type="text" value={metaGuildName} onChange={e => setMetaGuildName(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Certification ID</label>
                                            <input type="text" value={metaCertNumber} onChange={e => setMetaCertNumber(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Workshop Location</label>
                                        <input type="text" value={metaWorkshopLocation} onChange={e => setMetaWorkshopLocation(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-amber-500" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                            <Button type="button" onClick={() => router.push('/copteller/admin/members')} variant="outline" className="w-full sm:flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                            <Button type="submit" disabled={saving} className="w-full sm:flex-1 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs h-10 rounded-xl border-0 shadow-lg">
                                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1 text-black" /> : null} Save Updates
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Column 3: Member specs checklist */}
                <div className="space-y-6">

                    {/* Member financial health metrics card */}
                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-5 space-y-4 shadow-sm font-sans">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Financial Health</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                                <p className="text-[8px] font-black text-muted-foreground uppercase">CREDIT SCORE</p>
                                <p className="text-sm font-black mt-1 text-amber-500">{member.creditScore}/850</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                                <p className="text-[8px] font-black text-muted-foreground uppercase">ARREARS DEBTS</p>
                                <p className="text-sm font-black mt-1 text-rose-500">{member.duesArrears > 0 ? fmt(member.duesArrears) : 'None'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sector Credentials Card */}
                    {member.metadata && Object.keys(member.metadata).length > 0 && (
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 space-y-4 shadow-sm font-sans text-xs">
                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Sector KYC Registry</p>
                            <div className="space-y-3.5 font-semibold">
                                {sector === 'transport' && (
                                    <>
                                        <div className="flex justify-between"><span className="text-muted-foreground">License Number</span><span className="font-mono text-slate-700 dark:text-slate-350">{member.metadata.licenseNumber || "N/A"}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Reg No.</span><span className="font-bold text-slate-700 dark:text-slate-350 uppercase">{member.metadata.vehicleReg || "N/A"}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Type</span><span className="font-bold text-slate-750 dark:text-slate-300">{member.metadata.vehicleType || "N/A"}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Chassis Number</span><span className="font-mono text-slate-700 dark:text-slate-355">{member.metadata.chassisNumber || "N/A"}</span></div>
                                    </>
                                )}
                                {sector === 'agriculture' && (
                                    <>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Farm Size (ha)</span><span className="font-bold text-slate-700 dark:text-slate-350">{member.metadata.farmSize ? `${member.metadata.farmSize} Hectares` : "N/A"}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Primary Crops</span><span className="font-bold text-slate-700 dark:text-slate-300">{member.metadata.cropType || "N/A"}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">LGA Location</span><span className="font-bold text-slate-700 dark:text-slate-355">{member.metadata.farmLocation || "N/A"}</span></div>
                                    </>
                                )}
                                {sector === 'commerce' && (
                                    <>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Ariaria Stall ID</span><span className="font-mono text-slate-700 dark:text-slate-350">{member.metadata.shopId || "N/A"}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Goods Categories</span><span className="font-bold text-slate-700 dark:text-slate-300">{member.metadata.tradeType || "N/A"}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">CAC Business No.</span><span className="font-mono text-slate-700 dark:text-slate-355 uppercase">{member.metadata.businessCAC || "N/A"}</span></div>
                                    </>
                                )}
                                {sector === 'artisan' && (
                                    <>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Artisan Guild</span><span className="font-bold text-slate-700 dark:text-slate-355">{member.metadata.guildName || "N/A"}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Certification ID</span><span className="font-mono text-slate-700 dark:text-slate-300">{member.metadata.certificationNumber || "N/A"}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Workshop Address</span><span className="font-bold text-slate-700 dark:text-slate-355">{member.metadata.workshopLocation || "N/A"}</span></div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* System Parameters Checklist */}
                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 space-y-4 shadow-sm font-sans text-xs">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">System Parameters</p>
                        <div className="space-y-3.5 font-semibold">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Account Number</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">{member.accountNumber || '1092810920'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">BVN Status</span>
                                <span className="text-emerald-500 font-bold">VERIFIED</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Esusu (Ajo) Scheme</span>
                                <span className="text-emerald-500 font-bold">{member.ajoActive ? 'ACTIVE' : 'INACTIVE'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Lease (HP) Active</span>
                                <span className="text-slate-500 font-bold">{member.hpActive ? 'YES' : 'NO'}</span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    )
}
