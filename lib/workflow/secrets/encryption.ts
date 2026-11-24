import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

/**
 * Canonical AES-256-GCM key derivation used by BOTH Payload's Secrets collection
 * AND the Superadmin Vault API. Evaluated dynamically per call so env changes
 * and serverless cold starts never diverge.
 */
export function getVaultEncryptionKey(): Buffer {
    const raw = (process.env.WORKFLOW_ENCRYPTION_KEY || '').trim()
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
        return Buffer.from(raw, 'hex')
    }
    const fallbackSeed = process.env.PAYLOAD_SECRET || process.env.ADMIN_SECRET
    if (!fallbackSeed) {
        throw new Error(
            'WORKFLOW_ENCRYPTION_KEY (64-char hex) or PAYLOAD_SECRET is required for Vault encryption.'
        )
    }
    return crypto.createHash('sha256').update(`copteller-vault:${fallbackSeed}`).digest()
}

/** Encrypt a plaintext string → returns base64-encoded ciphertext, IV and auth tag. */
export async function encryptSecret(plaintext: string): Promise<{
    ciphertext: string
    iv: string
    tag: string
}> {
    const key = getVaultEncryptionKey()
    const iv = crypto.randomBytes(12) // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
    }
}

/** Synchronous variant for callers that cannot await. */
export function encryptSecretSync(plaintext: string): {
    ciphertext: string
    iv: string
    tag: string
} {
    const key = getVaultEncryptionKey()
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
    }
}

/** Decrypt a base64-encoded GCM ciphertext back to plaintext. */
export async function decryptSecret(ciphertext: string, iv: string, tag: string): Promise<string> {
    const key = getVaultEncryptionKey()
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, 'base64')
    )
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
    ])
    return decrypted.toString('utf8')
}
