import type { CollectionConfig } from 'payload'

/**
 * CoptellerAuditLogs — Immutable audit trail for all financial and administrative
 * actions taken on the Copteller platform. Used for regulatory compliance,
 * dispute resolution, and fraud detection.
 */
export const CoptellerAuditLogs: CollectionConfig = {
    slug: 'copteller-audit-logs',
    admin: {
        useAsTitle: 'action',
        group: 'Copteller',
        defaultColumns: ['actor_id', 'action', 'entity_type', 'entity_id', 'createdAt'],
        description: 'Immutable platform-wide audit trail for all Copteller financial and admin actions.',
    },
    access: {
        // Only bank superadmin can read/query audit logs
        read: ({ req }) => req.user?.role === 'admin',
        // Audit logs are created only by the API — never by users
        create: () => false,
        update: () => false,
        delete: () => false,
    },
    fields: [
        // ── Who Did It ────────────────────────────────────────────────────────
        {
            name: 'actor_id',
            type: 'text',
            required: true,
            index: true,
            admin: { description: 'Supabase/Payload user ID of the person who triggered this action.' },
        },
        {
            name: 'actor_role',
            type: 'select',
            options: [
                { label: 'Member', value: 'member' },
                { label: 'Cooperative Admin', value: 'coop_admin' },
                { label: 'Investor', value: 'investor' },
                { label: 'Bank Superadmin', value: 'superadmin' },
                { label: 'System / Automation', value: 'system' },
            ],
        },
        {
            name: 'actor_name',
            type: 'text',
            admin: { description: 'Display name or email of the actor at the time of the action.' },
        },
        // ── What Happened ──────────────────────────────────────────────────────
        {
            name: 'action',
            type: 'select',
            required: true,
            options: [
                // Member actions
                { label: 'Member Registered', value: 'member.registered' },
                { label: 'Member KYC Verified', value: 'member.kyc_verified' },
                { label: 'Member Joined Cooperative', value: 'member.joined_coop' },
                { label: 'Member Exited Cooperative', value: 'member.exited_coop' },
                { label: 'Member Enrolled in Ajo', value: 'member.ajo_enrolled' },
                { label: 'Member Applied for HP', value: 'member.hp_applied' },
                // Payment actions
                { label: 'Wallet Top-Up', value: 'payment.topup' },
                { label: 'Contribution Collected', value: 'payment.contribution' },
                { label: 'HP Repayment Collected', value: 'payment.hp_repayment' },
                { label: 'Ajo Payout Disbursed', value: 'payment.ajo_payout' },
                { label: 'Loan Disbursed', value: 'payment.loan_disbursed' },
                { label: 'Grant Released', value: 'payment.grant_released' },
                { label: 'Payment Failed', value: 'payment.failed' },
                { label: 'Payment Reversed', value: 'payment.reversed' },
                // Contract actions
                { label: 'Contract Created', value: 'contract.created' },
                { label: 'Contract Activated', value: 'contract.activated' },
                { label: 'Contract Defaulted', value: 'contract.defaulted' },
                { label: 'Contract Completed', value: 'contract.completed' },
                { label: 'Contract Cancelled', value: 'contract.cancelled' },
                // Scheme / Admin actions
                { label: 'Scheme Created', value: 'scheme.created' },
                { label: 'Scheme Submitted for Approval', value: 'scheme.submitted' },
                { label: 'Scheme Approved by Bank', value: 'scheme.approved' },
                { label: 'Scheme Rejected by Bank', value: 'scheme.rejected' },
                { label: 'Scheme Paused', value: 'scheme.paused' },
                { label: 'Scheme Completed', value: 'scheme.completed' },
                // Cooperative actions
                { label: 'Cooperative Registered', value: 'coop.registered' },
                { label: 'Cooperative Approved', value: 'coop.approved' },
                { label: 'Cooperative Suspended', value: 'coop.suspended' },
                // Product actions
                { label: 'Product Type Created', value: 'product.created' },
                { label: 'Product Type Updated', value: 'product.updated' },
                { label: 'Product Type Deprecated', value: 'product.deprecated' },
                // System actions
                { label: 'Automated Collection Run', value: 'system.collection_run' },
                { label: 'Credit Score Recalculated', value: 'system.credit_recalc' },
                { label: 'Data Export', value: 'system.data_export' },
            ],
        },
        // ── What Entity Was Affected ───────────────────────────────────────────
        {
            type: 'row',
            fields: [
                {
                    name: 'entity_type',
                    type: 'select',
                    required: true,
                    options: [
                        { label: 'Member', value: 'member' },
                        { label: 'Cooperative', value: 'cooperative' },
                        { label: 'Scheme', value: 'scheme' },
                        { label: 'Contract', value: 'contract' },
                        { label: 'Membership', value: 'membership' },
                        { label: 'Product Type', value: 'product_type' },
                        { label: 'Payment / Transaction', value: 'payment' },
                        { label: 'Wallet', value: 'wallet' },
                        { label: 'Investment', value: 'investment' },
                    ],
                },
                {
                    name: 'entity_id',
                    type: 'text',
                    required: true,
                    index: true,
                    admin: { description: 'Payload document ID of the affected entity.' },
                },
            ],
        },
        // ── Change Data ────────────────────────────────────────────────────────
        {
            name: 'before_state',
            type: 'json',
            admin: { description: 'Snapshot of the entity state before this action. Can be null for create operations.' },
        },
        {
            name: 'after_state',
            type: 'json',
            admin: { description: 'Snapshot of the entity state after this action. Can be null for delete operations.' },
        },
        // ── Metadata ───────────────────────────────────────────────────────────
        {
            name: 'amount_kobo',
            type: 'number',
            admin: { description: 'Financial amount involved in this action (in Kobo). 0 for non-financial actions.' },
        },
        {
            name: 'ip_address',
            type: 'text',
            admin: { description: 'Client IP address at the time of the action.' },
        },
        {
            name: 'user_agent',
            type: 'text',
            admin: { description: 'Browser/client user agent string.' },
        },
        {
            name: 'cooperative',
            // NOTE: text not relationship — Payload singleton returns main DB, not Copteller DB
            type: 'text',
            index: true,
            admin: { description: 'Cooperative document ID context for this action (if applicable). Enables filtering logs by cooperative.' },
        },
        {
            name: 'metadata',
            type: 'json',
            admin: { description: 'Additional action-specific metadata (e.g. payment gateway reference, webhook ID, batch ID).' },
        },
    ],
    timestamps: true,
}
