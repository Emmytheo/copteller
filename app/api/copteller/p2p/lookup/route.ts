import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/p2p/lookup?query=...
 * Resolves a Copteller member or companion user by Phone Number, Copteller Handle, or 10-digit Account Number.
 * Returns safe public identification (full name, masked phone, account number) for confirmation before sending funds.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const { searchParams } = new URL(req.url)
        const query = searchParams.get('query')?.trim()

        if (!query || query.length < 3) {
            return NextResponse.json({ error: 'Please enter at least 3 characters to search.' }, { status: 400 })
        }

        const cleanQuery = query.replace(/^@/, '')

        // Normalize phone number (handle 080... or +234...)
        let normalizedPhone = cleanQuery.replace(/\s+/g, '')
        if (normalizedPhone.startsWith('+234')) {
            normalizedPhone = '0' + normalizedPhone.substring(4)
        }

        const res = await queryCopteller(`
            SELECT 
                c.id as customer_id,
                TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) as full_name,
                c.phone_number,
                c.email,
                a.id as account_id,
                a.account_number,
                a.status as account_status,
                a.user_id,
                (
                    SELECT coop.name 
                    FROM copteller.copteller_memberships m
                    JOIN copteller.cooperatives coop ON coop.id::text = m.cooperative::text
                    WHERE (m.member = c.id::text OR m.member = c.supabase_id) AND m.status = 'active'
                    LIMIT 1
                ) as cooperative_name
            FROM copteller.accounts a
            JOIN copteller.customers c ON c.id = a.customer_id
            WHERE a.status = 'active'
              AND (
                a.account_number = $1
                OR c.phone_number = $1
                OR c.phone_number = $2
                OR lower(c.email) = lower($1)
                OR lower(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''))) ILIKE $3
              )
            LIMIT 5
        `, [cleanQuery, normalizedPhone, `%${cleanQuery}%`])

        if (res.rows.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No active Copteller account found for this phone number or account.',
                matches: []
            }, { status: 404 })
        }

        // Format matches, hiding self or flagging self
        const matches = res.rows.map(row => {
            const isSelf = row.user_id === auth.userId
            const phone = row.phone_number || ''
            const maskedPhone = phone.length > 7
                ? phone.substring(0, 4) + '***' + phone.substring(phone.length - 4)
                : phone

            return {
                customerId: row.customer_id,
                accountId: row.account_id,
                accountNumber: row.account_number,
                fullName: row.full_name,
                maskedPhone,
                cooperativeName: row.cooperative_name || 'Individual / Companion User',
                isSelf
            }
        })

        return NextResponse.json({
            success: true,
            matches
        })
    } catch (err: any) {
        console.error('[P2P Lookup Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
