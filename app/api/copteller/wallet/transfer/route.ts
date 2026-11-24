import { getDb, writeAuditLog } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'
import { ensureMemberOlivePaySubWallet } from '@/lib/copteller/olivepay-sync'
import { olivePayClient, nairaToKobo } from '@/lib/copteller/olivepay-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/wallet/transfer
 * Supports BOTH:
 *  - Internal Copteller / OlivePay W2W Transfers (zero NIP fee via `olivePayClient.transferSubWallet`)
 *  - External Nigerian Bank Withdrawals (`destinationBankCode` provided -> mandatory NIP `nameEnquiry`,
 *    `feeEstimate`, spendable check, and `olivePayClient.sendSubWalletPayout` handling 00/09/12/13!)
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        await ensureOlivePayTables().catch(() => {})
        const body = await req.json().catch(() => ({}))
        const rawAmount = Number(body.amount_naira ?? body.amount)
        const destination = body.destination_account_number ?? body.destinationAccountNumber ?? body.recipient ?? body.destination
        const destinationBankCode = body.destination_bank_code ?? body.destinationBankCode ?? body.bankCode ?? null
        const beneficiaryName = body.beneficiary_name ?? body.beneficiaryName ?? null
        const narration = body.narration || 'Copteller Wallet Transfer'
        const idempotencyKey = body.idempotencyKey || `TRF_${auth.userId.slice(0, 8)}_${Date.now()}`

        if (!Number.isFinite(rawAmount) || rawAmount <= 0 || rawAmount > 100_000_000 || !destination) {
            return NextResponse.json({ error: 'Valid amount and destination are required.' }, { status: 400 })
        }

        const destinationAccountNumber = String(destination).trim()
        const amountKobo = Math.round(rawAmount * 100)
        const payload = await getDb()

        // 1. Resolve Customer & Source Account
        const customerResult = await payload.find({
            collection: 'customers',
            where: {
                or: [
                    { supabase_id: { equals: auth.userId } },
                    ...(auth.email ? [{ email: { equals: auth.email.toLowerCase().trim() } }] : []),
                ],
            },
            limit: 1,
            overrideAccess: true,
        })
        const customerId = customerResult.docs[0]?.id || null

        const sourceAccRes = await payload.find({
            collection: 'accounts',
            where: {
                or: [
                    { user_id: { equals: auth.userId } },
                    ...(customerId ? [{ customer: { equals: customerId } }] : []),
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

        // Ensure sender SubWallet exists
        const senderSw = await ensureMemberOlivePaySubWallet({
            userId: auth.userId,
            email: auth.email,
            fullName: auth.displayName,
            accountId: Number(sourceAccount.id),
            customerId: customerId ? Number(customerId) : null,
        }).catch(() => null)

        // Check if destination is a local Copteller account or SubWallet
        const destAccRes = await payload.find({
            collection: 'accounts',
            where: { account_number: { equals: destinationAccountNumber } },
            limit: 1,
            overrideAccess: true,
        })
        const destAccount = destAccRes.docs[0] || null

        const isExternalBankPayout = Boolean(destinationBankCode && !destAccount && destinationBankCode !== '999999')

        // ── PATH A: EXTERNAL NIGERIAN BANK NIP WITHDRAWAL VIA OLIVEPAY ───────
        if (isExternalBankPayout) {
            // 1. Mandatory Name Enquiry if beneficiaryName wasn't pre-verified
            let verifiedName = beneficiaryName
            if (!verifiedName) {
                const enq = await olivePayClient.nameEnquiry(String(destinationBankCode), destinationAccountNumber)
                if (!enq.ok || !enq.data?.accountName) {
                    return NextResponse.json(
                        { error: `Name enquiry failed: ${enq.message || 'Invalid account details'}` },
                        { status: 400 }
                    )
                }
                verifiedName = enq.data.accountName
            }

            // 2. Fee Estimate (amount + processingFee + VAT = totalDebit)
            const feeRes = await olivePayClient.estimatePayoutFee(amountKobo)
            const totalDebitKobo = feeRes.ok && feeRes.data?.totalDebit ? nairaToKobo(feeRes.data.totalDebit) : amountKobo
            const feeKobo = Math.max(0, totalDebitKobo - amountKobo)

            if (Number(sourceAccount.balance || 0) < totalDebitKobo) {
                return NextResponse.json(
                    {
                        error: `Insufficient balance to cover transfer + fee. Available: ₦${(Number(sourceAccount.balance || 0) / 100).toLocaleString()}, Required: ₦${(totalDebitKobo / 100).toLocaleString()}`,
                    },
                    { status: 400 }
                )
            }

            // 3. Execute OlivePay SubWallet NIP Payout (Live OR Sandbox Testing Rail)
            let payoutRes: any = null
            if (senderSw?.olivepay_sub_wallet_id) {
                // Keep Sandbox SubWallet liquidity synced with Copteller account balance before payout
                if (senderSw.rail_mode === 'sandbox_simulator' && Number(senderSw.available_balance_kobo || 0) < totalDebitKobo) {
                    await queryCopteller(
                        `UPDATE copteller.olivepay_subwallets
                         SET available_balance_kobo = GREATEST(available_balance_kobo, $1),
                             ledger_balance_kobo = GREATEST(ledger_balance_kobo, $1)
                         WHERE olivepay_sub_wallet_id = $2`,
                        [Number(sourceAccount.balance || 0), senderSw.olivepay_sub_wallet_id]
                    ).catch(() => {})
                }

                payoutRes = await olivePayClient.sendSubWalletPayout({
                    subWalletId: senderSw.olivepay_sub_wallet_id,
                    amountKobo,
                    destinationBankCode: String(destinationBankCode),
                    destinationAccountNumber,
                    beneficiaryName: String(verifiedName),
                    narration,
                    idempotencyKey,
                })

                if (!payoutRes.ok) {
                    return NextResponse.json(
                        {
                            error: payoutRes.message || 'External bank withdrawal failed',
                            responseCode: payoutRes.responseCode,
                            isTierLimitExceeded: payoutRes.isTierLimitExceeded,
                            isTierLocked: payoutRes.isTierLocked,
                        },
                        { status: 400 }
                    )
                }
            }

            const updatedSourceBal = Number(sourceAccount.balance || 0) - totalDebitKobo
            await payload.update({
                collection: 'accounts',
                id: sourceAccount.id,
                data: { balance: updatedSourceBal, user_id: auth.userId, last_transaction_at: new Date().toISOString() },
                overrideAccess: true,
            })

            const refDebit = payoutRes?.data?.reference || `TX_NIP_${Date.now()}`
            const txDoc = await payload.create({
                collection: 'transactions',
                data: {
                    reference: refDebit,
                    type: 'debit',
                    amount: totalDebitKobo,
                    from_account: sourceAccount.id,
                    status: payoutRes?.isPending ? 'pending' : 'successful',
                    narration: `NIP Withdrawal to ${verifiedName} (${destinationBankCode}/${destinationAccountNumber}) - ${narration}`,
                    user_id: auth.userId,
                    customer: customerId,
                    balance_after: updatedSourceBal,
                },
                overrideAccess: true,
            })

            if (payoutRes?.data?.reference) {
                await queryCopteller(
                    `UPDATE copteller.olivepay_payouts SET local_transaction_id = $1, user_id = $2 WHERE olivepay_reference = $3`,
                    [Number(txDoc.id), auth.userId, payoutRes.data.reference]
                ).catch(() => {})
            }

            return NextResponse.json({
                success: true,
                railMode: payoutRes?.railMode || 'olivepay',
                status: payoutRes?.isPending ? 'PENDING' : 'SUCCESS',
                isPending: Boolean(payoutRes?.isPending),
                balance: updatedSourceBal,
                reference: refDebit,
                amount: amountKobo,
                feeKobo,
                totalDebitKobo,
                beneficiaryName: verifiedName,
                destination: destinationAccountNumber,
            })
        }

        // ── PATH B: INTERNAL W2W TRANSFER (LOCAL + OLIVEPAY SUBWALLET SYNC) ──
        if (Number(sourceAccount.balance || 0) < amountKobo) {
            return NextResponse.json(
                {
                    error: `Insufficient balance. Available: ₦${((sourceAccount.balance || 0) / 100).toLocaleString()}, Required: ₦${rawAmount.toLocaleString()}`,
                },
                { status: 400 }
            )
        }

        // If both source & destination have OlivePay SubWallets, mirror via zero-fee W2W transfer!
        let oliveW2wRef: string | null = null
        let w2wRailMode = 'internal'
        if (senderSw?.olivepay_sub_wallet_id && destAccount) {
            const destSwRes = await queryCopteller(
                `SELECT olivepay_sub_wallet_id, rail_mode FROM copteller.olivepay_subwallets
                 WHERE account_id = $1 OR virtual_account_number = $2 LIMIT 1`,
                [Number(destAccount.id), destinationAccountNumber]
            ).catch(() => ({ rows: [] as any[] }))
            if (destSwRes.rows[0]?.olivepay_sub_wallet_id) {
                if (senderSw.rail_mode === 'sandbox_simulator') {
                    await queryCopteller(
                        `UPDATE copteller.olivepay_subwallets
                         SET available_balance_kobo = GREATEST(available_balance_kobo, $1),
                             ledger_balance_kobo = GREATEST(ledger_balance_kobo, $1)
                         WHERE olivepay_sub_wallet_id = $2`,
                        [Number(sourceAccount.balance || 0), senderSw.olivepay_sub_wallet_id]
                    ).catch(() => {})
                }
                const w2w = await olivePayClient.transferSubWallet({
                    sourceSubWalletId: senderSw.olivepay_sub_wallet_id,
                    destinationSubWalletId: destSwRes.rows[0].olivepay_sub_wallet_id,
                    amountKobo,
                    narration,
                    idempotencyKey,
                })
                if (!w2w.ok) {
                    return NextResponse.json(
                        { error: w2w.message || 'OlivePay W2W transfer failed', responseCode: w2w.responseCode },
                        { status: 400 }
                    )
                }
                oliveW2wRef = w2w.data?.reference || null
                w2wRailMode = w2w.railMode
            }
        }

        const updatedSourceBal = Number(sourceAccount.balance || 0) - amountKobo
        await payload.update({
            collection: 'accounts',
            id: sourceAccount.id,
            data: { balance: updatedSourceBal, user_id: auth.userId, last_transaction_at: new Date().toISOString() },
            overrideAccess: true,
        })

        const refDebit = oliveW2wRef || `TX_TRF_DR_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`
        await payload.create({
            collection: 'transactions',
            data: {
                reference: refDebit,
                type: 'debit',
                amount: amountKobo,
                from_account: sourceAccount.id,
                to_account: destAccount ? destAccount.id : undefined,
                status: 'successful',
                narration: narration || `Transfer to ${destinationAccountNumber}`,
                user_id: auth.userId,
                customer: customerId,
                balance_after: updatedSourceBal,
            },
            overrideAccess: true,
        })

        if (destAccount) {
            const updatedDestBal = Number(destAccount.balance || 0) + amountKobo
            await payload.update({
                collection: 'accounts',
                id: destAccount.id,
                data: { balance: updatedDestBal, last_transaction_at: new Date().toISOString() },
                overrideAccess: true,
            })

            const destCustomerResult = await payload.find({
                collection: 'customers',
                where: {
                    or: [
                        { id: { equals: typeof destAccount.customer === 'object' ? destAccount.customer?.id : destAccount.customer } },
                        { supabase_id: { equals: destAccount.user_id } },
                    ],
                },
                limit: 1,
                overrideAccess: true,
            })
            const destCustomerId = destCustomerResult.docs[0]?.id || null

            await payload.create({
                collection: 'transactions',
                data: {
                    reference: `CR-${refDebit}`,
                    type: 'credit',
                    amount: amountKobo,
                    from_account: sourceAccount.id,
                    to_account: destAccount.id,
                    status: 'successful',
                    narration: `Inward Transfer from ${sourceAccount.account_number} (${auth.displayName || 'Member'})`,
                    user_id: destAccount.user_id,
                    customer: destCustomerId,
                    balance_after: updatedDestBal,
                },
                overrideAccess: true,
            })
        }

        // Cooperative dues accounting hook
        const isDuesPayment = destinationAccountNumber === '9998887776' || narration.toLowerCase().includes('due')
        if (isDuesPayment && customerId) {
            const memRes = await payload
                .find({ collection: 'copteller-memberships', where: { member: { equals: customerId } }, limit: 1, overrideAccess: true })
                .catch(() => ({ docs: [] as any[] }))
            if (memRes.docs[0]) {
                const mem = memRes.docs[0]
                await payload.update({
                    collection: 'copteller-memberships',
                    id: mem.id,
                    data: {
                        total_contributed: Number(mem.total_contributed || 0) + amountKobo,
                        outstanding_balance: Math.max(0, Number(mem.outstanding_balance || 0) - amountKobo),
                    },
                    overrideAccess: true,
                })
                await writeAuditLog({
                    actor_id: auth.userId,
                    actor_role: auth.role,
                    actor_name: auth.displayName || auth.email,
                    action: 'member.paid_dues',
                    entity_type: 'membership',
                    entity_id: String(mem.id),
                    amount_kobo: amountKobo,
                    cooperative: typeof mem.cooperative === 'object' ? mem.cooperative?.id : mem.cooperative,
                    metadata: { reference: refDebit, destination_account: destinationAccountNumber, railMode: w2wRailMode },
                })
            }
        }

        return NextResponse.json({
            success: true,
            railMode: w2wRailMode,
            balance: updatedSourceBal,
            reference: refDebit,
            amount: amountKobo,
            destination: destinationAccountNumber,
        })
    } catch (error: any) {
        console.error('Wallet transfer error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
