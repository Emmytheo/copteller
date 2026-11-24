import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pg = require('pg')

// Load .env.local if env vars not already injected via --env-file
const envPath = path.join(process.cwd(), '.env.local')
if (!process.env.DATABASE_URI && !process.env.COPTELLER_DATABASE_URI && fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const t = line.trim()
        if (!t || t.startsWith('#')) continue
        const eq = t.indexOf('=')
        if (eq === -1) continue
        const k = t.slice(0, eq).trim()
        let v = t.slice(eq + 1).trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
        if (process.env[k] === undefined) process.env[k] = v
    }
}

const connectionString = process.env.COPTELLER_DATABASE_URI || process.env.DATABASE_URI
if (!connectionString) {
    console.error('❌ Missing COPTELLER_DATABASE_URI or DATABASE_URI in .env.local')
    process.exit(1)
}

const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
})

const NIGERIAN_NIP_BANKS_6DIGIT = [
    { code: '000014', name: 'Access Bank', shortCode: '044' },
    { code: '000013', name: 'Guaranty Trust Bank (GTBank)', shortCode: '058' },
    { code: '000015', name: 'Zenith Bank', shortCode: '057' },
    { code: '000016', name: 'First Bank of Nigeria', shortCode: '011' },
    { code: '000004', name: 'United Bank for Africa (UBA)', shortCode: '033' },
    { code: '000007', name: 'Fidelity Bank', shortCode: '070' },
    { code: '000003', name: 'First City Monument Bank (FCMB)', shortCode: '214' },
    { code: '000001', name: 'Sterling Bank', shortCode: '232' },
    { code: '000018', name: 'Union Bank of Nigeria', shortCode: '032' },
    { code: '000017', name: 'Wema Bank', shortCode: '035' },
    { code: '000010', name: 'Ecobank Nigeria', shortCode: '050' },
    { code: '000012', name: 'Stanbic IBTC Bank', shortCode: '221' },
    { code: '000008', name: 'Polaris Bank', shortCode: '076' },
    { code: '000002', name: 'Keystone Bank', shortCode: '082' },
    { code: '000023', name: 'Providus Bank', shortCode: '101' },
    { code: '000021', name: 'Standard Chartered Bank', shortCode: '068' },
    { code: '000009', name: 'Citibank Nigeria', shortCode: '023' },
    { code: '000006', name: 'Jaiz Bank', shortCode: '301' },
    { code: '000022', name: 'Suntrust Bank', shortCode: '100' },
    { code: '000026', name: 'Taj Bank', shortCode: '302' },
    { code: '000027', name: 'Globus Bank', shortCode: '103' },
    { code: '000025', name: 'Titan Trust Bank', shortCode: '102' },
    { code: '000031', name: 'PremiumTrust Bank', shortCode: '105' },
    { code: '090267', name: 'Kuda Microfinance Bank', shortCode: '50211' },
    { code: '999992', name: 'OPay Digital Services (OPay)', shortCode: '999992' },
    { code: '999991', name: 'PalmPay', shortCode: '999991' },
    { code: '090405', name: 'Moniepoint Microfinance Bank', shortCode: '50515' },
    { code: '090110', name: 'VFD Microfinance Bank', shortCode: '566' },
    { code: '090423', name: 'Abia SME Microfinance Bank', shortCode: '090423' },
    { code: '999999', name: 'OlivePay Settlement Bank (Internal)', shortCode: '999999' },
]

