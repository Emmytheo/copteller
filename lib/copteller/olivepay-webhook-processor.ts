import { queryCopteller, withCoptellerTransaction } from '@/lib/copteller/pg'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'
import {
    nairaToKobo,
    verifyOlivePayWebhookSignature,
    resolveOlivePayCredentials,
    resolveActiveOlivePayRailMode,
    TIER_LIMITS_NAIRA,
    type OlivePayRailMode,
} from '@/lib/copteller/olivepay-client'
import crypto from 'crypto'

export const OLIVEPAY_WEBHOOK_EVENTS = [
    'payment.success',
    'payment.failed',
    'wallet.credited',
    'wallet_payout.success',
    'wallet_payout.failed',
    'wallet_payout.reversed',
    'subwallet.credited',
    'subwallet_funding.settled',
    'subwallet_funding.reversed',
    'subwallet_payout.success',
    'subwallet_payout.failed',
    'subwallet.tier_locked',
    'subwallet.tier_upgraded',
    'subwallet.tier_upgrade_rejected',
] as const

export type OlivePayWebhookEventName = (typeof OLIVEPAY_WEBHOOK_EVENTS)[number]

/**
 * Deterministic Sandbox Webhook Secret derived from PAYLOAD_SECRET when no live
 * OLIVEPAY_WEBHOOK_SECRET is configured yet — ensures even Sandbox Webhook Simulation
 * exercises real HMAC-SHA256 signing + timingSafeEqual verification!
 */
export async function getEffectiveWebhookSecret(): Promise<{ secret: string; isSandboxSecret: boolean }> {
    const creds = await resolveOlivePayCredentials()
    if (creds.webhookSecret) {
        return { secret: creds.webhookSecret, isSandboxSecret: false }
    }
    const seed = process.env.PAYLOAD_SECRET || process.env.ADMIN_SECRET || 'copteller-sandbox-wh'
    const derived = `whsec_sbx_${crypto.createHash('sha256').update(`olivepay-sandbox-wh:${seed}`).digest('hex').slice(0, 32)}`
    return { secret: derived, isSandboxSecret: true }
}

/**
 * Normalize event type & dedupe reference across OlivePay's two payload conventions:
 *  - Collections / Dynamic VA: `EventType` + `TransactionReference` / `TransactionId`
 *  - Wallet / SubWallet / Payouts: `event` + `data.reference` / `data.id` / `data.sub_wallet_id`
 */
export function extractWebhookIdentity(payload: any): {
    eventType: string
    dedupeReference: string
    data: any
} {
    const rawEvent = String(payload?.event || payload?.EventType || payload?.eventType || 'unknown').trim()
    const eventType = rawEvent.toLowerCase()
    const data = payload?.data ?? payload?.Data ?? payload ?? {}

    const dedupeReference = String(
        data?.reference ||
            data?.provider_reference ||
            data?.transactionId ||
            data?.TransactionReference ||
            payload?.TransactionReference ||
            payload?.transactionId ||
            data?.requestId ||
            `${data?.sub_wallet_id || data?.subWalletId || 'global'}_${payload?.timestamp || data?.updatedAt || Date.now()}`
    ).trim()

    return { eventType, dedupeReference, data }
}

/**
 * End-to-end verified & idempotent OlivePay webhook processor.
 * Handles all 14 OlivePay webhook events atomically against the `copteller` Postgres schema.
 */
