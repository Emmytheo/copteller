"use client"

import * as React from "react"
import {
    Zap, CheckCircle2, AlertCircle, RefreshCw, Lock,
    CreditCard, Smartphone, Lightbulb, Building2, UserCheck, Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { NIGERIAN_BANKS } from "@/lib/data/nigerian-banks"

export interface DynamicServiceFormProps {
    service: any
    formData: Record<string, any>
    onChange: (name: string, value: any) => void
    onSubmit: (e: React.FormEvent) => void
    isSubmitting?: boolean
    submitLabel?: string
}

export function normalizeFieldOptions(rawOptions: any): { label: string; value: string }[] {
    if (!rawOptions) return []
    if (Array.isArray(rawOptions)) {
        return rawOptions.map(opt => {
            if (typeof opt === 'string') return { label: opt, value: opt }
            if (typeof opt === 'object' && opt !== null) {
                return {
                    label: String(opt.label || opt.name || opt.text || opt.title || opt.value || ''),
                    value: String(opt.value ?? opt.id ?? opt.code ?? opt.label ?? '')
                }
            }
            return { label: String(opt), value: String(opt) }
        }).filter(o => o.label || o.value)
    }
    if (typeof rawOptions === 'object') {
        return Object.entries(rawOptions).map(([key, val]) => ({
            label: typeof val === 'string' ? val : key,
            value: key
        }))
    }
    if (typeof rawOptions === 'string') {
        try {
            const parsed = JSON.parse(rawOptions)
            return normalizeFieldOptions(parsed)
        } catch {
            return rawOptions.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ label: s, value: s }))
        }
    }
    return []
}

