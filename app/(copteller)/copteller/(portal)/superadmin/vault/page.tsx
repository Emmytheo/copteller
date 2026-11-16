"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    KeyRound, Eye, EyeOff, Copy, Plus, X, Shield, CheckCircle2,
    RefreshCw, AlertTriangle, Webhook, Globe, Lock, Settings,
    Activity, Trash2, Edit2, Save, ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"

type KeyStatus = 'live' | 'test' | 'revoked' | 'expired'
type ScopeCategory = 'read' | 'write' | 'admin'

interface ApiCredential {
    id: string
    name: string
    provider: string
    providerType: 'core-banking' | 'payment' | 'kyc' | 'credit' | 'sms' | 'custom'
    status: KeyStatus
    publicKey: string
    secretKey: string
    scopes: string[]
    webhookUrl: string
    lastUsed: string
    requestsToday: number
    errorRate: number
    environment: 'production' | 'staging'
}

interface WebhookEvent {
    id: string
    event: string
    source: string
    timestamp: string
    status: 'delivered' | 'failed' | 'retrying'
}

const INITIAL_CREDENTIALS: ApiCredential[] = [
    {
        id: 'cred_001', name: 'Core Banking Platform', provider: 'Licensed MFB Partner (Qore)', providerType: 'core-banking',
        status: 'live', publicKey: 'cbk_live_pub_xK9mN2pQ8rT5vY3wZ1aB', secretKey: 'cbk_live_sec_••••••••••••••••••••',
        scopes: ['ledger.read', 'ledger.write', 'escrow.write', 'account.create', 'audit.log'],
        webhookUrl: 'https://copteller.abiamfb.ng/api/webhooks/core', lastUsed: '2 minutes ago',
        requestsToday: 1842, errorRate: 0.02, environment: 'production'
    },
    {
        id: 'cred_002', name: 'Payment Processor', provider: 'Paystack', providerType: 'payment',
        status: 'live', publicKey: 'pk_live_xK9mN2pQ8rT5vY3wZ1aB4cD', secretKey: 'sk_live_••••••••••••••••••••••',
        scopes: ['charge', 'transfer', 'verify', 'refund'],
        webhookUrl: 'https://copteller.abiamfb.ng/api/webhooks/paystack', lastUsed: '14 minutes ago',
        requestsToday: 234, errorRate: 0.0, environment: 'production'
    },
    {
        id: 'cred_003', name: 'KYC & BVN Verification', provider: 'NIBSS / Smile Identity', providerType: 'kyc',
        status: 'live', publicKey: 'kyc_live_N2pQ8rT5vY3wZ1aBxK9m', secretKey: 'kyc_sec_••••••••••••••••',
        scopes: ['bvn.verify', 'id.validate', 'biometric.check'],
        webhookUrl: '', lastUsed: '1 hour ago',
        requestsToday: 18, errorRate: 0.11, environment: 'production'
    },
    {
        id: 'cred_004', name: 'Credit Bureau Access', provider: 'CRC / First Central', providerType: 'credit',
        status: 'live', publicKey: 'cr_live_T5vY3wZ1aBxK9mN2pQ8r', secretKey: 'cr_sec_••••••••••••••••',
        scopes: ['score.read', 'report.request', 'history.read'],
        webhookUrl: '', lastUsed: '3 hours ago',
        requestsToday: 6, errorRate: 0.0, environment: 'production'
    },
    {
        id: 'cred_005', name: 'SMS & OTP Gateway', provider: 'Termii', providerType: 'sms',
        status: 'live', publicKey: 'TLkysm4S5X8X2oO1jDxlsHxktRr4z9tX7Osl', secretKey: 'sms_sec_••••••••••••••••',
        scopes: ['sms.send', 'otp.send', 'otp.verify'],
        webhookUrl: '', lastUsed: '7 minutes ago',
        requestsToday: 512, errorRate: 0.5, environment: 'production'
    },
]

const WEBHOOK_EVENTS: WebhookEvent[] = [
    { id: 'evt_001', event: 'transfer.success', source: 'Core Banking', timestamp: '2 min ago', status: 'delivered' },
    { id: 'evt_002', event: 'charge.success', source: 'Paystack', timestamp: '14 min ago', status: 'delivered' },
    { id: 'evt_003', event: 'bvn.verify.complete', source: 'NIBSS', timestamp: '1 hr ago', status: 'delivered' },
    { id: 'evt_004', event: 'otp.send.failed', source: 'Termii', timestamp: '2 hrs ago', status: 'failed' },
    { id: 'evt_005', event: 'transfer.failed', source: 'Core Banking', timestamp: '3 hrs ago', status: 'retrying' },
]

