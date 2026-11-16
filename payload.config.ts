import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'
import { Users } from './collections/Users'
import { Customers } from './collections/Customers'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Categories } from './collections/Categories'
import { Tags } from './collections/Tags'
import { Posts } from './collections/Posts'
import { AccountOfficers } from './collections/AccountOfficers'
import { SiteSettings } from './collections/SiteSettings'
import { ProductTypes } from './collections/ProductTypes'
import { ProductClasses } from './collections/ProductClasses'
import { ProductCategories } from './collections/ProductCategories'
import { ProductApplications } from './collections/ProductApplications'
import { Promotions } from './collections/Promotions'
// Workflow Engine collections
import { Workflows } from './collections/Workflows'
import { WorkflowExecutions } from './collections/WorkflowExecutions'
import { ServiceProviders } from './collections/ServiceProviders'
import { Endpoints } from './collections/Endpoints'
import { ProviderMappings } from './collections/ProviderMappings'
import { Secrets } from './collections/Secrets'
import { ProviderHealthLogs } from './collections/ProviderHealthLogs'
import { ScheduledJobs } from './collections/ScheduledJobs'
import { CustomBlocks } from './collections/CustomBlocks'
import { IdempotencyRecords } from './collections/IdempotencyRecords'
import { ServiceCategories } from './collections/ServiceCategories'
import { Services } from './collections/Services'
// Digital Ledger collections
import { Accounts } from './collections/Accounts'
import { Loans } from './collections/Loans'
import { Transactions } from './collections/Transactions'
import { Beneficiaries } from './collections/Beneficiaries'
// Digital Esusu collections
import { Cooperatives } from './collections/Cooperatives'
import { EsusuCycles } from './collections/EsusuCycles'
import { EsusuMembers } from './collections/EsusuMembers'
import { EsusuContributions } from './collections/EsusuContributions'
import { EsusuPayouts } from './collections/EsusuPayouts'
// Agency Banking collections
import { AgencyTerminals } from './collections/AgencyTerminals'
import { AgencyCommissions } from './collections/AgencyCommissions'
// Smart Cards collections
import { SmartCards } from './collections/SmartCards'
// Standing Orders collections
import { StandingOrders } from './collections/StandingOrders'
// Merchant Payments collections
import { MerchantProfiles } from './collections/MerchantProfiles'
import { MerchantApiKeys } from './collections/MerchantApiKeys'
import { MerchantCheckouts } from './collections/MerchantCheckouts'
// Copteller collections
import { CoptellerWallets } from './collections/CoptellerWallets'
import { CoptellerInvestments } from './collections/CoptellerInvestments'
import { CoptellerContracts } from './collections/CoptellerContracts'
import { CoptellerSchemes } from './collections/CoptellerSchemes'
import { CoptellerProductTypes } from './collections/CoptellerProductTypes'
import { CoptellerMemberships } from './collections/CoptellerMemberships'
import { CoptellerAuditLogs } from './collections/CoptellerAuditLogs'

