'use client'

import React, { useState } from 'react'
import { Globe, Lock, Key, Database, Plus, Trash2, Loader2, Save, Building2 } from 'lucide-react'
import { saveProvider, deleteProvider } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

const KNOWN_META_FIELDS: Record<string, string> = {
    institutionCode: 'Institution/MFB code (e.g. 0017). Auto-injected as ?mfbCode= in API calls.',
    authMode: 'Auth injection mode: QUERY_PARAM or BODY_FIELD',
    authQueryParamKey: 'Query param key for auth token (e.g. authToken)',
    authBodyFieldKey: 'Body field name for auth token (e.g. AuthenticationCode)',
    bankOneVersion: 'BankOne API version suffix (e.g. 2)',
    responseWrapper: 'Response envelope type (e.g. BankOne-Standard)',
    successPath: 'JSON path to success flag in response (e.g. IsSuccessful)',
    dataPath: 'JSON path to payload data (e.g. Payload)',
}

type MetaEntry = { key: string; value: string }

function metaToEntries(obj: Record<string, any>): MetaEntry[] {
    return Object.entries(obj ?? {}).map(([key, value]) => ({ key, value: String(value) }))
}
function entriesToMeta(entries: MetaEntry[]): Record<string, string> {
    return Object.fromEntries(entries.filter(e => e.key.trim()).map(e => [e.key.trim(), e.value]))
}

interface ProviderEditorProps {
    provider?: any
    secrets: any[]
    cooperatives: any[]
}

