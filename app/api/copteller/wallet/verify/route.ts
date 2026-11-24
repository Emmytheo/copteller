import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { olivePayClient, signOlivePayWebhookPayload, koboToNairaString, nairaToKobo } from '@/lib/copteller/olivepay-client'
import { getEffectiveWebhookSecret, processVerifiedOlivePayWebhook } from '@/lib/copteller/olivepay-webhook-processor'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/wallet/verify
 * Server-side verification for OlivePay Hosted Checkout & Dynamic Virtual Accounts.
 * Never trusts browser redirect query parameters alone — verifies directly against OlivePay
 * (or Sandbox Testing Rail) and reconciles through the idempotent webhook settlement ledger.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const transactionId = String(body.transactionId || '').trim()
        const type = String(body.type || 'checkout').toLowerCase()

        if (!transactionId) {
            return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
        }

        if (type === 'dynamic_va') {
            const vaRes = await olivePayClient.getDynamicVirtualAccount(transactionId)
            if (!vaRes.ok || !vaRes.data) {
                return NextResponse.json({ error: vaRes.message || 'Dynamic VA verification failed' }, { status: 400 })
            }
            const isPaid = String(vaRes.data.status || '').toLowerCase() === 'paid'
            if (isPaid) {
                const payloadStr = JSON.stringify({
                    EventType: 'payment.success',
                    TransactionReference: transactionId,
                    Amount: koboToNairaString(Number(vaRes.data.paidAmount || vaRes.data.amount || 0)),
                    PaymentReference: vaRes.data.providerReference || vaRes.data.reference || transactionId,
                })
                const { secret } = await getEffectiveWebhookSecret()
                const signed = signOlivePayWebhookPayload(secret, payloadStr)
                await processVerifiedOlivePayWebhook({
                    rawBody: payloadStr,
                    headers: { timestamp: signed.timestamp, signature: signed.signature, authorization: signed.headers.Authorization },
                })
            }
            return NextResponse.json({
                success: true,
                paid: isPaid,
                railMode: vaRes.railMode,
                virtualAccount: vaRes.data,
            })
        }

        // Default: Collections Checkout VerifyPayment
        const verifyRes = await olivePayClient.verifyPayment(transactionId)
        if (!verifyRes.ok || !verifyRes.data) {
            return NextResponse.json({ error: verifyRes.message || 'Payment verification failed' }, { status: 400 })
        }

        const isSuccessful = Boolean(verifyRes.data.isSuccessful) || String(verifyRes.data.status || '').toLowerCase() === 'successful'
        if (isSuccessful) {
            const payloadStr = JSON.stringify({
                EventType: 'payment.success',
                TransactionReference: transactionId,
                Amount: String(verifyRes.data.amount || koboToNairaString(nairaToKobo(verifyRes.data.amount || 0))),
                PaymentReference: verifyRes.data.paymentReference || transactionId,
            })
            const { secret } = await getEffectiveWebhookSecret()
            const signed = signOlivePayWebhookPayload(secret, payloadStr)
            await processVerifiedOlivePayWebhook({
                rawBody: payloadStr,
                headers: { timestamp: signed.timestamp, signature: signed.signature, authorization: signed.headers.Authorization },
            })
        }

        return NextResponse.json({
            success: true,
            verified: isSuccessful,
            railMode: verifyRes.railMode,
            payment: verifyRes.data,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 })
    }
}
