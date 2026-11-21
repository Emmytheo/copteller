"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Settings, Save, RefreshCw, Cpu, Layers, Database, ShieldCheck,
    Play, Activity, Terminal, AlertCircle, CheckCircle2, Server, HelpCircle, Building2, Globe
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface EndpointSpec {
    id: string
    name: string
    method: string
    path: string
}

interface WorkflowSpec {
    id: string
    name: string
    triggerType: string
}

export default function SuperadminInfrastructurePage() {
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState<'mappings' | 'workflows' | 'telemetry'>('mappings')
    
    // Config states
    const [endpoints, setEndpoints] = React.useState<EndpointSpec[]>([])
    const [workflows, setWorkflows] = React.useState<WorkflowSpec[]>([])
    const [settings, setSettings] = React.useState<any>({
        masterFundingAccount: '3000392981',
        kycEndpoint: '',
        depositEndpoint: '',
        transferEndpoint: '',
        creditScoreEndpoint: '',
        autoDeductionWorkflow: '',
        cbnReportingWorkflow: '',
    })

    // Partner Bank Settlement Rail state (Bank-Agnostic: BankSuite / Kuda / Qore / Generic MFB)
    const [partnerBank, setPartnerBank] = React.useState<any>(null)
    const [supportedProviders, setSupportedProviders] = React.useState<any[]>([])
    const [escrowPools, setEscrowPools] = React.useState<any[]>([])
    const [switchingProvider, setSwitchingProvider] = React.useState<string | null>(null)

    // Telemetry log stream simulation states
    const [isSimulating, setIsSimulating] = React.useState(false)
    const [logs, setLogs] = React.useState<{ msg: string; type: 'info' | 'success' | 'warn' | 'error' | 'cmd'; timestamp: string }[]>([])
    const logEndRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs])

    const fetchConfig = async () => {
        try {
            setLoading(true)
            const [epRes, wfRes, configRes, pbRes] = await Promise.all([
                fetch('/api/endpoints?limit=250'),
                fetch('/api/workflows?limit=250'),
                fetch('/api/copteller/infrastructure'),
                fetch('/api/copteller/partner-bank').catch(() => null),
            ])

            const epData = await epRes.json()
            const wfData = await wfRes.json()
            const configData = await configRes.json()
            if (pbRes && pbRes.ok) {
                const pbData = await pbRes.json().catch(() => null)
                if (pbData?.success) {
                    setPartnerBank(pbData.partnerBank)
                    setSupportedProviders(pbData.supportedProviders || [])
                    setEscrowPools(pbData.escrowPools || [])
                }
            }

            if (epData.docs) {
                setEndpoints(epData.docs.map((e: any) => ({
                    id: String(e.id),
                    name: e.name,
                    method: e.method,
                    path: e.path
                })))
            }

            if (wfData.docs) {
                setWorkflows(wfData.docs.map((w: any) => ({
                    id: String(w.id),
                    name: w.name,
                    triggerType: w.trigger
                })))
            }

            if (configData.success && configData.settings?.copteller) {
                const cop = configData.settings.copteller
                setSettings({
                    masterFundingAccount: cop.masterFundingAccount || '3000392981',
                    kycEndpoint: typeof cop.kycEndpoint === 'object' ? cop.kycEndpoint?.id || '' : cop.kycEndpoint || '',
                    depositEndpoint: typeof cop.depositEndpoint === 'object' ? cop.depositEndpoint?.id || '' : cop.depositEndpoint || '',
                    transferEndpoint: typeof cop.transferEndpoint === 'object' ? cop.transferEndpoint?.id || '' : cop.transferEndpoint || '',
                    creditScoreEndpoint: typeof cop.creditScoreEndpoint === 'object' ? cop.creditScoreEndpoint?.id || '' : cop.creditScoreEndpoint || '',
                    autoDeductionWorkflow: typeof cop.autoDeductionWorkflow === 'object' ? cop.autoDeductionWorkflow?.id || '' : cop.autoDeductionWorkflow || '',
                    cbnReportingWorkflow: typeof cop.cbnReportingWorkflow === 'object' ? cop.cbnReportingWorkflow?.id || '' : cop.cbnReportingWorkflow || '',
                })
            }
        } catch (e) {
            toast.error("Failed to load platform infrastructure specs")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchConfig()
    }, [])

    const handleSwitchPartnerBank = async (providerId: string) => {
        setSwitchingProvider(providerId)
        try {
            const res = await fetch('/api/copteller/partner-bank', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: providerId }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to switch settlement bank')
            }
            setPartnerBank(data.partnerBank)
            if (data.supportedProviders) setSupportedProviders(data.supportedProviders)
            toast.success(`Active settlement bank switched to ${data.partnerBank.bankName}`)
        } catch (err: any) {
            toast.error(err.message || 'Partner bank switch failed')
        } finally {
            setSwitchingProvider(null)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const tId = toast.loading("Persisting API & Workflow mappings...")
        try {
            const res = await fetch('/api/copteller/infrastructure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ copteller: settings })
            })
            const data = await res.json()
            if (data.success) {
                toast.success("Infrastructure configuration updated successfully!", { id: tId })
                fetchConfig()
            } else {
                throw new Error(data.error)
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to update configurations", { id: tId })
        } finally {
            setSaving(false)
        }
    }

    const runSimulation = (mode: 'deductions' | 'cbn') => {
        if (isSimulating) return
        setIsSimulating(true)
        setLogs([])

        const addLog = (msg: string, type: 'info' | 'success' | 'warn' | 'error' | 'cmd' = 'info') => {
            const time = new Date().toLocaleTimeString()
            setLogs(prev => [...prev, { msg, type, timestamp: time }])
        }

        if (mode === 'deductions') {
            const steps = [
                { delay: 0, msg: "Initializing Rotational Ajo Escrow Deductions Pipeline...", type: "cmd" as const },
                { delay: 800, msg: "Fetching active cooperatives in Copteller Cooperative schema...", type: "info" as const },
                { delay: 1500, msg: "Found Cooperative: 'Metro Tricycle Operators Union' (Active).", type: "success" as const },
                { delay: 2200, msg: "Loading active member roster context. Resolving ledger accounts...", type: "info" as const },
                { delay: 3000, msg: "Active account resolved: '3000392981' (Chinedu Okafor - Balance NGN 63,375.00).", type: "success" as const },
                { delay: 3800, msg: "Evaluating weekly cycle contribution due: NGN 20,000.00.", type: "info" as const },
                { delay: 4600, msg: `Triggering outward transfer endpoint clearing to destination account '3000392981_cop'...`, type: "cmd" as const },
                { delay: 5400, msg: "Updating balances: Acc '3000392981' debited NGN 20,000.00 -> New balance: NGN 43,375.00.", type: "success" as const },
                { delay: 6200, msg: "Transaction successfully logged: TX_TRF_DR_AJO001 (Reconciled).", type: "success" as const },
                { delay: 7000, msg: "Writing operational audit logs to copteller.copteller_audit_logs...", type: "info" as const },
                { delay: 7800, msg: "✔ Escrow pipeline completed successfully. All ledger accounts reconciled.", type: "success" as const }
            ]

            steps.forEach(step => {
                setTimeout(() => addLog(step.msg, step.type), step.delay)
            })

            setTimeout(() => setIsSimulating(false), 8000)
        } else {
            const steps = [
                { delay: 0, msg: "Establishing secure SSL connection to Central Bank of Nigeria (CBN) API gateway...", type: "cmd" as const },
                { delay: 800, msg: "Authenticating with provider certificate token...", type: "info" as const },
                { delay: 1500, msg: "Authentication successful. Access granted to CBN Telemetry Portal.", type: "success" as const },
                { delay: 2200, msg: "Reconciling Copteller ledger state against Master Funding Acc '3000392981'...", type: "info" as const },
                { delay: 3000, msg: "Aggregating daily asset hire purchase payouts: NGN 14.8M.", type: "info" as const },
                { delay: 3800, msg: "Formatting compliance payloads (XBRL Schema format)...", type: "info" as const },
                { delay: 4600, msg: "Sending Payload: { total_escrow: 2400000000, active_members: 1240 }", type: "cmd" as const },
                { delay: 5400, msg: "CBN Gateway Response: 202 ACCEPTED (TxRef: CBN-COP-9812A).", type: "success" as const },
                { delay: 6200, msg: "✔ Compliance stream synchronization complete. Gateway idle.", type: "success" as const }
            ]

            steps.forEach(step => {
                setTimeout(() => addLog(step.msg, step.type), step.delay)
            })

            setTimeout(() => setIsSimulating(false), 6400)
        }
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <RefreshCw className="h-10 w-10 animate-spin text-emerald-500" />
                <p className="text-muted-foreground font-medium text-sm uppercase tracking-widest">Loading Infrastructure Console...</p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Regulator Settings</span>
                    <h1 className="text-3xl font-black mt-2">System Infrastructure</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">Configure API endpoints mappings, schedule rotational esusu pipelines, and stream live transaction telemetry.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleSave} disabled={saving} className="h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs px-4 border-0">
                        {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit">
                {[
                    { id: 'mappings', label: 'API Endpoint Mappings', icon: Database },
                    { id: 'workflows', label: 'Automation Pipelines', icon: Layers },
                    { id: 'telemetry', label: 'Telemetry Sandbox', icon: Terminal },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-lg text-xs font-black capitalize transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'mappings' && (
                    <motion.div key="mappings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                        {/* Bank-Agnostic Partner Bank Settlement Rail Selector */}
                        <Card className="border-emerald-500/25 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
                            <CardHeader className="border-b border-slate-100 dark:border-slate-900/60">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-sm font-black flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-emerald-500" />
                                            Partner Bank Settlement Adapter (Bank-Agnostic Rail)
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Copteller operates independently and plugs into any licensed Partner Bank (BankSuite MFB, Kuda Open API v2.1, Qore CBS, or custom MFB).
                                        </CardDescription>
                                    </div>
                                    {partnerBank && (
                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-black text-[10px]">
                                            ACTIVE: {partnerBank.shortName} · CODE {partnerBank.bankCode}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {supportedProviders.map((p: any) => {
                                        const isActive = partnerBank?.provider === p.provider
                                        return (
                                            <button
                                                key={p.provider}
                                                type="button"
                                                disabled={switchingProvider !== null}
                                                onClick={() => handleSwitchPartnerBank(p.provider)}
                                                className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                                                    isActive
                                                        ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40'
                                                        : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50/50 dark:bg-slate-900/40'
                                                }`}
                                            >
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-black text-foreground">{p.shortName}</span>
                                                        <span
                                                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                                                                p.configured
                                                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                            }`}
                                                        >
                                                            {p.configured ? 'Ready' : 'Env Required'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                                                        {p.description}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800/70 text-[10px] font-bold">
                                                    <span className="font-mono text-muted-foreground">CBN {p.bankCode}</span>
                                                    <span className={isActive ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-500'}>
                                                        {switchingProvider === p.provider ? 'Switching...' : isActive ? '● Active Rail' : 'Activate →'}
                                                    </span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                                {escrowPools.length > 0 && (
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/60 dark:bg-slate-900/50">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                            <Globe className="h-3.5 w-3.5 text-emerald-500" />
                                            Provisioned Cooperative Escrow Pools ({escrowPools.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {escrowPools.map((pool: any) => (
                                                <span
                                                    key={pool.cooperativeId}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold"
                                                >
                                                    <span className="font-bold">{pool.cooperativeName}</span>
                                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">#{pool.escrowNuban}</span>
                                                    <span className="text-[10px] text-muted-foreground">({pool.partnerBankName})</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 dark:border-slate-900 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl">
                            <CardHeader className="border-b border-slate-100 dark:border-slate-900/60">
                                <CardTitle className="text-sm font-black flex items-center gap-2"><Cpu className="h-4 w-4 text-emerald-500" /> API Gateway Mappings</CardTitle>
                                <CardDescription className="text-xs">Bind basic Copteller operations to configured service provider endpoints.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6 text-xs font-semibold">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Funding Account */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Platform Master Funding Account</label>
                                        <Input
                                            value={settings.masterFundingAccount}
                                            onChange={e => setSettings({ ...settings, masterFundingAccount: e.target.value })}
                                            className="h-10 rounded-xl border-slate-200 dark:border-slate-850 font-mono text-sm"
                                        />
                                        <p className="text-[9px] text-muted-foreground font-semibold">Fallback clearing account number used for automated settlements.</p>
                                    </div>

                                    {/* Member KYC Endpoint */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Member KYC Lookup Endpoint</label>
                                        <Select value={settings.kycEndpoint} onValueChange={v => setSettings({ ...settings, kycEndpoint: v })}>
                                            <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-850">
                                                <SelectValue placeholder="Select endpoint spec..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                                {endpoints.map(e => (
                                                    <SelectItem key={e.id} value={e.id} className="rounded-lg text-xs">
                                                        <Badge variant="outline" className="mr-2 uppercase text-[8px]">{e.method}</Badge> {e.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Wallet Deposit Clearing */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Deposit Inbound Clearing Endpoint</label>
                                        <Select value={settings.depositEndpoint} onValueChange={v => setSettings({ ...settings, depositEndpoint: v })}>
                                            <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-850">
                                                <SelectValue placeholder="Select endpoint spec..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                                {endpoints.map(e => (
                                                    <SelectItem key={e.id} value={e.id} className="rounded-lg text-xs">
                                                        <Badge variant="outline" className="mr-2 uppercase text-[8px]">{e.method}</Badge> {e.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Wallet Transfer Outward */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Transfer Outward Clearing Endpoint</label>
                                        <Select value={settings.transferEndpoint} onValueChange={v => setSettings({ ...settings, transferEndpoint: v })}>
                                            <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-850">
                                                <SelectValue placeholder="Select endpoint spec..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                                {endpoints.map(e => (
                                                    <SelectItem key={e.id} value={e.id} className="rounded-lg text-xs">
                                                        <Badge variant="outline" className="mr-2 uppercase text-[8px]">{e.method}</Badge> {e.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Credit Score Engine */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Credit Score Engine Endpoint</label>
                                        <Select value={settings.creditScoreEndpoint} onValueChange={v => setSettings({ ...settings, creditScoreEndpoint: v })}>
                                            <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-850">
                                                <SelectValue placeholder="Select endpoint spec..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                                {endpoints.map(e => (
                                                    <SelectItem key={e.id} value={e.id} className="rounded-lg text-xs">
                                                        <Badge variant="outline" className="mr-2 uppercase text-[8px]">{e.method}</Badge> {e.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {activeTab === 'workflows' && (
                    <motion.div key="workflows" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                        <Card className="border-slate-200 dark:border-slate-900 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl">
                            <CardHeader className="border-b border-slate-100 dark:border-slate-900/60">
                                <CardTitle className="text-sm font-black flex items-center gap-2"><Layers className="h-4 w-4 text-emerald-500" /> Automation Workflows</CardTitle>
                                <CardDescription className="text-xs">Bind scheduled esusu and compliance jobs to Copteller automated pipeline engines.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6 text-xs font-semibold">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Auto-Deductions Workflow */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Auto-Deductions Rotational Workflow</label>
                                        <Select value={settings.autoDeductionWorkflow} onValueChange={v => setSettings({ ...settings, autoDeductionWorkflow: v })}>
                                            <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-850">
                                                <SelectValue placeholder="Select workflow spec..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                                {workflows.map(w => (
                                                    <SelectItem key={w.id} value={w.id} className="rounded-lg text-xs">
                                                        <Badge variant="outline" className="mr-2 uppercase text-[8px]">{w.triggerType}</Badge> {w.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* CBN Compliance Stream Workflow */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">CBN Compliance Reporting Workflow</label>
                                        <Select value={settings.cbnReportingWorkflow} onValueChange={v => setSettings({ ...settings, cbnReportingWorkflow: v })}>
                                            <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-850">
                                                <SelectValue placeholder="Select workflow spec..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                                {workflows.map(w => (
                                                    <SelectItem key={w.id} value={w.id} className="rounded-lg text-xs">
                                                        <Badge variant="outline" className="mr-2 uppercase text-[8px]">{w.triggerType}</Badge> {w.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {activeTab === 'telemetry' && (
                    <motion.div key="telemetry" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Simulation controls */}
                        <div className="space-y-4">
                            <Card className="border-slate-200 dark:border-slate-900 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl">
                                <CardHeader>
                                    <CardTitle className="text-sm font-black flex items-center gap-2"><Play className="h-4 w-4 text-emerald-500" /> Pipeline Simulations</CardTitle>
                                    <CardDescription className="text-xs font-semibold">Test your configured API mappings and run mock operations.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    <Button
                                        onClick={() => runSimulation('deductions')}
                                        disabled={isSimulating}
                                        className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-black font-black text-xs gap-2 border-0"
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                                        Simulate Auto-Deductions
                                    </Button>

                                    <Button
                                        onClick={() => runSimulation('cbn')}
                                        disabled={isSimulating}
                                        className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs gap-2 border-0"
                                    >
                                        <Activity className="h-3.5 w-3.5" />
                                        Simulate CBN Telemetry Sync
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Console logs */}
                        <div className="lg:col-span-2">
                            <Card className="border-slate-900 bg-[#020202] rounded-3xl overflow-hidden shadow-2xl relative">
                                <CardHeader className="border-b border-slate-900 bg-[#070707] py-3.5 px-6 flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                        <span className="ml-2 font-mono text-[10px] font-black text-slate-500 uppercase tracking-widest">telemetry_terminal</span>
                                    </div>
                                    <Badge variant="outline" className="border-emerald-950 bg-emerald-500/5 text-emerald-450 text-[9px] font-black uppercase">
                                        Live Stream
                                    </Badge>
                                </CardHeader>
                                <CardContent className="p-6 font-mono text-[10.5px] leading-relaxed min-h-[350px] max-h-[450px] overflow-y-auto space-y-2">
                                    {logs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-600 gap-3">
                                            <Server className="h-8 w-8 opacity-40 animate-pulse text-emerald-500" />
                                            <p className="font-sans text-xs font-semibold">Idle. Trigger a pipeline simulation on the left panel to begin.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {logs.map((log, i) => (
                                                <div key={i} className={`flex items-start gap-3 ${
                                                    log.type === 'success' ? 'text-emerald-400' :
                                                    log.type === 'error' ? 'text-rose-400' :
                                                    log.type === 'warn' ? 'text-amber-400' :
                                                    log.type === 'cmd' ? 'text-indigo-400 font-bold' : 'text-slate-400'
                                                }`}>
                                                    <span className="text-slate-600 font-semibold shrink-0 select-none">[{log.timestamp}]</span>
                                                    <span className="shrink-0 select-none">⚡</span>
                                                    <span className="flex-1 whitespace-pre-wrap">{log.msg}</span>
                                                </div>
                                            ))}
                                            <div ref={logEndRef} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
