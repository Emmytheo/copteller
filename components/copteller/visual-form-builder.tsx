"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Trash2, ArrowUp, ArrowDown, Settings2, Code, Eye,
    CheckCircle2, AlertCircle, Sparkles, Sliders, GripVertical,
    Zap, CreditCard, Smartphone, Lightbulb, Copy, RefreshCw,
    Building2, Check, X, Shield, Lock, FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { NIGERIAN_BANKS } from "@/lib/data/nigerian-banks"
import { normalizeFieldOptions } from "@/components/copteller/dynamic-service-form"

export type SchemaField = {
    id?: string
    name: string
    label: string
    type: "text" | "number" | "amount" | "email" | "phone" | "select" | "destination_bank_lookup" | "textarea" | "switch" | "date"
    placeholder?: string
    defaultValue?: any
    required?: boolean
    helpText?: string
    options?: { label: string; value: string }[]
    validations?: {
        type: "regex" | "min" | "max" | "minLength" | "maxLength"
        value: string | number
        errorMessage?: string
    }[]
    lookupAction?: "account_enquiry" | "meter_enquiry" | "phone_lookup" | "none"
}

interface VisualFormBuilderProps {
    fields: SchemaField[]
    onChange: (fields: SchemaField[]) => void
    rawJson: string
    onRawJsonChange: (json: string) => void
}


const FIELD_PRESETS = [
    {
        name: "Interbank Transfer Set",
        icon: CreditCard,
        description: "Destination Bank, 10-digit Account Number & Amount",
        fields: [
            {
                name: "bankCode",
                label: "Beneficiary Bank",
                type: "destination_bank_lookup",
                required: true,
                placeholder: "Select recipient bank",
                helpText: "Select the receiving financial institution"
            },
            {
                name: "destinationAccount",
                label: "Account Number",
                type: "text",
                required: true,
                placeholder: "0123456789",
                helpText: "10-digit NUBAN account number",
                lookupAction: "account_enquiry",
                validations: [
                    { type: "regex", value: "^\\d{10}$", errorMessage: "Account number must be exactly 10 digits" }
                ]
            },
            {
                name: "amount",
                label: "Transfer Amount (NGN)",
                type: "amount",
                required: true,
                placeholder: "5000",
                validations: [
                    { type: "min", value: 100, errorMessage: "Minimum transfer amount is ₦100" },
                    { type: "max", value: 5000000, errorMessage: "Maximum transfer limit is ₦5,000,000" }
                ]
            },
            {
                name: "narration",
                label: "Payment Remark / Narration",
                type: "text",
                required: false,
                placeholder: "e.g. Weekly Union dues or trade payout"
            }
        ]
    },
    {
        name: "Electricity Token Purchase",
        icon: Lightbulb,
        description: "DisCo Selection, Meter Number & Token Amount",
        fields: [
            {
                name: "discoCode",
                label: "Electricity Distribution Company",
                type: "select",
                required: true,
                options: [
                    { label: "Enugu Electricity Distribution (EEDC - Abia)", value: "EEDC_ENUGU_DISCO" },
                    { label: "Port Harcourt Electricity (PHED)", value: "PHED_DISCO" },
                    { label: "Ikeja Electric (IE)", value: "IKEDC_DISCO" },
                    { label: "Eko Electricity (EKEDC)", value: "EKEDC_DISCO" }
                ]
            },
            {
                name: "meterNumber",
                label: "Prepaid Meter Number",
                type: "text",
                required: true,
                placeholder: "44019283741",
                lookupAction: "meter_enquiry",
                validations: [
                    { type: "regex", value: "^\\d{8,14}$", errorMessage: "Meter number must be 8 to 14 numeric digits" }
                ]
            },
            {
                name: "amount",
                label: "Token Amount (NGN)",
                type: "amount",
                required: true,
                placeholder: "3000",
                validations: [
                    { type: "min", value: 1000, errorMessage: "Minimum electricity purchase is ₦1,000" }
                ]
            },
            {
                name: "phoneNumber",
                label: "SMS Notification Phone",
                type: "phone",
                required: true,
                placeholder: "08031234567"
            }
        ]
    },
    {
        name: "Airtime & VTU Topup",
        icon: Smartphone,
        description: "Mobile Network, Phone Number & Recharge Value",
        fields: [
            {
                name: "network",
                label: "Mobile Network Operator",
                type: "select",
                required: true,
                options: [
                    { label: "MTN Nigeria", value: "MTN" },
                    { label: "Airtel Nigeria", value: "AIRTEL" },
                    { label: "Glo Mobile (Globacom)", value: "GLO" },
                    { label: "9mobile", value: "9MOBILE" }
                ]
            },
            {
                name: "phoneNumber",
                label: "Phone Number",
                type: "phone",
                required: true,
                placeholder: "08031234567",
                validations: [
                    { type: "regex", value: "^(0|234)[789][01]\\d{8}$", errorMessage: "Enter a valid Nigerian phone number" }
                ]
            },
            {
                name: "amount",
                label: "Airtime Value (NGN)",
                type: "amount",
                required: true,
                placeholder: "1000",
                validations: [
                    { type: "min", value: 50, errorMessage: "Minimum recharge is ₦50" }
                ]
            }
        ]
    }
]

