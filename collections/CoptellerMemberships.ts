import type { CollectionConfig } from 'payload'

/**
 * CoptellerMemberships — Join collection linking customers to cooperatives.
 * A customer can be a member of multiple cooperatives simultaneously.
 * Each membership has its own role (member/admin/treasurer/secretary) and status.
 */
export const CoptellerMemberships: CollectionConfig = {
    slug: 'copteller-memberships',
    admin: {
        useAsTitle: 'membership_number',
        group: 'Copteller',
        defaultColumns: ['member', 'cooperative', 'role', 'status', 'joined_date', 'createdAt'],
        description: 'Links customers to cooperatives. A member can belong to multiple cooperatives.',
    },
    access: {
        read: () => true,
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
        delete: ({ req }) => req.user?.role === 'admin',
    },
    fields: [
        {
            name: 'membership_number',
            type: 'text',
            admin: {
                description: 'Auto-generated unique membership number (e.g. CPT-ABA-0042). Set by the API on creation.',
                readOnly: true,
            },
        },
        // ── Core Relations ────────────────────────────────────────────────────
        // NOTE: Using text fields instead of Payload `relationship` type because
        // getPayload() is a singleton — it always returns the main banking DB
        // instance even when called with a custom Copteller DB config. This means
        // Payload would validate relation IDs against the wrong database.
        // All member/cooperative lookups are handled manually in API routes.
        {
            type: 'row',
            fields: [
                {
                    name: 'member',
                    type: 'text',
                    required: true,
                    index: true,
                    admin: { description: 'Customer ID (from copteller.customers) who is a member of this cooperative.' },
                },
                {
                    name: 'cooperative',
                    type: 'text',
                    required: true,
                    index: true,
                    admin: { description: 'Cooperative document ID (from copteller.cooperatives).' },
                },
            ],
        },

        // ── Role & Status ──────────────────────────────────────────────────────
        {
            type: 'row',
            fields: [
                {
                    name: 'role',
                    type: 'select',
                    required: true,
                    defaultValue: 'member',
                    options: [
                        { label: 'General Member', value: 'member' },
                        { label: 'Cooperative Admin', value: 'admin' },
                        { label: 'Treasurer', value: 'treasurer' },
                        { label: 'Secretary', value: 'secretary' },
                        { label: 'Chairperson', value: 'chairperson' },
                        { label: 'Patron / Guarantor', value: 'patron' },
                    ],
                },
                {
                    name: 'status',
                    type: 'select',
                    required: true,
                    defaultValue: 'active',
                    options: [
                        { label: 'Pending Approval', value: 'pending' },
                        { label: 'Active', value: 'active' },
                        { label: 'Suspended', value: 'suspended' },
                        { label: 'Exited / Resigned', value: 'exited' },
                        { label: 'Blacklisted', value: 'blacklisted' },
                    ],
                },
            ],
        },
        // ── Dates ─────────────────────────────────────────────────────────────
        {
            type: 'row',
            fields: [
                {
                    name: 'joined_date',
                    type: 'date',
                    required: true,
                    admin: { description: 'Date the member was formally approved/joined.' },
                },
                {
                    name: 'exit_date',
                    type: 'date',
                    admin: { description: 'Date the member exited or was suspended (if applicable).' },
                },
            ],
        },
        // ── Financial Tracking ─────────────────────────────────────────────────
        {
            type: 'collapsible',
            label: 'Financial Summary',
            fields: [
                {
                    name: 'total_contributed',
                    type: 'number',
                    defaultValue: 0,
                    admin: { description: 'Total amount contributed/repaid to this cooperative in Kobo. Updated by API.' },
                },
                {
                    name: 'outstanding_balance',
                    type: 'number',
                    defaultValue: 0,
                    admin: { description: 'Total outstanding obligations in Kobo across all active contracts.' },
                },
                {
                    name: 'credit_score',
                    type: 'number',
                    defaultValue: 50,
                    admin: { description: 'Copteller credit score (0–100) for this member within this cooperative. Updated by credit scoring engine.' },
                },
                {
                    name: 'shares_owned',
                    type: 'number',
                    defaultValue: 0,
                    admin: { description: 'Number of cooperative shares owned by this member (for cooperatives with share-based structure).' },
                },
            ],
        },
        {
            name: 'notes',
            type: 'textarea',
            admin: { description: 'Admin notes on this membership (reason for suspension, special conditions, etc.).' },
        },
    ],
    timestamps: true,
}
