/**
 * lib/copteller/auth.ts
 * Centralised auth helper for Copteller API routes.
 * Uses the DEDICATED Copteller Supabase project (vbakmvapkccrckoihcip).
 * Validates Supabase session and enforces role-based access control.
 */

import crypto from 'crypto'
import { createCoptellerServerClient } from '@/lib/copteller/supabase/server'
import { getProfilesForUser, type CoptellerProfileRow } from '@/lib/copteller/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export function timingSafeSecretMatch(provided: string | null | undefined, expected: string | undefined): boolean {
    if (!provided || !expected) return false
    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
}

export function isProductionMaintenanceBlocked(): boolean {
    return process.env.NODE_ENV === 'production' && process.env.ALLOW_ADMIN_MAINTENANCE_ENDPOINTS !== 'true'
}

export async function requireCoptellerCronOrAdmin(req: NextRequest): Promise<CoptellerAuthContext | NextResponse> {
    const authHeader = req.headers.get('authorization')
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
    const internalSecret = req.headers.get('x-copteller-internal-secret') || req.headers.get('workflow-admin')

    if (
        timingSafeSecretMatch(bearer, process.env.CRON_SECRET) ||
        timingSafeSecretMatch(bearer, process.env.ADMIN_SECRET) ||
        timingSafeSecretMatch(internalSecret, process.env.ADMIN_SECRET) ||
        timingSafeSecretMatch(internalSecret, process.env.PAYLOAD_SECRET)
    ) {
        return {
            userId: 'system-cron',
            email: 'system@copteller.internal',
            role: 'superadmin',
            displayName: 'Copteller System Scheduler',
        }
    }

    return requireCoptellerRole(req, ['superadmin', 'bank_staff'])
}

export type CoptellerRole = 'member' | 'coop_admin' | 'investor' | 'partner' | 'superadmin' | 'bank_staff'

/** Maps Supabase user metadata role strings to Copteller roles */
const ROLE_ALIASES: Record<string, CoptellerRole> = {
    member: 'member',
    coop_admin: 'coop_admin',
    union_admin: 'coop_admin',
    investor: 'investor',
    partner: 'partner',
    agency: 'partner',
    institution: 'partner',
    ngo: 'partner',
    government: 'partner',
    superadmin: 'superadmin',
    admin: 'superadmin',
    bank_staff: 'bank_staff',
}

export interface CoptellerAuthContext {
    userId: string
    email: string
    role: CoptellerRole
    activeProfileId?: string
    cooperativeId?: string
    cooperativeName?: string
    displayName?: string
}

// Re-export profile types and admin helpers for convenience
export type { CoptellerProfileRow }
export { getProfilesForUser, createProfileForUser } from '@/lib/copteller/supabase/admin'

/**
 * Validates the current session from the Copteller Supabase project
 * and returns the auth context.
 * Throws a 401 response if unauthenticated.
 *
 * The active role is resolved from:
 *   1. The `x-copteller-profile-id` request header (set by client after profile selection)
 *   2. Fallback: user_metadata.role from Copteller Supabase auth
 *   3. Fallback: 'member'
 */