export function ProviderEditor({ provider, secrets, cooperatives }: ProviderEditorProps) {
    const isNew = provider?.id === 'new' || !provider
    const [formData, setFormData] = useState({
        name: provider?.name || '',
        slug: provider?.slug || '',
        category: provider?.category || 'PAYMENT',
        baseUrl: provider?.baseUrl || '',
        healthCheckUrl: provider?.healthCheckUrl || '',
        authType: provider?.authType || 'API_KEY',
        authQueryParamKey: provider?.authQueryParamKey || 'authToken',
        authBodyFieldKey: provider?.authBodyFieldKey || 'AuthenticationCode',
        secret: typeof provider?.secret === 'object' && provider.secret !== null ? String(provider.secret.id) : String(provider?.secret || ''),
        secondarySecretId: String(provider?.metadata?.secondarySecretId || ''),
        webhookSecretId: String(provider?.metadata?.webhookSecretId || ''),
        isActive: provider?.isActive ?? true,
        priority: provider?.priority || 1,
        groupTag: provider?.groupTag || '',
        cooperative: typeof provider?.cooperative === 'object' && provider.cooperative !== null ? provider.cooperative.id : provider?.cooperative || '',
    })

    const [metaEntries, setMetaEntries] = useState<MetaEntry[]>(
        metaToEntries(provider?.metadata ?? {})
    )

    const addMeta = () => setMetaEntries(prev => [...prev, { key: '', value: '' }])
    const updateMeta = (i: number, field: 'key' | 'value', v: string) =>
        setMetaEntries(prev => { const e = [...prev]; e[i] = { ...e[i], [field]: v }; return e })
    const removeMeta = (i: number) => setMetaEntries(prev => prev.filter((_, idx) => idx !== i))
    const addKnownMeta = (key: string) => {
        if (metaEntries.some(e => e.key === key)) return
        setMetaEntries(prev => [...prev, { key, value: '' }])
    }

    const [isSaving, setIsSaving] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        if (!formData.name || !formData.slug || !formData.baseUrl) {
            toast.error('Name, Slug, and Base URL are required.')
            return
        }

        const secObj = secrets.find((s) => String(s.id) === String(formData.secondarySecretId))
        const whObj = secrets.find((s) => String(s.id) === String(formData.webhookSecretId))
        const mergedMetadata: Record<string, any> = {
            ...entriesToMeta(metaEntries),
            ...(formData.secondarySecretId
                ? { secondarySecretId: Number(formData.secondarySecretId) || formData.secondarySecretId, secondarySecretName: secObj?.name || '' }
                : {}),
            ...(formData.webhookSecretId
                ? { webhookSecretId: Number(formData.webhookSecretId) || formData.webhookSecretId, webhookSecretName: whObj?.name || '' }
                : {}),
        }

        const { secondarySecretId: _s, webhookSecretId: _w, ...coreFields } = formData
        const payloadData: any = {
            ...coreFields,
            metadata: mergedMetadata,
            cooperative: formData.cooperative || null,
        }
        if (payloadData.authType === 'NONE' || !payloadData.secret) {
            payloadData.secret = null
        }

        setIsSaving(true)
        try {
            await saveProvider(isNew ? null : provider.id, payloadData)
            toast.success("Provider saved successfully.")
            router.push('/copteller/superadmin/providers')
        } catch (e: any) {
            toast.error(e.message || "Failed to save provider.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this provider?')) return
        setIsSaving(true)
        try {
            await deleteProvider(provider.id)
            toast.success("Provider deleted.")
            router.push('/copteller/superadmin/providers')
        } catch (e: any) {
            toast.error(e.message || "Failed to delete provider.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-background border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="shrink-0 border-b bg-muted/20 px-4 h-14 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Globe size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                        <h1 className="text-xs font-black uppercase tracking-widest truncate leading-tight">
                            {isNew ? 'Register Provider' : provider?.name}
                        </h1>
                        {!isNew && (
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate leading-tight mt-0.5 font-bold uppercase tracking-tight">
                                <span className="font-mono">{provider?.category}</span>
                                <span>&bull;</span>
                                <span className="font-mono truncate">{provider?.slug}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {!isNew && (
                        <button
                            onClick={handleDelete}
                            disabled={isSaving}
                            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={13} />
                            <span>Delete</span>
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        <span>{isSaving ? 'Saving…' : 'Save'}</span>
                    </button>
                </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 pb-20">
                <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b pb-2 text-muted-foreground">
                        <Globe size={14} /> Basic Configuration
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Provider Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full text-xs font-medium rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                placeholder="Paystack"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Slug Identifier</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                className="w-full text-xs font-mono rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                placeholder="paystack"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full text-xs font-bold rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                            >
                                <option value="SMS">SMS Gateway</option>
                                <option value="EMAIL">Email SMTP</option>
                                <option value="PAYMENT">Payment Processing</option>
                                <option value="KYC">KYC Verification</option>
                                <option value="CREDIT_BUREAU">Credit Bureau</option>
                                <option value="WEBHOOK">Webhook</option>
                                <option value="CUSTOM">Custom Integration</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Priority Weight</label>
                            <input
                                type="number"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                                className="w-full text-xs font-medium rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                    <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b pb-2 text-muted-foreground">
                        <Building2 size={14} /> Tenancy Scope
                    </h3>
                    <div className="max-w-md">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Cooperative Scope</label>
                        <select
                            value={formData.cooperative}
                            onChange={(e) => setFormData({ ...formData, cooperative: e.target.value })}
                            className="w-full text-xs font-bold rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        >
                            <option value="">Global / System-Wide (Shared)</option>
                            {cooperatives.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                            Assigning a cooperative scopes access. Only members/workflows belonging to this cooperative can interact with this provider.
                        </p>
                    </div>
                </section>

                <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                    <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b pb-2 text-muted-foreground">
                        <Lock size={14} /> Server Endpoint & Authentication
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Base URL</label>
                            <input
                                type="text"
                                value={formData.baseUrl}
                                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                                className="w-full text-xs font-mono rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                placeholder="https://api.paystack.co"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Authentication Type</label>
                            <select
                                value={formData.authType}
                                onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                                className="w-full text-xs font-bold rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                            >
                                <option value="NONE">None</option>
                                <option value="API_KEY">API Key (Dual URL/Body)</option>
                                <option value="BEARER">Bearer Token</option>
                                <option value="HEADER">Custom Header</option>
                                <option value="QUERY_PARAM">Query Parameter</option>
                                <option value="BASIC">Basic Auth</option>
                                <option value="OAUTH2">OAuth 2.0 Bearer</option>
                                <option value="OLIVEPAY_PUBLIC_BEARER">OlivePay Public Key (Collections)</option>
                                <option value="OLIVEPAY_JWT">OlivePay JWT (SubWallet / VA)</option>
                                <option value="OLIVEPAY_JWT_HMAC">OlivePay JWT + HMAC-SHA256 (Payouts)</option>
                            </select>
                        </div>
                        {formData.authType !== 'NONE' && (
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Primary Vault Secret (API / Public Key)</label>
                                <select
                                    value={formData.secret}
                                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                                    className="w-full text-xs font-bold rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                                >
                                    <option value="">Select a Secret from Vault...</option>
                                    {secrets.map((s) => (
                                        <option key={s.id} value={String(s.id)}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Secondary Vault Secret (e.g. OlivePay Secret Key)</label>
                            <select
                                value={formData.secondarySecretId}
                                onChange={(e) => setFormData({ ...formData, secondarySecretId: e.target.value })}
                                className="w-full text-xs font-bold rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                            >
                                <option value="">None (Optional)</option>
                                {secrets.map((s) => (
                                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Webhook Vault Secret (Inbound HMAC)</label>
                            <select
                                value={formData.webhookSecretId}
                                onChange={(e) => setFormData({ ...formData, webhookSecretId: e.target.value })}
                                className="w-full text-xs font-bold rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                            >
                                <option value="">None (Optional)</option>
                                {secrets.map((s) => (
                                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Health Check URL (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.healthCheckUrl}
                                    onChange={(e) => setFormData({ ...formData, healthCheckUrl: e.target.value })}
                                    className="w-full text-xs font-mono rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                                    placeholder="https://api.olivepayment.com/api/v1/merchant-api/payouts/banks"
                                />
                            </div>
                            <label className="flex items-center gap-2.5 pt-5 cursor-pointer text-xs font-bold">
                                <input
                                    type="checkbox"
                                    checked={Boolean(formData.isActive)}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="rounded border-slate-300"
                                />
                                Provider Active (Available to Endpoints &amp; Workflows)
                            </label>
                        </div>
                    </div>
                </section>

                <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                            <Database size={14} /> Provider Metadata Config
                        </h3>
                        <button
                            onClick={addMeta}
                            className="text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
                        >
                            <Plus size={12} /> Add Field
                        </button>
                    </div>

                    <div className="space-y-2">
                        {metaEntries.map((entry, idx) => (
                            <div key={idx} className="flex gap-2 items-center group">
                                <input
                                    type="text"
                                    placeholder="Key"
                                    value={entry.key}
                                    onChange={(e) => updateMeta(idx, 'key', e.target.value)}
                                    className="w-1/3 text-xs font-mono rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                                />
                                <input
                                    type="text"
                                    placeholder="Value"
                                    value={entry.value}
                                    onChange={(e) => updateMeta(idx, 'value', e.target.value)}
                                    className="flex-1 text-xs font-mono rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                                />
                                <button
                                    onClick={() => removeMeta(idx)}
                                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        ))}

                        {metaEntries.length === 0 && (
                            <div className="text-[10px] text-muted-foreground italic text-center py-4 border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                                No metadata overrides defined.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
