"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    KeyRound, Copy, X, Shield, CheckCircle2, RefreshCw, AlertTriangle,
    Webhook, Lock, Trash2, Edit2, Save, Plus, Link2, ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { SidePanelWrapper } from "@/components/side-panel-wrapper"
import { CoptellerSubsystemNav } from "@/components/copteller/subsystem-nav"

interface VaultSecret {
    id: string
    name: string
    category: string
    description: string
    encrypted: boolean
    masked_value: string
    linkedProviders: string[]
    last_rotated_at?: string
    created_at?: string
    updated_at?: string
}

interface WebhookLogRow {
    id: number
    event_type: string
    dedupe_reference: string
    signature_valid: boolean
    processing_status: string
    error_message?: string
    rail_mode: string
    processed_at?: string
    created_at: string
}

const SECRET_CATEGORIES = [
    { value: "API_KEY", label: "API Key (Public / Secret)" },
    { value: "WEBHOOK_SECRET", label: "Webhook Signing Secret" },
    { value: "OAUTH_TOKEN", label: "OAuth / Bearer Token" },
    { value: "QORE_API_TOKEN", label: "Qore / BankOne Token" },
    { value: "SMTP", label: "SMTP / Email Credentials" },
    { value: "DATABASE_URI", label: "Database URI" },
    { value: "CUSTOM", label: "Custom Secret" },
]

const OLIVEPAY_REQUIRED_SECRETS = [
    { name: "OLIVEPAY_PUBLIC_KEY", category: "API_KEY", hint: "OlivePay Public Key (P-...-K) — Collections & Auth Token" },
    { name: "OLIVEPAY_SECRET_KEY", category: "API_KEY", hint: "OlivePay Secret Key (S-...-K) — Auth Token & Outbound HMAC-SHA256" },
    { name: "OLIVEPAY_WEBHOOK_SECRET", category: "WEBHOOK_SECRET", hint: "Separate OlivePay Webhook Secret — rotates whenever Dashboard Webhook form is saved!" },
]

