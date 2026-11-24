import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'
import { encryptSecret } from '@/lib/workflow/secrets/encryption'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const VALID_SECRET_CATEGORIES = new Set([
    'API_KEY',
    'QORE_API_TOKEN',
    'SMTP',
    'OAUTH_TOKEN',
    'DATABASE_URI',
    'WEBHOOK_SECRET',
    'CUSTOM',
])

function normalizeCategory(raw?: string): string {
    const upper = String(raw || 'API_KEY').trim().toUpperCase()
    if (VALID_SECRET_CATEGORIES.has(upper)) return upper
    if (upper.includes('WEBHOOK')) return 'WEBHOOK_SECRET'
    if (upper.includes('OAUTH')) return 'OAUTH_TOKEN'
    if (upper.includes('SMTP') || upper.includes('EMAIL')) return 'SMTP'
    if (upper.includes('QORE')) return 'QORE_API_TOKEN'
    if (upper.includes('DB') || upper.includes('DATABASE')) return 'DATABASE_URI'
    return 'API_KEY'
}

/**
 * GET /api/copteller/superadmin/vault
 * Fetches masked AES-256-GCM vault secrets, real OlivePay webhook delivery logs, and rotation audit history.
 * Plaintext secrets are NEVER returned on GET.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        await ensureOlivePayTables().catch(() => {})

        const [secretsRes, auditRes, webhookRes, providersRes] = await Promise.all([
            queryCopteller(`
                SELECT id, name, category, description,
                       (encrypted_value IS NOT NULL AND iv IS NOT NULL AND tag IS NOT NULL) AS encrypted,
                       expires_at, last_rotated_at, created_at, updated_at
                FROM copteller.secrets
                ORDER BY updated_at DESC NULLS LAST, created_at DESC
            `),
            queryCopteller(`
                SELECT id, actor_name, action, entity_type, entity_id, metadata, created_at
                FROM copteller.copteller_audit_logs
                WHERE action LIKE '%WEBHOOK%' OR action LIKE '%SECRET%' OR action LIKE '%API%' OR action LIKE '%OLIVEPAY%'
                ORDER BY created_at DESC
                LIMIT 25
            `).catch(() => ({ rows: [] as any[] })),
            queryCopteller(`
                SELECT id, event_type, dedupe_reference, signature_valid, processing_status, error_message, rail_mode, processed_at, created_at
                FROM copteller.olivepay_webhook_events
                ORDER BY created_at DESC
                LIMIT 40
            `).catch(() => ({ rows: [] as any[] })),
            queryCopteller(`
                SELECT id, name, slug, secret_id, metadata
                FROM copteller.service_providers
            `).catch(() => ({ rows: [] as any[] })),
        ])

        const providerLinksBySecret = new Map<string, string[]>()
        for (const p of providersRes.rows) {
            const linkedKeys = [
                p.secret_id ? String(p.secret_id) : null,
                p.metadata?.secondarySecretId ? String(p.metadata.secondarySecretId) : null,
                p.metadata?.webhookSecretId ? String(p.metadata.webhookSecretId) : null,
            ].filter(Boolean) as string[]
            for (const sid of linkedKeys) {
                const list = providerLinksBySecret.get(sid) || []
                if (!list.includes(p.name)) list.push(p.name)
                providerLinksBySecret.set(sid, list)
            }
        }

        const sanitizedSecrets = secretsRes.rows.map((row) => ({
            id: String(row.id),
            name: row.name,
            category: row.category || 'API_KEY',
            description: row.description || '',
            encrypted: Boolean(row.encrypted),
            masked_value: row.encrypted ? 'aes256gcm:••••••••••••••••' : 'unencrypted:••••••••',
            linkedProviders: providerLinksBySecret.get(String(row.id)) || [],
            expires_at: row.expires_at,
            last_rotated_at: row.last_rotated_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }))

        return NextResponse.json({
            success: true,
            secrets: sanitizedSecrets,
            webhooks: webhookRes.rows,
            events: auditRes.rows,
        })
    } catch (error: any) {
        console.error('[Superadmin Vault GET] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/superadmin/vault
 * Encrypts and stores a new credential using canonical AES-256-GCM (never stores plaintext in `value`).
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const body = await req.json()
        const { name, category = 'API_KEY', description = '', value } = body

        if (!name || !value) {
            return NextResponse.json({ error: 'Secret name and value are required' }, { status: 400 })
        }

        const safeCategory = normalizeCategory(category)
        const { ciphertext, iv, tag } = await encryptSecret(String(value).trim())

        const insertRes = await queryCopteller(
            `INSERT INTO copteller.secrets (
                name, category, description, value, encrypted_value, iv, tag,
                last_rotated_at, created_at, updated_at
            ) VALUES (
                $1, $2, $3, NULL, $4, $5, $6, NOW(), NOW(), NOW()
            ) RETURNING id, name, category, description, last_rotated_at, created_at, updated_at`,
            [String(name).trim(), safeCategory, String(description || ''), ciphertext, iv, tag]
        )

        const secret = insertRes.rows[0]

        await queryCopteller(
            `INSERT INTO copteller.copteller_audit_logs (
                actor_id, actor_role, actor_name, action, entity_type, entity_id,
                metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, 'SECRET_KEY_ADDED', 'SECRET', $4, $5, NOW(), NOW())`,
            [
                auth.userId,
                auth.role,
                auth.displayName || auth.email || 'Superadmin',
                String(secret.id),
                JSON.stringify({ name: secret.name, category: secret.category, encrypted: true }),
            ]
        ).catch(() => {})

        return NextResponse.json({
            success: true,
            secret: { ...secret, id: String(secret.id), encrypted: true, masked_value: 'aes256gcm:••••••••••••••••' },
        })
    } catch (error: any) {
        console.error('[Superadmin Vault POST] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * PUT /api/copteller/superadmin/vault
 * Updates/replaces an existing secret's encrypted value in-place (for third-party keys like OlivePay
 * public/secret/rotated webhook secret) without breaking provider foreign-key links!
 */
