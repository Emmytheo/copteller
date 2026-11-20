"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Printer, CheckSquare, Square, Download, X, Building2, FileSignature, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CoptellerLogo, CoptellerMark } from "@/components/copteller/copteller-logo"
import {
    PRESET_REGISTERED_COOPS,
    resolveMemberFormSpec,
    type CoopMemberFormSpec,
    type RegisteredCoopDirectoryItem,
} from "@/lib/copteller/coop-form-specs"

export interface PrintableFormProps {
    roleType?: "member" | "admin" | "investor"
    formMode?: "standard" | "lite"
    coopName?: string
    sector?: string
    regNumber?: string
    certificateCode?: string
    registrationDate?: string
    issuingAuthority?: string
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
        nin?: string
        dob?: string
        address?: string
        schemeAmount?: string
        selectedFrequency?: "daily" | "weekly" | "monthly" | ""
    }
}

export function PrintableForm({
    roleType = "member",
    formMode,
    coopName = "",
    sector = "",
    regNumber = "",
    certificateCode = "",
    registrationDate = "",
    issuingAuthority = "",
    state = "",
    lga = "",
    formSpec = null,
    customAnswers = {},
    formData = {},
}: PrintableFormProps) {
    const resolvedSpec = resolveMemberFormSpec(coopName, formSpec, sector || "commerce")
    const isLite = (formMode || resolvedSpec.formMode) === "lite"
    const cleanDeclarationPurpose = isLite
        ? (coopName?.trim() || resolvedSpec.declarationPurpose.replace(/\s*\(Reg\.\s*No:[^)]*\)/gi, "").trim())
        : resolvedSpec.declarationPurpose
    const contributionFieldLabel = resolvedSpec.contributionFieldLabel || "Target Contribution Amount (₦)"
    const displayAmount =
        formData.schemeAmount !== undefined && formData.schemeAmount !== ""
            ? formData.schemeAmount
            : resolvedSpec.prefillContributionAmount && resolvedSpec.defaultContributionNaira
              ? `₦${resolvedSpec.defaultContributionNaira.toLocaleString()}`
              : ""

    const f = {
        firstName: formData.firstName || "",
        lastName: formData.lastName || "",
        phone: formData.phone || "",
        email: formData.email || "",
        bvn: formData.bvn || "",
        nin: formData.nin || "",
        dob: formData.dob || "",
        address: formData.address || "",
        schemeAmount: displayAmount,
    }

    const customFields = resolvedSpec.customFields || []
    const requireUnionClearance = resolvedSpec.requireUnionClearance !== false
    const requireBankSignature = Boolean(resolvedSpec.requireBankSignature)
    const showPassportBox = resolvedSpec.requirePassportPhoto !== false

    const signatureCount = 1 + (requireUnionClearance ? 1 : 0) + (requireBankSignature ? 1 : 0)
    const signatureGridCls =
        signatureCount === 3
            ? "grid-cols-3 gap-6"
            : signatureCount === 2
              ? "grid-cols-2 gap-10"
              : "grid-cols-1 max-w-xs mx-auto"

    return (
        <div
            className="printable-a4-form w-full max-w-[800px] mx-auto bg-white text-slate-950 border border-slate-300 font-sans text-[12px] relative overflow-hidden"
            style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
            {/* Institutional top sovereignty stripe */}
            <div className="h-2 w-full bg-gradient-to-r from-[#022C22] via-[#047857] to-[#D97706]" />

            <div className="p-6 md:p-7 space-y-4 relative z-10">
                {/* Header branding */}
                <div className="flex justify-between items-start border-b-2 border-[#064E3B] pb-3.5 gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
                        <CoptellerLogo
                            variant="print"
                            size="md"
                            subtitle="Cooperative Escrow &amp; Thrift Network"
                        />

                        <div className="pt-1 space-y-0.5">
                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-[0.16em]">
                                {isLite
                                    ? "Member Onboarding Form (Lite Edition)"
                                    : "Official Membership & Cooperative Onboarding Form"}
                            </p>
                            {coopName && (
                                <h2 className="text-[13.5px] font-black text-slate-950 uppercase tracking-tight leading-snug">
                                    {coopName}
                                </h2>
                            )}
                            {!isLite && (
                                <>
                                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[9.5px] font-bold text-slate-600 pt-0.5">
                                        {regNumber && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#064E3B] font-mono font-extrabold">
                                                REG. NO: {regNumber}
                                            </span>
                                        )}
                                        {certificateCode && (
                                            <span>FORM: {certificateCode}</span>
                                        )}
                                        {registrationDate && (
                                            <span>&bull; REGISTERED: {registrationDate}</span>
                                        )}
                                        {(lga || state) && (
                                            <span>&bull; {[lga, state].filter(Boolean).join(", ")}</span>
                                        )}
                                    </div>
                                    {issuingAuthority && (
                                        <p className="text-[8.5px] font-semibold text-slate-500">
                                            Statutory Registry: {issuingAuthority} (Nigeria Co-operative Societies Act 2004)
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Passport photo box */}
                    {showPassportBox && (
                        <div className="w-[96px] h-[106px] border-[1.5px] border-dashed border-slate-500 flex flex-col items-center justify-center text-center p-2 rounded-md bg-slate-50/90 shrink-0">
                            <span className="text-[8.5px] font-extrabold text-slate-500 uppercase leading-tight">
                                Affix Recent<br />Passport Photo<br />(2&quot; &times; 2&quot;)
                            </span>
                        </div>
                    )}
                </div>

                {/* Scheme Type / Applicant Classification Strip (omitted in Very Lite mode) */}
                {!isLite && (
                    <div className="grid grid-cols-3 gap-3 border border-slate-300 px-3 py-2 bg-slate-50/90 rounded-md">
                        <div className="flex items-center gap-2">
                            {roleType === "member" ? (
                                <CheckSquare className="h-3.5 w-3.5 shrink-0 text-[#064E3B]" />
                            ) : (
                                <Square className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            )}
                            <div>
                                <p className="text-[10px] font-black uppercase leading-tight">Member / Operator</p>
                                <p className="text-[8.5px] text-slate-500 font-semibold">Thrift (Ajo) &amp; asset fleet</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {roleType === "admin" ? (
                                <CheckSquare className="h-3.5 w-3.5 shrink-0 text-[#064E3B]" />
                            ) : (
                                <Square className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            )}
                            <div>
                                <p className="text-[10px] font-black uppercase leading-tight">Cooperative Officer</p>
                                <p className="text-[8.5px] text-slate-500 font-semibold">Executive / registry steward</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {roleType === "investor" ? (
                                <CheckSquare className="h-3.5 w-3.5 shrink-0 text-[#064E3B]" />
                            ) : (
                                <Square className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            )}
                            <div>
                                <p className="text-[10px] font-black uppercase leading-tight">Asset Underwriter</p>
                                <p className="text-[8.5px] text-slate-500 font-semibold">Fleet capital pools</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Part A: Personal Identity Info */}
                <div className={isLite ? "space-y-3" : "space-y-2.5"}>
                    <h3 className="text-[10px] font-black uppercase bg-[#064E3B] text-white px-2.5 py-1 tracking-[0.12em] rounded-sm">
                        {isLite
                            ? "Part A: Member Identity Information (Fill in BLOCK LETTERS)"
                            : "Part A: Applicant Personal & Identity Details (Fill in BLOCK LETTERS)"}
                    </h3>
                    <div className={`grid grid-cols-2 gap-x-5 ${isLite ? "gap-y-3" : "gap-y-2.5"}`}>
                        <div>
                            <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">First Name &amp; Middle Name</label>
                            <div className={`font-bold border-b border-slate-400 ${isLite ? "min-h-[25px]" : "min-h-[22px]"} pt-0.5 text-[11px]`}>{f.firstName}</div>
                        </div>
                        <div>
                            <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Surname (Last Name)</label>
                            <div className={`font-bold border-b border-slate-400 ${isLite ? "min-h-[25px]" : "min-h-[22px]"} pt-0.5 text-[11px]`}>{f.lastName}</div>
                        </div>
                    </div>
                    {isLite ? (
                        <div className="grid grid-cols-3 items-end gap-x-4 gap-y-3">
                            <div>
                                <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Phone Number (WhatsApp / GSM)</label>
                                <div className="font-bold border-b border-slate-400 min-h-[25px] pt-0.5 text-[11px]">{f.phone}</div>
                            </div>
                            <div>
                                <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                                    BVN (11 Digits){resolvedSpec.requireBvn === false ? " — Opt." : ""}
                                </label>
                                <div className="font-mono font-bold border-b border-slate-400 min-h-[25px] pt-0.5 text-[11px]">{f.bvn}</div>
                            </div>
                            <div>
                                <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">NIN (11 Digits)</label>
                                <div className="font-mono font-bold border-b border-slate-400 min-h-[25px] pt-0.5 text-[11px]">{f.nin}</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
                                <div>
                                    <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Phone Number (WhatsApp / GSM)</label>
                                    <div className="font-bold border-b border-slate-400 min-h-[22px] pt-0.5 text-[11px]">{f.phone}</div>
                                </div>
                                <div>
                                    <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Email Address (Optional)</label>
                                    <div className="font-bold border-b border-slate-400 min-h-[22px] pt-0.5 text-[11px]">{f.email}</div>
                                </div>
                                <div>
                                    <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Date of Birth (DD / MM / YYYY)</label>
                                    <div className="font-bold border-b border-slate-400 min-h-[22px] pt-0.5 text-[11px]">{f.dob}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                                <div>
                                    <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                                        BVN (Bank Verification No. — 11 Digits){resolvedSpec.requireBvn === false ? " — Optional" : ""}
                                    </label>
                                    <div className="font-mono font-bold border-b border-slate-400 min-h-[22px] pt-0.5 text-[11px]">{f.bvn}</div>
                                </div>
                                <div>
                                    <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                                        NIN (National Identification No. — 11 Digits)
                                    </label>
                                    <div className="font-mono font-bold border-b border-slate-400 min-h-[22px] pt-0.5 text-[11px]">{f.nin}</div>
                                </div>
                            </div>
                        </>
                    )}
                    <div>
                        <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Current Residential Address</label>
                        <div className={`font-bold border-b border-slate-400 ${isLite ? "min-h-[25px]" : "min-h-[22px]"} pt-0.5 text-[11px]`}>{f.address}</div>
                    </div>
                </div>

                {/* Part B: Cooperative Society & Operational Details */}
                <div className={isLite ? "space-y-3.5" : "space-y-2.5"}>
                    <h3 className="text-[10px] font-black uppercase bg-[#064E3B] text-white px-2.5 py-1 tracking-[0.12em] rounded-sm">
                        {isLite
                            ? "Part B: Cooperative & Member Operational Details"
                            : "Part B: Cooperative Society & Operational Profile"}
                    </h3>
                    {isLite ? (
                        <div>
                            <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Cooperative Society Name</label>
                            <div className="font-extrabold border-b border-slate-400 min-h-[26px] pt-0.5 text-[11px] leading-tight">
                                {coopName}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-12 gap-x-4 gap-y-2.5">
                            <div className="col-span-8">
                                <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Registered Cooperative Society Name</label>
                                <div className="font-extrabold border-b border-slate-400 min-h-[22px] pt-0.5 text-[10.5px] leading-tight">
                                    {coopName}
                                </div>
                            </div>
                            <div className="col-span-4">
                                <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Official Registration No.</label>
                                <div className="font-mono font-extrabold border-b border-slate-400 min-h-[22px] pt-0.5 text-[10.5px]">
                                    {regNumber}
                                </div>
                            </div>
                            <div className="col-span-4">
                                <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Sector / Category</label>
                                <div className="font-bold border-b border-slate-400 min-h-[22px] pt-0.5 text-[11px] capitalize">
                                    {sector ? `${sector} (Multi-Purpose)` : ""}
                                </div>
                            </div>
                            <div className="col-span-4">
                                <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">State</label>
                                <div className="font-bold border-b border-slate-400 min-h-[22px] pt-0.5 text-[11px]">{state}</div>
                            </div>
                            <div className="col-span-4">
                                <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">City / Local Govt Area (LGA)</label>
                                <div className="font-bold border-b border-slate-400 min-h-[22px] pt-0.5 text-[11px]">{lga}</div>
                            </div>
                        </div>
                    )}

                    {/* Cooperative-specific operational & guarantor fields */}
                    {customFields.length > 0 && (
                        <div className="pt-1 space-y-2">
                            <p className="text-[8.5px] font-black text-amber-800 uppercase tracking-[0.14em]">
                                Member Operational &amp; Next-of-Kin Specifications
                            </p>
                            <div className={`grid grid-cols-2 gap-x-5 ${isLite ? "gap-y-3.5" : "gap-y-2.5"}`}>
                                {customFields.map((field) => (
                                    <div key={field.id}>
                                        <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                                            {field.label} {field.required ? "*" : "(Optional)"}
                                        </label>
                                        <div className={`font-bold border-b border-slate-400 ${isLite ? "min-h-[26px]" : "min-h-[22px]"} pt-0.5 text-[11px]`}>
                                            {customAnswers[field.id] || ""}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Part C: Financial Contribution Selection */}
                <div className="space-y-2.5">
                    <h3 className="text-[10px] font-black uppercase bg-[#064E3B] text-white px-2.5 py-1 tracking-[0.12em] rounded-sm">
                        Part C: Contribution &amp; Thrift Plan Selection
                    </h3>
                    <div className="grid grid-cols-12 gap-x-5 gap-y-2">
                        <div className="col-span-5">
                            <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                                {contributionFieldLabel}
                            </label>
                            <div className="font-bold border-b border-slate-400 min-h-[22px] pt-0.5 text-[11px]">
                                {f.schemeAmount}
                            </div>
                        </div>
                        <div className="col-span-7">
                            <label className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                                Preferred Contribution Frequency (Tick &#10003;)
                            </label>
                            <div className="flex flex-wrap gap-5 pt-1 text-[11px] capitalize">
                                {(["daily", "weekly", "monthly"] as const)
                                    .filter((freq) => resolvedSpec.allowedFrequencies.includes(freq))
                                    .map((freq) => {
                                        const isChecked =
                                            formData.selectedFrequency !== undefined
                                                ? formData.selectedFrequency === freq
                                                : Boolean(f.schemeAmount) && resolvedSpec.defaultFrequency === freq
                                        return (
                                            <span key={freq} className="flex items-center gap-1.5 font-bold">
                                                {isChecked ? (
                                                    <CheckSquare className="h-3.5 w-3.5 text-[#064E3B]" />
                                                ) : (
                                                    <Square className="h-3.5 w-3.5 text-slate-700" />
                                                )}
                                                {freq}
                                            </span>
                                        )
                                    })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Part D: Declaration & Official Signatures */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase bg-[#064E3B] text-white px-2.5 py-1 tracking-[0.12em] rounded-sm">
                        Part D: Member Declaration &amp; Official Signatures
                    </h3>
                    <p className="text-[9.5px] text-slate-700 font-semibold leading-relaxed">
                        I hereby apply for membership and declare that all information provided above is true and accurate for the purposes of{" "}
                        <span className="font-extrabold text-slate-950">{cleanDeclarationPurpose}</span>. I agree to abide by the bye-laws of the Society and authorize Copteller Cooperative OS and its licensed partner financial institution settlement rails to record my contributions, dues, and scheduled scheme repayments transparently in my cooperative ledger.
                    </p>

                    <div className={`grid ${signatureGridCls} pt-7 text-center text-[9.5px] font-bold`}>
                        <div className="space-y-1">
                            <div className="border-b border-slate-900 h-6" />
                            <p className="text-slate-900 font-black uppercase tracking-wide">Applicant Signature &amp; Date</p>
                            <p className="text-[8px] text-slate-500 font-semibold">Date: ____ / ____ / 20____</p>
                        </div>

                        {requireUnionClearance && (
                            <div className="space-y-1">
                                <div className="border-b border-slate-900 h-6" />
                                <p className="text-slate-900 font-black uppercase tracking-wide">Union/Co-Op Exec. Signature</p>
                                <p className="text-[8px] text-slate-500 font-semibold">Name, Stamp &amp; Date: ____ / ____ / 20____</p>
                            </div>
                        )}

                        {requireBankSignature && (
                            <div className="space-y-1">
                                <div className="border-b border-slate-900 h-6" />
                                <p className="text-slate-900 font-black uppercase tracking-wide">Partner Bank / MFB Approval (Optional)</p>
                                <p className="text-[8px] text-slate-500 font-semibold">Authorized Officer &amp; Stamp</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom official audit footer */}
                <div className="pt-2.5 mt-1 border-t border-slate-200 flex items-center justify-between text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Powered by Copteller Cooperative Escrow OS</span>
                    <span>
                        {isLite
                            ? "Lite Member Onboarding Form • Form CT-MEM-LITE"
                            : `${regNumber ? `Registry Ref: ${regNumber}` : "Official Paper Onboarding Form"} • Form CT-MEM-01`}
                    </span>
                </div>
            </div>

            {/* Subtle Official Crest Watermark */}
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-[0.045] pointer-events-none select-none z-0">
                <CoptellerMark size={210} variant="watermark" />
                <span className="text-sm font-black tracking-[0.35em] text-[#064E3B] mt-3 uppercase">
                    COPTELLER OFFICIAL REGISTRY
                </span>
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
 * Supports picking any registered cooperative, reinstating Union Leader Signature by default,
 * and toggling optional Partner Bank / MFB approval signature before printing or downloading.
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
    const [unionSigOverride, setUnionSigOverride] = React.useState<boolean | null>(null)
    const [bankSigOverride, setBankSigOverride] = React.useState<boolean | null>(null)
    const [formModeOverride, setFormModeOverride] = React.useState<"standard" | "lite" | null>(null)
    const [amountOverride, setAmountOverride] = React.useState<string>("")
    const [amountTouched, setAmountTouched] = React.useState(false)
    const [contributionLabelOverride, setContributionLabelOverride] = React.useState<string>("")
    const [frequencyOverride, setFrequencyOverride] = React.useState<"" | "daily" | "weekly" | "monthly">("")
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
        // Reset per-preview overrides whenever the user switches cooperatives
        setUnionSigOverride(null)
        setBankSigOverride(null)
        setAmountOverride("")
        setAmountTouched(false)
        setContributionLabelOverride("")
        setFrequencyOverride("")
    }, [activeCoopId])

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

    const baseProps: PrintableFormProps =
        activeCoopId === "__custom__"
            ? formProps
            : activeCoopId === "__blank__"
            ? {
                  ...formProps,
                  coopName: "",
                  sector: "",
                  regNumber: "",
                  certificateCode: "",
                  registrationDate: "",
                  issuingAuthority: "",
                  state: "",
                  lga: "",
                  formSpec: {
                      declarationPurpose: "Copteller Cooperative System",
                      requireUnionClearance: true,
                      requireBankSignature: false,
                      customFields: [],
                  },
              }
            : chosenCoop
            ? {
                  ...formProps,
                  coopName: chosenCoop.name,
                  sector: chosenCoop.sector,
                  regNumber: chosenCoop.regNumber || "",
                  certificateCode: chosenCoop.certificateCode || "",
                  registrationDate: chosenCoop.registrationDate || "",
                  issuingAuthority: chosenCoop.issuingAuthority || "",
                  state: chosenCoop.state || "",
                  lga: chosenCoop.lga || "",
                  formSpec: chosenCoop.memberFormSpec,
              }
            : formProps

    const baseResolvedSpec = resolveMemberFormSpec(
        baseProps.coopName || "",
        baseProps.formSpec,
        baseProps.sector || "commerce"
    )

    const effectiveUnionSig = unionSigOverride !== null ? unionSigOverride : baseResolvedSpec.requireUnionClearance
    const effectiveBankSig = bankSigOverride !== null ? bankSigOverride : baseResolvedSpec.requireBankSignature
    const effectiveFormMode: "standard" | "lite" =
        formModeOverride || formProps.formMode || baseResolvedSpec.formMode || "standard"
    const cleanedAmountDigits = amountOverride.replace(/[^0-9.]/g, "")
    const formattedOverrideAmount = cleanedAmountDigits
        ? `₦${Number(cleanedAmountDigits).toLocaleString()}`
        : ""
    const effectiveSchemeAmount = amountTouched
        ? formattedOverrideAmount
        : baseProps.formData?.schemeAmount ||
          (baseResolvedSpec.prefillContributionAmount && baseResolvedSpec.defaultContributionNaira
              ? `₦${baseResolvedSpec.defaultContributionNaira.toLocaleString()}`
              : "")

    const effectiveProps: PrintableFormProps = {
        ...baseProps,
        formMode: effectiveFormMode,
        formData: {
            ...baseProps.formData,
            schemeAmount: effectiveSchemeAmount,
            selectedFrequency: frequencyOverride,
        },
        formSpec: {
            ...baseResolvedSpec,
            formMode: effectiveFormMode,
            requireUnionClearance: effectiveUnionSig,
            requireBankSignature: effectiveBankSig,
            contributionFieldLabel: contributionLabelOverride.trim() || baseResolvedSpec.contributionFieldLabel,
            prefillContributionAmount: amountTouched ? Boolean(formattedOverrideAmount) : baseResolvedSpec.prefillContributionAmount,
            defaultFrequency: frequencyOverride || baseResolvedSpec.defaultFrequency,
        },
    }

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
    @page { size: A4 portrait; margin: 8mm; }
    html, body {
      background: #f1f5f9 !important;
      color: #020617 !important;
      margin: 0;
      padding: 20px 12px;
      font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .offline-toolbar {
      max-width: 800px;
      margin: 0 auto 14px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .offline-hint {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }
    .offline-print-btn {
      background: #047857;
      color: #fff;
      border: 0;
      padding: 10px 18px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 12px;
      cursor: pointer;
    }
    @media print {
      html, body { background: #fff !important; padding: 0 !important; }
      .offline-toolbar { display: none !important; }
      .printable-a4-form { border: 1px solid #cbd5e1 !important; max-width: 100% !important; box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="offline-toolbar">
    <span class="offline-hint">A4 Single-Page Print Ready &bull; ${effectiveProps.coopName || "Copteller Cooperative Form"}</span>
    <button class="offline-print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  ${node.outerHTML}
</body>
</html>`

        const blob = new Blob([htmlDoc], { type: "text/html;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const modeSuffix = effectiveFormMode === "lite" ? "-lite" : ""
        a.download = `${coopSlug}-${roleLabel}${modeSuffix}-application-form.html`
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
                            className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-4xl h-[92dvh] flex flex-col overflow-hidden shadow-2xl"
                        >
                            <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3 bg-slate-950/60">
                                <div>
                                    <h3 className="text-base font-black text-white">Application Form Print Preview</h3>
                                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                        Formatted for single-page A4 paper with official Copteller crest &amp; cooperative registry details.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleDownloadHtml}
                                        className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-white font-bold text-xs px-3 sm:px-4 h-9 rounded-xl flex items-center gap-1.5"
                                    >
                                        <Download className="h-4 w-4" /> Download HTML
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

                            {/* Registered Cooperative Selector + Signature Toggles */}
                            <div className="px-4 sm:px-5 py-3 bg-slate-900/90 border-b border-slate-800 space-y-2.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2 text-xs text-slate-300 font-bold shrink-0">
                                        <Building2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Registered Cooperative:</span>
                                    </div>
                                    <select
                                        value={activeCoopId}
                                        onChange={(e) => setActiveCoopId(e.target.value)}
                                        className="w-full sm:max-w-lg h-9 px-3 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                                    >
                                        {formProps.coopName && (
                                            <option value="__custom__">Current Selection: {formProps.coopName}</option>
                                        )}
                                        {coops.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}{c.regNumber ? ` (${c.regNumber})` : ""}
                                            </option>
                                        ))}
                                        <option value="__blank__">Generic Blank Cooperative Form</option>
                                    </select>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px]">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        Form Edition:
                                    </span>
                                    <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setFormModeOverride("standard")}
                                            className={`px-2.5 py-1 rounded-md text-[10.5px] font-black transition-colors ${
                                                effectiveFormMode === "standard"
                                                    ? "bg-emerald-500 text-black"
                                                    : "text-slate-300 hover:text-white"
                                            }`}
                                        >
                                            Standard
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormModeOverride("lite")}
                                            className={`px-2.5 py-1 rounded-md text-[10.5px] font-black transition-colors ${
                                                effectiveFormMode === "lite"
                                                    ? "bg-amber-400 text-black"
                                                    : "text-slate-300 hover:text-white"
                                            }`}
                                        >
                                            Very Lite (Minimal)
                                        </button>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">
                                        Signatures:
                                    </span>
                                    <label className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-950/80 text-slate-200 font-bold cursor-pointer hover:border-emerald-500/60 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={effectiveUnionSig}
                                            onChange={(e) => setUnionSigOverride(e.target.checked)}
                                            className="accent-emerald-500 h-3.5 w-3.5"
                                        />
                                        <FileSignature className="h-3.5 w-3.5 text-emerald-400" />
                                        <span>Union/Co-Op Exec. Signature</span>
                                    </label>
                                    <label className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-950/80 text-slate-200 font-bold cursor-pointer hover:border-amber-500/60 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={effectiveBankSig}
                                            onChange={(e) => setBankSigOverride(e.target.checked)}
                                            className="accent-amber-500 h-3.5 w-3.5"
                                        />
                                        <Landmark className="h-3.5 w-3.5 text-amber-400" />
                                        <span>Partner Bank Signature (Optional)</span>
                                    </label>
                                </div>

                                {/* Configurable Target Contribution Amount & Field Label */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1.5 border-t border-slate-800/80 text-[11px]">
                                    <div className="sm:col-span-5 flex flex-col gap-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                            Contribution Field Label
                                        </label>
                                        <input
                                            type="text"
                                            value={contributionLabelOverride}
                                            onChange={(e) => setContributionLabelOverride(e.target.value)}
                                            placeholder={baseResolvedSpec.contributionFieldLabel || "Target Contribution Amount (₦)"}
                                            className="h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white text-[11px] font-semibold focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div className="sm:col-span-4 flex flex-col gap-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                            Pre-fill Amount (₦) — blank for member entry
                                        </label>
                                        <div className="flex gap-1.5">
                                            <input
                                                type="number"
                                                min={0}
                                                step={500}
                                                value={amountTouched ? amountOverride : (baseResolvedSpec.prefillContributionAmount && baseResolvedSpec.defaultContributionNaira ? String(baseResolvedSpec.defaultContributionNaira) : "")}
                                                onChange={(e) => {
                                                    setAmountTouched(true)
                                                    setAmountOverride(e.target.value)
                                                }}
                                                placeholder="Leave blank (handwritten)"
                                                className="w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white text-[11px] font-bold focus:outline-none focus:border-emerald-500"
                                            />
                                            {(amountOverride || effectiveSchemeAmount) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAmountTouched(true)
                                                        setAmountOverride("")
                                                    }}
                                                    className="px-2 h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 shrink-0"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="sm:col-span-3 flex flex-col gap-1">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                            Frequency Tick
                                        </label>
                                        <select
                                            value={frequencyOverride}
                                            onChange={(e) => setFrequencyOverride(e.target.value as any)}
                                            className="h-8 px-2 rounded-lg border border-slate-700 bg-slate-950 text-white text-[11px] font-bold focus:outline-none focus:border-emerald-500"
                                        >
                                            <option value="">Blank (Member ticks)</option>
                                            <option value="daily">Pre-tick: Daily</option>
                                            <option value="weekly">Pre-tick: Weekly</option>
                                            <option value="monthly">Pre-tick: Monthly</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 bg-slate-950/80">
                                <div ref={previewRef} className="shadow-2xl rounded-xl overflow-hidden bg-white max-w-[800px] mx-auto">
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
