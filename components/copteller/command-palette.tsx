"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    Search,
    LayoutDashboard,
    PiggyBank,
    Wallet,
    Truck,
    Users,
    CircleDollarSign,
    ShieldCheck,
    Landmark,
    CheckCircle2,
    Zap,
    TrendingUp,
    Coins,
    Cpu,
    Lock,
    CreditCard,
    Briefcase,
    FileText,
    ArrowRight,
    Sparkles,
    X,
} from "lucide-react"
import { useScope } from "@/context/scope-context"

interface CoptellerCmd {
    id: string
    label: string
    hint: string
    href: string
    group: string
    icon: React.ElementType
    roles: string[]
    keywords?: string
}

const COMMANDS: CoptellerCmd[] = [
    // Member
    { id: "m-home", label: "Member Overview", hint: "Wallet balance, active schemes & cashflow", href: "/copteller/dashboard", group: "Member", icon: LayoutDashboard, roles: ["member", "superadmin", "bank_staff"], keywords: "overview home balance" },
    { id: "m-wallet", label: "My Cooperative Wallet", hint: "Deposits, P2P transfers & pockets", href: "/copteller/wallet", group: "Member", icon: Wallet, roles: ["member", "superadmin", "bank_staff"], keywords: "deposit send transfer" },
    { id: "m-esusu", label: "Ajo Thrift Hub", hint: "Daily & weekly rotational thrift savings", href: "/copteller/esusu", group: "Member", icon: PiggyBank, roles: ["member", "superadmin", "bank_staff"], keywords: "ajo esusu savings" },
    { id: "m-hp", label: "Asset Leases (HP)", hint: "Tricycle, equipment & vehicle hire-purchase", href: "/copteller/hp", group: "Member", icon: Truck, roles: ["member", "superadmin", "bank_staff"], keywords: "keke vehicle hire purchase" },
    { id: "m-credit", label: "Credit Score & Loans", hint: "Live credit rating & cooperative facilities", href: "/copteller/credit", group: "Member", icon: TrendingUp, roles: ["member", "superadmin", "bank_staff"], keywords: "loan score credit" },
    { id: "m-dues", label: "Membership Dues", hint: "Union subscriptions & compliance receipts", href: "/copteller/dues", group: "Member", icon: Coins, roles: ["member", "superadmin", "bank_staff"], keywords: "dues fees" },
    { id: "m-tx", label: "Ledger Transactions", hint: "Full verifiable receipt history", href: "/copteller/transactions", group: "Member", icon: FileText, roles: ["member", "superadmin", "bank_staff"], keywords: "history statement" },
    // Coop Admin
    { id: "a-home", label: "Cooperative Admin Console", hint: "Union metrics, collections & risk", href: "/copteller/admin", group: "Cooperative Admin", icon: Landmark, roles: ["coop_admin", "admin", "superadmin", "bank_staff"], keywords: "union admin console" },
    { id: "a-members", label: "Member Directory & KYC", hint: "Manage union members & approval status", href: "/copteller/admin/members", group: "Cooperative Admin", icon: Users, roles: ["coop_admin", "admin", "superadmin", "bank_staff"], keywords: "members kyc" },
    { id: "a-fleet", label: "HP Asset Allocations", hint: "Track leased fleet & weekly repayments", href: "/copteller/admin/fleet", group: "Cooperative Admin", icon: Truck, roles: ["coop_admin", "admin", "superadmin", "bank_staff"], keywords: "fleet keke assets" },
    { id: "a-ledger", label: "Collections Ledger", hint: "Run batch clearings & audit repayments", href: "/copteller/admin/ledger", group: "Cooperative Admin", icon: CircleDollarSign, roles: ["coop_admin", "admin", "superadmin", "bank_staff"], keywords: "collections clearing" },
    { id: "a-schemes", label: "Union Schemes & Cycles", hint: "Configure thrift & asset lease products", href: "/copteller/admin/schemes", group: "Cooperative Admin", icon: CheckCircle2, roles: ["coop_admin", "admin", "superadmin", "bank_staff"], keywords: "schemes products" },
    // Investor
    { id: "i-home", label: "Investor Yield Portfolio", hint: "Asset-backed returns & active placements", href: "/copteller/investor", group: "Investor", icon: TrendingUp, roles: ["investor", "superadmin", "bank_staff"], keywords: "yield return portfolio" },
    { id: "i-schemes", label: "Investable Schemes", hint: "Fund vetted cooperative asset pools", href: "/copteller/investor/schemes", group: "Investor", icon: Coins, roles: ["investor", "superadmin", "bank_staff"], keywords: "invest pool" },
    // Partner
    { id: "p-home", label: "Institutional Partner Desk", hint: "Float injection, providers & governance", href: "/copteller/partner", group: "Partner", icon: Briefcase, roles: ["partner", "superadmin", "bank_staff"], keywords: "agency ngo government" },
    { id: "p-settle", label: "Float & Margin Settlements", hint: "Track partner disbursements & escrow", href: "/copteller/partner/settlements", group: "Partner", icon: CircleDollarSign, roles: ["partner", "superadmin", "bank_staff"], keywords: "float margin" },
    // Superadmin
    { id: "s-home", label: "Platform Regulator Command", hint: "Multi-union escrow AUM & compliance", href: "/copteller/superadmin", group: "Superadmin", icon: ShieldCheck, roles: ["superadmin", "bank_staff"], keywords: "superadmin oversight regulator" },
    { id: "s-unions", label: "Registered Cooperatives", hint: "Approve, suspend & inspect all unions", href: "/copteller/superadmin/unions", group: "Superadmin", icon: Landmark, roles: ["superadmin", "bank_staff"], keywords: "cooperatives unions" },
    { id: "s-vault", label: "AES-256-GCM Secrets Vault", hint: "Encrypted API keys & rotation audit log", href: "/copteller/superadmin/vault", group: "Superadmin", icon: Lock, roles: ["superadmin", "bank_staff"], keywords: "vault secrets keys" },
    { id: "s-comp", label: "CBN Compliance & Reports", hint: "Regulatory telemetry & audit exports", href: "/copteller/superadmin/compliance", group: "Superadmin", icon: FileText, roles: ["superadmin", "bank_staff"], keywords: "cbn compliance export" },
    { id: "s-services", label: "Dynamic Services Engine", hint: "Manage API rails & form schemas", href: "/copteller/superadmin/services", group: "Superadmin", icon: Cpu, roles: ["superadmin", "bank_staff"], keywords: "services api" },
    { id: "s-wf", label: "Workflow Orchestrator", hint: "Automated schedules & SDL pipelines", href: "/copteller/superadmin/workflows", group: "Superadmin", icon: Zap, roles: ["superadmin", "bank_staff"], keywords: "workflows cron" },
]

