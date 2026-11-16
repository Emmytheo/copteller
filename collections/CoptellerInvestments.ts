import type { CollectionConfig } from 'payload'

export const CoptellerInvestments: CollectionConfig = {
    slug: 'copteller-investments',
    admin: {
        useAsTitle: 'name',
        group: 'Copteller',
        defaultColumns: ['name', 'type', 'cost', 'weekly_payback', 'status', 'createdAt'],
        description: 'Asset registries listed by partners for Hire Purchase and profit sharing.',
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
        },
        {
            name: 'type',
            type: 'select',
            required: true,
            defaultValue: 'keke',
            options: [
                { label: 'Tricycle (Keke)', value: 'keke' },
                { label: 'Agro Machinery', value: 'agro' },
                { label: 'Retail Equipment', value: 'retail' },
            ],
        },
        {
            name: 'asset_details',
            type: 'textarea',
            admin: { description: 'Specs, serial numbers, chassis IDs, etc.' },
        },
        {
            name: 'investor',
            // NOTE: text not relationship — Payload singleton returns main DB, not Copteller DB
            type: 'text',
            required: true,
            index: true,
            admin: { description: 'Customer ID (from copteller.customers) \u2014 the partner/investor listing this asset.' },
        },
        {
            name: 'cost',
            type: 'number',
            required: true,
            admin: { description: 'Original cost in kobo.' },
        },
        {
            name: 'weekly_payback',
            type: 'number',
            required: true,
            admin: { description: 'Target weekly payment in kobo.' },
        },
        {
            name: 'target_yield',
            type: 'number',
            required: true,
            admin: { description: 'Total hire purchase payback amount in kobo.' },
        },
        {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'available',
            options: [
                { label: 'Available', value: 'available' },
                { label: 'Allocated', value: 'allocated' },
                { label: 'Completed (Fully Paid)', value: 'completed' },
            ],
        },
    ],
    timestamps: true,
}
