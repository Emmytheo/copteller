"use client"

import * as React from "react"
import {
    ShieldCheck, ShieldAlert, Lock, Unlock, Copy, Check, RefreshCw,
    Upload, Sparkles, ArrowUpCircle, FlaskConical, Landmark, Loader2, Clock, Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export interface OlivePaySubWalletState {
    id: string
    holderReference: string
    virtualAccountNumber: string | null
    virtualAccountName: string | null
    bankName: string
    status: string
    canPayout: boolean
    tier: number
    tierLimits: {
        single_debit?: number | null
        single_deposit?: number | null
        daily_debit?: number | null
        max_balance?: number | null
    }
    availableBalanceNaira: number
    lienBalanceNaira: number
    ledgerBalanceNaira: number
    availableTodayNaira: number
    isTierLocked: boolean
    isAdminFrozen: boolean
    bvnVerified: boolean
    ninVerified: boolean
    pendingTierUpgrade: any | null
    lastSyncedAt: string | null
}

export interface OlivePayHoldItem {
    id: string
    reference: string
    amountNaira: number
    capturedAmountNaira: number
    status: string
    reason: string
    entityType: string | null
    entityId: string | null
    createdAt: string
}

interface Props {
    subwallet: OlivePaySubWalletState | null
    holds: OlivePayHoldItem[]
    railMode: string
    loading?: boolean
    onRefresh: (syncRemote?: boolean) => Promise<void>
}

const fmt = (n: number | null | undefined) =>
    n === null || n === undefined ? "Unlimited" : `₦${Number(n).toLocaleString()}`

export function OlivePayWalletPanel({ subwallet, holds, railMode, loading, onRefresh }: Props) {
    const [activeSection, setActiveSection] = React.useState<'overview' | 'kyc' | 'escrow'>('overview')
    const [copiedVa, setCopiedVa] = React.useState(false)
    const [syncing, setSyncing] = React.useState(false)
    const [simulatingInflow, setSimulatingInflow] = React.useState(false)

    // Tier Upgrade state
    const [nin, setNin] = React.useState("")
    const [address, setAddress] = React.useState("")
    const [upgrading, setUpgrading] = React.useState(false)
    const [tier3RequestId, setTier3RequestId] = React.useState("")
    const [docType, setDocType] = React.useState<"proof_of_address" | "source_of_funds" | "government_id" | "selfie">("proof_of_address")
    const [docFile, setDocFile] = React.useState<File | null>(null)
    const [uploadingDoc, setUploadingDoc] = React.useState(false)

    // Escrow Hold state
    const [holdAmt, setHoldAmt] = React.useState(2500)
    const [holdReason, setHoldReason] = React.useState("Cooperative Ajo / Loan Escrow Lock")
    const [holdBusy, setHoldBusy] = React.useState(false)

    React.useEffect(() => {
        if (subwallet?.pendingTierUpgrade?.request_id && !tier3RequestId) {
            setTier3RequestId(String(subwallet.pendingTierUpgrade.request_id))
        }
    }, [subwallet, tier3RequestId])

    const isSandbox = railMode === 'sandbox_simulator'

    const handleCopyVa = () => {
        if (!subwallet?.virtualAccountNumber) return
        navigator.clipboard.writeText(subwallet.virtualAccountNumber)
        setCopiedVa(true)
        toast.success("Dedicated Virtual Account copied!")
        setTimeout(() => setCopiedVa(false), 1800)
    }

    const handleSync = async () => {
        setSyncing(true)
        try {
            await onRefresh(true)
            toast.success("SubWallet balances & KYC limits synced")
        } finally {
            setSyncing(false)
        }
    }

    const handleSimulateInflow = async () => {
        if (!subwallet) return
        setSimulatingInflow(true)
        const tId = toast.loading("Dispatching HMAC-SHA256 signed bank inflow webhook...")
        try {
            const res = await fetch('/api/copteller/olivepay/sandbox/simulate-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'subwallet.credited',
                    amount: 15000,
                    subWalletId: subwallet.id,
                    virtualAccountNumber: subwallet.virtualAccountNumber,
                    senderName: 'SANDBOX GTB INWARD TRANSFER',
                    senderBank: 'GTBank (Sandbox NIP)',
                }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                toast.error(data.error || "Simulation failed", { id: tId })
                return
            }
            toast.success("Signed webhook verified! +₦15,000 credited to wallet.", { id: tId })
            await onRefresh(true)
        } catch (err: any) {
            toast.error(err.message || "Simulation failed", { id: tId })
        } finally {
            setSimulatingInflow(false)
        }
    }

    const handleUpgradeTier2 = async (e: React.FormEvent) => {
        e.preventDefault()
        const cleanNin = nin.replace(/\D/g, '')
        if (cleanNin.length !== 11) {
            toast.error("Enter a valid 11-digit NIN for instant Tier 2 upgrade")
            return
        }
        setUpgrading(true)
        const tId = toast.loading("Verifying NIN and upgrading SubWallet to Tier 2...")
        try {
            const res = await fetch('/api/copteller/olivepay/tier-upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetTier: 2, nin: cleanNin }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                toast.error(data.error || "Tier 2 upgrade failed", { id: tId })
                return
            }
            toast.success(data.message || "Upgraded to Tier 2! Higher daily limits unlocked.", { id: tId })
            setNin("")
            await onRefresh(true)
        } catch (err: any) {
            toast.error(err.message || "Upgrade error", { id: tId })
        } finally {
            setUpgrading(false)
        }
    }

    const handleInitiateTier3 = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!address.trim()) {
            toast.error("Please enter your verified residential address")
            return
        }
        setUpgrading(true)
        const tId = toast.loading("Initiating Tier 3 unlimited account upgrade...")
        try {
            const res = await fetch('/api/copteller/olivepay/tier-upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetTier: 3, address: address.trim() }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                toast.error(data.error || "Tier 3 initiation failed", { id: tId })
                return
            }
            const reqId = data.upgrade?.request_id || data.upgrade?.requestId || data.upgrade?.id
            if (reqId) setTier3RequestId(String(reqId))
            toast.success(data.message || "Tier 3 request opened! Upload supporting documents below.", { id: tId })
            await onRefresh(true)
        } catch (err: any) {
            toast.error(err.message || "Tier 3 error", { id: tId })
        } finally {
            setUpgrading(false)
        }
    }

    const handleUploadTier3Doc = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tier3RequestId || !docFile) {
            toast.error("Provide a Tier 3 Request ID and select a file (<= 10MB)")
            return
        }
        setUploadingDoc(true)
        const tId = toast.loading(`Uploading ${docType.replace(/_/g, ' ')}...`)
        try {
            const form = new FormData()
            form.append('requestId', tier3RequestId)
            form.append('documentType', docType)
            form.append('file', docFile)
            const res = await fetch('/api/copteller/olivepay/tier-upgrade/documents', {
                method: 'POST',
                body: form,
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                toast.error(data.error || "Document upload failed", { id: tId })
                return
            }
            toast.success(data.message || "KYC document uploaded!", { id: tId })
            setDocFile(null)
            await onRefresh(true)
        } catch (err: any) {
            toast.error(err.message || "Upload failed", { id: tId })
        } finally {
            setUploadingDoc(false)
        }
    }

    const handlePlaceHold = async (e: React.FormEvent) => {
        e.preventDefault()
        setHoldBusy(true)
        const tId = toast.loading("Placing OlivePay Escrow Hold...")
        try {
            const res = await fetch('/api/copteller/olivepay/holds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'place',
                    amount: holdAmt,
                    reason: holdReason,
                    entityType: 'wallet_escrow',
                }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                toast.error(data.error || "Failed to place hold", { id: tId })
                return
            }
            toast.success(`Locked ${fmt(holdAmt)} in Escrow Hold!`, { id: tId })
            await onRefresh(true)
        } catch (err: any) {
            toast.error(err.message || "Hold error", { id: tId })
        } finally {
            setHoldBusy(false)
        }
    }

    const handleReleaseHold = async (holdId: string) => {
        setHoldBusy(true)
        const tId = toast.loading("Releasing Escrow Hold back to available balance...")
        try {
            const res = await fetch('/api/copteller/olivepay/holds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'release', holdId, reason: 'Released by member' }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                toast.error(data.error || "Failed to release hold", { id: tId })
                return
            }
            toast.success("Escrow Hold released!", { id: tId })
            await onRefresh(true)
        } catch (err: any) {
            toast.error(err.message || "Release error", { id: tId })
        } finally {
            setHoldBusy(false)
        }
    }

    if (loading && !subwallet) {
        return (
            <div className="bg-card border border-border rounded-3xl p-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading OlivePay SubWallet &amp; Compliance Rail...
            </div>
        )
    }

    if (!subwallet) return null

    const activeHolds = holds.filter(h => String(h.status).toUpperCase() === 'ACTIVE')

    return (
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            {/* Header & Active Rail Pill */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                            <Landmark className="w-4 h-4 text-emerald-500" />
                            OlivePay SubWallet &amp; Compliance Hub
                        </h3>
                        {isSandbox ? (
                            <Badge variant="outline" className="text-[9px] font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                <FlaskConical className="w-3 h-3 mr-1" /> Internal Sandbox Testing Rail
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                <ShieldCheck className="w-3 h-3 mr-1" /> OlivePay Settlement Rail
                            </Badge>
                        )}
                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-primary/10 text-primary border-primary/25">
                            KYC TIER {subwallet.tier}
                        </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        Dedicated Static NUBAN, CBN KYC Tier Limits, and real-time Escrow Lien management.
                    </p>
                </div>

                <div className="flex items-center gap-1.5">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSync}
                        disabled={syncing}
                        className="h-8 px-3 rounded-xl text-[11px] font-bold gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                        Sync
                    </Button>
                </div>
            </div>

            {/* Tier-Lock / Admin-Freeze Warning */}
            {(subwallet.isTierLocked || subwallet.isAdminFrozen) && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-black text-red-600 dark:text-red-400">
                                {subwallet.isAdminFrozen ? 'SubWallet Frozen by Compliance' : `Tier ${subwallet.tier} Balance Limit Reached (Tier-Locked)`}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {subwallet.isAdminFrozen
                                    ? 'Outbound debits are temporarily restricted. Contact cooperative support.'
                                    : 'Upgrade your KYC Tier to lift your balance cap and automatically unlock outbound payouts.'}
                            </p>
                        </div>
                    </div>
                    {subwallet.isTierLocked && (
                        <Button
                            size="sm"
                            onClick={() => setActiveSection('kyc')}
                            className="h-8 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black shrink-0"
                        >
                            Upgrade Now
                        </Button>
                    )}
                </div>
            )}

            {/* Sub-Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl w-fit">
                {(['overview', 'kyc', 'escrow'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveSection(tab)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all capitalize ${
                            activeSection === tab
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab === 'overview' && 'Dedicated NUBAN & Limits'}
                        {tab === 'kyc' && `KYC Tier ${subwallet.tier} Upgrade`}
                        {tab === 'escrow' && `Escrow Holds (${activeHolds.length})`}
                    </button>
                ))}
            </div>

            {/* TAB 1: OVERVIEW (STATIC VA + LIVE BALANCES + LIMITS) */}
            {activeSection === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Dedicated Static Virtual Account */}
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                Permanent Static Virtual Account
                            </span>
                            <Badge variant="outline" className="text-[9px] font-bold">
                                {subwallet.bankName}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="font-mono text-lg font-black tracking-wider text-foreground">
                                    {subwallet.virtualAccountNumber || 'Provisioning...'}
                                </p>
                                <p className="text-[10px] font-semibold text-muted-foreground truncate">
                                    {subwallet.virtualAccountName || subwallet.holderReference}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCopyVa}
                                className="h-8 px-2.5 rounded-xl text-[10px] font-bold gap-1 shrink-0"
                            >
                                {copiedVa ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                Copy
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Transfer from any Nigerian bank app into this account number for automatic real-time wallet crediting via signed webhooks.
                        </p>
                        {isSandbox && (
                            <Button
                                size="sm"
                                onClick={handleSimulateInflow}
                                disabled={simulatingInflow}
                                className="w-full h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-[11px] gap-1.5"
                            >
                                {simulatingInflow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                Sandbox: Simulate ₦15,000 Inward Bank Transfer
                            </Button>
                        )}
                    </div>

                    {/* Tier Limits & Spendable Breakdown */}
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                CBN Tier {subwallet.tier} Limits &amp; Lien
                            </span>
                            <div className="flex items-center gap-1">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${subwallet.bvnVerified ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                                    BVN {subwallet.bvnVerified ? '✓' : '—'}
                                </span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${subwallet.ninVerified ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                                    NIN {subwallet.ninVerified ? '✓' : '—'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-background border border-border/60">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground block">Single Tx Cap</span>
                                <span className="font-mono font-black text-foreground">{fmt(subwallet.tierLimits?.single_debit ?? subwallet.tierLimits?.single_deposit)}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-background border border-border/60">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground block">Daily Debit Cap</span>
                                <span className="font-mono font-black text-foreground">{fmt(subwallet.tierLimits?.daily_debit)}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-background border border-border/60">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground block">Max Balance Cap</span>
                                <span className="font-mono font-black text-foreground">{fmt(subwallet.tierLimits?.max_balance)}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-background border border-border/60">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground block">Escrow Lien Locked</span>
                                <span className="font-mono font-black text-amber-600 dark:text-amber-400">{fmt(subwallet.lienBalanceNaira)}</span>
                            </div>
                        </div>

                        {subwallet.tier < 3 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveSection('kyc')}
                                className="w-full h-8 rounded-xl text-[11px] font-black gap-1.5"
                            >
                                <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500" />
                                Upgrade to Tier {subwallet.tier + 1} for Higher Limits
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: KYC TIER UPGRADE */}
            {activeSection === 'kyc' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tier 2 Instant NIN Upgrade */}
                    <form onSubmit={handleUpgradeTier2} className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-foreground">Tier 2 &bull; Instant NIN Verification</h4>
                            <Badge variant="outline" className="text-[9px] font-bold">
                                {subwallet.tier >= 2 ? 'Completed ✓' : '₦200k Daily'}
                            </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Unlocks ₦100,000 single debit, ₦200,000 daily debit, and ₦500,000 max balance synchronously.
                        </p>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">11-Digit NIN</label>
                            <input
                                type="text"
                                maxLength={11}
                                placeholder="e.g. 12345678901"
                                value={nin}
                                onChange={e => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                disabled={subwallet.tier >= 2 || upgrading}
                                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono font-bold"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={subwallet.tier >= 2 || upgrading}
                            className="w-full h-9 rounded-xl font-black text-xs"
                        >
                            {subwallet.tier >= 2 ? 'Tier 2 Active' : upgrading ? 'Verifying...' : 'Upgrade to Tier 2 Instantly'}
                        </Button>
                    </form>

                    {/* Tier 3 Unlimited + Document Upload */}
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-foreground">Tier 3 &bull; Unlimited Balance</h4>
                            <Badge variant="outline" className="text-[9px] font-bold">
                                {subwallet.tier >= 3 ? 'Completed ✓' : '₦5M Daily'}
                            </Badge>
                        </div>

                        <form onSubmit={handleInitiateTier3} className="space-y-2.5">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Residential Address</label>
                                <input
                                    type="text"
                                    placeholder="No. 14 Azikiwe Road, Aba, Abia State"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    disabled={subwallet.tier >= 3 || upgrading}
                                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs"
                                />
                            </div>
                            <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                disabled={subwallet.tier >= 3 || upgrading}
                                className="w-full h-8 rounded-xl font-black text-[11px]"
                            >
                                {subwallet.tier >= 3 ? 'Tier 3 Active' : '1. Open Tier 3 Request'}
                            </Button>
                        </form>

                        {subwallet.tier < 3 && (
                            <form onSubmit={handleUploadTier3Doc} className="pt-2 border-t border-border/60 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Request ID"
                                        value={tier3RequestId}
                                        onChange={e => setTier3RequestId(e.target.value)}
                                        className="h-8 px-2.5 rounded-lg border border-border bg-background text-[11px] font-mono"
                                    />
                                    <select
                                        value={docType}
                                        onChange={e => setDocType(e.target.value as any)}
                                        className="h-8 px-2 rounded-lg border border-border bg-background text-[11px] font-semibold"
                                    >
                                        <option value="proof_of_address">Proof of Address</option>
                                        <option value="government_id">Government ID</option>
                                        <option value="source_of_funds">Source of Funds</option>
                                        <option value="selfie">Selfie</option>
                                    </select>
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={e => setDocFile(e.target.files?.[0] || null)}
                                    className="w-full text-[11px] text-muted-foreground file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-primary/10 file:text-primary"
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={uploadingDoc || !tier3RequestId || !docFile}
                                    className="w-full h-8 rounded-xl font-black text-[11px] gap-1.5"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    {uploadingDoc ? 'Uploading...' : '2. Upload KYC Document (<=10MB)'}
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: ESCROW HOLDS */}
            {activeSection === 'escrow' && (
                <div className="space-y-4">
                    <form onSubmit={handlePlaceHold} className="p-4 rounded-2xl bg-muted/40 border border-border/70 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Hold Amount (₦)</label>
                            <input
                                type="number"
                                min={100}
                                value={holdAmt}
                                onChange={e => setHoldAmt(Number(e.target.value))}
                                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-mono font-bold"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Escrow Reason</label>
                            <input
                                type="text"
                                value={holdReason}
                                onChange={e => setHoldReason(e.target.value)}
                                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs"
                            />
                        </div>
                        <Button type="submit" size="sm" disabled={holdBusy} className="h-9 rounded-xl font-black text-xs gap-1">
                            <Lock className="w-3.5 h-3.5" /> Place Hold
                        </Button>
                    </form>

                    <div className="space-y-2">
                        {holds.length === 0 ? (
                            <p className="text-center py-6 text-xs text-muted-foreground">
                                No active or historical Escrow Holds on this SubWallet.
                            </p>
                        ) : (
                            holds.map(h => {
                                const isActive = String(h.status).toUpperCase() === 'ACTIVE'
                                return (
                                    <div key={h.id} className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-foreground truncate">{h.reason}</p>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[9px] font-black uppercase ${
                                                        isActive
                                                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {h.status}
                                                </Badge>
                                            </div>
                                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">
                                                {h.reference} &bull; <Clock className="w-2.5 h-2.5 inline" /> {new Date(h.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2.5 shrink-0">
                                            <span className="font-mono text-xs font-black text-foreground">{fmt(h.amountNaira)}</span>
                                            {isActive && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={holdBusy}
                                                    onClick={() => handleReleaseHold(h.id)}
                                                    className="h-7 px-2.5 rounded-lg text-[10px] font-black gap-1"
                                                >
                                                    <Unlock className="w-3 h-3 text-emerald-500" /> Release
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
