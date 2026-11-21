"use client"

import * as React from "react"
import { Settings, Save, RefreshCw, FileText, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { CoopCustomField, CoopMemberFormSpec } from "@/lib/copteller/coop-form-specs"
import { PrintableFormDialog } from "@/components/copteller/printable-form"

export default function AdminSettingsPage() {
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [showPrintForm, setShowPrintForm] = React.useState(false)
    const [settings, setSettings] = React.useState({
        weeklyContribution: 20000,
        managementYield: 2.5,
        defaultPenalty: 1500,
        enableAutoDeductions: true,
        maxPoolSize: 50000000
    })

    const [coopName, setCoopName] = React.useState("Cooperative")
    const [formSpec, setFormSpec] = React.useState<CoopMemberFormSpec>({
        declarationPurpose: "Copteller Cooperative",
        requireUnionClearance: true,
        requireBankSignature: false,
        requirePassportPhoto: true,
        requireBvn: true,
        contributionFieldLabel: "Target Contribution Amount (₦)",
        prefillContributionAmount: false,
        allowedFrequencies: ["daily", "weekly", "monthly"],
        defaultFrequency: "weekly",
        defaultContributionNaira: 15000,
        customFields: [],
    })

    const fetchSettings = React.useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/copteller/admin/settings')
            if (!res.ok) throw new Error('Failed to load settings')
            const data = await res.json()
            if (data?.cooperativeName) setCoopName(data.cooperativeName)
            if (data?.memberFormSpec) setFormSpec(data.memberFormSpec)
            if (data?.settings) {
                setSettings({
                    weeklyContribution: data.settings.weeklyContribution ?? 20000,
                    managementYield: data.settings.managementYield ?? 2.5,
                    defaultPenalty: data.settings.defaultPenalty ?? 1500,
                    enableAutoDeductions: data.settings.enableAutoDeductions ?? true,
                    maxPoolSize: data.settings.maxPoolSize ?? 50000000
                })
            }
        } catch (err: any) {
            console.error('Failed to load settings:', err)
            toast.error('Unable to fetch live guild configurations.')
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const tId = toast.loading("Saving guild configurations to database...")
        
        try {
            const res = await fetch('/api/copteller/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...settings, memberFormSpec: formSpec })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to update settings')
            toast.success("Guild configurations persisted successfully.", { id: tId })
        } catch (err: any) {
            toast.error(err.message || 'Error saving guild configurations', { id: tId })
        } finally {
            setSaving(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : Number(value)
        }))
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6 font-sans">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-amber-500/10 pb-5 sm:pb-6">
                <div>
                    <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Management</span>
                    <h1 className="text-2xl sm:text-3xl font-black mt-2">Guild Configurations</h1>
                    <p className="text-xs text-muted-foreground mt-1">Modify trade guild general parameters, interest thresholds, and member form signature policies.</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPrintForm(true)}
                    className="h-10 rounded-xl border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-xs gap-2 shrink-0"
                >
                    <Printer className="h-4 w-4" /> Preview / Print Member Form
                </Button>
            </div>

            <form onSubmit={handleSave} className="bg-white dark:bg-slate-950/60 p-4 sm:p-6 border border-slate-200 dark:border-slate-900 rounded-3xl space-y-6 sm:space-y-8 shadow-sm">
                <div>
                    <h3 className="text-base font-black flex items-center gap-2"><Settings className="h-5 w-5 text-amber-500" /> General Parameters</h3>
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Adjusting these values will affect all active scheme tranches.</p>
                </div>
                
                <div className="space-y-4 sm:space-y-6 text-xs font-sans">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 border-b border-slate-100 dark:border-slate-900/50 gap-3 sm:gap-4">
                        <div className="max-w-sm">
                            <p className="font-bold text-sm">Weekly Cycle Contribution Pool</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">Default baseline amount deducted from member wallets weekly during rotational cycles.</p>
                        </div>
                        <div className="relative w-full sm:w-auto">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">₦</span>
                            <input 
                                type="number" name="weeklyContribution" required
                                value={settings.weeklyContribution} onChange={handleChange}
                                className="w-full sm:w-32 h-10 pl-7 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 font-black text-sm focus:outline-none focus:border-amber-500 transition-colors"
                            />
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 border-b border-slate-100 dark:border-slate-900/50 gap-3 sm:gap-4">
                        <div className="max-w-sm">
                            <p className="font-bold text-sm">Cooperative Management Yield Fee</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">Platform management commission percent applied on cycle clears and escrow payouts.</p>
                        </div>
                        <div className="relative w-full sm:w-auto">
                            <input 
                                type="number" step="0.1" name="managementYield" required
                                value={settings.managementYield} onChange={handleChange}
                                className="w-full sm:w-32 h-10 pl-3 pr-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 font-black text-sm text-emerald-600 focus:outline-none focus:border-amber-500 transition-colors"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 border-b border-slate-100 dark:border-slate-900/50 gap-3 sm:gap-4">
                        <div className="max-w-sm">
                            <p className="font-bold text-sm">Late Arrears Penalty Flat Fee</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">Flat penalty charged when a cycle deduction defaults.</p>
                        </div>
                        <div className="relative w-full sm:w-auto">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">₦</span>
                            <input 
                                type="number" name="defaultPenalty" required
                                value={settings.defaultPenalty} onChange={handleChange}
                                className="w-full sm:w-32 h-10 pl-7 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 font-black text-sm text-rose-600 focus:outline-none focus:border-amber-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-4 border-b border-slate-100 dark:border-slate-900/50 gap-4">
                        <div className="max-w-sm">
                            <p className="font-bold text-sm">Automated Schedule Deductions</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">Toggle the Cron job runner for rotational wallet deductions.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" name="enableAutoDeductions" checked={settings.enableAutoDeductions} onChange={handleChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                </div>

                {/* Member Form & Paper Application Specifications */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-900/50 space-y-4">
                    <div>
                        <h3 className="text-base font-black flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-500" /> Member Application Form Specifications</h3>
                        <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                            Customize declaration wording, voluntary/clearance signature policy, and extra member fields for {coopName}.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Declaration Scope (&ldquo;...for the purposes of ...&rdquo;)</label>
                        <input
                            type="text"
                            value={formSpec.declarationPurpose}
                            onChange={e => setFormSpec(prev => ({ ...prev, declarationPurpose: e.target.value }))}
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 font-semibold text-xs focus:outline-none focus:border-amber-500"
                        />
                    </div>

                    {/* Configurable Contribution Amount Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                        <div className="sm:col-span-5 space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                Contribution Field Label
                            </label>
                            <input
                                type="text"
                                value={formSpec.contributionFieldLabel || "Target Contribution Amount (₦)"}
                                onChange={e => setFormSpec(prev => ({ ...prev, contributionFieldLabel: e.target.value }))}
                                placeholder="Target Contribution Amount (₦)"
                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background font-semibold text-xs focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <div className="sm:col-span-4 space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                Default Amount (₦)
                            </label>
                            <input
                                type="number"
                                min={0}
                                step={500}
                                value={formSpec.defaultContributionNaira ?? ""}
                                onChange={e => setFormSpec(prev => ({
                                    ...prev,
                                    defaultContributionNaira: e.target.value === "" ? undefined : Number(e.target.value),
                                }))}
                                placeholder="e.g. 15000 (or leave blank)"
                                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background font-bold text-xs focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                Default Frequency
                            </label>
                            <select
                                value={formSpec.defaultFrequency}
                                onChange={e => setFormSpec(prev => ({ ...prev, defaultFrequency: e.target.value as any }))}
                                className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-background font-bold text-xs focus:outline-none focus:border-amber-500"
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                        <div className="sm:col-span-12 flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/80 gap-4">
                            <div>
                                <p className="font-bold text-xs">Pre-fill Contribution Amount on Printed Forms</p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                    Keep off to leave a clean blank line for members to write their own target amount; turn on to pre-print the fixed default amount above.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input
                                    type="checkbox"
                                    checked={Boolean(formSpec.prefillContributionAmount)}
                                    onChange={e => setFormSpec(prev => ({ ...prev, prefillContributionAmount: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-900/50 gap-4">
                        <div className="max-w-md">
                            <p className="font-bold text-sm">Default to Very Lite Member Form</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                                Retains essential BVN &amp; NIN identity fields while omitting statutory registration metadata, account class checkboxes, email, and DOB for streamlined field onboarding.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={formSpec.formMode === "lite"}
                                onChange={e => setFormSpec(prev => ({ ...prev, formMode: e.target.checked ? "lite" : "standard" }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                        </label>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-900/50 gap-4">
                        <div className="max-w-md">
                            <p className="font-bold text-sm">Hide Form Section Headings (Optional)</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                                Optional minimal layout: hides the dark green Part A – Part C section heading bars with crisp hairline dividers, while always retaining the Member Declaration &amp; Official Signatures heading.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={Boolean(formSpec.hideSectionHeadings)}
                                onChange={e => setFormSpec(prev => ({ ...prev, hideSectionHeadings: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-900/50 gap-4">
                        <div className="max-w-md">
                            <p className="font-bold text-sm">Require Union/Co-Op Exec. Signature</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                                Enabled by default so offline member application forms include the Union/Co-Op Exec. endorsement block.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={formSpec.requireUnionClearance}
                                onChange={e => setFormSpec(prev => ({ ...prev, requireUnionClearance: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-900/50 gap-4">
                        <div className="max-w-md">
                            <p className="font-bold text-sm">Include Partner Bank / MFB Signature (Optional)</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                                Optional bank countersignature line. Keep off unless your society requires an on-paper bank officer sign-off on member forms.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={Boolean(formSpec.requireBankSignature)}
                                onChange={e => setFormSpec(prev => ({ ...prev, requireBankSignature: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                        </label>
                    </div>

                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Cooperative Custom Member Fields ({formSpec.customFields.length})</span>
                            <button
                                type="button"
                                onClick={() => setFormSpec(prev => ({ ...prev, customFields: [...prev.customFields, { id: `cf_${Date.now()}`, label: "New Field", type: "text", required: false }] }))}
                                className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                                + Add Form Field
                            </button>
                        </div>
                        <div className="space-y-2">
                            {formSpec.customFields.map((cf: CoopCustomField, idx: number) => (
                                <div key={cf.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                                    <input
                                        type="text"
                                        value={cf.label}
                                        onChange={e => setFormSpec(prev => ({
                                            ...prev,
                                            customFields: prev.customFields.map((f, i) => i === idx ? { ...f, label: e.target.value } : f)
                                        }))}
                                        className="sm:col-span-6 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-xs font-semibold"
                                    />
                                    <select
                                        value={cf.type}
                                        onChange={e => setFormSpec(prev => ({
                                            ...prev,
                                            customFields: prev.customFields.map((f, i) => i === idx ? { ...f, type: e.target.value as any } : f)
                                        }))}
                                        className="sm:col-span-3 h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-xs font-bold"
                                    >
                                        <option value="text">Text</option>
                                        <option value="tel">Phone</option>
                                        <option value="number">Number</option>
                                        <option value="textarea">Long Text</option>
                                    </select>
                                    <label className="sm:col-span-2 flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(cf.required)}
                                            onChange={e => setFormSpec(prev => ({
                                                ...prev,
                                                customFields: prev.customFields.map((f, i) => i === idx ? { ...f, required: e.target.checked } : f)
                                            }))}
                                        />
                                        Required
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setFormSpec(prev => ({
                                            ...prev,
                                            customFields: prev.customFields.filter((_, i) => i !== idx)
                                        }))}
                                        className="sm:col-span-1 text-xs font-black text-rose-500 hover:text-rose-600 text-right"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100 dark:border-slate-900/50">
                    <Button type="button" variant="outline" onClick={fetchSettings} disabled={loading || saving} className="w-full sm:w-auto rounded-xl h-10 text-xs font-bold border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50">
                        Discard Changes
                    </Button>
                    <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-black text-xs h-10 rounded-xl shadow-md min-w-[140px]">
                        {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {saving ? 'Saving Config...' : 'Save Configuration'}
                    </Button>
                </div>
            </form>

            <PrintableFormDialog
                open={showPrintForm}
                onClose={() => setShowPrintForm(false)}
                roleType="member"
                coopName={coopName}
                formSpec={formSpec}
                accentClassName="bg-amber-500 hover:bg-amber-600 text-black"
            />
        </div>
    )
}

