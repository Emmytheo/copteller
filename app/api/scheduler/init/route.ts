import { NextRequest, NextResponse } from 'next/server'
import { rescheduleAll } from '@/lib/workflow/scheduler/cronRunner'
import { requireCoptellerCronOrAdmin } from '@/lib/copteller/auth'

export async function POST(req: NextRequest) {
    const auth = await requireCoptellerCronOrAdmin(req)
    if (auth instanceof NextResponse) return auth

    try {
        await rescheduleAll()
        return NextResponse.json({ message: 'Scheduler initialized' })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
