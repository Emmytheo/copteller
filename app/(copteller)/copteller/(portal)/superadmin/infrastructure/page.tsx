"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    Settings, Save, RefreshCw, Cpu, Layers, Database, ShieldCheck, Play,
    Activity, Terminal, CheckCircle2, XCircle, Loader2, Server, Building2, Globe, Copy,
    Webhook, AlertTriangle, Sparkles, Radio, ExternalLink
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CoptellerSubsystemNav } from "@/components/copteller/subsystem-nav"

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

const WEBHOOK_EVENT_OPTIONS = [
    { value: "payment.success", label: "payment.success (Checkout / Dynamic VA Paid)" },
    { value: "payment.failed", label: "payment.failed (Checkout / VA Failed)" },
    { value: "subwallet.credited", label: "subwallet.credited (Static VA Bank Inflow)" },
    { value: "subwallet.tier_locked", label: "subwallet.tier_locked (Max Balance Breach)" },
    { value: "subwallet.tier_upgraded", label: "subwallet.tier_upgraded (Tier 2/3 Approved)" },
    { value: "subwallet.tier_upgrade_rejected", label: "subwallet.tier_upgrade_rejected (Doc Rejected)" },
    { value: "subwallet_funding.settled", label: "subwallet_funding.settled (SWF-... Settled)" },
    { value: "subwallet_funding.reversed", label: "subwallet_funding.reversed (SWF-... Reversed)" },
    { value: "subwallet_payout.success", label: "subwallet_payout.success (Member Withdrawal OK)" },
    { value: "subwallet_payout.failed", label: "subwallet_payout.failed (Auto-Refund Member)" },
    { value: "wallet.credited", label: "wallet.credited (Master Treasury Inflow)" },
    { value: "wallet_payout.success", label: "wallet_payout.success (Merchant Payout OK)" },
    { value: "wallet_payout.failed", label: "wallet_payout.failed (Merchant Payout Failed)" },
    { value: "wallet_payout.reversed", label: "wallet_payout.reversed (Merchant Payout Reversed)" },
]

