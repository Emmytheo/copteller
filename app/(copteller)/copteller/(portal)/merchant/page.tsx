"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Briefcase, TrendingUp, Calendar, ArrowRight,
    CheckCircle, Loader2, Play, Building2, DollarSign,
    PlusCircle, UserCheck, Info, Globe, Code,
    Activity, X, FileText, Percent, KeyRound, Settings
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface MerchantProfile {
    id: string
    business_name: string
    ownerName: string
    email: string
    settlement_account: string
    webhook_url: string
    api_prefix: string
    is_verified: boolean
    successRate: number
    volumeKobo: number // In kobo
    feePercent: number
}

interface CheckoutTransaction {
    id: string
    business_name: string
    payerEmail: string
    amount: number // In kobo
    status: 'successful' | 'pending' | 'failed'
    timestamp: string
}

export default function CoptellerMerchantPage() {
    const [merchants, setMerchants] = React.useState<MerchantProfile[]>([])
    const [checkouts, setCheckouts] = React.useState<CheckoutTransaction[]>([])
    const [loading, setLoading] = React.useState(true)

    // Side-panel layout configuration: 'details' | 'form' | 'fee-edit' | 'none'
    const [panelMode, setPanelMode] = React.useState<'details' | 'form' | 'fee-edit' | 'none'>('none')
    const [selectedMerchant, setSelectedMerchant] = React.useState<MerchantProfile | null>(null)
    const [newFee, setNewFee] = React.useState("1.5")

    // Form fields
    const [newBusinessName, setNewBusinessName] = React.useState("")
    const [newOwnerName, setNewOwnerName] = React.useState("")
    const [newEmail, setNewEmail] = React.useState("")
    const [newSettlementAccount, setNewSettlementAccount] = React.useState("")
    const [newWebhookUrl, setNewWebhookUrl] = React.useState("")
    const [submittingMerchant, setSubmittingMerchant] = React.useState(false)

    const handleCreateMerchant = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newBusinessName || !newOwnerName) return
        setSubmittingMerchant(true)
        try {
            const newProfile: MerchantProfile = {
                id: `merch_${Date.now()}`,
                business_name: newBusinessName,
                ownerName: newOwnerName,
                email: newEmail || 'business@copteller.com',
                settlement_account: newSettlementAccount || '0092819209 (Primary)',
                webhook_url: newWebhookUrl || 'https://example.com/webhook',
                api_prefix: 'pk_live_pending',
                is_verified: false,
                successRate: 0,
                volumeKobo: 0,
                feePercent: 1.5
            }
            setMerchants(prev => [newProfile, ...prev])
            setSelectedMerchant(newProfile)
            setPanelMode('details')
            toast.success("Artisan gateway profile registered successfully!")
            setNewBusinessName("")
            setNewOwnerName("")
            setNewEmail("")
            setNewSettlementAccount("")
            setNewWebhookUrl("")
        } catch (err) {
            toast.error("Failed to create profile")
        } finally {
            setSubmittingMerchant(false)
        }
    }

    React.useEffect(() => {
        const loadMerchantData = async () => {
            try {
                let fetchedMerchants: MerchantProfile[] = []
                let fetchedCheckouts: CheckoutTransaction[] = []

                try {
                    const res = await fetch('/api/copteller/merchant')
                    if (res.ok) {
                        const data = await res.json()
                        if (data.merchants?.length > 0) fetchedMerchants = data.merchants
                        if (data.checkouts?.length > 0) fetchedCheckouts = data.checkouts
                    }
                } catch (e) {
                    console.warn('[Copteller Merchant] Failed to load from /api/copteller/merchant', e)
                }

                // Demo fallbacks if no database rows exist yet
                if (fetchedMerchants.length === 0) {
                    fetchedMerchants = [
                        { id: '1', business_name: 'Aba Leathercraft Hub', ownerName: 'Chidi Ebere', email: 'chidi@abaleather.ng', settlement_account: '0092819209 (Primary)', webhook_url: 'https://api.abaleather.ng/webhooks/pay', api_prefix: 'pk_live_0001...', is_verified: true, successRate: 99.1, volumeKobo: 250000000, feePercent: 1.5 },
                        { id: '2', business_name: 'AgroMart Logistics Aba', ownerName: 'Amadi Kalu', email: 'amadi@agromart.com', settlement_account: '0055102910 (Settlement)', webhook_url: 'https://agromart.com/webhooks/copteller', api_prefix: 'pk_live_0002...', is_verified: true, successRate: 98.4, volumeKobo: 120000000, feePercent: 1.2 },
                        { id: '3', business_name: 'Aba Tailors Cooperative', ownerName: 'Ngozi Okoye', email: 'ngozi@tailors.coop', settlement_account: '0032910281 (Settlement)', webhook_url: 'https://example.com/payment-webhook', api_prefix: 'pk_live_suspended', is_verified: false, successRate: 0, volumeKobo: 0, feePercent: 1.5 }
                    ]
                }
                if (fetchedCheckouts.length === 0) {
                    fetchedCheckouts = [
                        { id: 'chk_101', business_name: 'Aba Leathercraft Hub', payerEmail: 'buyer.leather@gmail.com', amount: 4500000, status: 'successful', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
                        { id: 'chk_102', business_name: 'AgroMart Logistics Aba', payerEmail: 'agromart.logistics@outlook.com', amount: 12500000, status: 'successful', timestamp: new Date(Date.now() - 3600000).toISOString() },
                        { id: 'chk_103', business_name: 'Aba Leathercraft Hub', payerEmail: 'musa.k@yahoo.com', amount: 2000000, status: 'pending', timestamp: new Date(Date.now() - 1200000).toISOString() }
                    ]
                }

                setMerchants(fetchedMerchants)
                setCheckouts(fetchedCheckouts)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        loadMerchantData()
    }, [])

    const handleVerifyToggle = async (id: string) => {
        const target = merchants.find(m => m.id === id)
        if (!target) return
        const nextStatus = !target.is_verified

        setMerchants(prev => prev.map(m => {
            if (m.id === id) {
                const updated = {
                    ...m,
                    is_verified: nextStatus,
                    api_prefix: nextStatus ? `pk_live_${String(id).padStart(4, '0')}...` : 'pk_live_suspended'
                }
                if (selectedMerchant?.id === id) setSelectedMerchant(updated)
                return updated
            }
            return m
        }))

        try {
            await fetch('/api/copteller/merchant', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_verify', merchantId: id, isVerified: nextStatus })
            })
            toast.success(`Merchant "${target.business_name}" status updated to: ${nextStatus ? 'Active' : 'Suspended'}`)
        } catch {
            toast.error("Failed to persist status change")
        }
    }

    const handleUpdateFee = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedMerchant) return
        const tId = toast.loading("Updating merchant processing fee in database...")
        try {
            const res = await fetch('/api/copteller/merchant', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_fee', merchantId: selectedMerchant.id, feePercent: Number(newFee) })
            })
            if (!res.ok) throw new Error('Failed to update fee')
            setMerchants(prev => prev.map(m => m.id === selectedMerchant.id ? { ...m, feePercent: Number(newFee) } : m))
            setSelectedMerchant(prev => prev ? { ...prev, feePercent: Number(newFee) } : null)
            toast.success("Merchant processing fee updated and audit log recorded.", { id: tId })
            setPanelMode('details')
        } catch (err: any) {
            toast.error(err.message || 'Error updating fee', { id: tId })
        }
    }

    const handleApproveSettlement = async (id: string) => {
        const tId = toast.loading("Reconciling and clearing settlement to merchant vault...")
        try {
            const res = await fetch('/api/copteller/merchant', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve_settlement', checkoutId: id })
            })
            if (!res.ok) throw new Error('Settlement clearance failed')
            setCheckouts(prev => prev.map(c => c.id === id ? { ...c, status: 'successful' } : c))
            toast.success("Settlement approved, vault credited, and ledger clearance verified!", { id: tId })
        } catch (err: any) {
            toast.error(err.message || 'Error clearing settlement', { id: tId })
        }
    }

    const totalMerchants = merchants.length
    const verifiedMerchants = merchants.filter(m => m.is_verified).length
    const aggVolumeKobo = merchants.reduce((acc, curr) => acc + curr.volumeKobo, 0)

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                <p className="text-muted-foreground font-medium text-sm">Synchronizing merchant profiles...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-12 max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Settlements</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Artisan Payment Gateway</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold max-w-2xl">Audit merchant checkouts, verify cooperative trade portals, and inspect live settlement webhooks.</p>
                </div>
                <div>
                    <Button
                        onClick={() => setPanelMode('form')}
                        className="w-full sm:w-auto h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black text-xs border-0 shadow-lg flex items-center justify-center gap-2 shrink-0"
                    >
                        <PlusCircle className="h-4 w-4" /> Register Merchant Gateway
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {[
                    { label: "Active Gateways", val: `${verifiedMerchants} / ${totalMerchants}`, icon: Globe, color: "emerald" },
                    { label: "Aggregate Volume", val: `₦${(aggVolumeKobo / 100).toLocaleString()}`, icon: DollarSign, color: "emerald" },
                    { label: "Clearing SLA", val: "99.5%", icon: Percent, color: "amber" },
                    { label: "Webhook Events", val: `${checkouts.length} Pinged`, icon: Code, color: "amber" }
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-900 shadow-sm">
                        <div className="flex justify-between items-start mb-3 sm:mb-4">
                            <div className={`p-2 rounded-xl ${s.color === 'amber' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                <s.icon className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                        <p className="text-xl sm:text-2xl font-black mt-1 text-foreground truncate">{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Side (Directory list + Transactions activity) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Directory table */}
                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                        <div>
                            <h2 className="text-sm font-black flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-emerald-500" /> Artisan Business Directory
                            </h2>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Verified trade profiles and API gateway parameters.</p>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm">
                            <table className="w-full min-w-[500px] text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-5 py-4">Artisan Enterprise</th>
                                        <th className="px-5 py-4">Settlement Vault</th>
                                        <th className="px-5 py-4">Fee Split</th>
                                        <th className="px-5 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                    {merchants.map(m => (
                                        <tr
                                            key={m.id}
                                            onClick={() => {
                                                setSelectedMerchant(m)
                                                setNewFee(m.feePercent.toString())
                                                setPanelMode('details')
                                            }}
                                            className={`cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${selectedMerchant?.id === m.id ? "bg-emerald-50/50 dark:bg-emerald-950/20 font-bold" : ""}`}
                                        >
                                            <td className="px-5 py-4">
                                                <div>
                                                    <p className="font-extrabold text-foreground">{m.business_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-semibold">{m.ownerName} &bull; {m.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-mono font-bold text-slate-400">{m.settlement_account}</td>
                                            <td className="px-5 py-4 font-black text-emerald-600">{m.feePercent}%</td>
                                            <td className="px-5 py-4">
                                                <Badge variant={m.is_verified ? 'default' : 'secondary'} className="text-[9px] uppercase font-black">
                                                    {m.is_verified ? 'Verified' : 'Pending'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Webhooks settlements activity */}
                    <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                        <div>
                            <h2 className="text-sm font-black flex items-center gap-2">
                                <Activity className="h-5 w-5 text-amber-500" /> Recent Webhook Checkouts
                            </h2>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Approve pending merchant settlements.</p>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm">
                            <table className="w-full min-w-[580px] text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-5 py-4">Transaction ID</th>
                                        <th className="px-5 py-4">Merchant Enterprise</th>
                                        <th className="px-5 py-4">Payer / Customer</th>
                                        <th className="px-5 py-4">Volume (₦)</th>
                                        <th className="px-5 py-4">Status</th>
                                        <th className="px-5 py-4 text-right">Settlement Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-medium">
                                    {checkouts.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="px-5 py-4 font-mono font-bold text-slate-400">{c.id}</td>
                                            <td className="px-5 py-4 font-extrabold text-foreground">{c.business_name}</td>
                                            <td className="px-5 py-4 text-slate-400">{c.payerEmail}</td>
                                            <td className="px-5 py-4 font-black text-amber-600 dark:text-amber-400">₦{(c.amount / 100).toLocaleString()}</td>
                                            <td className="px-5 py-4">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${c.status === 'successful' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : c.status === 'failed' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {c.status === 'pending' ? (
                                                    <Button
                                                        onClick={() => handleApproveSettlement(c.id)}
                                                        size="sm"
                                                        className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[10px] h-8 rounded-lg"
                                                    >
                                                        Approve Settlement
                                                    </Button>
                                                ) : (
                                                    <span className="text-slate-400 text-[10px] font-bold">Cleared</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Right Side Panel */}
                <div className="space-y-4">
                    <AnimatePresence mode="wait">
                        {panelMode === 'details' && selectedMerchant && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-6"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[9px] font-black text-emerald-650 uppercase tracking-widest">Gateway Profile</span>
                                        <h3 className="text-base font-black mt-1 leading-snug">{selectedMerchant.business_name}</h3>
                                    </div>
                                    <button onClick={() => setPanelMode('none')} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="space-y-3 text-xs border-y py-4 border-slate-100 dark:border-slate-800 font-semibold">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Owner</span>
                                        <span className="text-right">{selectedMerchant.ownerName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Contact Email</span>
                                        <span className="text-muted-foreground text-right truncate max-w-[180px]">{selectedMerchant.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Settlement account</span>
                                        <span className="font-mono text-muted-foreground text-right">{selectedMerchant.settlement_account}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Split fee percent</span>
                                        <span className="font-black text-emerald-600">{selectedMerchant.feePercent}% per trx</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">API Token key prefix</span>
                                        <code className="font-mono font-bold">{selectedMerchant.api_prefix}</code>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Live Webhook URL</p>
                                    <p className="text-xs font-mono font-bold bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-slate-400 break-all border">{selectedMerchant.webhook_url}</p>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <Button onClick={() => setPanelMode('fee-edit')} className="w-full h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-xs gap-2">
                                        <Settings className="h-4 w-4" /> Edit Split Fees
                                    </Button>
                                    <Button
                                        onClick={() => handleVerifyToggle(selectedMerchant.id)}
                                        variant="outline"
                                        className="w-full h-10 rounded-xl border-slate-200 hover:bg-slate-50 font-black text-xs gap-2"
                                    >
                                        {selectedMerchant.is_verified ? "Deactivate Gateway" : "Verify trade portal"}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {panelMode === 'fee-edit' && selectedMerchant && (
                            <motion.div
                                key="fee-edit"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-black">Configure Gateway Fee</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Edit processing fee split for {selectedMerchant.business_name}</p>
                                    </div>
                                    <button onClick={() => setPanelMode('details')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <form onSubmit={handleUpdateFee} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Gateway Fee (%)</label>
                                        <input
                                            type="number" step="0.1"
                                            required value={newFee} onChange={e => setNewFee(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-sm font-black focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                                        <Button type="button" onClick={() => setPanelMode('details')} variant="outline" className="w-full sm:flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                        <Button type="submit" className="w-full sm:flex-1 bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black text-xs h-10 rounded-xl border-0 shadow-lg">Save Fee</Button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {panelMode === 'form' && (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 max-h-[80vh] overflow-y-auto"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-black">Register Merchant Gateway</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Setup API gateway and target settlement vault</p>
                                    </div>
                                    <button onClick={() => setPanelMode('none')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <form onSubmit={handleCreateMerchant} className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Business / Enterprise Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={newBusinessName}
                                            onChange={e => setNewBusinessName(e.target.value)}
                                            placeholder="e.g. Aba Leathercraft Hub"
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Owner Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={newOwnerName}
                                            onChange={e => setNewOwnerName(e.target.value)}
                                            placeholder="e.g. Chidi Ebere"
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Contact Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={newEmail}
                                            onChange={e => setNewEmail(e.target.value)}
                                            placeholder="owner@enterprise.com"
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Settlement Account (Abia MFB)</label>
                                        <input
                                            type="text"
                                            required
                                            value={newSettlementAccount}
                                            onChange={e => setNewSettlementAccount(e.target.value)}
                                            placeholder="10 digit account number"
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Webhook URL</label>
                                        <input
                                            type="url"
                                            required
                                            value={newWebhookUrl}
                                            onChange={e => setNewWebhookUrl(e.target.value)}
                                            placeholder="https://api.domain.com/payhooks"
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                                        <Button type="button" onClick={() => setPanelMode('none')} variant="outline" className="w-full sm:flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                        <Button type="submit" disabled={submittingMerchant} className="w-full sm:flex-1 bg-gradient-to-r from-emerald-500 to-amber-500 text-black font-black text-xs h-10 rounded-xl border-0 shadow-lg">
                                            {submittingMerchant ? 'Registering...' : 'Register'}
                                        </Button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {panelMode === 'none' && (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center empty-state-card"
                            >
                                <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                                <p className="text-xs font-bold text-muted-foreground">Select an artisan business entry from the directory to manage gateway parameters and fee split config.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}