export async function processVerifiedOlivePayWebhook(params: {
    rawBody: string
    headers: {
        timestamp: string | null
        signature: string | null
        authorization?: string | null
        sandboxHeader?: string | null
    }
}): Promise<{
    httpStatus: number
    ok: boolean
    duplicate?: boolean
    eventType?: string
    dedupeReference?: string
    actionTaken?: string
    error?: string
}> {
    await ensureOlivePayTables()

    const { secret: webhookSecret, isSandboxSecret } = await getEffectiveWebhookSecret()
    const railMode: OlivePayRailMode =
        params.headers.sandboxHeader === '1' || isSandboxSecret
            ? 'sandbox_simulator'
            : await resolveActiveOlivePayRailMode()

    // 1. Cryptographic Raw-Body HMAC-SHA256 + ±300s Replay Verification
    const verify = verifyOlivePayWebhookSignature({
        rawBody: params.rawBody,
        timestampHeader: params.headers.timestamp,
        signatureHeader: params.headers.signature,
        authorizationHeader: params.headers.authorization,
        webhookSecret,
    })

    let parsed: any = {}
    try {
        parsed = JSON.parse(params.rawBody)
    } catch {
        return { httpStatus: 400, ok: false, error: 'Invalid JSON webhook body' }
    }

    const { eventType, dedupeReference, data } = extractWebhookIdentity(parsed)

    if (!verify.valid) {
        // Log invalid attempt to audit trail without mutating any ledger balance
        await queryCopteller(
            `INSERT INTO copteller.copteller_audit_logs
             (actor_id, actor_role, actor_name, action, entity_type, entity_id, metadata, created_at, updated_at)
             VALUES ('olivepay-webhook', 'system', 'OlivePay Webhook', 'WEBHOOK_SIGNATURE_REJECTED', 'WEBHOOK', $1, $2, NOW(), NOW())`,
            [dedupeReference, JSON.stringify({ eventType, reason: verify.reason })]
        ).catch(() => {})

        return {
            httpStatus: 401,
            ok: false,
            eventType,
            dedupeReference,
            error: verify.reason || 'Invalid webhook signature',
        }
    }

    // 2. Idempotency Inbox Insert — UNIQUE (event_type, dedupe_reference)
    const inboxRes = await queryCopteller(
        `INSERT INTO copteller.olivepay_webhook_events
         (event_type, dedupe_reference, raw_headers, payload, signature_valid, processing_status, rail_mode)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, TRUE, 'PROCESSING', $5)
         ON CONFLICT (event_type, dedupe_reference) DO NOTHING
         RETURNING id`,
        [
            eventType,
            dedupeReference,
            JSON.stringify({
                timestamp: params.headers.timestamp,
                hasSignature: Boolean(params.headers.signature),
                sandbox: params.headers.sandboxHeader === '1',
            }),
            params.rawBody,
            railMode,
        ]
    )

    if (inboxRes.rows.length === 0) {
        return {
            httpStatus: 200,
            ok: true,
            duplicate: true,
            eventType,
            dedupeReference,
            actionTaken: 'Duplicate event deduplicated idempotently',
        }
    }

    const inboxId = inboxRes.rows[0].id
    let actionTaken = 'Logged event'

    try {
        // 3. Dispatch All 14 OlivePay Event Handlers
        switch (eventType) {
            case 'payment.success':
            case 'payment.successful': {
                const txId = String(
                    data.transactionId || data.TransactionReference || parsed.TransactionReference || dedupeReference
                )
                const amountKobo = nairaToKobo(data.Amount ?? data.amount ?? parsed.Amount ?? 0)
                const providerRef = String(data.PaymentReference || data.paymentReference || data.reference || dedupeReference)

                actionTaken = await settleInboundPaymentOrVa({
                    transactionId: txId,
                    amountKobo,
                    providerReference: providerRef,
                    payer: data.payer || { name: data.CustomerName || data.customerName, email: data.Email || data.email },
                })
                break
            }

            case 'payment.failed': {
                const txId = String(
                    data.transactionId || data.TransactionReference || parsed.TransactionReference || dedupeReference
                )
                await queryCopteller(
                    `UPDATE copteller.olivepay_collections SET status = 'failed', is_successful = FALSE, updated_at = NOW() WHERE transaction_id = $1`,
                    [txId]
                )
                await queryCopteller(
                    `UPDATE copteller.olivepay_virtual_accounts SET status = 'failed', updated_at = NOW() WHERE transaction_id = $1`,
                    [txId]
                )
                actionTaken = `Marked payment/VA ${txId} failed`
                break
            }

            case 'wallet.credited': {
                const amountKobo = nairaToKobo(data.amount ?? 0)
                if (railMode === 'sandbox_simulator' && amountKobo > 0) {
                    await queryCopteller(
                        `UPDATE copteller.olivepay_sandbox_master SET available_balance_kobo = available_balance_kobo + $1, updated_at = NOW() WHERE id = 1`,
                        [amountKobo]
                    )
                }
                actionTaken = `Recorded Master Treasury credit of ₦${(amountKobo / 100).toLocaleString()}`
                break
            }

            case 'wallet_payout.success': {
                const ref = String(data.reference || dedupeReference)
                await queryCopteller(
                    `UPDATE copteller.olivepay_payouts
                     SET status = 'SUCCESS', provider_reference = COALESCE($1, provider_reference), response_code = '00', updated_at = NOW()
                     WHERE olivepay_reference = $2 OR external_reference = $2`,
                    [data.provider_reference || data.providerReference || null, ref]
                )
                actionTaken = `Finalized merchant payout ${ref} as SUCCESS`
                break
            }

            case 'wallet_payout.failed':
            case 'wallet_payout.reversed': {
                const ref = String(data.reference || dedupeReference)
                const newStatus = eventType === 'wallet_payout.reversed' ? 'REVERSED' : 'FAILED'
                const pRes = await queryCopteller(
                    `UPDATE copteller.olivepay_payouts
                     SET status = $1, error_message = COALESCE($2, error_message), updated_at = NOW()
                     WHERE olivepay_reference = $3 OR external_reference = $3
                     RETURNING total_debit_kobo, rail_mode`,
                    [newStatus, data.reason || data.message || `Payout ${newStatus}`, ref]
                )
                if (pRes.rows[0]?.rail_mode === 'sandbox_simulator') {
                    await queryCopteller(
                        `UPDATE copteller.olivepay_sandbox_master SET available_balance_kobo = available_balance_kobo + $1, updated_at = NOW() WHERE id = 1`,
                        [Number(pRes.rows[0].total_debit_kobo || 0)]
                    )
                }
                actionTaken = `Marked merchant payout ${ref} as ${newStatus}`
                break
            }

            case 'subwallet.credited': {
                const subWalletId = String(data.sub_wallet_id || data.subWalletId || '')
                const nuban = String(data.virtual_account_number || data.account_number || '')
                const amountKobo = nairaToKobo(data.amount ?? 0)
                const isTierLocked = Boolean(data.is_tier_locked)
                const senderName = String(data.sender_account_name || data.senderName || 'External Bank Transfer')
                const senderBank = String(data.sender_bank_name || data.senderBank || 'NIP')

                actionTaken = await creditSubWalletAndLedger({
                    subWalletId,
                    virtualAccountNumber: nuban,
                    amountKobo,
                    reference: String(data.reference || dedupeReference),
                    narration: `Inbound Bank Transfer from ${senderName} (${senderBank})`,
                    isTierLocked,
                })
                break
            }

            case 'subwallet_funding.settled': {
                const ref = String(data.reference || dedupeReference)
                await queryCopteller(
                    `UPDATE copteller.olivepay_payouts SET status = 'SETTLED', response_code = '00', updated_at = NOW()
                     WHERE olivepay_reference = $1 OR external_reference = $1`,
                    [ref]
                )
                actionTaken = `Finalized Master->SubWallet funding ${ref} as SETTLED`
                break
            }

            case 'subwallet_funding.reversed': {
                const ref = String(data.reference || dedupeReference)
                const reason = String(data.reason || 'SubWallet funding reversed (possible tier limit breach)')
                await queryCopteller(
                    `UPDATE copteller.olivepay_payouts SET status = 'REVERSED', error_message = $1, updated_at = NOW()
                     WHERE olivepay_reference = $2 OR external_reference = $2`,
                    [reason, ref]
                )
                actionTaken = `Marked SWF funding ${ref} REVERSED: ${reason}`
                break
            }

            case 'subwallet_payout.success': {
                const ref = String(data.reference || dedupeReference)
                await queryCopteller(
                    `UPDATE copteller.olivepay_payouts
                     SET status = 'SUCCESS', provider_reference = COALESCE($1, provider_reference), response_code = '00', updated_at = NOW()
                     WHERE olivepay_reference = $2 OR external_reference = $2`,
                    [data.provider_reference || null, ref]
                )
                actionTaken = `Finalized SubWallet payout ${ref} as SUCCESS`
                break
            }

            case 'subwallet_payout.failed': {
                const ref = String(data.reference || dedupeReference)
                const reason = String(data.reason || data.message || 'SubWallet payout failed')
                actionTaken = await reverseFailedSubWalletPayout(ref, reason)
                break
            }

            case 'subwallet.tier_locked': {
                const subWalletId = String(data.sub_wallet_id || data.subWalletId || '')
                await queryCopteller(
                    `UPDATE copteller.olivepay_subwallets SET is_tier_locked = TRUE, updated_at = NOW()
                     WHERE olivepay_sub_wallet_id = $1`,
                    [subWalletId]
                )
                actionTaken = `Locked SubWallet ${subWalletId} (tier balance limit exceeded — KYC upgrade required)`
                break
            }

            case 'subwallet.tier_upgraded': {
                const subWalletId = String(data.sub_wallet_id || data.subWalletId || '')
                const newTier = Number(data.tier || data.new_tier || 2)
                const limits = data.tier_limits || TIER_LIMITS_NAIRA[newTier] || TIER_LIMITS_NAIRA[2]
                await queryCopteller(
                    `UPDATE copteller.olivepay_subwallets
                     SET tier = $1, tier_limits = $2::jsonb, is_tier_locked = FALSE, pending_tier_upgrade = NULL, updated_at = NOW()
                     WHERE olivepay_sub_wallet_id = $3`,
                    [newTier, JSON.stringify(limits), subWalletId]
                )
                actionTaken = `Upgraded SubWallet ${subWalletId} to Tier ${newTier} and lifted any tier lock`
                break
            }

            case 'subwallet.tier_upgrade_rejected': {
                const subWalletId = String(data.sub_wallet_id || data.subWalletId || '')
                const reason = String(data.reason || 'Document rejected')
                await queryCopteller(
                    `UPDATE copteller.olivepay_subwallets
                     SET pending_tier_upgrade = $1::jsonb, updated_at = NOW()
                     WHERE olivepay_sub_wallet_id = $2`,
                    [JSON.stringify({ status: 'REJECTED', reason, rejectedAt: new Date().toISOString() }), subWalletId]
                )
                actionTaken = `Recorded Tier upgrade rejection for SubWallet ${subWalletId}: ${reason}`
                break
            }

            default:
                actionTaken = `Acknowledged unhandled event type: ${eventType}`
        }

        await queryCopteller(
            `UPDATE copteller.olivepay_webhook_events
             SET processing_status = 'PROCESSED', processed_at = NOW()
             WHERE id = $1`,
            [inboxId]
        )

        await queryCopteller(
            `INSERT INTO copteller.copteller_audit_logs
             (actor_id, actor_role, actor_name, action, entity_type, entity_id, metadata, created_at, updated_at)
             VALUES ('olivepay-webhook', 'system', 'OlivePay Webhook', 'WEBHOOK_PROCESSED', 'WEBHOOK', $1, $2, NOW(), NOW())`,
            [dedupeReference, JSON.stringify({ eventType, actionTaken, railMode })]
        ).catch(() => {})

        return { httpStatus: 200, ok: true, eventType, dedupeReference, actionTaken }
    } catch (err: any) {
        await queryCopteller(
            `UPDATE copteller.olivepay_webhook_events
             SET processing_status = 'ERROR', error_message = $1
             WHERE id = $2`,
            [err.message || 'Unknown error', inboxId]
        ).catch(() => {})

        return {
            httpStatus: 500,
            ok: false,
            eventType,
            dedupeReference,
            error: err.message || 'Webhook processing error',
        }
    }
}

