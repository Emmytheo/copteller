import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { executeResolvedEndpoint } from '@/lib/workflow/utils/apiResolver'
import { requireCoptellerRole } from '@/lib/copteller/auth'

/**
 * POST /api/endpoints/test-runner
 * Interactive Endpoint Test Console runner used in /copteller/superadmin/endpoints/[id].
 * Supports {pathVar} interpolation, Idempotency-Key headers, OlivePay JWT + HMAC signing,
 * Sandbox Testing Rail execution, and secret-redacted debug URLs.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const payload = await getPayload({ config })
        const body = await req.json()
        const {
            endpointConfig,
            pathParams = {},
            query = {},
            body: reqBody = {},
            idempotencyKey,
            forceSandbox = false,
        } = body

        if (!endpointConfig || !endpointConfig.provider) {
            return NextResponse.json({ error: 'Invalid endpoint configuration provided.' }, { status: 400 })
        }

        const providerId =
            typeof endpointConfig.provider === 'object'
                ? endpointConfig.provider.id
                : endpointConfig.provider
        const provider = await payload.findByID({
            collection: 'service-providers',
            id: providerId,
            depth: 0,
            overrideAccess: true,
        })

        const hydratedEndpoint = {
            ...endpointConfig,
            provider,
        }

        const result = await executeResolvedEndpoint(hydratedEndpoint, {
            pathParams,
            query,
            body: reqBody,
            idempotencyKey: idempotencyKey || undefined,
            forceSandbox: Boolean(forceSandbox),
        })

        return NextResponse.json({
            status: result.status,
            ok: result.ok,
            time: result.timeMs,
            railMode: result.railMode || 'direct_http',
            responseCode: result.responseCode,
            data: result.data,
            mappedOutputs: result.mappedOutputs,
            _debug: {
                resolvedUrl: result.resolvedUrl,
                method: endpointConfig.method,
            },
        })
    } catch (e: any) {
        return NextResponse.json(
            { error: e.message || 'Server error executing endpoint test' },
            { status: 500 }
        )
    }
}