export async function getCoptellerAuth(req: NextRequest): Promise<CoptellerAuthContext | NextResponse> {
    const internalSecret = req.headers.get('x-copteller-internal-secret')
    const hasVerifiedInternalSecret = timingSafeSecretMatch(internalSecret, process.env.ADMIN_SECRET)

    const headerUserId = req.headers.get('x-copteller-user-id')
    let userId = headerUserId
    let email = req.headers.get('x-copteller-user-email') || ''
    let displayName = req.headers.get('x-copteller-user-name') || email
    let verifiedMetadataRole: CoptellerRole | undefined = undefined

    if (!userId || !hasVerifiedInternalSecret) {
        const supabase = await createCoptellerServerClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please sign in to the Copteller platform.' },
                { status: 401 }
            )
        }
        userId = user.id
        email = user.email || ''
        displayName = user.user_metadata?.full_name || user.email
        const rawMetaRole = String(user.user_metadata?.role || '').toLowerCase()
        if (rawMetaRole === 'superadmin' || rawMetaRole === 'bank_staff') {
            verifiedMetadataRole = ROLE_ALIASES[rawMetaRole]
        }
    } else {
        const headerRole = req.headers.get('x-copteller-user-role')
        if (headerRole && ROLE_ALIASES[headerRole]) {
            verifiedMetadataRole = ROLE_ALIASES[headerRole]
        }
    }

    // Check for an active profile header or cookie
    const profileId = req.headers.get('x-copteller-profile-id') || req.cookies.get('copteller_profile_id')?.value

    let role: CoptellerRole = verifiedMetadataRole || 'member'
    let activeProfileId: string | undefined
    let cooperativeId: string | undefined
    let cooperativeName: string | undefined

    const profiles = await getProfilesForUser(userId)

    if (profileId) {
        // Resolve the specific profile ONLY if it belongs to this authenticated user in DB
        const activeProfile = profiles.find(p => p.id === profileId)
        if (activeProfile) {
            role = activeProfile.role
            activeProfileId = activeProfile.id
            cooperativeId = activeProfile.cooperative_id ?? undefined
            cooperativeName = activeProfile.cooperative_name ?? undefined
            displayName = activeProfile.display_name ?? displayName
        }
    }

    // Route-context matching: ONLY switch into a workspace role the user ACTUALLY owns in DB
    if (!activeProfileId) {
        const referer = req.headers.get('referer') || ''
        const findOwned = (roles: CoptellerRole[]) => profiles.find(pr => roles.includes(pr.role))

        const routeProfile = referer.includes('/copteller/superadmin')
            ? findOwned(['superadmin', 'bank_staff'])
            : referer.includes('/copteller/partner')
                ? findOwned(['partner', 'superadmin', 'bank_staff'])
                : referer.includes('/copteller/admin')
                    ? findOwned(['coop_admin', 'superadmin', 'bank_staff'])
                    : referer.includes('/copteller/investor')
                        ? findOwned(['investor', 'superadmin', 'bank_staff'])
                        : undefined

        const resolvedProfile = routeProfile || findOwned(['member']) || profiles[0]
        if (resolvedProfile) {
            role = resolvedProfile.role
            activeProfileId = resolvedProfile.id
            cooperativeId = resolvedProfile.cooperative_id ?? undefined
            cooperativeName = resolvedProfile.cooperative_name ?? undefined
            displayName = resolvedProfile.display_name ?? displayName
        } else {
            role = verifiedMetadataRole || 'member'
        }
    }

    return {
        userId: userId!,
        email: email || '',
        role,
        activeProfileId,
        cooperativeId,
        cooperativeName,
        displayName,
    }
}

/**
 * Middleware helper that requires the caller to have one of the allowed roles.
 * Returns the auth context on success, or a NextResponse error on failure.
 *
 * Usage in a route handler:
 *   const auth = await requireCoptellerRole(req, ['superadmin', 'coop_admin'])
 *   if (auth instanceof NextResponse) return auth
 *   // auth is CoptellerAuthContext here
 */
export async function requireCoptellerRole(
    req: NextRequest,
    allowedRoles: CoptellerRole[]
): Promise<CoptellerAuthContext | NextResponse> {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    if (!allowedRoles.includes(auth.role)) {
        return NextResponse.json(
            {
                error: `Access denied. This endpoint requires one of: [${allowedRoles.join(', ')}]. Your role: ${auth.role}.`,
                requiredRoles: allowedRoles,
                yourRole: auth.role,
            },
            { status: 403 }
        )
    }

    return auth
}

/**
 * Lightweight check: returns true if the current session has one of the given roles.
 * Does NOT return an error response — for use in conditional logic inside handlers.
 */
export async function hasCoptellerRole(
    req: NextRequest,
    allowedRoles: CoptellerRole[]
): Promise<boolean> {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return false
    return allowedRoles.includes(auth.role)
}

/**
 * Returns true if the authenticated user is the admin of the given cooperative,
 * or is a superadmin (can access any cooperative).
 */
export async function canAccessCooperative(
    req: NextRequest,
    cooperativeId: string
): Promise<boolean> {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return false
    if (auth.role === 'superadmin' || auth.role === 'bank_staff') return true
    return auth.role === 'coop_admin' && auth.cooperativeId === cooperativeId
}
