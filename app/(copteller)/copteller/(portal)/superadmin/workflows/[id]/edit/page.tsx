import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { WorkflowEditorLayout } from './WorkflowEditorLayout'

export default async function CoptellerWorkflowEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    let dynamicOptions = {
        providers: [] as { id: string; label: string }[],
        secrets: [] as { id: string; label: string }[],
        workflows: [] as { id: string; label: string }[],
        applications: [] as { id: string; label: string }[],
    }

    let workflow = null
    try {
        const payload = await getPayload({ config })
        const [providersRes, secretsRes, workflowsRes, appsRes] = await Promise.all([
            payload.find({ collection: 'service-providers', limit: 100, overrideAccess: true }),
            payload.find({ collection: 'secrets', limit: 100, overrideAccess: true }),
            payload.find({ collection: 'workflows', limit: 100, overrideAccess: true }),
            payload.find({ collection: 'product-types', limit: 100, overrideAccess: true }),
        ])

        dynamicOptions.providers = providersRes.docs.map(d => ({ id: String(d.id), label: d.name }))
        dynamicOptions.secrets = secretsRes.docs.map(d => ({ id: String(d.id), label: d.name }))
        dynamicOptions.workflows = workflowsRes.docs.map(d => ({ id: String(d.id), label: d.name }))
        dynamicOptions.applications = appsRes.docs.map(d => ({ id: String(d.id), label: d.name }))

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
