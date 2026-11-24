import {
    dispatchOlivePayEndpoint,
    type OlivePayAuthMode,
} from '@/lib/copteller/olivepay-client'

export function resolvePath(obj: any, path: string): any {
    if (!obj || !path) return undefined
    return path.split('.').reduce((cur, key) => (cur !== null && cur !== undefined ? cur[key] : undefined), obj)
}

/**
 * Redact sensitive query parameters (authToken, token, apiKey, key, secret) from URLs before logging/debugging.
 */
export function redactUrlSecrets(url: string): string {
    try {
        const parsed = new URL(url)
        const sensitive = ['authtoken', 'token', 'apikey', 'api_key', 'secret', 'password', 'private_key']
        for (const k of Array.from(parsed.searchParams.keys())) {
            if (sensitive.includes(k.toLowerCase())) {
                parsed.searchParams.set(k, 'REDACTED')
            }
        }
        return parsed.toString()
    } catch {
        return url.replace(/(authToken|token|apiKey|secret)=[^&]+/gi, '$1=REDACTED')
    }
}

/**
 * Interpolate `{variable}` path parameters in an endpoint path using supplied pathParams / payload maps.
 */
export function interpolatePathParams(
    pathTemplate: string,
    sources: Array<Record<string, any> | undefined | null>
): { resolvedPath: string; consumedKeys: Set<string> } {
    const consumedKeys = new Set<string>()
    const resolvedPath = String(pathTemplate || '').replace(/\{([^}]+)\}/g, (match, rawKey) => {
        const key = String(rawKey).trim()
        const keyLower = key.toLowerCase()
        for (const src of sources) {
            if (!src || typeof src !== 'object') continue
            if (src[key] !== undefined && src[key] !== null && src[key] !== '') {
                consumedKeys.add(key)
                return encodeURIComponent(String(src[key]))
            }
            const ciKey = Object.keys(src).find((k) => k.toLowerCase() === keyLower)
            if (ciKey && src[ciKey] !== undefined && src[ciKey] !== null && src[ciKey] !== '') {
                consumedKeys.add(ciKey)
                return encodeURIComponent(String(src[ciKey]))
            }
        }
        return match
    })
    return { resolvedPath, consumedKeys }
}

export function resolvePayloadValue(key: string, payload: any): any {
    if (!payload || typeof payload !== 'object') return undefined
    if (payload[key] !== undefined) return payload[key]

    const keyLower = key.toLowerCase()
    const match = Object.keys(payload).find((k) => k.toLowerCase() === keyLower)
    if (match !== undefined) return payload[match]

    const aliases: Record<string, string[]> = {
        accountno: ['accountnumber', 'destination_account', 'destinationaccount', 'destinationaccountnumber', 'toaccountnumber', 'account_number', 'account'],
        accountnumber: ['accountno', 'destination_account', 'destinationaccount', 'destinationaccountnumber', 'toaccountnumber', 'account_number', 'account'],
        destinationaccountnumber: ['accountnumber', 'accountno', 'destination_account', 'destinationaccount', 'account_number'],
        bankcode: ['destination_bank_code', 'destinationbankcode', 'bank_code', 'receiverbankcode', 'bank'],
        destinationbankcode: ['bankcode', 'destination_bank_code', 'bank_code', 'receiverbankcode', 'bank'],
        billercode: ['biller_code', 'billercode'],
        customerid: ['customer_id', 'smartcard_number', 'meter_number', 'phone_number'],
        amount: ['amountnaira', 'amount_naira'],
        subwalletid: ['sub_wallet_id', 'walletid', 'wallet_id', 'id'],
    }

    const mappedAliases = aliases[keyLower] || []
    for (const alias of mappedAliases) {
        const aliasMatch = Object.keys(payload).find((k) => k.toLowerCase() === alias)
        if (aliasMatch !== undefined) return payload[aliasMatch]
    }
    return undefined
}

export function resolveQueryParams(
    queryParamsSchema: any,
    callerQuery: Record<string, any>,
    provider: any
): Record<string, string> {
    const resolved: Record<string, string> = {}

    if (queryParamsSchema?.properties) {
        for (const [key, def] of Object.entries(queryParamsSchema.properties as Record<string, any>)) {
            if (def?.source) {
                const sourcePath = String(def.source).replace(/^provider\./, '')
                const injected = resolvePath(provider, sourcePath)
                if (injected !== undefined) {
                    resolved[key] = String(injected)
                }
            }
            const callerVal = resolvePayloadValue(key, callerQuery)
            if (callerVal !== undefined && callerVal !== null && callerVal !== '') {
                resolved[key] = String(callerVal)
            }
        }
    }

    for (const [k, v] of Object.entries(callerQuery || {})) {
        if (v !== undefined && v !== null && v !== '') {
            resolved[k] = String(v)
        }
    }

    return resolved
}

