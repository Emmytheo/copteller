import type { CollectionConfig } from 'payload'

export const CoptellerWallets: CollectionConfig = {
    slug: 'copteller-wallets',
    admin: {
        useAsTitle: 'id',
        group: 'Copteller',
        defaultColumns: ['customer', 'balance', 'type', 'status', 'createdAt'],
        description: 'Ledger wallets for Copteller members tracking savings, loans, and grants.',
    },
    access: {
        read: () => true,
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
        delete: ({ req }) => req.user?.role === 'admin',
    },
    fields: [
        {
            name: 'customer',
            // NOTE: text not relationship — Payload singleton returns main DB, not Copteller DB
            type: 'text',
            required: true,
            index: true,
            admin: { description: 'Customer ID (from copteller.customers).' },
        },
        {
            name: 'user_id',
            type: 'text',
            required: true,
            index: true,
        },
        {
            name: 'balance',
            type: 'number',
            required: true,
            defaultValue: 0,
            admin: { description: 'Balance in kobo (NGN). Divide by 100 for display.' },
        },
        {
            name: 'type',
            type: 'select',
            required: true,
            defaultValue: 'savings',
            options: [
                { label: 'Savings Wallet', value: 'savings' },
                { label: 'Grant Wallet', value: 'grant' },
                { label: 'Loan Wallet', value: 'loan' },
            ],
        },
        {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'active',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Frozen', value: 'frozen' },
            ],
        },
    ],
    timestamps: true,
}