export function DynamicServiceForm({
    service,
    formData,
    onChange,
    onSubmit,
    isSubmitting = false,
    submitLabel
}: DynamicServiceFormProps) {
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [resolving, setResolving] = React.useState<Record<string, boolean>>({})
    const [resolvedData, setResolvedData] = React.useState<Record<string, any>>({})
    const [dynamicOptions, setDynamicOptions] = React.useState<Record<string, { label: string; value: string }[]>>({})

    const schema = Array.isArray(service?.form_schema) ? service.form_schema : []

    // Fetch dynamic options from endpoints for api_select or fields with options_endpoint
    React.useEffect(() => {
        schema.forEach((field: any) => {
            const epId = field.options_endpoint 
                ? (typeof field.options_endpoint === 'object' ? field.options_endpoint.id : field.options_endpoint) 
                : (field.type === 'api_select' ? 'banks' : null)

            if (epId) {
                fetch(`/api/copteller/services/options?endpointId=${epId}&textKey=${field.options_text_key || 'name'}&valueKey=${field.options_value_key || 'code'}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && Array.isArray(data.options)) {
                            setDynamicOptions(prev => ({ ...prev, [field.name]: data.options }))
                        }
                    })
                    .catch(() => {})
            }
        })
    }, [service?.id])

    // Financial Calculation
    const principalAmount = Number(formData.amount) || Number(formData.principal) || Number(formData.rechargeAmount) || 0
    let calculatedFee = 0
    if (service?.fee_type === "flat") {
        calculatedFee = Number(service.fee_value) || 0
    } else if (service?.fee_type === "percentage") {
        calculatedFee = (principalAmount * (Number(service.fee_value) || 0)) / 100
    }
    const totalDebit = principalAmount + calculatedFee

    // Trigger Lookup Verification
    const triggerLookup = async (field: any, val: any) => {
        if (field.lookupAction === "account_enquiry" || field.name === "destinationAccount" || field.name === "accountNumber") {
            const cleanAcc = String(val).replace(/\D/g, "")
            if (cleanAcc.length === 10) {
                setResolving(prev => ({ ...prev, [field.name]: true }))
                try {
                    const res = await fetch("/api/copteller/services/lookup", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            type: "account",
                            accountNumber: cleanAcc,
                            bankCode: formData.bankCode || "044"
                        })
                    })
                    const data = await res.json()
                    if (data.success && data.accountName) {
                        setResolvedData(prev => ({ ...prev, [field.name]: data.accountName }))
                        onChange("resolvedAccountName", data.accountName)
                    }
                } catch {
                    // Ignore lookup error
                } finally {
                    setResolving(prev => ({ ...prev, [field.name]: false }))
                }
            }
        } else if (field.lookupAction === "meter_enquiry" || field.name === "meterNumber") {
            if (String(val).length >= 8) {
                setResolving(prev => ({ ...prev, [field.name]: true }))
                try {
                    const res = await fetch("/api/copteller/services/lookup", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            type: "meter",
                            meterNumber: val,
                            discoCode: formData.discoCode || "EEDC_ENUGU_DISCO"
                        })
                    })
                    const data = await res.json()
                    if (data.success && data.customerName) {
                        setResolvedData(prev => ({ ...prev, [field.name]: data.customerName, [field.name + "_address"]: data.address }))
                        onChange("resolvedCustomerName", data.customerName)
                    }
                } catch {
                    // Ignore lookup error
                } finally {
                    setResolving(prev => ({ ...prev, [field.name]: false }))
                }
            }
        }
    }

    const handleFieldChange = (field: any, val: any) => {
        onChange(field.name, val)
        setErrors(prev => ({ ...prev, [field.name]: "" }))
        triggerLookup(field, val)
    }

    const validateForm = (e: React.FormEvent) => {
        e.preventDefault()
        const newErrors: Record<string, string> = {}

        for (const field of schema) {
            const val = formData[field.name]

            if (field.required && (val === undefined || val === null || val === "")) {
                newErrors[field.name] = `${field.label || field.name} is required`
                continue
            }

            if (val !== undefined && val !== null && val !== "" && Array.isArray(field.validations)) {
                for (const v of field.validations) {
                    if (v.type === "regex" && v.value) {
                        try {
                            const re = new RegExp(v.value)
                            if (!re.test(String(val))) {
                                newErrors[field.name] = v.errorMessage || `Invalid format for ${field.label}`
                            }
                        } catch { }
                    }
                    if (v.type === "min" && v.value !== undefined) {
                        if (Number(val) < Number(v.value)) {
                            newErrors[field.name] = v.errorMessage || `Minimum value is ${v.value}`
                        }
                    }
                    if (v.type === "max" && v.value !== undefined) {
                        if (Number(val) > Number(v.value)) {
                            newErrors[field.name] = v.errorMessage || `Maximum value is ${v.value}`
                        }
                    }
                }
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            toast.error("Please correct the form validation errors before submitting.")
            return
        }

        onSubmit(e)
    }

    return (
        <form onSubmit={validateForm} className="space-y-4">
            {service?.description && (
                <p className="text-xs text-muted-foreground">
                    {service.description}
                </p>
            )}

            {schema.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No input parameters required for this service.
                </div>
            ) : (
                schema.map((field: any) => {
                    const isResolving = resolving[field.name]
                    const resolvedName = resolvedData[field.name]
                    const resolvedAddress = resolvedData[field.name + "_address"]
                    const error = errors[field.name]

                    return (
                        <div key={field.name} className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                                <Label className="font-bold text-foreground">
                                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                                </Label>
                                {isResolving && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Resolving details...
                                    </span>
                                )}
                            </div>

                            {field.type === "destination_bank_lookup" ? (
                                <select
                                    value={formData[field.name] || ""}
                                    onChange={e => handleFieldChange(field, e.target.value)}
                                    className={`w-full bg-background border text-xs text-foreground rounded-xl px-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                                        error ? "border-rose-500" : "border-border"
                                    }`}
                                >
                                    <option value="">Choose Destination Bank...</option>
                                    {NIGERIAN_BANKS.map(b => (
                                        <option key={b.code} value={b.code}>{b.name}</option>
                                    ))}
                                </select>
                            ) : (field.type === "select" || field.type === "api_select") ? (
                                <select
                                    value={formData[field.name] || ""}
                                    onChange={e => handleFieldChange(field, e.target.value)}
                                    className={`w-full bg-background border text-xs text-foreground rounded-xl px-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                                        error ? "border-rose-500" : "border-border"
                                    }`}
                                >
                                    <option value="">Select option...</option>
                                    {(dynamicOptions[field.name] || normalizeFieldOptions(field.options)).map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : field.type === "textarea" ? (
                                <textarea
                                    value={formData[field.name] ?? ""}
                                    onChange={e => handleFieldChange(field, e.target.value)}
                                    rows={3}
                                    placeholder={field.placeholder || `Enter ${field.label}...`}
                                    className={`w-full bg-background border text-xs text-foreground rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none ${
                                        error ? "border-rose-500" : "border-border"
                                    }`}
                                />
                            ) : (
                                <Input
                                    type={field.type === "amount" || field.type === "number" ? "number" : "text"}
                                    value={formData[field.name] ?? ""}
                                    onChange={e => handleFieldChange(field, e.target.value)}
                                    placeholder={field.placeholder || `Enter ${field.label}...`}
                                    className={`text-xs rounded-xl h-10 ${error ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                                />
                            )}

                            {/* Verified Name Enquiry Banner */}
                            {resolvedName && (
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified Beneficiary:
                                    </span>
                                    <span>{resolvedName}</span>
                                </div>
                            )}

                            {resolvedAddress && (
                                <p className="text-[10px] text-muted-foreground italic px-1">
                                    Address: {resolvedAddress}
                                </p>
                            )}

                            {error && (
                                <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {error}
                                </p>
                            )}

                            {field.helpText && !error && (
                                <p className="text-[10px] text-muted-foreground">{field.helpText}</p>
                            )}
                        </div>
                    )
                })
            )}

            {/* Financial Breakdown Summary */}
            {principalAmount > 0 && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-muted-foreground">
                        <span>Principal Amount:</span>
                        <span className="font-bold text-foreground">₦{principalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>Convenience Fee:</span>
                        <span className="font-bold text-foreground">₦{calculatedFee.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-bold text-sm">
                        <span>Total Settlement:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">₦{totalDebit.toLocaleString()}</span>
                    </div>
                </div>
            )}

            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-2 px-6 h-10 rounded-xl shadow-lg shadow-emerald-950/20"
            >
                {isSubmitting ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing Payment...</>
                ) : (
                    <><Lock className="w-3.5 h-3.5" /> {submitLabel || `Authorize & Pay ₦${totalDebit.toLocaleString()}`}</>
                )}
            </Button>
        </form>
    )
}
