import { NextResponse } from 'next/server'
import { getCoptellerPool } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const pool = getCoptellerPool()
        await pool.query('SELECT 1')
        return NextResponse.json({
            ok: true,
            service: 'copteller',
            db: 'connected',
            timestamp: new Date().toISOString(),
        })
    } catch {
        return NextResponse.json(
            {
                ok: false,
                service: 'copteller',
                db: 'unavailable',
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        )
    }
}
