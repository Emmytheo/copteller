import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function hashPin(pin: string): string {
    const salt = process.env.COPTELLER_PIN_SALT || 'copteller_secure_pin_salt_v1'
    return crypto.createHash('sha256').update(`${pin}:${salt}`).digest('hex')
}

/**
 * GET /api/copteller/security
 * Returns the authenticated user's current security profile:
 * - hasPin: whether a transaction PIN has been set
 * - biometricEnabled: whether biometric authorization is enabled
 * - recentLogs: recent security-related audit logs
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        // 1. Fetch customer details and metadata
        let customer: any = null
        try {
            const custRes = await queryCopteller(`
                SELECT id, first_name, last_name, email, phone_number, metadata
                FROM copteller.customers
                WHERE (supabase_id = $1 OR lower(email) = lower($2))
                LIMIT 1
            `, [auth.userId, auth.email])
            customer = custRes.rows[0]
        } catch (e: any) {
            console.warn('[Copteller Security GET] Customer query warning:', e.message)
        }

        const metadata = customer?.metadata || {}
        const hasPin = Boolean(metadata.pin_hash)
        const biometricEnabled = metadata.biometric_enabled !== false // Default true for mobile/biometrics

        // 2. Fetch recent security logs
        let recentLogs: any[] = []
        if (customer) {
            try {
                const logsRes = await queryCopteller(`
                    SELECT id, action, entity_type, ip_address, created_at, metadata
                    FROM copteller.copteller_audit_logs
                    WHERE actor_id = $1 OR entity_id = $2
                      AND action IN ('SECURITY_PIN_UPDATE', 'SECURITY_PIN_SET', 'BIOMETRICS_TOGGLE', 'CARD_PIN_RESET')
                    ORDER BY created_at DESC
                    LIMIT 5
                `, [auth.userId, String(customer.id)])
                recentLogs = logsRes.rows
            } catch {}
        }

        return NextResponse.json({
            success: true,
            hasPin,
            biometricEnabled,
            recentLogs
        })
    } catch (error: any) {
        console.error('[Copteller Security GET] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/security
 * Updates or sets the 4-digit transaction authorization PIN.
 * Persists hashed PIN to customer metadata and smart_cards.pin_hash,
 * and records an immutable entry in copteller_audit_logs.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json()
        const { newPin, confirmPin } = body

        if (!newPin || !confirmPin) {
            return NextResponse.json({ error: 'New PIN and confirmation are required.' }, { status: 400 })
        }

        if (!/^\d{4}$/.test(newPin)) {
            return NextResponse.json({ error: 'PIN must be exactly 4 numerical digits.' }, { status: 400 })
        }

        if (newPin !== confirmPin) {
            return NextResponse.json({ error: 'PINs do not match.' }, { status: 400 })
        }

        // 1. Resolve customer
        const custRes = await queryCopteller(`
            SELECT id, first_name, last_name, email, metadata
            FROM copteller.customers
            WHERE (supabase_id = $1 OR lower(email) = lower($2))
            LIMIT 1
        `, [auth.userId, auth.email])

        let customer = custRes.rows[0]
        if (!customer) {
            return NextResponse.json({ error: 'Customer profile not found.' }, { status: 404 })
        }

        const hashed = hashPin(newPin)
        const currentMeta = customer.metadata || {}
        const isInitial = !currentMeta.pin_hash
        const actionType = isInitial ? 'SECURITY_PIN_SET' : 'SECURITY_PIN_UPDATE'

        const updatedMeta = {
            ...currentMeta,
            pin_hash: hashed,
            pin_updated_at: new Date().toISOString()
        }

        // 2. Update customer record
        await queryCopteller(`
            UPDATE copteller.customers
            SET metadata = $1, updated_at = NOW()
            WHERE id = $2
        `, [JSON.stringify(updatedMeta), customer.id])

        // 3. Sync PIN hash across customer's smart cards for unified switch validation
        await queryCopteller(`
            UPDATE copteller.smart_cards
            SET pin_hash = $1, updated_at = NOW()
            WHERE customer_id = $2 OR user_id = $3
        `, [hashed, customer.id, auth.userId])

        // 4. Record audit log
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
        const userAgent = req.headers.get('user-agent') || 'Copteller Web Client'
        const actorName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || auth.email

        await queryCopteller(`
            INSERT INTO copteller.copteller_audit_logs (
                actor_id, actor_role, actor_name, action, entity_type, entity_id,
                before_state, after_state, ip_address, user_agent, metadata, created_at, updated_at
            ) VALUES (
                $1, 'member', $2, $3, 'CUSTOMER_SECURITY', $4,
                $5, $6, $7, $8, $9, NOW(), NOW()
            )
        `, [
            auth.userId,
            actorName,
            actionType,
            String(customer.id),
            JSON.stringify({ hasPin: !isInitial }),
            JSON.stringify({ hasPin: true, updatedAt: new Date().toISOString() }),
            ip,
            userAgent,
            JSON.stringify({
                event: 'Transaction authorization PIN updated',
                channel: 'Web Portal',
                verified: true
            })
        ])

        return NextResponse.json({
            success: true,
            message: 'Transaction authorization PIN updated successfully!'
        })
    } catch (error: any) {
        console.error('[Copteller Security POST] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/security
 * Toggles biometric verification state for the member.
 */
export async function PATCH(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json()
        const { biometricEnabled } = body

        if (typeof biometricEnabled !== 'boolean') {
            return NextResponse.json({ error: 'biometricEnabled boolean is required.' }, { status: 400 })
        }

        const custRes = await queryCopteller(`
            SELECT id, first_name, last_name, metadata
            FROM copteller.customers
            WHERE (supabase_id = $1 OR lower(email) = lower($2))
            LIMIT 1
        `, [auth.userId, auth.email])

        const customer = custRes.rows[0]
        if (!customer) {
            return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
        }

        const currentMeta = customer.metadata || {}
        const updatedMeta = {
            ...currentMeta,
            biometric_enabled: biometricEnabled,
            biometric_updated_at: new Date().toISOString()
        }

        await queryCopteller(`
            UPDATE copteller.customers
            SET metadata = $1, updated_at = NOW()
            WHERE id = $2
        `, [JSON.stringify(updatedMeta), customer.id])

        // Audit log
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
        const userAgent = req.headers.get('user-agent') || 'Copteller Web Client'
        const actorName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || auth.email

        await queryCopteller(`
            INSERT INTO copteller.copteller_audit_logs (
                actor_id, actor_role, actor_name, action, entity_type, entity_id,
                before_state, after_state, ip_address, user_agent, metadata, created_at, updated_at
            ) VALUES (
                $1, 'member', $2, 'BIOMETRICS_TOGGLE', 'CUSTOMER_SECURITY', $3,
                $4, $5, $6, $7, $8, NOW(), NOW()
            )
        `, [
            auth.userId,
            actorName,
            String(customer.id),
            JSON.stringify({ biometricEnabled: currentMeta.biometric_enabled }),
            JSON.stringify({ biometricEnabled }),
            ip,
            userAgent,
            JSON.stringify({ event: `Biometric verification toggled to ${biometricEnabled}` })
        ])

        return NextResponse.json({
            success: true,
            biometricEnabled,
            message: `Biometric verification ${biometricEnabled ? 'activated' : 'disabled'}.`
        })
    } catch (error: any) {
        console.error('[Copteller Security PATCH] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
