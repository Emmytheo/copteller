"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft, Save, Loader2, Trash2, Info, CreditCard, ShieldAlert,
    Settings2, FileText, Check, ChevronDown, Plus, X, GripVertical,
    Percent, Coins, Clock, Users, Globe, AlertCircle, Smartphone, Shield
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

const PRODUCT_TYPES = [
    { value: "ajo_rotation", label: "Ajo / Rotational Thrift", icon: "🔄" },
    { value: "hire_purchase", label: "Hire Purchase / Asset Lease", icon: "🚛" },
    { value: "micro_loan", label: "Micro Loan Pool", icon: "💰" },
    { value: "grant", label: "Government / Enterprise Grant", icon: "🏛️" },
    { value: "cooperative_bond", label: "Cooperative Bond / Fixed Savings", icon: "🔐" },
    { value: "savings_drive", label: "Group Savings Drive", icon: "🐖" },
    { value: "insurance_pool", label: "Insurance Premium Pool", icon: "🛡️" },
]
const CATEGORIES = [
    { value: "ajo", label: "Ajo / Thrift" },
    { value: "lease", label: "Asset Hire Purchase / Lease" },
    { value: "loan", label: "Micro-Loan" },
    { value: "grant", label: "Government / Enterprise Grant" },
    { value: "bond", label: "Savings Bond" },
    { value: "insurance", label: "Insurance Pool" },
]
const SECTORS = [
    { value: "transport", label: "Transport / Logistics" },
    { value: "agriculture", label: "Agriculture / Agro-Allied" },
    { value: "commerce", label: "Commerce / Market Trade" },
    { value: "artisan", label: "Artisan / Craft Workers" },
    { value: "health", label: "Health & Wellness" },
    { value: "education", label: "Education Workers" },
    { value: "technology", label: "Technology / Digital" },
    { value: "professional", label: "Professional Services" },
    { value: "housing", label: "Housing / Real Estate" },
    { value: "manufacturing", label: "Manufacturing / Production" },
    { value: "energy", label: "Energy / Utilities" },
    { value: "financial_services", label: "Financial Services" },
    { value: "all", label: "All Sectors (Universal)" },
]
const FREQUENCIES = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-Weekly (Fortnightly)" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "lump_sum", label: "Lump Sum (End of Term)" },
]
const COLLATERAL_TYPES = [
    { value: "none", label: "No Collateral Required" },
    { value: "asset", label: "Physical Asset (Vehicle / Equipment)" },
    { value: "group_guarantee", label: "Group / Cooperative Guarantee" },
    { value: "cash", label: "Cash Deposit" },
    { value: "property", label: "Land or Property Title" },
    { value: "personal_guarantee", label: "Personal Guarantee" },
]
const FIELD_TYPES = [
    { value: "text", label: "Short Text" },
    { value: "textarea", label: "Long Text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "select", label: "Dropdown" },
    { value: "checkbox", label: "Checkbox" },
    { value: "file", label: "File Upload" },
    { value: "phone", label: "Phone Number" },
    { value: "email", label: "Email" },
]
const STEPS = [
    { id: 1, label: "Basic Info", icon: Info },
    { id: 2, label: "Financials", icon: CreditCard },
    { id: 3, label: "Risk & Collateral", icon: ShieldAlert },
    { id: 4, label: "Assignment", icon: Settings2 },
    { id: 5, label: "App Form", icon: FileText },
]
const EMPTY: any = {
    name: "", tagline: "", description: "", product_type: "ajo_rotation", category: "ajo",
    sub_type: "", sector_tags: [], status: "draft",
    repayment_frequency: "weekly", max_members_per_cycle: "",
    interest_rate: 0, max_interest_rate: "", min_amount: 1000, max_amount: "",
    min_duration_months: 1, max_duration_months: 36,
    requires_guarantor: false, requires_credit_check: false, min_credit_score: 50, collateral_type: "none",
    auto_assign_on_approval: true, allow_cross_sector_request: true, allow_multiple_per_member: true,
    form_schema: [],
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
    return (
        <button type="button" onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${on ? "bg-amber-500" : "bg-border"}`}>
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
        </button>
    )
}

function FieldRow({ field, index, onChange, onRemove }: { field: any; index: number; onChange: (i: number, f: any) => void; onRemove: (i: number) => void }) {
    const inp = "h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
    return (
        <div className="flex items-start gap-2 p-3 rounded-xl border bg-card hover:border-amber-500/30 transition-colors">
            <div className="mt-2 text-muted-foreground"><GripVertical className="h-4 w-4" /></div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input className={inp + " col-span-2"} placeholder="Field label (e.g. BVN Number)" value={field.label || ""} onChange={e => onChange(index, { ...field, label: e.target.value })} />
                <div className="relative">
                    <select className={inp + " w-full appearance-none cursor-pointer"} value={field.type || "text"} onChange={e => onChange(index, { ...field, type: e.target.value })}>
                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 pointer-events-none text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 col-span-3">
                    <input className={inp + " flex-1 h-8 text-xs"} placeholder="Placeholder text (optional)" value={field.placeholder || ""} onChange={e => onChange(index, { ...field, placeholder: e.target.value })} />
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                        <input type="checkbox" className="rounded" checked={!!field.required} onChange={e => onChange(index, { ...field, required: e.target.checked })} />
                        Required
                    </label>
                </div>
                {field.type === "select" && (
                    <input className={inp + " col-span-3 h-8 text-xs"} placeholder="Options (comma-separated, e.g. Yes, No, Maybe)" value={field.options || ""} onChange={e => onChange(index, { ...field, options: e.target.value })} />
                )}
            </div>
            <button type="button" onClick={() => onRemove(index)} className="mt-2 text-muted-foreground hover:text-rose-500 transition-colors"><X className="h-4 w-4" /></button>
        </div>
    )
}

export default function ProductEditorPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const isNew = id === "new"
    const [step, setStep] = React.useState(1)
    const [product, setProduct] = React.useState<any>({ ...EMPTY })
    const [isLoading, setIsLoading] = React.useState(!isNew)
    const [isSaving, setIsSaving] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const normalizeFromApi = (raw: any) => ({
        ...EMPTY,
        ...raw,
        // CRITICAL FIX (Phase 0.5): Convert stored Kobo -> Naira on load so repeated saves never multiply by 100x!
        min_amount: raw.min_amount !== undefined && raw.min_amount !== null ? Number(raw.min_amount) / 100 : EMPTY.min_amount,
        max_amount: raw.max_amount !== undefined && raw.max_amount !== null ? Number(raw.max_amount) / 100 : '',
        sector_tags: raw.sector_tags || [],
        form_schema: raw.form_schema || [],
    })

    React.useEffect(() => {
        if (!isNew) {
            fetch(`/api/copteller/products/${id}`)
                .then(r => r.json())
                .then(d => {
                    if (d.data) setProduct(normalizeFromApi(d.data))
                })
                .catch(() => toast.error("Failed to load product."))
                .finally(() => setIsLoading(false))
        }
    }, [id, isNew])

    const up = (patch: any) => setProduct((p: any) => ({ ...p, ...patch }))

    const handleSave = async () => {
        if (!product.name || !product.product_type || !product.category) {
            toast.error("Name, product type, and category are required.")
            return
        }
        setIsSaving(true)
        const tId = toast.loading(isNew ? "Creating product template..." : "Saving changes...")
        const body = {
            ...product,
            min_amount: Math.round(Number(product.min_amount || 0) * 100),
            max_amount: product.max_amount !== '' && product.max_amount !== undefined && product.max_amount !== null
                ? Math.round(Number(product.max_amount) * 100)
                : undefined,
            max_members_per_cycle: product.max_members_per_cycle ? Number(product.max_members_per_cycle) : undefined,
            max_interest_rate: product.max_interest_rate ? Number(product.max_interest_rate) : undefined,
        }
        try {
            const url = isNew ? "/api/copteller/products" : `/api/copteller/products/${id}`
            const res = await fetch(url, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
            const data = await res.json()
            if (data.data) {
                toast.success(isNew ? "Product template created!" : "Saved successfully!", { id: tId })
                if (isNew) router.push(`/copteller/superadmin/products/${data.data.id}`)
                else setProduct(normalizeFromApi(data.data))
            } else { toast.error(data.error || "Save failed.", { id: tId }) }
        } catch { toast.error("Network error.", { id: tId }) }
        finally { setIsSaving(false) }
    }

    const handleStatusToggle = async () => {
        const newStatus = product.status === "active" ? "draft" : "active"
        setIsSaving(true)
        try {
            const res = await fetch(`/api/copteller/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) })
            const d = await res.json()
            if (d.data) { up({ status: newStatus }); toast.success(newStatus === "active" ? "Product published!" : "Reverted to draft.") }
        } catch { toast.error("Failed to change status.") }
        finally { setIsSaving(false) }
    }

    const handleDelete = async () => {
        toast("Deprecate this product template?", {
            action: { label: "Yes, Deprecate", onClick: async () => {
                setIsDeleting(true)
                try { await fetch(`/api/copteller/products/${id}`, { method: "DELETE" }); toast.success("Product deprecated."); router.push("/copteller/superadmin/products") }
                catch { toast.error("Failed.") } finally { setIsDeleting(false) }
            }},
            cancel: { label: "Cancel", onClick: () => {} }
        })
    }

    const addField = () => up({ form_schema: [...product.form_schema, { id: `f_${Date.now()}`, label: "New Field", type: "text", required: false, placeholder: "" }] })
    const updateField = (i: number, f: any) => { const s = [...product.form_schema]; s[i] = f; up({ form_schema: s }) }
    const removeField = (i: number) => up({ form_schema: product.form_schema.filter((_: any, idx: number) => idx !== i) })
    const toggleSector = (v: string) => up({ sector_tags: product.sector_tags.includes(v) ? product.sector_tags.filter((t: string) => t !== v) : [...product.sector_tags, v] })

    const inp = "w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
    const sel = inp + " appearance-none cursor-pointer"
    const lbl = "text-sm font-medium text-muted-foreground"
    const card = "rounded-2xl border bg-card p-6 space-y-5 shadow-sm"
    const sectionAnim = "space-y-5 animate-in fade-in slide-in-from-right-4 duration-300"

    if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

    return (
        <div className="flex w-full gap-8 justify-center px-4 md:px-8 pt-6 pb-24 max-w-[1440px] mx-auto">
            <main className="flex-1 max-w-5xl space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full">
                                <Link href="/copteller/superadmin/products"><ArrowLeft className="h-4 w-4" /></Link>
                            </Button>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{isNew ? "New Product Template" : product.name || "Edit Product"}</h1>
                            
                            {/* Status badges */}
                            <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className={product.status === "active" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5" : product.status === "deprecated" ? "border-rose-500/30 text-rose-500 bg-rose-500/5" : "border-amber-500/30 text-amber-500 bg-amber-500/5"}>
                                    {product.status === "active" ? "● Live" : product.status === "deprecated" ? "● Deprecated" : "● Draft"}
                                </Badge>
                                {product.product_type && <Badge variant="outline" className="text-xs">{PRODUCT_TYPES.find(p => p.value === product.product_type)?.icon} {PRODUCT_TYPES.find(p => p.value === product.product_type)?.label}</Badge>}
                            </div>
                        </div>
                        <p className="text-muted-foreground ml-11 text-sm">Define the rules, guardrails & application flow for this product.</p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        {!isNew && (
                            <Button type="button" onClick={handleStatusToggle} disabled={isSaving} className={`font-semibold select-none transition-all ${product.status === "active" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : product.status === "active" ? "Revert to Draft" : "Publish"}
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={isSaving} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{isNew ? "Create" : "Save"}
                        </Button>
                        {!isNew && <Button variant="destructive" size="icon" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>}
                    </div>
                </div>

                {/* Stepper */}
                <div className="relative flex justify-between items-center px-4 sm:px-8">
                    <div className="absolute left-[5%] right-[5%] top-5 h-[2px] bg-border -z-10" />
                    <div className="absolute left-[5%] top-5 h-[2px] bg-amber-500 -z-10 transition-all duration-500" style={{ width: `${((step - 1) / (STEPS.length - 1)) * 90}%` }} />
                    {STEPS.map(s => (
                        <button key={s.id} type="button" onClick={() => setStep(s.id)} className={`flex flex-col items-center gap-1.5 transition-colors ${step === s.id ? "text-amber-500" : step > s.id ? "text-emerald-500" : "text-muted-foreground"}`}>
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${step === s.id ? "border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.25)]" : step > s.id ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-background"}`}>
                                {step > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">{s.label}</span>
                        </button>
                    ))}
                </div>

                {/* Step 1 */}
                {step === 1 && (
                    <div className={sectionAnim}>
                        <div className={card}>
                            <div className="flex items-center gap-2 pb-2 border-b"><Info className="h-5 w-5 text-amber-500" /><h2 className="font-semibold">Basic Information</h2></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className={lbl}>Product Name <span className="text-rose-500">*</span></label>
                                    <input className={inp} placeholder="e.g. Weekly Ajo Thrift Cycle" value={product.name} onChange={e => up({ name: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={lbl}>Product Type <span className="text-rose-500">*</span></label>
                                    <div className="relative"><select className={sel} value={product.product_type} onChange={e => up({ product_type: e.target.value })}>{PRODUCT_TYPES.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}</select><ChevronDown className="absolute right-3 top-2.5 h-4 w-4 pointer-events-none text-muted-foreground" /></div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={lbl}>Category <span className="text-rose-500">*</span></label>
                                    <div className="relative"><select className={sel} value={product.category} onChange={e => up({ category: e.target.value })}>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select><ChevronDown className="absolute right-3 top-2.5 h-4 w-4 pointer-events-none text-muted-foreground" /></div>
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className={lbl}>Short Tagline</label>
                                    <input className={inp} placeholder="e.g. Rotate savings weekly, collect monthly" value={product.tagline} onChange={e => up({ tagline: e.target.value })} />
                                    <p className="text-xs text-muted-foreground text-right">{product.tagline?.length || 0}/100</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={lbl}>Sub-Type / Variant</label>
                                    <input className={inp} placeholder="e.g. Daily Market Ajo" value={product.sub_type} onChange={e => up({ sub_type: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={lbl}>Status</label>
                                    <div className="relative"><select className={sel} value={product.status} onChange={e => up({ status: e.target.value })}><option value="draft">Draft</option><option value="active">Active (Published)</option><option value="deprecated">Deprecated</option></select><ChevronDown className="absolute right-3 top-2.5 h-4 w-4 pointer-events-none text-muted-foreground" /></div>
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className={lbl}>Description</label>
                                    <textarea className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[100px] resize-none" placeholder="Full operational description of this product..." value={product.description} onChange={e => up({ description: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className={card}>
                            <div className="flex items-center gap-2 pb-2 border-b"><Globe className="h-5 w-5 text-amber-500" /><h2 className="font-semibold">Target Sectors</h2></div>
                            <p className="text-xs text-muted-foreground">Select sectors this product targets. Leave empty for universal access.</p>
                            <div className="flex flex-wrap gap-2">
                                {SECTORS.map(s => (
                                    <button key={s.value} type="button" onClick={() => toggleSector(s.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${product.sector_tags.includes(s.value) ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-border text-muted-foreground hover:border-amber-500/50"}`}>{s.label}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2 */}
                {step === 2 && (
                    <div className={sectionAnim}>
                        <div className={card}>
                            <div className="flex items-center gap-2 pb-2 border-b"><Clock className="h-5 w-5 text-amber-500" /><h2 className="font-semibold">Repayment & Cycle</h2></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className={lbl}>Repayment Frequency</label>
                                    <div className="relative"><select className={sel} value={product.repayment_frequency} onChange={e => up({ repayment_frequency: e.target.value })}>{FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select><ChevronDown className="absolute right-3 top-2.5 h-4 w-4 pointer-events-none text-muted-foreground" /></div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={lbl}>Max Members / Cycle</label>
                                    <div className="relative"><Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input type="number" min="0" className={inp + " pl-9"} placeholder="Ajo only — e.g. 20" value={product.max_members_per_cycle} onChange={e => up({ max_members_per_cycle: e.target.value })} /></div>
                                </div>
                            </div>
                        </div>
                        <div className={card}>
                            <div className="flex items-center gap-2 pb-2 border-b"><Percent className="h-5 w-5 text-amber-500" /><h2 className="font-semibold">Interest / Yield Rates (%)</h2></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className={lbl}>Standard Rate (%)</label>
                                    <input type="number" min="0" step="0.5" className={inp} placeholder="0" value={product.interest_rate} onChange={e => up({ interest_rate: Number(e.target.value) })} />
                                    <p className="text-xs text-muted-foreground">Set 0 for Ajo / Grant products.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={lbl}>Max Allowable Rate (%)</label>
                                    <input type="number" min="0" step="0.5" className={inp} placeholder="No cap" value={product.max_interest_rate} onChange={e => up({ max_interest_rate: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className={card}>
                            <div className="flex items-center gap-2 pb-2 border-b"><Coins className="h-5 w-5 text-amber-500" /><h2 className="font-semibold">Amount & Duration Guardrails</h2></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5"><label className={lbl}>Min Amount (₦)</label><input type="number" min="0" className={inp} placeholder="e.g. 1000" value={product.min_amount} onChange={e => up({ min_amount: e.target.value })} /></div>
                                <div className="space-y-1.5"><label className={lbl}>Max Amount (₦)</label><input type="number" min="0" className={inp} placeholder="No cap" value={product.max_amount} onChange={e => up({ max_amount: e.target.value })} /></div>
                                <div className="space-y-1.5"><label className={lbl}>Min Duration (months)</label><input type="number" min="1" className={inp} value={product.min_duration_months} onChange={e => up({ min_duration_months: Number(e.target.value) })} /></div>
                                <div className="space-y-1.5"><label className={lbl}>Max Duration (months)</label><input type="number" min="1" className={inp} value={product.max_duration_months} onChange={e => up({ max_duration_months: Number(e.target.value) })} /></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3 */}
                {step === 3 && (
                    <div className={sectionAnim}>
                        <div className={card}>
                            <div className="flex items-center gap-2 pb-2 border-b"><ShieldAlert className="h-5 w-5 text-amber-500" /><h2 className="font-semibold">Risk Controls</h2></div>
                            <div className="space-y-4">
                                {[
                                    { key: "requires_guarantor", title: "Requires Guarantor", desc: "Members must provide a guarantor to apply." },
                                    { key: "requires_credit_check", title: "Requires Credit Check", desc: "A minimum Copteller credit score must be met." },
                                ].map(item => (
                                    <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
                                        <div><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                                        <Toggle on={product[item.key]} onChange={() => up({ [item.key]: !product[item.key] })} />
                                    </div>
                                ))}
                                {product.requires_credit_check && (
                                    <div className="space-y-1.5 pl-4 border-l-2 border-amber-500/30">
                                        <label className={lbl}>Minimum Credit Score (0–100)</label>
                                        <input type="range" min="0" max="100" step="5" className="w-full accent-amber-500" value={product.min_credit_score} onChange={e => up({ min_credit_score: Number(e.target.value) })} />
                                        <div className="flex justify-between text-xs text-muted-foreground"><span>0</span><span className="text-amber-500 font-bold">{product.min_credit_score}</span><span>100</span></div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={card}>
                            <div className="flex items-center gap-2 pb-2 border-b"><ShieldAlert className="h-5 w-5 text-amber-500" /><h2 className="font-semibold">Collateral Type</h2></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {COLLATERAL_TYPES.map(c => (
                                    <button key={c.value} type="button" onClick={() => up({ collateral_type: c.value })} className={`p-3 rounded-xl text-left border text-sm transition-all ${product.collateral_type === c.value ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-border hover:border-amber-500/40"}`}>
                                        <div className="flex items-center gap-2">{product.collateral_type === c.value && <Check className="h-4 w-4 flex-shrink-0" />}{c.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4 */}
                {step === 4 && (
                    <div className={sectionAnim}>
                        <div className={card}>
                            <div className="flex items-center gap-2 pb-2 border-b"><Settings2 className="h-5 w-5 text-amber-500" /><h2 className="font-semibold">Auto-Assignment Rules</h2></div>
                            <div className="space-y-4">
                                {[
                                    { key: "auto_assign_on_approval", title: "Auto-Assign on Cooperative Approval", desc: "Automatically authorize matching-sector cooperatives for this product when they are bank-approved." },
                                    { key: "allow_cross_sector_request", title: "Allow Cross-Sector Requests", desc: "Cooperatives outside this product's target sectors can submit an authorization request." },
                                    { key: "allow_multiple_per_member", title: "Allow Multiple Per Member", desc: "A single member can hold multiple active contracts under this product simultaneously." },
                                ].map(item => (
                                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border">
                                        <div><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p></div>
                                        <Toggle on={product[item.key]} onChange={() => up({ [item.key]: !product[item.key] })} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 5 */}
                {step === 5 && (
                    <div className={sectionAnim}>
                        <div className={card}>
                            <div className="flex items-center gap-2 pb-2 border-b"><FileText className="h-5 w-5 text-amber-500" /><h2 className="font-semibold">Application Form Builder</h2></div>
                            <p className="text-sm text-muted-foreground">Define extra fields members fill when applying for a scheme under this product.</p>
                            {product.form_schema.length === 0 && (
                                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                    <FileText className="h-8 w-8" />
                                    <p className="text-sm">No custom fields yet.</p>
                                </div>
                            )}
                            <div className="space-y-3">
                                {product.form_schema.map((field: any, i: number) => (
                                    <FieldRow key={field.id || i} field={field} index={i} onChange={updateField} onRemove={removeField} />
                                ))}
                            </div>
                            <Button type="button" variant="outline" onClick={addField} className="w-full border-dashed border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/5">
                                <Plus className="mr-2 h-4 w-4" /> Add Field
                            </Button>
                        </div>
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-700 dark:text-amber-300">
                                <p className="font-medium mb-1">Standard fields always included</p>
                                <p className="text-xs opacity-80">BVN, NIN, full name, phone, and membership number are always collected. Only add extra fields specific to this product.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step nav */}
                <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>← Previous</Button>
                    {step < STEPS.length
                        ? <Button onClick={() => setStep(s => Math.min(STEPS.length, s + 1))} className="bg-amber-500 hover:bg-amber-600 text-white">Next →</Button>
                        : <Button onClick={handleSave} disabled={isSaving} className="bg-amber-500 hover:bg-amber-600 text-white">
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />{isNew ? "Create Product" : "Save All"}</>}
                          </Button>
                    }
                </div>
            </main>

            {/* Summary sidebar & Live Smartphone Preview */}
            <aside className="hidden xl:block w-[320px] flex-shrink-0">
                <div className="sticky top-6 space-y-4">
                    <div className="rounded-3xl border bg-card overflow-hidden shadow-lg border-amber-500/10">
                        {/* Header */}
                        <div className="p-4 border-b flex items-center gap-2 bg-amber-500/5">
                            <Smartphone className="text-amber-500 h-4.5 w-4.5" />
                            <h3 className="text-xs font-black uppercase tracking-wider">Live Member Preview</h3>
                        </div>

                        {/* Phone Mockup Content */}
                        <div className="p-5 bg-slate-50 dark:bg-slate-950/60 flex flex-col items-center border-b">
                            <div className="w-[240px] bg-background rounded-[2.25rem] overflow-hidden shadow-2xl relative border-[6px] border-zinc-950 dark:border-zinc-800 shrink-0">
                                {/* Speaker notch & camera */}
                                <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-950 dark:bg-zinc-800 rounded-b-xl z-20 flex items-center justify-center gap-1.5">
                                    <div className="w-6 h-1 bg-zinc-800 dark:bg-zinc-700 rounded-full" />
                                    <div className="w-1.5 h-1.5 bg-zinc-900 dark:bg-zinc-800 rounded-full" />
                                </div>
                                
                                {/* Status Bar */}
                                <div className="h-6 bg-zinc-950 dark:bg-zinc-800 flex justify-between items-center px-4 pt-1 text-[8px] text-white/90 font-bold tracking-wider relative z-10">
                                    <span>9:41</span>
                                    <div className="flex gap-1 items-center">
                                        <div className="w-1 h-1 bg-white rounded-full" />
                                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                                        <div className="w-2.5 h-2 bg-white rounded-sm" />
                                    </div>
                                </div>

                                {/* App UI */}
                                <div className="bg-slate-100 dark:bg-slate-900/80 p-3 pt-4 min-h-[380px] text-left space-y-3 font-sans">
                                    {/* App Brand Header */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-amber-500 tracking-wider">COPTELLER</span>
                                        <span className="text-[7px] font-semibold text-muted-foreground">Partner MFB Escrow</span>
                                    </div>

                                    {/* Card */}
                                    <div className="bg-background rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                                        {/* Header image/icon banner */}
                                        <div className="h-24 bg-gradient-to-br from-amber-500/10 to-amber-500/20 relative flex items-center justify-center border-b dark:border-slate-800">
                                            <div className="text-3xl">
                                                {PRODUCT_TYPES.find(p => p.value === product.product_type)?.icon || "🔄"}
                                            </div>
                                            <span className="absolute top-2 right-2 text-[8px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                {CATEGORIES.find(c => c.value === product.category)?.label || "Ajo"}
                                            </span>
                                        </div>

                                        {/* Card content */}
                                        <div className="p-3.5 space-y-2">
                                            <div>
                                                <h4 className="text-xs font-black text-foreground tracking-tight leading-tight truncate">
                                                    {product.name || "Untitled Scheme"}
                                                </h4>
                                                <p className="text-[9px] text-muted-foreground font-semibold leading-normal line-clamp-2 mt-0.5">
                                                    {product.tagline || "Tagline will display here..."}
                                                </p>
                                            </div>

                                            {/* Financial specs */}
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[9px]">
                                                <div>
                                                    <span className="text-muted-foreground block">Contribution</span>
                                                    <span className="font-black text-foreground">
                                                        {product.min_amount ? `₦${Number(product.min_amount).toLocaleString()}` : "₦1,000"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground block">Interest/Yield</span>
                                                    <span className="font-black text-amber-500">
                                                        {product.interest_rate || 0}%
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground block">Repayment</span>
                                                    <span className="font-semibold text-foreground capitalize">
                                                        {FREQUENCIES.find(f => f.value === product.repayment_frequency)?.label || "Weekly"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground block">Duration</span>
                                                    <span className="font-semibold text-foreground">
                                                        {product.min_duration_months}–{product.max_duration_months} mos
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Apply Button */}
                                            <button type="button" disabled className="w-full h-8 bg-amber-500 hover:bg-amber-600 text-black font-black text-[9px] rounded-lg mt-2 cursor-not-allowed shadow-md">
                                                Join Cycle
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary details below phone */}
                        <div className="p-4 space-y-3 bg-card text-[11px]">
                            <p className="font-bold text-muted-foreground uppercase tracking-widest text-[9px]">Specs & Guardrails</p>
                            <div className="space-y-2">
                                {([
                                    ["Repayment", FREQUENCIES.find(f => f.value === product.repayment_frequency)?.label],
                                    ["Max Members", product.max_members_per_cycle ? `${product.max_members_per_cycle} per cycle` : "Unlimited"],
                                    ["Min Amount", product.min_amount ? `₦${Number(product.min_amount).toLocaleString()}` : "—"],
                                    ["Max Amount", product.max_amount ? `₦${Number(product.max_amount).toLocaleString()}` : "No cap"],
                                    ["Collateral", COLLATERAL_TYPES.find(c => c.value === product.collateral_type)?.label || "None"],
                                    ["Application Fields", `${product.form_schema.length} fields`],
                                ] as [string, string | undefined][]).map(([k, v]) => (
                                    <div key={k} className="flex justify-between gap-2 border-b border-slate-100 dark:border-slate-800/40 pb-1.5">
                                        <span className="text-muted-foreground font-semibold">{k}</span>
                                        <span className="font-black text-right text-foreground">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Target Sectors Badge List */}
                    {product.sector_tags?.length > 0 && (
                        <div className="rounded-2xl border bg-card p-4 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Sectors</p>
                            <div className="flex flex-wrap gap-1.5">
                                {product.sector_tags.map((t: string) => (
                                    <Badge key={t} variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                                        {SECTORS.find(s => s.value === t)?.label || t}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    )
}
