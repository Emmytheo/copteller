import type { CollectionConfig } from 'payload'

/**
 * CoptellerProductTypes — Sector-agnostic financial product templates.
 * Defined by bank superadmin, authorized per cooperative type, consumed by
 * cooperative admins when creating schemes for their members.
 */
export const CoptellerProductTypes: CollectionConfig = {
    slug: 'copteller-product-types',
    admin: {
        useAsTitle: 'name',
        group: 'Copteller',
        defaultColumns: ['name', 'product_type', 'category', 'status', 'createdAt'],
        description: 'Bank-defined financial product templates available for cooperative scheme creation.',
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
            admin: { description: 'Display name for this product template (e.g. "Weekly Ajo Thrift Cycle").' },
        },
        {
            name: 'tagline',
            type: 'text',
            admin: { description: 'Short one-line description shown on product picker cards.' },
        },
        {
            name: 'description',
            type: 'textarea',
            admin: { description: 'Full operational description of this product template.' },
        },
        // ── Classification ─────────────────────────────────────────────────────
        {
            type: 'row',
            fields: [
                {
                    name: 'product_type',
                    type: 'select',
                    required: true,
                    defaultValue: 'ajo_rotation',
                    admin: { description: 'High-level product type used for routing and scheme logic.' },
                    options: [
                        { label: 'Ajo / Rotational Thrift', value: 'ajo_rotation' },
                        { label: 'Hire Purchase / Asset Lease', value: 'hire_purchase' },
                        { label: 'Micro Loan', value: 'micro_loan' },
                        { label: 'Government / Enterprise Grant', value: 'grant' },
                        { label: 'Cooperative Bond / Fixed Savings', value: 'cooperative_bond' },
                        { label: 'Group Savings Drive', value: 'savings_drive' },
                        { label: 'Insurance Premium Pool', value: 'insurance_pool' },
                    ],
                },
                {
                    name: 'category',
                    type: 'select',
                    required: true,
                    defaultValue: 'ajo',
                    admin: { description: 'Simplified category label used in UI filters and reports.' },
                    options: [
                        { label: 'Ajo / Thrift', value: 'ajo' },
                        { label: 'Asset Hire Purchase / Lease', value: 'lease' },
                        { label: 'Micro-Loan', value: 'loan' },
                        { label: 'Government / Enterprise Grant', value: 'grant' },
                        { label: 'Savings Bond', value: 'bond' },
                        { label: 'Insurance Pool', value: 'insurance' },
                    ],
                },
            ],
        },
        {
            name: 'sub_type',
            type: 'text',
            admin: { description: 'Granular sub-classification (e.g. "Daily Market Ajo", "Weekly Fleet HP", "Emergency Micro Loan").' },
        },
        {
            name: 'sector_tags',
            type: 'select',
            hasMany: true,
            options: [
                { label: 'Transport / Logistics', value: 'transport' },
                { label: 'Agriculture / Agro-Allied', value: 'agriculture' },
                { label: 'Commerce / Market Trade', value: 'commerce' },
                { label: 'Artisan / Craft Workers', value: 'artisan' },
                { label: 'Health & Wellness', value: 'health' },
                { label: 'Education Workers', value: 'education' },
                { label: 'Technology / Digital', value: 'technology' },
                { label: 'Professional Services', value: 'professional' },
                { label: 'Housing / Real Estate', value: 'housing' },
                { label: 'Manufacturing / Production', value: 'manufacturing' },
                { label: 'Energy / Utilities', value: 'energy' },
                { label: 'Financial Services', value: 'financial_services' },
                { label: 'All Sectors (Universal)', value: 'all' },
            ],
            admin: { description: 'Sectors this product is designed for. Leave empty or select "All Sectors" for universal products.' },
        },
        {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'active',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Draft', value: 'draft' },
                { label: 'Deprecated', value: 'deprecated' },
            ],
        },
        // ── Repayment Configuration ───────────────────────────────────────────
        {
            type: 'collapsible',
            label: 'Repayment & Cycle Configuration',
            fields: [
                {
                    name: 'repayment_frequency',
                    type: 'select',
                    required: true,
                    defaultValue: 'weekly',
                    options: [
                        { label: 'Daily', value: 'daily' },
                        { label: 'Weekly', value: 'weekly' },
                        { label: 'Bi-Weekly (Fortnightly)', value: 'biweekly' },
                        { label: 'Monthly', value: 'monthly' },
                        { label: 'Quarterly', value: 'quarterly' },
                        { label: 'Lump Sum (End of Term)', value: 'lump_sum' },
                    ],
                    admin: { description: 'How often members make payments or contributions under this product.' },
                },
                {
                    name: 'max_members_per_cycle',
                    type: 'number',
                    admin: { description: 'Maximum participants per cycle (critical for Ajo/thrift rotation products). Leave empty for non-rotational products.' },
                },
            ],
        },
        // ── Financial Guardrails ──────────────────────────────────────────────
        {
            type: 'collapsible',
            label: 'Financial Guardrails (Bank Regulated)',
            fields: [
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'interest_rate',
                            type: 'number',
                            defaultValue: 0,
                            admin: { description: 'Standard interest / yield rate (%). Set to 0 for ajo/grant.' },
                        },
                        {
                            name: 'max_interest_rate',
                            type: 'number',
                            admin: { description: 'Maximum allowable interest rate (%) for schemes created under this product.' },
                        },
                    ],
                },
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'min_amount',
                            type: 'number',
                            admin: { description: 'Minimum scheme/contribution amount in Kobo.' },
                        },
                        {
                            name: 'max_amount',
                            type: 'number',
                            admin: { description: 'Maximum scheme/contribution amount in Kobo.' },
                        },
                    ],
                },
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'min_duration_months',
                            type: 'number',
                            defaultValue: 1,
                            admin: { description: 'Minimum scheme duration in months.' },
                        },
                        {
                            name: 'max_duration_months',
                            type: 'number',
                            defaultValue: 36,
                            admin: { description: 'Maximum scheme duration in months.' },
                        },
                    ],
                },
            ],
        },
        // ── Risk & Collateral ─────────────────────────────────────────────────
        {
            type: 'collapsible',
            label: 'Risk & Collateral Settings',
            fields: [
                {
                    type: 'row',
                    fields: [
                        {
                            name: 'requires_guarantor',
                            type: 'checkbox',
                            defaultValue: false,
                            admin: { description: 'Members must provide a guarantor before being approved for this product.' },
                        },
                        {
                            name: 'requires_credit_check',
                            type: 'checkbox',
                            defaultValue: false,
                            admin: { description: 'A minimum credit score must be met before a member can apply.' },
                        },
                    ],
                },
                {
                    name: 'min_credit_score',
                    type: 'number',
                    admin: {
                        description: 'Minimum Copteller credit score required (0–100). Only applies if requires_credit_check is enabled.',
                        condition: (_, siblingData) => siblingData?.requires_credit_check === true,
                    },
                },
                {
                    name: 'collateral_type',
                    type: 'select',
                    defaultValue: 'none',
                    options: [
                        { label: 'No Collateral Required', value: 'none' },
                        { label: 'Physical Asset (Vehicle / Equipment)', value: 'asset' },
                        { label: 'Group / Cooperative Guarantee', value: 'group_guarantee' },
                        { label: 'Cash Deposit', value: 'cash' },
                        { label: 'Land or Property Title', value: 'property' },
                        { label: 'Personal Guarantee', value: 'personal_guarantee' },
                    ],
                    admin: { description: 'Collateral type required to activate a contract under this product.' },
                },
            ],
        },
        // ── Auto-Assignment Configuration ─────────────────────────────────────
        {
            type: 'collapsible',
            label: 'Auto-Assignment Settings',
            fields: [
                {
                    name: 'auto_assign_on_approval',
                    type: 'checkbox',
                    defaultValue: true,
                    admin: { description: 'If enabled, this product is automatically authorized for cooperatives in its sector when they are bank-approved.' },
                },
                {
                    name: 'allow_cross_sector_request',
                    type: 'checkbox',
                    defaultValue: true,
                    admin: { description: 'Allow cooperatives outside this product\'s sector tags to submit an authorization request.' },
                },
                {
                    name: 'allow_multiple_per_member',
                    type: 'checkbox',
                    defaultValue: true,
                    admin: { description: 'Allow a single member to hold multiple active contracts under this product simultaneously.' },
                },
            ],
        },
    ],
    timestamps: true,
}