async function settleInboundPaymentOrVa(params: {
    transactionId: string
    amountKobo: number
    providerReference: string
    payer?: any
}): Promise<string> {
    return await withCoptellerTransaction(async (client) => {
        // Check Dynamic Virtual Account first
        const vaRes = await client.query(
            `SELECT * FROM copteller.olivepay_virtual_accounts WHERE transaction_id = $1 FOR UPDATE`,
            [params.transactionId]
        )
        if (vaRes.rows[0]) {
            const va = vaRes.rows[0]
            if (va.status === 'paid') return `Dynamic VA ${params.transactionId} already settled`
            const creditKobo = Number(va.amount_kobo || params.amountKobo)

            await client.query(
                `UPDATE copteller.olivepay_virtual_accounts
                 SET status = 'paid', paid_amount_kobo = $1, paid_at = NOW(),
                     provider_reference = $2, payer = $3::jsonb, updated_at = NOW()
                 WHERE id = $4`,
                [params.amountKobo || creditKobo, params.providerReference, JSON.stringify(params.payer || {}), va.id]
            )

            await creditLocalAccountIfPresent(client, {
                accountId: va.target_account_id ? Number(va.target_account_id) : null,
                subWalletId: va.target_sub_wallet_id,
                userId: va.user_id,
                amountKobo: creditKobo,
                reference: `DVA-${params.transactionId}`,
                narration: `Dynamic VA Deposit (${va.account_number || params.transactionId})`,
            })
            return `Settled Dynamic VA ${params.transactionId} (+₦${(creditKobo / 100).toLocaleString()})`
        }

        // Check Hosted Checkout Collection
        const colRes = await client.query(
            `SELECT * FROM copteller.olivepay_collections WHERE transaction_id = $1 FOR UPDATE`,
            [params.transactionId]
        )
        if (colRes.rows[0]) {
            const col = colRes.rows[0]
            if (col.is_successful) return `Collection ${params.transactionId} already settled`
            const creditKobo = Number(col.amount_kobo || params.amountKobo)

            await client.query(
                `UPDATE copteller.olivepay_collections
                 SET status = 'successful', is_successful = TRUE, payment_reference = $1, verified_at = NOW(), updated_at = NOW()
                 WHERE id = $2`,
                [params.providerReference, col.id]
            )

            await creditLocalAccountIfPresent(client, {
                accountId: col.target_account_id ? Number(col.target_account_id) : null,
                subWalletId: col.target_sub_wallet_id,
                userId: col.user_id,
                amountKobo: creditKobo,
                reference: `COL-${params.transactionId}`,
                narration: `OlivePay Checkout Funding (${params.transactionId})`,
            })
            return `Settled Collection ${params.transactionId} (+₦${(creditKobo / 100).toLocaleString()})`
        }

        return `No local VA/Collection matched ${params.transactionId}; logged in webhook inbox`
    })
}

