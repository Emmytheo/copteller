'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { createCoptellerServerClient } from '@/lib/copteller/supabase/server'
import { getProfilesForUser } from '@/lib/copteller/supabase/admin'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'

async function assertSuperadminAction() {
    const supabase = await createCoptellerServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized: sign in required.')

    const metaRole = String(user.user_metadata?.role || '').toLowerCase()
    if (metaRole === 'superadmin' || metaRole === 'admin' || metaRole === 'bank_staff') return

    const profiles = await getProfilesForUser(user.id)
    const allowed = profiles.some((p) => p.role === 'superadmin' || p.role === 'bank_staff')
    if (!allowed) throw new Error('Forbidden: superadmin or bank_staff role required.')
}

export async function saveProvider(id: string | null, data: any) {
    await assertSuperadminAction()
    await ensureOlivePayTables().catch(() => {})
    const payload = await getPayload({ config })

    if (id) {
        await payload.update({
            collection: 'service-providers',
            id,
            data,
            overrideAccess: true,
        })
    } else {
        await payload.create({
            collection: 'service-providers',
            data,
            overrideAccess: true,
        })
    }

    revalidatePath('/copteller/superadmin/providers')
    return { success: true }
}

export async function deleteProvider(id: string) {
    await assertSuperadminAction()
    const payload = await getPayload({ config })
    await payload.delete({
        collection: 'service-providers',
        id,
        overrideAccess: true,
    })
    revalidatePath('/copteller/superadmin/providers')
    return { success: true }
}
