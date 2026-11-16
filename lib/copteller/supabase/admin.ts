import { createClient } from '@supabase/supabase-js'

/**
 * lib/copteller/supabase/admin.ts
 * Service-role admin client for the COPTELLER Supabase project.
 * Bypasses RLS — use ONLY in trusted server-side contexts (API routes, scripts).
 * NEVER expose this to the browser or client-side code.
 */
export function createCoptellerAdminClient() {
    const url = process.env.COPTELLER_SUPABASE_URL
    const serviceKey = process.env.COPTELLER_SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error(
            'Missing Copteller Supabase admin env vars: ' +
            'COPTELLER_SUPABASE_URL and COPTELLER_SUPABASE_SERVICE_ROLE_KEY must be defined.'
        )
    }

    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}

// ─── Profile Helpers (using admin client) ──────────────────────────────────────

export type CoptellerProfileRow = {
    id: string
    user_id: string
    role: 'member' | 'coop_admin' | 'investor' | 'partner' | 'superadmin' | 'bank_staff'
    display_name: string | null
    cooperative_id: string | null
    cooperative_name: string | null
    avatar_url: string | null
    is_active: boolean
    onboarding_done: boolean
    metadata: Record<string, any>
    created_at: string
    updated_at: string
}

const profileCache = new Map<string, { profiles: CoptellerProfileRow[]; expiresAt: number }>()

/**
 * Fetch all profiles for a given user (admin-bypasses RLS).
 */
export async function getProfilesForUser(userId: string): Promise<CoptellerProfileRow[]> {
    const cached = profileCache.get(userId)
    if (cached && cached.expiresAt > Date.now()) {
        return cached.profiles
    }

    // 1. Supabase REST API via HTTPS (blazing fast, ~50ms, never blocks on pooler timeouts)
    try {
        const admin = createCoptellerAdminClient()
        const { data, error } = await admin
            .from('copteller_profiles')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: true })

        if (!error) {
            const profiles = (Array.isArray(data) ? data : []) as CoptellerProfileRow[]
            profileCache.set(userId, { profiles, expiresAt: Date.now() + 60000 })
            return profiles
        }
    } catch (e: any) {
        console.warn('[Copteller Admin] Supabase REST getProfilesForUser warning:', e.message)
    }

    // 2. Direct SQL fallback (quick 1s attempt only)
    try {
        const { queryCopteller } = await import('@/lib/copteller/pg')
        const sqlPromise = queryCopteller<CoptellerProfileRow>(
            `SELECT * FROM public.copteller_profiles WHERE user_id = $1 AND is_active = true ORDER BY created_at ASC`,
            [userId]
        )
        const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('SQL timeout')), 1000))
        const res = await Promise.race([sqlPromise, timeoutPromise])
        if (res.rows && res.rows.length > 0) {
            profileCache.set(userId, { profiles: res.rows, expiresAt: Date.now() + 60000 })
            return res.rows
        }
    } catch (err: any) {
        console.warn('[Copteller Admin] SQL getProfilesForUser fallback skipped:', err.message)
    }

    return []
}

/**
 * Create a new profile for a user (admin-bypasses RLS).
 * Called server-side during signup.
 */
export async function createProfileForUser(
    userId: string,
    role: CoptellerProfileRow['role'],
    opts?: {
        display_name?: string
        cooperative_id?: string
        cooperative_name?: string
        onboarding_done?: boolean
    }
): Promise<CoptellerProfileRow | null> {
    const admin = createCoptellerAdminClient()
    const { data, error } = await admin
        .from('copteller_profiles')
        .insert({
            user_id: userId,
            role,
            display_name: opts?.display_name ?? null,
            cooperative_id: opts?.cooperative_id ?? null,
            cooperative_name: opts?.cooperative_name ?? null,
            onboarding_done: opts?.onboarding_done ?? false,
        })
        .select()
        .single()

    if (error) {
        console.error('[Copteller Admin] createProfileForUser error:', error)
        return null
    }
    return data as CoptellerProfileRow
}
