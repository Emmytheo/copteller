import { getPayloadClient } from '@/lib/payload'
import { decryptSecret, encryptSecret } from './encryption'

/**
 * Resolve a secret from the vault by Payload document ID OR by exact secret name.
 * Returns the decrypted plaintext value — only available server-side.
 */
export async function resolveSecret(secretIdOrName: string): Promise<string> {
    if (!secretIdOrName) {
        throw new Error('Secret identifier is required')
    }

    const isNumericId = /^\d+$/.test(String(secretIdOrName).trim())

    // 1. Try Payload Local API when given an ID
    if (isNumericId) {
        try {
            const payload = await getPayloadClient()
            const secret = (await payload.findByID({
                collection: 'secrets',
                id: secretIdOrName,
                overrideAccess: true,
            })) as any

            if (secret && secret.encryptedValue && secret.iv && secret.tag) {
                return await decryptSecret(secret.encryptedValue, secret.iv, secret.tag)
            }
        } catch {
            // Fall through to direct PG lookup
        }
    }

    // 2. Direct PostgreSQL lookup from copteller.secrets (supports BOTH id and name)
    try {
        const { queryCopteller } = await import('@/lib/copteller/pg')
        const res = isNumericId
            ? await queryCopteller(
                  `SELECT encrypted_value, iv, tag, value FROM copteller.secrets WHERE id = $1 LIMIT 1`,
                  [Number(secretIdOrName)]
              )
            : await queryCopteller(
                  `SELECT encrypted_value, iv, tag, value FROM copteller.secrets WHERE LOWER(name) = LOWER($1) ORDER BY updated_at DESC LIMIT 1`,
                  [String(secretIdOrName).trim()]
              )

        if (res.rows.length > 0) {
            const row = res.rows[0]
            if (row.encrypted_value && row.iv && row.tag) {
                return await decryptSecret(row.encrypted_value, row.iv, row.tag)
            }
            if (row.value) return String(row.value)
        }
    } catch (err: any) {
        console.warn('[resolveSecret] Direct DB lookup failed:', err.message)
    }

    throw new Error(`Secret "${secretIdOrName}" not found or missing encrypted payload`)
}

/**
 * Resolve a secret by exact name, returning null (instead of throwing) if missing or still a placeholder.
 */
export async function resolveSecretByName(name: string): Promise<string | null> {
    try {
        const val = await resolveSecret(name)
        if (!val || val.startsWith('PLACEHOLDER_FOR_')) return null
        return val
    } catch {
        return null
    }
}

/**
 * Upsert an encrypted secret in copteller.secrets by name (used by Blueprints & Vault API).
 */
export async function upsertVaultSecret(params: {
    name: string
    value: string
    category?: string
    description?: string
    preserveExistingNonPlaceholder?: boolean
}): Promise<{ id: number; name: string; created: boolean }> {
    const { queryCopteller } = await import('@/lib/copteller/pg')
    const validCategories = ['API_KEY', 'QORE_API_TOKEN', 'SMTP', 'OAUTH_TOKEN', 'DATABASE_URI', 'WEBHOOK_SECRET', 'CUSTOM']
    const safeCategory = validCategories.includes(params.category || '') ? params.category! : 'API_KEY'

    const existing = await queryCopteller(
        `SELECT id, name, encrypted_value, iv, tag FROM copteller.secrets WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [params.name.trim()]
    )

    if (existing.rows.length > 0) {
        const row = existing.rows[0]
        if (params.preserveExistingNonPlaceholder && row.encrypted_value && row.iv && row.tag) {
            try {
                const current = await decryptSecret(row.encrypted_value, row.iv, row.tag)
                if (current && !current.startsWith('PLACEHOLDER_FOR_')) {
                    return { id: Number(row.id), name: row.name, created: false }
                }
            } catch {
                // Existing ciphertext unreadable — overwrite cleanly
            }
        }

        const { ciphertext, iv, tag } = await encryptSecret(params.value)
        await queryCopteller(
            `UPDATE copteller.secrets
             SET value = NULL, encrypted_value = $1, iv = $2, tag = $3,
                 category = COALESCE($4, category),
                 description = COALESCE(NULLIF($5, ''), description),
                 last_rotated_at = NOW(), updated_at = NOW()
             WHERE id = $6`,
            [ciphertext, iv, tag, safeCategory, params.description || '', row.id]
        )
        return { id: Number(row.id), name: row.name, created: false }
    }

    const { ciphertext, iv, tag } = await encryptSecret(params.value)
    const inserted = await queryCopteller(
        `INSERT INTO copteller.secrets (name, category, description, value, encrypted_value, iv, tag, last_rotated_at, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, $4, $5, $6, NOW(), NOW(), NOW())
         RETURNING id, name`,
        [params.name.trim(), safeCategory, params.description || '', ciphertext, iv, tag]
    )
    return { id: Number(inserted.rows[0].id), name: inserted.rows[0].name, created: true }
}

/**
 * Resolve a secret and parse it as JSON (useful for SMTP credentials stored as JSON objects).
 */
export async function resolveSecretAsJson(secretId: string): Promise<Record<string, string>> {
    const value = await resolveSecret(secretId)
    try {
        return JSON.parse(value)
    } catch {
        return { value }
    }
}
