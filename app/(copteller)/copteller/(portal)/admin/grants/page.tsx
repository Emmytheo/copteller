"use client"

import * as React from "react"
import { Award, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export default function AdminGrantsPage() {
    const [loansList, setLoansList] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [localStatus, setLocalStatus] = React.useState<Record<string, string>>({})

    const fetchGrantsData = async () => {
        try {
            const loanRes = await fetch('/api/copteller/admin/loans')
            const loanData = await loanRes.json()
            if (loanData.success && loanData.loans) {
                setLoansList(loanData.loans)
            }
        } catch (err) {
            console.warn('Failed to load grant list', err)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchGrantsData()
    }, [])

    const handleAction = async (id: string | number, name: string, status: string) => {
        const isDemo = String(id).startsWith('loan_demo')
        if (isDemo) {
            setLocalStatus(prev => ({ ...prev, [id]: status }))
            toast.success(`Application for "${name}" updated to ${status}!`)
            return
        }

        const tId = toast.loading(`Updating grant application to ${status}...`)
        try {
            const res = await fetch('/api/copteller/admin/loans', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loan_id: id, status })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`Application updated successfully!`, { id: tId })
                fetchGrantsData()
            } else {
                toast.error(data.error || 'Failed to update grant status', { id: tId })
            }
        } catch (err) {
            toast.error('Network request failed', { id: tId })
        }
    }

    const dbPendingGrants = loansList.map((l: any) => ({
        id: l.id,
        name: typeof l.customer === 'object' && l.customer ? `${l.customer.firstName || ''} ${l.customer.lastName || ''}`.trim() : 'Coop Member',
        type: l.purpose || 'Equipment Expansion Loan',
        amt: (l.principal || 20000000) / 100,
        status: localStatus[l.id] || l.status || 'pending'
    }))

    const pendingGrants = dbPendingGrants.length > 0 ? dbPendingGrants : [
        { id: "loan_demo_101", name: "Chinedu Okafor", type: "Transport Tooling Grant", amt: 200000, status: localStatus["loan_demo_101"] || "pending" },
        { id: "loan_demo_102", name: "Sarah Johnson", type: "SME Growth Grant", amt: 200000, status: localStatus["loan_demo_102"] || "pending" },
    ]

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                <p className="text-muted-foreground font-medium text-sm">Pulling grant distribution files...</p>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            <div>
                <span className="text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Oversight</span>
                <h1 className="text-2xl sm:text-3xl font-black mt-2">Grant Distribution</h1>
                <p className="text-xs text-muted-foreground mt-1">Review government and foundation grant allocations across union operators.</p>
            </div>

            <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                {["Member Beneficiary", "Grant Type Purpose", "Principal Amount", "Status", "Actions"].map(h => (
                                    <th key={h} className="text-left px-4 sm:px-5 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {pendingGrants.map((gr, i) => (
                                <tr key={i} className="border-b border-slate-50 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                    <td className="px-4 sm:px-5 py-3 font-bold flex items-center gap-2">
                                        <Award className="h-4 w-4 text-amber-500 shrink-0" />
                                        <span className="truncate">{gr.name}</span>
                                    </td>
                                    <td className="px-4 sm:px-5 py-3 font-semibold text-muted-foreground">{gr.type}</td>
                                    <td className="px-4 sm:px-5 py-3 font-black text-emerald-600 dark:text-emerald-400">₦{gr.amt.toLocaleString()}</td>
                                    <td className="px-4 sm:px-5 py-3">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${gr.status === 'active' || gr.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'}`}>{gr.status}</span>
                                    </td>
                                    <td className="px-4 sm:px-5 py-3 flex gap-2">
                                        {gr.status === 'pending' && (
                                            <>
                                                <Button onClick={() => handleAction(gr.id, gr.name, 'Approved')} size="sm" className="h-7 text-[9px] font-bold bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg px-2 border-0">Approve</Button>
                                                <Button onClick={() => handleAction(gr.id, gr.name, 'Rejected')} size="sm" variant="outline" className="h-7 text-[9px] font-bold text-rose-500 border-rose-200 dark:border-rose-900 px-2 rounded-lg">Reject</Button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

