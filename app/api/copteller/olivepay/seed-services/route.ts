import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { getDb } from '@/lib/copteller/db'
import { invalidateServicesCache } from '@/app/api/copteller/services/route'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/olivepay/seed-services
 * Idempotently seeds 7 production-ready OlivePay-powered Services wired directly
 * to the `olivepay` ServiceProvider, OlivePay Workflows, 6-digit NIP Bank pickers,
 * and live `onCondition(length=10)` account name-enquiry events!
 */
export async function POST(req: NextRequest) {
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth

    try {
        const payload = await getDb()

        // Resolve OlivePay provider, endpoints & workflows
        const [provRes, wfRes, epRes, catRes] = await Promise.all([
            payload.find({ collection: 'service-providers', where: { slug: { equals: 'olivepay' } }, limit: 1, overrideAccess: true }),
            payload.find({ collection: 'workflows', limit: 250, overrideAccess: true }),
            payload.find({ collection: 'endpoints', limit: 250, overrideAccess: true }),
            payload.find({ collection: 'service-categories', limit: 100, overrideAccess: true }),
        ])

        const oliveProvider = provRes.docs[0]
        const wfByName = new Map((wfRes.docs as any[]).map((w) => [w.name, w.id]))
        const epByName = new Map((epRes.docs as any[]).map((e) => [e.name, e.id]))

        // Ensure an OlivePay Financial Rails category exists
        let financialCat = (catRes.docs as any[]).find((c) => c.slug === 'olivepay-financial-rails' || c.slug === 'transfers')
        if (!financialCat) {
            financialCat = await payload.create({
                collection: 'service-categories',
                overrideAccess: true,
                data: {
                    name: 'OlivePay Financial Rails',
                    slug: 'olivepay-financial-rails',
                    description: 'Live & Sandbox OlivePay Wallet, Payout, Virtual Account, Escrow & KYC Services',
                    icon: 'Zap',
                    status: 'active',
                },
            })
        }

        const nameEnquiryEpId = epByName.get('OlivePay: Account Name Enquiry')
        const bankListEpId = epByName.get('OlivePay: Get NIP Bank List')

        const serviceSpecs = [
            {
                name: 'OlivePay Instant Bank Withdrawal (NIP)',
                description: 'Withdraw from your SubWallet to any Nigerian bank via 6-digit NIP code with live Name Enquiry & Fee Estimate.',
                icon: 'Send',
                provider_service_code: 'olivepay_subwallet_payout',
                service_intent: 'transfer_interbank',
                settlement_type: 'workflow_only',
                min_kyc_tier: 'tier_1',
                allowed_roles: ['member', 'coop_admin', 'investor', 'superadmin'],
                execution_workflow: wfByName.get('OlivePay: Verified SubWallet Bank Withdrawal (NIP)'),
                fee_type: 'none',
                fee_value: 0,
                form_schema: [
                    {
                        name: 'destinationBankCode',
                        label: 'Destination Nigerian Bank',
                        type: bankListEpId ? 'api_select' : 'destination_bank_lookup',
                        required: true,
                        ...(bankListEpId ? { options_endpoint: bankListEpId, options_text_key: 'name', options_value_key: 'code' } : {}),
                    },
                    {
                        name: 'destinationAccountNumber',
                        label: '10-Digit Account Number (NUBAN)',
                        type: 'text',
                        required: true,
                        placeholder: '0123456789',
                        validations: [{ type: 'regex', value: '^\\d{10}$', errorMessage: 'Enter a valid 10-digit account number' }],
                        ...(nameEnquiryEpId
                            ? {
                                  events: [
                                      {
                                          trigger: 'onCondition',
                                          condition: { type: 'length', value: '10' },
                                          action: 'EXECUTE_ENDPOINT',
                                          endpointId: nameEnquiryEpId,
                                          mappingConfig: { beneficiaryName: 'data.accountName' },
                                      },
                                  ],
                              }
                            : {}),
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
                provider_service_code: 'olivepay_w2w_transfer',
                service_intent: 'transfer_intra',
                settlement_type: 'workflow_only',
                min_kyc_tier: 'tier_1',
                allowed_roles: ['member', 'coop_admin', 'superadmin'],
                execution_workflow: wfByName.get('OlivePay: Ajo & Cooperative Union Treasury Settlement'),
                fee_type: 'none',
                fee_value: 0,
                form_schema: [
                    { name: 'destinationSubWalletId', label: 'Destination SubWallet ID', type: 'text', required: true, placeholder: 'Recipient SubWallet UUID' },
                    { name: 'amount', label: 'Amount (NGN)', type: 'number', required: true, placeholder: '10000' },
                    { name: 'narration', label: 'Transfer Narration', type: 'text', required: true, placeholder: 'Ajo / Dues contribution' },
                ],
            },
            {
                name: 'OlivePay One-Time Virtual Account Deposit',
                description: 'Generate an exact-amount, single-use Virtual Account (kobo wire) valid for 30 minutes.',
                icon: 'CreditCard',
                provider_service_code: 'olivepay_dynamic_va',
                service_intent: 'none',
                settlement_type: 'informational',
                min_kyc_tier: 'tier_0',
                allowed_roles: ['member', 'coop_admin', 'investor', 'superadmin'],
                execution_workflow: wfByName.get('OlivePay: One-Time Dynamic Virtual Account Deposit'),
                fee_type: 'none',
                fee_value: 0,
                form_schema: [
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
                provider_service_code: 'olivepay_checkout',
                service_intent: 'coop_dues',
                settlement_type: 'informational',
                min_kyc_tier: 'tier_0',
                allowed_roles: ['member', 'coop_admin', 'superadmin'],
                execution_workflow: wfByName.get('OlivePay: Hosted Checkout & Recurring Mandate Collection'),
                fee_type: 'none',
                fee_value: 0,
                form_schema: [
                    { name: 'amount', label: 'Amount (NGN)', type: 'number', required: true, placeholder: '15000' },
                    { name: 'email', label: 'Email Address', type: 'email', required: true },
                    { name: 'reccurringID', label: 'Recurring Mandate Plan ID (Optional)', type: 'text', required: false, placeholder: 'Leave empty for one-time' },
                ],
            },
            {
                name: 'OlivePay Escrow Collateral Hold (Lien)',
                description: 'Freeze available wallet funds into a protected OlivePay Escrow Hold for Hire-Purchase, Pockets, or Marketplace orders.',
                icon: 'Shield',
                provider_service_code: 'olivepay_escrow_hold',
                service_intent: 'hp_repayment',
                settlement_type: 'escrow_clearing',
                min_kyc_tier: 'tier_1',
                allowed_roles: ['member', 'coop_admin', 'superadmin'],
                execution_workflow: wfByName.get('OlivePay: Escrow Hold Placement & Settlement'),
                fee_type: 'none',
                fee_value: 0,
                form_schema: [
                    { name: 'amount', label: 'Collateral / Hold Amount (NGN)', type: 'number', required: true, placeholder: '50000' },
                    { name: 'reason', label: 'Escrow Purpose / Asset Ref', type: 'text', required: true, placeholder: 'Tricycle HP Collateral Deposit' },
                ],
            },
            {
                name: 'OlivePay Grant / Loan Treasury Disbursement (SWF)',
                description: 'Zero-priced HMAC-signed disbursement directly from Platform Master Treasury into a Member SubWallet.',
                icon: 'Coins',
                provider_service_code: 'olivepay_swf_funding',
                service_intent: 'none',
                settlement_type: 'workflow_only',
                min_kyc_tier: 'tier_1',
                allowed_roles: ['coop_admin', 'superadmin'],
                execution_workflow: wfByName.get('OlivePay: Grant & Loan Disbursement (Master -> SubWallet)'),
                fee_type: 'none',
                fee_value: 0,
                form_schema: [
                    { name: 'subWalletId', label: 'Beneficiary SubWallet ID', type: 'text', required: true },
                    { name: 'amount', label: 'Disbursement Amount (NGN)', type: 'number', required: true, placeholder: '100000' },
                    { name: 'narration', label: 'Disbursement Reference', type: 'text', required: true, placeholder: 'SME Cooperative Grant' },
                ],
            },
            {
                name: 'OlivePay KYC Tier 2 / Tier 3 Upgrade',
                description: 'Instantly upgrade SubWallet to Tier 2 with 11-digit NIN or initiate Tier 3 verification to lift balance & daily debit caps.',
                icon: 'Shield',
                provider_service_code: 'olivepay_kyc_upgrade',
                service_intent: 'none',
                settlement_type: 'informational',
                min_kyc_tier: 'tier_0',
                allowed_roles: ['member', 'coop_admin', 'superadmin'],
                execution_workflow: wfByName.get('OlivePay: KYC Tier 2 / Tier 3 Upgrade Pipeline'),
                fee_type: 'none',
                fee_value: 0,
                form_schema: [
                    { name: 'targetTier', label: 'Target KYC Tier', type: 'select', required: true, options: '2, 3' },
                    { name: 'nin', label: '11-Digit NIN (for Tier 2)', type: 'text', required: false, placeholder: '12345678901' },
                    { name: 'address', label: 'Residential Address', type: 'text', required: false },
                ],
            },
        ]

        const seeded: Array<{ id: string; name: string; action: 'created' | 'updated' }> = []

        for (const spec of serviceSpecs) {
            const existing = await payload.find({
                collection: 'services',
                where: { name: { equals: spec.name } },
                limit: 1,
                overrideAccess: true,
            })

            const data: any = {
                ...spec,
                category: financialCat.id,
                ...(oliveProvider ? { provider: oliveProvider.id } : {}),
                cooperative_scope: 'all_cooperatives',
                sector_tags: ['all'],
                sandbox_enabled: true,
                union_markup_allowed: true,
                status: 'active',
            }

            if (existing.docs.length > 0) {
                const upd = await payload.update({
                    collection: 'services',
                    id: existing.docs[0].id,
                    data,
                    overrideAccess: true,
                })
                seeded.push({ id: String(upd.id), name: spec.name, action: 'updated' })
            } else {
                const crt = await payload.create({
                    collection: 'services',
                    data,
                    overrideAccess: true,
                })
                seeded.push({ id: String(crt.id), name: spec.name, action: 'created' })
            }
        }

        invalidateServicesCache()

        return NextResponse.json({
            success: true,
            seeded,
            message: `Provisioned ${seeded.length} OlivePay Services cleanly.`,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to seed OlivePay services' }, { status: 500 })
    }
}