function compileSdlToReactFlowAndPlan(sdl) {
    const triggerType = sdl.trigger || 'MANUAL'
    const triggerNode = {
        id: 'trigger-1',
        type: 'abiaNode',
        position: { x: 80, y: 140 },
        zIndex: 1,
        data: {
            type: 'TRIGGER',
            inputs: {
                triggerType,
                ...(sdl.cronExpression ? { cronExpression: sdl.cronExpression } : {}),
            },
        },
    }

    const nodes = [triggerNode]
    const edges = []
    const steps = Array.isArray(sdl.steps) ? sdl.steps : []

    steps.forEach((step, idx) => {
        nodes.push({
            id: step.id,
            type: 'abiaNode',
            position: { x: 80 + (idx + 1) * 380, y: 140 + (idx % 2) * 40 },
            zIndex: 1,
            data: {
                type: step.type,
                inputs: step.inputs || {},
            },
        })
    })

    if (steps.length > 0) {
        edges.push({
            id: `e-trigger-${steps[0].id}`,
            source: 'trigger-1',
            target: steps[0].id,
            type: 'smoothstep',
        })
    }

    for (const step of steps) {
        if (step.next) {
            edges.push({
                id: `e-${step.id}-${step.next}`,
                source: step.id,
                target: step.next,
                type: 'smoothstep',
            })
        }
        if (step.onTrue) {
            edges.push({
                id: `e-${step.id}-true-${step.onTrue}`,
                source: step.id,
                sourceHandle: 'true',
                target: step.onTrue,
                type: 'smoothstep',
            })
        }
        if (step.onFalse) {
            edges.push({
                id: `e-${step.id}-false-${step.onFalse}`,
                source: step.id,
                sourceHandle: 'false',
                target: step.onFalse,
                type: 'smoothstep',
            })
        }
    }

    // Build topological executionPlan matching FlowToExecutionPlan output shape
    const executionPlan = [{ phase: 1, nodes: [triggerNode] }]
    const planned = new Set(['trigger-1'])
    let phaseNum = 2
    while (planned.size < nodes.length && phaseNum < 50) {
        const nextBatch = []
        for (const n of nodes) {
            if (planned.has(n.id)) continue
            const incoming = edges.filter((e) => e.target === n.id)
            if (incoming.length === 0 || incoming.every((e) => planned.has(e.source))) {
                nextBatch.push(n)
            }
        }
        if (nextBatch.length === 0) {
            // Fallback for any disconnected node
            for (const n of nodes) {
                if (!planned.has(n.id)) nextBatch.push(n)
            }
        }
        executionPlan.push({ phase: phaseNum++, nodes: nextBatch })
        nextBatch.forEach((n) => planned.add(n.id))
    }

    return {
        name: sdl.name,
        description: sdl.description || '',
        trigger: ['MANUAL', 'APPLICATION_SUBMIT', 'CRON', 'WEBHOOK'].includes(triggerType) ? triggerType : 'MANUAL',
        cronExpression: sdl.cronExpression || null,
        definition: { nodes, edges, viewport: { x: 0, y: 0, zoom: 0.9 } },
        executionPlan,
    }
}

