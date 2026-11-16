import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'

export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const userId = auth.userId

        try {
            const txRes = await queryCopteller(`
                SELECT t.* 
                FROM copteller.transactions t
                LEFT JOIN copteller.accounts a ON (t.from_account_id = a.id OR t.to_account_id = a.id)
                WHERE t.user_id = $1 
                   OR a.user_id = $1
                ORDER BY t.created_at DESC
                LIMIT 100
            `, [userId])

            if (txRes.rows.length > 0) {
                return NextResponse.json({ success: true, transactions: txRes.rows })
            }
        } catch (err: any) {
            console.warn('[Transactions Route] Direct SQL query fallback:', err.message)
        }

        const payload = await getDb()

        // 1. Find customer associated with user
        const customerResult = await payload.find({
            collection: 'customers',
            where: {
                or: [
                    { supabase_id: { equals: userId } },
                    ...(auth.email ? [{ email: { equals: auth.email.toLowerCase().trim() } }] : [])
                ]
            },
            limit: 1,
            overrideAccess: true,
        })
        const customerId = customerResult.docs[0]?.id

        // 2. Find user's accounts
        const accountsResult = await payload.find({
            collection: 'accounts',
            where: {
                or: [
                    { user_id: { equals: userId } },
                    ...(customerId ? [{ customer: { equals: customerId } }] : [])
                ]
            },
            limit: 20,
            overrideAccess: true,
        })
        const accountIds = accountsResult.docs.map((a: any) => a.id)

        // 3. Build comprehensive query conditions
        const orConditions: any[] = [
            { user_id: { equals: userId } }
        ]

        if (customerId) {
            orConditions.push({ customer: { equals: customerId } })
        }

        if (accountIds.length > 0) {
            orConditions.push({ from_account: { in: accountIds } })
            orConditions.push({ to_account: { in: accountIds } })
        }

        const result = await payload.find({
            collection: 'transactions',
            where: {
                or: orConditions
            },
            limit: 100,
            sort: '-createdAt',
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, transactions: result.docs })
    } catch (error: any) {
        console.error('Fetch transactions error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
