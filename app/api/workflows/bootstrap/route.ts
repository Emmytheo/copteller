import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { compileSDLToFlow } from '@/lib/workflow/sdl'
import { FlowToExecutionPlan } from '@/lib/workflow/executionPlan'
import { ingestBlueprint, type BlueprintSDL } from '@/lib/workflow/blueprint'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { ensureOlivePayTables, setPlatformConfig } from '@/lib/copteller/olivepay-schema'
import fs from 'fs'
import path from 'path'

async function runBootstrap(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth

    await ensureOlivePayTables()

    const { searchParams } = new URL(req.url)
    const filter = (searchParams.get('filter') || '').toLowerCase().trim() // e.g. 'olivepay'
    const bindInfrastructure = searchParams.get('bind') !== '0'

    const payload = await getPayload({ config })
    const templatesDir = path.join(process.cwd(), 'lib/workflow/templates')
    const allFiles = fs.readdirSync(templatesDir)

    const blueprintFiles = allFiles.filter(
        (f) => f.endsWith('.blueprint.json') && (!filter || f.toLowerCase().includes(filter))
    )
    const sdlFiles = allFiles.filter(
        (f) => f.endsWith('.sdl.json') && (!filter || f.toLowerCase().includes(filter))
    )

    const results: Record<string, any> = {
        blueprints: [],
        workflows: [],
        infrastructureBindings: {},
    }

    const endpointIdByName: Record<string, string> = {}
    const workflowIdByName: Record<string, string> = {}

    // ── Phase 1: Ingest API Blueprints ───────────────────────────────────────
    for (const file of blueprintFiles) {
        const filePath = path.join(templatesDir, file)
        const blueprint: BlueprintSDL = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        const result = await ingestBlueprint(blueprint, payload)

        for (const ep of result.endpoints) {
            endpointIdByName[ep.name] = ep.id
        }

        results.blueprints.push({
            file,
            name: blueprint.name,
            provider: result.provider,
            secretsProvisioned: result.secrets.length,
            endpointsUpserted: result.endpoints.length,
            mappingsUpserted: result.mappings.length,
            errors: result.errors,
        })
    }

    // ── Phase 2: Compile, Plan & Publish Workflow SDLs ───────────────────────
    for (const file of sdlFiles) {
        const filePath = path.join(templatesDir, file)
        const sdl = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        if (!sdl.name || !sdl.steps) continue

        try {
            const compiled = compileSDLToFlow(sdl)
            const planRes = FlowToExecutionPlan(compiled.definition.nodes, compiled.definition.edges)
            const executionPlan = planRes.executionPlan || []

            const existing = await payload.find({
                collection: 'workflows',
                where: { name: { equals: sdl.name } },
                limit: 1,
                overrideAccess: true,
            })

            const saveData: any = {
                ...compiled,
                status: 'PUBLISHED',
                ...(executionPlan.length > 0 ? { executionPlan } : {}),
            }

            let savedDoc: any
            if (existing.docs.length > 0) {
                savedDoc = await payload.update({
                    collection: 'workflows',
                    id: existing.docs[0].id,
                    data: saveData,
                    overrideAccess: true,
                })
            } else {
                savedDoc = await payload.create({
                    collection: 'workflows',
                    data: saveData,
                    overrideAccess: true,
                })
            }

            workflowIdByName[sdl.name] = String(savedDoc.id)
            results.workflows.push({
                file,
                name: sdl.name,
                workflowId: String(savedDoc.id),
                nodesGenerated: compiled.definition.nodes.length,
                phasesCompiled: executionPlan.length,
                status: 'ok',
            })
        } catch (e: any) {
            results.workflows.push({ file, name: sdl.name, status: 'error', error: e.message })
        }
    }

    // ── Phase 3: Auto-Bind OlivePay Infrastructure Action Endpoints ──────────
    if (bindInfrastructure && Object.keys(endpointIdByName).length > 0) {
        const oliveBindings: Record<string, string> = {}
        const mapIfPresent = (key: string, epName: string) => {
            if (endpointIdByName[epName]) oliveBindings[key] = endpointIdByName[epName]
        }
        mapIfPresent('subwalletCreateEndpoint', 'OlivePay: Create SubWallet')
        mapIfPresent('subwalletTransferEndpoint', 'OlivePay: Wallet-to-Wallet Transfer')
        mapIfPresent('payoutEndpoint', 'OlivePay: Send Merchant Payout')
        mapIfPresent('subwalletPayoutEndpoint', 'OlivePay: SubWallet External Payout')
        mapIfPresent('subwalletFundingEndpoint', 'OlivePay: Fund SubWallet From Main Wallet')
        mapIfPresent('nameEnquiryEndpoint', 'OlivePay: Account Name Enquiry')
        mapIfPresent('feeEstimateEndpoint', 'OlivePay: Payout Fee Estimate')
        mapIfPresent('virtualAccountEndpoint', 'OlivePay: Create One-Time Virtual Account')
        mapIfPresent('escrowHoldEndpoint', 'OlivePay: Place Escrow Hold')
        mapIfPresent('collectionsInitEndpoint', 'OlivePay: Initialize Payment')
        mapIfPresent('bankListEndpoint', 'OlivePay: Get NIP Bank List')

        if (workflowIdByName['OlivePay: Grant & Loan Disbursement (Master -> SubWallet)']) {
            oliveBindings.grantDisbursementWorkflow =
                workflowIdByName['OlivePay: Grant & Loan Disbursement (Master -> SubWallet)']
        }
        if (workflowIdByName['OlivePay: Escrow Hold Placement & Settlement']) {
            oliveBindings.escrowSettlementWorkflow =
                workflowIdByName['OlivePay: Escrow Hold Placement & Settlement']
        }
        if (workflowIdByName['OlivePay: Member SubWallet Onboarding & Tier 2 Upgrade']) {
            oliveBindings.memberOnboardingWorkflow =
                workflowIdByName['OlivePay: Member SubWallet Onboarding & Tier 2 Upgrade']
        }

        if (Object.keys(oliveBindings).length > 0) {
            await setPlatformConfig('olivepay_action_bindings', oliveBindings, auth.email || auth.userId)
            results.infrastructureBindings = oliveBindings
        }
    }

    return NextResponse.json({
        success: true,
        message: 'Bootstrap complete.',
        summary: {
            blueprintsProcessed: blueprintFiles.length,
            workflowsProcessed: sdlFiles.length,
            bindingsApplied: Object.keys(results.infrastructureBindings).length,
        },
        results,
    })
}

export async function GET(req: NextRequest) {
    try {
        return await runBootstrap(req)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        return await runBootstrap(req)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
