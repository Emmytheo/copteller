"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Printer, CheckSquare, Square, Download, X, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    PRESET_REGISTERED_COOPS,
    resolveMemberFormSpec,
    type CoopMemberFormSpec,
    type RegisteredCoopDirectoryItem,
} from "@/lib/copteller/coop-form-specs"

export interface PrintableFormProps {
    roleType?: "member" | "admin" | "investor"
    coopName?: string
    sector?: string
    regNumber?: string
    state?: string
    lga?: string
    formSpec?: Partial<CoopMemberFormSpec> | null
    customAnswers?: Record<string, string>
    formData?: {
        firstName?: string
        lastName?: string
        phone?: string
        email?: string
        bvn?: string
        dob?: string
        address?: string
        schemeAmount?: string
    }
}

export function PrintableForm({
    roleType = "member",
    coopName = "",
    sector = "",
    regNumber = "",
    state = "",
    lga = "",
    formSpec = null,
    customAnswers = {},
    formData = {},
}: PrintableFormProps) {
    const resolvedSpec = resolveMemberFormSpec(coopName, formSpec, sector || "commerce")
    const displayAmount =
        formData.schemeAmount ||
        (resolvedSpec.defaultContributionNaira
            ? `₦${resolvedSpec.defaultContributionNaira.toLocaleString()}`
            : "_________________________")

    const f = {
        firstName: formData.firstName || "_________________________",
        lastName: formData.lastName || "_________________________",
        phone: formData.phone || "_________________________",
        email: formData.email || "_________________________",
        bvn: formData.bvn || "_________________________",
        dob: formData.dob || "_________________________",
        address: formData.address || "_________________________________________________________",
        schemeAmount: displayAmount,
    }

    const customFields = resolvedSpec.customFields || []
    const requireUnionClearance = Boolean(resolvedSpec.requireUnionClearance)
    const showPassportBox = resolvedSpec.requirePassportPhoto !== false

    return (
        <div
            className="printable-a4-form w-full max-w-[800px] mx-auto bg-white text-black p-8 md:p-10 border border-slate-300 font-sans space-y-5 text-sm relative overflow-hidden"
            style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
            {/* Header branding */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4 gap-4">
                <div className="space-y-1">
                    <h2 className="text-xl font-extrabold uppercase tracking-tight">COPTELLER SYSTEM</h2>
                    <p className="text-xs font-bold text-slate-700 uppercase">OFFICIAL COOPERATIVE APPLICATION FORM</p>
                    {coopName && (
                        <p className="text-[11px] font-black text-black uppercase tracking-wide pt-0.5">
                            {coopName}
                        </p>
                    )}
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <ShieldCheck className="h-3.5 w-3.5 text-black" />
                        <span>Partner Microfinance Bank Cleared Escrow Network</span>
                    </div>
                </div>

                {/* Passport photo box */}
                {showPassportBox && (
                    <div className="w-[105px] h-[105px] border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-center p-2 rounded bg-slate-50 shrink-0">
                        <span className="text-[9px] font-bold text-slate-500 uppercase leading-tight">
                            Attach Passport<br />Photo Here<br />(2&quot; x 2&quot;)
                        </span>
                    </div>
                )}
            </div>

            {/* Scheme Type Indicators */}
            <div className="grid grid-cols-3 gap-4 border border-black p-3 bg-slate-50 rounded">
                <div className="flex items-center gap-2">
                    {roleType === "member" ? <CheckSquare className="h-4 w-4 shrink-0" /> : <Square className="h-4 w-4 shrink-0" />}
                    <div>
                        <p className="text-xs font-extrabold uppercase">Member / Operator</p>
                        <p className="text-[9px] text-slate-500 font-bold">Ajo thrift &amp; asset fleet</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {roleType === "admin" ? <CheckSquare className="h-4 w-4 shrink-0" /> : <Square className="h-4 w-4 shrink-0" />}
                    <div>
                        <p className="text-xs font-extrabold uppercase">Cooperative Admin</p>
                        <p className="text-[9px] text-slate-500 font-bold">Registry vault steward</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {roleType === "investor" ? <CheckSquare className="h-4 w-4 shrink-0" /> : <Square className="h-4 w-4 shrink-0" />}
                    <div>
                        <p className="text-xs font-extrabold uppercase">Asset Underwriter</p>
                        <p className="text-[9px] text-slate-500 font-bold">Private capital pools</p>
                    </div>
                </div>
            </div>

            {/* Part A: Personal profile */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase bg-slate-900 text-white px-2 py-1 tracking-wider">Part A: Applicant Identity Info</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">First Name</label>
                        <p className="font-bold border-b border-slate-300 pb-1 h-6 text-xs">{f.firstName}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Last Name (Surname)</label>
                        <p className="font-bold border-b border-slate-300 pb-1 h-6 text-xs">{f.lastName}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Phone Number</label>
                        <p className="font-bold border-b border-slate-300 pb-1 h-6 text-xs">{f.phone}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Email Address</label>
                        <p className="font-bold border-b border-slate-300 pb-1 h-6 text-xs">{f.email}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">
                            BVN (Bank Verification No.){resolvedSpec.requireBvn === false ? " (Optional)" : ""}
                        </label>
                        <p className="font-mono font-bold border-b border-slate-300 pb-1 h-6 text-xs">{f.bvn}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Date of Birth (DD/MM/YYYY)</label>
                        <p className="font-bold border-b border-slate-300 pb-1 h-6 text-xs">{f.dob}</p>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Residential Home Address</label>
                    <p className="font-bold border-b border-slate-300 pb-1 h-6 text-xs">{f.address}</p>
                </div>
            </div>

            {/* Part B: Cooperative Profile */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase bg-slate-900 text-white px-2 py-1 tracking-wider">Part B: Cooperative Association</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Cooperative Society Name</label>
                        <p className="font-bold border-b border-slate-300 pb-1 min-h-6 text-xs">{coopName || "_________________________"}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Cooperative Sector</label>
                        <p className="font-bold border-b border-slate-300 pb-1 min-h-6 text-xs capitalize">{sector || "_________________________"}</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">CAC / State Registration ID</label>
                        <p className="font-bold border-b border-slate-300 pb-1 min-h-6 text-xs">{regNumber || "_________________________"}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">State</label>
                        <p className="font-bold border-b border-slate-300 pb-1 min-h-6 text-xs">{state || "_________________________"}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Local Govt Area (LGA)</label>
                        <p className="font-bold border-b border-slate-300 pb-1 min-h-6 text-xs">{lga || "_________________________"}</p>
                    </div>
                </div>

                {/* Cooperative-specific form fields */}
                {customFields.length > 0 && (
                    <div className="pt-2 space-y-2">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-wider">
                            Cooperative Member Specifications
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            {customFields.map((field) => (
                                <div key={field.id} className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase">
                                        {field.label} {field.required ? "*" : "(Optional)"}
                                    </label>
                                    <p className="font-bold border-b border-slate-300 pb-1 min-h-6 text-xs">
                                        {customAnswers[field.id] || "_________________________"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Part C: Financial Options Selection */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase bg-slate-900 text-white px-2 py-1 tracking-wider">Part C: Financial Option Selection</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Requested Scheme Contribution Volume (₦)</label>
                        <p className="font-bold border-b border-slate-300 pb-1 h-6 text-xs">{f.schemeAmount}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Contribution Target Frequency</label>
                        <div className="flex gap-4 pt-1 text-xs capitalize">
                            {(["daily", "weekly", "monthly"] as const)
                                .filter((freq) => resolvedSpec.allowedFrequencies.includes(freq))
                                .map((freq) => {
                                    const isDefault = resolvedSpec.defaultFrequency === freq
                                    return (
                                        <span key={freq} className="flex items-center gap-1.5 font-semibold">
                                            {isDefault && coopName ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                                            {freq}
                                        </span>
                                    )
                                })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Part D: Verification handshake / Signatures */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase bg-slate-900 text-white px-2 py-1 tracking-wider">Part D: Declaration &amp; Off-line Signatures</h3>
                <p className="text-[10px] text-slate-600 font-semibold leading-relaxed">
                    I hereby declare that all information given above is correct for the purposes of{" "}
                    <span className="font-extrabold text-black">{resolvedSpec.declarationPurpose}</span>. I authorize the partner Microfinance Bank to clear contributions and scheduled repayments from my linked escrow vault in accordance with applicable cooperative terms.
                </p>
                <div className={`grid ${requireUnionClearance ? "grid-cols-3" : "grid-cols-2"} gap-8 pt-6 text-center text-[10px] font-bold`}>
                    <div className="space-y-1">
                        <p className="border-b border-black pb-1"> </p>
                        <p className="text-slate-500 uppercase">Applicant Signature &amp; Date</p>
                    </div>
                    {requireUnionClearance && (
                        <div className="space-y-1">
                            <p className="border-b border-black pb-1"> </p>
                            <p className="text-slate-500 uppercase">Union Leader Clearance</p>
                        </div>
                    )}
                    <div className="space-y-1">
                        <p className="border-b border-black pb-1"> </p>
                        <p className="text-slate-500 uppercase">Bank Auditor Approver</p>
                    </div>
                </div>
            </div>

            {/* Official seal watermark placeholder */}
            <div className="absolute top-[40%] left-[35%] opacity-5 pointer-events-none select-none flex flex-col items-center">
                <ShieldCheck className="w-48 h-48 text-black" />
                <span className="text-lg font-black tracking-widest mt-2">COPTELLER SECURED</span>
            </div>
        </div>
    )
}

export interface PrintableFormDialogProps extends PrintableFormProps {
    open: boolean
    onClose: () => void
    accentClassName?: string
    selectedCoopId?: string
    registeredCoops?: RegisteredCoopDirectoryItem[]
}

/**
 * Shared modal + body-portaled print root for Copteller A4 application forms.
 * Supports picking any registered cooperative to apply its member form specifications,
 * declaration scope, and signature requirements (e.g., voluntary cooperatives omit Union Leader Clearance).
 */
export function PrintableFormDialog({
    open,
    onClose,
    accentClassName = "bg-emerald-500 hover:bg-emerald-600 text-black",
    selectedCoopId,
    registeredCoops,
    ...formProps
}: PrintableFormDialogProps) {
    const [mounted, setMounted] = React.useState(false)
    const [coops, setCoops] = React.useState<RegisteredCoopDirectoryItem[]>(
        registeredCoops && registeredCoops.length > 0 ? registeredCoops : PRESET_REGISTERED_COOPS
    )
    const [activeCoopId, setActiveCoopId] = React.useState<string>(
        selectedCoopId ||
            (formProps.coopName ? "__custom__" : PRESET_REGISTERED_COOPS[0].id)
    )
    const previewRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        if (registeredCoops && registeredCoops.length > 0) {
            setCoops(registeredCoops)
        }
    }, [registeredCoops])

    React.useEffect(() => {
        if (selectedCoopId) {
            setActiveCoopId(selectedCoopId)
        } else if (formProps.coopName) {
            setActiveCoopId("__custom__")
        }
    }, [selectedCoopId, formProps.coopName])

    React.useEffect(() => {
        if (!open || (registeredCoops && registeredCoops.length > 0)) return
        fetch("/api/copteller/cooperatives?status=active")
            .then((r) => (r.ok ? r.json() : null))
            .then((res) => {
                if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
                    setCoops(res.data)
                    if (!selectedCoopId && !formProps.coopName) {
                        setActiveCoopId(res.data[0].id)
                    }
                }
            })
            .catch(() => {})
    }, [open, registeredCoops, selectedCoopId, formProps.coopName])

    const chosenCoop = React.useMemo(
        () => coops.find((c) => c.id === activeCoopId) || null,
        [coops, activeCoopId]
    )

    const effectiveProps: PrintableFormProps =
        activeCoopId === "__custom__"
            ? formProps
            : activeCoopId === "__blank__"
            ? {
                  ...formProps,
                  coopName: "",
                  sector: "",
                  regNumber: "",
                  state: "",
                  lga: "",
                  formSpec: {
                      declarationPurpose: "Copteller Cooperative System",
                      requireUnionClearance: false,
                      customFields: [],
                  },
              }
            : chosenCoop
            ? {
                  ...formProps,
                  coopName: chosenCoop.name,
                  sector: chosenCoop.sector,
                  regNumber: chosenCoop.regNumber || "",
                  state: chosenCoop.state || "",
                  lga: chosenCoop.lga || "",
                  formSpec: chosenCoop.memberFormSpec,
              }
            : formProps

    const handleDownloadHtml = () => {
        const node = previewRef.current?.querySelector(".printable-a4-form")
        if (!node) return

        const collectedCss: string[] = []
        for (const sheet of Array.from(document.styleSheets)) {
            try {
                const rules = Array.from(sheet.cssRules || []).map((r) => r.cssText).join("\n")
                if (rules) collectedCss.push(rules)
            } catch {
                // Ignore cross-origin font/CSS sheets
            }
        }

        const roleLabel = effectiveProps.roleType || "member"
        const coopSlug = (effectiveProps.coopName || "copteller")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")

        const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${effectiveProps.coopName || "Copteller"} ${roleLabel.toUpperCase()} Application Form</title>
  <style>
    ${collectedCss.join("\n")}
    @page { size: A4 portrait; margin: 10mm; }
    html, body {
      background: #f1f5f9 !important;
      color: #000 !important;
      margin: 0;
      padding: 24px 12px;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .offline-toolbar {
      max-width: 800px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .offline-print-btn {
      background: #10b981;
      color: #000;
      border: 0;
      padding: 10px 16px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 12px;
      cursor: pointer;
    }
    @media print {
      html, body { background: #fff !important; padding: 0 !important; }
      .offline-toolbar { display: none !important; }
      .printable-a4-form { border: 1px solid #cbd5e1 !important; max-width: 100% !important; }
    }
  </style>
</head>
<body>
  <div class="offline-toolbar">
    <button class="offline-print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  ${node.outerHTML}
</body>
</html>`

        const blob = new Blob([htmlDoc], { type: "text/html;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${coopSlug}-${roleLabel}-application-form.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <>
            <AnimatePresence>
                {open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:hidden">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-4xl h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
                        >
                            <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3 bg-slate-950/60">
                                <div>
                                    <h3 className="text-base font-black text-white">Application Form Print Preview</h3>
                                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                        Formatted for A4 paper. Form fields &amp; declaration adapt to the selected registered cooperative.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleDownloadHtml}
                                        className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-white font-bold text-xs px-3 sm:px-4 h-9 rounded-xl flex items-center gap-1.5"
                                    >
                                        <Download className="h-4 w-4" /> Download File
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => window.print()}
                                        className={`${accentClassName} font-black text-xs px-4 h-9 rounded-xl border-0 flex items-center gap-1.5 shadow-lg`}
                                    >
                                        <Printer className="h-4 w-4" /> Print / Save PDF
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 rounded-xl"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Registered Cooperative Selector Strip */}
                            <div className="px-4 sm:px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2 text-xs text-slate-300 font-bold shrink-0">
                                    <Building2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                    <span>Registered Cooperative Spec:</span>
                                </div>
                                <select
                                    value={activeCoopId}
                                    onChange={(e) => setActiveCoopId(e.target.value)}
                                    className="w-full sm:max-w-md h-9 px-3 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                                >
                                    {formProps.coopName && (
                                        <option value="__custom__">Current Selection: {formProps.coopName}</option>
                                    )}
                                    {coops.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.memberFormSpec.requireUnionClearance ? "Union Clearance" : "Voluntary / Direct"})
                                        </option>
                                    ))}
                                    <option value="__blank__">Generic Blank Cooperative Form</option>
                                </select>
                            </div>

                            <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-10 bg-slate-950/80">
                                <div ref={previewRef} className="shadow-2xl rounded-xl overflow-hidden bg-white">
                                    <PrintableForm {...effectiveProps} />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {mounted && createPortal(
                <div id="copteller-print-area-wrapper" className="print-root hidden print:block bg-white text-black">
                    <PrintableForm {...effectiveProps} />
                </div>,
                document.body
            )}
        </>
    )
}
