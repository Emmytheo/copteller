import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { olivePayClient } from '@/lib/copteller/olivepay-client'
import { ensureMemberOlivePaySubWallet, refreshOlivePaySubWallet } from '@/lib/copteller/olivepay-sync'

export const dynamic = 'force-dynamic'

const ALLOWED_DOC_TYPES = new Set(['proof_of_address', 'source_of_funds', 'government_id', 'selfie'])
const MAX_BYTES = 10 * 1024 * 1024 // 10MB OlivePay hard limit

/**
 * POST /api/copteller/olivepay/tier-upgrade/documents (multipart/form-data)
 * Uploads KYC Tier 3 supporting documents (<=10MB) to OlivePay SubWallet API.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const formData = await req.formData()
        const requestId = String(formData.get('requestId') || '').trim()
        const documentType = String(formData.get('documentType') || '').trim()
        const file = formData.get('file') as File | null

        if (!requestId) {
            return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
        }
        if (!ALLOWED_DOC_TYPES.has(documentType)) {
            return NextResponse.json(
                { error: 'documentType must be one of: proof_of_address, source_of_funds, government_id, selfie' },
                { status: 400 }
            )
        }
        if (!file) {
            return NextResponse.json({ error: 'file upload is required' }, { status: 400 })
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ error: 'File exceeds OlivePay 10MB maximum upload size.' }, { status: 413 })
        }

        const sw = await ensureMemberOlivePaySubWallet({
            userId: auth.userId,
            email: auth.email,
            fullName: auth.displayName,
        })

        const res = await olivePayClient.uploadTier3Document({
            subWalletId: sw.olivepay_sub_wallet_id,
            requestId,
            documentType: documentType as any,
            file,
            fileName: file.name,
        })

        if (!res.ok) {
            return NextResponse.json({ error: res.message || 'Document upload failed' }, { status: 400 })
        }

        const refreshed = await refreshOlivePaySubWallet(sw.olivepay_sub_wallet_id)

        return NextResponse.json({
            success: true,
            railMode: res.railMode,
            data: res.data,
            subwallet: refreshed || sw,
            message: res.message || 'Tier 3 KYC document uploaded successfully.',
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Document upload error' }, { status: 500 })
    }
}
