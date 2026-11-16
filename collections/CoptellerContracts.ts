import type { CollectionConfig } from 'payload'

/**
 * CoptellerContracts — Generic financial contracts linking a member to any
 * cooperative scheme: Ajo enrollment, HP/lease agreements, loan disbursements,
 * grant assignments. One member can hold multiple concurrent contracts.
 */
export const CoptellerContracts: CollectionConfig = {
    slug: 'copteller-contracts',
    admin: {
        useAsTitle: 'id',
        group: 'Copteller',
        defaultColumns: ['member', 'cooperative', 'contract_type', 'status', 'next_due_date', 'createdAt'],
        description: 'Cooperative financial contracts (HP, Ajo enrollment, Loans, Grants) — one member can hold multiple.',
    },
    access: {
        read: () => true,
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
        delete: ({ req }) => req.user?.role === 'admin',
    },
    fields: [
        // ── Core Relations ────────────────────────────────────────────────────
        // NOTE: text not relationship — Payload singleton returns main DB, not Copteller DB
        {
            name: 'member',
            type: 'text',
            required: true,
            index: true,
            admin: { description: 'Customer ID (from copteller.customers) — the member this contract belongs to.' },
        },
        {
            name: 'cooperative',
            type: 'text',
            required: true,
            index: true,
            admin: { description: 'Cooperative document ID (from copteller.cooperatives).' },
        },
        {
            name: 'scheme',
            type: 'relationship',
            relationTo: 'copteller-schemes',
            required: true,
            index: true,
            admin: { description: 'The scheme this contract is enrolled under.' },
        },
        // ── Legacy HP relation (kept for backwards compatibility) ─────────────
        {
            name: 'investment',
            type: 'relationship',
            relationTo: 'copteller-investments',
            admin: {
                description: '[LEGACY] Linked asset for legacy HP contracts. Use scheme relation for new contracts.',
                condition: (data) => !!data?.investment,
            },
        },
        // ── Classification ────────────────────────────────────────────────────
        {
            type: 'row',
            fields: [
                {
                    name: 'contract_type',
                    type: 'select',
                    required: true,
                    defaultValue: 'ajo_enrollment',
                    options: [
                        { label: 'Ajo / Thrift Enrollment', value: 'ajo_enrollment' },
                        { label: 'Hire Purchase / Asset Lease', value: 'hire_purchase' },
                        { label: 'Micro Loan', value: 'micro_loan' },
                        { label: 'Grant Assignment', value: 'grant' },
                        { label: 'Savings Bond', value: 'savings_bond' },
                        { label: 'Group Savings', value: 'group_savings' },
                    ],
                },
                {
                    name: 'status',
                    type: 'select',
                    required: true,
                    defaultValue: 'active',
                    options: [
                        { label: 'Pending Activation', value: 'pending' },
                        { label: 'Active', value: 'active' },
                        { label: 'Paused', value: 'paused' },
                        { label: 'Defaulted', value: 'defaulted' },
                        { label: 'Completed', value: 'completed' },
                        { label: 'Cancelled', value: 'cancelled' },
                    ],
                },
            ],
        },
        // ── Asset Details (HP / Lease) ─────────────────────────────────────────
        {
            type: 'collapsible',
            label: 'Asset Details (HP / Lease Contracts)',
            fields: [
                {
                    name: 'asset_name',
                    type: 'text',
                    admin: { description: 'Name of the asset under contract (e.g. "TVS King Keke", "Massey Ferguson Tractor", "Ariaria Market Stall B-12").' },
                },
                {
                    name: 'asset_identifier',
                    type: 'text',
                    admin: { description: 'Asset ID, registration number, or plate number.' },
                },
                {
                    name: 'asset_value',
                    type: 'number',
                    admin: { description: 'Original asset value in Kobo.' },
                },
            ],
        },
        // ── Financial Tracking ────────────────────────────────────────────────
        {
            type: 'collapsible',
            label: 'Financial Tracking',
            fields: [
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'due_amount',
                            type: 'number',
                            required: true,
                            defaultValue: 0,
                            admin: { description: 'Amount due per contribution/repayment cycle in Kobo.' },
                        },
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
                        },
                    ],
                },
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'total_paid',
                            type: 'number',
                            required: true,
                            defaultValue: 0,
                            admin: { description: 'Cumulative amount paid/contributed to date in Kobo.' },
                        },
                        {
                            name: 'total_obligation',
                            type: 'number',
                            defaultValue: 0,
                            admin: { description: 'Total amount the member must pay over the contract term in Kobo.' },
                        },
                    ],
                },
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'missed_payments',
                            type: 'number',
                            defaultValue: 0,
                            admin: { description: 'Number of missed/skipped payment cycles. Triggers default flag at threshold.' },
                        },
                        {
                            name: 'payment_streak',
                            type: 'number',
                            defaultValue: 0,
                            admin: { description: 'Consecutive on-time payment cycles. Used for credit scoring.' },
                        },
                    ],
                },
                // Legacy field for backwards compatibility
                {
                    name: 'weekly_due_amount',
                    type: 'number',
                    defaultValue: 0,
                    admin: {
                        description: '[DEPRECATED — use due_amount] Legacy weekly due amount field.',
                        condition: () => false,
                    },
                },
            ],
        },
        // ── Schedule ──────────────────────────────────────────────────────────
        {
            type: 'collapsible',
            label: 'Contract Schedule',
            fields: [
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'start_date',
                            type: 'date',
                            required: true,
                            admin: { description: 'Contract activation date.' },
                        },
                        {
                            name: 'end_date',
                            type: 'date',
                            admin: { description: 'Expected contract completion date.' },
                        },
                    ],
                },
                {
                    name: 'next_due_date',
                    type: 'date',
                    admin: { description: 'Next payment/contribution due date. Updated by the automated collection engine.' },
                },
                // Ajo-specific: slot position in rotation
                {
                    name: 'ajo_slot_number',
                    type: 'number',
                    admin: { description: 'For Ajo/thrift contracts: this member\'s slot position in the rotation (1-indexed).' },
                },
            ],
        },
        {
            name: 'notes',
            type: 'textarea',
            admin: { description: 'Internal notes on this contract (e.g. reasons for pause, collateral details).' },
        },
    ],
    timestamps: true,
}