export async function PUT(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const body = await req.json()
        const { id, name, value, category, description } = body

        if (!id && !name) {
            return NextResponse.json({ error: 'Secret id or name is required' }, { status: 400 })
        }
        if (!value || !String(value).trim()) {
            return NextResponse.json({ error: 'New secret value is required' }, { status: 400 })
        }

        const { ciphertext, iv, tag } = await encryptSecret(String(value).trim())
        const isNumericId = id !== undefined && /^\d+$/.test(String(id))

        const updateRes = await queryCopteller(
            isNumericId
                ? `UPDATE copteller.secrets
                   SET value = NULL, encrypted_value = $1, iv = $2, tag = $3,
                       category = COALESCE($4, category),
                       description = COALESCE(NULLIF($5, ''), description),
                       last_rotated_at = NOW(), updated_at = NOW()
                   WHERE id = $6
                   RETURNING id, name, category, description, last_rotated_at, created_at, updated_at`
                : `UPDATE copteller.secrets
                   SET value = NULL, encrypted_value = $1, iv = $2, tag = $3,
                       category = COALESCE($4, category),
                       description = COALESCE(NULLIF($5, ''), description),
                       last_rotated_at = NOW(), updated_at = NOW()
                   WHERE LOWER(name) = LOWER($6)
                   RETURNING id, name, category, description, last_rotated_at, created_at, updated_at`,
            [
                ciphertext,
                iv,
                tag,
                category ? normalizeCategory(category) : null,
                description || '',
                isNumericId ? Number(id) : String(name || id).trim(),
            ]
        )

        const updated = updateRes.rows[0]
        if (!updated) {
            return NextResponse.json({ error: 'Secret not found' }, { status: 404 })
        }

        await queryCopteller(
            `INSERT INTO copteller.copteller_audit_logs (
                actor_id, actor_role, actor_name, action, entity_type, entity_id,
                metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, 'SECRET_VALUE_UPDATED', 'SECRET', $4, $5, NOW(), NOW())`,
            [
                auth.userId,
                auth.role,
                auth.displayName || auth.email || 'Superadmin',
                String(updated.id),
                JSON.stringify({ name: updated.name, category: updated.category, updated_in_place: true }),
            ]
        ).catch(() => {})

        return NextResponse.json({
            success: true,
            secret: { ...updated, id: String(updated.id), encrypted: true, masked_value: 'aes256gcm:••••••••••••••••' },
        })
    } catch (error: any) {
        console.error('[Superadmin Vault PUT] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/superadmin/vault
 * Cryptographically generates and rotates an internal secret key using canonical AES-256-GCM,
 * returning the newly generated key ONCE to the caller.
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
        const { ciphertext, iv, tag } = await encryptSecret(newSecret)

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
                   WHERE LOWER(name) = LOWER($4)
                   RETURNING id, name, category, description, last_rotated_at, created_at, updated_at`,
            [ciphertext, iv, tag, isNumericId ? Number(id) : String(id)]
        )

        const updated = updateRes.rows[0]
        if (!updated) {
            return NextResponse.json({ error: 'Secret not found' }, { status: 404 })
        }

        await queryCopteller(
            `INSERT INTO copteller.secrets_rotation_history (
                _order, _parent_id, id, rotated_at, note
            ) VALUES (1, $1, $2, NOW(), 'AES-256-GCM cryptographic key rotation from Superadmin Vault')`,
            [updated.id, `rot_${Date.now()}`]
        ).catch(() => {})

        await queryCopteller(
            `INSERT INTO copteller.copteller_audit_logs (
                actor_id, actor_role, actor_name, action, entity_type, entity_id,
                metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, 'SECRET_KEY_ROTATED', 'SECRET', $4, $5, NOW(), NOW())`,
            [
                auth.userId,
                auth.role,
                auth.displayName || auth.email || 'Superadmin',
                String(updated.id),
                JSON.stringify({ name: updated.name, encrypted: true, rotated_at: new Date().toISOString() }),
            ]
        ).catch(() => {})

        return NextResponse.json({
            success: true,
            rotatedKey: newSecret,
            secret: { ...updated, id: String(updated.id), encrypted: true, masked_value: 'aes256gcm:••••••••••••••••' },
        })
    } catch (error: any) {
        console.error('[Superadmin Vault PATCH] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * DELETE /api/copteller/superadmin/vault?id=...
 * Deletes a vault secret after unlinking any provider references.
 */
export async function DELETE(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id || !/^\d+$/.test(id)) {
            return NextResponse.json({ error: 'Valid numeric secret id is required' }, { status: 400 })
        }

        const numId = Number(id)
        await queryCopteller(`UPDATE copteller.service_providers SET secret_id = NULL WHERE secret_id = $1`, [numId]).catch(() => {})
        const delRes = await queryCopteller(`DELETE FROM copteller.secrets WHERE id = $1 RETURNING id, name`, [numId])
        if (delRes.rows.length === 0) {
            return NextResponse.json({ error: 'Secret not found' }, { status: 404 })
        }

        await queryCopteller(
            `INSERT INTO copteller.copteller_audit_logs (
                actor_id, actor_role, actor_name, action, entity_type, entity_id,
                metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, 'SECRET_KEY_DELETED', 'SECRET', $4, $5, NOW(), NOW())`,
            [
                auth.userId,
                auth.role,
                auth.displayName || auth.email || 'Superadmin',
                String(numId),
                JSON.stringify({ name: delRes.rows[0].name }),
            ]
        ).catch(() => {})

        return NextResponse.json({ success: true, deleted: delRes.rows[0] })
    } catch (error: any) {
        console.error('[Superadmin Vault DELETE] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
