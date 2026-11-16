"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Truck, HandCoins, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function InvestorAssetRegistryPage() {
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => {
        setMounted(true)
    }, [])

    const [assets, setAssets] = React.useState([
        { id: 'ast_1', name: 'TVS King Deluxe Keke', plateNumber: 'ABA-404-TR', operatorName: 'Kalu Onyekachi', cooperativeName: 'Aba Motor Tricycle Union', totalPaid: 420000, cost: 1400000, streak: 12, status: 'active', canLiquidate: true },
        { id: 'ast_2', name: 'Haojin Motorcycle HP', plateNumber: 'ABA-211-TR', operatorName: 'Emeka Obi', cooperativeName: 'Aba Motor Tricycle Union', totalPaid: 700000, cost: 1400000, streak: 24, status: 'active', canLiquidate: true },
        { id: 'ast_3', name: 'Jack Heavy Sewing Unit', plateNumber: 'TLR-092-EQ', operatorName: 'Sarah Johnson', cooperativeName: 'Ariaria Traders Cooperative', totalPaid: 300000, cost: 300000, streak: 15, status: 'completed', canLiquidate: false }
    ])

    const [liquidateOpen, setLiquidateOpen] = React.useState(false)
    const [selectedAsset, setSelectedAsset] = React.useState<any>(null)
    const [submitting, setSubmitting] = React.useState(false)

    React.useEffect(() => {
        const fetchInvestments = async () => {
            try {
                const res = await fetch('/api/copteller/investments')
                if (!res.ok) return
                const data = await res.json()
                if (data.investments && data.investments.length > 0) {
                    setAssets(data.investments.map((inv: any) => ({
                        id: `ast_${inv.id}`,
                        name: inv.name,
                        plateNumber: inv.asset_details?.split('|')[0]?.replace('Plate', '').replace('Asset', '').trim() || 'ABA-404-TR',
                        operatorName: inv.asset_details?.split('|')[1]?.replace('Driver:', '').replace('Tailor:', '').trim() || 'Union Operator',
                        cooperativeName: 'Aba Motor Tricycle Union',
                        totalPaid: Math.round(Number(inv.cost || 0) * 0.4),
                        cost: Number(inv.cost || 0),
                        streak: 18,
                        status: inv.status || 'active',
                        canLiquidate: inv.status === 'active'
                    })))
                }
            } catch (err) {
                console.warn('Failed to load live investments:', err)
            }
        }
        fetchInvestments()
    }, [])

    const handleLiquidate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedAsset) return
        setSubmitting(true)
        const tId = toast.loading("Submitting asset liquidation request to cooperative administrators...")
        
        try {
            const res = await fetch('/api/copteller/investments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: selectedAsset.id, action: 'liquidate' })
            })
            if (!res.ok) throw new Error('Liquidation request failed')
            setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, status: 'liquidating', canLiquidate: false } : a))
            toast.success("Liquidation request registered in ledger. Awaiting buyer matching.", { id: tId })
            setLiquidateOpen(false)
            setSelectedAsset(null)
        } catch (err: any) {
            toast.error(err.message || 'Error submitting liquidation request', { id: tId })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 font-sans">
            <div className="border-b border-orange-500/10 pb-6">
                <span className="text-[10px] font-black bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Investments</span>
                <h1 className="text-2xl sm:text-3xl font-black mt-2">HP Fleet Asset Registry</h1>
                <p className="text-xs text-muted-foreground mt-1 max-w-2xl">Verified vehicles and equipment matching active operator payback cycles.</p>
            </div>

            <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-6 font-sans shadow-sm">
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <table className="w-full min-w-[650px] text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-5 py-4">Asset Name</th>
                                <th className="px-5 py-4">Plate No.</th>
                                <th className="px-5 py-4">Operator</th>
                                <th className="px-5 py-4">Paid Capital</th>
                                <th className="px-5 py-4">SLA Streak</th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-medium">
                            {assets.map(asset => (
                                <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                    <td className="px-5 py-4 font-bold flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-orange-500 shrink-0" />
                                        <span className="whitespace-nowrap">{asset.name}</span>
                                    </td>
                                    <td className="px-5 py-4 font-mono font-bold text-slate-400 whitespace-nowrap">{asset.plateNumber}</td>
                                    <td className="px-5 py-4 font-bold whitespace-nowrap">{asset.operatorName}</td>
                                    <td className="px-5 py-4 font-black whitespace-nowrap">₦{asset.totalPaid.toLocaleString()} / ₦{asset.cost.toLocaleString()}</td>
                                    <td className="px-5 py-4 text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">{asset.streak} weeks 🔥</td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${asset.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : asset.status === 'liquidating' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'}`}>
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right whitespace-nowrap">
                                        {asset.canLiquidate ? (
                                            <Button 
                                                onClick={() => { setSelectedAsset(asset); setLiquidateOpen(true); }}
                                                size="sm" variant="outline" className="h-8 text-[10px] font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                            >
                                                <HandCoins className="h-3 w-3 mr-1.5" /> Liquidate
                                            </Button>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400 italic">Locked</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Request Liquidation Modal */}
            {mounted && createPortal(
                <AnimatePresence>
                    {liquidateOpen && selectedAsset && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-background border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 shadow-2xl">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-black text-rose-600">Request Asset Liquidation</h3>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Sell off {selectedAsset.name}</p>
                                    </div>
                                    <button onClick={() => setLiquidateOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <form onSubmit={handleLiquidate} className="space-y-4 pt-2">
                                    <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl space-y-3">
                                        <p className="text-xs font-bold text-rose-800 dark:text-rose-400">Warning: Early liquidation incurs a penalty.</p>
                                        <div className="flex justify-between text-[10px] font-semibold text-rose-700/80 dark:text-rose-400/80 border-b border-rose-200 dark:border-rose-800/50 pb-2">
                                            <span>Current Book Value</span>
                                            <span>₦{(selectedAsset.cost - selectedAsset.totalPaid).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-semibold text-rose-700/80 dark:text-rose-400/80 border-b border-rose-200 dark:border-rose-800/50 pb-2">
                                            <span>Early Exit Penalty (5%)</span>
                                            <span>- ₦{((selectedAsset.cost - selectedAsset.totalPaid) * 0.05).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-black text-rose-600 dark:text-rose-500 pt-1">
                                            <span>Estimated Settlement</span>
                                            <span>₦{((selectedAsset.cost - selectedAsset.totalPaid) * 0.95).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" required className="accent-rose-500 rounded h-4 w-4" />
                                            <span>I agree to the liquidation terms and penalties.</span>
                                        </label>
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                                        <Button type="button" onClick={() => setLiquidateOpen(false)} variant="outline" className="w-full sm:flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
                                        <Button type="submit" disabled={submitting} className="w-full sm:flex-1 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs h-10 rounded-xl shadow-lg">
                                            {submitting ? 'Submitting...' : 'Confirm Liquidation'}
                                        </Button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}

