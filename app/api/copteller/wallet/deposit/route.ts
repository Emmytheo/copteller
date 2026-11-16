import { getDb } from '@/lib/copteller/db'
import { NextResponse } from 'next/server'
import { createCoptellerServerClient } from '@/lib/copteller/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = await createCoptellerServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const rawAmount = body.amount_naira ?? body.amount

        if (!rawAmount || Number(rawAmount) <= 0) {
            return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
        }

        const amountKobo = Math.round(Number(rawAmount) * 100)
        const payload = await getDb()

        // 1. Find or resolve customer associated with user
        const customerResult = await payload.find({
            collection: 'customers',
            where: {
                or: [
                    { supabase_id: { equals: user.id } },
                    ...(user.email ? [{ email: { equals: user.email.toLowerCase().trim() } }] : [])
                ]
            },
            limit: 1,
            overrideAccess: true,
        })

        let customerId = customerResult.docs[0]?.id

        if (!customerId) {
            const newCust = await payload.create({
                collection: 'customers',
                data: {
                    firstName: user.user_metadata?.full_name?.split(' ')[0] || user.user_metadata?.first_name || 'Member',
                    lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || user.user_metadata?.last_name || '',
                    email: user.email || `${user.id.slice(0, 8)}@copteller.internal`,
                    supabase_id: user.id,
                    is_associated: true,
                    phone_number: user.phone || '08000000000',
                    kyc_status: 'active',
                    onboarding_status: 'completed',
                },
                overrideAccess: true,
            })
            customerId = newCust.id
        }

        // 2. Find primary active account
        let accountRes = await payload.find({
            collection: 'accounts',
            where: {
                or: [
                    { user_id: { equals: user.id } },
                    ...(customerId ? [{ customer: { equals: customerId } }] : [])
                ],
                status: { equals: 'active' },
            },
            limit: 1,
            overrideAccess: true,
        })

        let account = accountRes.docs[0]

        // Auto-provision if missing
        if (!account) {
            const newAccountNum = Math.floor(1000000000 + Math.random() * 9000000000).toString()
            account = await payload.create({
                collection: 'accounts',
                data: {
                    customer: customerId,
                    user_id: user.id,
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
        }

        // 3. Update balance atomically
        const currentBal = Number(account.balance || 0)
        const updatedBal = currentBal + amountKobo

        const updated = await payload.update({
            collection: 'accounts',
            id: account.id,
            data: {
                balance: updatedBal,
                user_id: user.id, // ensure user_id is synced
                last_transaction_at: new Date().toISOString(),
            },
            overrideAccess: true,
        })

        // 4. Create transaction log
        const ref = `TX_DEP_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`
        await payload.create({
            collection: 'transactions',
            data: {
                reference: ref,
                type: 'credit',
                amount: amountKobo,
                to_account: account.id,
                status: 'successful',
                narration: `Deposit of ₦${Number(rawAmount).toLocaleString()} to wallet via clearing`,
                user_id: user.id,
                customer: customerId,
                balance_after: updatedBal,
            },
            overrideAccess: true,
        })

        return NextResponse.json({
            success: true,
            balance: updated.balance,
            reference: ref,
            amount: amountKobo,
        })
    } catch (error: any) {
        console.error('Wallet deposit error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
