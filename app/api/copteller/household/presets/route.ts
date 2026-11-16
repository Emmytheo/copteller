import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/household/presets
 * Returns saved utility and household presets for the user (meters, recurring numbers, smartcards)
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const res = await queryCopteller(`
            SELECT * FROM copteller.utility_presets
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [auth.userId])

        return NextResponse.json({
            success: true,
            presets: res.rows
        })
    } catch (err: any) {
        console.error('[Household Presets GET Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/household/presets
 * Saves a new utility preset
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const {
            title,
            serviceType, // 'electricity' | 'airtime' | 'data' | 'cable'
            provider,    // 'EEDC', 'AEDC', 'MTN', 'AIRTEL', 'DSTV', 'GOTV'
            identifier,  // meter number, phone number, smartcard number
            lastAmount = null
        } = body

        if (!title || !serviceType || !provider || !identifier) {
            return NextResponse.json({ error: 'Title, serviceType, provider, and identifier are required' }, { status: 400 })
        }

        const res = await queryCopteller(`
            INSERT INTO copteller.utility_presets (
                user_id, title, service_type, provider, identifier, last_amount
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            auth.userId,
            title.trim(),
            serviceType.toLowerCase().trim(),
            provider.toUpperCase().trim(),
            identifier.trim(),
            lastAmount ? Number(lastAmount) : null
        ])

        return NextResponse.json({
            success: true,
            preset: res.rows[0],
            message: `Preset "${title.trim()}" saved to quick pay!`
        })
    } catch (err: any) {
        console.error('[Household Presets POST Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
