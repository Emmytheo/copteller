'use client'

import React, { useState } from 'react'
import { ArrowLeft, Save, Play, Loader2, CheckCircle2, XCircle, Globe, Building2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Shield, Settings, Database, Activity } from 'lucide-react'

export function CoptellerEndpointEditorLayout({ endpointId, initialData, dynamicOptions }: any) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'definition' | 'test'>('definition')

    const [formData, setFormData] = useState(initialData || {
        name: '',
        description: '',
        provider: dynamicOptions.providers[0]?.id || '',
        method: 'GET',
        path: '',
        status: 'active',
        headers: [],
        queryParams: [],
        authOverride: 'INHERIT',
        authBodyFieldKey: 'AuthenticationCode',
        authQueryParamKey: 'authToken',
        queryParamsSchema: {},
        bodySchema: {},
        responseSchema: {},
        cooperative: '',
    })

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const url = endpointId === 'new' ? '/api/endpoints' : `/api/endpoints/${endpointId}`
            const method = endpointId === 'new' ? 'POST' : 'PATCH'
            
            const payloadData = {
                ...formData,
                provider: typeof formData.provider === 'object' ? formData.provider.id : formData.provider,
                cooperative: formData.cooperative || null
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadData)
            })

            if (!res.ok) throw new Error('Failed to save endpoint')
            
            const savedData = await res.json()
            toast.success('Endpoint saved successfully')
            
            if (endpointId === 'new') {
                router.push(`/copteller/superadmin/endpoints`)
            }
        } catch (e: any) {
            toast.error(e.message || 'An error occurred')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
            {/* Header */}
            <header className="shrink-0 border-b bg-muted/20">
                <div className="flex items-center gap-2 px-4 h-14 justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link href="/copteller/superadmin/endpoints" className="text-muted-foreground hover:text-foreground shrink-0">
                            <ArrowLeft size={16} />
                        </Link>
                        <div className="h-4 w-px bg-border my-auto shrink-0" />
                        <input
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="Endpoint Name"
                            className="bg-transparent border-0 focus:ring-0 text-xs font-black uppercase tracking-widest p-0 min-w-0 w-full outline-none truncate"
                        />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center bg-muted p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('definition')}
                                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors ${activeTab === 'definition' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Definition
                            </button>
                            <button
                                onClick={() => setActiveTab('test')}
                                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors ${activeTab === 'test' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Test Console
                            </button>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                        >
                            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                            <span>Save</span>
                        </button>
                    </div>
                </div>

                <div className="flex sm:hidden border-t">
                    <button
                        onClick={() => setActiveTab('definition')}
                        className={`flex-1 text-[10px] font-black uppercase tracking-widest py-2.5 transition-colors border-b-2 ${activeTab === 'definition' ? 'border-emerald-500 text-foreground' : 'border-transparent text-muted-foreground'}`}
                    >
                        Definition
                    </button>
                    <button
                        onClick={() => setActiveTab('test')}
                        className={`flex-1 text-[10px] font-black uppercase tracking-widest py-2.5 transition-colors border-b-2 ${activeTab === 'test' ? 'border-emerald-500 text-foreground' : 'border-transparent text-muted-foreground'}`}
                    >
                        Test Console
                    </button>
                </div>
            </header>

            {/* Layout Body */}
            <div className="flex-1 overflow-auto bg-muted/10 p-3 sm:p-6 lg:p-8">
                <div className="max-w-5xl mx-auto border bg-background border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    {activeTab === 'definition' ? (
                        <DefinitionTab formData={formData} setFormData={setFormData} dynamicOptions={dynamicOptions} />
                    ) : (
                        <TestConsoleTab formData={formData} dynamicOptions={dynamicOptions} />
                    )}
                </div>
            </div>
        </div>
    )
}