export function getEffectiveAuthMode(provider: any, endpointConfig: any): string {
    const authOverride = endpointConfig?.authOverride ?? 'INHERIT'
    return authOverride && authOverride !== 'INHERIT' ? authOverride : (provider?.authType || 'NONE')
}

export function isOlivePayAuthMode(mode: string): mode is OlivePayAuthMode {
    return mode === 'OLIVEPAY_PUBLIC_BEARER' || mode === 'OLIVEPAY_JWT' || mode === 'OLIVEPAY_JWT_HMAC'
}

export function applyAuthOverride(
    url: string,
    headers: Record<string, string>,
    body: any,
    secretValue: string | null,
    provider: any,
    endpointConfig: any
): { url: string; headers: Record<string, string>; body: any } {
    let finalUrl = url
    let finalBody = typeof body === 'object' && body !== null ? { ...body } : body
    const finalHeaders = { ...headers }

    if (secretValue) {
        const effectiveAuthMode = getEffectiveAuthMode(provider, endpointConfig)

        switch (effectiveAuthMode) {
            case 'BEARER':
            case 'OAUTH2':
                finalHeaders['Authorization'] = `Bearer ${secretValue}`
                break

            case 'BASIC': {
                const encoded = secretValue.includes(':')
                    ? Buffer.from(secretValue).toString('base64')
                    : secretValue
                finalHeaders['Authorization'] = `Basic ${encoded}`
                break
            }

            case 'HEADER': {
                const headerKey =
                    endpointConfig?.authHeaderKey ||
                    provider?.metadata?.authHeaderKey ||
                    'X-API-Key'
                finalHeaders[headerKey] = secretValue
                break
            }

            case 'QUERY_PARAM': {
                const paramKey = endpointConfig?.authQueryParamKey || provider?.authQueryParamKey || 'authToken'
                finalUrl += `${finalUrl.includes('?') ? '&' : '?'}${paramKey}=${encodeURIComponent(secretValue)}`
                break
            }

            case 'BODY_FIELD': {
                const fieldKey = endpointConfig?.authBodyFieldKey || provider?.authBodyFieldKey || 'AuthenticationCode'
                finalBody = { ...(finalBody || {}), [fieldKey]: secretValue }
                break
            }

            case 'API_KEY': {
                const paramKey = endpointConfig?.authQueryParamKey || provider?.authQueryParamKey || 'authToken'
                finalUrl += `${finalUrl.includes('?') ? '&' : '?'}${paramKey}=${encodeURIComponent(secretValue)}`

                if (['POST', 'PUT', 'PATCH'].includes(String(endpointConfig?.method || '').toUpperCase())) {
                    const fieldKey = endpointConfig?.authBodyFieldKey || provider?.authBodyFieldKey || 'AuthenticationCode'
                    finalBody = {
                        ...(finalBody || {}),
                        [fieldKey]: finalBody?.[fieldKey] || secretValue,
                    }
                }
                break
            }

            default:
                break
        }
    }

    return { url: finalUrl, headers: finalHeaders, body: finalBody }
}

/**
 * Extract body fields based on JSON Schema (`bodySchema.properties`) or passthrough when schema is free-form.
 */
export function extractSchemaBody(bodySchema: any, dynamicPayload: any, excludeKeys?: Set<string>): Record<string, any> {
    if (!dynamicPayload || typeof dynamicPayload !== 'object') return {}
    const props = bodySchema?.properties ? Object.keys(bodySchema.properties) : null
    if (props && props.length > 0) {
        const out: Record<string, any> = {}
        for (const key of props) {
            const val = resolvePayloadValue(key, dynamicPayload)
            if (val !== undefined) out[key] = val
        }
        // Preserve explicitly supplied keys not in schema (e.g. metadata, idempotencyKey)
        for (const [k, v] of Object.entries(dynamicPayload)) {
            if (out[k] === undefined && !excludeKeys?.has(k) && v !== undefined) {
                out[k] = v
            }
        }
        return out
    }
    const clean: Record<string, any> = {}
    for (const [k, v] of Object.entries(dynamicPayload)) {
        if (!excludeKeys?.has(k) && v !== undefined) clean[k] = v
    }
    return clean
}

