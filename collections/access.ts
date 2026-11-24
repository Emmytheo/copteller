import type { Access } from 'payload'
import { timingSafeSecretMatch } from '@/lib/copteller/auth'

/** Grants access only to authenticated Payload admin users. */
export const adminOnly: Access = ({ req }) => {
    return req.user?.role === 'admin'
}

/**
 * Grants access to EITHER:
 *  1. Authenticated Payload CMS admin (`req.user?.role === 'admin'`)
 *  2. Verified internal service call (`x-copteller-internal-secret`)
 *  3. Authenticated Copteller Superadmin / Bank Staff via Copteller Supabase session
 *
 * Fixes 403 Forbidden errors when Superadmin portal UI pages interact with
 * Payload REST endpoints (/api/workflows, /api/endpoints, /api/service-providers, etc.).
 */
export const coptellerAdminAccess: Access = async ({ req }) => {
    if (req.user?.role === 'admin') return true

    try {
        const headers = req.headers
        const internalSecret = headers?.get?.('x-copteller-internal-secret')
        if (
            timingSafeSecretMatch(internalSecret, process.env.ADMIN_SECRET) ||
            timingSafeSecretMatch(internalSecret, process.env.PAYLOAD_SECRET)
        ) {
            return true
        }

        const { createCoptellerServerClient } = await import('@/lib/copteller/supabase/server')
        const { getProfilesForUser } = await import('@/lib/copteller/supabase/admin')

        const supabase = await createCoptellerServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return false

        const metaRole = String(user.user_metadata?.role || '').toLowerCase()
        if (metaRole === 'superadmin' || metaRole === 'admin' || metaRole === 'bank_staff') {
            return true
        }

        const profiles = await getProfilesForUser(user.id)
        return profiles.some((p) => p.role === 'superadmin' || p.role === 'bank_staff')
    } catch {
        return false
    }
}

/** Always allows access — used for server-side internal writes. */
export const serverSideAccess: Access = () => true

/** Denies all access from the API — used for server-written read-only records. */
export const neverAccess: Access = () => false
