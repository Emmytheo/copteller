import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { compileSDLToFlow } from '@/lib/workflow/sdl'
import { FlowToExecutionPlan } from '@/lib/workflow/executionPlan'
import { requireCoptellerCronOrAdmin } from '@/lib/copteller/auth'
import yaml from 'yaml'

export async function POST(req: NextRequest) {
    const auth = await requireCoptellerCronOrAdmin(req)
    if (auth instanceof NextResponse) return auth

    try {
        const contentType = req.headers.get('content-type') || ''
        const rawBody = await req.text()
        const publish = new URL(req.url).searchParams.get('publish') !== '0'

        const sdlConfig =
            contentType.includes('yaml') || contentType.includes('x-yaml')
                ? yaml.parse(rawBody)
                : JSON.parse(rawBody)

        if (!sdlConfig || !sdlConfig.name || !sdlConfig.steps) {
            return NextResponse.json({ error: 'Invalid SDL configuration.' }, { status: 400 })
        }

        const compiledDoc = compileSDLToFlow(sdlConfig)
        const planRes = FlowToExecutionPlan(compiledDoc.definition.nodes, compiledDoc.definition.edges)
        const dataToSave: any = {
            ...compiledDoc,
            status: publish && !planRes.error ? 'PUBLISHED' : 'DRAFT',
            ...(planRes.executionPlan ? { executionPlan: planRes.executionPlan } : {}),
        }

        const payload = await getPayload({ config })
        const existingRes = await payload.find({
            collection: 'workflows',
            where: { name: { equals: compiledDoc.name } },
            limit: 1,
            overrideAccess: true,
        })

        const savedDoc =
            existingRes.docs.length > 0
                ? await payload.update({
                      collection: 'workflows',
                      id: existingRes.docs[0].id,
                      data: dataToSave,
                      overrideAccess: true,
                  })
                : await payload.create({
                      collection: 'workflows',
                      data: dataToSave,
                      overrideAccess: true,
                  })

        return NextResponse.json({
            success: true,
            message: 'Workflow successfully compiled, planned, and saved.',
            workflowId: String(savedDoc.id),
            status: dataToSave.status,
            nodesGenerated: compiledDoc.definition.nodes.length,
            edgesGenerated: compiledDoc.definition.edges.length,
            phasesCompiled: planRes.executionPlan?.length || 0,
        })
    } catch (e: any) {
        return NextResponse.json({ error: 'Failed to compile SDL', details: e.message }, { status: 500 })
    }
}