export async function resolveEndpoint(endpoint: any, customParams: Record<string, any> = {}) {
    const provider = typeof endpoint.provider === 'object' ? endpoint.provider : null
    if (!provider) throw new Error('Endpoint must have a hydrated provider')

    const effectiveEndpoint = { ...endpoint, ...(customParams.overrides || {}) }
    const method = String(effectiveEndpoint.method || 'GET').toUpperCase()
    const isBodyless = ['GET', 'HEAD'].includes(method)

    // 1. Interpolate {pathVar} placeholders cleanly
    const { resolvedPath, consumedKeys } = interpolatePathParams(effectiveEndpoint.path || '', [
        customParams.pathParams,
        customParams.query,
        customParams.body,
        customParams.dynamicPayload,
    ])

    // 2. Determine query & body payloads
    const rawQuery = customParams.query ?? (isBodyless ? customParams.dynamicPayload || {} : {})
    const filteredQuery: Record<string, any> = {}
    for (const [k, v] of Object.entries(rawQuery || {})) {
        if (!consumedKeys.has(k) && v !== undefined) filteredQuery[k] = v
    }

    const resolvedQuery = resolveQueryParams(effectiveEndpoint.queryParamsSchema, filteredQuery, provider)
    if (Array.isArray(effectiveEndpoint.queryParams)) {
        effectiveEndpoint.queryParams.forEach((q: any) => {
            if (q.key && q.value && resolvedQuery[q.key] === undefined) {
                resolvedQuery[q.key] = q.value
            }
        })
    }

    const rawBody = !isBodyless
        ? extractSchemaBody(
              effectiveEndpoint.bodySchema,
              customParams.body ?? customParams.dynamicPayload ?? {},
              consumedKeys
          )
        : undefined

    // 3. Build URL & Headers
    const basePath = String(provider.baseUrl ?? '').replace(/\/$/, '')
    const sep = resolvedPath.startsWith('/') ? '' : '/'
    let url = `${basePath}${sep}${resolvedPath}`

    if (Object.keys(resolvedQuery).length > 0) {
        const searchParams = new URLSearchParams()
        Object.entries(resolvedQuery).forEach(([k, v]) => searchParams.append(k, String(v)))
        url += `${url.includes('?') ? '&' : '?'}${searchParams.toString()}`
    }

    const headers: Record<string, string> = { Accept: 'application/json' }
    if (!isBodyless) headers['Content-Type'] = 'application/json'

    if (Array.isArray(provider.defaultHeaders)) {
        provider.defaultHeaders.forEach((h: any) => {
            if (h.key && h.value) headers[h.key] = h.value
        })
    }
    if (Array.isArray(effectiveEndpoint.headers)) {
        effectiveEndpoint.headers.forEach((h: any) => {
            if (h.key && h.value) headers[h.key] = h.value
        })
    }
    if (customParams.idempotencyKey) {
        headers['Idempotency-Key'] = String(customParams.idempotencyKey)
    }

    // 4. Resolve Vault Secret for non-OlivePay modes
    const effectiveAuthMode = getEffectiveAuthMode(provider, effectiveEndpoint)
    let secretValue: string | null = null
    if (!isOlivePayAuthMode(effectiveAuthMode) && effectiveAuthMode !== 'NONE') {
        const { resolveSecret } = await import('@/lib/workflow/secrets/secretResolver')
        const secretRef = provider.secret || provider.secretId
        const secretId = typeof secretRef === 'object' ? secretRef?.id : secretRef
        if (secretId) {
            secretValue = await resolveSecret(String(secretId)).catch(() => null)
        }
    }

    const authData = applyAuthOverride(url, headers, rawBody, secretValue, provider, effectiveEndpoint)

    return {
        url: authData.url,
        resolvedPath,
        method,
        headers: authData.headers,
        query: resolvedQuery,
        body: authData.body,
        effectiveAuthMode,
        providerSlug: provider.slug,
        responseSchema: effectiveEndpoint.responseSchema,
    }
}

/**
 * Unified Endpoint Executor used by:
 *  - POST /api/endpoints/execute
 *  - POST /api/endpoints/test-runner
 *  - ApiExecutionExecutor (workflow nodes)
 *  - GET /api/copteller/services/options
 * Automatically delegates OlivePay endpoints through `dispatchOlivePayEndpoint()`
 * (handling JWT cache, exact-bytes HMAC-SHA256 signing, Vercel static proxy, AND Sandbox Testing Rail!).
 */
