import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requireCoptellerCronOrAdmin } from '@/lib/copteller/auth'
import { executeWorkflow } from '@/lib/workflow/executeWorkflow'
import parser from 'cron-parser'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/workflows-tick
 * Stateless Vercel-compatible cron dispatcher that checks due `scheduled-jobs` in Postgres
 * and executes their published workflows cleanly (replacing volatile in-memory setTimeout).
 */
export async function GET(req: NextRequest) {
    const auth = await requireCoptellerCronOrAdmin(req)
    if (auth instanceof NextResponse) return auth

    try {
        const payload = await getPayload({ config })
        const now = new Date()

        const jobsRes = await payload.find({
            collection: 'scheduled-jobs',
            where: { status: { equals: 'ACTIVE' } },
            limit: 100,
            overrideAccess: true,
        })

        const executed: Array<{ jobId: string; workflowId: string; executionId?: string; status: string; error?: string }> = []

        for (const job of jobsRes.docs as any[]) {
            const nextRunAt = job.nextRunAt ? new Date(job.nextRunAt) : null
            const isDue = !nextRunAt || nextRunAt.getTime() <= now.getTime()
            if (!isDue) continue

            const wfId = typeof job.workflow === 'object' ? String(job.workflow?.id) : String(job.workflow || '')
            if (!wfId) continue

            let executionId: string | undefined
            let runStatus = 'COMPLETED'
            let errMsg: string | undefined

            try {
                executionId = await executeWorkflow({
                    workflowId: wfId,
                    trigger: 'CRON',
                    inputData: job.inputData || {},
                    scheduledJobId: String(job.id),
                })
            } catch (e: any) {
                runStatus = 'FAILED'
                errMsg = e.message
            }

            const runCount = Number(job.runCount || 0) + 1
            let nextStatus = job.status
            if (job.type === 'ONE_TIME' || (job.maxRuns && runCount >= job.maxRuns)) {
                nextStatus = 'COMPLETED'
            }

            let computedNext: string | undefined
            if (nextStatus === 'ACTIVE') {
                try {
                    if (job.type === 'CRON' && job.cronExpression) {
                        const parseFn = (parser as any).parseExpression || (parser as any).CronExpressionParser?.parse
                        if (parseFn) {
                            computedNext = parseFn(job.cronExpression).next().toDate().toISOString()
                        }
                    } else if (job.type === 'INTERVAL' && job.intervalMs) {
                        computedNext = new Date(Date.now() + Number(job.intervalMs)).toISOString()
                    }
                } catch {}
            }

            await payload
                .update({
                    collection: 'scheduled-jobs',
                    id: job.id,
                    overrideAccess: true,
                    data: {
                        runCount,
                        status: nextStatus,
                        lastRunAt: now.toISOString(),
                        lastRunStatus: runStatus,
                        ...(computedNext ? { nextRunAt: computedNext } : {}),
                    },
                })
                .catch(() => {})

            executed.push({ jobId: String(job.id), workflowId: wfId, executionId, status: runStatus, error: errMsg })
        }

        return NextResponse.json({
            success: true,
            checkedJobs: jobsRes.docs.length,
            executedCount: executed.length,
            executed,
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Cron tick failed' }, { status: 500 })
    }
}
