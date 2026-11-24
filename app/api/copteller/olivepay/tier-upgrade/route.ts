import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { olivePayClient } from '@/lib/copteller/olivepay-client'
import { ensureMemberOlivePaySubWallet, refreshOlivePaySubWallet } from '@/lib/copteller/olivepay-sync'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/olivepay/tier-upgrade
 * Upgrades member's OlivePay SubWallet to Tier 2 (synchronous via 11-digit NIN)
 * or initiates Tier 3 (queued document verification or Delegated KYC attestation).
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const targetTier = Number(body.targetTier || 2) === 3 ? 3 : 2
        const nin = body.nin ? String(body.nin).replace(/\D/g, '') : undefined
        const address = body.address ? String(body.address).trim() : undefined

        if (targetTier === 2 && (!nin || nin.length !== 11)) {
            return NextResponse.json({ error: 'A valid 11-digit NIN is required for instant Tier 2 upgrade.' }, { status: 400 })
        }

        const sw = await ensureMemberOlivePaySubWallet({
            userId: auth.userId,
            email: auth.email,
            fullName: auth.displayName,
        })

        const res = await olivePayClient.upgradeSubWalletTier({
            subWalletId: sw.olivepay_sub_wallet_id,
            targetTier: targetTier as 2 | 3,
            nin,
            address,
            attestation: body.attestation,
        })

        if (!res.ok) {
            return NextResponse.json(
                { error: res.message || 'Tier upgrade failed', responseCode: res.responseCode },
                { status: 400 }
            )
        }

        const refreshed = await refreshOlivePaySubWallet(sw.olivepay_sub_wallet_id)

        return NextResponse.json({
            success: true,
            railMode: res.railMode,
            upgrade: res.data,
            subwallet: refreshed || sw,
            message: res.message || `Tier ${targetTier} upgrade processed.`,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Tier upgrade error' }, { status: 500 })
    }
}