async function creditSubWalletAndLedger(params: {
    subWalletId: string
    virtualAccountNumber: string
    amountKobo: number
    reference: string
    narration: string
    isTierLocked: boolean
}): Promise<string> {
    if (params.amountKobo <= 0) return 'Ignored zero-amount subwallet.credited event'

    return await withCoptellerTransaction(async (client) => {
        const swRes = params.subWalletId
            ? await client.query(`SELECT * FROM copteller.olivepay_subwallets WHERE olivepay_sub_wallet_id = $1 FOR UPDATE`, [params.subWalletId])
            : await client.query(`SELECT * FROM copteller.olivepay_subwallets WHERE virtual_account_number = $1 FOR UPDATE`, [params.virtualAccountNumber])

        const sw = swRes.rows[0]
        if (!sw) return `SubWallet (${params.subWalletId || params.virtualAccountNumber}) not found locally`

        await client.query(
            `UPDATE copteller.olivepay_subwallets
             SET available_balance_kobo = available_balance_kobo + $1,
                 ledger_balance_kobo = ledger_balance_kobo + $1,
                 is_tier_locked = is_tier_locked OR $2,
                 last_synced_at = NOW(),
                 updated_at = NOW()
             WHERE id = $3`,
            [params.amountKobo, params.isTierLocked, sw.id]
        )

        await creditLocalAccountIfPresent(client, {
            accountId: sw.account_id ? Number(sw.account_id) : null,
            subWalletId: sw.olivepay_sub_wallet_id,
            userId: sw.user_id,
            amountKobo: params.amountKobo,
            reference: `SWCR-${params.reference}`,
            narration: params.narration,
            skipSubWalletUpdate: true,
        })

        return `Credited SubWallet ${sw.olivepay_sub_wallet_id} (+₦${(params.amountKobo / 100).toLocaleString()})${params.isTierLocked ? ' [TIER LOCKED]' : ''}`
    })
}

