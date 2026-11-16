"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ShieldCheck, User, Users, TrendingUp, Shield, Cpu,
    ArrowRight, Plus, RefreshCw, LogOut, ChevronRight, Landmark
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { createCoptellerClient } from "@/lib/copteller/supabase/client"

type CoptellerRole = 'member' | 'coop_admin' | 'investor' | 'partner' | 'superadmin' | 'bank_staff'

interface Profile {
    id: string
    role: CoptellerRole
    display_name: string | null
    cooperative_name: string | null
    onboarding_done: boolean
    is_active: boolean
}

const ROLE_CONFIG: Record<CoptellerRole, {
    label: string
    icon: React.ElementType
    gradient: string
    badge: string
    badgeBg: string
    description: string
    dashboard: string
}> = {
    member: {
        label: "Coop Member",
        icon: User,
        gradient: "from-emerald-500 to-emerald-600",
        badge: "MBR",
        badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        description: "Ajo thrift, hire purchase & credit building",
        dashboard: "/copteller/dashboard",
    },
    coop_admin: {
        label: "Union Admin",
        icon: Users,
        gradient: "from-amber-500 to-amber-600",
        badge: "ADM",
        badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
        description: "Member roster, fleet & collections management",
        dashboard: "/copteller/admin",
    },
    investor: {
        label: "Investor / Sponsor",
        icon: TrendingUp,
        gradient: "from-orange-500 to-orange-600",
        badge: "INV",
        badgeBg: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
        description: "Scheme capital, yield tracking & payouts",
        dashboard: "/copteller/investor",
    },
    partner: {
        label: "Institutional Partner",
        icon: Landmark,
        gradient: "from-blue-500 to-blue-600",
        badge: "PRT",
        badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
        description: "Program sponsorship, underwriting & impact",
        dashboard: "/copteller/partner",
    },
    superadmin: {
        label: "Bank Superadmin",
        icon: Shield,
        gradient: "from-rose-500 to-rose-600",
        badge: "SU",
        badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
        description: "Platform audit, union approvals & governance",
        dashboard: "/copteller/superadmin",
    },
    bank_staff: {
        label: "Bank Staff",
        icon: ShieldCheck,
        gradient: "from-rose-500 to-rose-600",
        badge: "STF",
        badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
        description: "Operations, compliance & service support",
        dashboard: "/copteller/superadmin",
    },
}

