import type { ExecutionEnvironment } from '../types/executor'
import { executeResolvedEndpoint } from '../utils/apiResolver'

/**
 * API_CALL Executor — fixed to read `provider.secret` (was broken `provider.secretId`),
 * support all auth modes via `executeResolvedEndpoint()`, and transparently handle OlivePay + Sandbox Rail.
 */
export async function ApiCallExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const providerId = env.getInput('providerId') as string
    const endpointPath = env.getInput('endpoint') as string
    const method = ((env.getInput('method') as string) || 'POST').toUpperCase()
    const rawBody = env.getInput('body')
    const extraHeaders = env.getInput('headers')

    if (!providerId || !endpointPath) {
        env.log.error('ApiCall: providerId and endpoint are required')
        return false
    }

    const provider = await env.getProvider(providerId)
    if (!provider) {
        env.log.error(`ApiCall: provider ${providerId} not found`)
        return false
    }
    if (provider.isActive === false) {
        env.log.error(`ApiCall: provider "${provider.name}" is inactive`)
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

    const parsedHeadersObj =
        typeof extraHeaders === 'string'
            ? (() => {
                  try {
                      return JSON.parse(extraHeaders || '{}')
                  } catch {
                      return {}
                  }
              })()
            : extraHeaders || {}

    const syntheticEndpoint = {
        name: `ApiCall:${endpointPath}`,
        provider,
        method,
        path: endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`,
        authOverride: 'INHERIT',
        headers: Object.entries(parsedHeadersObj).map(([key, value]) => ({ key, value: String(value) })),
    }

    try {
        const result = await executeResolvedEndpoint(syntheticEndpoint, {
            body: method === 'GET' ? undefined : parsedBody,
            query: method === 'GET' ? parsedBody : undefined,
            idempotencyKey: parsedBody?.idempotencyKey || `${env.executionId}_apicall`,
        })

        env.setOutput('response', result.data)
        env.setOutput('statusCode', result.status)

        if (!result.ok) {
            env.log.error(`ApiCall: HTTP ${result.status} from ${provider.name}`)
            return false
        }

        env.log.info(`ApiCall: success (HTTP ${result.status}) from ${provider.name} in ${result.timeMs}ms`)
        return true
    } catch (err: any) {
        env.log.error(`ApiCall: execution error: ${err.message}`)
        return false
    }
}
