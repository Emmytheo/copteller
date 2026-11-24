import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { ensureOlivePayTables, getPlatformConfig, setPlatformConfig } from '@/lib/copteller/olivepay-schema'

export const dynamic = 'force-dynamic'

function normalizeRelId(val: any): number | null {
    if (val === undefined || val === null || val === '' || val === 'none') return null
    if (typeof val === 'object' && val.id) return /^\d+$/.test(String(val.id)) ? Number(val.id) : null
    return /^\d+$/.test(String(val)) ? Number(val) : null
}

const DEFAULT_OLIVEPAY_BINDINGS = {
    subwalletCreateEndpoint: '',
    subwalletTransferEndpoint: '',
    payoutEndpoint: '',
    subwalletPayoutEndpoint: '',
    subwalletFundingEndpoint: '',
    nameEnquiryEndpoint: '',
    feeEstimateEndpoint: '',
    virtualAccountEndpoint: '',
    escrowHoldEndpoint: '',
    collectionsInitEndpoint: '',
    bankListEndpoint: '',
    grantDisbursementWorkflow: '',
    escrowSettlementWorkflow: '',
    memberOnboardingWorkflow: '',
}

export async function GET(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        await ensureOlivePayTables().catch(() => {})
        const payload = await getDb()

        let settings: any = null
        try {
            settings = await payload.findGlobal({
                slug: 'site-settings',
                depth: 1,
                overrideAccess: true,
            })
        } catch {}

        const olivepayBindings = await getPlatformConfig('olivepay_action_bindings', DEFAULT_OLIVEPAY_BINDINGS)

        if (!settings) {
            settings = {
                siteTitle: 'Copteller Cooperative OS',
                copteller: {
                    masterFundingAccount: '',
                    kycEndpoint: null,
                    depositEndpoint: null,
                    transferEndpoint: null,
                    creditScoreEndpoint: null,
                    autoDeductionWorkflow: null,
                    cbnReportingWorkflow: null,
                },
            }
        }

        return NextResponse.json({
            success: true,
            settings: {
                ...settings,
                copteller: {
                    ...(settings.copteller || {}),
                    olivepayBindings,
                },
            },
        })
    } catch (error: any) {
        console.error('Copteller GET infrastructure settings error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        await ensureOlivePayTables()
        const body = await req.json().catch(() => ({}))
        const { copteller } = body

        if (!copteller) {
            return NextResponse.json({ error: 'copteller settings payload required' }, { status: 400 })
        }

        // Persist OlivePay extended action bindings in durable Postgres config table
        if (copteller.olivepayBindings && typeof copteller.olivepayBindings === 'object') {
            await setPlatformConfig('olivepay_action_bindings', copteller.olivepayBindings, auth.email || auth.userId)
        }

        const payload = await getDb()
        let currentSettings: any = null
        try {
            currentSettings = await payload.findGlobal({
                slug: 'site-settings',
                depth: 0,
                overrideAccess: true,
            })
        } catch {}

        // CRITICAL FIX (Phase 0.5): Convert empty strings "" -> null for integer relationship columns!
        const sanitizedCopteller = {
            ...(currentSettings?.copteller || {}),
            ...(copteller.masterFundingAccount !== undefined
                ? { masterFundingAccount: String(copteller.masterFundingAccount || '') }
                : {}),
            kycEndpoint: normalizeRelId(copteller.kycEndpoint),
            depositEndpoint: normalizeRelId(copteller.depositEndpoint),
            transferEndpoint: normalizeRelId(copteller.transferEndpoint),
            creditScoreEndpoint: normalizeRelId(copteller.creditScoreEndpoint),
            autoDeductionWorkflow: normalizeRelId(copteller.autoDeductionWorkflow),
            cbnReportingWorkflow: normalizeRelId(copteller.cbnReportingWorkflow),
        }

        const updatedData = {
            ...(currentSettings || { siteTitle: 'Copteller Cooperative OS' }),
            copteller: sanitizedCopteller,
        }

        let settings: any = updatedData
        try {
            settings = await payload.updateGlobal({
                slug: 'site-settings',
                data: updatedData,
                overrideAccess: true,
            })
        } catch (globalErr: any) {
            // If site-settings global has required sync fields not yet set, still succeed on OlivePay bindings & report warning
            console.warn('[Infrastructure POST] site-settings partial warning:', globalErr.message)
        }

        const olivepayBindings = await getPlatformConfig('olivepay_action_bindings', DEFAULT_OLIVEPAY_BINDINGS)

        return NextResponse.json({
            success: true,
            settings: {
                ...settings,
                copteller: {
                    ...(settings?.copteller || sanitizedCopteller),
                    olivepayBindings,
                },
            },
        })
    } catch (error: any) {
        console.error('Copteller POST infrastructure settings error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
