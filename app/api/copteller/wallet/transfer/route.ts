import { getDb, writeAuditLog } from '@/lib/copteller/db'
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
        const rawAmount = Number(body.amount_naira ?? body.amount)
        const destination = body.destination_account_number ?? body.recipient ?? body.destination
        const narration = body.narration || 'Member Inter-cooperative Transfer'

        if (!Number.isFinite(rawAmount) || rawAmount <= 0 || rawAmount > 100000000 || !destination) {
            return NextResponse.json({ error: 'valid amount and destination are required fields' }, { status: 400 })
        }

        const amount_naira = rawAmount
        const destination_account_number = String(destination).trim()
        const amountKobo = Math.round(amount_naira * 100)
        const payload = await getDb()

        // 1. Find customer associated with user
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
        const customerId = customerResult.docs[0]?.id || null

        // 2. Find source account
        const sourceAccRes = await payload.find({
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

        const sourceAccount = sourceAccRes.docs[0]
        if (!sourceAccount) {
            return NextResponse.json({ error: 'Primary active source account not found' }, { status: 404 })
        }

        if (Number(sourceAccount.balance || 0) < amountKobo) {
            return NextResponse.json({
                error: `Insufficient balance. Available: ₦${((sourceAccount.balance || 0) / 100).toLocaleString()}, Required: ₦${Number(amount_naira).toLocaleString()}`
            }, { status: 400 })
        }

        // 3. Find destination account
        const destAccRes = await payload.find({
            collection: 'accounts',
            where: {
                account_number: { equals: String(destination_account_number).trim() },
            },
            limit: 1,
            overrideAccess: true,
        })

        const destAccount = destAccRes.docs[0]

        // 4. Debit source account
        const updatedSourceBal = Number(sourceAccount.balance || 0) - amountKobo
        await payload.update({
            collection: 'accounts',
            id: sourceAccount.id,
            data: {
                balance: updatedSourceBal,
                user_id: user.id,
                last_transaction_at: new Date().toISOString()
            },
            overrideAccess: true,
        })

        // Create debit transaction log
        const refDebit = `TX_TRF_DR_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`
        await payload.create({
            collection: 'transactions',
            data: {
                reference: refDebit,
                type: 'debit',
                amount: amountKobo,
                from_account: sourceAccount.id,
                to_account: destAccount ? destAccount.id : undefined,
                status: 'successful',
                narration: narration || `Transfer to ${destination_account_number}`,
                user_id: user.id,
                customer: customerId,
                balance_after: updatedSourceBal,
            },
            overrideAccess: true,
        })

        // 5. Credit destination account if it is a registered local account in MFB system
        if (destAccount) {
            const updatedDestBal = Number(destAccount.balance || 0) + amountKobo
            await payload.update({
                collection: 'accounts',
                id: destAccount.id,
                data: {
                    balance: updatedDestBal,
                    last_transaction_at: new Date().toISOString()
                },
                overrideAccess: true,
            })

            // Find destination customer
            const destCustomerResult = await payload.find({
                collection: 'customers',
                where: {
                    or: [
                        { id: { equals: typeof destAccount.customer === 'object' ? destAccount.customer?.id : destAccount.customer } },
                        { supabase_id: { equals: destAccount.user_id } }
                    ]
                },
                limit: 1,
                overrideAccess: true,
            })
            const destCustomerId = destCustomerResult.docs[0]?.id || null

            // Create credit transaction log for destination
            const refCredit = `TX_TRF_CR_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`
            await payload.create({
                collection: 'transactions',
                data: {
                    reference: refCredit,
                    type: 'credit',
                    amount: amountKobo,
                    from_account: sourceAccount.id,
                    to_account: destAccount.id,
                    status: 'successful',
                    narration: `Inward Transfer from ${sourceAccount.account_number} (${user.user_metadata?.full_name || 'Member'})`,
                    user_id: destAccount.user_id,
                    customer: destCustomerId,
                    balance_after: updatedDestBal,
                },
                overrideAccess: true,
            })
        }

        // 6. If this was a cooperative dues / levy settlement (collections account 9998887776 or specified in narration)
        const isDuesPayment = destination_account_number === '9998887776' || (narration && narration.toLowerCase().includes('due'))
        if (isDuesPayment && customerId) {
            try {
                // Find member's active cooperative membership
                const memRes = await payload.find({
                    collection: 'copteller-memberships',
                    where: { member: { equals: customerId } },
                    limit: 1,
                    overrideAccess: true,
                })

                if (memRes.docs.length > 0) {
                    const mem = memRes.docs[0]
                    const currentContributed = Number(mem.total_contributed || 0)
                    const currentOutstanding = Number(mem.outstanding_balance || 0)

                    await payload.update({
                        collection: 'copteller-memberships',
                        id: mem.id,
                        data: {
                            total_contributed: currentContributed + amountKobo,
                            outstanding_balance: Math.max(0, currentOutstanding - amountKobo),
                        },
                        overrideAccess: true,
                    })

                    await writeAuditLog({
                        actor_id: user.id,
                        actor_role: 'member',
                        actor_name: user.user_metadata?.full_name || user.email,
                        action: 'member.paid_dues',
                        entity_type: 'membership',
                        entity_id: String(mem.id),
                        amount_kobo: amountKobo,
                        cooperative: typeof mem.cooperative === 'object' ? mem.cooperative?.id : mem.cooperative,
                        metadata: { reference: refDebit, destination_account: destination_account_number }
                    })
                }
            } catch (err) {
                console.warn('[Wallet Transfer] Failed to update dues membership stats:', err)
            }
        }

        return NextResponse.json({
            success: true,
            balance: updatedSourceBal,
            reference: refDebit,
            amount: amountKobo,
            destination: destination_account_number
        })
    } catch (error: any) {
        console.error('Wallet transfer error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
