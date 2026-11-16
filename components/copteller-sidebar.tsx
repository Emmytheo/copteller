"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    Cpu, Settings, LogOut, LayoutDashboard, UserCheck, Truck, CreditCard,
    PiggyBank, Award, BarChart3, Users, TrendingUp, ShieldAlert,
    Wallet, Activity, Lock, HelpCircle, Bell, Layers, Building2,
    ChevronDown, ChevronRight, CircleDollarSign, KeyRound, Smartphone,
    ClipboardList, Receipt, BookUser, Banknote, FileText, History, Plug,
    User, RefreshCw,
    Zap,
    Play,
    Send,
    Home,
    Users2,
    Landmark,
    ShieldCheck
} from "lucide-react"
import {
    Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
    SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar
} from "@/components/ui/sidebar"
import { Button } from "./ui/button"
import { toast } from "sonner"
import { useScope } from "@/context/scope-context"
import { createCoptellerClient } from "@/lib/copteller/supabase/client"

type NavGroup = {
    label: string
    items: { title: string; url: string; icon: React.ElementType; badge?: string }[]
}

const MEMBER_NAV: NavGroup[] = [
    {
        label: "My Workspace",
        items: [
            { title: "Overview", url: "/copteller/dashboard", icon: LayoutDashboard },
            { title: "Services Hub", url: "/copteller/services", icon: Zap },
            { title: "Wallet & Transfers", url: "/copteller/wallet", icon: Wallet },
            { title: "Household & Pockets", url: "/copteller/household", icon: Home, badge: "New" },
            { title: "Two-Track Thrift Hub", url: "/copteller/esusu", icon: PiggyBank, badge: "Unified" },
            { title: "Campaigns & Relief", url: "/copteller/campaigns", icon: Send, badge: "New" },
            { title: "Asset Leases (HP)", url: "/copteller/hp", icon: Truck },
        ]
    },
    {
        label: "Credit & Grants",
        items: [
            { title: "Credit Score", url: "/copteller/credit", icon: BarChart3 },
            { title: "Grants & Loans", url: "/copteller/grants", icon: Award, badge: "1 New" },
        ]
    },
    {
        label: "Cooperative",
        items: [
            { title: "Membership Dues", url: "/copteller/dues", icon: Receipt },
            { title: "Transaction History", url: "/copteller/transactions", icon: History },
        ]
    },
    {
        label: "Settings",
        items: [
            { title: "Cards & Vault", url: "/copteller/cards", icon: CreditCard },
            { title: "Notifications", url: "/copteller/notifications", icon: Bell },
            { title: "Security", url: "/copteller/security", icon: Lock },
        ]
    }
]

const ADMIN_NAV: NavGroup[] = [
    {
        label: "Cooperative Console",
        items: [
            { title: "Admin Overview", url: "/copteller/admin", icon: LayoutDashboard },
            { title: "Member Accounts", url: "/copteller/admin/members", icon: BookUser },
            { title: "Operator Roster", url: "/copteller/admin/roster", icon: Users },
            { title: "Asset financing / Leases", url: "/copteller/admin/fleet", icon: Truck },
            { title: "Collections Ledger", url: "/copteller/admin/ledger", icon: CircleDollarSign },
            { title: "Transaction History", url: "/copteller/admin/transactions", icon: History },
        ]
    },
    {
        label: "Services & Terminals",
        items: [
            { title: "Union Services", url: "/copteller/admin/services", icon: Zap },
            { title: "Artisan Settlements", url: "/copteller/merchant", icon: Building2 },
            { title: "POS Terminals", url: "/copteller/agency", icon: Smartphone },
        ]
    },
    {
        label: "Investment & Yields",
        items: [
            { title: "Active Schemes", url: "/copteller/admin/schemes", icon: TrendingUp },
            { title: "Campaigns & Relief", url: "/copteller/campaigns", icon: Send, badge: "Live" },
            { title: "Partner Payouts", url: "/copteller/admin/payouts", icon: Layers },
        ]
    },
    {
        label: "Management",
        items: [
            { title: "Membership Dues", url: "/copteller/admin/dues", icon: Banknote },
            { title: "Grant Distribution", url: "/copteller/admin/grants", icon: Award },
            { title: "Audit Reports", url: "/copteller/admin/audit", icon: ShieldAlert },
            { title: "Settings", url: "/copteller/admin/settings", icon: Settings },
        ]
    }
]

