import { NextRequest, NextResponse } from 'next/server'
import { executeWorkflow } from '@/lib/workflow/executeWorkflow'
import { requireCoptellerRole } from '@/lib/copteller/auth'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireCoptellerRole(request, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    try {
        const body = await request.json().catch(() => ({}))
        const { trigger = 'MANUAL', inputData = {} } = body

        const executionId = await executeWorkflow({
            workflowId: id,
            trigger,
            inputData,
        })

        return NextResponse.json({
            success: true,
            executionId,
            message: `Workflow execution started. ID: ${executionId}`,
        })
    } catch (error: any) {
        console.error(`[API] Workflow run failed for ${id}:`, error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to execute workflow',
            },
            { status: error.message?.includes('not published') ? 400 : 500 }
        )
    }
}
