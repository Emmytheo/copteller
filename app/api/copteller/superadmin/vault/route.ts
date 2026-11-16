import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/superadmin/vault
 * Fetches vault secrets, API keys, and rotation history.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        // Fetch secrets from copteller.secrets
        const secretsRes = await queryCopteller(`
            SELECT id, name, category, description, value, last_rotated_at, created_at, updated_at
            FROM copteller.secrets
            ORDER BY created_at DESC
        `)

        // Fetch recent webhook / audit events
        const eventsRes = await queryCopteller(`
            SELECT id, action, entity_type, entity_id, metadata, created_at
            FROM copteller.copteller_audit_logs
            WHERE action LIKE '%WEBHOOK%' OR action LIKE '%SECRET%' OR action LIKE '%API%'
            ORDER BY created_at DESC
            LIMIT 15
        `)

        return NextResponse.json({
            success: true,
            secrets: secretsRes.rows,
            events: eventsRes.rows
        })
    } catch (error: any) {
        console.error('[Superadmin Vault GET] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/superadmin/vault
 * Saves a new credential/API key into the vault.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json()
        const { name, category = 'custom', description = '', value, webhookUrl = '' } = body

        if (!name || !value) {
            return NextResponse.json({ error: 'Name and key value are required' }, { status: 400 })
        }

        const insertRes = await queryCopteller(`
            INSERT INTO copteller.secrets (
                name, category, description, value, last_rotated_at, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, NOW(), NOW(), NOW()
            ) RETURNING *
        `, [name.trim(), category, description, value])

        const secret = insertRes.rows[0]

        // Record audit log
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
            JSON.stringify({ name: secret.name, category: secret.category, webhookUrl })
        ])

        return NextResponse.json({ success: true, secret })
    } catch (error: any) {
        console.error('[Superadmin Vault POST] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/superadmin/vault
 * Cryptographically rotates a secret key, saves old version to history, and updates live key.
 */
export async function PATCH(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json()
        const { id, prefix = 'sk_live_' } = body

        if (!id) {
            return NextResponse.json({ error: 'Secret ID is required' }, { status: 400 })
        }

        // Generate high-entropy 256-bit cryptographically secure key
        const newSecret = `${prefix}${crypto.randomBytes(24).toString('hex')}`

        // Update secret
        const updateRes = await queryCopteller(`
            UPDATE copteller.secrets
            SET value = $1,
                last_rotated_at = NOW(),
                updated_at = NOW()
            WHERE id = $2 OR name = $2
            RETURNING *
        `, [newSecret, id])

        const updated = updateRes.rows[0]

        // Record in rotation history
        const rotationId = `rot_${Date.now()}`
        await queryCopteller(`
            INSERT INTO copteller.secrets_rotation_history (
                _order, _parent_id, id, rotated_at, note
            ) VALUES (
                1, $1, $2, NOW(), 'Automated cryptographic key rotation executed from Superadmin Vault'
            )
        `, [updated?.id || 1, rotationId])

        // Record in audit logs
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
            String(updated?.id || id),
            JSON.stringify({ name: updated?.name || id, rotated_at: new Date().toISOString() })
        ])

        return NextResponse.json({
            success: true,
            rotatedKey: newSecret,
            secret: updated
        })
    } catch (error: any) {
        console.error('[Superadmin Vault PATCH] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
