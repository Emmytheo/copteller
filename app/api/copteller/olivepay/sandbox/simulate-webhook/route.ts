import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import {
    signOlivePayWebhookPayload,
    koboToNairaString,
    nairaToKobo,
    resolveActiveOlivePayRailMode,
} from '@/lib/copteller/olivepay-client'
import {
    getEffectiveWebhookSecret,
    processVerifiedOlivePayWebhook,
    OLIVEPAY_WEBHOOK_EVENTS,
} from '@/lib/copteller/olivepay-webhook-processor'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/olivepay/sandbox/simulate-webhook
 * Internal Sandbox Testing Rail tool that constructs a genuine OlivePay webhook payload,
 * signs it cryptographically with HMAC-SHA256 (`X-Webhook-Timestamp` + `X-Webhook-Signature`),
 * and executes it through the EXACT same production webhook pipeline (`processVerifiedOlivePayWebhook`).
 *
 * - Superadmins / bank_staff can simulate ALL 14 OlivePay webhook events!
 * - Authenticated members can simulate completion ONLY for their own pending Sandbox Checkout or Dynamic VA!
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const eventType = String(body.event || 'payment.success').toLowerCase()
        const isElevated = auth.role === 'superadmin' || auth.role === 'bank_staff'
        const activeRailMode = await resolveActiveOlivePayRailMode()

        if (!isElevated) {
            if (activeRailMode !== 'sandbox_simulator') {
                return NextResponse.json(
                    { error: 'Webhook simulation is only enabled for members while running on the Internal Sandbox Testing Rail.' },
                    { status: 403 }
                )
            }
            if (!['payment.success', 'payment.failed', 'subwallet.credited'].includes(eventType)) {
                return NextResponse.json(
                    { error: 'Only superadmin or bank_staff can simulate this webhook event type.' },
                    { status: 403 }
                )
            }
        }

        const amountNaira = Number(body.amount || 5000)
        const txId = String(body.transactionId || body.reference || `SBX-${Date.now()}`)

        let webhookPayload: Record<string, any>
        if (eventType === 'payment.success' || eventType === 'payment.failed') {
            webhookPayload = {
                EventType: eventType,
                TransactionReference: txId,
                Amount: koboToNairaString(nairaToKobo(amountNaira)),
                PaymentReference: `OP-SBX-${Date.now()}`,
                Email: body.email || auth.email,
                CustomerName: body.customerName || auth.displayName || 'Sandbox Member',
                data: {
                    transactionId: txId,
                    Amount: koboToNairaString(nairaToKobo(amountNaira)),
                    paymentReference: `OP-SBX-${Date.now()}`,
                    payer: { name: body.senderName || auth.displayName || 'Sandbox Payer', bank: 'GTBank (Sandbox)' },
                },
            }
        } else {
            webhookPayload = {
                event: eventType,
                timestamp: new Date().toISOString(),
                data: {
                    reference: txId,
                    amount: amountNaira,
                    sub_wallet_id: body.subWalletId || undefined,
                    virtual_account_number: body.virtualAccountNumber || undefined,
                    sender_account_name: body.senderName || 'SANDBOX TEST SENDER',
                    sender_bank_name: body.senderBank || 'GTBank (Sandbox)',
                    is_tier_locked: Boolean(body.isTierLocked),
                    tier: Number(body.tier || 2),
                    reason: body.reason || 'Simulated Sandbox Event',
                    ...(body.data || {}),
                },
            }
        }

        const rawBody = JSON.stringify(webhookPayload)
        const { secret } = await getEffectiveWebhookSecret()
        const signed = signOlivePayWebhookPayload(secret, rawBody)

        const result = await processVerifiedOlivePayWebhook({
            rawBody,
            headers: {
                timestamp: signed.timestamp,
                signature: signed.signature,
                authorization: signed.headers.Authorization,
                sandboxHeader: '1',
            },
        })

        return NextResponse.json(
            {
                success: result.ok,
                simulated: true,
                supportedEvents: OLIVEPAY_WEBHOOK_EVENTS,
                signedHeaders: {
                    'X-Webhook-Timestamp': signed.timestamp,
                    'X-Webhook-Signature': `${signed.signature.slice(0, 16)}...`,
                },
                result,
            },
            { status: result.ok ? 200 : result.httpStatus }
        )
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Simulation failed' }, { status: 500 })
    }
}
