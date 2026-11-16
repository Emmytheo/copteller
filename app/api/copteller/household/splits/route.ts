import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool, queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/household/splits
 * Returns all active and completed household/shared bill splits for the user.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        // Fetch splits created by user
        const splitsRes = await queryCopteller(`
            SELECT 
                s.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', m.id,
                            'name', m.name,
                            'phoneNumber', m.phone_number,
                            'shareAmount', m.share_amount,
                            'paidAmount', m.paid_amount,
                            'status', m.status,
                            'paidAt', m.paid_at
                        ) ORDER BY m.id ASC
                    ) FILTER (WHERE m.id IS NOT NULL), '[]'
                ) as members
            FROM copteller.household_splits s
            LEFT JOIN copteller.household_split_members m ON m.split_id = s.id
            WHERE s.creator_id = $1
            GROUP BY s.id
            ORDER BY s.created_at DESC
        `, [auth.userId])

        return NextResponse.json({
            success: true,
            splits: splitsRes.rows
        })
    } catch (err: any) {
        console.error('[Household Splits GET Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/household/splits
 * Creates a new split bill for compound expenses, utility shares, or family contributions
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const {
            title,
            totalAmount,
            splitType = 'equal', // 'equal' | 'custom'
            notes = '',
            members = [] // [{ name: string, phoneNumber?: string, shareAmount?: number }]
        } = body

        if (!title || !title.trim()) {
            return NextResponse.json({ error: 'Split bill title is required (e.g. "Estate Security Levy", "Compound Fuel")' }, { status: 400 })
        }

        const totalNum = Number(totalAmount)
        if (!totalNum || totalNum <= 0) {
            return NextResponse.json({ error: 'Valid total bill amount is required.' }, { status: 400 })
        }

        if (!Array.isArray(members) || members.length === 0) {
            return NextResponse.json({ error: 'At least one participant is required in the split.' }, { status: 400 })
        }

        const pool = getCoptellerPool()
        const client = await pool.connect()

        try {
            await client.query('BEGIN')

            // Insert split
            const splitRes = await client.query(`
                INSERT INTO copteller.household_splits (
                    creator_id, title, total_amount, split_type, status, notes
                ) VALUES ($1, $2, $3, $4, 'active', $5)
                RETURNING *
            `, [auth.userId, title.trim(), totalNum, splitType, notes])

            const split = splitRes.rows[0]

            // Calculate share per member if equal split
            const perPersonShare = splitType === 'equal' 
                ? Math.round((totalNum / members.length) * 100) / 100 
                : 0

            // Insert members
            for (const m of members) {
                const share = splitType === 'equal' ? perPersonShare : (Number(m.shareAmount) || perPersonShare)
                await client.query(`
                    INSERT INTO copteller.household_split_members (
                        split_id, name, phone_number, share_amount, status
                    ) VALUES ($1, $2, $3, $4, 'pending')
                `, [split.id, m.name.trim(), m.phoneNumber || null, share])
            }

            await client.query('COMMIT')

            return NextResponse.json({
                success: true,
                message: `Bill split "${title.trim()}" created successfully with ${members.length} members!`,
                splitId: split.id
            })
        } catch (txErr) {
            await client.query('ROLLBACK')
            throw txErr
        } finally {
            client.release()
        }
    } catch (err: any) {
        console.error('[Household Splits POST Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
