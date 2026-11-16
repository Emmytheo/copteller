"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    Send, Plus, Users, Wallet, CheckCircle2, Clock, AlertCircle, 
    Copy, ExternalLink, ArrowRight, ShieldCheck, Download, RefreshCw, X,
    Sparkles, Filter, FileSpreadsheet, Building2, Landmark,
    Coins, Lock, TrendingUp, Award, LayoutGrid, List
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ClientPortal } from "@/components/copteller/client-portal"

export default function DisbursementCampaignsPage() {
    const [campaigns, setCampaigns] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [activeFilter, setActiveFilter] = React.useState<string>("all")
    const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid')
    const [showCreateModal, setShowCreateModal] = React.useState(false)
    const [selectedCampaign, setSelectedCampaign] = React.useState<any | null>(null)
    const [campaignRecipients, setCampaignRecipients] = React.useState<any[]>([])
    const [loadingDetails, setLoadingDetails] = React.useState(false)

    // Form state
    const [title, setTitle] = React.useState("")
    const [orgName, setOrgName] = React.useState("Abia State Ministry of Trade & Investment")
    const [category, setCategory] = React.useState("grant")
    const [description, setDescription] = React.useState("")
    const [recipientBatchText, setRecipientBatchText] = React.useState("")
    const [creating, setCreating] = React.useState(false)

    const fetchCampaigns = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/copteller/campaigns')
            const json = await res.json()
            if (json.campaigns) {
                setCampaigns(json.campaigns)
            }
        } catch (err: any) {
            toast.error("Failed to load campaigns")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchCampaigns()
    }, [])

    const viewCampaignDetails = async (camp: any) => {
        setSelectedCampaign(camp)
        setLoadingDetails(true)
        try {
            const res = await fetch(`/api/copteller/campaigns/${camp.id}`)
            const json = await res.json()
            if (json.recipients) {
                setCampaignRecipients(json.recipients)
            }
        } catch {
            toast.error("Failed to load recipients")
        } finally {
            setLoadingDetails(false)
        }
    }

    const handleCreateAndLaunch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            toast.error("Campaign title is required")
            return
        }

        // Parse recipients text
        const lines = recipientBatchText.split('\n').map(l => l.trim()).filter(Boolean)
        const parsedRecipients: any[] = []

        for (const line of lines) {
            const parts = line.split(',').map(p => p.trim())
            if (parts.length >= 3) {
                parsedRecipients.push({
                    phoneNumber: parts[0],
                    fullName: parts[1],
                    amount: Number(parts[2]) || 0
                })
            } else if (parts.length === 2) {
                parsedRecipients.push({
                    phoneNumber: parts[0],
                    fullName: 'Beneficiary',
                    amount: Number(parts[1]) || 0
                })
            }
        }

        if (parsedRecipients.length === 0) {
            toast.error("Please add at least one recipient in the format: Phone, Name, Amount")
            return
        }

        setCreating(true)
        try {
            // 1. Create draft campaign
            const createRes = await fetch('/api/copteller/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    organization_name: orgName,
                    category,
                    description,
                })
            })
            const createJson = await createRes.json()
            if (!createJson.success) throw new Error(createJson.error || 'Failed to create draft')

            const campId = createJson.campaign.id

            // 2. Add recipients batch
            const recRes = await fetch(`/api/copteller/campaigns/${campId}/recipients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipients: parsedRecipients })
            })
            const recJson = await recRes.json()
            if (!recJson.success) throw new Error(recJson.error || 'Failed to add recipients')

            // 3. Launch & lock escrow
            const launchRes = await fetch(`/api/copteller/campaigns/${campId}/launch`, {
                method: 'POST'
            })
            const launchJson = await launchRes.json()
            if (!launchJson.success) throw new Error(launchJson.error || 'Failed to launch')

            toast.success(`Campaign launched! ₦${launchJson.amountLocked.toLocaleString()} locked in escrow.`)
            setShowCreateModal(false)
            setTitle("")
            setRecipientBatchText("")
            fetchCampaigns()
        } catch (err: any) {
            toast.error(err.message || 'Operation failed')
        } finally {
            setCreating(false)
        }
    }

    const pasteSampleRecipients = () => {
        const sample = `08039281726, Emeka Kalu (Fabricator), 25000\n08051239847, Ngozi Okorie (Garment Artisan), 25000\n08139988776, Chidiebere Nwosu (Leather Tanner), 30000\n07062233445, Blessing Sunday (Apprentice), 20000`
        setRecipientBatchText(sample)
        toast.info("Sample recipient roster populated!")
    }

    const copyClaimLink = (token: string) => {
        const url = `${window.location.origin}/copteller/claim?token=${token}`
        navigator.clipboard.writeText(url)
        toast.success("Self-claim link copied to clipboard!")
    }

    // Totals calculations
    const totalDisbursedAll = campaigns.reduce((acc, c) => acc + (Number(c.total_disbursed) || 0), 0)
    const totalClaimedAll = campaigns.reduce((acc, c) => acc + (Number(c.total_claimed) || 0), 0)
    const totalRecipientsAll = campaigns.reduce((acc, c) => acc + (Number(c.total_recipients) || 0), 0)

    const filteredCampaigns = campaigns.filter(c => {
        if (activeFilter === "all") return true
        if (activeFilter === "grant") return c.category === "grant"
        if (activeFilter === "relief") return c.category === "relief"
        if (activeFilter === "empowerment") return c.category === "empowerment" || c.category === "welfare"
        return true
    })

    return (
        <div className="min-h-[100dvh] bg-background text-foreground font-sans">
            {/* Ambient subtle glow */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 right-[25%] w-[450px] h-[450px] bg-primary/5 rounded-full blur-[130px]" />
                <div className="absolute bottom-0 left-[15%] w-[380px] h-[380px] bg-accent/5 rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                {/* ── UNBOXED COMMAND CENTER HEADER ────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <Sparkles className="w-3 h-3" />
                            Direct Citizen Disbursals &amp; Public Schemes
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground flex items-center gap-2.5">
                            <Send className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
                            Disbursement &amp; Relief Campaigns
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
                            Deploy government subsidies, emergency fire relief, cooperative welfare stipends, and party fund disbursements with programmatic escrow and instant SMS self-claim tokens.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button 
                            onClick={fetchCampaigns} 
                            variant="outline" 
                            size="icon" 
                            className="h-9 sm:h-10 w-9 sm:w-10 rounded-xl border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            title="Refresh registry"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button 
                            onClick={() => setShowCreateModal(true)}
                            className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shrink-0 flex items-center gap-2 shadow-sm shadow-primary/25 border-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Plus className="h-4 w-4" /> Launch Campaign
                        </Button>
                    </div>
                </div>

                {/* ── STANDALONE RESPONSIVE METRIC STRIP ──────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    {/* Active Schemes */}
                    <div className="bg-card/90 hover:bg-card border border-border/80 hover:border-primary/40 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">Active Schemes</span>
                            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-lg sm:text-2xl font-black text-foreground tracking-tight truncate">
                                {campaigns.length} Active
                            </p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-1 truncate">
                                <CheckCircle2 className="w-3 h-3 text-primary shrink-0" /> Tracked Escrow Pools
                            </span>
                        </div>
                    </div>

                    {/* Total Disbursed */}
                    <div className="bg-card/90 hover:bg-card border border-border/80 hover:border-emerald-500/40 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">Total Disbursed Funds</span>
                            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
                                ₦{totalDisbursedAll.toLocaleString()}
                            </p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-1 truncate">
                                <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" /> {totalRecipientsAll} Targeted Citizens
                            </span>
                        </div>
                    </div>

                    {/* Total Claimed */}
                    <div className="bg-card/90 hover:bg-card border border-border/80 hover:border-teal-500/40 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 truncate">Claimed by Citizens</span>
                            <div className="p-2 sm:p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
                                <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-lg sm:text-2xl font-black text-teal-600 dark:text-teal-400 tracking-tight truncate">
                                ₦{totalClaimedAll.toLocaleString()}
                            </p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-1 truncate">
                                <TrendingUp className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" /> {totalDisbursedAll > 0 ? `${Math.round((totalClaimedAll / totalDisbursedAll) * 100)}% claimed` : '0% claimed'}
                            </span>
                        </div>
                    </div>

                    {/* Remaining Escrow Float */}
                    <div className="bg-card/90 hover:bg-card border border-border/80 hover:border-indigo-500/40 rounded-2xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 truncate">Remaining Escrow Float</span>
                            <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div>
                            <p className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight truncate">
                                ₦{(totalDisbursedAll - totalClaimedAll).toLocaleString()}
                            </p>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-1 truncate">
                                <Lock className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" /> Held in Partner MFB
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── FILTER SEGMENTED BAR & VIEW TOGGLE ────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/90 border border-border/80 p-2 sm:p-2.5 rounded-2xl shadow-sm">
                    <div className="inline-flex flex-wrap p-1 rounded-xl bg-muted/60 border border-border/50 gap-1 text-xs">
                        {[
                            { key: 'all', label: `All Schemes (${campaigns.length})` },
                            { key: 'grant', label: 'Trade & Fuel Grants' },
                            { key: 'relief', label: 'Emergency Relief' },
                            { key: 'empowerment', label: 'Youth & Tech Guild' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveFilter(tab.key)}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                    activeFilter === tab.key
                                        ? 'bg-card text-foreground shadow-sm font-black'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        <span className="hidden md:inline-block text-[11px] text-muted-foreground font-bold px-1">
                            Real-time Settlement via Kuda / Interswitch Escrow
                        </span>

                        {/* View Mode Toggle (Grid / List) */}
                        {filteredCampaigns.length > 0 && (
                            <div className="inline-flex items-center gap-1 p-1 bg-muted/60 border border-border/50 rounded-xl">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        viewMode === 'grid'
                                            ? 'bg-primary text-primary-foreground shadow-sm font-black'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    title="Compact 4-Column Grid"
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                    <span className="text-[11px]">Grid</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        viewMode === 'list'
                                            ? 'bg-primary text-primary-foreground shadow-sm font-black'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    title="High-Density List Mode"
                                >
                                    <List className="w-3.5 h-3.5" />
                                    <span className="text-[11px]">List</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── CAMPAIGNS GRID / LIST ────────────────────────────────────── */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="p-16 text-center text-xs text-muted-foreground font-semibold animate-pulse">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                            Loading authorized public schemes &amp; relief campaigns...
                        </div>
                    ) : filteredCampaigns.length === 0 ? (
                        <div className="bg-card border border-dashed border-border rounded-3xl p-12 text-center space-y-3">
                            <Send className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                            <h4 className="text-base font-black text-foreground">No Campaigns Found in This Filter</h4>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                Launch a grant scheme or group disbursement to distribute funds directly to beneficiaries with secure claim links.
                            </p>
                            <Button 
                                onClick={() => setShowCreateModal(true)}
                                size="sm" 
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-xl shadow-sm"
                            >
                                Launch First Campaign
                            </Button>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* Compact 4-Column Responsive Grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                            {filteredCampaigns.map((camp) => {
                                const disbursed = Number(camp.total_disbursed) || 0
                                const claimed = Number(camp.total_claimed) || 0
                                const pct = disbursed > 0 ? Math.round((claimed / disbursed) * 100) : 0

                                return (
                                    <motion.div
                                        key={camp.id}
                                        whileHover={{ y: -2 }}
                                        onClick={() => viewCampaignDetails(camp)}
                                        className="bg-card/95 hover:bg-card border border-border/80 hover:border-primary/50 rounded-2xl p-4 space-y-3 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-start gap-1">
                                                <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md">
                                                    {camp.category}
                                                </Badge>
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest shrink-0">
                                                    {camp.status}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1" title={camp.title}>
                                                    {camp.title}
                                                </h4>
                                                <p className="text-[11px] text-muted-foreground font-semibold line-clamp-2 leading-tight mt-1">
                                                    {camp.description || `Organized by ${camp.organization_name}`}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2.5 pt-2.5 border-t border-border/60">
                                            <div className="flex justify-between items-baseline text-xs font-bold">
                                                <span className="text-muted-foreground text-[10px] uppercase font-black">Disbursed Volume</span>
                                                <span className="text-foreground font-mono font-black text-sm">₦{disbursed.toLocaleString()}</span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="space-y-1">
                                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-primary transition-all duration-500 rounded-full"
                                                        style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                                                    <span>{pct}% claimed</span>
                                                    <span className="font-mono">₦{claimed.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground pt-0.5">
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3 w-3 text-primary" /> {camp.total_recipients} Beneficiaries
                                                </span>
                                                <span className="text-primary font-black flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[11px]">
                                                    View Registry <ArrowRight className="h-3 w-3" />
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    ) : (
                        /* High-Density Horizontal List Mode */
                        <div className="space-y-2.5">
                            {filteredCampaigns.map((camp) => {
                                const disbursed = Number(camp.total_disbursed) || 0
                                const claimed = Number(camp.total_claimed) || 0
                                const pct = disbursed > 0 ? Math.round((claimed / disbursed) * 100) : 0

                                return (
                                    <motion.div
                                        key={camp.id}
                                        whileHover={{ x: 3 }}
                                        onClick={() => viewCampaignDetails(camp)}
                                        className="bg-card/95 hover:bg-card border border-border/80 hover:border-primary/50 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3.5 group relative overflow-hidden"
                                    >
                                        {/* Left Accent indicator strip */}
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-emerald-500 to-teal-500 opacity-80 group-hover:opacity-100" />

                                        {/* Left: Info */}
                                        <div className="flex items-center gap-3 pl-1 min-w-0 flex-1">
                                            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                                                <Send className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                    <h4 className="text-sm font-black text-foreground group-hover:text-primary transition-colors truncate">
                                                        {camp.title}
                                                    </h4>
                                                    <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold text-[9px] uppercase tracking-wider px-1.5 py-0">
                                                        {camp.category}
                                                    </Badge>
                                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                                                        {camp.status}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground font-semibold truncate">
                                                    {camp.description || `Organized by ${camp.organization_name}`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Middle: Stats & Progress */}
                                        <div className="flex items-center gap-4 sm:gap-6 shrink-0 pl-1 md:pl-0">
                                            <div className="text-left md:text-right min-w-[110px]">
                                                <span className="text-[9px] uppercase font-black text-muted-foreground block">Disbursed Volume</span>
                                                <span className="text-sm font-black font-mono text-foreground">₦{disbursed.toLocaleString()}</span>
                                            </div>

                                            <div className="w-28 sm:w-36 space-y-1">
                                                <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                                                    <span>{pct}% claimed</span>
                                                    <span className="font-mono">₦{claimed.toLocaleString()}</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-primary rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground min-w-[100px]">
                                                <Users className="w-3.5 h-3.5 text-primary" />
                                                <span>{camp.total_recipients} Beneficiaries</span>
                                            </div>
                                        </div>

                                        {/* Right: Action */}
                                        <div className="shrink-0 flex items-center justify-end pl-1 md:pl-0 border-t md:border-t-0 border-border/50 pt-2 md:pt-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 px-3 text-xs font-bold border-border/80 hover:bg-primary/10 hover:text-primary hover:border-primary/40 gap-1.5 rounded-xl group-hover:border-primary/50"
                                            >
                                                <span>View Registry</span>
                                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── CAMPAIGN DETAILS MODAL (WRAPPED IN CLIENT PORTAL) ───────────── */}
            <ClientPortal>
                <AnimatePresence>
                    {selectedCampaign && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative w-full max-w-3xl bg-card text-card-foreground border border-border rounded-3xl p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-h-[90dvh] overflow-y-auto shadow-2xl"
                            >
                                <div className="flex justify-between items-start border-b border-border/70 pb-4">
                                    <div>
                                        <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] uppercase font-bold">
                                            {selectedCampaign.category}
                                        </Badge>
                                        <h3 className="text-xl font-black text-foreground mt-1.5">{selectedCampaign.title}</h3>
                                        <p className="text-xs text-muted-foreground font-semibold">Managed by {selectedCampaign.organization_name}</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedCampaign(null)} 
                                        className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/40 border border-border/60 p-4 rounded-2xl text-xs font-bold text-center">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">Total Budget</p>
                                        <p className="text-base font-black text-foreground mt-0.5 font-mono">₦{Number(selectedCampaign.total_disbursed).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">Claimed So Far</p>
                                        <p className="text-base font-black text-primary mt-0.5 font-mono">₦{Number(selectedCampaign.total_claimed).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">Targeted Citizens</p>
                                        <p className="text-base font-black text-foreground mt-0.5">{selectedCampaign.total_recipients}</p>
                                    </div>
                                </div>

                                {/* Recipients Table */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-black uppercase text-muted-foreground tracking-wider">Beneficiary Roster &amp; Direct Claim Tokens</h4>
                                        <span className="text-[10px] text-muted-foreground font-semibold">SMS Handshake Active</span>
                                    </div>
                                    
                                    {loadingDetails ? (
                                        <div className="text-center py-8 text-xs text-muted-foreground animate-pulse font-semibold">
                                            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                                            Loading claim tokens...
                                        </div>
                                    ) : campaignRecipients.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic py-4">No recipients registered for this campaign.</p>
                                    ) : (
                                        <div className="border border-border/70 rounded-2xl overflow-hidden divide-y divide-border/50 text-xs font-semibold max-h-64 overflow-y-auto">
                                            {campaignRecipients.map(r => (
                                                <div key={r.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                                                    <div>
                                                        <p className="font-black text-foreground">{r.full_name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">{r.phone_number}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-mono font-black text-foreground">₦{Number(r.amount).toLocaleString()}</p>
                                                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                                            r.status === 'claimed' 
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                        }`}>
                                                            {r.status}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <Button 
                                                            onClick={() => copyClaimLink(r.claim_token)}
                                                            size="sm" 
                                                            variant="outline"
                                                            className="h-8 px-2.5 text-[10px] font-bold rounded-lg border-border"
                                                        >
                                                            <Copy className="h-3 w-3 mr-1" /> Copy Link
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <Button onClick={() => setSelectedCampaign(null)} variant="outline" className="h-10 text-xs font-bold rounded-xl border-border">
                                        Close Window
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </ClientPortal>

            {/* ── CREATE CAMPAIGN MODAL (WRAPPED IN CLIENT PORTAL) ────────────── */}
            <ClientPortal>
                <AnimatePresence>
                    {showCreateModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative w-full max-w-xl bg-card text-card-foreground border border-border rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 max-h-[90dvh] overflow-y-auto"
                            >
                                <div className="flex justify-between items-start border-b border-border/70 pb-3">
                                    <div>
                                        <h3 className="text-xl font-black text-foreground">Launch Bulk Disbursement Scheme</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5 font-semibold">Disburse grants, relief, or group funds directly to recipient phone numbers.</p>
                                    </div>
                                    <button 
                                        onClick={() => setShowCreateModal(false)} 
                                        className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateAndLaunch} className="space-y-4 text-xs font-bold">
                                    <div>
                                        <label className="block mb-1.5 text-muted-foreground uppercase text-[10px] font-black">Campaign Title *</label>
                                        <input 
                                            type="text" 
                                            value={title} 
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="e.g. Aba Traders Small Shop Support Grant"
                                            className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block mb-1.5 text-muted-foreground uppercase text-[10px] font-black">Disbursing Organization</label>
                                            <input 
                                                type="text" 
                                                value={orgName} 
                                                onChange={e => setOrgName(e.target.value)}
                                                placeholder="e.g. Ariaria Market Executive Council"
                                                className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-1.5 text-muted-foreground uppercase text-[10px] font-black">Category</label>
                                            <select 
                                                value={category} 
                                                onChange={e => setCategory(e.target.value)}
                                                className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                                            >
                                                <option value="grant">Government / Trade Grant</option>
                                                <option value="relief">Emergency Relief &amp; Burglary</option>
                                                <option value="empowerment">Youth Apprenticeship Fund</option>
                                                <option value="welfare">Community Welfare / Dues</option>
                                                <option value="club_payout">Social Club / Age Grade</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-muted-foreground uppercase text-[10px] font-black">Beneficiary Roster (Phone, Name, Amount) *</label>
                                            <button 
                                                type="button" 
                                                onClick={pasteSampleRecipients}
                                                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1"
                                            >
                                                <FileSpreadsheet className="h-3 w-3" /> Populate Sample List
                                            </button>
                                        </div>
                                        <textarea 
                                            rows={5}
                                            value={recipientBatchText}
                                            onChange={e => setRecipientBatchText(e.target.value)}
                                            placeholder={`08031234567, Emeka Kalu, 25000\n08059876543, Ngozi Okafor, 25000\n08123334455, Uche Eze, 30000`}
                                            className="w-full p-3.5 rounded-xl border border-border bg-background text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>

                                    <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-2xl text-[11px] text-muted-foreground space-y-1">
                                        <p className="font-black text-foreground flex items-center gap-1.5">
                                            <ShieldCheck className="h-4 w-4 text-primary" /> Programmatic Escrow Handshake
                                        </p>
                                        <p className="font-semibold leading-relaxed">
                                            Upon launch, the total disbursed sum will be verified and locked in an escrow account. Beneficiaries receive instant claim links to deposit to their Copteller wallet or cash out directly to any Nigerian commercial bank.
                                        </p>
                                    </div>

                                    <div className="pt-2 flex gap-3">
                                        <Button 
                                            type="button" 
                                            onClick={() => setShowCreateModal(false)} 
                                            variant="outline" 
                                            className="flex-1 h-11 rounded-xl text-xs font-bold border-border"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            type="submit" 
                                            disabled={creating}
                                            className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl text-xs shadow-md border-0"
                                        >
                                            {creating ? "Launching & Locking Escrow..." : "Launch Campaign"}
                                        </Button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </ClientPortal>
        </div>
    )
}
