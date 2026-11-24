import type { ExecutionEnvironment } from '../types/executor'
import { getPayload } from 'payload'
import config from '@payload-config'
import { executeResolvedEndpoint } from '../utils/apiResolver'

/**
 * API_SWITCH Executor — failover chain across active providers sharing a `groupTag`.
 * Fixed with `overrideAccess: true` and unified `executeResolvedEndpoint()` auth/OlivePay handling.
 */
export async function ApiSwitchExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const groupTag = env.getInput('groupTag') as string
    const endpointPath = env.getInput('endpoint') as string
    const method = ((env.getInput('method') as string) || 'POST').toUpperCase()
    const rawBody = env.getInput('body')

    if (!groupTag || !endpointPath) {
        env.log.error('ApiSwitch: groupTag and endpoint are required')
        return false
    }

    const parsedBody =
        typeof rawBody === 'string'
            ? (() => {
                  try {
                      return JSON.parse(rawBody)
                  } catch {
                      return {}
                  }
              })()
            : rawBody || {}

    const payload = await getPayload({ config })
    const providersRes = await payload.find({
        collection: 'service-providers',
        where: {
            and: [{ groupTag: { equals: groupTag } }, { isActive: { equals: true } }],
        },
        sort: 'priority',
        limit: 10,
        overrideAccess: true,
    })

    const providers = providersRes.docs as any[]
    if (providers.length === 0) {
        env.log.error(`ApiSwitch: no active providers found for groupTag "${groupTag}"`)
        return false
    }

    env.log.info(`ApiSwitch: found ${providers.length} provider(s) for group "${groupTag}"`)

    for (const provider of providers) {
        env.log.info(`ApiSwitch: trying provider "${provider.name}" (priority ${provider.priority})`)
        try {
            const result = await executeResolvedEndpoint(
                {
                    name: `ApiSwitch:${provider.slug}:${endpointPath}`,
                    provider,
                    method,
                    path: endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`,
                    authOverride: 'INHERIT',
                },
                {
                    body: method === 'GET' ? undefined : parsedBody,
                    query: method === 'GET' ? parsedBody : undefined,
                    idempotencyKey: parsedBody?.idempotencyKey || `${env.executionId}_${provider.slug}`,
                }
            )

            if (result.ok) {
                env.log.info(`ApiSwitch: success via "${provider.name}" (HTTP ${result.status})`)
                env.setOutput('response', result.data)
                env.setOutput('activeProvider', provider.slug)
                env.setOutput('statusCode', result.status)
                return true
            }
            env.log.warn(`ApiSwitch: "${provider.name}" returned HTTP ${result.status}. Trying next...`)
        } catch (err: any) {
            env.log.warn(`ApiSwitch: "${provider.name}" error: ${err.message}. Trying next...`)
        }
    }

    env.log.error(`ApiSwitch: all ${providers.length} provider(s) for "${groupTag}" failed`)
    return false
}
