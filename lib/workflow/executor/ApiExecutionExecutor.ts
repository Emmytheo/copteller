import type { ExecutionEnvironment } from '../types/executor'
import { executeResolvedEndpoint } from '../utils/apiResolver'

/**
 * API_EXECUTION Executor — delegates to unified `executeResolvedEndpoint()`.
 * Fixes broken `Object.keys(bodySchema)` bug, supports {pathVar} interpolation,
 * responseSchema output extraction, OlivePay JWT + HMAC-SHA256 signing, and Sandbox Testing Rail!
 */
export async function ApiExecutionExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const endpointId = env.getInput('endpointId')
    const rawPayload = env.getInput('dynamicPayload') || {}
    const dynamicPayload =
        typeof rawPayload === 'string'
            ? (() => {
                  try {
                      return JSON.parse(rawPayload)
                  } catch {
                      return {}
                  }
              })()
            : rawPayload

    if (!endpointId) {
        env.log.error(`API_EXECUTION missing endpointId`)
        return false
    }

    try {
        const payload = env.payload
        let endpointRes: any = null

        if (/^\d+$/.test(String(endpointId))) {
            endpointRes = await payload
                .findByID({ collection: 'endpoints', id: Number(endpointId), depth: 2, overrideAccess: true })
                .catch(() => null)
        }
        if (!endpointRes) {
            const results = await payload.find({
                collection: 'endpoints',
                where: { name: { equals: String(endpointId) } },
                depth: 2,
                limit: 1,
                overrideAccess: true,
            })
            if (results.docs.length > 0) endpointRes = results.docs[0]
        }

        if (!endpointRes) {
            env.log.error(`Endpoint "${endpointId}" not found (ID or Name lookup failed).`)
            return false
        }

        const result = await executeResolvedEndpoint(endpointRes, {
            dynamicPayload,
            idempotencyKey: dynamicPayload?.idempotencyKey || `${env.executionId}_${endpointRes.id}`,
        })

        env.setOutput('statusCode', result.status)
        env.setOutput('response', result.data)
        env.setOutput('success', result.ok)

        // Expose all responseSchema mapped outputs + OlivePay semantic flags directly on node outputs
        for (const [k, v] of Object.entries(result.mappedOutputs || {})) {
            env.setOutput(k, v)
        }

        env.log.info(
            `API_EXECUTION "${endpointRes.name}" [${result.railMode || 'http'}] returned HTTP ${result.status} in ${result.timeMs}ms`
        )

        return result.ok
    } catch (e: any) {
        env.log.error(`API_EXECUTION failed: ${e.message}`)
        return false
    }
}
