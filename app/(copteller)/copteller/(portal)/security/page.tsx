"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, X, Eye, EyeOff, ShieldCheck, KeyRound, Smartphone, History, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface AuditLog {
    id: number
    action: string
    entity_type: string
    ip_address: string
    created_at: string
    metadata?: {
        event?: string
        channel?: string
    }
}

export default function MemberSecurityPage() {
    const [panelMode, setPanelMode] = React.useState<'pin' | 'none'>('none')
    const [newPin, setNewPin] = React.useState("")
    const [confirmPin, setConfirmPin] = React.useState("")
    const [showPins, setShowPins] = React.useState(false)
    const [loading, setLoading] = React.useState(true)
    const [isSaving, setIsSaving] = React.useState(false)
    const [hasPin, setHasPin] = React.useState(false)
    const [biometricEnabled, setBiometricEnabled] = React.useState(true)
    const [recentLogs, setRecentLogs] = React.useState<AuditLog[]>([])

    const fetchSecurityState = React.useCallback(async () => {
        try {
            const res = await fetch('/api/copteller/security')
            const data = await res.json()
            if (data.success) {
                setHasPin(data.hasPin)
                setBiometricEnabled(data.biometricEnabled)
                setRecentLogs(data.recentLogs || [])
            }
        } catch (err) {
            console.error("Failed to load security profile:", err)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchSecurityState()
    }, [fetchSecurityState])

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPin.length !== 4 || confirmPin.length !== 4) {
            toast.error("PIN must be exactly 4 digits!")
            return
        }
        if (newPin !== confirmPin) {
            toast.error("PINs do not match!")
            return
        }
        setIsSaving(true)
        const tId = toast.loading("Updating transaction PIN in core ledger...")
        try {
            const res = await fetch('/api/copteller/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPin, confirmPin })
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update transaction PIN')
            }
            toast.success(data.message || "Transaction PIN updated successfully!", { id: tId })
            setPanelMode('none')
            setNewPin("")
            setConfirmPin("")
            setHasPin(true)
            fetchSecurityState()
        } catch (err: any) {
            toast.error(err.message || "Error saving PIN", { id: tId })
        } finally {
            setIsSaving(false)
        }
    }

    const handleToggleBiometrics = async () => {
        const nextState = !biometricEnabled
        const tId = toast.loading(`${nextState ? 'Enabling' : 'Disabling'} biometric authorization...`)
        try {
            const res = await fetch('/api/copteller/security', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ biometricEnabled: nextState })
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to toggle biometrics')
            }
            setBiometricEnabled(nextState)
            toast.success(data.message, { id: tId })
            fetchSecurityState()
        } catch (err: any) {
            toast.error(err.message || 'Error modifying biometric settings', { id: tId })
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 font-sans">
            {/* Header */}
            <div>
                <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Security</span>
                <h1 className="text-3xl font-black mt-2">Access & Permissions</h1>
                <p className="text-xs text-muted-foreground mt-1 font-semibold">Configure transaction authorization tokens, modify spending limits parameters, or review immutable session logs.</p>
            </div>

            {/* Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Side: Security controls */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-950/60 p-6 border border-slate-200 dark:border-slate-900 rounded-3xl space-y-6 shadow-sm">
                        <div>
                            <h3 className="text-sm font-black flex items-center gap-2"><Lock className="h-5 w-5 text-emerald-500" /> Security Controls</h3>
                            <p className="text-xs text-muted-foreground mt-1">Review live authorization profiles and ledger switches.</p>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-900">
                            <div className="flex justify-between items-center py-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-black">Transaction Authorization PIN</p>
                                        {hasPin ? (
                                            <span className="text-[9px] font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <CheckCircle2 className="h-2.5 w-2.5" /> CONFIGURED
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <AlertCircle className="h-2.5 w-2.5" /> NOT SET
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Required for initiating outbound ledger transfers, card PIN switch, and wallet withdrawals.</p>
                                </div>
                                <Button
                                    onClick={() => setPanelMode('pin')}
                                    size="sm"
                                    variant={panelMode === 'pin' ? 'secondary' : 'outline'}
                                    className="border-slate-200 dark:border-slate-800 text-[10px] font-bold rounded-lg h-8 px-3"
                                >
                                    {hasPin ? 'Change PIN' : 'Set PIN'}
                                </Button>
                            </div>

                            <div className="flex justify-between items-center py-4">
                                <div>
                                    <p className="text-xs font-black">Biometric Verification Toggle</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Permits smartphone TouchID / FaceID sensor triggers on mobile browsers.</p>
                                </div>
                                <Button
                                    onClick={handleToggleBiometrics}
                                    size="sm"
                                    variant="outline"
                                    className={`border text-[10px] font-bold rounded-lg h-8 px-3 transition-colors ${
                                        biometricEnabled
                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : 'border-slate-200 dark:border-slate-800 text-muted-foreground'
                                    }`}
                                >
                                    {biometricEnabled ? 'ENABLED' : 'DISABLED'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Immutable Audit Trail */}
                    <div className="bg-white dark:bg-slate-950/60 p-6 border border-slate-200 dark:border-slate-900 rounded-3xl space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black flex items-center gap-2">
                                <History className="h-4 w-4 text-emerald-500" /> Immutable Security Audit Logs
                            </h3>
                            <span className="text-[10px] font-bold text-muted-foreground">Tamper-Proof Ledger</span>
                        </div>
                        {recentLogs.length === 0 ? (
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 text-center text-xs text-muted-foreground">
                                No security modification logs recorded yet.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentLogs.map((log) => (
                                    <div key={log.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-900 flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-black text-foreground">
                                                {log.action.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {log.metadata?.event || 'Security credentials updated'} • IP: {log.ip_address || '127.0.0.1'}
                                            </p>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400">
                                            {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Inline Change Form Panel */}
                <div className="space-y-4">
                    <AnimatePresence mode="wait">
                        {panelMode === 'pin' && (
                            <motion.div
                                key="pin-form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 shadow-sm space-y-4"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-black text-foreground">{hasPin ? 'Modify Transaction PIN' : 'Create Transaction PIN'}</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Enter a secure 4-digit numeric code.</p>
                                    </div>
                                    <button onClick={() => setPanelMode('none')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <form onSubmit={handlePinSubmit} className="space-y-4">
                                    <div className="space-y-1 relative">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">New PIN (4 Digits)</label>
                                        <div className="relative">
                                            <input
                                                type={showPins ? "text" : "password"}
                                                maxLength={4}
                                                required
                                                value={newPin}
                                                onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                                                placeholder="••••"
                                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-sm font-black text-center tracking-widest focus:outline-none focus:border-emerald-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPins(!showPins)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400"
                                            >
                                                {showPins ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Confirm PIN</label>
                                        <input
                                            type={showPins ? "text" : "password"}
                                            maxLength={4}
                                            required
                                            value={confirmPin}
                                            onChange={e => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder="••••"
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-sm font-black text-center tracking-widest focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" onClick={() => setPanelMode('none')} variant="outline" className="flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                        <Button type="submit" disabled={isSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs h-10 rounded-xl border-0 shadow-lg">
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
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
                                className="bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center empty-state-card"
                            >
                                <KeyRound className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                                <p className="text-xs font-bold text-muted-foreground">Select a security setting action from the list to load config controls inline.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </div>
    )
}