export default function SuperadminVaultPage() {
    const [secrets, setSecrets] = React.useState<VaultSecret[]>([])
    const [webhooks, setWebhooks] = React.useState<WebhookLogRow[]>([])
    const [auditEvents, setAuditEvents] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [selected, setSelected] = React.useState<VaultSecret | null>(null)
    const [activeTab, setActiveTab] = React.useState<"vault" | "webhooks" | "add">("vault")

    // In-place secret value replacement modal / inline form
    const [updatingValue, setUpdatingValue] = React.useState(false)
    const [replacementValue, setReplacementValue] = React.useState("")
    const [rotatingId, setRotatingId] = React.useState<string | null>(null)
    const [lastRotatedPlaintext, setLastRotatedPlaintext] = React.useState<{ name: string; value: string } | null>(null)

    // New secret form
    const [newName, setNewName] = React.useState("")
    const [newCategory, setNewCategory] = React.useState("API_KEY")
    const [newDescription, setNewDescription] = React.useState("")
    const [newValue, setNewValue] = React.useState("")
    const [saving, setSaving] = React.useState(false)

    const fetchVault = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/copteller/superadmin/vault")
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to load vault")
            setSecrets(data.secrets || [])
            setWebhooks(data.webhooks || [])
            setAuditEvents(data.events || [])
            if (selected) {
                const updatedSel = (data.secrets || []).find((s: VaultSecret) => s.id === selected.id)
                setSelected(updatedSel || null)
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to load vault")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchVault()
    }, [])

    const handleSaveNew = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim() || !newValue.trim()) return toast.error("Secret name and value are required")
        setSaving(true)
        const tId = toast.loading("Encrypting & storing secret (AES-256-GCM)...")
        try {
            // If a secret with this exact name exists, update in-place via PUT!
            const exists = secrets.find((s) => s.name.toLowerCase() === newName.trim().toLowerCase())
            const res = await fetch("/api/copteller/superadmin/vault", {
                method: exists ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(exists ? { id: exists.id } : {}),
                    name: newName.trim(),
                    category: newCategory,
                    description: newDescription.trim(),
                    value: newValue.trim(),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to store secret")
            toast.success(exists ? `Updated "${newName}" in-place (AES-256-GCM).` : `Added "${newName}" to encrypted Vault.`, { id: tId })
            setNewName("")
            setNewDescription("")
            setNewValue("")
            setActiveTab("vault")
            await fetchVault()
        } catch (err: any) {
            toast.error(err.message || "Error saving secret", { id: tId })
        } finally {
            setSaving(false)
        }
    }

    const handleReplaceValue = async (secret: VaultSecret) => {
        if (!replacementValue.trim()) return toast.error("Paste the new secret value first")
        setUpdatingValue(true)
        const tId = toast.loading(`Encrypting new value for ${secret.name}...`)
        try {
            const res = await fetch("/api/copteller/superadmin/vault", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: secret.id, value: replacementValue.trim() }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to update secret")
            toast.success(`"${secret.name}" updated in-place! All linked providers immediately use the new value.`, { id: tId })
            setReplacementValue("")
            await fetchVault()
        } catch (err: any) {
            toast.error(err.message || "Update failed", { id: tId })
        } finally {
            setUpdatingValue(false)
        }
    }

    const handleRotateRandom = async (secret: VaultSecret) => {
        if (!confirm(`Generate a new random internal key for "${secret.name}"? (Do NOT use this for 3rd-party OlivePay keys — paste those via Replace Value instead.)`)) {
            return
        }
        setRotatingId(secret.id)
        const tId = toast.loading(`Rotating ${secret.name}...`)
        try {
            const res = await fetch("/api/copteller/superadmin/vault", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: secret.id }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to rotate")
            if (data.rotatedKey) {
                setLastRotatedPlaintext({ name: secret.name, value: data.rotatedKey })
            }
            toast.success(`Key rotated for ${secret.name}. Copy the one-time value shown above.`, { id: tId })
            await fetchVault()
        } catch (err: any) {
            toast.error(err.message || "Rotation failed", { id: tId })
        } finally {
            setRotatingId(null)
        }
    }

    const handleDelete = async (secret: VaultSecret) => {
        if (!confirm(`Permanently delete vault secret "${secret.name}"?`)) return
        try {
            const res = await fetch(`/api/copteller/superadmin/vault?id=${encodeURIComponent(secret.id)}`, { method: "DELETE" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Delete failed")
            toast.success(`Secret "${secret.name}" deleted`)
            setSelected(null)
            await fetchVault()
        } catch (err: any) {
            toast.error(err.message || "Delete failed")
        }
    }

    const quickConfigureOlivePaySecret = (preset: { name: string; category: string; hint: string }) => {
        const existing = secrets.find((s) => s.name.toLowerCase() === preset.name.toLowerCase())
        if (existing) {
            setSelected(existing)
            setActiveTab("vault")
            toast.info(`Selected ${preset.name} — paste the live key in "Replace Secret Value" on the right panel.`)
        } else {
            setNewName(preset.name)
            setNewCategory(preset.category)
            setNewDescription(preset.hint)
            setActiveTab("add")
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        AES-256-GCM Unified Vault
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Secrets Vault &amp; Webhook Inbox</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold max-w-2xl">
                        Canonical AES-256-GCM credential vault shared by OlivePay, Service Providers, Dynamic Endpoints, and the Workflow Engine. Plaintext values are never returned after encryption.
                    </p>
                </div>
                <Button onClick={fetchVault} variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-2">
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Vault
                </Button>
            </div>

            <CoptellerSubsystemNav group="automation" />

            {/* One-time rotated key banner */}
            {lastRotatedPlaintext && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-xs font-black text-amber-600 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4" /> One-Time Rotated Key for {lastRotatedPlaintext.name}
                        </p>
                        <code className="text-xs font-mono block break-all bg-background/80 px-2.5 py-1 rounded-lg border">
                            {lastRotatedPlaintext.value}
                        </code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" onClick={() => { navigator.clipboard.writeText(lastRotatedPlaintext.value); toast.success("Copied!") }} className="text-xs font-bold gap-1.5">
                            <Copy className="h-3.5 w-3.5" /> Copy Once
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setLastRotatedPlaintext(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* OlivePay 3-Key Quick Readiness Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {OLIVEPAY_REQUIRED_SECRETS.map((req) => {
                    const match = secrets.find((s) => s.name.toLowerCase() === req.name.toLowerCase())
                    return (
                        <button
                            key={req.name}
                            onClick={() => quickConfigureOlivePaySecret(req)}
                            className={`text-left p-4 rounded-2xl border transition-all ${
                                match
                                    ? "bg-emerald-500/5 border-emerald-500/25 hover:border-emerald-500/50"
                                    : "bg-amber-500/5 border-amber-500/25 hover:border-amber-500/50"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-black truncate">{req.name}</span>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${match ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                                    {match ? "Stored" : "Configure"}
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{req.hint}</p>
                        </button>
                    )
                })}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit">
                {(
                    [
                        { id: "vault", label: `Vault Secrets (${secrets.length})` },
                        { id: "webhooks", label: `Webhook Inbox (${webhooks.length})` },
                        { id: "add", label: "+ Store Secret" },
                    ] as const
                ).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-xs font-black whitespace-nowrap transition-all ${
                            activeTab === tab.id ? "bg-white dark:bg-slate-800 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === "vault" && (
                    <motion.div key="vault" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        <div className="lg:col-span-2 space-y-3">
                            {secrets.length === 0 ? (
                                <div className="bg-card border border-dashed rounded-2xl p-10 text-center space-y-2">
                                    <KeyRound className="h-8 w-8 mx-auto text-muted-foreground/40" />
                                    <p className="text-xs font-bold text-muted-foreground">No encrypted secrets stored in Vault yet.</p>
                                    <p className="text-[11px] text-muted-foreground">Click any OlivePay preset above or "+ Store Secret" to add credentials.</p>
                                </div>
                            ) : (
                                secrets.map((secret) => (
                                    <div
                                        key={secret.id}
                                        onClick={() => { setSelected(selected?.id === secret.id ? null : secret); setReplacementValue("") }}
                                        className={`bg-white dark:bg-slate-950/60 border rounded-2xl p-4 sm:p-5 shadow-sm cursor-pointer transition-all hover:border-emerald-500/40 ${
                                            selected?.id === secret.id ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : "border-slate-200 dark:border-slate-900"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                                <KeyRound className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-black font-mono truncate">{secret.name}</p>
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-600 shrink-0">
                                                        {secret.category}
                                                    </span>
                                                </div>
                                                {secret.description && (
                                                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{secret.description}</p>
                                                )}
                                                <div className="mt-3 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                                                    <span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                                                        <Lock className="h-3 w-3 text-emerald-500" /> {secret.masked_value}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-muted-foreground">
                                                        Rotated: {secret.last_rotated_at ? new Date(secret.last_rotated_at).toLocaleDateString() : "Initial"}
                                                    </span>
                                                </div>
                                                {secret.linkedProviders?.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                        <Link2 className="h-3 w-3 text-muted-foreground" />
                                                        {secret.linkedProviders.map((p) => (
                                                            <span key={p} className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                                                {p}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <SidePanelWrapper
                            isOpen={Boolean(selected)}
                            onClose={() => setSelected(null)}
                            title="Vault Secret"
                            emptyState={
                                <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-8 text-center space-y-2">
                                    <Shield className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
                                    <p className="text-xs font-black text-muted-foreground">Select a Vault Secret</p>
                                    <p className="text-[11px] text-muted-foreground/80">
                                        Replace third-party keys in-place (e.g., OlivePay keys), rotate internal tokens, or remove unused entries.
                                    </p>
                                </div>
                            }
                            className="w-full"
                        >
                            {selected && (
                                <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 shadow-sm space-y-5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Encrypted Vault Entry #{selected.id}</span>
                                            <h3 className="text-sm font-black font-mono mt-0.5 break-all">{selected.name}</h3>
                                        </div>
                                        <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-2 text-xs border-y py-3 border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-mono font-bold">{selected.category}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Cipher</span><span className="font-bold text-emerald-600">AES-256-GCM</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Last Updated</span><span className="font-bold">{selected.updated_at ? new Date(selected.updated_at).toLocaleString() : "—"}</span></div>
                                    </div>

                                    {/* In-place Paste / Update Value */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                                            Replace Secret Value In-Place (3rd-Party Keys)
                                        </label>
                                        <input
                                            type="password"
                                            value={replacementValue}
                                            onChange={(e) => setReplacementValue(e.target.value)}
                                            placeholder="Paste live API key or rotated webhook secret..."
                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-mono"
                                        />
                                        <Button
                                            onClick={() => handleReplaceValue(selected)}
                                            disabled={updatingValue || !replacementValue.trim()}
                                            className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                            {updatingValue ? "Encrypting..." : "Encrypt & Update In-Place"}
                                        </Button>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                        <Button
                                            onClick={() => handleRotateRandom(selected)}
                                            disabled={rotatingId === selected.id}
                                            variant="outline"
                                            className="w-full h-9 rounded-xl text-xs font-bold"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${rotatingId === selected.id ? "animate-spin" : ""}`} />
                                            Generate Random Key (Internal Only)
                                        </Button>
                                        <Button
                                            onClick={() => handleDelete(selected)}
                                            variant="outline"
                                            className="w-full h-9 rounded-xl text-xs font-bold border-rose-500/20 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Secret
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </SidePanelWrapper>
                    </motion.div>
                )}

                {activeTab === "webhooks" && (
                    <motion.div key="webhooks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="text-sm font-black flex items-center gap-2">
                                    <Webhook className="h-4 w-4 text-emerald-500" /> OlivePay Idempotent Webhook Inbox
                                </h3>
                                <span className="text-[10px] font-mono text-muted-foreground">POST /api/webhooks/olivepay</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900/60 border-b">
                                        <tr>
                                            {["Event", "Dedupe Reference", "Rail", "HMAC", "Status", "Received"].map((h) => (
                                                <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-semibold">
                                        {webhooks.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                                                    No webhook deliveries recorded yet. Fire a test event from Superadmin Infrastructure → Telemetry &amp; Webhook Simulator.
                                                </td>
                                            </tr>
                                        ) : (
                                            webhooks.map((evt) => (
                                                <tr key={evt.id} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-mono font-bold">{evt.event_type}</td>
                                                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{evt.dedupe_reference}</td>
                                                    <td className="px-4 py-3"><span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-muted">{evt.rail_mode}</span></td>
                                                    <td className="px-4 py-3">
                                                        {evt.signature_valid ? (
                                                            <span className="text-emerald-600 flex items-center gap-1 text-[10px] font-bold"><ShieldCheck className="h-3.5 w-3.5" /> Valid</span>
                                                        ) : (
                                                            <span className="text-rose-600 text-[10px] font-bold">Invalid</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${evt.processing_status === "PROCESSED" ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"}`}>
                                                            {evt.processing_status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                        {new Date(evt.created_at).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {auditEvents.length > 0 && (
                            <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Vault Audit Trail</h3>
                                <div className="space-y-2 text-xs">
                                    {auditEvents.map((a: any) => (
                                        <div key={a.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-900 last:border-0">
                                            <span className="font-mono font-bold text-foreground">{a.action}</span>
                                            <span className="text-muted-foreground truncate flex-1 text-right">{a.actor_name} · {new Date(a.created_at).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === "add" && (
                    <motion.div key="add" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-2xl">
                        <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-sm space-y-5">
                            <h3 className="text-sm font-black flex items-center gap-2"><Plus className="h-4 w-4 text-emerald-500" /> Store New Encrypted Secret</h3>
                            <form onSubmit={handleSaveNew} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Secret Name *</label>
                                    <input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g., OLIVEPAY_PUBLIC_KEY"
                                        required
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-mono font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Category *</label>
                                    <select
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold"
                                    >
                                        {SECRET_CATEGORIES.map((c) => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Secret Value (Encrypted with AES-256-GCM) *</label>
                                    <input
                                        type="password"
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        placeholder="Paste API key, private key, or webhook secret..."
                                        required
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Description</label>
                                    <textarea
                                        rows={2}
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        placeholder="Where this credential is used..."
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button type="button" onClick={() => setActiveTab("vault")} variant="outline" className="flex-1 h-10 rounded-xl text-xs font-bold">Cancel</Button>
                                    <Button type="submit" disabled={saving} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs border-0">
                                        {saving ? <><RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />Encrypting...</> : <><Save className="h-3.5 w-3.5 mr-2" />Encrypt &amp; Save</>}
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
