import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { executeResolvedEndpoint } from '@/lib/workflow/utils/apiResolver'
import { getCoptellerAuth } from '@/lib/copteller/auth'

/**
 * POST /api/endpoints/execute
 * Unified dynamic API Endpoint execution route supporting:
 *  - Path parameter interpolation ({id}, {reference}, {transactionId})
 *  - Provider & Endpoint auth modes including OLIVEPAY_PUBLIC_BEARER, OLIVEPAY_JWT, OLIVEPAY_JWT_HMAC
 *  - Idempotency-Key forwarding & Sandbox Testing Rail passthrough
 * Accessible to authenticated Copteller users (superadmin, bank_staff, or form-event callers).
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const payload = await getPayload({ config })
        const body = await req.json().catch(() => ({}))
        const {
            endpointId,
            dynamicPayload = {},
            pathParams,
            query,
            body: reqBody,
            idempotencyKey,
            forceSandbox,
        } = body

        if (!endpointId) {
            return NextResponse.json({ error: 'Missing endpointId' }, { status: 400 })
        }

        // Resolve by numeric ID or symbolic name
        let endpointRes: any = null
        if (/^\d+$/.test(String(endpointId))) {
            endpointRes = await payload
                .findByID({ collection: 'endpoints', id: Number(endpointId), depth: 2, overrideAccess: true })
                .catch(() => null)
        }
        if (!endpointRes) {
            const byName = await payload.find({
                collection: 'endpoints',
                where: { name: { equals: String(endpointId) } },
                depth: 2,
                limit: 1,
                overrideAccess: true,
            })
            endpointRes = byName.docs[0] || null
        }

        if (!endpointRes) {
            return NextResponse.json({ error: `Endpoint "${endpointId}" not found` }, { status: 404 })
        }

        // Restrict non-admin callers to GET/read or name-enquiry/lookup safe endpoints
        const isElevated = auth.role === 'superadmin' || auth.role === 'bank_staff'
        const isSafeLookup =
            endpointRes.method === 'GET' ||
            /enquiry|lookup|verify|validate|fee-estimate|banks/i.test(
                `${endpointRes.name || ''} ${endpointRes.path || ''}`
            )
        if (!isElevated && !isSafeLookup) {
            return NextResponse.json(
                { error: 'Direct mutation endpoint execution requires superadmin or bank_staff role.' },
                { status: 403 }
            )
        }

        const result = await executeResolvedEndpoint(endpointRes, {
            pathParams,
            query,
            body: reqBody,
            dynamicPayload,
            idempotencyKey,
            forceSandbox: Boolean(forceSandbox),
        })

        if (!result.ok) {
            return NextResponse.json(
                {
                    error: 'Endpoint execution failed',
                    status: result.status,
                    responseCode: result.responseCode,
                    railMode: result.railMode,
                    details: result.data,
                },
                { status: result.status >= 400 && result.status < 600 ? result.status : 502 }
            )
        }

        return NextResponse.json({
            ...(typeof result.data === 'object' && result.data !== null && !Array.isArray(result.data)
                ? result.data
                : { data: result.data }),
            _meta: {
                status: result.status,
                timeMs: result.timeMs,
                railMode: result.railMode,
                responseCode: result.responseCode,
                mappedOutputs: result.mappedOutputs,
            },
        })
    } catch (e: any) {
        return NextResponse.json(
            { error: 'Internal server error executing endpoint', details: e.message },
            { status: 500 }
        )
    }
}
