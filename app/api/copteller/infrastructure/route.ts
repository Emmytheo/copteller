import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole } from '@/lib/copteller/auth'

export async function GET(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const payload = await getDb()
        
        // Find or initialize site-settings
        let settings = null
        try {
            settings = await payload.findGlobal({
                slug: 'site-settings',
                depth: 1,
                overrideAccess: true,
            })
        } catch {
            // Global might not be fully initialized yet
        }

        // If settings doesn't exist, we return a fallback structure matching collections config
        if (!settings) {
            settings = {
                siteTitle: 'Partner MFB',
                copteller: {
                    masterFundingAccount: '3000392981',
                    kycEndpoint: null,
                    depositEndpoint: null,
                    transferEndpoint: null,
                    creditScoreEndpoint: null,
                    autoDeductionWorkflow: null,
                    cbnReportingWorkflow: null,
                }
            }
        }

        return NextResponse.json({ success: true, settings })
    } catch (error: any) {
        console.error('Copteller GET infrastructure settings error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const { copteller } = body

        if (!copteller) {
            return NextResponse.json({ error: 'copteller settings payload required' }, { status: 400 })
        }

        const payload = await getDb()

        // Get current site-settings first
        let currentSettings = null
        try {
            currentSettings = await payload.findGlobal({
                slug: 'site-settings',
                depth: 0,
                overrideAccess: true,
            })
        } catch {
            // Ignore
        }

        const updatedData = {
            ...currentSettings,
            copteller: {
                ...currentSettings?.copteller,
                ...copteller,
            }
        }

        const settings = await payload.updateGlobal({
            slug: 'site-settings',
            data: updatedData,
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, settings })
    } catch (error: any) {
        console.error('Copteller POST infrastructure settings error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
