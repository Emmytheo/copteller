"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    PlusCircle, Edit2, Play, AlertCircle, RefreshCw, X, Loader2,
    Calendar, Layers, CheckCircle2, Trash2, FileText, Settings, Building2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface WorkflowSpec {
    id: string
    name: string
    triggerType: 'cron' | 'event' | 'manual' | 'application'
    cronExpression?: string
    stepsCount: number
    status: 'active' | 'inactive'
    cooperative?: string
}

export default function SuperadminWorkflowsPage() {
    const router = useRouter()
    const [workflows, setWorkflows] = React.useState<WorkflowSpec[]>([])
    const [cooperatives, setCooperatives] = React.useState<any[]>([])
    const [runs, setRuns] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)

    // Filter states
    const [coopFilter, setCoopFilter] = React.useState("ALL")
    const [activeTab, setActiveTab] = React.useState<'workflows' | 'runs'>('workflows')

    // Panel controls: 'details', 'form', 'none'
    const [panelMode, setPanelMode] = React.useState<'details' | 'form' | 'none'>('none')
    const [selectedWf, setSelectedWf] = React.useState<WorkflowSpec | null>(null)

    // Form states
    const [formName, setFormName] = React.useState("")
    const [formTrigger, setFormTrigger] = React.useState<'cron' | 'event' | 'manual'>("cron")
    const [formCron, setFormCron] = React.useState("0 0 * * *")
    const [formSteps, setFormSteps] = React.useState(3)
    const [formStatus, setFormStatus] = React.useState<'active' | 'inactive'>("active")
    const [formCooperative, setFormCooperative] = React.useState("")

    const fetchWorkflows = async () => {
        try {
            setLoading(true)
            const [wfRes, coopsRes, runsRes] = await Promise.all([
                fetch('/api/workflows?limit=250'),
                fetch('/api/copteller/admin/cooperatives'),
                fetch('/api/workflow-executions?limit=20&sort=-startedAt')
            ])

            const wfData = await wfRes.json()
            const coopsData = await coopsRes.json()
            const runsData = await runsRes.json()

            if (wfData.docs) {
                const mapped = wfData.docs.map((wf: any) => ({
                    id: String(wf.id),
                    name: wf.name,
                    triggerType: wf.trigger === 'CRON' ? 'cron' : wf.trigger === 'APPLICATION_SUBMIT' ? 'application' : wf.trigger === 'WEBHOOK' ? 'event' : 'manual',
                    cronExpression: wf.cronExpression || undefined,
                    stepsCount: wf.definition?.nodes?.length || 1,
                    status: wf.status === 'PUBLISHED' ? 'active' : 'inactive',
                    cooperative: typeof wf.cooperative === 'object' && wf.cooperative !== null ? wf.cooperative.id : wf.cooperative || undefined
                }))
                setWorkflows(mapped)
            }

            if (coopsData.cooperatives) {
                setCooperatives(coopsData.cooperatives)
            }

            if (runsData.docs) {
                const mappedRuns = runsData.docs.map((r: any) => ({
                    id: String(r.id),
                    name: r.workflow?.name || 'Workflow Run',
                    timestamp: new Date(r.startedAt).toLocaleString(),
                    status: r.status === 'COMPLETED' ? 'success' : r.status === 'FAILED' ? 'failed' : 'pending',
                    error: r.error || undefined,
                    duration: r.completedAt ? `${((new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) / 1000).toFixed(1)}s` : undefined
                }))
                setRuns(mappedRuns)
            }
        } catch (e) {
            toast.error("Failed to load workflow data")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchWorkflows()
    }, [])

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const payloadData = {
                name: formName,
                status: formStatus === 'active' ? 'PUBLISHED' : 'DRAFT',
                trigger: formTrigger === 'cron' ? 'CRON' : formTrigger === 'event' ? 'WEBHOOK' : 'MANUAL',
                cronExpression: formTrigger === 'cron' ? formCron : null,
                cooperative: formCooperative || null,
            }

            if (selectedWf) {
                // Update
                const res = await fetch(`/api/workflows/${selectedWf.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadData)
                })
                if (!res.ok) throw new Error("Failed to save changes")
                toast.success(`Workflow updated successfully!`)
            } else {
                // Create
                const res = await fetch('/api/workflows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...payloadData,
                        definition: { nodes: [], edges: [] }
                    })
                })
                if (!res.ok) throw new Error("Failed to create workflow")
                toast.success(`New workflow created successfully!`)
            }

            setPanelMode('none')
            setSelectedWf(null)
            fetchWorkflows()
        } catch (err: any) {
            toast.error(err.message || "Failed to save workflow specification")
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return
        try {
            const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error("Failed to delete workflow")
            toast.error(`Workflow "${name}" deleted`)
            setSelectedWf(null)
            setPanelMode('none')
            fetchWorkflows()
        } catch (err: any) {
            toast.error(err.message || "Failed to delete workflow")
        }
    }

    const triggerEdit = () => {
        if (!selectedWf) return
        setFormName(selectedWf.name)
        setFormTrigger(selectedWf.triggerType === 'cron' ? 'cron' : selectedWf.triggerType === 'event' ? 'event' : 'manual')
        setFormCron(selectedWf.cronExpression || "0 0 * * *")
        setFormSteps(selectedWf.stepsCount)
        setFormStatus(selectedWf.status)
        setFormCooperative(selectedWf.cooperative || "")
        setPanelMode('form')
    }

    const triggerNew = () => {
        setSelectedWf(null)
        resetForm()
        setPanelMode('form')
    }

    const resetForm = () => {
        setFormName("")
        setFormTrigger("cron")
        setFormCron("0 0 * * *")
        setFormSteps(1)
        setFormStatus("active")
        setFormCooperative("")
    }

    const executeWorkflowManual = async (id: string, name: string) => {
        const tId = toast.loading(`Initiating pipeline "${name}"...`)
        try {
            const res = await fetch(`/api/workflows/${id}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trigger: 'MANUAL', inputData: {} })
            })
            const data = await res.json()
            if (data.success || res.ok) {
                toast.success(`Pipeline execution triggered successfully!`, { id: tId })
            } else {
                throw new Error(data.error || "Failed to trigger run")
            }
            fetchWorkflows()
        } catch (err: any) {
            toast.error(`Execution failed: ${err.message}`, { id: tId })
        }
    }

    // Tenancy filtering logic
    const filteredWorkflows = workflows.filter(wf => {
        if (coopFilter === 'ALL') return true
        if (coopFilter === 'GLOBAL') return !wf.cooperative
        return String(wf.cooperative) === String(coopFilter)
    })

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Automations</span>
                    <h1 className="text-3xl font-black mt-2">Workflow Management</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">Configure automated cycle tasks pipelines and check history execution runs logs.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Tenancy Selector Dropdown */}
                    <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        <select
                            value={coopFilter}
                            onChange={(e) => setCoopFilter(e.target.value)}
                            className="text-xs font-bold rounded-lg border bg-background border-slate-200 dark:border-slate-800 px-3 py-2"
                        >
                            <option value="ALL">All Cooperatives & Global</option>
                            <option value="GLOBAL">Global / System-Wide Only</option>
                            {cooperatives.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <Button onClick={triggerNew} className="h-10 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs border-0 shadow-lg flex items-center gap-2 shrink-0">
                        <PlusCircle className="h-4 w-4" /> Create Workflow
                    </Button>
                </div>
            </div>

            {loading && workflows.length === 0 ? (
                <div className="flex justify-center p-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* Left Column: Workflows list & Runs history segmented with Tabs */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Tabs Segment Selector */}
                        <div className="flex border-b border-slate-100 dark:border-slate-900 gap-6">
                            <button
                                onClick={() => setActiveTab('workflows')}
                                className={`pb-3 text-xs font-black relative transition-colors ${activeTab === 'workflows' ? 'text-rose-600' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Automation Workflows</span>
                                {activeTab === 'workflows' && (
                                    <motion.div layoutId="wf-active-tab-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('runs')}
                                className={`pb-3 text-xs font-black relative transition-colors ${activeTab === 'runs' ? 'text-rose-600' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Execution Runs History</span>
                                {activeTab === 'runs' && (
                                    <motion.div layoutId="wf-active-tab-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
                                )}
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {activeTab === 'workflows' && (
                                <motion.div
                                    key="wf-tab"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 space-y-4 shadow-sm"
                                >
                                    <div className="space-y-3">
                                        {filteredWorkflows.length === 0 ? (
                                            <div className="text-xs text-muted-foreground text-center py-6">
                                                No workflows match the selected cooperative scope.
                                            </div>
                                        ) : filteredWorkflows.map(wf => {
                                            const coopObj = cooperatives.find(c => String(c.id) === String(wf.cooperative))
                                            return (
                                                <div
                                                    key={wf.id}
                                                    onClick={() => {
                                                        setSelectedWf(wf)
                                                        setPanelMode('details')
                                                    }}
                                                    className={`border rounded-2xl p-5 space-y-4 cursor-pointer transition-colors ${selectedWf?.id === wf.id ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40" : "border-slate-100 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/30"}`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-sm font-black">{wf.name}</p>
                                                            <p className="text-[10px] text-muted-foreground font-semibold mt-1">Trigger: <span className="font-bold text-foreground capitalize">{wf.triggerType}</span> {wf.cronExpression && `(${wf.cronExpression})`}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Badge variant="outline" className={`text-[8px] font-bold py-0.5 px-2 ${!wf.cooperative ? 'border-slate-200 text-muted-foreground' : 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'}`}>
                                                                {!wf.cooperative ? 'Global' : coopObj?.name || 'Scoped'}
                                                            </Badge>
                                                            <Badge variant={wf.status === 'active' ? 'default' : 'secondary'} className="text-[9px] uppercase font-bold">
                                                                {wf.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs font-bold text-muted-foreground border-t border-slate-50 dark:border-slate-900 pt-3">
                                                        <span>{wf.stepsCount} Node Canvas Steps</span>
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                executeWorkflowManual(wf.id, wf.name)
                                                            }}
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                                                        >
                                                            <Play className="h-3 w-3 mr-1" /> Execute
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'runs' && (
                                <motion.div
                                    key="runs-tab"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 space-y-4 shadow-sm"
                                >
                                    <div className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                                        {runs.length === 0 ? (
                                            <div className="text-xs text-muted-foreground text-center py-6">
                                                No execution history found in pipeline ledger.
                                            </div>
                                        ) : runs.map((run, idx) => {
                                            const isSuccess = run.status === 'success'
                                            return (
                                                <div key={idx} className="flex justify-between items-start py-3.5 first:pt-0 last:pb-0">
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-foreground truncate">{run.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{run.timestamp}</p>
                                                        {!isSuccess && <p className="text-[9px] text-rose-600 dark:text-rose-400 font-bold mt-1 max-w-[280px] leading-relaxed flex items-start gap-1"><AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {run.error}</p>}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <Badge variant={isSuccess ? 'default' : 'destructive'} className="text-[9px] font-black uppercase">
                                                            {run.status}
                                                        </Badge>
                                                        {run.duration && <p className="text-[10px] text-muted-foreground font-semibold mt-1">{run.duration}</p>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>

                    {/* Right Column: Details/Form Panel */}
                    <div className="space-y-4">
                        <AnimatePresence mode="wait">
                            {panelMode === 'details' && selectedWf && (
                                <motion.div
                                    key="details"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 shadow-sm space-y-6"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Workflow Specifications</span>
                                            <h3 className="text-base font-black mt-1 leading-snug">{selectedWf.name}</h3>
                                        </div>
                                        <button onClick={() => setPanelMode('none')} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-3.5 text-xs border-y py-4 border-slate-100 dark:border-slate-800 font-semibold">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Trigger Type</span>
                                            <span className="capitalize">{selectedWf.triggerType}</span>
                                        </div>
                                        {selectedWf.cronExpression && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Cron Schedule</span>
                                                <span className="font-mono text-muted-foreground">{selectedWf.cronExpression}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Workflow Steps</span>
                                            <span>{selectedWf.stepsCount} Steps</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Cooperative Scope</span>
                                            <span className="font-bold text-emerald-600">
                                                {cooperatives.find(c => String(c.id) === String(selectedWf.cooperative))?.name || 'Global'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Status</span>
                                            <Badge variant={selectedWf.status === 'active' ? 'default' : 'secondary'} className="text-[9px] uppercase font-bold">
                                                {selectedWf.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <Button 
                                            onClick={() => router.push(`/copteller/superadmin/workflows/${selectedWf.id}/edit`)} 
                                            className="w-full h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-black text-xs gap-2 border-0"
                                        >
                                            <Layers className="h-4 w-4" /> Open Visual Flow Editor
                                        </Button>
                                        <Button onClick={triggerEdit} className="w-full h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-xs gap-2">
                                            <Settings className="h-4 w-4" /> Edit Specifications
                                        </Button>
                                        <Button onClick={() => handleDelete(selectedWf.id, selectedWf.name)} variant="outline" className="w-full h-10 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-black text-xs gap-2">
                                            <Trash2 className="h-4 w-4" /> Delete Workflow
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {panelMode === 'form' && (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 shadow-sm space-y-4"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-sm font-black">{selectedWf ? 'Edit Workflow' : 'Create Workflow'}</h3>
                                            <p className="text-[9px] text-muted-foreground mt-0.5">Define trigger points and clearing steps configuration.</p>
                                        </div>
                                        <button onClick={() => setPanelMode(selectedWf ? 'details' : 'none')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleCreateOrUpdate} className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Workflow Name / Title</label>
                                            <input
                                                type="text"
                                                required
                                                value={formName}
                                                onChange={e => setFormName(e.target.value)}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold focus:outline-none focus:border-rose-500"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Cooperative Scope</label>
                                            <select
                                                value={formCooperative}
                                                onChange={e => setFormCooperative(e.target.value)}
                                                className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-rose-500"
                                            >
                                                <option value="">Global / System-Wide (Shared)</option>
                                                {cooperatives.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Trigger Event Type</label>
                                                <select
                                                    value={formTrigger}
                                                    onChange={e => setFormTrigger(e.target.value as any)}
                                                    className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-rose-500"
                                                >
                                                    <option value="cron">Timed Cron Schedule</option>
                                                    <option value="event">Database Event Hooks</option>
                                                    <option value="manual">Manual Trigger Only</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Number of Task Steps</label>
                                                <input
                                                    type="number"
                                                    required
                                                    min="1"
                                                    disabled={!!selectedWf} // Only set steps visually via react flow canvas editor for saved items
                                                    value={formSteps}
                                                    onChange={e => setFormSteps(Number(e.target.value))}
                                                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-black focus:outline-none focus:border-rose-500 disabled:opacity-50"
                                                />
                                            </div>
                                        </div>
                                        {formTrigger === 'cron' && (
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase">Cron Pattern Expression</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formCron}
                                                    onChange={e => setFormCron(e.target.value)}
                                                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-mono focus:outline-none focus:border-rose-500"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Workflow Status</label>
                                            <select
                                                value={formStatus}
                                                onChange={e => setFormStatus(e.target.value as any)}
                                                className="w-full h-9 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold focus:outline-none focus:border-rose-500"
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <Button type="button" onClick={() => setPanelMode(selectedWf ? 'details' : 'none')} variant="outline" className="flex-1 rounded-xl h-9 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                            <Button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs h-9 rounded-xl border-0 shadow-lg">Save workflow</Button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {panelMode === 'none' && (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center empty-state-card"
                                >
                                    <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                                    <p className="text-xs font-bold text-muted-foreground">Select a workflow automation to view run settings or edit parameters.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            )}
        </div>
    )
}

