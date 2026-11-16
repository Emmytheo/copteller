import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { CoptellerEndpointEditorLayout } from './CoptellerEndpointEditorLayout'

export default async function CoptellerEndpointEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const isNew = id === 'new_edit' || id === 'new'

    let dynamicOptions = {
        providers: [] as { id: string; label: string; baseUrl: string }[],
        cooperatives: [] as { id: string; name: string }[],
    }

    let endpoint = null
    try {
        const payload = await getPayload({ config })
        const [providersRes, coopsRes] = await Promise.all([
            payload.find({ collection: 'service-providers', limit: 150, overrideAccess: true }),
            payload.find({ collection: 'cooperatives', limit: 100, overrideAccess: true }),
        ])

        dynamicOptions.providers = providersRes.docs.map(d => ({ 
            id: String(d.id), 
            label: d.name,
            baseUrl: d.baseUrl
        }))

        dynamicOptions.cooperatives = coopsRes.docs.map(d => ({
            id: String(d.id),
            name: d.name,
        }))

        if (!isNew) {
            endpoint = await payload.findByID({
                collection: 'endpoints',
                id,
                depth: 1,
                overrideAccess: true,
            }).catch(() => null)

            if (!endpoint) {
                notFound()
            }
        }
    } catch (e) {
        console.error('Failed to fetch dynamic options for editor', e)
    }

    return (
        <CoptellerEndpointEditorLayout
            endpointId={isNew ? 'new' : id}
            initialData={endpoint}
            dynamicOptions={dynamicOptions}
        />
    )
}
