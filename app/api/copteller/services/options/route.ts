import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/copteller/db'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { resolveSecret } from '@/lib/workflow/secrets/secretResolver'
import { NIGERIAN_BANKS } from '@/lib/data/nigerian-banks'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const { searchParams } = new URL(req.url)
        const endpointId = searchParams.get('endpointId')
        const textKey = searchParams.get('textKey') || 'name'
        const valueKey = searchParams.get('valueKey') || 'code'

        if (!endpointId) {
            return NextResponse.json({ error: 'endpointId is required' }, { status: 400 })
        }

        const payload = await getDb()

        // 1. Fetch Endpoint specification
        const endpointDoc = await payload.findByID({
            collection: 'endpoints',
            id: endpointId,
            depth: 2,
            overrideAccess: true,
        }).catch(() => null)

        if (!endpointDoc) {
            // Fallback for banks lookup if endpoint isn't seeded
            if (endpointId === 'banks' || endpointId === '2') {
                return NextResponse.json({
                    success: true,
                    options: NIGERIAN_BANKS.map(b => ({ label: b.name, value: b.code }))
                })
            }
            return NextResponse.json({ error: 'Endpoint specification not found' }, { status: 404 })
        }

        const provider = typeof endpointDoc.provider === 'object' ? endpointDoc.provider : null

        // If this is the "Get Bank List" endpoint (Endpoint 2)
        if (endpointDoc.name?.toLowerCase().includes('bank list') || endpointDoc.id === 2 || endpointDoc.id === '2') {
            return NextResponse.json({
                success: true,
                options: NIGERIAN_BANKS.map(b => ({ label: b.name, value: b.code }))
            })
        }

        // 2. Resolve Vault Credentials
        let secretValue: string | null = null
        if (provider?.secret) {
            const secretId = typeof provider.secret === 'object' ? provider.secret.id : provider.secret
            try {
                secretValue = await resolveSecret(String(secretId))
            } catch (err: any) {
                console.warn('[Options API] Failed to decrypt vault secret:', err.message)
            }
        }

        // 3. Compose External URL
        const basePath = provider?.baseUrl?.replace(/\/$/, '') || ''
        const sep = endpointDoc.path.startsWith('/') ? '' : '/'
        const url = `${basePath}${sep}${endpointDoc.path}`

        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

        if (secretValue && provider?.authType === 'BEARER') {
            headers['Authorization'] = `Bearer ${secretValue}`
        }

        // 4. Fetch options from external endpoint with safe timeout
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 3500)

            const apiRes = await fetch(url, {
                method: endpointDoc.method || 'GET',
                headers,
                signal: controller.signal
            })
            clearTimeout(timeout)

            if (apiRes.ok) {
                const data = await apiRes.json()
                const items = Array.isArray(data) ? data : (data.data || data.items || data.result || [])
                
                const formatted = items.map((item: any) => ({
                    label: String(item[textKey] || item.label || item.name || item.title || item[valueKey] || ''),
                    value: String(item[valueKey] || item.value || item.id || item.code || item[textKey] || '')
                })).filter((o: any) => o.label && o.value)

                if (formatted.length > 0) {
                    return NextResponse.json({ success: true, options: formatted })
                }
            }
        } catch (fetchErr: any) {
            console.warn(`[Options API] Provider fetch failed: ${fetchErr.message}. Using structured fallbacks.`)
        }

        // 5. Fallback if offline/sandbox
        return NextResponse.json({
            success: true,
            options: [
                { label: 'Partner MFB Primary Settlement', value: '044' },
                { label: 'Access Bank', value: '044' },
                { label: 'First Bank of Nigeria', value: '011' },
                { label: 'Zenith Bank', value: '057' },
                { label: 'United Bank for Africa (UBA)', value: '033' },
                { label: 'Guaranty Trust Bank (GTB)', value: '058' }
            ]
        })
    } catch (err: any) {
        console.error('Options API error:', err)
        return NextResponse.json({ error: err.message || 'Failed to fetch options' }, { status: 500 })
    }
}