const INVESTOR_NAV: NavGroup[] = [
    {
        label: "Investor Hub",
        items: [
            { title: "Portfolio Overview", url: "/copteller/investor", icon: LayoutDashboard },
            { title: "Asset Registry (HP)", url: "/copteller/investor/registry", icon: Truck },
            { title: "Payout Logs", url: "/copteller/investor/payouts", icon: Layers },
        ]
    },
    {
        label: "Marketplace",
        items: [
            { title: "Underwrite Schemes", url: "/copteller/investor/schemes", icon: TrendingUp },
        ]
    }
]

const PARTNER_NAV: NavGroup[] = [
    {
        label: "Institutional Partner",
        items: [
            { title: "Program Overview", url: "/copteller/partner", icon: LayoutDashboard },
            { title: "Underwrite & Schemes", url: "/copteller/partner/schemes", icon: TrendingUp },
            { title: "Accredited Network", url: "/copteller/partner/providers", icon: Building2 },
            { title: "Beneficiary Roster", url: "/copteller/partner/beneficiaries", icon: Users2 },
        ]
    },
    {
        label: "Float & Governance",
        items: [
            { title: "Float & Margin Ledger", url: "/copteller/partner/settlements", icon: CircleDollarSign },
            { title: "Subsidized Services", url: "/copteller/partner/services", icon: Zap },
            { title: "Governance & Escrow", url: "/copteller/partner/governance", icon: ShieldCheck },
        ]
    }
]

const SUPERADMIN_NAV: NavGroup[] = [
    {
        label: "Bank Audit Console",
        items: [
            { title: "Super Overview", url: "/copteller/superadmin", icon: ShieldAlert },
            { title: "Public Schemes & Relief", url: "/copteller/campaigns", icon: Send, badge: "Live" },
            { title: "Union Approvals", url: "/copteller/superadmin/unions", icon: Building2, badge: "2" },
            { title: "Scheme Management", url: "/copteller/superadmin/schemes", icon: TrendingUp },
            { title: "Grant Disbursals", url: "/copteller/superadmin/grants", icon: Award, badge: "2" },
            { title: "Accounting Ledgers", url: "/copteller/superadmin/ledgers", icon: CircleDollarSign },
            { title: "Institutional Partners", url: "/copteller/partner", icon: Landmark, badge: "Live" },
        ]
    },
    {
        label: "Platform Health",
        items: [
            { title: "Services & Matrix", url: "/copteller/superadmin/services", icon: Zap },
            { title: "Service Simulator", url: "/copteller/superadmin/services/simulator", icon: Play },
            { title: "System Infrastructure", url: "/copteller/superadmin/infrastructure", icon: Settings },
            { title: "Leased Asset Registry", url: "/copteller/superadmin/assets", icon: Truck },
            { title: "Vault & API Keys", url: "/copteller/superadmin/vault", icon: KeyRound },
            { title: "Service Providers", url: "/copteller/superadmin/providers", icon: Plug },
            { title: "Compliance Logs", url: "/copteller/superadmin/compliance", icon: Activity },
            { title: "API Endpoints Specs", url: "/copteller/superadmin/endpoints", icon: Cpu },
            { title: "Workflow Automations", url: "/copteller/superadmin/workflows", icon: Layers },
            { title: "Financial Products", url: "/copteller/superadmin/products", icon: Settings },
        ]
    }
]

