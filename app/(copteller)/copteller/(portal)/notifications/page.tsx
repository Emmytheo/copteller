"use client"

import * as React from "react"
import { Bell, CheckCircle2, Sliders, Mail, Smartphone, Info, RefreshCw, AlertCircle, CreditCard, Shield, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface NotificationItem {
    id: string
    title: string
    desc: string
    time: string
    timestamp: number
    read: boolean
    type: 'transaction' | 'security' | 'esusu' | 'membership' | 'general'
}

interface NotificationPrefs {
    emailAlerts: boolean
    smsAlerts: boolean
    marketing: boolean
    ajoReminders: boolean
}

export default function MemberNotificationsPage() {
    const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
    const [loading, setLoading] = React.useState(true)
    const [activeTab, setActiveTab] = React.useState<'inbox' | 'prefs'>('inbox')
    
    // Preferences state
    const [prefs, setPrefs] = React.useState<NotificationPrefs>({
        emailAlerts: true,
        smsAlerts: false,
        marketing: false,
        ajoReminders: true
    })

    const fetchNotifications = React.useCallback(async () => {
        try {
            const res = await fetch('/api/copteller/notifications')
            const data = await res.json()
            if (data.success) {
                setNotifications(data.notifications || [])
                if (data.preferences) {
                    setPrefs(data.preferences)
                }
            }
        } catch (err) {
            console.error("Failed to load notifications:", err)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    const unreadCount = notifications.filter(n => !n.read).length

    const handleMarkAllRead = async () => {
        if (unreadCount === 0) return
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
        
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        toast.success("All notifications marked as read")

        try {
            await fetch('/api/copteller/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    markAllRead: true,
                    notificationIds: unreadIds
                })
            })
        } catch (err) {
            console.error("Failed to sync read status:", err)
        }
    }

    const handleMarkSingleRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        try {
            await fetch('/api/copteller/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    markSingleRead: true,
                    notificationId: id
                })
            })
        } catch (err) {
            console.error("Failed to mark notification read:", err)
        }
    }

    const togglePref = async (key: keyof NotificationPrefs) => {
        const nextValue = !prefs[key]
        const updatedPrefs = { ...prefs, [key]: nextValue }
        setPrefs(updatedPrefs)

        const tId = toast.loading("Updating communication preferences...")
        try {
            const res = await fetch('/api/copteller/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preferences: { [key]: nextValue }
                })
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update preferences')
            }
            toast.success("Alert preferences saved to database", { id: tId })
        } catch (err: any) {
            // Revert state
            setPrefs(prev => ({ ...prev, [key]: !nextValue }))
            toast.error(err.message || "Failed to save preferences", { id: tId })
        }
    }

    const getIconForType = (type: NotificationItem['type']) => {
        switch (type) {
            case 'security':
                return <Shield className="h-4 w-4 text-rose-500" />
            case 'transaction':
                return <CreditCard className="h-4 w-4 text-emerald-500" />
            case 'esusu':
            case 'membership':
                return <Users className="h-4 w-4 text-indigo-500" />
            default:
                return <Bell className="h-4 w-4 text-slate-400" />
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6 font-sans">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-emerald-500/10 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Inbox</span>
                    <h1 className="text-3xl font-black mt-2 flex items-center gap-3">
                        Notifications & Alerts
                        {unreadCount > 0 && (
                            <span className="bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-full font-black animate-pulse">
                                {unreadCount} New
                            </span>
                        )}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">Review live alerts regarding your savings payouts, smart card actions, and cooperative union activities.</p>
                </div>
            </div>

            <div className="flex gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
                <button
                    onClick={() => setActiveTab('inbox')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'inbox'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Bell className="h-4 w-4" /> Live Inbox {unreadCount > 0 && `(${unreadCount})`}
                </button>
                <button
                    onClick={() => setActiveTab('prefs')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'prefs'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Sliders className="h-4 w-4" /> Alert Preferences
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
                </div>
            ) : activeTab === 'inbox' ? (
                <div className="space-y-4">
                    {unreadCount > 0 && (
                        <div className="flex justify-end">
                            <Button onClick={handleMarkAllRead} variant="ghost" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-8">
                                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark all as read
                            </Button>
                        </div>
                    )}

                    {notifications.length === 0 ? (
                        <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                            <p className="text-xs font-bold text-muted-foreground">No notifications at the moment.</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div 
                                key={n.id} 
                                onClick={() => !n.read && handleMarkSingleRead(n.id)}
                                className={`p-5 rounded-3xl border flex gap-4 shadow-sm transition-all cursor-pointer ${
                                    n.read 
                                        ? 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-900 opacity-80 hover:opacity-100' 
                                        : 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30 shadow-md ring-1 ring-emerald-500/20'
                                }`}
                            >
                                <div className="shrink-0 p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center self-start mt-0.5">
                                    {getIconForType(n.type)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`text-sm font-black ${n.read ? 'text-slate-700 dark:text-slate-300' : 'text-foreground'}`}>{n.title}</p>
                                        {!n.read && (
                                            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                                                NEW
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground font-semibold mt-1.5 leading-relaxed">{n.desc}</p>
                                    <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-wider">{n.time}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-3xl p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-black">Communication Channels</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Control how Copteller core banking delivers notifications.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-900 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl"><Mail className="h-4 w-4" /></div>
                                <div>
                                    <p className="text-xs font-black">Email Alerts</p>
                                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Receive transaction receipts and reports via email.</p>
                                </div>
                            </div>
                            <button onClick={() => togglePref('emailAlerts')} className={`w-10 h-6 rounded-full p-1 transition-colors ${prefs.emailAlerts ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                <div className={`size-4 bg-white rounded-full shadow-sm transition-transform ${prefs.emailAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-900 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl"><Smartphone className="h-4 w-4" /></div>
                                <div>
                                    <p className="text-xs font-black">SMS Notifications</p>
                                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Get instant SMS alerts for debits and credits.</p>
                                </div>
                            </div>
                            <button onClick={() => togglePref('smsAlerts')} className={`w-10 h-6 rounded-full p-1 transition-colors ${prefs.smsAlerts ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                <div className={`size-4 bg-white rounded-full shadow-sm transition-transform ${prefs.smsAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-900 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl"><Bell className="h-4 w-4" /></div>
                                <div>
                                    <p className="text-xs font-black">Ajo Dues Reminders</p>
                                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Automated reminders before your thrift cycle is due.</p>
                                </div>
                            </div>
                            <button onClick={() => togglePref('ajoReminders')} className={`w-10 h-6 rounded-full p-1 transition-colors ${prefs.ajoReminders ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                <div className={`size-4 bg-white rounded-full shadow-sm transition-transform ${prefs.ajoReminders ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
