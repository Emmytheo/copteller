/**
 * app/api/copteller/profile/route.ts
 *
 * GET  /api/copteller/profile       – current user's profile + cooperative info
 * GET  /api/copteller/profile?all=1 – all copteller_profiles for the current user
 * POST /api/copteller/profile        – create a new profile for the current user
 */

import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth, getProfilesForUser, createProfileForUser } from '@/lib/copteller/auth'
import { getMemberships } from '@/lib/copteller/db'
import type { CoptellerRole } from '@/lib/copteller/auth'

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    // ?all=1 → return the full list of profiles for profile selector
    const { searchParams } = new URL(req.url)
    if (searchParams.get('all') === '1') {
        let profiles = await getProfilesForUser(auth.userId)
        
        // Auto-bootstrap profile if authenticated in Supabase as superadmin/bank_staff but table row doesn't exist yet
        if (profiles.length === 0 && (auth.role === 'superadmin' || auth.role === 'bank_staff')) {
            try {
                const newProfile = await createProfileForUser(auth.userId, auth.role, {
                    display_name: auth.displayName || 'System Admin',
                    onboarding_done: true, // Superadmins do not need the member onboarding wizard
                })
                if (newProfile) {
                    profiles = [newProfile]
                }
            } catch (err) {
                console.error('[Profile Auto-Bootstrap Error]', err)
            }
        }

        return NextResponse.json({ success: true, profiles })
    }

    try {
        let customer: any = null
        try {
            const { queryCopteller } = await import('@/lib/copteller/pg')
            const cRes = await queryCopteller(
                `SELECT * FROM copteller.customers WHERE supabase_id = $1 OR email = $2 LIMIT 1`,
                [auth.userId, auth.email.toLowerCase().trim()]
            )
            if (cRes.rows.length > 0) {
                const row = cRes.rows[0]
                customer = {
                    id: row.id,
                    firstName: row.first_name || auth.displayName?.split(' ')[0] || 'Member',
                    lastName: row.last_name || auth.displayName?.split(' ')[1] || '',
                    email: row.email || auth.email,
                    phone_number: row.phone_number || '0803 000 0000',
                    kyc_status: row.kyc_status || 'active',
                }
            }
        } catch (e: any) {
            console.warn('[Profile Route] Direct SQL customer lookup failed, falling back to Payload:', e.message)
        }

        if (!customer) {
            try {
                const payload = await getDb()
                const customersRes = await payload.find({
                    collection: 'customers',
                    where: {
                        email: { equals: auth.email.toLowerCase().trim() }
                    },
                    limit: 1,
                    overrideAccess: true,
                })
                customer = customersRes.docs[0] || {
                    firstName: auth.displayName?.split(' ')[0] || 'Member',
                    lastName: auth.displayName?.split(' ')[1] || '',
                    email: auth.email,
                    phone_number: '0803 000 0000',
                    kyc_status: 'active',
                }
            } catch {
                customer = {
                    firstName: auth.displayName?.split(' ')[0] || 'Member',
                    lastName: auth.displayName?.split(' ')[1] || '',
                    email: auth.email,
                    phone_number: '0803 000 0000',
                    kyc_status: 'active',
                }
            }
        }

        // Find their active memberships to resolve cooperative
        const membershipsRes = await getMemberships({
            memberId: customer && 'id' in customer ? String(customer.id) : auth.userId,
            status: 'active',
            limit: 1,
        })

        let cooperative: any = null
        if (membershipsRes.docs.length > 0) {
            const m = membershipsRes.docs[0] as any
            if (typeof m.cooperative === 'object' && m.cooperative !== null) {
                cooperative = m.cooperative
            } else if (m.cooperative) {
                try {
                    const { queryCopteller } = await import('@/lib/copteller/pg')
                    const coopRes = await queryCopteller(`SELECT * FROM copteller.cooperatives WHERE id = $1 LIMIT 1`, [m.cooperative])
                    if (coopRes.rows.length > 0) cooperative = coopRes.rows[0]
                } catch {}
            }
        }

        if (!cooperative && auth.cooperativeId) {
            try {
                const { queryCopteller } = await import('@/lib/copteller/pg')
                const coopRes = await queryCopteller(`SELECT * FROM copteller.cooperatives WHERE id = $1 LIMIT 1`, [auth.cooperativeId])
                if (coopRes.rows.length > 0) cooperative = coopRes.rows[0]
            } catch {}
        }

        if (!cooperative) {
            cooperative = {
                id: auth.cooperativeId || '1',
                name: auth.cooperativeName || 'Abia Tricycle Operators Association',
                sector: 'transport',
                status: 'active',
            }
        }

        // Fetch all profiles for the sidebar scope switcher
        const profiles = await getProfilesForUser(auth.userId)

        return NextResponse.json({
            success: true,
            customer,
            cooperative,
            role: auth.role,
            activeProfileId: auth.activeProfileId,
            profiles,
        })
    } catch (error: any) {
        console.error('Copteller profile GET error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json()
        const { role, display_name, cooperative_id, cooperative_name, admin_secret } = body as {
            role: CoptellerRole
            display_name?: string
            cooperative_id?: string
            cooperative_name?: string
            admin_secret?: string
        }

        if (!role) {
            return NextResponse.json({ error: 'role is required' }, { status: 400 })
        }

        const validRoles: CoptellerRole[] = ['member', 'coop_admin', 'investor', 'partner', 'superadmin', 'bank_staff']
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 })
        }

        // Restrict partner, superadmin, and bank_staff roles using ADMIN_SECRET or existing staff privileges
        if (role === 'partner' || role === 'superadmin' || role === 'bank_staff') {
            const systemSecret = process.env.COPTELLER_ADMIN_SECRET || process.env.ADMIN_SECRET
            const isAuthorized =
                auth.role === 'superadmin' ||
                auth.role === 'bank_staff' ||
                Boolean(systemSecret && admin_secret && admin_secret === systemSecret)
            
            if (!isAuthorized) {
                return NextResponse.json({ error: 'Access denied. A valid Admin Secret is required to activate this institutional or staff role.' }, { status: 403 })
            }

            // Elevate role permanently in Supabase auth metadata when provisioned with secret
            if (systemSecret && admin_secret && admin_secret === systemSecret && auth.role !== role) {
                try {
                    const { createCoptellerAdminClient } = require('@/lib/copteller/supabase/admin')
                    const adminClient = createCoptellerAdminClient()
                    await adminClient.auth.admin.updateUserById(auth.userId, {
                        user_metadata: { role }
                    })
                } catch (metaErr) {
                    console.error('[Profile API Elevation] Failed to update Supabase user metadata:', metaErr)
                }
            }
        }

        const profile = await createProfileForUser(auth.userId, role, {
            display_name: display_name || auth.displayName,
            cooperative_id,
            cooperative_name,
            onboarding_done: (role === 'partner' || role === 'superadmin' || role === 'bank_staff') ? true : undefined,
        })

        if (!profile) {
            return NextResponse.json(
                { error: 'Failed to create profile. The profile may already exist for this role.' },
                { status: 409 }
            )
        }

        return NextResponse.json({ success: true, profile }, { status: 201 })
    } catch (error: any) {
        console.error('Copteller profile POST error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
