import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import {
    Shield, Activity, Globe, ChevronRight, Plug, Lock, CheckCircle2, XCircle, ArrowLeft, Info, Building2
} from 'lucide-react'
import { ProviderActions } from './client-actions'
import { ProviderEditor } from './provider-editor'
import { Badge } from '@/components/ui/badge'

const CATEGORY_COLORS: Record<string, string> = {
    PAYMENT: 'bg-emerald-500',
    SMS: 'bg-purple-500',
    EMAIL: 'bg-indigo-500',
    KYC: 'bg-amber-500',
    CREDIT_BUREAU: 'bg-rose-500',
    WEBHOOK: 'bg-teal-500',
    CUSTOM: 'bg-slate-500',
}

export default async function CoptellerProvidersManagerPage({
    searchParams
}: {
    searchParams: Promise<{ id?: string }>
}) {
    const { id: selectedId } = await searchParams
    const payload = await getPayload({ config })

    const [providersRes, secretsRes, cooperativesRes, endpointsRes] = await Promise.all([
        payload.find({ collection: 'service-providers', sort: 'priority', limit: 200, overrideAccess: true }),
        payload.find({ collection: 'secrets', sort: '-updatedAt', limit: 200, overrideAccess: true }),
        payload.find({ collection: 'cooperatives', sort: 'name', limit: 100, overrideAccess: true }),
        payload.find({ collection: 'endpoints', sort: 'name', limit: 500, depth: 0, overrideAccess: true }),
    ])

    const providers = providersRes.docs as any[]
    const secrets = secretsRes.docs as any[]
    const cooperatives = cooperativesRes.docs as any[]
    const endpoints = endpointsRes.docs as any[]

    const endpointsByProvider: Record<string, any[]> = {}
    for (const ep of endpoints) {
        const pid = String(typeof ep.provider === 'object' ? ep.provider?.id : ep.provider)
        if (!endpointsByProvider[pid]) endpointsByProvider[pid] = []
        endpointsByProvider[pid].push(ep)
    }

    const selectedProvider = selectedId
        ? providers.find(p => String(p.id) === String(selectedId))
        : undefined

    const selectedEndpoints = selectedProvider
        ? (endpointsByProvider[String(selectedProvider.id)] ?? [])
        : []

    const isDetailView = !!selectedId

    return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] w-full overflow-hidden bg-muted/10">

            {/* ── LEFT: Provider List ────────────────────────────────── */}
            <aside className={`
                flex flex-col bg-background border-r
                w-full md:w-64 lg:w-72 shrink-0
                ${isDetailView ? 'hidden md:flex' : 'flex'}
            `}>
                <div className="p-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-widest">Service Providers</h2>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{providers.length} registered</p>
                    </div>
                    <ProviderActions />
                </div>

                <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
                    {providers.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground italic">
                            No providers registered. Click the '+' button to add.
                        </div>
                    ) : providers.map((p) => {
                        const isSelected = String(p.id) === String(selectedId)
                        const epCount = endpointsByProvider[String(p.id)]?.length ?? 0
                        const catColor = CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS.CUSTOM
                        
                        // Tenancy check
                        const coopObj = typeof p.cooperative === 'object' && p.cooperative !== null 
                            ? p.cooperative 
                            : cooperatives.find(c => String(c.id) === String(p.cooperative))
                        const isGlobal = !p.cooperative

                        return (
                            <Link
                                key={p.id}
                                href={`/copteller/superadmin/providers?id=${p.id}`}
                                className={`
                                    flex flex-col p-3 rounded-xl transition-all border text-left gap-2
                                    ${isSelected 
                                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/20 shadow-sm' 
                                        : 'bg-background hover:bg-slate-50 dark:hover:bg-slate-900 border-transparent'}
                                `}
                            >
                                <div className="flex items-start justify-between gap-2 min-w-0">
                                    <div className="font-semibold text-xs truncate text-foreground leading-snug">
                                        {p.name}
                                    </div>
                                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${p.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                    <Badge variant="secondary" className={`text-[8px] font-black uppercase tracking-wider py-0 px-1 border-none text-white ${catColor}`}>
                                        {p.category}
                                    </Badge>
                                    <span className="text-[9px] text-muted-foreground font-semibold">
                                        {epCount} API{epCount !== 1 ? 's' : ''}
                                    </span>
                                    
                                    {/* Tenancy Badge */}
                                    <Badge variant="outline" className={`text-[8px] font-bold py-0 px-1.5 ${isGlobal ? 'border-slate-200 dark:border-slate-800 text-muted-foreground' : 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'}`}>
                                        {isGlobal ? 'Global' : coopObj?.name || 'Scoped'}
                                    </Badge>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </aside>

            {/* ── RIGHT/CENTER: Editor / Details Pane ────────────────── */}
            <main className={`
                flex-1 flex flex-col min-w-0 overflow-hidden bg-background
                ${!isDetailView ? 'hidden md:flex' : 'flex'}
            `}>
                {selectedId ? (
                    <div className="flex-1 flex flex-col md:flex-row min-h-0">
                        {/* Editor Panel */}
                        <div className="flex-1 flex flex-col min-h-0">
                            {selectedId === 'new' ? (
                                <ProviderEditor secrets={secrets} cooperatives={cooperatives} />
                            ) : selectedProvider ? (
                                <ProviderEditor provider={selectedProvider} secrets={secrets} cooperatives={cooperatives} />
                            ) : (
                                <div className="flex-grow flex items-center justify-center p-12 text-muted-foreground text-sm italic">
                                    Provider not found.
                                </div>
                            )}
                        </div>

                        {/* Endpoints List Pane (Visible only for existing providers on lg screen) */}
                        {selectedProvider && selectedId !== 'new' && (
                            <div className="hidden lg:flex flex-col w-80 border-l bg-slate-50/20 shrink-0">
                                <div className="p-4 border-b bg-muted/10 shrink-0">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Associated Endpoints</h3>
                                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{selectedEndpoints.length} methods configured</p>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {selectedEndpoints.length === 0 ? (
                                        <div className="text-[10px] text-muted-foreground italic text-center py-8">
                                            No endpoints assigned. Register APIs first.
                                        </div>
                                    ) : selectedEndpoints.map((ep) => (
                                        <Link
                                            key={ep.id}
                                            href={`/copteller/superadmin/endpoints?id=${ep.id}`}
                                            className="block p-3 bg-background border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-sm transition-all text-left"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                                    ep.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {ep.method}
                                                </span>
                                                <ChevronRight size={12} className="text-muted-foreground" />
                                            </div>
                                            <div className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">{ep.name}</div>
                                            <div className="text-[10px] font-mono truncate text-muted-foreground mt-0.5">{ep.path}</div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                        <Plug className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">API Provider Configuration</h3>
                        <p className="text-[11px] text-muted-foreground max-w-xs mt-1 font-semibold leading-relaxed">
                            Select a Service Provider from the left panel to configure credentials, Base URLs, metadata, and cooperative tenancy constraints.
                        </p>
                    </div>
                )}
            </main>
        </div>
    )
}