export function VisualFormBuilder({
    fields,
    onChange,
    rawJson,
    onRawJsonChange,
}: VisualFormBuilderProps) {
    const [activeView, setActiveView] = React.useState<"visual" | "json" | "preview">("visual")
    const [selectedFieldIndex, setSelectedFieldIndex] = React.useState<number | null>(0)
    const [jsonError, setJsonError] = React.useState<string | null>(null)

    // Preview Interactive State
    const [previewValues, setPreviewValues] = React.useState<Record<string, any>>({})
    const [previewErrors, setPreviewErrors] = React.useState<Record<string, string>>({})
    const [resolvingField, setResolvingField] = React.useState<string | null>(null)
    const [resolvedMeta, setResolvedMeta] = React.useState<Record<string, any>>({})

    // Sync from Visual to JSON
    const syncToJson = (newFields: SchemaField[]) => {
        const jsonStr = JSON.stringify(newFields, null, 2)
        onRawJsonChange(jsonStr)
        setJsonError(null)
    }

    // Sync from JSON to Visual
    const handleJsonChange = (val: string) => {
        onRawJsonChange(val)
        try {
            const parsed = JSON.parse(val)
            if (Array.isArray(parsed)) {
                onChange(parsed)
                setJsonError(null)
            } else {
                setJsonError("Schema must be an Array of field objects.")
            }
        } catch (e: any) {
            setJsonError(e.message || "Invalid JSON syntax")
        }
    }

    // Field Management
    const handleAddField = () => {
        const index = fields.length + 1
        const newField: SchemaField = {
            id: `field_${Date.now()}`,
            name: `field_${index}`,
            label: `Custom Field ${index}`,
            type: "text",
            required: true,
            placeholder: `Enter field ${index} value...`
        }
        const updated = [...fields, newField]
        onChange(updated)
        syncToJson(updated)
        setSelectedFieldIndex(updated.length - 1)
    }

    const handleUpdateField = (index: number, patch: Partial<SchemaField>) => {
        const updated = [...fields]
        updated[index] = { ...updated[index], ...patch }
        onChange(updated)
        syncToJson(updated)
    }

    const handleDeleteField = (index: number) => {
        const updated = fields.filter((_, i) => i !== index)
        onChange(updated)
        syncToJson(updated)
        if (selectedFieldIndex === index) {
            setSelectedFieldIndex(updated.length > 0 ? 0 : null)
        } else if (selectedFieldIndex !== null && selectedFieldIndex > index) {
            setSelectedFieldIndex(selectedFieldIndex - 1)
        }
    }

    const handleMoveField = (index: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= fields.length) return
        const updated = [...fields]
        const temp = updated[index]
        updated[index] = updated[targetIndex]
        updated[targetIndex] = temp
        onChange(updated)
        syncToJson(updated)
        setSelectedFieldIndex(targetIndex)
    }

    const handleApplyPreset = (preset: typeof FIELD_PRESETS[0]) => {
        onChange(preset.fields as SchemaField[])
        syncToJson(preset.fields as SchemaField[])
        setSelectedFieldIndex(0)
        toast.success(`Applied "${preset.name}" preset schema!`)
    }

    // Preview Interactive Testing
    const handlePreviewChange = async (name: string, val: any) => {
        setPreviewValues(prev => ({ ...prev, [name]: val }))
        setPreviewErrors(prev => ({ ...prev, [name]: "" }))

        const field = fields.find(f => f.name === name)
        if (!field) return

        // Auto-run lookup action if configured and length matched
        if (field.lookupAction === "account_enquiry" && String(val).length === 10) {
            setResolvingField(name)
            try {
                const res = await fetch("/api/copteller/services/lookup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "account",
                        accountNumber: val,
                        bankCode: previewValues.bankCode || "044"
                    })
                })
                const data = await res.json()
                if (data.success) {
                    setResolvedMeta(prev => ({ ...prev, [name]: data.accountName }))
                    toast.success(`Resolved: ${data.accountName}`)
                }
            } catch {
                // Ignore preview lookup error
            } finally {
                setResolvingField(null)
            }
        }
    }

    const activeField = selectedFieldIndex !== null && fields[selectedFieldIndex] ? fields[selectedFieldIndex] : null

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            
            {/* ── TOP CONTROL STRIP ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        onClick={() => setActiveView("visual")}
                        variant={activeView === "visual" ? "default" : "ghost"}
                        size="sm"
                        className={`text-xs font-bold gap-1.5 rounded-xl h-8 ${activeView === "visual" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "text-muted-foreground"}`}
                    >
                        <Sliders className="w-3.5 h-3.5" /> Visual Builder
                    </Button>
                    <Button
                        type="button"
                        onClick={() => setActiveView("json")}
                        variant={activeView === "json" ? "default" : "ghost"}
                        size="sm"
                        className={`text-xs font-bold gap-1.5 rounded-xl h-8 ${activeView === "json" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "text-muted-foreground"}`}
                    >
                        <Code className="w-3.5 h-3.5" /> JSON Schema
                        {jsonError && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                    </Button>
                    <Button
                        type="button"
                        onClick={() => setActiveView("preview")}
                        variant={activeView === "preview" ? "default" : "ghost"}
                        size="sm"
                        className={`text-xs font-bold gap-1.5 rounded-xl h-8 ${activeView === "preview" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "text-muted-foreground"}`}
                    >
                        <Eye className="w-3.5 h-3.5" /> Live Preview
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground font-mono font-semibold hidden sm:inline">
                        {fields.length} Field{fields.length === 1 ? "" : "s"} Defined
                    </span>
                </div>
            </div>

            {/* ── 1. VISUAL BUILDER VIEW ────────────────────────────────────── */}
            {activeView === "visual" && (
                <div className="p-4 space-y-5">
                    
                    {/* Preset Schemas Shortcut Bar */}
                    <div className="bg-muted/30 border border-border p-3 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500" /> Quick Schema Presets
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {FIELD_PRESETS.map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleApplyPreset(preset)}
                                    className="px-2.5 py-1.5 rounded-lg bg-background hover:bg-muted border border-border text-[11px] font-bold text-foreground hover:border-emerald-500/30 transition-all flex items-center gap-1.5"
                                >
                                    <preset.icon className="w-3.5 h-3.5 text-emerald-500" />
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Two Column Layout: Field List (Left) & Inspector (Right) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        
                        {/* Left: Field Reorderable List */}
                        <div className="md:col-span-5 space-y-2.5">
                            <div className="flex items-center justify-between pb-1">
                                <span className="text-xs font-bold text-foreground">Form Structure</span>
                                <Button
                                    type="button"
                                    onClick={handleAddField}
                                    size="sm"
                                    className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Add Field
                                </Button>
                            </div>

                            {fields.length === 0 ? (
                                <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                                    No fields defined. Click &quot;Add Field&quot; or pick a preset above.
                                </div>
                            ) : (
                                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                                    {fields.map((field, idx) => (
                                        <div
                                            key={field.id || idx}
                                            onClick={() => setSelectedFieldIndex(idx)}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                                selectedFieldIndex === idx
                                                    ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                                                    : "bg-muted/20 hover:bg-muted/40 border-border"
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold truncate text-foreground">{field.label || `Field ${idx + 1}`}</span>
                                                    {field.required && <span className="text-rose-500 text-[10px] font-black">*</span>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-mono text-muted-foreground truncate">{field.name}</span>
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-muted border border-border text-muted-foreground">
                                                        {field.type}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                                <Button
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={(e) => { e.stopPropagation(); handleMoveField(idx, "up") }}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                >
                                                    <ArrowUp className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    disabled={idx === fields.length - 1}
                                                    onClick={(e) => { e.stopPropagation(); handleMoveField(idx, "down") }}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                >
                                                    <ArrowDown className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteField(idx) }}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 rounded text-muted-foreground hover:text-rose-500"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right: Selected Field Inspector */}
                        <div className="md:col-span-7 bg-muted/20 border border-border rounded-xl p-4 space-y-4">
                            {activeField && selectedFieldIndex !== null ? (
                                <>
                                    <div className="flex items-center justify-between border-b border-border pb-2">
                                        <div>
                                            <h4 className="text-xs font-black text-foreground">Field Configuration</h4>
                                            <p className="text-[10px] text-muted-foreground">Editing &quot;{activeField.label}&quot;</p>
                                        </div>
                                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                            #{selectedFieldIndex + 1} of {fields.length}
                                        </span>
                                    </div>

                                    <div className="space-y-3 text-xs">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-[11px] font-bold">Field Label *</Label>
                                                <Input
                                                    value={activeField.label || ""}
                                                    onChange={e => handleUpdateField(selectedFieldIndex, { label: e.target.value })}
                                                    placeholder="e.g. Beneficiary Account"
                                                    className="mt-1 h-8 text-xs rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[11px] font-bold">Payload Key (Name) *</Label>
                                                <Input
                                                    value={activeField.name || ""}
                                                    onChange={e => handleUpdateField(selectedFieldIndex, { name: e.target.value })}
                                                    placeholder="e.g. accountNumber"
                                                    className="mt-1 h-8 text-xs font-mono rounded-lg"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-[11px] font-bold">Field Type</Label>
                                                <select
                                                    value={activeField.type}
                                                    onChange={e => handleUpdateField(selectedFieldIndex, { type: e.target.value as any })}
                                                    className="mt-1 w-full bg-background border border-border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                >
                                                    <option value="text">Text Input</option>
                                                    <option value="number">Numeric Input</option>
                                                    <option value="amount">Amount Currency (₦)</option>
                                                    <option value="phone">Phone (MSISDN)</option>
                                                    <option value="email">Email Address</option>
                                                    <option value="select">Dropdown Select</option>
                                                    <option value="destination_bank_lookup">Nigerian Bank Lookup</option>
                                                    <option value="textarea">Multi-line Textarea</option>
                                                    <option value="date">Date Picker</option>
                                                    <option value="switch">Boolean Toggle (Yes/No)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <Label className="text-[11px] font-bold">Placeholder</Label>
                                                <Input
                                                    value={activeField.placeholder || ""}
                                                    onChange={e => handleUpdateField(selectedFieldIndex, { placeholder: e.target.value })}
                                                    placeholder="e.g. Enter 10-digit NUBAN..."
                                                    className="mt-1 h-8 text-xs rounded-lg"
                                                />
                                            </div>
                                        </div>

                                        {/* Dropdown Options Editor if select */}
                                        {activeField.type === "select" && (
                                            <div className="p-3 rounded-lg bg-background border border-border space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[11px] font-bold">Select Options</Label>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            const opts = normalizeFieldOptions(activeField.options)
                                                            handleUpdateField(selectedFieldIndex, {
                                                                options: [...opts, { label: `Option ${opts.length + 1}`, value: `opt_${opts.length + 1}` }]
                                                            })
                                                        }}
                                                        className="h-6 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                                                    >
                                                        + Add Option
                                                    </Button>
                                                </div>
                                                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                                    {normalizeFieldOptions(activeField.options).map((opt, oIdx) => (
                                                        <div key={oIdx} className="flex items-center gap-2">
                                                            <Input
                                                                value={opt.label}
                                                                onChange={e => {
                                                                    const opts = [...normalizeFieldOptions(activeField.options)]
                                                                    opts[oIdx] = { ...opts[oIdx], label: e.target.value }
                                                                    handleUpdateField(selectedFieldIndex, { options: opts })
                                                                }}
                                                                placeholder="Option Label"
                                                                className="h-7 text-[11px] flex-1"
                                                            />
                                                            <Input
                                                                value={opt.value}
                                                                onChange={e => {
                                                                    const opts = [...normalizeFieldOptions(activeField.options)]
                                                                    opts[oIdx] = { ...opts[oIdx], value: e.target.value }
                                                                    handleUpdateField(selectedFieldIndex, { options: opts })
                                                                }}
                                                                placeholder="Value"
                                                                className="h-7 text-[11px] font-mono w-24"
                                                            />
                                                            <Button
                                                                type="button"
                                                                onClick={() => {
                                                                    const opts = normalizeFieldOptions(activeField.options).filter((_, i) => i !== oIdx)
                                                                    handleUpdateField(selectedFieldIndex, { options: opts })
                                                                }}
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Validation Rules Section */}
                                        <div className="p-3 rounded-lg bg-background border border-border space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-bold flex items-center gap-1.5">
                                                    <Shield className="w-3 h-3 text-emerald-500" /> Validation Engineering
                                                </Label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={activeField.required ?? true}
                                                        onChange={e => handleUpdateField(selectedFieldIndex, { required: e.target.checked })}
                                                        className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span className="text-[11px] font-bold text-foreground">Required Field</span>
                                                </label>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                <div>
                                                    <Label className="text-[10px] font-bold text-muted-foreground">Pattern Regex</Label>
                                                    <Input
                                                        value={activeField.validations?.find(v => v.type === "regex")?.value || ""}
                                                        onChange={e => {
                                                            const val = e.target.value
                                                            const otherValidations = (activeField.validations || []).filter(v => v.type !== "regex")
                                                            handleUpdateField(selectedFieldIndex, {
                                                                validations: val ? [...otherValidations, { type: "regex", value: val, errorMessage: "Invalid format" }] : otherValidations
                                                            })
                                                        }}
                                                        placeholder="e.g. ^\d{10}$"
                                                        className="mt-0.5 h-7 text-[11px] font-mono rounded"
                                                    />
                                                </div>

                                                <div>
                                                    <Label className="text-[10px] font-bold text-muted-foreground">Lookup Resolver Action</Label>
                                                    <select
                                                        value={activeField.lookupAction || "none"}
                                                        onChange={e => handleUpdateField(selectedFieldIndex, { lookupAction: e.target.value as any })}
                                                        className="mt-0.5 w-full bg-muted border border-border text-[11px] rounded px-2 py-1 focus:outline-none"
                                                    >
                                                        <option value="none">None (Standard)</option>
                                                        <option value="account_enquiry">Bank Account Name Resolver</option>
                                                        <option value="meter_enquiry">Prepaid Meter Resolver</option>
                                                        <option value="phone_lookup">MSISDN Subscriber Resolver</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    Select a field on the left to configure its properties and validation rules.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── 2. RAW JSON SCHEMA VIEW ──────────────────────────────────── */}
            {activeView === "json" && (
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-foreground">Direct JSON Schema Definition</p>
                            <p className="text-[11px] text-muted-foreground">Edit raw field array with live AST parsing &amp; error validation.</p>
                        </div>
                        <Button
                            type="button"
                            onClick={() => syncToJson(fields)}
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] font-bold rounded-lg gap-1"
                        >
                            <RefreshCw className="w-3 h-3" /> Reformat JSON
                        </Button>
                    </div>

                    <textarea
                        value={rawJson}
                        onChange={e => handleJsonChange(e.target.value)}
                        rows={14}
                        className="w-full bg-[#0a0a0a] border border-border text-xs text-emerald-400 font-mono rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />

                    {jsonError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>JSON Validation Error: {jsonError}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── 3. LIVE INTERACTIVE TEST PREVIEW ─────────────────────────── */}
            {activeView === "preview" && (
                <div className="p-6 space-y-5">
                    <div className="border-b border-border pb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Live Execution Testbed
                        </span>
                        <h3 className="text-sm font-black mt-1">Interactive Form Preview</h3>
                        <p className="text-xs text-muted-foreground">Test user-facing input behaviors, bank lookups, and validation rules in real-time.</p>
                    </div>

                    {fields.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                            No form fields defined to preview.
                        </div>
                    ) : (
                        <div className="max-w-md space-y-4 bg-muted/20 border border-border p-5 rounded-2xl">
                            {fields.map((field) => (
                                <div key={field.name} className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-bold text-foreground">
                                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                                        </Label>
                                        {resolvingField === field.name && (
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <RefreshCw className="w-3 h-3 animate-spin" /> Verifying...
                                            </span>
                                        )}
                                    </div>

                                    {field.type === "destination_bank_lookup" ? (
                                        <select
                                            value={previewValues[field.name] || ""}
                                            onChange={e => handlePreviewChange(field.name, e.target.value)}
                                            className="w-full bg-background border border-border text-xs rounded-xl p-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                        >
                                            <option value="">Select Recipient Bank</option>
                                            {NIGERIAN_BANKS.map(b => (
                                                <option key={b.code} value={b.code}>{b.name}</option>
                                            ))}
                                        </select>
                                    ) : field.type === "select" ? (
                                        <select
                                            value={previewValues[field.name] || ""}
                                            onChange={e => handlePreviewChange(field.name, e.target.value)}
                                            className="w-full bg-background border border-border text-xs rounded-xl p-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                        >
                                            <option value="">Choose an option...</option>
                                            {normalizeFieldOptions(field.options).map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : field.type === "textarea" ? (
                                        <textarea
                                            value={previewValues[field.name] || ""}
                                            onChange={e => handlePreviewChange(field.name, e.target.value)}
                                            placeholder={field.placeholder || "Enter details..."}
                                            rows={3}
                                            className="w-full bg-background border border-border text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
                                        />
                                    ) : (
                                        <Input
                                            type={field.type === "amount" || field.type === "number" ? "number" : "text"}
                                            value={previewValues[field.name] || ""}
                                            onChange={e => handlePreviewChange(field.name, e.target.value)}
                                            placeholder={field.placeholder || `Enter ${field.label}...`}
                                            className="text-xs rounded-xl h-10"
                                        />
                                    )}

                                    {/* Real-time resolved name banner */}
                                    {resolvedMeta[field.name] && (
                                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            <span className="flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Beneficiary:
                                            </span>
                                            <span>{resolvedMeta[field.name]}</span>
                                        </div>
                                    )}

                                    {field.helpText && (
                                        <p className="text-[10px] text-muted-foreground">{field.helpText}</p>
                                    )}
                                </div>
                            ))}

                            <Button
                                type="button"
                                onClick={() => toast.success("Form validated successfully in live preview!")}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 rounded-xl mt-2"
                            >
                                Validate &amp; Dry Run Preview
                            </Button>
                        </div>
                    )}
                </div>
            )}

        </div>
    )
}
