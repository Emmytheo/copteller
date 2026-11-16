import { getPayloadClient } from '@/lib/payload'
import { decryptSecret } from './encryption'

/**
 * Resolve a secret from the vault by Payload document ID.
 * Returns the decrypted plaintext value — only available server-side.
 */
export async function resolveSecret(secretId: string): Promise<string> {
    try {
        const payload = await getPayloadClient()
        const secret = await payload.findByID({
            collection: 'secrets',
            id: secretId,
            overrideAccess: true,
        }) as any

        if (secret && secret.encryptedValue && secret.iv && secret.tag) {
            return await decryptSecret(secret.encryptedValue, secret.iv, secret.tag)
        }
    } catch {
        // Fall back to direct database query
    }

    // Direct database query fallback from copteller.secrets
    try {
        const { getCoptellerPool } = await import('@/lib/copteller/pg')
        const pool = getCoptellerPool()
        const numId = /^\d+$/.test(secretId) ? Number(secretId) : null
        const res = await pool.query(
            'SELECT encrypted_value, iv, tag, value FROM copteller.secrets WHERE id = $1',
            [numId || secretId]
        )
        if (res.rows.length > 0) {
            const row = res.rows[0]
            if (row.encrypted_value && row.iv && row.tag) {
                return await decryptSecret(row.encrypted_value, row.iv, row.tag)
            }
            if (row.value) return row.value
        }
    } catch (err: any) {
        console.warn('[resolveSecret] Direct DB lookup failed:', err.message)
    }

    throw new Error(`Secret ${secretId} not found or missing encrypted payload`)
}

/**
 * Resolve a secret and parse it as JSON (useful for SMTP credentials stored as JSON objects).
 */
export async function resolveSecretAsJson(secretId: string): Promise<Record<string, string>> {
    const value = await resolveSecret(secretId)
    try {
        return JSON.parse(value)
    } catch {
        // If not JSON, return it as a single { value } object
        return { value }
    }
}
