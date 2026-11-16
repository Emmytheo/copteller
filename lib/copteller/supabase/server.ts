import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * lib/copteller/supabase/server.ts
 * Server-side Supabase client for the COPTELLER platform.
 * Uses the dedicated Copteller Supabase project — NOT the main banking project.
 * Use in Server Components, Route Handlers, and Server Actions.
 * Create a fresh instance per request — never store in a global.
 */
export async function createCoptellerServerClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.COPTELLER_SUPABASE_URL!,
        process.env.COPTELLER_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Called from a Server Component — safe to ignore if using proxy session refresh
                    }
                },
            },
        }
    )
}
