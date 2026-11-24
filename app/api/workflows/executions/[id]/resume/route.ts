import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { resumeWorkflowExecution } from '@/lib/workflow/executeWorkflow'

/**
 * POST /api/workflows/executions/[id]/resume
 * Approves or rejects a workflow execution paused at an APPROVAL_GATE node.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff', 'coop_admin'])
    if (auth instanceof NextResponse) return auth

    try {
        const { id } = await params
        const body = await req.json().catch(() => ({}))
        const decision = String(body.decision || '').toUpperCase()
        if (decision !== 'APPROVED' && decision !== 'REJECTED') {
            return NextResponse.json({ error: 'decision must be APPROVED or REJECTED' }, { status: 400 })
        }

        const result = await resumeWorkflowExecution({
            executionId: id,
            decision,
            notes: body.notes ? String(body.notes) : undefined,
            decidedByUserId: auth.userId,
        })

        return NextResponse.json({ success: true, ...result })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to resume execution' }, { status: 500 })
    }
}