export async function executeResolvedEndpoint(
    endpoint: any,
    customParams: {
        pathParams?: Record<string, any>
        query?: Record<string, any>
        body?: Record<string, any>
        dynamicPayload?: Record<string, any>
        idempotencyKey?: string
        forceSandbox?: boolean
        overrides?: Record<string, any>
    } = {}
): Promise<{
    ok: boolean
    status: number
    timeMs: number
    data: any
    raw: any
    mappedOutputs: Record<string, any>
    resolvedUrl: string
    railMode?: string
    responseCode?: string
    isPending?: boolean
    isReplay?: boolean
}> {
    const start = Date.now()
    const resolved = await resolveEndpoint(endpoint, customParams)

    const isOlivePay =
        isOlivePayAuthMode(resolved.effectiveAuthMode) ||
        String(resolved.providerSlug || '').toLowerCase() === 'olivepay'

    if (isOlivePay) {
        const authMode: OlivePayAuthMode = isOlivePayAuthMode(resolved.effectiveAuthMode)
            ? resolved.effectiveAuthMode
            : 'OLIVEPAY_JWT'

        const envelope = await dispatchOlivePayEndpoint({
            path: resolved.resolvedPath,
            method: resolved.method as any,
            authMode,
            query: resolved.query,
            body: resolved.body,
            idempotencyKey:
                customParams.idempotencyKey ||
                customParams.body?.idempotencyKey ||
                customParams.dynamicPayload?.idempotencyKey,
            forceSandbox: customParams.forceSandbox,
        })

        const outputs = resolved.responseSchema?.outputs
            ? resolveResponseOutputs(envelope.raw ?? envelope.data, resolved.responseSchema.outputs)
            : {}

        return {
            ok: envelope.ok,
            status: envelope.httpStatus,
            timeMs: Date.now() - start,
            data: envelope.raw ?? envelope.data,
            raw: envelope.raw,
            mappedOutputs: {
                ...outputs,
                responseCode: envelope.responseCode,
                isPending: envelope.isPending,
                isReplay: envelope.isReplay,
                isTierLimitExceeded: envelope.isTierLimitExceeded,
                isTierLocked: envelope.isTierLocked,
                railMode: envelope.railMode,
            },
            resolvedUrl: redactUrlSecrets(resolved.url),
            railMode: envelope.railMode,
            responseCode: envelope.responseCode,
            isPending: envelope.isPending,
            isReplay: envelope.isReplay,
        }
    }

    const isBodyless = ['GET', 'HEAD'].includes(resolved.method)
    const res = await fetch(resolved.url, {
        method: resolved.method,
        headers: resolved.headers,
        body: isBodyless ? undefined : JSON.stringify(resolved.body ?? {}),
        cache: 'no-store',
        signal: AbortSignal.timeout(25_000),
    })

    const rawText = await res.text()
    let parsed: any = rawText
    try { parsed = JSON.parse(rawText) } catch {}

    const outputs = resolved.responseSchema?.outputs
        ? resolveResponseOutputs(parsed, resolved.responseSchema.outputs)
        : {}

    return {
        ok: res.ok,
        status: res.status,
        timeMs: Date.now() - start,
        data: parsed,
        raw: parsed,
        mappedOutputs: outputs,
        resolvedUrl: redactUrlSecrets(resolved.url),
    }
}

export function applySchemaMapping(data: any, mapping: Record<string, string>): Record<string, any> {
    if (!mapping || Object.keys(mapping).length === 0) return data
    const mapped: Record<string, any> = {}
    for (const [internalKey, externalKey] of Object.entries(mapping)) {
        if (data[internalKey] !== undefined) {
            mapped[externalKey] = data[internalKey]
        }
    }
    return { ...data, ...mapped }
}

export function resolveResponseOutputs(response: any, outputs: Record<string, string>): Record<string, any> {
    if (!outputs || Object.keys(outputs).length === 0) return response
    const results: Record<string, any> = {}
    for (const [outputName, path] of Object.entries(outputs)) {
        let val = resolvePath(response, path)
        if (val === undefined) {
            if (path.startsWith('Payload.')) {
                val = resolvePath(response, path.replace('Payload.', 'Message.')) ?? resolvePath(response, path.replace('Payload.', ''))
            } else if (path.startsWith('Message.')) {
                val = resolvePath(response, path.replace('Message.', 'Payload.')) ?? resolvePath(response, path.replace('Message.', ''))
            } else if (path.startsWith('data.')) {
                val = resolvePath(response, path.replace('data.', ''))
            }
        }
        results[outputName] = val
    }
    return results
}
