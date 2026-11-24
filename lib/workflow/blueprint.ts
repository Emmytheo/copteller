import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'
import { upsertVaultSecret } from '@/lib/workflow/secrets/secretResolver'

/**
 * Blueprint Ingestion Engine
 *
 * Provides `ingestBlueprint()` — the declarative provisioner for API integrations.
 * Resolves all symbolic references (names/slugs) and upserts Secrets, ServiceProviders,
 * Endpoints (preserving authOverride/authQueryParamKey/authBodyFieldKey!), and ProviderMappings.
 */

export interface BlueprintEndpoint {
    name: string
    description?: string
    path: string
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
    status?: 'active' | 'deprecated' | 'draft'
    authOverride?:
        | 'INHERIT'
        | 'NONE'
        | 'API_KEY'
        | 'BEARER'
        | 'HEADER'
        | 'BASIC'
        | 'OAUTH2'
        | 'QUERY_PARAM'
        | 'BODY_FIELD'
        | 'OLIVEPAY_PUBLIC_BEARER'
        | 'OLIVEPAY_JWT'
        | 'OLIVEPAY_JWT_HMAC'
    authQueryParamKey?: string
    authBodyFieldKey?: string
    headers?: Array<{ key: string; value: string }>
    queryParamsSchema?: {
        type: 'object'
        properties: Record<string, { type: string; description?: string; enum?: string[]; source?: string }>
        required?: string[]
    }
    bodySchema?: {
        type: 'object'
        properties: Record<string, { type: string; description?: string; enum?: string[] }>
        required?: string[]
        amountsInKobo?: boolean
    }
    responseSchema?: {
        successPath?: string
        successValue?: string | boolean
        dataPath?: string
        outputs?: Record<string, string>
    }
}

export interface BlueprintMapping {
    internalName: string
    syncEndpoint?: string
    syncKeyPath?: string
    matchOn?: string
    externalCode?: string
    schemaMapping?: Record<string, string>
}

export interface BlueprintProvider {
    name: string
    slug: string
    description?: string
    category: 'SMS' | 'EMAIL' | 'PAYMENT' | 'KYC' | 'CREDIT_BUREAU' | 'WEBHOOK' | 'CUSTOM'
    baseUrl: string
    authType:
        | 'NONE'
        | 'API_KEY'
        | 'BEARER'
        | 'HEADER'
        | 'QUERY_PARAM'
        | 'BASIC'
        | 'OAUTH2'
        | 'OLIVEPAY_PUBLIC_BEARER'
        | 'OLIVEPAY_JWT'
        | 'OLIVEPAY_JWT_HMAC'
    secretName?: string
    secondarySecretName?: string
    webhookSecretName?: string
    defaultHeaders?: Array<{ key: string; value: string }>
    healthCheckUrl?: string
    metadata?: Record<string, any>
    priority?: number
    groupTag?: string
}

export interface BlueprintSDL {
    apiVersion: 'v1'
    name: string
    description?: string
    provider: BlueprintProvider
    endpoints: BlueprintEndpoint[]
    mappings?: BlueprintMapping[]
}

type IngestResult = {
    provider: { id: string; name: string; upserted: 'created' | 'updated' }
    secrets: Array<{ id: number; name: string; created: boolean }>
    endpoints: Array<{ id: string; name: string; upserted: 'created' | 'updated' }>
    mappings: Array<{ id: string; name: string; upserted: 'created' | 'updated' }>
    errors: string[]
}

