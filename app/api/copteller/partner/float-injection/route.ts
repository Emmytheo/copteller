import { NextRequest, NextResponse } from "next/server"
import { getCoptellerAuth } from "@/lib/copteller/auth"
import { INSTITUTIONAL_PARTNERS } from "@/lib/data/partner-directory"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const {
            partnerSlug = 'abshia',
            amountKobo,
            sourceBank = 'Abia State Central Treasury / CBN Microfinance Facility',
            reference,
            purpose = 'Statutory Risk Pool Liquidity Top-up'
        } = body

        if (!amountKobo || Number(amountKobo) <= 0) {
            return NextResponse.json({ error: "A valid positive amount is required" }, { status: 400 })
        }

        const partner = INSTITUTIONAL_PARTNERS.find(p => p.slug === partnerSlug)
        if (!partner) {
            return NextResponse.json({ error: `Partner "${partnerSlug}" not found` }, { status: 404 })
        }

        const injectionKobo = Number(amountKobo)
        partner.escrowAccount.availableFloatKobo += injectionKobo
        partner.totalCommittedKobo += injectionKobo

        const txRef = reference || `FLT-INJ-${partnerSlug.toUpperCase()}-${Date.now().toString().slice(-6)}`

        return NextResponse.json({
            success: true,
            txRef,
            partnerSlug,
            partnerName: partner.name,
            accountNumber: partner.escrowAccount.accountNumber,
            injectedAmountKobo: injectionKobo,
            newAvailableFloatKobo: partner.escrowAccount.availableFloatKobo,
            totalCommittedKobo: partner.totalCommittedKobo,
            timestamp: new Date().toISOString(),
            message: `Successfully injected ₦${(injectionKobo / 100).toLocaleString()} into ${partner.shortName} Escrow Account (${partner.escrowAccount.accountNumber}).`
        })
    } catch (err: any) {
        console.error("Float Injection Error:", err)
        return NextResponse.json({ error: err.message || "Failed to process float injection" }, { status: 500 })
    }
}
