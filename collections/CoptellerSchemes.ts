import type { CollectionConfig } from 'payload'

/**
 * CoptellerSchemes — Operational financial schemes created by cooperative admins
 * and approved by the bank superadmin. A scheme is a concrete instance of a
 * product type (e.g. "Aba Keke Guild Weekly Ajo — Cycle 3").
 */
export const CoptellerSchemes: CollectionConfig = {
    slug: 'copteller-schemes',
    admin: {
        useAsTitle: 'name',
        group: 'Copteller',
        defaultColumns: ['name', 'cooperative', 'scheme_type', 'status', 'bank_approved', 'createdAt'],
        description: 'Cooperative financial schemes (Ajo cycles, HP pools, loan pools, grants) created by admins and bank-approved.',
    },
    access: {
        read: () => true,
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
        delete: ({ req }) => req.user?.role === 'admin',
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
            admin: { description: 'Scheme display name, e.g. "Transport Guild Weekly Ajo — Cycle 3".' },
        },
        {
            name: 'description',
            type: 'textarea',
        },
        // ── Core Relations ────────────────────────────────────────────────────
        {
            type: 'row',
            fields: [
                {
                    name: 'cooperative',
                    // NOTE: text not relationship — Payload singleton returns main DB, not Copteller DB
                    type: 'text',
                    required: true,
                    index: true,
                    admin: { description: 'Cooperative document ID (from copteller.cooperatives).' },
                },
                {
                    name: 'product_type',
                    type: 'relationship',
                    relationTo: 'copteller-product-types',
                    admin: { description: 'The bank-approved product template this scheme is based on.' },
                },
            ],
        },
        // ── Classification ────────────────────────────────────────────────────
        {
            type: 'row',
            fields: [
                {
                    name: 'scheme_type',
                    type: 'select',
                    required: true,
                    defaultValue: 'ajo_rotation',
                    options: [
                        { label: 'Ajo / Rotational Thrift', value: 'ajo_rotation' },
                        { label: 'Hire Purchase / Asset Lease', value: 'hire_purchase' },
                        { label: 'Micro Loan Pool', value: 'loan_pool' },
                        { label: 'Grant Distribution', value: 'grant' },
                        { label: 'Cooperative Bond / Fixed Savings', value: 'bond' },
                        { label: 'Group Savings Drive', value: 'savings_drive' },
                    ],
                },
                {
                    name: 'status',
                    type: 'select',
                    required: true,
                    defaultValue: 'draft',
                    options: [
                        { label: 'Draft (Admin configuring)', value: 'draft' },
                        { label: 'Pending Bank Approval', value: 'pending_approval' },
                        { label: 'Active', value: 'active' },
                        { label: 'Paused', value: 'paused' },
                        { label: 'Completed', value: 'completed' },
                        { label: 'Cancelled', value: 'cancelled' },
                    ],
                },
            ],
        },
        {
            name: 'bank_approved',
            type: 'checkbox',
            defaultValue: false,
            admin: { description: 'Set to true by bank superadmin once the scheme is reviewed and approved to go live.' },
        },
        // ── Financial Parameters ───────────────────────────────────────────────
        {
            type: 'collapsible',
            label: 'Financial Parameters',
            fields: [
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'target_capital',
                            type: 'number',
                            defaultValue: 0,
                            admin: { description: 'Total target capital for this scheme in Kobo.' },
                        },
                        {
                            name: 'funded_capital',
                            type: 'number',
                            defaultValue: 0,
                            admin: { description: 'Running total of capital currently funded/enrolled (in Kobo). Updated automatically.' },
                        },
                    ],
                },
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'contribution_amount',
                            type: 'number',
                            defaultValue: 0,
                            admin: { description: 'Per-cycle contribution/repayment amount per member in Kobo.' },
                        },
                        {
                            name: 'yield_rate',
                            type: 'number',
                            defaultValue: 0,
                            admin: { description: 'Expected annual yield rate (%). Set to 0 for non-yield schemes (Ajo, grants).' },
                        },
                    ],
                },
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'repayment_frequency',
                            type: 'select',
                            defaultValue: 'weekly',
                            options: [
                                { label: 'Daily', value: 'daily' },
                                { label: 'Weekly', value: 'weekly' },
                                { label: 'Bi-Weekly', value: 'biweekly' },
                                { label: 'Monthly', value: 'monthly' },
                                { label: 'Quarterly', value: 'quarterly' },
                                { label: 'Lump Sum', value: 'lump_sum' },
                            ],
                            admin: { description: 'Contribution/repayment frequency. Defaults to product type setting.' },
                        },
                        {
                            name: 'duration_months',
                            type: 'number',
                            admin: { description: 'Duration of the scheme from start_date in months.' },
                        },
                    ],
                },
                // Legacy field — kept for backwards compatibility
                {
                    name: 'total_investment_pool',
                    type: 'number',
                    defaultValue: 0,
                    admin: {
                        description: '[DEPRECATED — use target_capital] Legacy total investment pool value in Kobo.',
                        condition: () => false, // Hidden from UI but retained in DB
                    },
                },
                {
                    name: 'expected_yield',
                    type: 'number',
                    defaultValue: 0,
                    admin: { description: 'Expected total yield/return in Kobo (used for investor scheme reporting).' },
                },
                {
                    name: 'profit_sharing_percentage',
                    type: 'number',
                    defaultValue: 80,
                    admin: { description: 'Percentage of yield distributed to investors/partners. Remainder splits between union and bank.' },
                },
            ],
        },
        // ── Schedule & Capacity ────────────────────────────────────────────────
        {
            type: 'collapsible',
            label: 'Schedule & Capacity',
            fields: [
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'start_date',
                            type: 'date',
                            admin: { description: 'Scheme kick-off date.' },
                        },
                        {
                            name: 'end_date',
                            type: 'date',
                            admin: { description: 'Expected scheme completion date.' },
                        },
                    ],
                },
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'max_participants',
                            type: 'number',
                            admin: { description: 'Maximum number of members/slots in this scheme.' },
                        },
                        {
                            name: 'enrolled_count',
                            type: 'number',
                            defaultValue: 0,
                            admin: { description: 'Current number of enrolled participants. Updated by API on enrollment.' },
                        },
                    ],
                },
            ],
        },
        // ── Ajo Rotation Config ────────────────────────────────────────────────
        {
            type: 'collapsible',
            label: 'Ajo Rotation Configuration (Thrift Schemes Only)',
            fields: [
                {
                    name: 'payout_order',
                    type: 'json',
                    admin: { description: 'JSON array of customer IDs defining payout slot order for rotational Ajo schemes. e.g. ["cust_001", "cust_002", ...]' },
                },
                {
                    name: 'current_payout_slot',
                    type: 'number',
                    defaultValue: 0,
                    admin: { description: 'Zero-based index of the current slot due for payout in this rotation cycle.' },
                },
            ],
        },
    ],
    timestamps: true,
}
