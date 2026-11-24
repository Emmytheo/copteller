import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { WorkflowEditorLayout } from './WorkflowEditorLayout'

export default async function CoptellerWorkflowEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const dynamicOptions = {
        providers: [] as { id: string; label: string }[],
        secrets: [] as { id: string; label: string }[],
        workflows: [] as { id: string; label: string }[],
        applications: [] as { id: string; label: string }[],
        endpoints: [] as { id: string; label: string; method: string; path: string; providerName?: string }[],
    }

    let workflow = null
    try {
        const payload = await getPayload({ config })
        const [providersRes, secretsRes, workflowsRes, appsRes, endpointsRes] = await Promise.all([
            payload.find({ collection: 'service-providers', limit: 200, overrideAccess: true }),
            payload.find({ collection: 'secrets', limit: 200, overrideAccess: true }),
            payload.find({ collection: 'workflows', limit: 200, overrideAccess: true }),
            payload.find({ collection: 'product-types', limit: 200, overrideAccess: true }),
            payload.find({ collection: 'endpoints', limit: 300, depth: 1, sort: 'name', overrideAccess: true }),
        ])

        dynamicOptions.providers = providersRes.docs.map((d: any) => ({ id: String(d.id), label: d.name }))
        dynamicOptions.secrets = secretsRes.docs.map((d: any) => ({ id: String(d.id), label: d.name }))
        dynamicOptions.workflows = workflowsRes.docs.map((d: any) => ({ id: String(d.id), label: d.name }))
        dynamicOptions.applications = appsRes.docs.map((d: any) => ({ id: String(d.id), label: d.name }))
        dynamicOptions.endpoints = endpointsRes.docs.map((ep: any) => ({
            id: String(ep.id),
            label: ep.name,
            method: ep.method || 'GET',
            path: ep.path || '/',
            providerName: typeof ep.provider === 'object' && ep.provider ? ep.provider.name : undefined,
        }))

        if (id !== 'new') {
            workflow = await payload.findByID({
                collection: 'workflows',
                id,
                overrideAccess: true,
            }).catch(() => null)

            if (!workflow) {
                notFound()
            }
        }
    } catch (e) {
        console.error('Failed to fetch dynamic options for editor', e)
    }

    return (
        <WorkflowEditorLayout
            workflowId={id}
            workflow={workflow}
            dynamicOptions={dynamicOptions}
        />
    )
}
