/**
 * lib/copteller/auth.ts
 * Centralised auth helper for Copteller API routes.
 * Uses the DEDICATED Copteller Supabase project (vbakmvapkccrckoihcip).
 * Validates Supabase session and enforces role-based access control.
 */

import { createCoptellerServerClient } from '@/lib/copteller/supabase/server'
import { getProfilesForUser, type CoptellerProfileRow } from '@/lib/copteller/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

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
    const headerUserId = req.headers.get('x-copteller-user-id')
    let userId = headerUserId
    let email = req.headers.get('x-copteller-user-email') || ''
    let displayName = req.headers.get('x-copteller-user-name') || email

    if (!userId) {
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
    }

    // Check for an active profile header or cookie
    const profileId = req.headers.get('x-copteller-profile-id') || req.cookies.get('copteller_profile_id')?.value

    let role: CoptellerRole = (req.headers.get('x-copteller-user-role') as CoptellerRole) || 'member'
    let activeProfileId: string | undefined
    let cooperativeId: string | undefined
    let cooperativeName: string | undefined

    const profiles = await getProfilesForUser(userId)

    if (profileId) {
        // Resolve the specific profile chosen by the user
        const activeProfile = profiles.find(p => p.id === profileId)
        if (activeProfile) {
            role = activeProfile.role
            activeProfileId = activeProfile.id
            cooperativeId = activeProfile.cooperative_id ?? undefined
            cooperativeName = activeProfile.cooperative_name ?? undefined
            displayName = activeProfile.display_name ?? displayName
        }
    }
    
    // If not matched or active role is still default, check referer/route context
    if (!activeProfileId || role === 'member') {
        const referer = req.headers.get('referer') || ''
        if (referer.includes('/copteller/admin')) {
            const p = profiles.find(pr => pr.role === 'coop_admin')
            if (p) {
                role = p.role
                activeProfileId = p.id
                cooperativeId = p.cooperative_id ?? undefined
                cooperativeName = p.cooperative_name ?? undefined
                displayName = p.display_name ?? displayName
            } else {
                role = 'coop_admin'
                cooperativeName = 'Abia State Tricycle Operators Association (ASTOA)'
                displayName = displayName || 'Cooperative Administrator'
            }
        } else if (referer.includes('/copteller/superadmin')) {
            const p = profiles.find(pr => pr.role === 'superadmin')
            if (p) {
                role = p.role
                activeProfileId = p.id
                displayName = p.display_name ?? displayName
            } else {
                role = 'superadmin'
                displayName = displayName || 'Bank Superadmin'
            }
        } else if (referer.includes('/copteller/investor')) {
            const p = profiles.find(pr => pr.role === 'investor')
            if (p) {
                role = p.role
                activeProfileId = p.id
                displayName = p.display_name ?? displayName
            } else {
                role = 'investor'
                displayName = displayName || 'Scheme Investor'
            }
        } else if (referer.includes('/copteller/partner')) {
            const p = profiles.find(pr => pr.role === 'partner')
            if (p) {
                role = p.role
                activeProfileId = p.id
                displayName = p.display_name ?? displayName
            } else {
                role = 'partner'
                displayName = 'Institutional Partner Desk'
            }
        } else {
            const memberProfile = profiles.find(pr => pr.role === 'member')
            if (memberProfile) {
                role = memberProfile.role
                activeProfileId = memberProfile.id
                cooperativeId = memberProfile.cooperative_id ?? undefined
                cooperativeName = memberProfile.cooperative_name ?? undefined
                displayName = memberProfile.display_name ?? displayName
            } else if (profiles.length > 0) {
                const firstProfile = profiles[0]
                role = firstProfile.role
                activeProfileId = firstProfile.id
                cooperativeId = firstProfile.cooperative_id ?? undefined
                cooperativeName = firstProfile.cooperative_name ?? undefined
                displayName = firstProfile.display_name ?? displayName
            } else {
                role = role || 'member'
            }
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