async function creditLocalAccountIfPresent(
    client: any,
    params: {
        accountId: number | null
        subWalletId?: string | null
        userId?: string | null
        amountKobo: number
        reference: string
        narration: string
        skipSubWalletUpdate?: boolean
    }
) {
    if (params.amountKobo <= 0) return

    if (params.subWalletId && !params.skipSubWalletUpdate) {
        await client.query(
            `UPDATE copteller.olivepay_subwallets
             SET available_balance_kobo = available_balance_kobo + $1,
                 ledger_balance_kobo = ledger_balance_kobo + $1,
                 updated_at = NOW()
             WHERE olivepay_sub_wallet_id = $2`,
            [params.amountKobo, params.subWalletId]
        )
    }

    let acc: any = null
    if (params.accountId) {
        const res = await client.query(`SELECT * FROM copteller.accounts WHERE id = $1 FOR UPDATE`, [params.accountId])
        acc = res.rows[0]
    } else if (params.userId) {
        const res = await client.query(
            `SELECT * FROM copteller.accounts WHERE user_id = $1 AND status = 'active' ORDER BY id ASC LIMIT 1 FOR UPDATE`,
            [params.userId]
        )
        acc = res.rows[0]
    }

    if (!acc) return

    const newBal = Number(acc.balance || 0) + params.amountKobo
    await client.query(
        `UPDATE copteller.accounts SET balance = $1, last_transaction_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [newBal, acc.id]
    )

    await client
        .query(
            `INSERT INTO copteller.transactions
             (reference, type, amount, currency, to_account_id, status, narration, user_id, customer_id, balance_after, created_at, updated_at)
             VALUES ($1, 'credit', $2, 'NGN', $3, 'successful', $4, $5, $6, $7, NOW(), NOW())
             ON CONFLICT (reference) DO NOTHING`,
            [params.reference, params.amountKobo, acc.id, params.narration, acc.user_id, acc.customer_id, newBal]
        )
        .catch(() => {})
}

async function reverseFailedSubWalletPayout(reference: string, reason: string): Promise<string> {
    return await withCoptellerTransaction(async (client) => {
        const pRes = await client.query(
            `SELECT * FROM copteller.olivepay_payouts WHERE olivepay_reference = $1 OR external_reference = $1 FOR UPDATE`,
            [reference]
        )
        const p = pRes.rows[0]
        if (!p) return `Payout ${reference} not found for failure reversal`
        if (p.status === 'FAILED' || p.status === 'REVERSED') {
            return `Payout ${reference} already marked ${p.status}`
        }

        const refundKobo = Number(p.total_debit_kobo || p.amount_kobo || 0)
        await client.query(
            `UPDATE copteller.olivepay_payouts SET status = 'FAILED', error_message = $1, updated_at = NOW() WHERE id = $2`,
            [reason, p.id]
        )

        if (p.source_sub_wallet_id && refundKobo > 0) {
            const swRes = await client.query(
                `UPDATE copteller.olivepay_subwallets
                 SET available_balance_kobo = available_balance_kobo + $1,
                     ledger_balance_kobo = ledger_balance_kobo + $1,
                     updated_at = NOW()
                 WHERE olivepay_sub_wallet_id = $2
                 RETURNING account_id, user_id`,
                [refundKobo, p.source_sub_wallet_id]
            )
            if (swRes.rows[0]) {
                await creditLocalAccountIfPresent(client, {
                    accountId: swRes.rows[0].account_id ? Number(swRes.rows[0].account_id) : null,
                    userId: swRes.rows[0].user_id,
                    amountKobo: refundKobo,
                    reference: `REV-${reference}`,
                    narration: `Automatic Reversal: Failed Payout ${reference} (${reason})`,
                    skipSubWalletUpdate: true,
                })
            }
        }

        if (p.local_transaction_id) {
            await client
                .query(`UPDATE copteller.transactions SET status = 'failed', updated_at = NOW() WHERE id = $1`, [
                    p.local_transaction_id,
                ])
                .catch(() => {})
        }

        return `Marked SubWallet payout ${reference} FAILED and atomically restored ₦${(refundKobo / 100).toLocaleString()}`
    })
}
