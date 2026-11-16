import { getDb } from '@/lib/copteller/db'
import { NextResponse } from 'next/server'
import { createCoptellerServerClient } from '@/lib/copteller/supabase/server'
export async function GET(req: Request) {
    try {
        const supabase = await createCoptellerServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const payload = await getDb()

        // Fetch loans from Payload CMS
        const result = await payload.find({
            collection: 'loans',
            limit: 100,
            sort: '-createdAt',
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, loans: result.docs })
    } catch (error: any) {
        console.error('Fetch admin loans error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = await createCoptellerServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const { loan_id, status } = body

        if (!loan_id || !status) {
            return NextResponse.json({ error: 'loan_id and status are required' }, { status: 400 })
        }

        const payload = await getDb()

        const updated = await payload.update({
            collection: 'loans',
            id: loan_id,
            data: {
                status,
                disbursed_at: status === 'active' ? new Date().toISOString() : undefined,
            },
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, loan: updated })
    } catch (error: any) {
        console.error('Update loan error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