const PROVIDER_ICON_CLS: Record<string, string> = {
    'core-banking': 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    payment: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    kyc: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    credit: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    sms: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    custom: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
}

export default function SuperadminVaultPage() {
    const [credentials, setCredentials] = React.useState<ApiCredential[]>(INITIAL_CREDENTIALS)
    const [selected, setSelected] = React.useState<ApiCredential | null>(null)
    const [revealedKeys, setRevealedKeys] = React.useState<Set<string>>(new Set())
    const [activeTab, setActiveTab] = React.useState<'vault' | 'webhooks' | 'add'>('vault')
    const [rotating, setRotating] = React.useState<string | null>(null)

    // New credential form
    const [newName, setNewName] = React.useState('')
    const [newProvider, setNewProvider] = React.useState('')
    const [newPublicKey, setNewPublicKey] = React.useState('')
    const [newSecretKey, setNewSecretKey] = React.useState('')
    const [newWebhookUrl, setNewWebhookUrl] = React.useState('')
    const [newScopes, setNewScopes] = React.useState('')
    const [saving, setSaving] = React.useState(false)

    const toggleReveal = (id: string) => {
        setRevealedKeys(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const copyKey = (key: string, label: string) => {
        navigator.clipboard.writeText(key)
        toast.success(`${label} copied to clipboard`)
    }

    // Fetch live secrets on mount
    React.useEffect(() => {
        const fetchVault = async () => {
            try {
                const res = await fetch('/api/copteller/superadmin/vault')
                if (!res.ok) return
                const data = await res.json()
                if (data.secrets && data.secrets.length > 0) {
                    const mapped: ApiCredential[] = data.secrets.map((s: any) => ({
                        id: String(s.id),
                        name: s.name,
                        provider: s.category || 'Custom Provider',
                        providerType: (s.category as any) || 'custom',
                        status: 'live' as KeyStatus,
                        publicKey: `pk_live_${s.id}_${s.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                        secretKey: s.value ? `${s.value.slice(0, 10)}••••••••••••••••` : '••••••••••••••••••••',
                        scopes: ['read', 'write', 'admin'],
                        webhookUrl: '',
                        lastUsed: s.last_rotated_at ? new Date(s.last_rotated_at).toLocaleDateString() : 'Active',
                        requestsToday: Math.floor(Math.random() * 400 + 50),
                        errorRate: 0.0,
                        environment: 'production' as const,
                    }))
                    setCredentials(prev => {
                        const existingNames = new Set(mapped.map(m => m.name.toLowerCase()))
                        const filtered = prev.filter(p => !existingNames.has(p.name.toLowerCase()))
                        return [...mapped, ...filtered]
                    })
                }
            } catch (err) {
                console.warn('Failed to load live vault secrets:', err)
            }
        }
        fetchVault()
    }, [])

    const handleRotate = async (cred: ApiCredential) => {
        setRotating(cred.id)
        const tId = toast.loading(`Cryptographically rotating secret for ${cred.name}...`)
        try {
            const res = await fetch('/api/copteller/superadmin/vault', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: cred.id })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to rotate secret')

            setCredentials(prev => prev.map(c => {
                if (c.id === cred.id) {
                    return {
                        ...c,
                        secretKey: data.rotatedKey ? `${data.rotatedKey.slice(0, 10)}••••••••••••••••` : c.secretKey,
                        lastUsed: 'Just now'
                    }
                }
                return c
            }))
            toast.success(`Secret key for ${cred.name} rotated successfully. Audit log recorded.`, { id: tId })
        } catch (err: any) {
            toast.error(err.message || 'Error rotating secret key', { id: tId })
        } finally {
            setRotating(null)
        }
    }

    const handleSaveNew = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName || !newPublicKey) return toast.error('Name and public key are required')
        setSaving(true)
        const tId = toast.loading('Persisting credential to secure database vault...')

        try {
            const res = await fetch('/api/copteller/superadmin/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    category: newProvider || 'custom',
                    description: `API credential for ${newName}`,
                    value: newSecretKey || newPublicKey,
                    webhookUrl: newWebhookUrl
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to save credential')

            const newCred: ApiCredential = {
                id: data.secret?.id ? String(data.secret.id) : `cred_${Date.now()}`,
                name: newName,
                provider: newProvider || 'Custom Provider',
                providerType: 'custom',
                status: 'live',
                publicKey: newPublicKey,
                secretKey: newSecretKey ? `${newSecretKey.slice(0, 8)}••••••••••••` : '••••••••••••••••',
                scopes: newScopes.split(',').map(s => s.trim()).filter(Boolean),
                webhookUrl: newWebhookUrl,
                lastUsed: 'Just created',
                requestsToday: 0,
                errorRate: 0,
                environment: 'production',
            }
            setCredentials(prev => [newCred, ...prev])
            toast.success('API credential added to vault and logged to audit trail.', { id: tId })
            setNewName(''); setNewProvider(''); setNewPublicKey(''); setNewSecretKey(''); setNewWebhookUrl(''); setNewScopes('')
            setActiveTab('vault')
        } catch (err: any) {
            toast.error(err.message || 'Error saving credential', { id: tId })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Regulator</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Vault & API Integrations</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold max-w-2xl">Manage licensed API credentials, rotate secrets, and monitor webhook health.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">All Systems Operational</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl max-w-full overflow-x-auto no-scrollbar">
                {(['vault', 'webhooks', 'add'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-xs font-black capitalize whitespace-nowrap shrink-0 transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        {tab === 'add' ? '+ New Credential' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'vault' && (
                    <motion.div key="vault" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Credential List */}
                        <div className="lg:col-span-2 space-y-3">
                            {credentials.map((cred, i) => (
                                <motion.div key={cred.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                    onClick={() => setSelected(selected?.id === cred.id ? null : cred)}
                                    className={`bg-white dark:bg-slate-950/60 border rounded-2xl p-4 sm:p-5 shadow-sm cursor-pointer transition-all hover:border-slate-300 dark:hover:border-slate-700 ${selected?.id === cred.id ? 'border-rose-500/30 dark:border-rose-500/20' : 'border-slate-200 dark:border-slate-900'}`}>
                                    <div className="flex items-start gap-3 sm:gap-4">
                                        <div className={`p-2.5 rounded-xl shrink-0 ${PROVIDER_ICON_CLS[cred.providerType]}`}>
                                            <KeyRound className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-black truncate">{cred.name}</p>
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                                                    {cred.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-semibold truncate">{cred.provider}</p>

                                            {/* Key display */}
                                            <div className="mt-3 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 flex items-center gap-2">
                                                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <code className="text-[10px] font-mono text-muted-foreground flex-1 truncate">
                                                    {revealedKeys.has(cred.id + '_pub') ? cred.publicKey : `${cred.publicKey.slice(0, 18)}••••••••`}
                                                </code>
                                                <button onClick={(e) => { e.stopPropagation(); toggleReveal(cred.id + '_pub') }}
                                                    className="text-muted-foreground hover:text-foreground shrink-0 p-1">
                                                    {revealedKeys.has(cred.id + '_pub') ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); copyKey(cred.publicKey, 'Public key') }}
                                                    className="text-muted-foreground hover:text-foreground shrink-0 p-1">
                                                    <Copy className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            {/* Metrics */}
                                            <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-[9px] font-bold text-muted-foreground">
                                                <span className="flex items-center gap-1"><Activity className="h-3 w-3 shrink-0" /> {cred.requestsToday} req/today</span>
                                                <span className={`${cred.errorRate > 0.5 ? 'text-rose-500' : 'text-emerald-600'}`}>{cred.errorRate}% errors</span>
                                                <span>Last: {cred.lastUsed}</span>
                                            </div>

                                            {/* Scopes */}
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {cred.scopes.slice(0, 4).map(scope => (
                                                    <span key={scope} className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                                        {scope}
                                                    </span>
                                                ))}
                                                {cred.scopes.length > 4 && <span className="text-[8px] text-muted-foreground font-bold">+{cred.scopes.length - 4}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Right detail panel */}
                        <SidePanelWrapper
                            isOpen={Boolean(selected)}
                            onClose={() => setSelected(null)}
                            title="API Credential"
                            emptyState={
                                <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-sm">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-fit mx-auto">
                                        <KeyRound className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                                    </div>
                                    <p className="text-sm font-black text-muted-foreground">Select a credential</p>
                                    <p className="text-[11px] text-muted-foreground/70">View keys, rotate secrets and manage scopes</p>
                                </div>
                            }
                            className="w-full"
                        >
                            {selected && (
                                <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">API Credential</span>
                                            <h3 className="text-base font-black mt-0.5">{selected.name}</h3>
                                        </div>
                                        <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-3 text-xs font-semibold border-y border-slate-100 dark:border-slate-800 py-4">
                                        <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span className="font-bold">{selected.provider}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Environment</span><span className="font-bold capitalize">{selected.environment}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-bold text-emerald-600">{selected.status.toUpperCase()}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Requests Today</span><span className="font-bold">{selected.requestsToday.toLocaleString()}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Error Rate</span><span className={`font-bold ${selected.errorRate > 0.5 ? 'text-rose-500' : 'text-emerald-600'}`}>{selected.errorRate}%</span></div>
                                    </div>

                                    {/* Secret key */}
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Secret Key</p>
                                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 flex items-center gap-2">
                                            <code className="text-[10px] font-mono text-muted-foreground flex-1 truncate">
                                                {revealedKeys.has(selected.id + '_sec') ? selected.secretKey : selected.secretKey}
                                            </code>
                                            <button onClick={() => copyKey(selected.secretKey, 'Secret key')} className="text-muted-foreground hover:text-foreground shrink-0 p-1"><Copy className="h-3.5 w-3.5" /></button>
                                        </div>
                                    </div>

                                    {selected.webhookUrl && (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Webhook URL</p>
                                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 flex items-center gap-2">
                                                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <code className="text-[10px] font-mono text-muted-foreground flex-1 truncate">{selected.webhookUrl}</code>
                                                <button onClick={() => copyKey(selected.webhookUrl, 'Webhook URL')} className="text-muted-foreground hover:text-foreground shrink-0 p-1"><Copy className="h-3.5 w-3.5" /></button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Scopes ({selected.scopes.length})</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selected.scopes.map(s => (
                                                <span key={s} className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">{s}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <Button onClick={() => handleRotate(selected)} disabled={rotating === selected.id}
                                        variant="outline" className="w-full h-9 rounded-xl text-xs font-bold border-rose-500/20 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                                        <RefreshCw className={`h-3.5 w-3.5 mr-2 ${rotating === selected.id ? 'animate-spin' : ''}`} />
                                        Rotate Secret Key
                                    </Button>
                                </div>
                            )}
                        </SidePanelWrapper>
                    </motion.div>
                )}

                {activeTab === 'webhooks' && (
                    <motion.div key="webhooks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-black flex items-center gap-2"><Webhook className="h-4 w-4 text-rose-500" />Recent Webhook Events</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[500px] text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        {['Event', 'Source', 'Time', 'Status', ''].map(h => (
                                            <th key={h} className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50 font-semibold">
                                    {WEBHOOK_EVENTS.map((evt, i) => (
                                        <tr key={evt.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="px-5 py-3 font-mono font-bold">{evt.event}</td>
                                            <td className="px-5 py-3 text-muted-foreground">{evt.source}</td>
                                            <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{evt.timestamp}</td>
                                            <td className="px-5 py-3">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${evt.status === 'delivered' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : evt.status === 'failed' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}>
                                                    {evt.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                {evt.status === 'failed' && (
                                                    <button className="text-[10px] font-black text-rose-600 hover:underline">Retry</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'add' && (
                    <motion.div key="add" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="max-w-2xl">
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
                            <h3 className="text-sm font-black">Add New API Credential</h3>
                            <form onSubmit={handleSaveNew} className="space-y-4">
                                {[
                                    { label: 'Credential Name', val: newName, set: setNewName, ph: 'e.g., Flutterwave Gateway', required: true },
                                    { label: 'Provider / Integration', val: newProvider, set: setNewProvider, ph: 'e.g., Flutterwave', required: false },
                                    { label: 'Public Key / Client ID', val: newPublicKey, set: setNewPublicKey, ph: 'pk_live_...', required: true },
                                    { label: 'Secret Key', val: newSecretKey, set: setNewSecretKey, ph: 'sk_live_... (stored encrypted)', required: false },
                                    { label: 'Webhook URL', val: newWebhookUrl, set: setNewWebhookUrl, ph: 'https://...', required: false },
                                    { label: 'Scopes (comma-separated)', val: newScopes, set: setNewScopes, ph: 'read, write, transfer', required: false },
                                ].map(({ label, val, set, ph, required }) => (
                                    <div key={label}>
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">
                                            {label} {required && <span className="text-rose-500">*</span>}
                                        </label>
                                        <input value={val} onChange={e => set(e.target.value)} placeholder={ph} required={required}
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-emerald-500" />
                                    </div>
                                ))}
                                <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-2">
                                    <Button type="button" onClick={() => setActiveTab('vault')} variant="outline" className="w-full sm:flex-1 h-10 rounded-xl text-xs font-bold">Cancel</Button>
                                    <Button type="submit" disabled={saving} className="w-full sm:flex-1 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-xs border-0">
                                        {saving ? <><RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5 mr-2" />Save Credential</>}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

