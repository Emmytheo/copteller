import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function getVaultEncryptionKey(): Buffer {
    const raw = process.env.WORKFLOW_ENCRYPTION_KEY || ''
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
        return Buffer.from(raw, 'hex')
    }
    const fallbackSeed = process.env.PAYLOAD_SECRET || process.env.ADMIN_SECRET
    if (!fallbackSeed) {
        throw new Error('WORKFLOW_ENCRYPTION_KEY (or PAYLOAD_SECRET) is required to encrypt vault secrets.')
    }
    return crypto.createHash('sha256').update(`copteller-vault:${fallbackSeed}`).digest()
}

function encryptVaultValue(plaintext: string): { ciphertext: string; iv: string; tag: string } {
    const key = getVaultEncryptionKey()
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
    }
}

function maskPreview(val?: string | null, isEncrypted?: boolean): string {
    if (isEncrypted) return 'aes256gcm:••••••••••••••••'
    if (!val) return '••••••••••••••••'
    if (val.length <= 8) return '••••••••'
    return `${val.slice(0, 6)}••••••••••••${val.slice(-2)}`
}

/**
 * GET /api/copteller/superadmin/vault
 * Fetches masked vault secret metadata and rotation/audit history.
 * Plaintext secrets are NEVER returned on GET.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const secretsRes = await queryCopteller(`
            SELECT id, name, category, description,
                   (encrypted_value IS NOT NULL AND iv IS NOT NULL AND tag IS NOT NULL) AS encrypted,
                   CASE WHEN encrypted_value IS NOT NULL THEN NULL ELSE LEFT(COALESCE(value, ''), 6) END AS legacy_prefix,
                   last_rotated_at, created_at, updated_at
            FROM copteller.secrets
            ORDER BY created_at DESC
        `)

        const sanitizedSecrets = secretsRes.rows.map((row) => ({
            id: row.id,
            name: row.name,
            category: row.category,
            description: row.description,
            encrypted: Boolean(row.encrypted),
            value: row.encrypted
                ? 'aes256gcm:••••••••••••••••'
                : row.legacy_prefix
                    ? `${row.legacy_prefix}••••••••••••`
                    : '••••••••••••••••',
            masked_value: row.encrypted
                ? 'aes256gcm:••••••••••••••••'
                : maskPreview(row.legacy_prefix, false),
            last_rotated_at: row.last_rotated_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }))

        const eventsRes = await queryCopteller(`
            SELECT id, action, entity_type, entity_id, metadata, created_at
            FROM copteller.copteller_audit_logs
            WHERE action LIKE '%WEBHOOK%' OR action LIKE '%SECRET%' OR action LIKE '%API%'
            ORDER BY created_at DESC
            LIMIT 15
        `)

        return NextResponse.json({
            success: true,
            secrets: sanitizedSecrets,
            events: eventsRes.rows,
        })
    } catch (error: any) {
        console.error('[Superadmin Vault GET] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/superadmin/vault
 * Encrypts and stores a new credential/API key using AES-256-GCM (never stores plaintext in `value`).
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const body = await req.json()
        const { name, category = 'API_KEY', description = '', value, webhookUrl = '' } = body

        if (!name || !value) {
            return NextResponse.json({ error: 'Name and key value are required' }, { status: 400 })
        }

        const { ciphertext, iv, tag } = encryptVaultValue(String(value))

        const insertRes = await queryCopteller(`
            INSERT INTO copteller.secrets (
                name, category, description, value, encrypted_value, iv, tag,
                last_rotated_at, created_at, updated_at
            ) VALUES (
                $1, $2, $3, NULL, $4, $5, $6, NOW(), NOW(), NOW()
            ) RETURNING id, name, category, description, last_rotated_at, created_at, updated_at
        `, [String(name).trim(), category, description, ciphertext, iv, tag])

        const secret = insertRes.rows[0]

        await queryCopteller(`
            INSERT INTO copteller.copteller_audit_logs (
                actor_id, actor_role, actor_name, action, entity_type, entity_id,
                metadata, created_at, updated_at
            ) VALUES (
                $1, 'superadmin', $2, 'SECRET_KEY_ADDED', 'SECRET', $3,
                $4, NOW(), NOW()
            )
        `, [
            auth.userId,
            auth.email || 'Superadmin',
            String(secret.id),
            JSON.stringify({ name: secret.name, category: secret.category, encrypted: true, webhookUrl }),
        ])

        return NextResponse.json({
            success: true,
            secret: { ...secret, encrypted: true, value: 'aes256gcm:••••••••••••••••' },
        })
    } catch (error: any) {
        console.error('[Superadmin Vault POST] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/superadmin/vault
 * Cryptographically rotates a secret key, encrypts it with AES-256-GCM, clears plaintext `value`,
 * records rotation history, and returns the rotated key ONCE to the caller.
 */
export async function PATCH(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const body = await req.json()
        const { id, prefix = 'sk_live_' } = body

        if (!id) {
            return NextResponse.json({ error: 'Secret ID is required' }, { status: 400 })
        }

        const newSecret = `${prefix}${crypto.randomBytes(24).toString('hex')}`
        const { ciphertext, iv, tag } = encryptVaultValue(newSecret)

        const isNumericId = /^\d+$/.test(String(id))
        const updateRes = await queryCopteller(
            isNumericId
                ? `UPDATE copteller.secrets
                   SET value = NULL, encrypted_value = $1, iv = $2, tag = $3,
                       last_rotated_at = NOW(), updated_at = NOW()
                   WHERE id = $4
                   RETURNING id, name, category, description, last_rotated_at, created_at, updated_at`
                : `UPDATE copteller.secrets
                   SET value = NULL, encrypted_value = $1, iv = $2, tag = $3,
                       last_rotated_at = NOW(), updated_at = NOW()
                   WHERE name = $4
                   RETURNING id, name, category, description, last_rotated_at, created_at, updated_at`,
            [ciphertext, iv, tag, isNumericId ? Number(id) : String(id)]
        )

        const updated = updateRes.rows[0]
        if (!updated) {
            return NextResponse.json({ error: 'Secret not found' }, { status: 404 })
        }

        const rotationId = `rot_${Date.now()}`
        await queryCopteller(`
            INSERT INTO copteller.secrets_rotation_history (
                _order, _parent_id, id, rotated_at, note
            ) VALUES (
                1, $1, $2, NOW(), 'AES-256-GCM cryptographic key rotation executed from Superadmin Vault'
            )
        `, [updated.id, rotationId]).catch(() => {})

        await queryCopteller(`
            INSERT INTO copteller.copteller_audit_logs (
                actor_id, actor_role, actor_name, action, entity_type, entity_id,
                metadata, created_at, updated_at
            ) VALUES (
                $1, 'superadmin', $2, 'SECRET_KEY_ROTATED', 'SECRET', $3,
                $4, NOW(), NOW()
            )
        `, [
            auth.userId,
            auth.email || 'Superadmin',
            String(updated.id),
            JSON.stringify({ name: updated.name, encrypted: true, rotated_at: new Date().toISOString() }),
        ])

        return NextResponse.json({
            success: true,
            rotatedKey: newSecret,
            secret: { ...updated, encrypted: true, value: 'aes256gcm:••••••••••••••••' },
        })
    } catch (error: any) {
        console.error('[Superadmin Vault PATCH] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