export default function SuperadminInfrastructurePage() {
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [bootstrapping, setBootstrapping] = React.useState(false)
    const [probingLive, setProbingLive] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState<"mappings" | "workflows" | "telemetry">("mappings")

    const [endpoints, setEndpoints] = React.useState<EndpointSpec[]>([])
    const [workflows, setWorkflows] = React.useState<WorkflowSpec[]>([])
    const [settings, setSettings] = React.useState<any>({
        masterFundingAccount: "",
        kycEndpoint: "",
        depositEndpoint: "",
        transferEndpoint: "",
        creditScoreEndpoint: "",
        autoDeductionWorkflow: "",
        cbnReportingWorkflow: "",
        olivepayBindings: {
            subwalletCreateEndpoint: "",
            subwalletTransferEndpoint: "",
            payoutEndpoint: "",
            subwalletPayoutEndpoint: "",
            subwalletFundingEndpoint: "",
            nameEnquiryEndpoint: "",
            feeEstimateEndpoint: "",
            virtualAccountEndpoint: "",
            escrowHoldEndpoint: "",
            releaseHoldEndpoint: "",
            tierUpgradeEndpoint: "",
            payoutStatusEndpoint: "",
            freezeEndpoint: "",
            collectionsInitEndpoint: "",
            bankListEndpoint: "",
            grantDisbursementWorkflow: "",
            escrowSettlementWorkflow: "",
            memberOnboardingWorkflow: "",
        },
    })

    const [endpointHealth, setEndpointHealth] = React.useState<Record<string, { state: "checking" | "healthy" | "unhealthy"; ms?: number }>>({})

    const [partnerBank, setPartnerBank] = React.useState<any>(null)
    const [supportedProviders, setSupportedProviders] = React.useState<any[]>([])
    const [escrowPools, setEscrowPools] = React.useState<any[]>([])
    const [switchingProvider, setSwitchingProvider] = React.useState<string | null>(null)
    const [oliveCap, setOliveCap] = React.useState<any>(null)
    const [oliveStats, setOliveStats] = React.useState<any>({})

    // Live diagnostics & Signed Webhook Simulator states
    const [isRunningDiag, setIsRunningDiag] = React.useState(false)
    const [simEvent, setSimEvent] = React.useState("subwallet.credited")
    const [simAmount, setSimAmount] = React.useState("25000")
    const [simRef, setSimRef] = React.useState("")
    const [simSubWalletId, setSimSubWalletId] = React.useState("")
    const [logs, setLogs] = React.useState<{ msg: string; type: "info" | "success" | "warn" | "error" | "cmd"; timestamp: string }[]>([])
    const logEndRef = React.useRef<HTMLDivElement>(null)

    const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/olivepay` : "/api/webhooks/olivepay"

    React.useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [logs])

    const addLog = (msg: string, type: "info" | "success" | "warn" | "error" | "cmd" = "info") => {
        setLogs((prev) => [...prev, { msg, type, timestamp: new Date().toLocaleTimeString() }])
    }

    const checkEndpointHealth = async (epId: string) => {
        if (!epId) return
        setEndpointHealth((prev) => ({ ...prev, [epId]: { state: "checking" } }))
        const t0 = Date.now()
        try {
            const res = await fetch(`/api/endpoints/health/${epId}`)
            const data = await res.json().catch(() => ({}))
            const ms = data.latencyMs ?? Date.now() - t0
            setEndpointHealth((prev) => ({ ...prev, [epId]: { state: data.healthy ? "healthy" : "unhealthy", ms } }))
        } catch {
            setEndpointHealth((prev) => ({ ...prev, [epId]: { state: "unhealthy", ms: Date.now() - t0 } }))
        }
    }

    const probeAllBoundEndpoints = async () => {
        const boundIds = Array.from(
            new Set(
                [
                    settings.kycEndpoint,
                    settings.creditScoreEndpoint,
                    ...Object.entries(settings.olivepayBindings || {})
                        .filter(([k]) => k.endsWith("Endpoint"))
                        .map(([, v]) => String(v || "")),
                ].filter(Boolean)
            )
        )
        if (boundIds.length === 0) {
            toast.info("No endpoints bound yet. Click 'Bootstrap OlivePay' to bind all endpoints automatically.")
            return
        }
        setIsRunningDiag(true)
        addLog(`> Probing ${boundIds.length} bound infrastructure endpoint(s)...`, "cmd")
        try {
            for (const id of boundIds) {
                const ep = endpoints.find((e) => e.id === id)
                const t0 = Date.now()
                const res = await fetch(`/api/endpoints/health/${id}`)
                const data = await res.json().catch(() => ({}))
                const ms = data.latencyMs ?? Date.now() - t0
                setEndpointHealth((prev) => ({ ...prev, [id]: { state: data.healthy ? "healthy" : "unhealthy", ms } }))
                addLog(
                    `${data.healthy ? "✓" : "✕"} [${ep?.method || "REQ"}] ${ep?.name || id} -> ${data.healthy ? "HEALTHY" : "UNHEALTHY"} (${ms}ms)`,
                    data.healthy ? "success" : "warn"
                )
            }
            toast.success(`Health sweep completed across ${boundIds.length} endpoint(s)`)
        } finally {
            setIsRunningDiag(false)
        }
    }

    const fetchConfig = async (probeLive = false) => {
        try {
            if (!probeLive) setLoading(true)
            const [epRes, wfRes, configRes, pbRes, capRes] = await Promise.all([
                fetch("/api/endpoints?limit=250"),
                fetch("/api/workflows?limit=250"),
                fetch("/api/copteller/infrastructure"),
                fetch("/api/copteller/partner-bank").catch(() => null),
                fetch(`/api/copteller/olivepay/capabilities${probeLive ? "?probeLive=1" : ""}`).catch(() => null),
            ])

            const epData = await epRes.json().catch(() => ({}))
            const wfData = await wfRes.json().catch(() => ({}))
            const configData = await configRes.json().catch(() => ({}))

            if (pbRes?.ok) {
                const pbData = await pbRes.json().catch(() => null)
                if (pbData?.success) {
                    setPartnerBank(pbData.partnerBank)
                    setSupportedProviders(pbData.supportedProviders || [])
                    setEscrowPools(pbData.escrowPools || [])
                }
            }

            if (capRes?.ok) {
                const capData = await capRes.json().catch(() => null)
                if (capData?.success) {
                    setOliveCap(capData.report)
                    setOliveStats(capData.stats || {})
                }
            }

            if (epData.docs) {
                setEndpoints(epData.docs.map((e: any) => ({ id: String(e.id), name: e.name, method: e.method, path: e.path })))
            }
            if (wfData.docs) {
                setWorkflows(wfData.docs.map((w: any) => ({ id: String(w.id), name: w.name, triggerType: w.trigger })))
            }

            if (configData.success && configData.settings?.copteller) {
                const cop = configData.settings.copteller
                const relStr = (v: any) => (typeof v === "object" && v !== null ? String(v.id || "") : String(v || ""))
                setSettings((prev: any) => ({
                    masterFundingAccount: cop.masterFundingAccount || "",
                    kycEndpoint: relStr(cop.kycEndpoint),
                    depositEndpoint: relStr(cop.depositEndpoint),
                    transferEndpoint: relStr(cop.transferEndpoint),
                    creditScoreEndpoint: relStr(cop.creditScoreEndpoint),
                    autoDeductionWorkflow: relStr(cop.autoDeductionWorkflow),
                    cbnReportingWorkflow: relStr(cop.cbnReportingWorkflow),
                    olivepayBindings: { ...prev.olivepayBindings, ...(cop.olivepayBindings || {}) },
                }))
            }
        } catch {
            toast.error("Failed to load platform infrastructure specs")
        } finally {
            setLoading(false)
            setProbingLive(false)
        }
    }

    React.useEffect(() => {
        fetchConfig(false)
    }, [])

    const handleSwitchPartnerBank = async (providerId: string) => {
        setSwitchingProvider(providerId)
        try {
            const res = await fetch("/api/copteller/partner-bank", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: providerId }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "Switch failed")
            setPartnerBank(data.partnerBank)
            if (data.supportedProviders) setSupportedProviders(data.supportedProviders)
            toast.success(`Active settlement rail switched & persisted to ${data.partnerBank.bankName}`)
            await fetchConfig(false)
        } catch (err: any) {
            toast.error(err.message || "Switch failed")
        } finally {
            setSwitchingProvider(null)
        }
    }

    const handleSave = async (e?: React.FormEvent) => {
        e?.preventDefault()
        setSaving(true)
        const tId = toast.loading("Persisting infrastructure endpoint & workflow bindings...")
        try {
            const res = await fetch("/api/copteller/infrastructure", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ copteller: settings }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "Save failed")
            toast.success("Infrastructure mappings saved cleanly!", { id: tId })
            await fetchConfig(false)
        } catch (err: any) {
            toast.error(err.message || "Save failed", { id: tId })
        } finally {
            setSaving(false)
        }
    }

    const handleBootstrapOlivePay = async () => {
        setBootstrapping(true)
        const tId = toast.loading("Bootstrapping OlivePay Blueprint (24 endpoints), 8 Workflows & Infrastructure bindings...")
        try {
            const res = await fetch("/api/workflows/bootstrap?filter=olivepay&bind=1", { method: "POST" })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || "Bootstrap failed")
            toast.success(
                `Bootstrapped OlivePay! ${data.results?.blueprints?.[0]?.endpointsUpserted || 24} endpoints, ${data.summary?.workflowsProcessed || 8} workflows & ${data.summary?.bindingsApplied || 0} bindings wired.`,
                { id: tId }
            )
            await fetchConfig(false)
        } catch (err: any) {
            toast.error(err.message || "Bootstrap failed", { id: tId })
        } finally {
            setBootstrapping(false)
        }
    }

    const handleLiveAction = async (action: "reconcile" | "sync_banks" | "topup_sandbox" | "run_auto_deduct" | "run_cbn") => {
        setIsRunningDiag(true)
        try {
            if (action === "reconcile") {
                addLog("GET /api/cron/olivepay-reconcile -> Running live reconciliation sweep...", "cmd")
                const res = await fetch("/api/cron/olivepay-reconcile")
                const data = await res.json()
                addLog(JSON.stringify(data, null, 2), res.ok ? "success" : "error")
            } else if (action === "sync_banks") {
                addLog("POST /api/copteller/olivepay/capabilities { action: 'sync_banks' }", "cmd")
                const res = await fetch("/api/copteller/olivepay/capabilities", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "sync_banks" }),
                })
                const data = await res.json()
                addLog(JSON.stringify(data, null, 2), data.success ? "success" : "error")
                await fetchConfig(false)
            } else if (action === "topup_sandbox") {
                addLog("POST /api/copteller/olivepay/capabilities { action: 'topup_sandbox_master', amountNaira: 10000000 }", "cmd")
                const res = await fetch("/api/copteller/olivepay/capabilities", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "topup_sandbox_master", amountNaira: 10000000 }),
                })
                const data = await res.json()
                addLog(`Sandbox Master Treasury topped up! New balance: ₦${Number(data.availableBalanceNaira || 0).toLocaleString()}`, "success")
                await fetchConfig(false)
            } else if (action === "run_auto_deduct" || action === "run_cbn") {
                const wfId = action === "run_auto_deduct" ? settings.autoDeductionWorkflow : settings.cbnReportingWorkflow
                if (!wfId) {
                    addLog(`No workflow bound for ${action === "run_auto_deduct" ? "Auto-Deductions" : "CBN Reporting"}. Bind one in Automation Pipelines tab first.`, "warn")
                    return
                }
                addLog(`POST /api/workflows/${wfId}/run -> Executing real bound workflow...`, "cmd")
                const res = await fetch(`/api/workflows/${wfId}/run`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ trigger: "MANUAL", inputData: { initiatedFrom: "infrastructure_console" } }),
                })
                const data = await res.json()
                addLog(JSON.stringify(data, null, 2), res.ok ? "success" : "error")
            }
        } catch (err: any) {
            addLog(`Error: ${err.message}`, "error")
        } finally {
            setIsRunningDiag(false)
        }
    }

    const handleFireSignedWebhook = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsRunningDiag(true)
        addLog(`Signing & firing authentic HMAC-SHA256 webhook [${simEvent}] -> POST /api/webhooks/olivepay...`, "cmd")
        try {
            const res = await fetch("/api/copteller/olivepay/sandbox/simulate-webhook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event: simEvent,
                    amount: Number(simAmount || 5000),
                    transactionId: simRef.trim() || `SIM-${Date.now()}`,
                    subWalletId: simSubWalletId.trim() || undefined,
                }),
            })
            const data = await res.json()
            addLog(JSON.stringify(data, null, 2), data.success ? "success" : "error")
            if (data.success) toast.success(`Signed webhook "${simEvent}" verified & processed!`)
            else toast.error(data.result?.error || data.error || "Webhook failed")
        } catch (err: any) {
            addLog(`Webhook simulation error: ${err.message}`, "error")
        } finally {
            setIsRunningDiag(false)
        }
    }

    const capStatusPill = (status?: string) => {
        if (status === "enabled") return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
        if (status === "sandbox") return "bg-blue-500/15 text-blue-600 border-blue-500/30"
        if (status === "not_enabled" || status === "pending_verification") return "bg-amber-500/15 text-amber-600 border-amber-500/30"
        return "bg-rose-500/15 text-rose-600 border-rose-500/30"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Regulator &amp; Rail Orchestration
                    </span>
                    <h1 className="text-3xl font-black mt-2">System Infrastructure &amp; OlivePay Control</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">
                        Hot-switch financial settlement rails (OlivePay Live, Internal Sandbox Rail, BankSuite, Kuda, Qore), probe capabilities, bind action endpoints, and simulate signed webhooks.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleBootstrapOlivePay} disabled={bootstrapping} variant="outline" className="h-9 rounded-xl border-emerald-500/30 text-emerald-600 font-black text-xs px-3 gap-1.5">
                        <Sparkles className={`h-3.5 w-3.5 ${bootstrapping ? "animate-spin" : ""}`} />
                        {bootstrapping ? "Bootstrapping..." : "Bootstrap OlivePay"}
                    </Button>
                    <Button onClick={() => handleSave()} disabled={saving} className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 border-0 gap-1.5">
                        {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save Bindings
                    </Button>
                </div>
            </div>

            <CoptellerSubsystemNav group="automation" />

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit overflow-x-auto">
                {[
                    { id: "mappings", label: "Rails, OlivePay & Endpoint Bindings", icon: Database },
                    { id: "workflows", label: "Automation Pipelines", icon: Layers },
                    { id: "telemetry", label: "Live Diagnostics & Webhook Simulator", icon: Terminal },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                            activeTab === tab.id ? "bg-white dark:bg-slate-800 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === "mappings" && (
                    <motion.div key="mappings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                        {/* Rail Switcher */}
                        <Card className="border-emerald-500/25 bg-white/70 dark:bg-slate-950/70">
                            <CardHeader className="border-b border-slate-100 dark:border-slate-900/60">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-sm font-black flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-emerald-500" />
                                            Active Settlement Rail (Persisted in Postgres)
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Use Internal Sandbox Testing Rail to actively test every OlivePay feature with zero external keys, then flip to OlivePay Live in 1 click.
                                        </CardDescription>
                                    </div>
                                    {partnerBank && (
                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-black text-[10px]">
                                            ACTIVE: {partnerBank.shortName} {partnerBank.isSandboxRail ? "· TESTING RAIL" : `· CODE ${partnerBank.bankCode}`}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                                                        ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40"
                                                        : "border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50/50 dark:bg-slate-900/40"
                                                }`}
                                            >
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-black text-foreground">{p.shortName}</span>
                                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${p.isSandboxRail ? "bg-blue-500/15 text-blue-600" : p.configured ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                                                            {p.isSandboxRail ? "Always Ready" : p.configured ? "Ready" : "Keys Needed"}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{p.description}</p>
                                                </div>
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800/70 text-[10px] font-bold">
                                                    <span className="font-mono text-muted-foreground">
                                                        {p.supportsEscrowHolds ? "Holds + Tiers 1–3" : `CBN ${p.bankCode}`}
                                                    </span>
                                                    <span className={isActive ? "text-emerald-600 font-black" : "text-slate-500"}>
                                                        {switchingProvider === p.provider ? "Switching..." : isActive ? "● Active Rail" : "Activate →"}
                                                    </span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* OlivePay Runtime Capability Matrix & Vercel Static Proxy Diagnostics */}
                        {oliveCap && (
                            <Card className="border-slate-200 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70">
                                <CardHeader className="border-b border-slate-100 dark:border-slate-900/60">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <CardTitle className="text-sm font-black flex items-center gap-2">
                                                <Radio className="h-4 w-4 text-emerald-500" />
                                                OlivePay Capability Detection Matrix ({oliveCap.railMode})
                                            </CardTitle>
                                            <CardDescription className="text-xs mt-0.5">
                                                Graceful runtime feature detection across Collections, Auth/IP Whitelist, Payouts, SubWallets, Escrow Holds, and Dynamic Virtual Accounts.
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={probingLive}
                                                onClick={() => { setProbingLive(true); fetchConfig(true) }}
                                                className="h-8 rounded-lg text-[11px] font-bold gap-1.5"
                                            >
                                                <RefreshCw className={`h-3 w-3 ${probingLive ? "animate-spin" : ""}`} />
                                                Probe Live API
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {Object.entries(oliveCap.capabilities || {}).map(([capKey, capVal]: [string, any]) => (
                                            <div key={capKey} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-muted/20 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black capitalize">{capKey.replace(/([A-Z])/g, " $1")}</span>
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${capStatusPill(capVal.status)}`}>
                                                        {String(capVal.status || "").replace(/_/g, " ")}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">{capVal.detail}</p>
                                                {capVal.balanceNaira !== undefined && (
                                                    <p className="text-xs font-mono font-black text-emerald-600">
                                                        Master Float: ₦{Number(capVal.balanceNaira).toLocaleString()} ({capVal.walletStatus})
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Vercel Static Proxy & Webhook URL Panel */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <Webhook className="h-3.5 w-3.5 text-emerald-500" /> Unified OlivePay Webhook URL
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 text-[11px] font-mono bg-background px-2.5 py-1.5 rounded-lg border truncate">{webhookUrl}</code>
                                                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Webhook URL copied!") }} className="h-8 px-2.5">
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-start gap-1.5">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                Saving the Webhooks form in OlivePay Dashboard immediately rotates your webhook secret — update OLIVEPAY_WEBHOOK_SECRET in Vault right after.
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <Globe className="h-3.5 w-3.5 text-blue-500" /> Vercel Static Egress IP &amp; Live Counters
                                            </p>
                                            <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                                                <span className={`px-2 py-0.5 rounded-full border ${oliveCap.credentials?.hasStaticProxy ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-amber-500/15 text-amber-600 border-amber-500/30"}`}>
                                                    OLIVEPAY_PROXY_URL: {oliveCap.credentials?.hasStaticProxy ? "Configured" : "Not Set (Vercel Dynamic IP)"}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full bg-muted">SubWallets: {oliveStats.subwallets || 0}</span>
                                                <span className="px-2 py-0.5 rounded-full bg-muted">Active Holds: {oliveStats.active_holds || 0}</span>
                                                <span className="px-2 py-0.5 rounded-full bg-muted">NIP Banks: {oliveStats.cached_banks || 0}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                For Vercel live production against OlivePay IP whitelist, set <code className="font-mono">OLIVEPAY_PROXY_URL</code> (QuotaGuard / Fixie static proxy). Sandbox Rail works immediately with no proxy.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* OlivePay Action Endpoint Connections */}
                        <Card className="border-slate-200 dark:border-slate-900 bg-white/60 dark:bg-slate-950/60">
                            <CardHeader className="border-b border-slate-100 dark:border-slate-900/60">
                                <CardTitle className="text-sm font-black flex items-center gap-2"><Cpu className="h-4 w-4 text-emerald-500" /> Infrastructure Action Endpoint Connections</CardTitle>
                                <CardDescription className="text-xs">Bind core Copteller &amp; OlivePay operations directly to your registered API Endpoint specs.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6 text-xs font-semibold">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Platform Master Funding Account</label>
                                        <Input
                                            value={settings.masterFundingAccount}
                                            onChange={(e) => setSettings({ ...settings, masterFundingAccount: e.target.value })}
                                            placeholder="Master Treasury NUBAN / Ref"
                                            className="h-9 rounded-xl font-mono text-xs"
                                        />
                                    </div>
                                    {[
                                        { key: "subwalletCreateEndpoint", label: "SubWallet Provisioning Endpoint", nested: true },
                                        { key: "subwalletTransferEndpoint", label: "W2W Internal Transfer Endpoint", nested: true },
                                        { key: "subwalletPayoutEndpoint", label: "SubWallet Bank Payout Endpoint", nested: true },
                                        { key: "subwalletFundingEndpoint", label: "Master -> SubWallet Funding Endpoint", nested: true },
                                        { key: "payoutEndpoint", label: "Merchant Master NIP Payout Endpoint", nested: true },
                                        { key: "nameEnquiryEndpoint", label: "NIP Name Enquiry Endpoint", nested: true },
                                        { key: "virtualAccountEndpoint", label: "One-Time Dynamic VA Endpoint", nested: true },
                                        { key: "escrowHoldEndpoint", label: "Place Escrow Hold / Lien Endpoint", nested: true },
                                        { key: "releaseHoldEndpoint", label: "Release Escrow Hold / Lien Endpoint", nested: true },
                                        { key: "tierUpgradeEndpoint", label: "KYC Tier 2/3 Upgrade Endpoint", nested: true },
                                        { key: "payoutStatusEndpoint", label: "Transaction / Payout Status Query", nested: true },
                                        { key: "freezeEndpoint", label: "Freeze / Restrict SubWallet Endpoint", nested: true },
                                        { key: "collectionsInitEndpoint", label: "Hosted Checkout Init Endpoint", nested: true },
                                        { key: "kycEndpoint", label: "Legacy Member KYC Endpoint", nested: false },
                                        { key: "creditScoreEndpoint", label: "Credit Score Engine Endpoint", nested: false },
                                    ].map((field) => {
                                        const currentVal = field.nested ? settings.olivepayBindings?.[field.key] || "" : settings[field.key] || ""
                                        const epHealth = currentVal ? endpointHealth[currentVal] : undefined
                                        return (
                                            <div key={field.key} className="space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 truncate">{field.label}</label>
                                                    {currentVal && (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => checkEndpointHealth(currentVal)}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border bg-background hover:bg-muted text-[9px] font-mono"
                                                                title="Ping endpoint health"
                                                            >
                                                                {epHealth?.state === "checking" ? (
                                                                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                                ) : epHealth?.state === "healthy" ? (
                                                                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                                                                ) : epHealth?.state === "unhealthy" ? (
                                                                    <XCircle className="h-2.5 w-2.5 text-rose-500" />
                                                                ) : (
                                                                    <Activity className="h-2.5 w-2.5 text-muted-foreground" />
                                                                )}
                                                                <span>{epHealth?.ms ? `${epHealth.ms}ms` : "Ping"}</span>
                                                            </button>
                                                            <Link
                                                                href={`/copteller/superadmin/endpoints/${currentVal}`}
                                                                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-primary"
                                                                title="Open in Endpoint Editor"
                                                            >
                                                                <ExternalLink className="h-3 w-3" />
                                                            </Link>
                                                        </div>
                                                    )}
                                                </div>
                                                <Select
                                                    value={currentVal || "none"}
                                                    onValueChange={(v) => {
                                                        const clean = v === "none" ? "" : v
                                                        if (field.nested) {
                                                            setSettings((prev: any) => ({
                                                                ...prev,
                                                                olivepayBindings: { ...prev.olivepayBindings, [field.key]: clean },
                                                            }))
                                                        } else {
                                                            setSettings((prev: any) => ({ ...prev, [field.key]: clean }))
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-9 rounded-xl text-xs">
                                                        <SelectValue placeholder="Select endpoint spec..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="none" className="text-xs text-muted-foreground">— Unbound —</SelectItem>
                                                        {endpoints.map((ep) => (
                                                            <SelectItem key={ep.id} value={ep.id} className="text-xs">
                                                                <Badge variant="outline" className="mr-1.5 uppercase text-[8px]">{ep.method}</Badge> {ep.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {activeTab === "workflows" && (
                    <motion.div key="workflows" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                        <Card className="border-slate-200 dark:border-slate-900 bg-white/60 dark:bg-slate-950/60">
                            <CardHeader className="border-b border-slate-100 dark:border-slate-900/60">
                                <CardTitle className="text-sm font-black flex items-center gap-2"><Layers className="h-4 w-4 text-emerald-500" /> Core &amp; OlivePay Workflow Bindings</CardTitle>
                                <CardDescription className="text-xs">Connect platform financial lifecycles directly to published Copteller workflows.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
                                {[
                                    { key: "memberOnboardingWorkflow", label: "Member SubWallet Onboarding Workflow", nested: true },
                                    { key: "grantDisbursementWorkflow", label: "Grant / Loan Disbursement Workflow", nested: true },
                                    { key: "escrowSettlementWorkflow", label: "Escrow Hold Placement & Settlement Workflow", nested: true },
                                    { key: "autoDeductionWorkflow", label: "Auto-Deductions Rotational Workflow", nested: false },
                                    { key: "cbnReportingWorkflow", label: "CBN Compliance Reporting Workflow", nested: false },
                                ].map((f) => {
                                    const currentVal = f.nested ? settings.olivepayBindings?.[f.key] || "" : settings[f.key] || ""
                                    return (
                                        <div key={f.key} className="space-y-2">
                                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">{f.label}</label>
                                            <Select
                                                value={currentVal || "none"}
                                                onValueChange={(v) => {
                                                    const clean = v === "none" ? "" : v
                                                    if (f.nested) {
                                                        setSettings((prev: any) => ({ ...prev, olivepayBindings: { ...prev.olivepayBindings, [f.key]: clean } }))
                                                    } else {
                                                        setSettings((prev: any) => ({ ...prev, [f.key]: clean }))
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select workflow..." /></SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="none" className="text-xs text-muted-foreground">— Unbound —</SelectItem>
                                                    {workflows.map((w) => (
                                                        <SelectItem key={w.id} value={w.id} className="text-xs">
                                                            <Badge variant="outline" className="mr-2 uppercase text-[8px]">{w.triggerType}</Badge> {w.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {activeTab === "telemetry" && (
                    <motion.div key="telemetry" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        <div className="space-y-4">
                            {/* Live Operational Controls */}
                            <Card className="border-slate-200 dark:border-slate-900 bg-white/60 dark:bg-slate-950/60">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-black flex items-center gap-2"><Play className="h-4 w-4 text-emerald-500" /> Live Rail Operations</CardTitle>
                                    <CardDescription className="text-xs">Execute real backend sweeps, bank syncs, and bound workflows.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-2.5">
                                    <Button onClick={() => handleLiveAction("reconcile")} disabled={isRunningDiag} className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2">
                                        <RefreshCw className={`h-3.5 w-3.5 ${isRunningDiag ? "animate-spin" : ""}`} /> Run OlivePay Reconciler Now
                                    </Button>
                                    <Button onClick={() => handleLiveAction("sync_banks")} disabled={isRunningDiag} variant="outline" className="w-full h-9 rounded-xl font-bold text-xs gap-2">
                                        <Globe className="h-3.5 w-3.5" /> Sync 6-Digit NIP Banks Cache
                                    </Button>
                                    <Button onClick={() => handleLiveAction("topup_sandbox")} disabled={isRunningDiag} variant="outline" className="w-full h-9 rounded-xl font-bold text-xs gap-2 border-blue-500/30 text-blue-600">
                                        <Sparkles className="h-3.5 w-3.5" /> Top Up Sandbox Master (+₦10M)
                                    </Button>
                                    <Button onClick={() => handleLiveAction("run_auto_deduct")} disabled={isRunningDiag} variant="outline" className="w-full h-9 rounded-xl font-bold text-xs gap-2">
                                        <Activity className="h-3.5 w-3.5" /> Execute Bound Auto-Deduction WF
                                    </Button>
                                    <Button onClick={probeAllBoundEndpoints} disabled={isRunningDiag} variant="outline" className="w-full h-9 rounded-xl font-bold text-xs gap-2 border-emerald-500/30 text-emerald-600">
                                        <ShieldCheck className="h-3.5 w-3.5" /> Probe All Bound Endpoints Health
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Signed 14-Event Webhook Simulator */}
                            <Card className="border-emerald-500/20 bg-white/60 dark:bg-slate-950/60">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-black flex items-center gap-2"><Webhook className="h-4 w-4 text-emerald-500" /> Signed Webhook Simulator</CardTitle>
                                    <CardDescription className="text-xs">Signs any of the 14 OlivePay events with real HMAC-SHA256 &amp; delivers to `/api/webhooks/olivepay`.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <form onSubmit={handleFireSignedWebhook} className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">OlivePay Event</label>
                                            <select
                                                value={simEvent}
                                                onChange={(e) => setSimEvent(e.target.value)}
                                                className="w-full h-9 px-2.5 rounded-xl border bg-background text-xs font-bold"
                                            >
                                                {WEBHOOK_EVENT_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">Amount (₦)</label>
                                                <Input type="number" value={simAmount} onChange={(e) => setSimAmount(e.target.value)} className="h-9 rounded-xl text-xs font-mono" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">Ref / TxId</label>
                                                <Input value={simRef} onChange={(e) => setSimRef(e.target.value)} placeholder="Auto" className="h-9 rounded-xl text-xs font-mono" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">Target SubWallet ID (optional)</label>
                                            <Input value={simSubWalletId} onChange={(e) => setSimSubWalletId(e.target.value)} placeholder="UUID for subwallet.* events" className="h-9 rounded-xl text-xs font-mono" />
                                        </div>
                                        <Button type="submit" disabled={isRunningDiag} className="w-full h-9 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-black font-black text-xs">
                                            Sign &amp; Fire Webhook →
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Live Telemetry Terminal */}
                        <div className="lg:col-span-2">
                            <Card className="border-slate-900 bg-[#020202] rounded-3xl overflow-hidden shadow-2xl">
                                <CardHeader className="border-b border-slate-900 bg-[#070707] py-3.5 px-6 flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                        <span className="ml-2 font-mono text-[10px] font-black text-slate-400 uppercase tracking-widest">olivepay_live_telemetry</span>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => setLogs([])} className="h-6 text-[10px] text-slate-400 hover:text-white">
                                        Clear
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-6 font-mono text-[11px] leading-relaxed min-h-[460px] max-h-[600px] overflow-y-auto space-y-2">
                                    {logs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center min-h-[380px] text-slate-500 gap-3">
                                            <Server className="h-8 w-8 opacity-40 text-emerald-500" />
                                            <p className="font-sans text-xs font-semibold">Ready. Execute a live rail operation or fire an HMAC-signed webhook on the left.</p>
                                        </div>
                                    ) : (
                                        logs.map((log, i) => (
                                            <div key={i} className={`flex items-start gap-2.5 ${log.type === "success" ? "text-emerald-400" : log.type === "error" ? "text-rose-400" : log.type === "warn" ? "text-amber-400" : log.type === "cmd" ? "text-indigo-400 font-bold" : "text-slate-300"}`}>
                                                <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                                                <pre className="flex-1 whitespace-pre-wrap break-all">{log.msg}</pre>
                                            </div>
                                        ))
                                    )}
                                    <div ref={logEndRef} />
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
