"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
    Gift, ShieldCheck, CheckCircle2, ArrowRight, Wallet, Building2, 
    Lock, Sparkles, AlertCircle, Copy, ExternalLink 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"

const NIGERIAN_BANKS = [
    { code: "044", name: "Access Bank" },
    { code: "058", name: "Guaranty Trust Bank (GTBank)" },
    { code: "057", name: "Zenith Bank" },
    { code: "011", name: "First Bank of Nigeria" },
    { code: "033", name: "United Bank for Africa (UBA)" },
    { code: "214", name: "First City Monument Bank (FCMB)" },
    { code: "035", name: "Wema Bank / ALAT" },
    { code: "070", name: "Fidelity Bank" },
    { code: "082", name: "Union Bank" },
    { code: "232", name: "Sterling Bank" },
    { code: "999992", name: "OPay Digital Services" },
    { code: "999991", name: "PalmPay" },
    { code: "090267", name: "Kuda Bank" },
    { code: "090110", name: "Abia State Microfinance Bank" },
]

export default function PublicClaimPage() {
    return (
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs font-semibold">Loading claim...</div>}>
            <ClaimContent />
        </React.Suspense>
    )
}

function ClaimContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [loading, setLoading] = React.useState(true)
    const [claimData, setClaimData] = React.useState<any | null>(null)
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

    // Form inputs
    const [payoutMethod, setPayoutMethod] = React.useState<'wallet_credit' | 'direct_bank_transfer'>('wallet_credit')
    const [phoneNumber, setPhoneNumber] = React.useState('')
    const [pin, setPin] = React.useState('1234')
    const [selectedBank, setSelectedBank] = React.useState('044')
    const [accountNumber, setAccountNumber] = React.useState('')
    const [accountName, setAccountName] = React.useState('')
    const [claiming, setClaiming] = React.useState(false)
    const [successResult, setSuccessResult] = React.useState<any | null>(null)

    React.useEffect(() => {
        if (!token) {
            setErrorMsg("No claim token provided in the link. Please check your SMS or invite message.")
            setLoading(false)
            return
        }

        const fetchClaim = async () => {
            try {
                const res = await fetch(`/api/copteller/campaigns/claim?token=${encodeURIComponent(token)}`)
                const json = await res.json()
                if (json.success) {
                    setClaimData(json)
                    setPhoneNumber(json.recipient.rawPhone || '')
                } else {
                    setErrorMsg(json.error || "Unable to resolve claim token.")
                }
            } catch (err: any) {
                setErrorMsg("Failed to connect to the Copteller settlement network.")
            } finally {
                setLoading(false)
            }
        }

        fetchClaim()
    }, [token])

    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token) return

        if (payoutMethod === 'direct_bank_transfer') {
            if (!accountNumber || accountNumber.length !== 10) {
                toast.error("Please enter a valid 10-digit NUBAN account number.")
                return
            }
        }

        setClaiming(true)
        try {
            const bankObj = NIGERIAN_BANKS.find(b => b.code === selectedBank)

            const res = await fetch('/api/copteller/campaigns/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    payoutMethod,
                    phoneNumber,
                    pin,
                    bankCode: selectedBank,
                    bankName: bankObj?.name,
                    accountNumber,
                    accountName: accountName || claimData?.recipient?.fullName,
                })
            })

            const json = await res.json()
            if (json.success) {
                setSuccessResult(json)
                toast.success("Funds successfully disbursed!")
            } else {
                toast.error(json.error || "Claim failed.")
            }
        } catch (err: any) {
            toast.error(err.message || "Network error while claiming funds.")
        } finally {
            setClaiming(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="p-4 bg-emerald-500/10 rounded-2xl animate-pulse">
                    <Gift className="h-10 w-10 text-emerald-500" />
                </div>
                <h3 className="text-base font-black text-foreground">Verifying Escrow Allocation...</h3>
                <p className="text-xs text-muted-foreground">Checking claim token with Abia MFB Settlement Gateway</p>
            </div>
        )
    }

    if (errorMsg || !claimData) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="p-4 bg-destructive/10 rounded-2xl">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <h3 className="text-lg font-black text-foreground">Claim Unavailable</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">{errorMsg}</p>
                <Button asChild variant="outline" className="text-xs font-bold rounded-xl h-10 mt-2">
                    <Link href="/copteller">Return to Home</Link>
                </Button>
            </div>
        )
    }

    const { recipient, campaign } = claimData
    const isAlreadyClaimed = recipient.status === 'claimed'

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 flex items-center justify-center font-sans">
            <div className="w-full max-w-lg space-y-6">

                {/* Brand Header */}
                <div className="text-center space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 inline-flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Official Disbursement Portal
                    </span>
                    <h2 className="text-xs text-muted-foreground font-bold">{campaign.organizationName}</h2>
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
                    
                    {/* Ambient Glow */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                    {/* Success Screen */}
                    {successResult ? (
                        <div className="text-center py-6 space-y-5">
                            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-foreground">Funds Disbursed!</h3>
                                <p className="text-xs text-muted-foreground font-semibold">
                                    ₦{successResult.amount.toLocaleString()} has been processed successfully.
                                </p>
                            </div>

                            {successResult.walletInfo ? (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 text-xs text-left space-y-2">
                                    <p className="font-black text-foreground flex items-center gap-1.5">
                                        <Wallet className="h-4 w-4 text-emerald-500" /> Copteller Tier-1 Wallet Ready
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-muted-foreground pt-1">
                                        <div>
                                            <p className="text-[9px] uppercase">Account Number</p>
                                            <p className="text-sm font-black text-foreground">{successResult.walletInfo.accountNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] uppercase">Balance</p>
                                            <p className="text-sm font-black text-emerald-600">₦{successResult.walletInfo.balance.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground pt-1">
                                        You can now use these funds immediately for electricity, airtime, or save in high-yield cooperative circles with zero fees.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-muted p-4 rounded-2xl text-xs text-left space-y-1 font-semibold text-muted-foreground">
                                    <p className="font-bold text-foreground">Commercial Bank Payout Sent</p>
                                    <p className="text-[11px]">NIP Clearing Reference: {successResult.transactionReference}</p>
                                </div>
                            )}

                            <div className="pt-2 flex flex-col gap-2">
                                <Button asChild className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs rounded-xl shadow-lg">
                                    <Link href="/copteller/auth">Access My Copteller Dashboard <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                                </Button>
                            </div>
                        </div>
                    ) : isAlreadyClaimed ? (
                        <div className="text-center py-6 space-y-4">
                            <div className="h-14 w-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-black text-foreground">Grant Already Claimed</h3>
                            <p className="text-xs text-muted-foreground">
                                This allocation of ₦{recipient.amount.toLocaleString()} was claimed on {new Date(recipient.claimedAt).toLocaleDateString()}.
                            </p>
                            <p className="text-[11px] font-mono text-muted-foreground">Reference: {recipient.reference}</p>
                            <Button asChild variant="outline" className="w-full text-xs font-bold rounded-xl h-10 mt-2">
                                <Link href="/copteller">Go to Homepage</Link>
                            </Button>
                        </div>
                    ) : (
                        /* Unclaimed Form */
                        <form onSubmit={handleClaim} className="space-y-6">
                            {/* Grant Overview */}
                            <div className="text-center space-y-2 border-b border-border/40 pb-5">
                                <h3 className="text-lg font-black text-foreground">{campaign.title}</h3>
                                <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                                    ₦{recipient.amount.toLocaleString()}
                                </div>
                                <p className="text-xs font-bold text-muted-foreground">
                                    Allocated to: <span className="text-foreground">{recipient.fullName}</span> ({recipient.maskedPhone})
                                </p>
                            </div>

                            {/* Payout Method Picker */}
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase text-muted-foreground tracking-wider block">
                                    Choose How to Receive Your Funds
                                </label>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPayoutMethod('wallet_credit')}
                                        className={`p-4 rounded-2xl border text-left space-y-1.5 transition-all ${
                                            payoutMethod === 'wallet_credit' 
                                                ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20' 
                                                : 'border-border hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl w-fit">
                                            <Wallet className="h-5 w-5" />
                                        </div>
                                        <p className="text-xs font-black text-foreground">Copteller Wallet</p>
                                        <p className="text-[10px] text-muted-foreground font-semibold leading-tight">Instant, 0 fee, use for bills or save</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPayoutMethod('direct_bank_transfer')}
                                        className={`p-4 rounded-2xl border text-left space-y-1.5 transition-all ${
                                            payoutMethod === 'direct_bank_transfer' 
                                                ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20' 
                                                : 'border-border hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl w-fit">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <p className="text-xs font-black text-foreground">Commercial Bank</p>
                                        <p className="text-[10px] text-muted-foreground font-semibold leading-tight">Direct NIP transfer to your bank</p>
                                    </button>
                                </div>
                            </div>

                            {/* Wallet Payout Inputs */}
                            {payoutMethod === 'wallet_credit' ? (
                                <div className="space-y-3 bg-muted/30 p-4 rounded-2xl text-xs font-bold">
                                    <div>
                                        <label className="block mb-1 text-muted-foreground text-[11px]">Confirm Mobile Number</label>
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={e => setPhoneNumber(e.target.value)}
                                            placeholder="08031234567"
                                            className="w-full h-11 px-3.5 rounded-xl border bg-background font-semibold focus:outline-none"
                                            required
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-semibold">
                                        ⚡ If you don't have a Copteller account, a zero-fee Tier-1 wallet backed by Abia MFB will be created for you automatically.
                                    </p>
                                </div>
                            ) : (
                                /* Direct Bank Transfer Inputs */
                                <div className="space-y-3 bg-muted/30 p-4 rounded-2xl text-xs font-bold">
                                    <div>
                                        <label className="block mb-1 text-muted-foreground text-[11px]">Select Destination Bank</label>
                                        <select
                                            value={selectedBank}
                                            onChange={e => setSelectedBank(e.target.value)}
                                            className="w-full h-11 px-3.5 rounded-xl border bg-background font-semibold focus:outline-none"
                                        >
                                            {NIGERIAN_BANKS.map(b => (
                                                <option key={b.code} value={b.code}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-muted-foreground text-[11px]">10-Digit Account Number</label>
                                        <input
                                            type="text"
                                            maxLength={10}
                                            value={accountNumber}
                                            onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                                            placeholder="0123456789"
                                            className="w-full h-11 px-3.5 rounded-xl border bg-background font-mono text-sm tracking-wider focus:outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-muted-foreground text-[11px]">Account Name</label>
                                        <input
                                            type="text"
                                            value={accountName}
                                            onChange={e => setAccountName(e.target.value)}
                                            placeholder={recipient.fullName}
                                            className="w-full h-11 px-3.5 rounded-xl border bg-background font-semibold focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={claiming}
                                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs rounded-xl shadow-lg border-none"
                            >
                                {claiming ? "Processing Payout..." : `Claim ₦${recipient.amount.toLocaleString()} Now`}
                            </Button>
                        </form>
                    )}
                </div>

                <div className="text-center text-[10px] font-bold text-muted-foreground">
                    Powered by Copteller Escrow Clearing &copy; Abia State Microfinance Bank
                </div>
            </div>
        </div>
    )
}