export default function SelectProfilePage() {
    const router = useRouter()
    const supabase = createCoptellerClient()

    const [profiles, setProfiles] = React.useState<Profile[]>([])
    const [loading, setLoading] = React.useState(true)
    const [selectingId, setSelectingId] = React.useState<string | null>(null)
    const [userEmail, setUserEmail] = React.useState('')

    // Modal state for adding a profile
    const [showAddProfile, setShowAddProfile] = React.useState(false)
    const [newRole, setNewRole] = React.useState<CoptellerRole>('member')
    const [newDisplayName, setNewDisplayName] = React.useState('')
    const [newCoopId, setNewCoopId] = React.useState('')
    const [newCoopName, setNewCoopName] = React.useState('')
    const [cooperatives, setCooperatives] = React.useState<any[]>([])
    const [creatingProfile, setCreatingProfile] = React.useState(false)
    const [showStaffAccess, setShowStaffAccess] = React.useState(false)
    const [adminSecret, setAdminSecret] = React.useState('')

    // Load cooperatives for the dropdown
    React.useEffect(() => {
        if (showAddProfile) {
            fetch('/api/copteller/admin/cooperatives?status=active')
                .then(r => r.json())
                .then(res => {
                    if (res.data) setCooperatives(res.data)
                })
                .catch(err => console.warn("Failed to fetch active cooperatives", err))
        }
    }, [showAddProfile])

    React.useEffect(() => {
        const load = async () => {
            // Ensure user is authenticated
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.replace('/copteller/auth')
                return
            }
            setUserEmail(user.email || '')

            const params = new URLSearchParams(window.location.search)
            const force = params.get('force') === 'true'

            try {
                const res = await fetch('/api/copteller/profile?all=1')
                const data = await res.json()
                const fetched: Profile[] = (data.profiles || []).filter((p: Profile) => p.is_active)

                if (fetched.length === 0) {
                    router.replace('/copteller/onboarding')
                    return
                }
                if (fetched.length === 1 && !force) {
                    // Only one profile — bypass selector unless forced
                    selectProfile(fetched[0])
                    return
                }
                setProfiles(fetched)
            } catch {
                router.replace('/copteller/auth')
            } finally {
                setLoading(false)
            }
        }
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const selectProfile = (profile: Profile) => {
        setSelectingId(profile.id)
        localStorage.setItem('active_copteller_profile_id', profile.id)
        localStorage.setItem('active_copteller_role', profile.role)
        const cfg = ROLE_CONFIG[profile.role]
        router.replace(cfg?.dashboard || '/copteller/dashboard')
    }

    const handleAddProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreatingProfile(true)
        try {
            const res = await fetch('/api/copteller/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: newRole,
                    display_name: newDisplayName || undefined,
                    cooperative_id: newCoopId || undefined,
                    cooperative_name: newCoopName || undefined,
                    admin_secret: showStaffAccess && adminSecret ? adminSecret : undefined,
                })
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(`Profile for ${ROLE_CONFIG[newRole].label} created successfully!`)
                setShowAddProfile(false)
                
                // Clear fields
                setNewDisplayName('')
                setNewCoopId('')
                setNewCoopName('')

                // Reload profiles
                const profilesRes = await fetch('/api/copteller/profile?all=1')
                const profilesData = await profilesRes.json()
                const fetched: Profile[] = (profilesData.profiles || []).filter((p: Profile) => p.is_active)
                setProfiles(fetched)
            } else {
                toast.error(data.error || 'Failed to create profile.')
            }
        } catch {
            toast.error('An error occurred while creating profile.')
        } finally {
            setCreatingProfile(false)
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        localStorage.removeItem('active_copteller_profile_id')
        localStorage.removeItem('active_copteller_role')
        router.replace('/copteller/auth')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
        )
    }

    return (
        <div className="bg-background text-foreground min-h-screen flex flex-col justify-center items-center p-6 relative selection:bg-emerald-500/30 overflow-hidden">
            {/* Ambient orbs */}
            <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-emerald-500/4 dark:bg-emerald-500/6 rounded-full blur-[160px] pointer-events-none" />
            <div className="absolute bottom-[-5%] right-[10%] w-[400px] h-[400px] bg-amber-500/3 dark:bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

            <div className="w-full max-w-lg space-y-6 relative z-10">
                {/* Logo */}
                <div className="text-center space-y-3 pb-2">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-amber-500 rounded-xl shadow-lg">
                            <Cpu className="h-5 w-5 text-black" />
                        </div>
                        <span className="text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-amber-500 dark:from-emerald-400 dark:to-amber-400">
                            COPTELLER
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                        Choose Your Workspace
                    </h1>
                    <p className="text-sm text-muted-foreground font-semibold">
                        You have <span className="text-foreground font-black">{profiles.length} profiles</span> under{" "}
                        <span className="text-foreground font-black">{userEmail}</span>. Select one to continue.
                    </p>
                </div>

                {/* Profile cards */}
                <div className="space-y-3">
                    <AnimatePresence>
                        {profiles.map((profile, i) => {
                            const cfg = ROLE_CONFIG[profile.role]
                            const Icon = cfg?.icon || User
                            const isSelecting = selectingId === profile.id

                            return (
                                <motion.button
                                    key={profile.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    onClick={() => selectProfile(profile)}
                                    disabled={!!selectingId}
                                    className="w-full group relative bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 dark:hover:border-emerald-700/40 rounded-2xl p-5 flex items-center gap-5 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-950/10 text-left disabled:opacity-60"
                                >
                                    {/* Role icon */}
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cfg?.gradient || 'from-slate-400 to-slate-500'} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                                        {isSelecting
                                            ? <RefreshCw className="h-6 w-6 text-white animate-spin" />
                                            : <Icon className="h-6 w-6 text-white" />
                                        }
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <p className="text-sm font-black text-foreground">
                                                {profile.display_name || cfg?.label || profile.role}
                                            </p>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${cfg?.badgeBg}`}>
                                                {cfg?.badge}
                                            </span>
                                            {!profile.onboarding_done && (
                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                                                    SETUP PENDING
                                                </span>
                                            )}
                                        </div>
                                        {profile.cooperative_name && (
                                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                                {profile.cooperative_name}
                                            </p>
                                        )}
                                        <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed mt-0.5">
                                            {cfg?.description}
                                        </p>
                                    </div>

                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                                </motion.button>
                            )
                        })}
                    </AnimatePresence>
                </div>

                {/* Add profile / Sign out */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <Button
                        onClick={() => {
                            // Find first available role to set as default
                            const existing = profiles.map(p => p.role)
                            const firstAvail = (Object.keys(ROLE_CONFIG) as CoptellerRole[]).find(
                                r => !existing.includes(r) && r !== 'superadmin' && r !== 'bank_staff'
                            )
                            if (firstAvail) setNewRole(firstAvail)
                            setShowAddProfile(true)
                        }}
                        variant="outline"
                        className="flex-1 h-11 rounded-2xl font-black text-xs border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Another Profile
                    </Button>
                    <Button
                        onClick={handleSignOut}
                        variant="ghost"
                        className="h-11 px-5 rounded-2xl font-black text-xs text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </div>

            {/* Add Profile Modal */}
            <AnimatePresence>
                {showAddProfile && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
                        >
                            <h2 className="text-xl font-black mb-1">Add Workspace Profile</h2>
                            <p className="text-xs text-muted-foreground mb-4 font-semibold">
                                Register a new role/profile under your current account email.
                            </p>

                            <form onSubmit={handleAddProfile} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Select Role</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(Object.keys(ROLE_CONFIG) as CoptellerRole[])
                                            .filter(r => showStaffAccess || (r !== 'superadmin' && r !== 'bank_staff'))
                                            .map(r => {
                                                const cfg = ROLE_CONFIG[r]
                                                const hasRole = profiles.some(p => p.role === r)
                                                return (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        disabled={hasRole}
                                                        onClick={() => setNewRole(r)}
                                                        className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${newRole === r ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-800'} ${hasRole ? 'opacity-40 cursor-not-allowed' : 'hover:border-slate-300 dark:hover:border-slate-700'}`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0`}>
                                                            <cfg.icon className="h-4 w-4 text-white" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold">{cfg.label} {hasRole && "(Already Added)"}</p>
                                                            <p className="text-[10px] text-muted-foreground truncate">{cfg.description}</p>
                                                        </div>
                                                    </button>
                                                )
                                            })
                                        }
                                    </div>
                                </div>

                                {/* Staff Access toggle */}
                                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextVal = !showStaffAccess
                                            setShowStaffAccess(nextVal)
                                            if (!nextVal && (newRole === 'superadmin' || newRole === 'bank_staff')) {
                                                setNewRole('member')
                                            }
                                        }}
                                        className="flex items-center justify-between w-full text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors py-1"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <Shield className="h-3.5 w-3.5" />
                                            Staff Access (Optional)
                                        </span>
                                        <span>{showStaffAccess ? "Hide" : "Show"}</span>
                                    </button>
                                    
                                    {showStaffAccess && (
                                        <div className="mt-2.5 space-y-2">
                                            <label className="block text-[9px] font-black uppercase tracking-wider text-muted-foreground">Admin Secret</label>
                                            <input
                                                type="password"
                                                placeholder="Enter admin secret to unlock staff roles..."
                                                value={adminSecret}
                                                onChange={e => setAdminSecret(e.target.value)}
                                                className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 font-bold"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Display Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. John Doe"
                                        value={newDisplayName}
                                        onChange={e => setNewDisplayName(e.target.value)}
                                        className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 font-bold"
                                    />
                                </div>

                                {(newRole === 'member' || newRole === 'coop_admin') && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Cooperative</label>
                                        <select
                                            value={newCoopId}
                                            onChange={e => {
                                                setNewCoopId(e.target.value)
                                                const matched = cooperatives.find(c => String(c.id) === e.target.value)
                                                setNewCoopName(matched ? matched.name : '')
                                            }}
                                            required
                                            className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 font-bold"
                                        >
                                            <option value="">-- Choose Cooperative --</option>
                                            {cooperatives.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowAddProfile(false)}
                                        className="flex-1 h-10 rounded-xl text-xs font-black"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={creatingProfile || ((newRole === 'member' || newRole === 'coop_admin') && !newCoopId)}
                                        className="flex-1 h-10 bg-emerald-500 text-black hover:bg-emerald-600 rounded-xl text-xs font-black"
                                    >
                                        {creatingProfile ? "Creating..." : "Create Profile"}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
