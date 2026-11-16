import { createBrowserClient } from '@supabase/ssr'

/**
 * lib/copteller/supabase/client.ts
 * Browser-side Supabase client for the COPTELLER platform.
 * Uses the dedicated Copteller Supabase project — NOT the main banking project.
 * Safe to use in Client Components and hooks.
 */
export function createCoptellerClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_COPTELLER_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_COPTELLER_SUPABASE_ANON_KEY!
    )
}