export async function ingestBlueprint(sdl: BlueprintSDL, payload: any): Promise<IngestResult> {
    await ensureOlivePayTables().catch(() => {})

    const result: IngestResult = {
        provider: { id: '', name: sdl.provider.name, upserted: 'created' },
        secrets: [],
        endpoints: [],
        mappings: [],
        errors: [],
    }

    // ── 1. Provision Vault Secrets (Primary, Secondary, Webhook) ─────────────
    let primarySecretId: number | null = null
    let secondarySecretId: number | null = null
    let webhookSecretId: number | null = null

    const provisionSecret = async (
        secretName: string | undefined,
        category: string,
        envKey?: string
    ): Promise<number | null> => {
        if (!secretName) return null
        try {
            const envVal = envKey ? process.env[envKey]?.trim() : undefined
            const valueToStore =
                envVal || `PLACEHOLDER_FOR_${secretName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`
            const saved = await upsertVaultSecret({
                name: secretName,
                category,
                value: valueToStore,
                description: `Vault credential for Blueprint "${sdl.name}". Replace placeholder in Superadmin Vault.`,
                preserveExistingNonPlaceholder: true,
            })
            result.secrets.push(saved)
            return saved.id
        } catch (e: any) {
            result.errors.push(`Failed to provision secret "${secretName}": ${e.message}`)
            return null
        }
    }

    primarySecretId = await provisionSecret(sdl.provider.secretName, 'API_KEY', sdl.provider.secretName)
    secondarySecretId = await provisionSecret(
        sdl.provider.secondarySecretName,
        'API_KEY',
        sdl.provider.secondarySecretName
    )
    webhookSecretId = await provisionSecret(
        sdl.provider.webhookSecretName,
        'WEBHOOK_SECRET',
        sdl.provider.webhookSecretName
    )

    // ── 2. Upsert Service Provider ───────────────────────────────────────────
    let providerId = ''
    const mergedMetadata = {
        ...(sdl.provider.metadata || {}),
        ...(secondarySecretId ? { secondarySecretId, secondarySecretName: sdl.provider.secondarySecretName } : {}),
        ...(webhookSecretId ? { webhookSecretId, webhookSecretName: sdl.provider.webhookSecretName } : {}),
    }

    const providerData = {
        name: sdl.provider.name,
        slug: sdl.provider.slug,
        description: sdl.provider.description,
        category: sdl.provider.category,
        baseUrl: sdl.provider.baseUrl,
        authType: sdl.provider.authType,
        ...(primarySecretId ? { secret: primarySecretId } : {}),
        defaultHeaders: sdl.provider.defaultHeaders ?? [],
        healthCheckUrl: sdl.provider.healthCheckUrl,
        metadata: mergedMetadata,
        priority: sdl.provider.priority ?? 1,
        groupTag: sdl.provider.groupTag,
        isActive: true,
    }

    try {
        const existingProvider = await payload.find({
            collection: 'service-providers',
            where: { slug: { equals: sdl.provider.slug } },
            limit: 1,
            overrideAccess: true,
        })

        if (existingProvider.docs.length > 0) {
            const updated = await payload.update({
                collection: 'service-providers',
                id: existingProvider.docs[0].id,
                data: providerData,
                overrideAccess: true,
            })
            providerId = updated.id
            result.provider = { id: String(providerId), name: sdl.provider.name, upserted: 'updated' }
        } else {
            const created = await payload.create({
                collection: 'service-providers',
                data: providerData,
                overrideAccess: true,
            })
            providerId = created.id
            result.provider = { id: String(providerId), name: sdl.provider.name, upserted: 'created' }
        }
    } catch (e: any) {
        result.errors.push(`Provider upsert failed: ${e.message}`)
        return result
    }

    // ── 3. Upsert Endpoints (including authOverride & auth keys!) ────────────
    const endpointIdByName: Record<string, string> = {}

    for (const ep of sdl.endpoints) {
        const endpointData: Record<string, any> = {
            name: ep.name,
            description: ep.description,
            provider: providerId,
            method: ep.method,
            path: ep.path,
            status: ep.status ?? 'active',
            authOverride: ep.authOverride ?? 'INHERIT',
            ...(ep.authQueryParamKey ? { authQueryParamKey: ep.authQueryParamKey } : {}),
            ...(ep.authBodyFieldKey ? { authBodyFieldKey: ep.authBodyFieldKey } : {}),
            headers: ep.headers ?? [],
            queryParamsSchema: ep.queryParamsSchema,
            bodySchema: ep.bodySchema,
            responseSchema: ep.responseSchema,
        }

        try {
            const existing = await payload.find({
                collection: 'endpoints',
                where: {
                    and: [
                        { name: { equals: ep.name } },
                        { provider: { equals: providerId } },
                    ],
                },
                limit: 1,
                overrideAccess: true,
            })

            let endpointId: string
            if (existing.docs.length > 0) {
                const updated = await payload.update({
                    collection: 'endpoints',
                    id: existing.docs[0].id,
                    data: endpointData,
                    overrideAccess: true,
                })
                endpointId = String(updated.id)
                result.endpoints.push({ id: endpointId, name: ep.name, upserted: 'updated' })
            } else {
                const created = await payload.create({
                    collection: 'endpoints',
                    data: endpointData,
                    overrideAccess: true,
                })
                endpointId = String(created.id)
                result.endpoints.push({ id: endpointId, name: ep.name, upserted: 'created' })
            }
            endpointIdByName[ep.name] = endpointId
        } catch (e: any) {
            result.errors.push(`Endpoint "${ep.name}" upsert failed: ${e.message}`)
        }
    }

    // ── 4. Upsert Provider Mappings ──────────────────────────────────────────
    for (const mapping of sdl.mappings ?? []) {
        let syncEndpointId: string | null = null

        if (mapping.syncEndpoint) {
            syncEndpointId = endpointIdByName[mapping.syncEndpoint] ?? null
            if (!syncEndpointId) {
                result.errors.push(
                    `Mapping "${mapping.internalName}": syncEndpoint "${mapping.syncEndpoint}" not found in this blueprint.`
                )
            }
        }

        const autoSyncConfig = syncEndpointId
            ? {
                  enabled: true,
                  syncEndpoint: syncEndpointId,
                  syncKeyPath: mapping.syncKeyPath,
                  matchOn: mapping.matchOn,
              }
            : { enabled: false }

        const mappingData = {
            internalName: mapping.internalName,
            provider: providerId,
            externalCode: mapping.externalCode,
            schemaMapping: mapping.schemaMapping,
            autoSyncConfig,
        }

        try {
            const existing = await payload.find({
                collection: 'provider-mappings',
                where: {
                    and: [
                        { internalName: { equals: mapping.internalName } },
                        { provider: { equals: providerId } },
                    ],
                },
                limit: 1,
                overrideAccess: true,
            })

            if (existing.docs.length > 0) {
                const updated = await payload.update({
                    collection: 'provider-mappings',
                    id: existing.docs[0].id,
                    data: mappingData,
                    overrideAccess: true,
                })
                result.mappings.push({ id: String(updated.id), name: mapping.internalName, upserted: 'updated' })
            } else {
                const created = await payload.create({
                    collection: 'provider-mappings',
                    data: mappingData,
                    overrideAccess: true,
                })
                result.mappings.push({ id: String(created.id), name: mapping.internalName, upserted: 'created' })
            }
        } catch (e: any) {
            result.errors.push(`Mapping "${mapping.internalName}" upsert failed: ${e.message}`)
        }
    }

    return result
}
