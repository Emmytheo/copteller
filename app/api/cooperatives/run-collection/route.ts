import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool } from '@/lib/copteller/pg'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function POST(req: NextRequest) {
    try {
        // Authenticate via Copteller auth first, then fallback to standard Abia MFB bank auth
        let authenticatedUserId: string | null = null
        try {
            const coptellerAuth = await getCoptellerAuth(req)
            if (!(coptellerAuth instanceof NextResponse)) {
                authenticatedUserId = coptellerAuth.userId
            }
        } catch {
            // fallback
        }

        if (!authenticatedUserId) {
            const supabase = await createServerSupabase()
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (!authError && user) {
                authenticatedUserId = user.id
            }
        }

        if (!authenticatedUserId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const payload = await getPayload({ config: configPromise })

        // 1. Fetch active esusu cycles
        const cyclesRes = await payload.find({
            collection: 'esusu-cycles',
            where: {
                status: { equals: 'active' },
            },
            limit: 10,
            overrideAccess: true,
        })

        const activeCycles = cyclesRes.docs
        const summary: any[] = []

        for (const cycle of activeCycles) {
            // Find holding vault account
            let vaultAccountId = typeof cycle.holding_vault_account === 'object' && cycle.holding_vault_account
                ? cycle.holding_vault_account.id
                : cycle.holding_vault_account;

            if (!vaultAccountId) {
                // Find fallback/default admin account
                const adminAccs = await payload.find({
                    collection: 'accounts',
                    where: { account_type: { equals: 'Corporate' } },
                    limit: 1,
                    overrideAccess: true,
                })
                if (adminAccs.docs.length > 0) {
                    vaultAccountId = adminAccs.docs[0].id
                } else {
                    console.warn(`[Esusu Cycle ${cycle.id}] No vault account or corporate account found. Skipping.`)
                    continue
                }
            }

            // Fetch members in cycle
            const membersRes = await payload.find({
                collection: 'esusu-members',
                where: {
                    cycle: { equals: cycle.id },
                    status: { equals: 'active' },
                },
                limit: 100,
                overrideAccess: true,
            })
            const members = membersRes.docs

            if (members.length === 0) continue

            const contributionAmount = cycle.contribution_amount
            let poolCollected = 0
            const successfulMembers: string[] = []

            // Debit members
            for (const member of members) {
                const memberUserId = member.user_id
                const memberCustomer = typeof member.customer === 'object' && member.customer ? member.customer.id : member.customer

                // Find primary savings account for member
                const accountRes = await payload.find({
                    collection: 'accounts',
                    where: {
                        user_id: { equals: memberUserId },
                        status: { equals: 'active' },
                    },
                    limit: 1,
                    overrideAccess: true,
                })

                const memberAccount = accountRes.docs[0]

                if (memberAccount && memberAccount.balance >= contributionAmount) {
                    // Perform transaction debit
                    const updatedBal = memberAccount.balance - contributionAmount
                    await payload.update({
                        collection: 'accounts',
                        id: memberAccount.id,
                        data: { balance: updatedBal },
                        overrideAccess: true,
                    })

                    // Increment vault account balance
                    const vaultAccount = await payload.findByID({
                        collection: 'accounts',
                        id: vaultAccountId,
                        overrideAccess: true,
                    })
                    const vaultBal = (vaultAccount.balance || 0) + contributionAmount
                    await payload.update({
                        collection: 'accounts',
                        id: vaultAccountId,
                        data: { balance: vaultBal },
                        overrideAccess: true,
                    })

                    // Create debit transaction log
                    const refDebit = `TX_AJO_DR_${Math.random().toString(36).substring(2, 12).toUpperCase()}`
                    await payload.create({
                        collection: 'transactions',
                        data: {
                            reference: refDebit,
                            type: 'debit',
                            amount: contributionAmount,
                            from_account: memberAccount.id,
                            to_account: vaultAccountId,
                            status: 'successful',
                            narration: `Ajo Cycle Contribution: ${cycle.name}`,
                            user_id: memberUserId,
                            customer: memberCustomer,
                            balance_after: updatedBal,
                        },
                        overrideAccess: true,
                    })

                    // Create esusu-contributions record
                    await payload.create({
                        collection: 'esusu-contributions',
                        data: {
                            cycle: cycle.id,
                            member: member.id,
                            customer: memberCustomer,
                            user_id: memberUserId,
                            amount: contributionAmount,
                            status: 'paid',
                        },
                        overrideAccess: true,
                    })

                    poolCollected += contributionAmount
                    successfulMembers.push(memberUserId)
                } else {
                    // Record Delinquency contribution
                    await payload.create({
                        collection: 'esusu-contributions',
                        data: {
                            cycle: cycle.id,
                            member: member.id,
                            customer: memberCustomer,
                            user_id: memberUserId,
                            amount: contributionAmount,
                            status: 'delinquent',
                        },
                        overrideAccess: true,
                    })
                }
            }

            // Payout Pool to recipient
            const currentPayoutIndex = cycle.current_payout_index ?? 0
            const recipientMember = members.find(m => m.payout_order_index === currentPayoutIndex)

            let payoutDistributed = false
            let payoutAmount = 0
            let recipientName = 'Unknown Recipient'

            if (recipientMember && poolCollected > 0) {
                const recipientUserId = recipientMember.user_id
                const recipientCustomer = typeof recipientMember.customer === 'object' && recipientMember.customer ? recipientMember.customer : null
                const recipientCustomerId = recipientCustomer ? recipientCustomer.id : recipientMember.customer
                recipientName = recipientCustomer ? `${recipientCustomer.firstName || ''} ${recipientCustomer.lastName || ''}`.trim() : 'Cooperative Operator'

                // Find recipient savings account
                const repAccRes = await payload.find({
                    collection: 'accounts',
                    where: {
                        user_id: { equals: recipientUserId },
                        status: { equals: 'active' },
                    },
                    limit: 1,
                    overrideAccess: true,
                })

                const recipientAccount = repAccRes.docs[0]
                if (recipientAccount) {
                    const platformFeePercent = cycle.platform_fee_percent ?? 1
                    const platformFee = Math.floor((poolCollected * platformFeePercent) / 100)
                    payoutAmount = poolCollected - platformFee

                    // Credit recipient
                    const newRecipientBal = recipientAccount.balance + payoutAmount
                    await payload.update({
                        collection: 'accounts',
                        id: recipientAccount.id,
                        data: { balance: newRecipientBal },
                        overrideAccess: true,
                    })

                    // Debit vault account
                    const vaultAccount = await payload.findByID({
                        collection: 'accounts',
                        id: vaultAccountId,
                        overrideAccess: true,
                    })
                    const vaultBal = Math.max(0, vaultAccount.balance - poolCollected)
                    await payload.update({
                        collection: 'accounts',
                        id: vaultAccountId,
                        data: { balance: vaultBal },
                        overrideAccess: true,
                    })

                    // Create payout transaction log
                    const refPayout = `TX_AJO_PY_${Math.random().toString(36).substring(2, 12).toUpperCase()}`
                    await payload.create({
                        collection: 'transactions',
                        data: {
                            reference: refPayout,
                            type: 'credit',
                            amount: payoutAmount,
                            from_account: vaultAccountId,
                            to_account: recipientAccount.id,
                            status: 'successful',
                            narration: `Ajo Cycle Payout: Slot ${currentPayoutIndex + 1} of ${cycle.name}`,
                            user_id: recipientUserId,
                            customer: recipientCustomerId,
                            balance_after: newRecipientBal,
                        },
                        overrideAccess: true,
                    })

                    // Create esusu-payouts record
                    await payload.create({
                        collection: 'esusu-payouts',
                        data: {
                            cycle: cycle.id,
                            recipient_member: recipientMember.id,
                            customer: recipientCustomerId,
                            user_id: recipientUserId,
                            amount: payoutAmount,
                            status: 'completed',
                        },
                        overrideAccess: true,
                    })

                    payoutDistributed = true
                }
            }

            // Increment current payout index
            const nextPayoutIndex = (currentPayoutIndex + 1) % (cycle.total_slots || members.length)
            await payload.update({
                collection: 'esusu-cycles',
                id: cycle.id,
                data: {
                    current_payout_index: nextPayoutIndex,
                },
                overrideAccess: true,
            })

            summary.push({
                cycleId: cycle.id,
                cycleName: cycle.name,
                collected: poolCollected,
                payoutTo: recipientName,
                payoutAmount: payoutAmount,
                success: payoutDistributed,
            })
        }

        // Record immutable collection execution in copteller_audit_logs & process active HP/Ajo contracts
        try {
            const pool = getCoptellerPool()

            // Also process active Copteller HP / Lease contracts
            const contractsRes = await pool.query(`
                SELECT cc.id, cc.asset_name, cc.weekly_due_amount, cc.due_amount, cc.total_paid, cc.total_obligation, cc.member,
                       a.id as account_id, a.balance as account_balance, c.id as customer_id, c.first_name, c.last_name
                FROM copteller.copteller_contracts cc
                LEFT JOIN copteller.customers c ON (c.id::text = cc.member OR c.supabase_id = cc.member)
                LEFT JOIN copteller.accounts a ON (a.customer_id = c.id OR a.user_id = cc.member) AND a.status = 'active'
                WHERE cc.status = 'active'
                LIMIT 50
            `).catch(() => ({ rows: [] as any[] }))

            for (const contract of contractsRes.rows) {
                const dueNaira = Number(contract.weekly_due_amount || contract.due_amount || 18000)
                const dueKobo = dueNaira > 100000 ? dueNaira : Math.round(dueNaira * 100)
                const balKobo = Number(contract.account_balance || 0)
                if (contract.account_id && balKobo >= dueKobo) {
                    const newBal = balKobo - dueKobo
                    await pool.query(`UPDATE copteller.accounts SET balance = $1, updated_at = NOW() WHERE id = $2`, [newBal, contract.account_id])
                    await pool.query(`UPDATE copteller.copteller_contracts SET total_paid = COALESCE(total_paid, 0) + $1, updated_at = NOW() WHERE id = $2`, [dueNaira, contract.id])
                    const txRef = `TX_CLR_${Date.now()}_${contract.id}`
                    await pool.query(`
                        INSERT INTO copteller.transactions (reference, type, amount, from_account_id, status, narration, customer_id, balance_after, created_at, updated_at)
                        VALUES ($1, 'debit', $2, $3, 'successful', $4, $5, $6, NOW(), NOW())
                    `, [txRef, dueKobo, contract.account_id, `Weekly Clearing Deduction: ${contract.asset_name || 'Cooperative Contract'}`, contract.customer_id || null, newBal])
                    summary.push({
                        contractId: contract.id,
                        cycleName: contract.asset_name || 'HP Lease Contract',
                        collected: dueKobo,
                        payoutTo: `${contract.first_name || ''} ${contract.last_name || ''}`.trim() || 'Cooperative Vault',
                        payoutAmount: dueKobo,
                        success: true,
                    })
                }
            }

            await pool.query(`
                INSERT INTO copteller.copteller_audit_logs (
                    actor_id, actor_role, actor_name, action, entity_type, entity_id,
                    metadata, created_at, updated_at
                ) VALUES (
                    $1, 'admin', 'Automated Collections Engine', 'ESUSU_CYCLE_COLLECTION_BATCH', 'ESUSU_CYCLE', 'BATCH',
                    $2, NOW(), NOW()
                )
            `, [authenticatedUserId, JSON.stringify({ summary, cyclesProcessed: summary.length })])
        } catch (logErr) {
            console.warn('[Run Collection] Audit log error (non-fatal):', logErr)
        }

        return NextResponse.json({ success: true, summary })
    } catch (error: any) {
        console.error('Run collection error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
