import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { probeOlivePayCapabilities } from '@/lib/copteller/olivepay-client'

/**
 * GET /api/endpoints/health/[id]
 * Fixed to use Copteller Superadmin RBAC (`requireCoptellerRole`), handle OlivePay capability probes,
 * and gracefully fall back from HEAD -> GET when REST APIs return 405 Method Not Allowed.
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const { id: endpointId } = await context.params
        const payload = await getPayload({ config })

        const endpoint = (await payload.findByID({
            collection: 'endpoints',
            id: endpointId,
            depth: 1,
            overrideAccess: true,
        })) as any

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
        }

        const provider = endpoint.provider
        if (!provider || typeof provider !== 'object') {
            return NextResponse.json({ error: 'No provider linked to endpoint' }, { status: 400 })
        }

        const start = Date.now()

        // OlivePay native health probe
        if (String(provider.slug || '').toLowerCase() === 'olivepay') {
            const report = await probeOlivePayCapabilities(false)
            const latency = Date.now() - start
            const healthy =
                report.railMode === 'sandbox_simulator' ||
                report.capabilities.jwtAuth.status === 'enabled' ||
                report.capabilities.collections.status === 'enabled'

            await payload.update({
                collection: 'service-providers',
                id: provider.id,
                overrideAccess: true,
                data: {
                    lastHealthStatus: healthy ? 'healthy' : 'degraded',
                    lastHealthCheckedAt: new Date().toISOString(),
                    avgLatencyMs: latency,
                },
            }).catch(() => {})

            return NextResponse.json({
                healthy,
                status: healthy ? 200 : 503,
                latencyMs: latency,
                url: report.credentials.baseUrl,
                olivepayReport: report,
            })
        }

        const checkUrl = provider.healthCheckUrl || provider.baseUrl
        if (!checkUrl) {
            return NextResponse.json({ error: 'No health check URL or base URL found' }, { status: 400 })
        }

        try {
            let res = await fetch(checkUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000),
                headers: { 'User-Agent': 'Copteller-HealthCheck/2.0' },
            })

            // Many REST APIs return 405 on HEAD — retry cleanly with GET
            if (res.status === 405) {
                res = await fetch(checkUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000),
                    headers: { 'User-Agent': 'Copteller-HealthCheck/2.0', Accept: 'application/json' },
                })
            }

            const latency = Date.now() - start
            const isReachable = res.status < 500

            await payload.update({
                collection: 'service-providers',
                id: provider.id,
                overrideAccess: true,
                data: {
                    lastHealthStatus: res.ok ? 'healthy' : isReachable ? 'degraded' : 'down',
                    lastHealthCheckedAt: new Date().toISOString(),
                    avgLatencyMs: latency,
                },
            }).catch(() => {})

            return NextResponse.json({
                healthy: res.ok,
                reachable: isReachable,
                status: res.status,
                latencyMs: latency,
                url: checkUrl,
            })
        } catch (pingError: any) {
            await payload.update({
                collection: 'service-providers',
                id: provider.id,
                overrideAccess: true,
                data: {
                    lastHealthStatus: 'down',
                    lastHealthCheckedAt: new Date().toISOString(),
                },
            }).catch(() => {})

            return NextResponse.json(
                { healthy: false, error: pingError.message, url: checkUrl },
                { status: 502 }
            )
        }
    } catch (error: any) {
        console.error('[HEALTH_CHECK_ERROR]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
