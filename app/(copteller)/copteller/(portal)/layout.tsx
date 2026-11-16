"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
    ChevronRight, Cpu, ChevronDown, Check, User,
    LayoutDashboard, PiggyBank, Wallet, Truck, Users, CircleDollarSign, Menu,
    ShieldCheck, Landmark, CheckCircle2, Zap, TrendingUp, Coins,
    Building2, Users2
} from "lucide-react"
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { CoptellerSidebar } from "@/components/copteller-sidebar"
import { ThemeCustomizer } from "@/components/theme-customizer"
import { ScopeProvider, useScope } from "@/context/scope-context"

// Helper to format breadcrumb segments
const formatSegment = (segment: string) => {
    const maps: Record<string, string> = {
        copteller: "Copteller",
        dashboard: "Overview",
        esusu: "Ajo Thrift Hub",
        hp: "Asset Leases",
        wallet: "Wallet",
        credit: "Credit Scoring",
        grants: "Grants & Loans",
        dues: "Membership Dues",
        transactions: "Ledger Registry",
        admin: "Cooperative Console",
        superadmin: "Bank Superadmin",
        investor: "Investor Hub",
        schemes: "Schemes & Cycles",
        products: "Product Templates",
        unions: "Cooperative Unions",
        roster: "Operator Roster",
        members: "Member Accounts",
        fleet: "Asset Allocations",
        ledger: "Collections Ledger",
        services: "Services Engine",
        simulator: "Service Simulator",
        partner: "Institutional Desk",
        providers: "Accredited Network",
        beneficiaries: "Beneficiary Directory",
        settlements: "Float & Margin",
        governance: "Governance & Escrow",
        settings: "Governance Settings",
    }
    return maps[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
}

// ─── Scope Switcher Chip ─────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
    member: { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    coop_admin: { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    investor: { dot: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    partner: { dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    superadmin: { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    bank_staff: { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
}

function ScopeChip() {
    const router = useRouter()
    const { activeScope, scopes, setScopeId } = useScope()
    const [open, setOpen] = React.useState(false)
    const ref = React.useRef<HTMLDivElement>(null)

    // Close on outside click
    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const role = activeScope.role || 'member'
    const colors = ROLE_COLORS[role] || ROLE_COLORS['member']

    const handleSwitch = (scopeId: string, scopeRole: string) => {
        setScopeId(scopeId)
        setOpen(false)
        const DASH: Record<string, string> = {
            member: '/copteller/dashboard',
            coop_admin: '/copteller/admin',
            investor: '/copteller/investor',
            partner: '/copteller/partner',
            superadmin: '/copteller/superadmin',
            bank_staff: '/copteller/superadmin',
        }
        router.push(DASH[scopeRole] || '/copteller/dashboard')
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black transition-all ${colors.bg} ${colors.text} shadow-sm`}
            >
                <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${open ? '' : 'animate-pulse'}`} />
                <span className="hidden sm:inline max-w-[140px] truncate">{activeScope.name}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl shadow-black/20 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-border/60 bg-muted/30">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Switch Workspace</p>
                    </div>
                    {scopes.length > 0 && (
                        <div className="py-1.5 max-h-64 overflow-y-auto border-b border-border/60">
                            {scopes.map(scope => {
                                const c = ROLE_COLORS[scope.role || 'member'] || ROLE_COLORS['member']
                                const isActive = scope.id === activeScope.id
                                return (
                                    <button
                                        key={scope.id}
                                        onClick={() => handleSwitch(scope.id, scope.role || 'member')}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-colors hover:bg-accent/50 ${
                                            isActive ? 'text-foreground font-black' : 'text-muted-foreground'
                                        }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="truncate font-black">{scope.name}</p>
                                            {scope.cooperativeName && (
                                                <p className="text-[10px] text-muted-foreground font-semibold truncate">{scope.cooperativeName}</p>
                                            )}
                                        </div>
                                        {isActive && <Check className="h-3 w-3 text-primary shrink-0" />}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                    <div className="px-4 py-2 bg-muted/10">
                        <Link
                            href="/copteller/select-profile?force=true"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 text-[10px] font-black text-muted-foreground hover:text-foreground transition-colors py-1"
                        >
                            <User className="h-3 w-3" /> Manage Profiles
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Mobile Bottom Navigation Dock ─────────────────────────────────────────────
// ── Mobile Bottom Navigation Dock ─────────────────────────────────────────────

interface RoleTheme {
    color: string
    activeBg: string
    indicator: string
    badge: string
}

const ROLE_THEMES: Record<string, RoleTheme> = {
    member: {
        color: "text-emerald-600 dark:text-emerald-400",
        activeBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
        indicator: "bg-emerald-500",
        badge: "Member"
    },
    coop_admin: {
        color: "text-amber-600 dark:text-amber-400",
        activeBg: "bg-amber-500/10 dark:bg-amber-500/15",
        indicator: "bg-amber-500",
        badge: "Admin"
    },
    admin: {
        color: "text-amber-600 dark:text-amber-400",
        activeBg: "bg-amber-500/10 dark:bg-amber-500/15",
        indicator: "bg-amber-500",
        badge: "Admin"
    },
    investor: {
        color: "text-orange-600 dark:text-orange-400",
        activeBg: "bg-orange-500/10 dark:bg-orange-500/15",
        indicator: "bg-orange-500",
        badge: "Investor"
    },
    partner: {
        color: "text-blue-600 dark:text-blue-400",
        activeBg: "bg-blue-500/10 dark:bg-blue-500/15",
        indicator: "bg-blue-500",
        badge: "Partner"
    },
    superadmin: {
        color: "text-rose-600 dark:text-rose-400",
        activeBg: "bg-rose-500/10 dark:bg-rose-500/15",
        indicator: "bg-rose-500",
        badge: "Superadmin"
    },
    bank_staff: {
        color: "text-rose-600 dark:text-rose-400",
        activeBg: "bg-rose-500/10 dark:bg-rose-500/15",
        indicator: "bg-rose-500",
        badge: "Bank Staff"
    }
}

function MobilePortalBottomNav() {
    const pathname = usePathname()
    const { toggleSidebar } = useSidebar()
    const { activeScope } = useScope()

    // Route-aware role fallback
    const effectiveRole = pathname.startsWith('/copteller/partner')
        ? 'partner'
        : pathname.startsWith('/copteller/investor')
            ? 'investor'
            : pathname.startsWith('/copteller/superadmin')
                ? 'superadmin'
                : pathname.startsWith('/copteller/admin')
                    ? 'coop_admin'
                    : (activeScope.role || 'member')

    const currentTheme = ROLE_THEMES[effectiveRole] || ROLE_THEMES.member

    const memberItems = [
        { label: "Overview", href: "/copteller/dashboard", icon: LayoutDashboard },
        { label: "Thrift", href: "/copteller/esusu", icon: PiggyBank },
        { label: "Wallet", href: "/copteller/wallet", icon: Wallet },
        { label: "Credit", href: "/copteller/credit", icon: TrendingUp },
    ]

    const adminItems = [
        { label: "Console", href: "/copteller/admin", icon: LayoutDashboard },
        { label: "Members", href: "/copteller/admin/members", icon: Users },
        { label: "Dues", href: "/copteller/admin/dues", icon: Coins },
        { label: "Ledger", href: "/copteller/admin/ledger", icon: CircleDollarSign },
    ]

    const investorItems = [
        { label: "Portfolio", href: "/copteller/investor", icon: TrendingUp },
        { label: "Schemes", href: "/copteller/investor/schemes", icon: Coins },
        { label: "Fleet HP", href: "/copteller/investor/registry", icon: Truck },
        { label: "Yields", href: "/copteller/investor/payouts", icon: CircleDollarSign },
    ]

    const partnerItems = [
        { label: "Desk", href: "/copteller/partner", icon: LayoutDashboard },
        { label: "Schemes", href: "/copteller/partner/schemes", icon: TrendingUp },
        { label: "Float", href: "/copteller/partner/settlements", icon: CircleDollarSign },
        { label: "Gov", href: "/copteller/partner/governance", icon: ShieldCheck },
    ]

    const superAdminItems = [
        { label: "Command", href: "/copteller/superadmin", icon: ShieldCheck },
        { label: "Unions", href: "/copteller/superadmin/unions", icon: Landmark },
        { label: "Schemes", href: "/copteller/superadmin/schemes", icon: CheckCircle2 },
        { label: "Workflows", href: "/copteller/superadmin/workflows", icon: Zap },
    ]

    const navItems = effectiveRole === 'partner'
        ? partnerItems
        : effectiveRole === 'superadmin' || effectiveRole === 'bank_staff'
            ? superAdminItems
            : effectiveRole === 'investor'
                ? investorItems
                : effectiveRole === 'coop_admin' || effectiveRole === 'admin'
                    ? adminItems
                    : memberItems

    return (
        <nav
            aria-label="Mobile Navigation Dock"
            className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 dark:bg-slate-950/90 backdrop-blur-2xl border-t border-border/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-10px_35px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_35px_rgba(0,0,0,0.4)] safe-area-pb"
        >
            {navItems.map((item) => {
                const isRootDashboard = [
                    '/copteller/dashboard',
                    '/copteller/admin',
                    '/copteller/investor',
                    '/copteller/partner',
                    '/copteller/superadmin'
                ].includes(item.href)

                const isActive = isRootDashboard
                    ? pathname === item.href
                    : pathname.startsWith(item.href)

                const Icon = item.icon

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 active:scale-90 ${
                            isActive
                                ? `${currentTheme.color} ${currentTheme.activeBg} font-black`
                                : 'text-muted-foreground hover:text-foreground font-semibold'
                        }`}
                    >
                        {isActive && (
                            <span className={`absolute -top-1.5 w-6 h-1 rounded-full ${currentTheme.indicator} shadow-sm animate-in fade-in duration-200`} />
                        )}
                        <Icon className={`h-4 w-4 transition-transform ${isActive ? 'scale-110' : ''}`} />
                        <span className="text-[9px] mt-0.5 tracking-tight truncate max-w-[54px]">
                            {item.label}
                        </span>
                    </Link>
                )
            })}
            
            {/* Drawer trigger */}
            <button
                type="button"
                onClick={toggleSidebar}
                className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl text-muted-foreground hover:text-foreground font-semibold transition-all duration-200 active:scale-90"
            >
                <Menu className="h-4 w-4" />
                <span className="text-[9px] mt-0.5 tracking-tight">Menu</span>
            </button>
        </nav>
    )
}

export default function CoptellerPortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const segments = pathname.split('/').filter(Boolean)

    return (
        <ScopeProvider>
            <SidebarProvider>
                <div className="flex w-full min-h-screen bg-background text-foreground selection:bg-primary/30">
                    <CoptellerSidebar />
                    <SidebarInset className="flex-1 flex flex-col bg-background relative min-w-0">
                        
                        {/* Top sticky header for Portal navigation / theme toggle */}
                        <header className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 items-center justify-between gap-2 sm:gap-4 border-b border-border/70 bg-background/85 px-3 sm:px-6 backdrop-blur-xl transition-all duration-300">
                            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                <SidebarTrigger className="h-9 w-9 sm:h-8 sm:w-8 -ml-1 text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors shrink-0" />
                                <div className="h-5 w-px bg-border hidden sm:block" />
                                
                                {/* Dynamic Breadcrumbs */}
                                <nav className="hidden sm:flex items-center gap-1.5 text-[11px] font-black tracking-wide text-muted-foreground uppercase min-w-0">
                                    {segments.map((segment, index) => {
                                        const path = `/${segments.slice(0, index + 1).join('/')}`
                                        const isLast = index === segments.length - 1
                                        return (
                                            <React.Fragment key={path}>
                                                {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/45 shrink-0" />}
                                                {isLast ? (
                                                    <span className="text-foreground truncate max-w-[140px]">{formatSegment(segment)}</span>
                                                ) : (
                                                    <Link href={path} className="hover:text-foreground transition-colors truncate max-w-[140px]">
                                                        {formatSegment(segment)}
                                                    </Link>
                                                )}
                                            </React.Fragment>
                                        )
                                    })}
                                </nav>

                                {/* Mobile Simple Label */}
                                <div className="sm:hidden flex items-center gap-1.5 min-w-0">
                                    <Cpu className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    <span className="text-xs font-black uppercase tracking-wider text-foreground truncate max-w-[110px] sm:max-w-none">
                                        {segments.length > 0 ? formatSegment(segments[segments.length - 1]) : "Portal"}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                                <ThemeCustomizer />
                                {/* Live scope switcher chip — replaces the static SECURE badge */}
                                <ScopeChip />
                            </div>
                        </header>

                        {/* Dashboard content wrapper */}
                        <main className="flex-1 overflow-auto relative pb-20 sm:pb-0">
                            {children}
                        </main>

                        {/* Mobile bottom navigation dock */}
                        <MobilePortalBottomNav />
                        
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </ScopeProvider>
    )
}
