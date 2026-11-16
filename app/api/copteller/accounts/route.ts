import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'

export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const payload = await getDb()

        // 1. Cooperative Admin Persona: Include the Cooperative's Treasury & Collection Accounts
        if (auth.role === 'coop_admin') {
            const coopAccounts: any[] = []
            
            // Find official collection account for this cooperative
            const treasuryRes = await payload.find({
                collection: 'accounts',
                where: {
                    or: [
                        { account_number: { equals: '9998887776' } },
                        ...(auth.cooperativeId ? [{ user_id: { equals: `system-coop-${auth.cooperativeId}` } }] : [])
                    ]
                },
                limit: 10,
                overrideAccess: true,
            })

            if (treasuryRes.docs.length > 0) {
                treasuryRes.docs.forEach((doc: any) => {
                    coopAccounts.push({
                        ...doc,
                        account_type: 'Cooperative Treasury & Collections',
                        is_primary: true,
                    })
                })
            }

            // Also retrieve admin personal account
            const personalRes = await payload.find({
                collection: 'accounts',
                where: { user_id: { equals: auth.userId } },
                limit: 10,
                overrideAccess: true,
            })
            personalRes.docs.forEach((doc: any) => {
                if (!coopAccounts.some(a => a.id === doc.id)) {
                    coopAccounts.push(doc)
                }
            })

            return NextResponse.json({ success: true, accounts: coopAccounts })
        }

        // 2. Member Persona: Retrieve accounts directly matching user_id or customer
        try {
            const { queryCopteller } = await import('@/lib/copteller/pg')
            const accRes = await queryCopteller(`
                SELECT a.* 
                FROM copteller.accounts a
                LEFT JOIN copteller.customers c ON a.customer_id = c.id
                WHERE a.user_id = $1 
                   OR c.supabase_id = $1 
                   OR (c.email IS NOT NULL AND LOWER(c.email) = LOWER($2))
                ORDER BY a.is_primary DESC, a.created_at DESC
                LIMIT 50
            `, [auth.userId, auth.email || ''])

            if (accRes.rows.length > 0) {
                return NextResponse.json({ success: true, accounts: accRes.rows })
            }
        } catch (err: any) {
            console.warn('[Accounts Route] Direct SQL query fallback:', err.message)
        }

        let result = await payload.find({
            collection: 'accounts',
            where: {
                user_id: { equals: auth.userId }
            },
            limit: 50,
            sort: '-createdAt',
            overrideAccess: true,
        })

        // 3. If no account found by user_id, check customer record
        if (result.docs.length === 0) {
            const customerRes = await payload.find({
                collection: 'customers',
                where: {
                    or: [
                        { supabase_id: { equals: auth.userId } },
                        ...(auth.email ? [{ email: { equals: auth.email.toLowerCase().trim() } }] : [])
                    ]
                },
                limit: 1,
                overrideAccess: true,
            })

            let customerId = customerRes.docs[0]?.id

            if (customerId) {
                // Check if customer has accounts
                const custAccounts = await payload.find({
                    collection: 'accounts',
                    where: { customer: { equals: customerId } },
                    limit: 50,
                    sort: '-createdAt',
                    overrideAccess: true,
                })

                if (custAccounts.docs.length > 0) {
                    // Backfill user_id on these accounts
                    for (const acc of custAccounts.docs) {
                        if (!acc.user_id || acc.user_id.startsWith('SUP_')) {
                            await payload.update({
                                collection: 'accounts',
                                id: acc.id,
                                data: { user_id: auth.userId },
                                overrideAccess: true,
                            }).catch(() => null)
                        }
                    }
                    result = custAccounts
                }
            }

            // 4. If still no account, auto-provision a primary Savings account for this authenticated member
            if (result.docs.length === 0) {
                if (!customerId) {
                    const newCust = await payload.create({
                        collection: 'customers',
                        data: {
                            firstName: auth.displayName?.split(' ')[0] || 'Member',
                            lastName: auth.displayName?.split(' ').slice(1).join(' ') || '',
                            email: auth.email || `${auth.userId.slice(0, 8)}@copteller.internal`,
                            supabase_id: auth.userId,
                            is_associated: true,
                            phone_number: '08000000000',
                            kyc_status: 'active',
                            onboarding_status: 'completed',
                        },
                        overrideAccess: true,
                    })
                    customerId = newCust.id
                }

                const newAccountNum = Math.floor(1000000000 + Math.random() * 9000000000).toString()
                const newAcc = await payload.create({
                    collection: 'accounts',
                    data: {
                        customer: customerId,
                        user_id: auth.userId,
                        account_number: newAccountNum,
                        account_type: 'Savings',
                        balance: 0,
                        currency: 'NGN',
                        source: 'local',
                        is_primary: true,
                        status: 'active',
                    },
                    overrideAccess: true,
                })

                return NextResponse.json({ success: true, accounts: [newAcc] })
            }
        }

        return NextResponse.json({ success: true, accounts: result.docs })
    } catch (error: any) {
        console.error('Fetch accounts error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