async function main() {
    console.log('=== Copteller OlivePay + Sandbox Rail Full Live Database Seeder ===\n')

    // 1. Seed NIP Banks Cache, Sandbox Master Wallet & Default Active Rail
    console.log('[1/7] Seeding 30 6-digit NIP Banks, Sandbox Master Float (₦50M), and Active Rail...')
    for (const b of NIGERIAN_NIP_BANKS_6DIGIT) {
        await pool.query(
            `INSERT INTO copteller.olivepay_banks_cache (bank_code, bank_name, short_code, is_active, updated_at)
             VALUES ($1, $2, $3, TRUE, NOW())
             ON CONFLICT (bank_code) DO UPDATE SET bank_name = EXCLUDED.bank_name, short_code = EXCLUDED.short_code, is_active = TRUE, updated_at = NOW()`,
            [b.code, b.name, b.shortCode || null]
        )
    }

    await pool.query(
        `INSERT INTO copteller.olivepay_sandbox_master (id, available_balance_kobo, currency, status, holds_enabled, delegated_kyc_enabled, commission_config, updated_at)
         VALUES (1, 5000000000, 'NGN', 'ACTIVE', TRUE, TRUE, '{"enabled":true,"defaultFeeKobo":2500}'::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET available_balance_kobo = GREATEST(copteller.olivepay_sandbox_master.available_balance_kobo, 5000000000), updated_at = NOW()`
    )

    await pool.query(
        `INSERT INTO copteller.olivepay_platform_config (config_key, config_value, updated_by, updated_at)
         VALUES ('active_partner_bank', '{"provider":"sandbox_simulator","shortName":"Sandbox Rail"}'::jsonb, 'seed-olivepay-db', NOW())
         ON CONFLICT (config_key) DO NOTHING`
    )
    console.log('  ✓ 30 NIP banks, ₦50M Sandbox Master Float, and default rail ready')

    // 2. Provision 3 OlivePay Secrets Vault Slots
    console.log('\n[2/7] Provisioning 3 OlivePay Secrets Vault slots...')
    const secretSpecs = [
        { name: 'OLIVEPAY_PUBLIC_KEY', category: 'API_KEY', desc: 'OlivePay Public Key (P-...-K) for Collections, Dynamic VAs, and JWT auth exchange.' },
        { name: 'OLIVEPAY_SECRET_KEY', category: 'API_KEY', desc: 'OlivePay Secret Key (S-...-K) for JWT auth exchange and exact-bytes HMAC-SHA256 signing.' },
        { name: 'OLIVEPAY_WEBHOOK_SECRET', category: 'WEBHOOK_SECRET', desc: 'OlivePay Webhook Signing Secret for verifying inbound X-Webhook-Signature payloads.' },
    ]
    const secretIdByName = {}
    for (const s of secretSpecs) {
        const existing = await pool.query(`SELECT id FROM copteller.secrets WHERE name = $1 LIMIT 1`, [s.name])
        if (existing.rows[0]) {
            secretIdByName[s.name] = existing.rows[0].id
            console.log(`  ✓ Secret exists [${existing.rows[0].id}]: ${s.name}`)
        } else {
            const ins = await pool.query(
                `INSERT INTO copteller.secrets (name, category, description, created_at, updated_at)
                 VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
                [s.name, s.category, s.desc]
            )
            secretIdByName[s.name] = ins.rows[0].id
            console.log(`  ✓ Created Vault slot [${ins.rows[0].id}]: ${s.name}`)
        }
    }

    // 3. Upsert OlivePay Service Provider
    console.log('\n[3/7] Upserting OlivePay Service Provider...')
    const templatesDir = path.join(process.cwd(), 'lib', 'workflow', 'templates')
    const blueprint = JSON.parse(fs.readFileSync(path.join(templatesDir, 'olivepay.blueprint.json'), 'utf8'))
    const bpProv = blueprint.provider
    const providerMetadata = {
        ...(bpProv.metadata || {}),
        secondarySecretId: secretIdByName.OLIVEPAY_SECRET_KEY,
        secondarySecretName: 'OLIVEPAY_SECRET_KEY',
        webhookSecretId: secretIdByName.OLIVEPAY_WEBHOOK_SECRET,
        webhookSecretName: 'OLIVEPAY_WEBHOOK_SECRET',
    }

    let oliveProviderId
    const existingProv = await pool.query(`SELECT id FROM copteller.service_providers WHERE slug = $1 LIMIT 1`, [bpProv.slug])
    if (existingProv.rows[0]) {
        oliveProviderId = existingProv.rows[0].id
        await pool.query(
            `UPDATE copteller.service_providers
             SET name = $1, description = $2, category = $3, base_url = $4, auth_type = $5,
                 secret_id = $6, health_check_url = $7, priority = $8, group_tag = $9,
                 is_active = TRUE, metadata = $10::jsonb, updated_at = NOW()
             WHERE id = $11`,
            [
                bpProv.name,
                bpProv.description,
                bpProv.category,
                bpProv.baseUrl,
                bpProv.authType,
                secretIdByName.OLIVEPAY_PUBLIC_KEY,
                bpProv.healthCheckUrl || null,
                bpProv.priority ?? 1,
                bpProv.groupTag || 'olivepay',
                JSON.stringify(providerMetadata),
                oliveProviderId,
            ]
        )
        console.log(`  ✓ Updated provider [${oliveProviderId}]: ${bpProv.name}`)
    } else {
        const ins = await pool.query(
            `INSERT INTO copteller.service_providers
             (name, slug, description, category, base_url, auth_type, secret_id, health_check_url, priority, group_tag, is_active, metadata, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11::jsonb, NOW(), NOW())
             RETURNING id`,
            [
                bpProv.name,
                bpProv.slug,
                bpProv.description,
                bpProv.category,
                bpProv.baseUrl,
                bpProv.authType,
                secretIdByName.OLIVEPAY_PUBLIC_KEY,
                bpProv.healthCheckUrl || null,
                bpProv.priority ?? 1,
                bpProv.groupTag || 'olivepay',
                JSON.stringify(providerMetadata),
            ]
        )
        oliveProviderId = ins.rows[0].id
        console.log(`  ✓ Created provider [${oliveProviderId}]: ${bpProv.name}`)
    }

    // 4. Upsert all 24 OlivePay Endpoints
    console.log(`\n[4/7] Upserting all ${blueprint.endpoints.length} OlivePay API Endpoints...`)
    const endpointIdByName = {}
    let epCreated = 0
    let epUpdated = 0

    for (const ep of blueprint.endpoints) {
        const existingEp = await pool.query(
            `SELECT id FROM copteller.endpoints WHERE name = $1 AND provider_id = $2 LIMIT 1`,
            [ep.name, oliveProviderId]
        )
        let epId
        if (existingEp.rows[0]) {
            epId = existingEp.rows[0].id
            await pool.query(
                `UPDATE copteller.endpoints
                 SET description = $1, method = $2, path = $3, status = 'active',
                     auth_override = $4, query_params_schema = $5::jsonb, body_schema = $6::jsonb, response_schema = $7::jsonb,
                     updated_at = NOW()
                 WHERE id = $8`,
                [
                    ep.description || '',
                    ep.method || 'GET',
                    ep.path,
                    ep.authOverride || 'INHERIT',
                    JSON.stringify(ep.queryParamsSchema || {}),
                    JSON.stringify(ep.bodySchema || {}),
                    JSON.stringify(ep.responseSchema || {}),
                    epId,
                ]
            )
            epUpdated++
        } else {
            const ins = await pool.query(
                `INSERT INTO copteller.endpoints
                 (name, provider_id, description, method, path, status, auth_override, query_params_schema, body_schema, response_schema, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, 'active', $6, $7::jsonb, $8::jsonb, $9::jsonb, NOW(), NOW())
                 RETURNING id`,
                [
                    ep.name,
                    oliveProviderId,
                    ep.description || '',
                    ep.method || 'GET',
                    ep.path,
                    ep.authOverride || 'INHERIT',
                    JSON.stringify(ep.queryParamsSchema || {}),
                    JSON.stringify(ep.bodySchema || {}),
                    JSON.stringify(ep.responseSchema || {}),
                ]
            )
            epId = ins.rows[0].id
            epCreated++
        }

        // Sync static headers if defined
        if (Array.isArray(ep.headers) && ep.headers.length > 0) {
            await pool.query(`DELETE FROM copteller.endpoints_headers WHERE _parent_id = $1`, [epId])
            for (let i = 0; i < ep.headers.length; i++) {
                await pool.query(
                    `INSERT INTO copteller.endpoints_headers (_order, _parent_id, id, key, value)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [i + 1, epId, crypto.randomBytes(12).toString('hex'), ep.headers[i].key, ep.headers[i].value]
                )
            }
        }
        endpointIdByName[ep.name] = String(epId)
    }
    console.log(`  ✓ OlivePay Endpoints ready: ${epCreated} created, ${epUpdated} updated (total ${Object.keys(endpointIdByName).length})`)

    // 5. Compile, Plan & Publish all 8 OlivePay SDL Workflows
    console.log('\n[5/7] Compiling, planning & publishing all 8 OlivePay SDL Workflows...')
    const sdlFiles = fs
        .readdirSync(templatesDir)
        .filter((f) => f.startsWith('olivepay_') && f.endsWith('.sdl.json'))
        .sort()

    const workflowIdByName = {}
    for (const file of sdlFiles) {
        const sdl = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf8'))
        const compiled = compileSdlToReactFlowAndPlan(sdl)
        const existingWf = await pool.query(`SELECT id FROM copteller.workflows WHERE name = $1 LIMIT 1`, [compiled.name])
        let wfId
        if (existingWf.rows[0]) {
            wfId = existingWf.rows[0].id
            await pool.query(
                `UPDATE copteller.workflows
                 SET description = $1, status = 'PUBLISHED', trigger = $2, cron_expression = $3,
                     definition = $4::jsonb, execution_plan = $5::jsonb, updated_at = NOW()
                 WHERE id = $6`,
                [
                    compiled.description,
                    compiled.trigger,
                    compiled.cronExpression,
                    JSON.stringify(compiled.definition),
                    JSON.stringify(compiled.executionPlan),
                    wfId,
                ]
            )
            console.log(`  ✓ Updated workflow [${wfId}]: ${compiled.name}`)
        } else {
            const ins = await pool.query(
                `INSERT INTO copteller.workflows
                 (name, description, status, trigger, cron_expression, definition, execution_plan, idempotency_enabled, idempotency_window_minutes, created_at, updated_at)
                 VALUES ($1, $2, 'PUBLISHED', $3, $4, $5::jsonb, $6::jsonb, TRUE, 10, NOW(), NOW())
                 RETURNING id`,
                [
                    compiled.name,
                    compiled.description,
                    compiled.trigger,
                    compiled.cronExpression,
                    JSON.stringify(compiled.definition),
                    JSON.stringify(compiled.executionPlan),
                ]
            )
            wfId = ins.rows[0].id
            console.log(`  ✓ Created workflow [${wfId}]: ${compiled.name}`)
        }
        workflowIdByName[compiled.name] = String(wfId)
    }

    // Bind OlivePay Infrastructure Action Endpoints & Core Workflows
    const oliveBindings = {}
    const bindEp = (key, epName) => {
        if (endpointIdByName[epName]) oliveBindings[key] = endpointIdByName[epName]
    }
    bindEp('subwalletCreateEndpoint', 'OlivePay: Create SubWallet')
    bindEp('subwalletTransferEndpoint', 'OlivePay: Wallet-to-Wallet Transfer')
    bindEp('payoutEndpoint', 'OlivePay: Send Merchant Payout')
    bindEp('subwalletPayoutEndpoint', 'OlivePay: SubWallet External Payout')
    bindEp('subwalletFundingEndpoint', 'OlivePay: Fund SubWallet From Main Wallet')
    bindEp('nameEnquiryEndpoint', 'OlivePay: Account Name Enquiry')
    bindEp('feeEstimateEndpoint', 'OlivePay: Payout Fee Estimate')
    bindEp('virtualAccountEndpoint', 'OlivePay: Create One-Time Virtual Account')
    bindEp('escrowHoldEndpoint', 'OlivePay: Place Escrow Hold')
    bindEp('releaseHoldEndpoint', 'OlivePay: Release Escrow Hold')
    bindEp('tierUpgradeEndpoint', 'OlivePay: Upgrade SubWallet KYC Tier')
    bindEp('payoutStatusEndpoint', 'OlivePay: Check Merchant Payout Status')
    bindEp('freezeEndpoint', 'OlivePay: Get SubWallet Details')
    bindEp('collectionsInitEndpoint', 'OlivePay: Initialize Payment')
    bindEp('bankListEndpoint', 'OlivePay: Get NIP Bank List')

    if (workflowIdByName['OlivePay: Grant & Loan Disbursement (Master -> SubWallet)']) {
        oliveBindings.grantDisbursementWorkflow = workflowIdByName['OlivePay: Grant & Loan Disbursement (Master -> SubWallet)']
    }
    if (workflowIdByName['OlivePay: Escrow Hold Placement & Settlement']) {
        oliveBindings.escrowSettlementWorkflow = workflowIdByName['OlivePay: Escrow Hold Placement & Settlement']
    }
    if (workflowIdByName['OlivePay: Member SubWallet Onboarding & Tier 2 Upgrade']) {
        oliveBindings.memberOnboardingWorkflow = workflowIdByName['OlivePay: Member SubWallet Onboarding & Tier 2 Upgrade']
    }

    await pool.query(
        `INSERT INTO copteller.olivepay_platform_config (config_key, config_value, updated_by, updated_at)
         VALUES ('olivepay_action_bindings', $1::jsonb, 'seed-olivepay-db', NOW())
         ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_by = 'seed-olivepay-db', updated_at = NOW()`,
        [JSON.stringify(oliveBindings)]
    )
    console.log(`  ✓ Bound ${Object.keys(oliveBindings).length} Infrastructure action endpoints & workflows`)

    // 6. Seed 7 OlivePay Financial Services (+ Category + Form Schema + Events + Validations)
    console.log('\n[6/7] Seeding 7 OlivePay Services wired to OlivePay Provider, Endpoints & Workflows...')
    let catId
    const existingCat = await pool.query(
        `SELECT id FROM copteller.service_categories WHERE slug IN ('olivepay-financial-rails', 'transfers') ORDER BY CASE WHEN slug = 'olivepay-financial-rails' THEN 0 ELSE 1 END LIMIT 1`
    )
    if (existingCat.rows[0]) {
        catId = existingCat.rows[0].id
    } else {
        const ins = await pool.query(
            `INSERT INTO copteller.service_categories (name, slug, description, icon, status, ui_layout, created_at, updated_at)
             VALUES ('OlivePay Financial Rails', 'olivepay-financial-rails', 'Live & Sandbox OlivePay Wallet, Payout, Virtual Account, Escrow & KYC Services', 'Zap', 'active', 'default', NOW(), NOW())
             RETURNING id`
        )
        catId = ins.rows[0].id
    }

    const nameEnquiryEpId = endpointIdByName['OlivePay: Account Name Enquiry'] ? Number(endpointIdByName['OlivePay: Account Name Enquiry']) : null
    const bankListEpId = endpointIdByName['OlivePay: Get NIP Bank List'] ? Number(endpointIdByName['OlivePay: Get NIP Bank List']) : null

    const serviceSpecs = [
        {
            name: 'OlivePay Instant Bank Withdrawal (NIP)',
            description: 'Withdraw from your SubWallet to any Nigerian bank via 6-digit NIP code with live Name Enquiry & Fee Estimate.',
            icon: 'Send',
            code: 'olivepay_subwallet_payout',
            intent: 'transfer_interbank',
            settlement: 'workflow_only',
            kyc: 'tier_1',
            roles: ['member', 'coop_admin', 'investor', 'superadmin'],
            wfId: workflowIdByName['OlivePay: Verified SubWallet Bank Withdrawal (NIP)'],
            fields: [
                { name: 'destinationBankCode', label: 'Destination Nigerian Bank', type: bankListEpId ? 'api_select' : 'destination_bank_lookup', required: true, optionsEndpointId: bankListEpId, textKey: 'name', valueKey: 'code' },
                {
                    name: 'destinationAccountNumber',
                    label: '10-Digit Account Number (NUBAN)',
                    type: 'text',
                    required: true,
                    placeholder: '0123456789',
                    validations: [{ type: 'regex', value: '^\\d{10}$', errorMessage: 'Enter a valid 10-digit account number' }],
                    events: nameEnquiryEpId
                        ? [{ trigger: 'onCondition', conditionType: 'length', conditionValue: '10', action: 'EXECUTE_ENDPOINT', endpointId: nameEnquiryEpId, mappingConfig: { beneficiaryName: 'data.accountName' } }]
                        : [],
                },
                { name: 'beneficiaryName', label: 'Verified Account Name', type: 'text', required: true, placeholder: 'Auto-resolved via NIP' },
                { name: 'amount', label: 'Amount (NGN)', type: 'number', required: true, placeholder: '5000', validations: [{ type: 'min', value: '100', errorMessage: 'Minimum withdrawal is ₦100' }] },
                { name: 'narration', label: 'Narration (max 25 chars)', type: 'text', required: true, placeholder: 'Wallet withdrawal' },
            ],
        },
        {
            name: 'OlivePay Cooperative Treasury / W2W Transfer',
            description: 'Instant zero-fee internal transfer between Member SubWallets or into a Cooperative Union Escrow Treasury.',
            icon: 'ArrowRightLeft',
            code: 'olivepay_w2w_transfer',
            intent: 'transfer_intra',
            settlement: 'workflow_only',
            kyc: 'tier_1',
            roles: ['member', 'coop_admin', 'superadmin'],
            wfId: workflowIdByName['OlivePay: Ajo & Cooperative Union Treasury Settlement'],
            fields: [
                { name: 'destinationSubWalletId', label: 'Destination SubWallet ID', type: 'text', required: true, placeholder: 'Recipient SubWallet UUID' },
                { name: 'amount', label: 'Amount (NGN)', type: 'number', required: true, placeholder: '10000' },
                { name: 'narration', label: 'Transfer Narration', type: 'text', required: true, placeholder: 'Ajo / Dues contribution' },
            ],
        },
        {
            name: 'OlivePay One-Time Virtual Account Deposit',
            description: 'Generate an exact-amount, single-use Virtual Account (kobo wire) valid for 30 minutes.',
            icon: 'CreditCard',
            code: 'olivepay_dynamic_va',
            intent: 'none',
            settlement: 'informational',
            kyc: 'tier_0',
            roles: ['member', 'coop_admin', 'investor', 'superadmin'],
            wfId: workflowIdByName['OlivePay: One-Time Dynamic Virtual Account Deposit'],
            fields: [
                { name: 'amount', label: 'Deposit Amount (NGN)', type: 'number', required: true, placeholder: '25000' },
                { name: 'customerName', label: 'Payer Full Name', type: 'text', required: true, placeholder: 'Full name' },
                { name: 'customerEmail', label: 'Payer Email', type: 'email', required: true, placeholder: 'member@email.com' },
                { name: 'bank', label: 'Issuing Bank', type: 'select', required: true, options: 'OLIVEPAY, WEMA' },
            ],
        },
        {
            name: 'OlivePay Hosted Checkout / Recurring Dues Mandate',
            description: 'Fund via Card/Transfer Checkout or bind a recurring mandate (reccurringID) for automated union dues.',
            icon: 'Zap',
            code: 'olivepay_checkout',
            intent: 'coop_dues',
            settlement: 'informational',
            kyc: 'tier_0',
            roles: ['member', 'coop_admin', 'superadmin'],
            wfId: workflowIdByName['OlivePay: Hosted Checkout & Recurring Mandate Collection'],
            fields: [
                { name: 'amount', label: 'Amount (NGN)', type: 'number', required: true, placeholder: '15000' },
                { name: 'email', label: 'Email Address', type: 'email', required: true },
                { name: 'reccurringID', label: 'Recurring Mandate Plan ID (Optional)', type: 'text', required: false, placeholder: 'Leave empty for one-time' },
            ],
        },
        {
            name: 'OlivePay Escrow Collateral Hold (Lien)',
            description: 'Freeze available wallet funds into a protected OlivePay Escrow Hold for Hire-Purchase, Pockets, or Marketplace orders.',
            icon: 'Shield',
            code: 'olivepay_escrow_hold',
            intent: 'hp_repayment',
            settlement: 'escrow_clearing',
            kyc: 'tier_1',
            roles: ['member', 'coop_admin', 'superadmin'],
            wfId: workflowIdByName['OlivePay: Escrow Hold Placement & Settlement'],
            fields: [
                { name: 'amount', label: 'Collateral / Hold Amount (NGN)', type: 'number', required: true, placeholder: '50000' },
                { name: 'reason', label: 'Escrow Purpose / Asset Ref', type: 'text', required: true, placeholder: 'Tricycle HP Collateral Deposit' },
            ],
        },
        {
            name: 'OlivePay Grant / Loan Treasury Disbursement (SWF)',
            description: 'Zero-priced HMAC-signed disbursement directly from Platform Master Treasury into a Member SubWallet.',
            icon: 'Coins',
            code: 'olivepay_swf_funding',
            intent: 'none',
            settlement: 'workflow_only',
            kyc: 'tier_1',
            roles: ['coop_admin', 'superadmin'],
            wfId: workflowIdByName['OlivePay: Grant & Loan Disbursement (Master -> SubWallet)'],
            fields: [
                { name: 'subWalletId', label: 'Beneficiary SubWallet ID', type: 'text', required: true },
                { name: 'amount', label: 'Disbursement Amount (NGN)', type: 'number', required: true, placeholder: '100000' },
                { name: 'narration', label: 'Disbursement Reference', type: 'text', required: true, placeholder: 'SME Cooperative Grant' },
            ],
        },
        {
            name: 'OlivePay KYC Tier 2 / Tier 3 Upgrade',
            description: 'Instantly upgrade SubWallet to Tier 2 with 11-digit NIN or initiate Tier 3 verification to lift balance & daily debit caps.',
            icon: 'Shield',
            code: 'olivepay_kyc_upgrade',
            intent: 'none',
            settlement: 'informational',
            kyc: 'tier_0',
            roles: ['member', 'coop_admin', 'superadmin'],
            wfId: workflowIdByName['OlivePay: KYC Tier 2 / Tier 3 Upgrade Pipeline'],
            fields: [
                { name: 'targetTier', label: 'Target KYC Tier', type: 'select', required: true, options: '2, 3' },
                { name: 'nin', label: '11-Digit NIN (for Tier 2)', type: 'text', required: false, placeholder: '12345678901' },
                { name: 'address', label: 'Residential Address', type: 'text', required: false },
            ],
        },
    ]

    for (const svc of serviceSpecs) {
        const existingSvc = await pool.query(`SELECT id FROM copteller.services WHERE name = $1 LIMIT 1`, [svc.name])
        let svcId
        const wfInt = svc.wfId ? Number(svc.wfId) : null
        if (existingSvc.rows[0]) {
            svcId = existingSvc.rows[0].id
            await pool.query(
                `UPDATE copteller.services
                 SET description = $1, icon = $2, category_id = $3, provider_id = $4, provider_service_code = $5,
                     execution_workflow_id = $6, fee_type = 'none', fee_value = 0, status = 'active',
                     service_intent = $7, settlement_type = $8, min_kyc_tier = $9, cooperative_scope = 'all_cooperatives',
                     sandbox_enabled = TRUE, union_markup_allowed = TRUE, allowed_roles = $10::jsonb, sector_tags = '["all"]'::jsonb,
                     updated_at = NOW()
                 WHERE id = $11`,
                [svc.description, svc.icon, catId, oliveProviderId, svc.code, wfInt, svc.intent, svc.settlement, svc.kyc, JSON.stringify(svc.roles), svcId]
            )
            console.log(`  ✓ Updated service [${svcId}]: ${svc.name}`)
        } else {
            const ins = await pool.query(
                `INSERT INTO copteller.services
                 (name, description, icon, category_id, provider_id, provider_service_code, execution_workflow_id,
                  fee_type, fee_value, status, service_intent, settlement_type, min_kyc_tier, cooperative_scope,
                  sandbox_enabled, union_markup_allowed, allowed_roles, sector_tags, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'none', 0, 'active', $8, $9, $10, 'all_cooperatives', TRUE, TRUE, $11::jsonb, '["all"]'::jsonb, NOW(), NOW())
                 RETURNING id`,
                [svc.name, svc.description, svc.icon, catId, oliveProviderId, svc.code, wfInt, svc.intent, svc.settlement, svc.kyc, JSON.stringify(svc.roles)]
            )
            svcId = ins.rows[0].id
            console.log(`  ✓ Created service [${svcId}]: ${svc.name}`)
        }

        // Replace form_schema + child events/validations cleanly
        const oldFields = await pool.query(`SELECT id FROM copteller.services_form_schema WHERE _parent_id = $1`, [svcId])
        for (const ofRow of oldFields.rows) {
            await pool.query(`DELETE FROM copteller.services_form_schema_events WHERE _parent_id = $1`, [ofRow.id])
            await pool.query(`DELETE FROM copteller.services_form_schema_validations WHERE _parent_id = $1`, [ofRow.id])
        }
        await pool.query(`DELETE FROM copteller.services_form_schema WHERE _parent_id = $1`, [svcId])

        for (let i = 0; i < svc.fields.length; i++) {
            const f = svc.fields[i]
            const fieldId = crypto.randomBytes(12).toString('hex')
            await pool.query(
                `INSERT INTO copteller.services_form_schema
                 (_order, _parent_id, id, name, label, type, required, placeholder, options, triggers_validation, options_endpoint_id, options_text_key, options_value_key)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, $10, $11, $12)`,
                [
                    i + 1,
                    svcId,
                    fieldId,
                    f.name,
                    f.label,
                    f.type,
                    Boolean(f.required),
                    f.placeholder || null,
                    f.options || null,
                    f.optionsEndpointId || null,
                    f.textKey || null,
                    f.valueKey || null,
                ]
            )
            if (Array.isArray(f.events)) {
                for (let j = 0; j < f.events.length; j++) {
                    const ev = f.events[j]
                    await pool.query(
                        `INSERT INTO copteller.services_form_schema_events
                         (_order, _parent_id, id, trigger, action, endpoint_id_id, mapping_config, condition_type, condition_value)
                         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
                        [j + 1, fieldId, crypto.randomBytes(12).toString('hex'), ev.trigger, ev.action, ev.endpointId, JSON.stringify(ev.mappingConfig || {}), ev.conditionType || null, ev.conditionValue || null]
                    )
                }
            }
            if (Array.isArray(f.validations)) {
                for (let j = 0; j < f.validations.length; j++) {
                    const v = f.validations[j]
                    await pool.query(
                        `INSERT INTO copteller.services_form_schema_validations
                         (_order, _parent_id, id, type, value, error_message)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [j + 1, fieldId, crypto.randomBytes(12).toString('hex'), v.type, v.value, v.errorMessage || null]
                    )
                }
            }
        }
    }

    // 7. Seed 5 OlivePay Provider Mappings & Central Cooperative Treasury SubWallet
    console.log('\n[7/7] Seeding Provider Product Mappings & Platform Central Treasury SubWallet...')
    const defaultMappings = [
        { internalName: 'Member SubWallet Tier 1 (OlivePay)', externalCode: 'OLIVEPAY_SUBWALLET_T1' },
        { internalName: 'Member SubWallet Tier 2 NIN (OlivePay)', externalCode: 'OLIVEPAY_SUBWALLET_T2' },
        { internalName: 'Cooperative Treasury SubWallet Tier 3 (OlivePay)', externalCode: 'OLIVEPAY_COOP_TREASURY_T3' },
        { internalName: 'Ajo Thrift Recurring Dues Mandate (OlivePay)', externalCode: 'OLIVEPAY_REC_AJO_MONTHLY' },
        { internalName: 'Hire-Purchase Escrow Hold Product (OlivePay)', externalCode: 'OLIVEPAY_ESCROW_HP_LIEN' },
    ]
    for (const m of defaultMappings) {
        const exists = await pool.query(`SELECT id FROM copteller.provider_mappings WHERE internal_name = $1 LIMIT 1`, [m.internalName])
        if (exists.rows.length === 0) {
            await pool.query(
                `INSERT INTO copteller.provider_mappings (internal_name, provider_id, external_code, auto_sync_config_enabled, created_at, updated_at)
                 VALUES ($1, $2, $3, FALSE, NOW(), NOW())`,
                [m.internalName, oliveProviderId, m.externalCode]
            )
            console.log(`  ✓ Created provider mapping: ${m.internalName} -> ${m.externalCode}`)
        }
    }

    const treasuryHolderRef = 'coop_treasury_platform_central'
    const existingTreasury = await pool.query(
        `SELECT olivepay_sub_wallet_id, virtual_account_number FROM copteller.olivepay_subwallets WHERE wallet_holder_reference = $1 LIMIT 1`,
        [treasuryHolderRef]
    )
    if (!existingTreasury.rows[0]) {
        const swUuid = `sbx_sw_central_${crypto.randomBytes(4).toString('hex')}`
        await pool.query(
            `INSERT INTO copteller.olivepay_subwallets
             (entity_type, olivepay_sub_wallet_id, wallet_holder_reference, first_name, last_name, email,
              virtual_account_number, virtual_account_name, virtual_account_bank_name, virtual_account_bank_code,
              status, can_payout, tier, tier_limits, ledger_balance_kobo, lien_balance_kobo, available_balance_kobo,
              available_today_kobo, bvn_verified, nin_verified, rail_mode, last_synced_at, created_at, updated_at)
             VALUES ('cooperative', $1, $2, 'Copteller Central', 'Treasury', 'treasury@copteller.app',
                     '9900001001', 'COPTELLER CENTRAL TREASURY', 'OlivePay Bank (Sandbox)', '999999',
                     'Active', TRUE, 3, '{"single_deposit":5000000,"daily_debit":5000000,"max_balance":1000000000}'::jsonb,
                     1000000000, 0, 1000000000, 500000000, TRUE, TRUE, 'sandbox_simulator', NOW(), NOW(), NOW())`,
            [swUuid, treasuryHolderRef]
        )
        console.log(`  ✓ Provisioned Central Treasury SubWallet: ${swUuid} (NUBAN 9900001001, ₦10M Sandbox Float)`)
    } else {
        console.log(`  ✓ Central Treasury SubWallet exists: ${existingTreasury.rows[0].olivepay_sub_wallet_id} (NUBAN ${existingTreasury.rows[0].virtual_account_number})`)
    }

    // Final DB count summary
    const finalCounts = await pool.query(`
        SELECT 'service_providers' AS tbl, COUNT(*)::int AS cnt FROM copteller.service_providers
        UNION ALL SELECT 'secrets', COUNT(*)::int FROM copteller.secrets
        UNION ALL SELECT 'endpoints', COUNT(*)::int FROM copteller.endpoints
        UNION ALL SELECT 'workflows', COUNT(*)::int FROM copteller.workflows
        UNION ALL SELECT 'services', COUNT(*)::int FROM copteller.services
        UNION ALL SELECT 'provider_mappings', COUNT(*)::int FROM copteller.provider_mappings
        UNION ALL SELECT 'olivepay_banks_cache', COUNT(*)::int FROM copteller.olivepay_banks_cache
        UNION ALL SELECT 'olivepay_subwallets', COUNT(*)::int FROM copteller.olivepay_subwallets
    `)
    console.log('\n=== LIVE DATABASE SUMMARY AFTER SEED ===')
    for (const r of finalCounts.rows) console.log(`  ${r.tbl.padEnd(22)}: ${r.cnt}`)

    await pool.end()
    console.log('\n✅ LIVE DATABASE SEEDING COMPLETE!')
}

main().catch(async (err) => {
    console.error('❌ Seed error:', err)
    await pool.end().catch(() => {})
    process.exit(1)
})
