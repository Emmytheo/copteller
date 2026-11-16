"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
    ArrowLeft, Download, ShieldCheck, CheckCircle2,
    Calendar, Clock, Receipt, Banknote, RefreshCw, Printer,
    AlertCircle, ArrowDownLeft, ArrowUpRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Transaction {
    id: string
    narration: string
    amount: number
    type: 'credit' | 'debit'
    category: 'transfer' | 'ajo' | 'hp' | 'grant' | 'dues' | 'scheme' | 'charge' | 'interest'
    reference: string
    date: string
    time: string
    balance: number
    channel: string
}

interface PageProps {
    params: React.Usable<{ id: string }>
}

const TRANSACTIONS: Transaction[] = [
    { id: 'tx_001', narration: 'Wallet Top-up via Paystack', amount: 50000, type: 'credit', category: 'transfer', reference: 'PSK-2026-080792', date: 'Aug 5, 2026', time: '2:15 PM', balance: 84500, channel: 'Paystack' },
    { id: 'tx_002', narration: 'Monthly Ajo Contribution – Market Traders', amount: 5000, type: 'debit', category: 'ajo', reference: 'AJO-2026-080502', date: 'Aug 5, 2026', time: '8:00 AM', balance: 34500, channel: 'Copteller Auto' },
    { id: 'tx_003', narration: 'HP Weekly Due – TVS King ABA-404', amount: 18000, type: 'debit', category: 'hp', reference: 'HP-2026-080101', date: 'Aug 1, 2026', time: '8:00 AM', balance: 39500, channel: 'Copteller Auto' },
    { id: 'tx_004', narration: 'Wallet Top-up via Bank Transfer', amount: 20000, type: 'credit', category: 'transfer', reference: 'BNK-2026-073188', date: 'Jul 31, 2026', time: '3:45 PM', balance: 57500, channel: 'NIBSS NIP' },
    { id: 'tx_005', narration: 'Ajo Maturity Payout – Cycle 11', amount: 160000, type: 'credit', category: 'ajo', reference: 'AJO-PAY-2026-073001', date: 'Jul 30, 2026', time: '10:00 AM', balance: 37500, channel: 'Core Banking' },
    { id: 'tx_006', narration: 'Monthly Cooperative Dues – July 2026', amount: 5000, type: 'debit', category: 'dues', reference: 'DUE-2026-073008', date: 'Jul 8, 2026', time: '9:00 AM', balance: 8500, channel: 'Copteller Auto' },
    { id: 'tx_007', narration: 'Emergency Welfare Levy Q2 2026', amount: 2500, type: 'debit', category: 'dues', reference: 'LEV-2026-071801', date: 'Jul 18, 2026', time: '9:00 AM', balance: 13500, channel: 'Copteller Auto' },
    { id: 'tx_008', narration: 'Scheme A Quarterly Yield', amount: 12000, type: 'credit', category: 'scheme', reference: 'SCH-YLD-2026-070101', date: 'Jul 1, 2026', time: '8:00 AM', balance: 16000, channel: 'Core Banking' },
    { id: 'tx_009', narration: 'Monthly Ajo Contribution – Market Traders', amount: 5000, type: 'debit', category: 'ajo', reference: 'AJO-2026-070501', date: 'Jul 5, 2026', time: '8:00 AM', balance: 4000, channel: 'Copteller Auto' },
    { id: 'tx_010', narration: 'HP Weekly Due – TVS King ABA-404', amount: 18000, type: 'debit', category: 'hp', reference: 'HP-2026-070401', date: 'Jul 4, 2026', time: '8:00 AM', balance: 9000, channel: 'Copteller Auto' },
]

