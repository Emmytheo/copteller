"use client"

import * as React from "react"
import { ShieldCheck, Printer, CheckSquare, Square } from "lucide-react"

export interface PrintableFormProps {
    roleType?: "member" | "admin" | "investor"
    coopName?: string
    sector?: string
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

export function PrintableForm({ roleType = "member", coopName = "", sector = "", formData = {} }: PrintableFormProps) {
    const f = {
        firstName: formData.firstName || "_________________________",
        lastName: formData.lastName || "_________________________",
        phone: formData.phone || "_________________________",
        email: formData.email || "_________________________",
        bvn: formData.bvn || "_________________________",
        dob: formData.dob || "_________________________",
        address: formData.address || "_________________________________________________________",
        schemeAmount: formData.schemeAmount || "_________________________",
    }

    return (
        <div className="printable-a4-form w-full max-w-[800px] mx-auto bg-white text-black p-8 md:p-12 border border-slate-300 font-sans space-y-6 text-sm relative">
            {/* Header branding */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
                <div className="space-y-1">
                    <h2 className="text-xl font-extrabold uppercase tracking-tight">COPTELLER SYSTEM</h2>
                    <p className="text-xs font-bold text-slate-700 uppercase">OFFICIAL COOPERATIVE APPLICATION FORM</p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <ShieldCheck className="h-3.5 w-3.5 text-black" />
                        <span>Abia Microfinance Bank Cleared Escrow Network</span>
                    </div>
                </div>
                
                {/* Passport photo box */}
                <div className="w-[110px] h-[110px] border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-center p-2 rounded bg-slate-50 shrink-0">
                    <span className="text-[9px] font-bold text-slate-500 uppercase leading-tight">Attach Passport<br />Photo Here<br />(2" x 2")</span>
                </div>
            </div>

            {/* Scheme Type Indicators */}
            <div className="grid grid-cols-3 gap-4 border border-black p-3 bg-slate-50 rounded">
                <div className="flex items-center gap-2">
                    {roleType === "member" ? <CheckSquare className="h-4 w-4 shrink-0" /> : <Square className="h-4 w-4 shrink-0" />}
                    <div>
                        <p className="text-xs font-extrabold uppercase">Member / Driver</p>
                        <p className="text-[9px] text-slate-500 font-bold">Ajo thrift & HP fleet</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {roleType === "admin" ? <CheckSquare className="h-4 w-4 shrink-0" /> : <Square className="h-4 w-4 shrink-0" />}
                    <div>
                        <p className="text-xs font-extrabold uppercase">Cooperative Admin</p>
                        <p className="text-[9px] text-slate-500 font-bold">Union registry vault</p>
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
                        <label className="text-[9px] font-black text-slate-500 uppercase">BVN (Bank Verification No.)</label>
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
                        <p className="font-bold border-b border-slate-300 pb-1 h-6 text-xs">{coopName || "_________________________"}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Union Sector</label>
                        <p className="font-bold border-b border-slate-300 pb-1 h-6 text-xs capitalize">{sector || "_________________________"}</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">CAC / State Registration ID</label>
                        <p className="font-bold border-b border-slate-300 pb-1 h-6 text-xs">_________________________</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">State</label>
                        <p className="font-bold border-b border-slate-300 pb-1 h-6 text-xs">Abia State</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Local Govt Area (LGA)</label>
                        <p className="font-bold border-b border-slate-300 pb-1 h-6 text-xs">_________________________</p>
                    </div>
                </div>
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
                        <div className="flex gap-4 pt-1 text-xs">
                            <span className="flex items-center gap-1.5"><Square className="h-3.5 w-3.5" /> Daily</span>
                            <span className="flex items-center gap-1.5"><Square className="h-3.5 w-3.5" /> Weekly</span>
                            <span className="flex items-center gap-1.5"><Square className="h-3.5 w-3.5" /> Monthly</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Part D: Verification handshake / Signatures */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase bg-slate-900 text-white px-2 py-1 tracking-wider">Part D: Declaration & Off-line Signatures</h3>
                <p className="text-[9px] text-slate-650 font-semibold leading-relaxed">
                    I hereby declare that all information provided above is correct. I authorize the partner Microfinance Bank to clear contributions and HP rentals from my linked escrow vault according to cooperative union bylaws.
                </p>
                <div className="grid grid-cols-3 gap-6 pt-6 text-center text-[10px] font-bold">
                    <div className="space-y-1">
                        <p className="border-b border-black pb-1"> </p>
                        <p className="text-slate-500 uppercase">Applicant Signature & Date</p>
                    </div>
                    <div className="space-y-1">
                        <p className="border-b border-black pb-1"> </p>
                        <p className="text-slate-500 uppercase">Union Leader Clearance</p>
                    </div>
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
