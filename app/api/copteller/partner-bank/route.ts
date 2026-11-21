import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'
import {
    getActivePartnerBankConfig,
    listSupportedPartnerBanks,
    setPartnerBankRuntimeOverride,
    provisionCooperativeEscrowWithPartnerBank,
    type PartnerBankProvider,
} from '@/lib/copteller/partner-bank-adapter'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/partner-bank
 * Public/portal-safe descriptor of Copteller's active settlement Partner Bank
 * (BankSuite MFB, Kuda Open API v2.1, Qore CBS, or Generic Partner MFB)
 * and live provisioned cooperative Escrow NUBANs from copteller.cooperatives.metadata.
 */
export async function GET() {
    try {
        const config = getActivePartnerBankConfig()
        const coopsRes = await queryCopteller(
            `SELECT id, name, status, metadata
             FROM copteller.cooperatives
             ORDER BY created_at DESC
             LIMIT 100`
        ).catch(() => ({ rows: [] as any[] }))

        const escrowPools = coopsRes.rows
            .map((c) => {
                const meta = c.metadata || {}
                const nuban = meta.banksuite_escrow_nuban || meta.escrow_nuban || null
                if (!nuban) return null
                return {
                    cooperativeId: Number(c.id),
                    cooperativeName: String(c.name),
                    escrowNuban: String(nuban),
                    partnerBankName: String(meta.partner_bank_name || config.bankName),
                    partnerProvider: String(meta.partner_bank_provider || config.provider),
                    boundAt: meta.escrow_bound_at || null,
                }
            })
            .filter(Boolean) as Array<{
            cooperativeId: number
            cooperativeName: string
            escrowNuban: string
            partnerBankName: string
            partnerProvider: string
            boundAt: string | null
        }>

        const primaryEscrowNuban =
            escrowPools[0]?.escrowNuban || config.escrowAccountNumber || null

        return NextResponse.json({
            success: true,
            partnerBank: {
                ...config,
                primaryEscrowNuban,
                escrowAccountNumber: primaryEscrowNuban || config.escrowAccountNumber || 'Dynamic Escrow Rail',
            },
            escrowPools,
            supportedProviders: listSupportedPartnerBanks(),
        })
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message || 'Failed to resolve partner bank' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/copteller/partner-bank
 * Superadmin endpoint to switch Copteller's active Settlement Partner Bank
 * (BankSuite MFB, Kuda Open API v2.1, Qore CBS, or Generic Partner MFB)
 * or provision a new Partner Bank Virtual Escrow NUBAN for a cooperative.
 */
export async function POST(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json().catch(() => ({}))

        if (body.action === 'provision_escrow') {
            const coopId = Number(body.cooperative_id)
            if (!coopId) {
                return NextResponse.json({ error: 'cooperative_id is required' }, { status: 400 })
            }
            const coopRes = await queryCopteller(
                `SELECT id, name, metadata FROM copteller.cooperatives WHERE id = $1 LIMIT 1`,
                [coopId]
            )
            const coop = coopRes.rows[0]
            if (!coop) {
                return NextResponse.json({ error: 'Cooperative not found' }, { status: 404 })
            }
            const provisioned = await provisionCooperativeEscrowWithPartnerBank({
                cooperativeId: Number(coop.id),
                cooperativeName: String(coop.name),
                email: String(body.email || auth.email || `coop-${coop.id}@copteller.app`),
                phoneNumber: String(body.phone_number || '08000000000'),
                actorEmail: auth.email || 'superadmin@copteller.app',
            })
            return NextResponse.json({ success: true, provisioned })
        }

        const provider = String(body.provider || '').toLowerCase() as PartnerBankProvider
        if (!['banksuite', 'kuda', 'qore', 'generic_mfb'].includes(provider)) {
            return NextResponse.json(
                { error: 'provider must be one of: banksuite, kuda, qore, generic_mfb' },
                { status: 400 }
            )
        }

        const updated = setPartnerBankRuntimeOverride({
            provider,
            ...(body.bankName ? { bankName: String(body.bankName).trim() } : {}),
            ...(body.bankCode ? { bankCode: String(body.bankCode).trim() } : {}),
            ...(body.apiBaseUrl ? { apiBaseUrl: String(body.apiBaseUrl).trim() } : {}),
            ...(body.escrowAccountNumber ? { escrowAccountNumber: String(body.escrowAccountNumber).trim() } : {}),
        })

        return NextResponse.json({
            success: true,
            partnerBank: updated,
            supportedProviders: listSupportedPartnerBanks(),
        })
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message || 'Failed to update partner bank configuration' },
            { status: 500 }
        )
    }
}