function DefinitionTab({ formData, setFormData, dynamicOptions }: any) {
    const handleJsonUpdate = (key: string, value: string) => {
        try {
            const parsed = value ? JSON.parse(value) : {};
            setFormData({...formData, [key]: parsed});
        } catch(e) {
            setFormData({...formData, [key]: value}); 
        }
    }

    const displayJson = (obj: any) => typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)

    return (
        <div className="p-6 space-y-8">
            {/* Core routing */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <Database size={14} />
                    Core Configuration
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/10 p-4 rounded-xl border border-slate-100 dark:border-slate-900">
                    <div>
                        <label className="block text-[10px] font-black mb-1.5 text-muted-foreground uppercase tracking-wider">Provider</label>
                        <select 
                            value={typeof formData.provider === 'object' ? formData.provider.id : formData.provider}
                            onChange={(e) => setFormData({...formData, provider: e.target.value})}
                            className="w-full text-xs font-bold rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        >
                            {dynamicOptions.providers.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black mb-1.5 text-muted-foreground uppercase tracking-wider">Method</label>
                        <select 
                            value={formData.method}
                            onChange={(e) => setFormData({...formData, method: e.target.value})}
                            className="w-full text-xs font-bold rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2 font-mono"
                        >
                            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black mb-1.5 text-muted-foreground uppercase tracking-wider">Status</label>
                        <select 
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            className="w-full text-xs font-bold rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                        >
                            <option value="active">Active</option>
                            <option value="deprecated">Deprecated</option>
                            <option value="draft">Draft</option>
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-[10px] font-black mb-1.5 text-muted-foreground uppercase tracking-wider font-mono">Endpoint Path</label>
                        <div className="flex items-center rounded-lg border bg-background border-slate-200 dark:border-slate-800 overflow-hidden px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                            <span className="text-muted-foreground font-mono text-xs mr-1">/</span>
                            <input 
                                type="text" 
                                className="bg-transparent border-0 focus:ring-0 p-0 w-full text-xs font-mono flex-1 outline-none"
                                placeholder="api/v1/resource"
                                value={formData.path.replace(/^\//,'')} 
                                onChange={(e) => setFormData({...formData, path: `/${e.target.value}`})}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tenancy Scope */}
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-900">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <Building2 size={14} />
                    Tenancy Scope Configuration
                </div>
                <div className="max-w-md bg-muted/10 p-4 rounded-xl border border-slate-100 dark:border-slate-900">
                    <label className="block text-[10px] font-black mb-1.5 text-muted-foreground uppercase tracking-wider">Cooperative Scope</label>
                    <select
                        value={formData.cooperative}
                        onChange={(e) => setFormData({...formData, cooperative: e.target.value})}
                        className="w-full text-xs font-bold rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    >
                        <option value="">Global / System-Wide (Shared)</option>
                        {dynamicOptions.cooperatives.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Static Parameters & Headers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100 dark:border-slate-900">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                        <Settings size={14} />
                        Static Headers
                    </div>
                    <KeyValuePairEditor 
                        items={formData.headers || []} 
                        onChange={(headers: any) => setFormData({...formData, headers})} 
                        placeholder="X-Custom-Header"
                    />
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                        <Plus size={14} />
                        Static Query Params
                    </div>
                    <KeyValuePairEditor 
                        items={formData.queryParams || []} 
                        onChange={(queryParams: any) => setFormData({...formData, queryParams})} 
                        placeholder="paramName"
                    />
                </div>
            </div>

            {/* Security & Authentication */}
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-900">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <Shield size={14} />
                    Security & Authentication Overrides
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-emerald-500/[0.02] p-4 rounded-xl border border-emerald-500/10">
                    <div>
                        <label className="block text-[10px] font-black mb-1.5 text-muted-foreground uppercase tracking-wider">Auth Injection Mode</label>
                        <select 
                            value={formData.authOverride}
                            onChange={(e) => setFormData({...formData, authOverride: e.target.value})}
                            className="w-full text-xs font-bold rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                        >
                            <option value="INHERIT">Inherit from Provider</option>
                            <option value="NONE">None (Public)</option>
                            <option value="API_KEY">API Key (Dual URL/Body)</option>
                            <option value="BEARER">Bearer Token</option>
                            <option value="QUERY_PARAM">Query Parameter Only</option>
                            <option value="BODY_FIELD">Body Field Only</option>
                        </select>
                    </div>

                    {['QUERY_PARAM', 'API_KEY'].includes(formData.authOverride) && (
                        <div>
                            <label className="block text-[10px] font-black mb-1.5 text-muted-foreground uppercase tracking-wider">URL Query Key</label>
                            <input 
                                type="text"
                                value={formData.authQueryParamKey || ''}
                                onChange={(e) => setFormData({...formData, authQueryParamKey: e.target.value})}
                                placeholder="authToken"
                                className="w-full text-xs font-mono rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                            />
                        </div>
                    )}

                    {['BODY_FIELD', 'API_KEY'].includes(formData.authOverride) && (
                        <div>
                            <label className="block text-[10px] font-black mb-1.5 text-muted-foreground uppercase tracking-wider">Request Body Key</label>
                            <input 
                                type="text"
                                value={formData.authBodyFieldKey || ''}
                                onChange={(e) => setFormData({...formData, authBodyFieldKey: e.target.value})}
                                placeholder="AuthenticationCode"
                                className="w-full text-xs font-mono rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Schemas */}
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-900">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <Activity size={14} />
                    Data Contracts (Schemas)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black mb-1.5 text-muted-foreground uppercase tracking-wider">Query Schema (JSON)</label>
                        <textarea 
                            className="w-full h-32 text-xs font-mono rounded-lg border bg-muted/10 p-3 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            value={displayJson(formData.queryParamsSchema)}
                            onChange={(e) => handleJsonUpdate('queryParamsSchema', e.target.value)}
                            placeholder={'{\n  "accountId": "string"\n}'}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black mb-1.5 text-muted-foreground uppercase tracking-wider">Body Schema (JSON)</label>
                        <textarea 
                            className="w-full h-32 text-xs font-mono rounded-lg border bg-muted/10 p-3 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            value={displayJson(formData.bodySchema)}
                            onChange={(e) => handleJsonUpdate('bodySchema', e.target.value)}
                            placeholder={'{\n  "amount": "number"\n}'}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function KeyValuePairEditor({ items, onChange, placeholder }: any) {
    const handleAdd = () => onChange([...items, { key: '', value: '' }])
    const handleRemove = (idx: number) => onChange(items.filter((_: any, i: number) => i !== idx))
    const handleUpdate = (idx: number, field: string, value: string) => {
        const newItems = [...items]
        newItems[idx][field] = value
        onChange(newItems)
    }

    return (
        <div className="space-y-2">
            {items.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-2 group items-center">
                    <input 
                        className="flex-1 text-xs font-mono p-2 border rounded-lg bg-background border-slate-200 dark:border-slate-800" 
                        placeholder={placeholder || "key"}
                        value={item.key}
                        onChange={(e) => handleUpdate(idx, 'key', e.target.value)}
                    />
                    <input 
                        className="flex-1 text-xs font-mono p-2 border rounded-lg bg-background border-slate-200 dark:border-slate-800" 
                        placeholder="value"
                        value={item.value}
                        onChange={(e) => handleUpdate(idx, 'value', e.target.value)}
                    />
                    <button 
                        onClick={() => handleRemove(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            ))}
            <button 
                onClick={handleAdd}
                className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-black text-muted-foreground hover:text-emerald-600 hover:border-emerald-600/30 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest"
            >
                <Plus size={12} /> Add Item
            </button>
        </div>
    )
}

function TestConsoleTab({ formData, dynamicOptions }: any) {
    const providerObj = dynamicOptions.providers.find((p: any) => p.id === (typeof formData.provider === 'object' ? formData.provider.id : formData.provider))
    
    const [testQuery, setTestQuery] = useState('{}')
    const [testBody, setTestBody] = useState('{}')
    const [running, setRunning] = useState(false)
    const [response, setResponse] = useState<any>(null)

    const providerBaseUrl = 
        (typeof formData.provider === 'object' && formData.provider?.baseUrl)
        ?? providerObj?.baseUrl
        ?? ''

    const fullUrl = providerBaseUrl
        ? `${String(providerBaseUrl).replace(/\/$/, '')}${formData.path}`
        : `(no provider)${formData.path}`

    const runTest = async () => {
        setRunning(true)
        setResponse(null)
        try {
            const res = await fetch('/api/endpoints/test-runner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpointConfig: formData,
                    query: JSON.parse(testQuery || '{}'),
                    body: JSON.parse(testBody || '{}')
                })
            })
            const data = await res.json()
            setResponse(data)
        } catch (e: any) {
            setResponse({ error: e.message })
        } finally {
            running && setRunning(false)
            setRunning(false)
        }
    }

    return (
        <div className="flex flex-col md:flex-row h-full min-h-[500px]">
            {/* Request Pane */}
            <div className="w-full md:w-1/2 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-2 overflow-hidden pr-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${formData.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {formData.method}
                        </span>
                        <span className="font-mono text-xs truncate">{fullUrl}</span>
                    </div>
                    <button 
                        onClick={runTest}
                        disabled={running}
                        className="bg-emerald-600 text-white shrink-0 flex items-center justify-center h-8 w-8 rounded-full disabled:opacity-50"
                    >
                        {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="ml-0.5" />}
                    </button>
                </div>
                
                <div className="p-4 space-y-4 flex-1">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">URL Query Variables</label>
                        <textarea 
                            value={testQuery}
                            onChange={(e) => setTestQuery(e.target.value)}
                            className="w-full h-24 text-xs font-mono rounded-lg border bg-muted/10 p-3" 
                        />
                    </div>
                    {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Request Body</label>
                            <textarea 
                                value={testBody}
                                onChange={(e) => setTestBody(e.target.value)}
                                className="w-full h-40 text-xs font-mono rounded-lg border bg-muted/10 p-3" 
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Response Pane */}
            <div className="w-full md:w-1/2 flex flex-col bg-[#0b0c10] text-[#c5c6c7]">
                <div className="p-2.5 border-b border-slate-900 flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-400 uppercase tracking-widest text-[9px]">Telemetry Console</span>
                    {response && (
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5">
                                {response.status >= 200 && response.status < 300 ? (
                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                ) : (
                                    <XCircle size={14} className="text-rose-500" />
                                )}
                                <span className={response.status >= 200 && response.status < 300 ? "text-emerald-400 font-mono font-bold" : "text-rose-400 font-mono font-bold"}>
                                    {response.status}
                                </span>
                            </span>
                            <span className="text-gray-500 font-mono">{response.time}ms</span>
                        </div>
                    )}
                </div>
                <div className="p-4 flex-1 overflow-auto">
                    {running ? (
                        <div className="h-full flex items-center justify-center text-gray-500 gap-2 text-xs font-bold uppercase tracking-widest">
                            <Loader2 size={16} className="animate-spin text-emerald-500" /> Dispatching request...
                        </div>
                    ) : response ? (
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(response.data || response.error || response, null, 2)}
                        </pre>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest italic">
                            <Globe size={24} className="mb-2 opacity-20" />
                            Awaiting Execution Trigger
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
