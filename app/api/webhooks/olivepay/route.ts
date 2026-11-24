import { NextRequest, NextResponse } from 'next/server'
import { processVerifiedOlivePayWebhook } from '@/lib/copteller/olivepay-webhook-processor'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/olivepay
 * Single unified HTTPS webhook receiver for ALL 14 OlivePay events:
 *   payment.success, payment.failed, wallet.credited,
 *   wallet_payout.success/failed/reversed,
 *   subwallet.credited, subwallet_funding.settled/reversed,
 *   subwallet_payout.success/failed,
 *   subwallet.tier_locked, subwallet.tier_upgraded, subwallet.tier_upgrade_rejected.
 *
 * CRITICAL: Reads exact unparsed raw bytes via `await req.text()` before HMAC-SHA256 verification.
 */
export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text()
        const result = await processVerifiedOlivePayWebhook({
            rawBody,
            headers: {
                timestamp: req.headers.get('x-webhook-timestamp'),
                signature: req.headers.get('x-webhook-signature'),
                authorization: req.headers.get('authorization'),
                sandboxHeader: req.headers.get('x-olivepay-sandbox-test'),
            },
        })

        return NextResponse.json(
            {
                received: result.ok,
                duplicate: Boolean(result.duplicate),
                eventType: result.eventType,
                reference: result.dedupeReference,
                action: result.actionTaken,
                ...(result.error ? { error: result.error } : {}),
            },
            { status: result.httpStatus }
        )
    } catch (err: any) {
        console.error('[OlivePay Webhook] Fatal error:', err)
        return NextResponse.json({ received: false, error: err.message || 'Webhook error' }, { status: 500 })
    }
}
