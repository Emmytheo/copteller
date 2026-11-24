import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { olivePayClient, nairaToKobo } from '@/lib/copteller/olivepay-client'
import { ensureMemberOlivePaySubWallet } from '@/lib/copteller/olivepay-sync'
import { queryCopteller } from '@/lib/copteller/pg'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/olivepay/holds
 * Lists active & historical Escrow Holds for the authenticated user (or all holds for superadmin).
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        await ensureOlivePayTables()
        const isElevated = auth.role === 'superadmin' || auth.role === 'bank_staff'

        const res = isElevated
            ? await queryCopteller(`SELECT * FROM copteller.olivepay_holds ORDER BY created_at DESC LIMIT 100`)
            : await queryCopteller(
                  `SELECT h.* FROM copteller.olivepay_holds h
                   JOIN copteller.olivepay_subwallets s ON s.olivepay_sub_wallet_id = h.sub_wallet_id
                   WHERE s.user_id = $1
                   ORDER BY h.created_at DESC LIMIT 50`,
                  [auth.userId]
              )

        return NextResponse.json({
            success: true,
            holds: res.rows.map((h: any) => ({
                id: h.olivepay_hold_id,
                reference: h.reference,
                subWalletId: h.sub_wallet_id,
                amountNaira: Number(h.amount_kobo || 0) / 100,
                capturedAmountNaira: Number(h.captured_amount_kobo || 0) / 100,
                commissionAmountNaira: Number(h.commission_amount_kobo || 0) / 100,
                status: h.status,
                entityType: h.entity_type,
                entityId: h.entity_id,
                reason: h.reason,
                expiresPolicyAt: h.expires_policy_at,
                railMode: h.rail_mode,
                createdAt: h.created_at,
            })),
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to load holds' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/olivepay/holds
 * Place, Capture (full/partial + commission), or Release an OlivePay Escrow Hold.
 * Gracefully detects responseCode "15" when Escrow Holds are not yet enabled on live merchant account.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        await ensureOlivePayTables()
        const body = await req.json().catch(() => ({}))
        const action = String(body.action || 'place').toLowerCase()

        if (action === 'place') {
            const amountNaira = Number(body.amount || 0)
            if (amountNaira <= 0) {
                return NextResponse.json({ error: 'Hold amount must be greater than 0' }, { status: 400 })
            }
            const sw = body.subWalletId
                ? { olivepay_sub_wallet_id: String(body.subWalletId) }
                : await ensureMemberOlivePaySubWallet({ userId: auth.userId, email: auth.email, fullName: auth.displayName })

            const idemKey = String(body.idempotencyKey || `hld_${auth.userId.slice(0, 8)}_${Date.now()}`)
            const res = await olivePayClient.placeHold({
                subWalletId: sw.olivepay_sub_wallet_id,
                amountKobo: nairaToKobo(amountNaira),
                reason: String(body.reason || 'Copteller Escrow Collateral Lock'),
                idempotencyKey: idemKey,
                externalReference: body.externalReference ? String(body.externalReference) : undefined,
            })

            if (res.isHoldsDisabled) {
                return NextResponse.json(
                    {
                        error: 'Escrow Holds (responseCode 15) are not yet enabled on your OlivePay merchant account. Switch to Sandbox Rail to test holds or request enablement from OlivePay.',
                        responseCode: '15',
                    },
                    { status: 403 }
                )
            }
            if (!res.ok) {
                return NextResponse.json({ error: res.message || 'Failed to place hold', responseCode: res.responseCode }, { status: 400 })
            }

            const holdId = String(res.data?.id || res.data?.holdId || '')
            if (holdId && (body.entityType || body.expiresInHours)) {
                const expDate = body.expiresInHours
                    ? new Date(Date.now() + Number(body.expiresInHours) * 3600_000).toISOString()
                    : null
                await queryCopteller(
                    `UPDATE copteller.olivepay_holds
                     SET entity_type = COALESCE($1, entity_type),
                         entity_id = COALESCE($2, entity_id),
                         expires_policy_at = COALESCE($3::timestamptz, expires_policy_at),
                         updated_at = NOW()
                     WHERE olivepay_hold_id = $4`,
                    [body.entityType || null, body.entityId ? String(body.entityId) : null, expDate, holdId]
                ).catch(() => {})
            }

            return NextResponse.json({ success: true, railMode: res.railMode, hold: res.data })
        }

        if (action === 'capture') {
            const holdId = String(body.holdId || '')
            if (!holdId) return NextResponse.json({ error: 'holdId is required' }, { status: 400 })
            const res = await olivePayClient.captureHold({
                holdId,
                destinationSubWalletId: body.destinationSubWalletId || undefined,
                captureAmountKobo: body.captureAmount !== undefined ? nairaToKobo(body.captureAmount) : undefined,
                commissionAmountKobo: body.commissionAmount !== undefined ? nairaToKobo(body.commissionAmount) : undefined,
                narration: body.narration || 'Copteller Escrow Settlement',
            })
            if (!res.ok) return NextResponse.json({ error: res.message || 'Hold capture failed' }, { status: 400 })
            return NextResponse.json({ success: true, railMode: res.railMode, hold: res.data })
        }

        if (action === 'release') {
            const holdId = String(body.holdId || '')
            if (!holdId) return NextResponse.json({ error: 'holdId is required' }, { status: 400 })
            const res = await olivePayClient.releaseHold(holdId, body.reason || 'Escrow released')
            if (!res.ok) return NextResponse.json({ error: res.message || 'Hold release failed' }, { status: 400 })
            return NextResponse.json({ success: true, railMode: res.railMode, hold: res.data })
        }

        return NextResponse.json({ error: 'action must be place, capture, or release' }, { status: 400 })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Hold operation failed' }, { status: 500 })
    }
}
