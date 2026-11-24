"use client"

import * as React from "react"
import { Clock, CheckCircle2, Play, Loader2, Info, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function CoptellerScheduledJobsPage() {
    const [jobs, setJobs] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [runningCron, setRunningCron] = React.useState<string | null>(null)

    const loadJobs = React.useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/scheduled-jobs?limit=100&sort=-createdAt&depth=1")
            const data = await res.json().catch(() => ({}))
            setJobs(Array.isArray(data.docs) ? data.docs : [])
        } catch {
            toast.error("Failed to load scheduled jobs")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        loadJobs()
    }, [loadJobs])

    const triggerPlatformCron = async (endpoint: string, label: string) => {
        setRunningCron(endpoint)
        const tId = toast.loading(`Running ${label}...`)
        try {
            const res = await fetch(endpoint, { method: "GET" })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
            toast.success(`${label} completed!`, { id: tId })
            loadJobs()
        } catch (err: any) {
            toast.error(err.message || `${label} failed`, { id: tId })
        } finally {
            setRunningCron(null)
        }
    }

    return (
        <div className="w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                        <Clock className="h-3 w-3" /> Scheduler &amp; Batch Cron
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Scheduled Jobs &amp; Reconcilers</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Monitor Vercel serverless crons (OlivePay pending payout/VA reconciler + workflow cron tick) and recurring workflow timers.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadJobs} className="h-9 rounded-xl font-bold text-xs gap-1.5 self-start whitespace-nowrap">
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                </Button>
            </div>

            {/* Platform Vercel Cron Jobs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                    {
                        title: "OlivePay Pending Payout & Dynamic VA Reconciler",
                        cron: "*/5 * * * * (Every 5m)",
                        endpoint: "/api/cron/olivepay-reconcile",
                        desc: "Reconciles code 09 pending NIP payouts, SWF-... funding transfers, expired Dynamic VAs, and aged Escrow Holds.",
                    },
                    {
                        title: "Copteller Stateless Workflow Cron Dispatcher",
                        cron: "* * * * * (Every 1m)",
                        endpoint: "/api/cron/workflows-tick",
                        desc: "Evaluates due CRON/INTERVAL workflow jobs in Postgres and dispatches executions on Vercel serverless.",
                    },
                ].map((c) => (
                    <div
                        key={c.endpoint}
                        className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-5 flex flex-col justify-between gap-4 min-w-0"
                    >
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-black text-foreground">{c.title}</p>
                                    <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/30 text-emerald-600 whitespace-nowrap">
                                        {c.cron}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                                <code className="text-[11px] font-mono text-muted-foreground block pt-1 truncate">{c.endpoint}</code>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={runningCron === c.endpoint}
                                onClick={() => triggerPlatformCron(c.endpoint, c.title)}
                                className="h-8 rounded-xl text-xs font-bold gap-1.5 whitespace-nowrap"
                            >
                                {runningCron === c.endpoint ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-emerald-500" />}
                                Run Tick Now
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {loading && jobs.length === 0 ? (
                <div className="border rounded-2xl bg-card p-16 flex justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
            ) : jobs.length === 0 ? (
                <div className="border rounded-2xl bg-card p-12 text-center text-muted-foreground">
                    <Info size={24} className="mx-auto mb-3 opacity-40" />
                    <h3 className="text-base font-bold text-foreground">No custom workflow schedules</h3>
                    <p className="text-xs mt-1">Publish a workflow with a CRON trigger node to register an automated timer here.</p>
                </div>
            ) : (
                <>
                    {/* MOBILE CARDS (< lg) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
                        {jobs.map((job) => (
                            <div key={job.id} className="rounded-2xl border bg-card p-4 shadow-sm space-y-2.5 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-bold text-sm truncate">
                                        {typeof job.workflow === "object" && job.workflow ? job.workflow.name : `Workflow #${job.workflow}`}
                                    </p>
                                    <Badge variant="outline" className="text-[10px] font-bold shrink-0">{job.status}</Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <Badge variant="secondary" className="text-[10px] font-mono uppercase">{job.type}</Badge>
                                    <span className="font-mono text-muted-foreground">
                                        {job.type === "CRON" ? job.cronExpression : job.type === "INTERVAL" ? `${job.intervalMs}ms` : job.runAt ? new Date(job.runAt).toLocaleString() : "--"}
                                    </span>
                                </div>
                                <div className="flex justify-between text-[11px] text-muted-foreground pt-2 border-t">
                                    <span>Runs: {job.runCount || 0}{job.maxRuns ? ` / ${job.maxRuns}` : ""}</span>
                                    <span>Next: {job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : "--"}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* DESKTOP TABLE (lg+) */}
                    <div className="hidden lg:block w-full border rounded-2xl shadow-sm bg-card overflow-hidden">
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-sm text-left table-auto">
                                <thead className="text-[11px] text-muted-foreground uppercase bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-5 py-3.5 font-bold whitespace-nowrap">Workflow</th>
                                        <th className="px-4 py-3.5 font-bold whitespace-nowrap">Type</th>
                                        <th className="px-4 py-3.5 font-bold whitespace-nowrap">Schedule</th>
                                        <th className="px-4 py-3.5 font-bold whitespace-nowrap">Status</th>
                                        <th className="px-4 py-3.5 font-bold whitespace-nowrap">Runs</th>
                                        <th className="px-5 py-3.5 font-bold whitespace-nowrap">Next Run</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/70">
                                    {jobs.map((job) => (
                                        <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-5 py-3.5 font-bold">
                                                {typeof job.workflow === "object" && job.workflow ? job.workflow.name : `Workflow #${job.workflow}`}
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <Badge variant="secondary" className="text-[10px] font-mono uppercase">{job.type}</Badge>
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap">
                                                {job.type === "CRON"
                                                    ? job.cronExpression
                                                    : job.type === "INTERVAL"
                                                      ? `${job.intervalMs}ms`
                                                      : job.runAt
                                                        ? new Date(job.runAt).toLocaleString()
                                                        : "--"}
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <Badge variant="outline" className="text-[10px] font-bold">{job.status}</Badge>
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                                {job.runCount || 0}{job.maxRuns ? ` / ${job.maxRuns}` : ""}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                                                {job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : "--"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