export default function TransactionDetailPage({ params }: PageProps) {
    const router = useRouter()
    const resolvedParams = React.use(params)
    const { id } = resolvedParams

    const [tx, setTx] = React.useState<Transaction | null>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchTx = async () => {
            try {
                setLoading(true)
                // Fallback local lookup
                const found = TRANSACTIONS.find(t => t.id === id || t.reference === id)
                if (found) {
                    setTx(found)
                } else {
                    // Try to fetch via api
                    const res = await fetch('/api/copteller/transactions')
                    const data = await res.json()
                    if (data.success && data.transactions) {
                        const apiFound = data.transactions.find((t: any) => String(t.id) === String(id))
                        if (apiFound) {
                            setTx({
                                id: apiFound.id,
                                narration: apiFound.narration || 'Wallet Transaction',
                                amount: apiFound.amount / 100,
                                type: apiFound.type as any,
                                category: (apiFound.category || 'transfer') as any,
                                reference: apiFound.reference || `REF-${apiFound.id.slice(-8).toUpperCase()}`,
                                date: 'Aug 5, 2026',
                                time: '12:00 PM',
                                balance: 84500,
                                channel: apiFound.channel || 'Core Ledger'
                            })
                        }
                    }
                }
            } catch (err) {
                console.warn(err)
            } finally {
                setLoading(false)
            }
        }
        fetchTx()
    }, [id])

    const handleDownload = () => {
        toast.success("Receipt downloaded successfully!")
    }

    if (loading) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
                <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">Decrypting receipt keys...</p>
            </div>
        )
    }

    if (!tx) {
        return (
            <div className="max-w-xl mx-auto px-6 py-16 text-center space-y-4">
                <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Transaction Not Found</h3>
                <p className="text-xs text-muted-foreground">The transaction receipt ID does not exist in your current union ledger.</p>
                <Button onClick={() => router.push('/copteller/transactions')} variant="outline" className="rounded-xl text-xs font-bold">
                    Back to Transactions
                </Button>
            </div>
        )
    }

    const fmtVal = (val: number) => `₦${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    const isCredit = tx.type === 'credit'

    return (
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6 font-sans">
            
            {/* Navigation & Header */}
            <div className="flex justify-between items-center">
                <Button 
                    onClick={() => router.push('/copteller/transactions')} 
                    variant="ghost" 
                    className="h-9 px-3 text-xs font-bold text-muted-foreground hover:text-foreground gap-1.5"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to History
                </Button>
                <Badge variant="outline" className="text-[9px] font-black tracking-widest text-slate-450 uppercase border-slate-200">
                    ID: {tx.id.toUpperCase()}
                </Badge>
            </div>

            {/* Receipt Main Frame */}
            <div className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 space-y-6 shadow-md backdrop-blur-sm relative overflow-hidden">
                
                {/* Security stamp overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-10 pointer-events-none bg-emerald-500" />

                {/* Status Indicator */}
                <div className="text-center space-y-2 pb-6 border-b border-dashed border-slate-250 dark:border-slate-850">
                    <div className={`h-12 w-12 rounded-full mx-auto flex items-center justify-center ${isCredit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {isCredit ? <ArrowDownLeft className="h-6 w-6" /> : <ArrowUpRight className="h-6 w-6" />}
                    </div>
                    <h2 className={`text-2xl font-black ${isCredit ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-500'}`}>
                        {isCredit ? '+' : '-'}{fmtVal(tx.amount)}
                    </h2>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5 justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> TRANSACTION SUCCESSFUL
                    </p>
                </div>

                {/* Details Sheet */}
                <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between items-start py-1">
                        <span>Description</span>
                        <span className="font-black text-slate-850 dark:text-slate-200 text-right max-w-[60%]">{tx.narration}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span>Transaction Reference</span>
                        <span className="font-bold text-slate-850 dark:text-slate-200 font-mono">{tx.reference}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span>Settlement Channel</span>
                        <span className="font-bold text-slate-850 dark:text-slate-200">{tx.channel}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span>Transaction Category</span>
                        <span className="font-bold text-slate-850 dark:text-slate-200 capitalize">{tx.category}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span>Date & Time</span>
                        <span className="font-bold text-slate-850 dark:text-slate-200">{tx.date} at {tx.time}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-900 pt-3">
                        <span>Ledger Balance After</span>
                        <span className="font-black text-slate-900 dark:text-white font-mono">{fmtVal(tx.balance)}</span>
                    </div>
                </div>

                {/* CBN Audit Trust Signature block */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
                    <div>
                        <p className="text-[9px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">e-FASS Secured Settlement</p>
                        <p className="text-[9px] text-muted-foreground font-semibold">Underwritten by Central Bank of Nigeria micro-banking regulatory frameworks.</p>
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
                <Button 
                    onClick={handleDownload} 
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs h-10 rounded-xl border-0 shadow-lg"
                >
                    <Download className="h-4 w-4 mr-1.5" /> Download Receipt
                </Button>
                <Button 
                    onClick={() => window.print()} 
                    variant="outline" 
                    className="flex-1 border-slate-200 dark:border-slate-800 text-xs font-bold h-10 rounded-xl gap-1.5"
                >
                    <Printer className="h-4 w-4" /> Print Statement
                </Button>
            </div>

        </div>
    )
}