export function CoptellerCommandPalette() {
    const router = useRouter()
    const { activeScope, scopes } = useScope()
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [selectedIdx, setSelectedIdx] = React.useState(0)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const ownedRoles = React.useMemo(() => {
        const set = new Set<string>()
        if (activeScope?.role) set.add(activeScope.role)
        scopes.forEach((s) => {
            if (s.role) set.add(s.role)
        })
        if (set.size === 0) set.add("member")
        return set
    }, [activeScope?.role, scopes])

    const available = React.useMemo(() => {
        return COMMANDS.filter((c) => c.roles.some((r) => ownedRoles.has(r)))
    }, [ownedRoles])

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return available
        return available.filter(
            (i) =>
                i.label.toLowerCase().includes(q) ||
                i.hint.toLowerCase().includes(q) ||
                i.group.toLowerCase().includes(q) ||
                (i.keywords || "").toLowerCase().includes(q)
        )
    }, [available, query])

    React.useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault()
                setOpen((prev) => !prev)
            } else if (e.key === "Escape") {
                setOpen(false)
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])

    React.useEffect(() => {
        if (open) {
            setQuery("")
            setSelectedIdx(0)
            setTimeout(() => inputRef.current?.focus(), 40)
        }
    }, [open])

    React.useEffect(() => {
        setSelectedIdx(0)
    }, [query])

    const handleSelect = (href: string) => {
        setOpen(false)
        router.push(href)
    }

    const handleKeyNav = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setSelectedIdx((prev) => Math.min(filtered.length - 1, prev + 1))
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setSelectedIdx((prev) => Math.max(0, prev - 1))
        } else if (e.key === "Enter" && filtered[selectedIdx]) {
            e.preventDefault()
            handleSelect(filtered[selectedIdx].href)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="group inline-flex items-center gap-2 h-8 sm:h-9 px-2.5 sm:px-3 rounded-full border border-border/80 bg-muted/40 hover:bg-muted/80 hover:border-emerald-500/40 text-muted-foreground hover:text-foreground transition-all text-xs font-semibold"
                aria-label="Open Copteller Command Palette"
            >
                <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                <span className="hidden lg:inline">Quick jump...</span>
                <kbd className="hidden md:inline-flex items-center rounded bg-background border border-border px-1.5 py-0.5 text-[10px] font-mono font-bold text-muted-foreground">
                    ⌘K
                </kbd>
            </button>

            {open && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4">
                    <div
                        className="fixed inset-0 bg-background/70 backdrop-blur-md animate-in fade-in duration-150"
                        onClick={() => setOpen(false)}
                    />
                    <div
                        onKeyDown={handleKeyNav}
                        className="relative z-10 w-full max-w-xl rounded-2xl border border-border/90 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                    >
                        <div className="flex items-center gap-3 px-4 h-14 border-b border-border/70">
                            <Search className="h-4 w-4 text-emerald-500 shrink-0" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Jump to cooperative consoles, escrow vaults, schemes, or wallets..."
                                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
                            />
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="max-h-[55vh] overflow-y-auto p-2 space-y-1">
                            {filtered.length === 0 ? (
                                <div className="py-10 text-center text-xs text-muted-foreground">
                                    No matching Copteller screens for &ldquo;{query}&rdquo;.
                                </div>
                            ) : (
                                filtered.map((item, idx) => {
                                    const Icon = item.icon
                                    const isSel = idx === selectedIdx
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onMouseEnter={() => setSelectedIdx(idx)}
                                            onClick={() => handleSelect(item.href)}
                                            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                                                isSel ? "bg-emerald-500/10 text-foreground" : "text-muted-foreground hover:bg-muted/60"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className={`size-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                                        isSel
                                                            ? "bg-emerald-600 text-white border-emerald-600"
                                                            : "bg-background border-border text-muted-foreground"
                                                    }`}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold truncate text-foreground">{item.label}</p>
                                                    <p className="text-[11px] text-muted-foreground truncate">{item.hint}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="hidden sm:inline text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                    {item.group}
                                                </span>
                                                <ArrowRight className={`h-3.5 w-3.5 transition-transform ${isSel ? "text-emerald-500 translate-x-0.5" : "opacity-30"}`} />
                                            </div>
                                        </button>
                                    )
                                })
                            )}
                        </div>

                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/70 bg-muted/30 text-[10px] text-muted-foreground font-medium">
                            <span className="flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-emerald-500" /> Copteller Cooperative OS
                            </span>
                            <span className="hidden sm:inline font-mono">↑↓ navigate · ↵ open · esc close</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