function NavSection({ group, pathname, isCollapsed }: { group: NavGroup; pathname: string; isCollapsed: boolean }) {
    const [open, setOpen] = React.useState(true)
    const { isMobile, setOpenMobile } = useSidebar()
    return (
        <div className="space-y-1">
            {!isCollapsed && (
                <button
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/75 hover:text-foreground transition-colors"
                >
                    {group.label}
                    {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
            )}
            <AnimatePresence initial={false}>
                {(open || isCollapsed) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <SidebarMenu>
                            {group.items.map((item) => {
                                const isActive = pathname === item.url || pathname.startsWith(item.url.split("?")[0] + (item.url.includes("?") ? "" : "/"))
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            tooltip={item.title}
                                            isActive={isActive}
                                            className={`rounded-xl h-10 px-3 relative overflow-hidden transition-all duration-200 group ${isActive
                                                ? 'text-primary font-black bg-primary/10 hover:bg-primary/15 shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40 font-semibold'
                                                } group-data-[collapsible=icon]:!justify-center`}
                                        >
                                            <Link 
                                                href={item.url} 
                                                onClick={() => isMobile && setOpenMobile(false)}
                                                className="flex items-center gap-3 w-full group-data-[collapsible=icon]:!justify-center"
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeCoptellerNav"
                                                        className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-full shadow-sm shadow-primary/30"
                                                    />
                                                )}
                                                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} transition-colors`} />
                                                <span className="text-xs tracking-wide flex-1 group-data-[collapsible=icon]:hidden">{item.title}</span>
                                                {item.badge && (
                                                    <span className="text-[9px] font-black bg-accent/20 text-accent-foreground border border-accent/30 px-1.5 py-0.5 rounded-full leading-none group-data-[collapsible=icon]:hidden">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const ROLE_DASHBOARD: Record<string, string> = {
    member: '/copteller/dashboard',
    coop_admin: '/copteller/admin',
    investor: '/copteller/investor',
    partner: '/copteller/partner',
    superadmin: '/copteller/superadmin',
    bank_staff: '/copteller/superadmin',
}

export function CoptellerSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { state, isMobile, setOpenMobile } = useSidebar()
    const isCollapsed = state === "collapsed"
    const { activeScope, scopes, setScopeId, isLoadingScopes } = useScope()
    const [isWorkspaceOpen, setIsWorkspaceOpen] = React.useState(false)

    // Route-aware role fallback: if visiting /copteller/partner directly, auto-adapt sidebar nav
    const routeRole = pathname.startsWith('/copteller/partner')
        ? 'partner'
        : pathname.startsWith('/copteller/investor')
            ? 'investor'
            : pathname.startsWith('/copteller/admin')
                ? 'coop_admin'
                : pathname.startsWith('/copteller/superadmin')
                    ? 'superadmin'
                    : null

    // Derive selected role from route or active scope
    const selectedRole = (routeRole || activeScope.role || 'member') as 'member' | 'coop_admin' | 'admin' | 'investor' | 'partner' | 'superadmin'

    // Map copteller profile role to sidebar nav key
    const navRoleKey = selectedRole === 'coop_admin' ? 'admin' : selectedRole as 'member' | 'admin' | 'investor' | 'partner' | 'superadmin'

    const handleScopeSwitch = (scopeId: string) => {
        const scope = scopes.find(s => s.id === scopeId)
        if (!scope) return
        setScopeId(scopeId)
        if (isMobile) setOpenMobile(false)
        const dashboard = ROLE_DASHBOARD[scope.role || 'member'] || '/copteller/dashboard'
        router.push(dashboard)
    }

    const handleSignOut = async () => {
        const supabase = createCoptellerClient()
        await supabase.auth.signOut()
        localStorage.removeItem('active_copteller_profile_id')
        localStorage.removeItem('active_copteller_role')
        router.replace('/copteller/auth')
    }

    const dynamicNavGroups = React.useMemo(() => {
        return navRoleKey === 'superadmin'
            ? SUPERADMIN_NAV
            : navRoleKey === 'partner'
                ? PARTNER_NAV
                : navRoleKey === 'investor'
                    ? INVESTOR_NAV
                    : navRoleKey === 'admin'
                        ? ADMIN_NAV
                        : MEMBER_NAV
    }, [navRoleKey])

    const roleConfig: Record<string, { label: string; color: string; bg: string; badge: string }> = {
        member: { label: "Member Portal", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", badge: "MBR" },
        coop_admin: { label: "Cooperative Admin", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", badge: "ADM" },
        admin: { label: "Cooperative Admin", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", badge: "ADM" },
        investor: { label: "Investor Console", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", badge: "INV" },
        partner: { label: "Institutional Partner", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", badge: "APX" },
        superadmin: { label: "Bank Superadmin", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", badge: "SU" },
        bank_staff: { label: "Bank Staff", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", badge: "STF" },
    }

    const currentRole = roleConfig[selectedRole] || roleConfig['member']

    return (
        <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 font-sans">
            <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border shrink-0 group-data-[collapsible=icon]:!justify-center">
                <Link href="/copteller" className="flex items-center gap-2.5 group w-full group-data-[collapsible=icon]:!justify-center">
                    <div className="p-2 bg-primary/10 border border-primary/25 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <Cpu className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                        <span className="text-base font-black tracking-widest text-foreground">
                            COPTELLER
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider -mt-1">
                            Cooperative Bank
                        </span>
                    </div>
                </Link>
            </SidebarHeader>

            <SidebarContent className="flex-1 overflow-y-auto">
                {/* Profile Scope Switcher — collapsible with active preview */}
                {!isLoadingScopes && scopes.length > 1 && (
                    <div className="px-3 py-2.5 border-b border-sidebar-border group-data-[collapsible=icon]:hidden">
                        {/* Header toggle bar */}
                        <button
                            type="button"
                            onClick={() => setIsWorkspaceOpen(prev => !prev)}
                            className="w-full flex items-center justify-between mb-1.5 px-1 py-1 text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                        >
                            <div className="flex items-center gap-1.5">
                                <p className="text-[9px] font-black uppercase tracking-widest">Switch Workspace</p>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground leading-none">
                                    {scopes.length}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground group-hover:text-foreground">
                                <span>{isWorkspaceOpen ? 'Hide' : 'Change'}</span>
                                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isWorkspaceOpen ? 'rotate-180 text-foreground' : ''}`} />
                            </div>
                        </button>

                        {/* Collapsed Active Workspace Card */}
                        {!isWorkspaceOpen && (() => {
                            const activeCfg = roleConfig[activeScope.role || 'member'] || roleConfig['member']
                            return (
                                <button
                                    type="button"
                                    onClick={() => setIsWorkspaceOpen(true)}
                                    className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 text-left ${activeCfg.bg} ${activeCfg.color} font-black shadow-sm hover:opacity-90 cursor-pointer`}
                                >
                                    <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                                        activeScope.role === 'member' ? 'bg-primary'
                                            : activeScope.role === 'coop_admin' ? 'bg-amber-500'
                                                : activeScope.role === 'investor' ? 'bg-orange-500'
                                                    : activeScope.role === 'partner' ? 'bg-blue-500'
                                                        : 'bg-rose-500'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1.5">
                                            <span className="truncate font-black text-xs">
                                                {activeScope.name.replace(/\s*\(.*?\)\s*/g, '')}
                                            </span>
                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded leading-none shrink-0 ${
                                                activeScope.role === 'member' ? 'bg-primary/20 text-primary' :
                                                activeScope.role === 'coop_admin' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                                                activeScope.role === 'investor' ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                                                activeScope.role === 'partner' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                                                'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                            }`}>
                                                {activeScope.role === 'coop_admin' ? 'Coop Admin' :
                                                 activeScope.role === 'investor' ? 'Investor' :
                                                 activeScope.role === 'partner' ? 'Partner' :
                                                 activeScope.role === 'superadmin' ? 'Superadmin' : 'Member'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground/80 truncate font-semibold mt-0.5">
                                            {activeScope.description || (
                                                activeScope.role === 'coop_admin' ? 'Abia Tricycle Operators Guild' :
                                                activeScope.role === 'investor' ? 'Syndicate Capital & Payouts' :
                                                activeScope.role === 'partner' ? 'State Parastatal Programs' :
                                                activeScope.role === 'superadmin' ? 'Abia MFB Central Treasury' :
                                                'Primary Savings & Thrift'
                                            )}
                                        </p>
                                    </div>
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1 opacity-60" />
                                </button>
                            )
                        })()}

                        {/* Collapsible Dropdown list of all workspaces */}
                        <AnimatePresence initial={false}>
                            {isWorkspaceOpen && (
                                <motion.div
                                    key="workspace-dropdown"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="overflow-hidden space-y-1 pt-1"
                                >
                                    {scopes.map(scope => {
                                        const cfg = roleConfig[scope.role || 'member'] || roleConfig['member']
                                        const isActive = scope.id === activeScope.id
                                        return (
                                            <button
                                                key={scope.id}
                                                onClick={() => {
                                                    handleScopeSwitch(scope.id)
                                                    setIsWorkspaceOpen(false)
                                                }}
                                                className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 text-left cursor-pointer ${isActive
                                                    ? `${cfg.bg} ${cfg.color} font-black shadow-sm ring-1 ring-inset ${cfg.color.includes('emerald') ? 'ring-emerald-500/30' : cfg.color.includes('amber') ? 'ring-amber-500/30' : cfg.color.includes('orange') ? 'ring-orange-500/30' : cfg.color.includes('blue') ? 'ring-blue-500/30' : 'ring-rose-500/30'}`
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                                                }`}
                                            >
                                                <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                                                    isActive
                                                        ? scope.role === 'member' ? 'bg-primary'
                                                            : scope.role === 'coop_admin' ? 'bg-amber-500'
                                                                : scope.role === 'investor' ? 'bg-orange-500'
                                                                    : scope.role === 'partner' ? 'bg-blue-500'
                                                                        : 'bg-rose-500'
                                                        : 'bg-muted-foreground/30'
                                                }`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <span className="truncate font-black text-xs">
                                                            {scope.name.replace(/\s*\(.*?\)\s*/g, '')}
                                                        </span>
                                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded leading-none shrink-0 ${
                                                            scope.role === 'member' ? 'bg-primary/20 text-primary' :
                                                            scope.role === 'coop_admin' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                                                            scope.role === 'investor' ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                                                            scope.role === 'partner' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                                                            'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                                        }`}>
                                                            {scope.role === 'coop_admin' ? 'Coop Admin' :
                                                             scope.role === 'investor' ? 'Investor' :
                                                             scope.role === 'partner' ? 'Partner' :
                                                             scope.role === 'superadmin' ? 'Superadmin' : 'Member'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground/80 truncate font-semibold mt-0.5">
                                                        {scope.description || (
                                                            scope.role === 'coop_admin' ? 'Abia Tricycle Operators Guild' :
                                                            scope.role === 'investor' ? 'Syndicate Capital & Payouts' :
                                                            scope.role === 'partner' ? 'State Parastatal Programs' :
                                                            scope.role === 'superadmin' ? 'Abia MFB Central Treasury' :
                                                            'Primary Savings & Thrift'
                                                        )}
                                                    </p>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
                {isLoadingScopes && (
                    <div className="px-4 py-3 border-b border-sidebar-border group-data-[collapsible=icon]:hidden">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Loading profiles...
                        </div>
                    </div>
                )}

                <div className="px-3 py-4 space-y-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedRole}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            {dynamicNavGroups.map((group, i) => (
                                <NavSection key={i} group={group} pathname={pathname} isCollapsed={isCollapsed} />
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
                <div className="flex items-center gap-3 px-2.5 py-2 rounded-xl bg-accent/30 border border-sidebar-border/80 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:p-2">
                    <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-xs font-black text-primary shrink-0">
                        {activeScope.name?.substring(0, 2).toUpperCase() || 'CO'}
                    </div>
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                        <p className="text-xs font-black text-foreground truncate">{activeScope.name}</p>
                        <p className="text-[9px] text-muted-foreground font-semibold truncate">{activeScope.description}</p>
                    </div>
                    <div className={`text-[9px] font-black px-1.5 py-0.5 rounded-full group-data-[collapsible=icon]:hidden ${currentRole.bg} ${currentRole.color}`}>
                        {currentRole.badge}
                    </div>
                </div>
                <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    className="w-full justify-start gap-3 h-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-semibold transition-colors text-xs group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:p-0"
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
                </Button>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