import { s3Storage } from '@payloadcms/storage-s3'
import { seoPlugin } from '@payloadcms/plugin-seo'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
    admin: {
        user: Users.slug,
        importMap: {
            baseDir: path.resolve(dirname),
        },
        components: {
            views: {
                ApplicationsView: {
                    Component: '@/components/payload/views/ApplicationsView#ApplicationsView',
                    path: '/applications',
                    exact: true,
                },
                WorkflowEditorView: {
                    Component: '@/components/payload/views/WorkflowEditorView#WorkflowEditorView',
                    path: '/workflow-editor/:workflowId',
                },
                WorkflowRunsView: {
                    Component: '@/components/payload/views/WorkflowRunsView#WorkflowRunsView',
                    path: '/workflow-runs',
                },
            },
        },
        // Live Preview: renders an iframe inside the admin edit view
        livePreview: {
            breakpoints: [
                { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
                { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
                { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
            ],
            // Determines which collections get the live preview pane
            collections: ['pages', 'posts'],
            url: ({ data, collectionConfig }) => {
                const baseUrl = process.env.VERCEL_URL
                    ? `https://${process.env.VERCEL_URL}`
                    : process.env.NEXT_PUBLIC_COPTELLER_APP_URL?.replace('/copteller', '') || 'http://localhost:3001'

                if (collectionConfig?.slug === 'posts') {
                    return `${baseUrl}/copteller/${data.slug}`
                }
                return `${baseUrl}/copteller/${data.slug}`
            },
        },
    },
    collections: [
        // Content & Auth
        Users, Customers, Media, Pages, Categories, Tags, Posts,
        // Marketing
        Promotions,
        // Products
        ProductClasses, ProductCategories, ProductTypes, ProductApplications,
        // Workflow Engine
        Workflows, WorkflowExecutions, ServiceProviders, Endpoints, ProviderMappings, Secrets,
        ProviderHealthLogs, ScheduledJobs, CustomBlocks, IdempotencyRecords,
        // Service Pipeline
        ServiceCategories, Services,
        // Digital Ledger
        Accounts, Loans, Transactions, Beneficiaries, AccountOfficers,
        // Digital Esusu
        Cooperatives, EsusuCycles, EsusuMembers, EsusuContributions, EsusuPayouts,
        // Agency Banking
        AgencyTerminals, AgencyCommissions,
        // Smart Cards
        SmartCards, StandingOrders,
        // Merchant Payments
        MerchantProfiles, MerchantApiKeys, MerchantCheckouts,
        // Copteller
        CoptellerWallets, CoptellerInvestments, CoptellerContracts, CoptellerSchemes, CoptellerProductTypes,
        CoptellerMemberships, CoptellerAuditLogs,
    ],
    globals: [SiteSettings],
    editor: lexicalEditor({}),
    secret: process.env.PAYLOAD_SECRET || 'secret-key-for-development',
    db: postgresAdapter({
        pool: {
            connectionString: process.env.COPTELLER_DATABASE_URI || process.env.DATABASE_URI || '',
        },
        schemaName: process.env.COPTELLER_DB_SCHEMA || 'copteller',
        // Disable auto-push: tables are managed via Supabase migrations.
        push: false,
    }),
    plugins: [
        // SEO Plugin: adds meta title, description, image, and og preview to Pages and Posts
        seoPlugin({
            collections: ['pages', 'posts'],
            uploadsCollection: 'media',
            generateTitle: ({ doc }) =>
                doc?.title ? `${doc.title} | Copteller Cooperative OS` : 'Copteller Cooperative OS',
            generateDescription: ({ doc }) =>
                doc?.excerpt || doc?.description || 'Autonomous Cooperative Governance, Thrift & Fleet Financing OS',
            generateURL: ({ doc, collectionConfig }) => {
                const baseUrl = process.env.VERCEL_URL
                    ? `https://${process.env.VERCEL_URL}`
                    : process.env.NEXT_PUBLIC_COPTELLER_APP_URL?.replace('/copteller', '') || 'http://localhost:3001'
                return `${baseUrl}/copteller/${doc?.slug}`
            },
        }),
        s3Storage({
            collections: {
                media: {
                    disablePayloadAccessControl: true,
                    generateFileURL: ({ filename, prefix }) => {
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
                        const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || 'public'
                        const path = prefix ? `${prefix}/${filename}` : filename
                        // Use Supabase public URL format instead of the S3 API path
                        return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
                    },
                },
            },
            bucket: process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || 'public',
            config: {
                credentials: {
                    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY || '',
                    secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY || '',
                },
                region: process.env.NEXT_PUBLIC_SUPABASE_REGION || 'us-east-1',
                endpoint: process.env.NEXT_PUBLIC_SUPABASE_URL
                    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/s3`
                    : '',
                forcePathStyle: true,
            },
        }),
    ],
})
