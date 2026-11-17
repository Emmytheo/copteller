export interface CoopProduct {
    id: string
    name: string
    category: 'lease' | 'ajo' | 'grant' | 'loan'
    interestRate: number
    durationMonths: number
    targetCapital: number
    status: 'active' | 'draft' | 'closed'
    // Bank-level regulatory fields
    sector_tags?: ('transport' | 'agriculture' | 'commerce' | 'artisan')[]
    bankProductTypeId?: string
    min_amount?: number
    max_amount?: number
    max_interest_rate?: number
    tagline?: string
    description?: string
}

export interface Application {
    id: string
    productId: string
    userId: string
    userName: string
    amount: number
    status: 'pending' | 'approved' | 'rejected' | 'disbursed'
    dateApplied: string
}

export interface CoopInvestment {
    id: string
    schemeId: string
    investorName: string
    amountFunded: number
    yieldEarned: number
    status: 'active' | 'completed'
    dateInvested: string
}

// Ensure global singleton in development so HMR doesn't reset it
const globalForCopteller = global as unknown as {
    coptellerProducts: CoopProduct[]
    coptellerApplications: Application[]
    coptellerInvestments: CoopInvestment[]
}

export const coptellerProducts = globalForCopteller.coptellerProducts || [
    // -- Transport Sector -------------------------------------------------
    {
        id: "prod_trn_1",
        name: "Tricycle (Keke) Hire Purchase Lease",
        category: "lease",
        sector_tags: ["transport"],
        interestRate: 14.8,
        max_interest_rate: 18,
        durationMonths: 24,
        min_amount: 500000,
        max_amount: 2000000,
        targetCapital: 1400000,
        status: "active",
        tagline: "Asset-backed keke acquisition with weekly repayment",
        description: "Structured hire purchase for tricycle operators. Weekly deductions from escrow wallet. Investor-funded pool."
    },
    {
        id: "prod_trn_2",
        name: "Motorcycle (Okada) HP Lease",
        category: "lease",
        sector_tags: ["transport"],
        interestRate: 16,
        max_interest_rate: 18,
        durationMonths: 18,
        min_amount: 200000,
        max_amount: 800000,
        targetCapital: 650000,
        status: "active",
        tagline: "Okada operator motorcycle acquisition lease",
        description: "Hire purchase scheme for motorcycle riders. 18-month term, weekly deductions tracked via escrow."
    },
    {
        id: "prod_trn_3",
        name: "Transport Operators Rotational Ajo",
        category: "ajo",
        sector_tags: ["transport"],
        interestRate: 0,
        durationMonths: 8,
        min_amount: 15000,
        max_amount: 50000,
        targetCapital: 160000,
        status: "active",
        tagline: "Weekly rotating thrift contributions for drivers",
        description: "Rotating esusu savings cycle for transport union members. Each member takes turns receiving the pooled weekly contribution."
    },
    // -- Agriculture Sector ------------------------------------------------
    {
        id: "prod_agr_1",
        name: "Agro Machinery Lease - Seasonal Input",
        category: "lease",
        sector_tags: ["agriculture"],
        interestRate: 12.5,
        max_interest_rate: 15,
        durationMonths: 18,
        min_amount: 500000,
        max_amount: 6000000,
        targetCapital: 4500000,
        status: "active",
        tagline: "Tractors, planters & irrigation on hire purchase",
        description: "Agro machinery acquisition for farming cooperatives. Seasonal repayment cycles aligned to harvest income."
    },
    {
        id: "prod_agr_2",
        name: "Seasonal Crop Input Micro-Loan",
        category: "loan",
        sector_tags: ["agriculture"],
        interestRate: 10,
        max_interest_rate: 14,
        durationMonths: 6,
        min_amount: 50000,
        max_amount: 500000,
        targetCapital: 250000,
        status: "active",
        tagline: "Short-term crop input financing for planting season",
        description: "Micro-loan for seeds, fertilizer, and farm inputs. 6-month tenure aligned with a single growing season."
    },
    {
        id: "prod_agr_3",
        name: "Farmers Rotational Ajo Savings",
        category: "ajo",
        sector_tags: ["agriculture"],
        interestRate: 0,
        durationMonths: 12,
        min_amount: 10000,
        max_amount: 50000,
        targetCapital: 120000,
        status: "active",
        tagline: "Monthly rotating thrift for smallholder farmers",
        description: "Rotational savings cycle for agricultural cooperative members. Monthly payout per member rotation."
    },
    // -- Commerce Sector ----------------------------------------------------
    {
        id: "prod_com_1",
        name: "Market Stall Inventory Lease",
        category: "lease",
        sector_tags: ["commerce"],
        interestRate: 13,
        max_interest_rate: 16,
        durationMonths: 24,
        min_amount: 300000,
        max_amount: 2000000,
        targetCapital: 1200000,
        status: "active",
        tagline: "Stall fit-out and inventory financing for market traders",
        description: "Hire purchase for market stall equipment and inventory stock. Weekly deductions tracked via escrow wallet."
    },
    {
        id: "prod_com_2",
        name: "Trading Capital Micro-Loan",
        category: "loan",
        sector_tags: ["commerce"],
        interestRate: 5,
        max_interest_rate: 10,
        durationMonths: 6,
        min_amount: 50000,
        max_amount: 500000,
        targetCapital: 500000,
        status: "active",
        tagline: "Short-term stock capital for traders",
        description: "Working capital micro-loan for market traders to purchase stock before peak seasons."
    },
    {
        id: "prod_com_3",
        name: "Market Traders Daily Ajo Cycle",
        category: "ajo",
        sector_tags: ["commerce"],
        interestRate: 0,
        durationMonths: 4,
        min_amount: 5000,
        max_amount: 20000,
        targetCapital: 80000,
        status: "active",
        tagline: "Daily thrift contributions for market women",
        description: "Daily ajo savings cycle for market traders. Short 4-month cycle with daily collection and weekly rotation."
    },
    // -- Artisan Sector -----------------------------------------------------
    {
        id: "prod_art_1",
        name: "Work Tools & Equipment Lease",
        category: "lease",
        sector_tags: ["artisan"],
        interestRate: 14,
        max_interest_rate: 18,
        durationMonths: 18,
        min_amount: 100000,
        max_amount: 800000,
        targetCapital: 600000,
        status: "active",
        tagline: "Industrial tools hire purchase for artisan guilds",
        description: "Hire purchase for sewing machines, buffing wheels, welding sets, and carpentry tools. Weekly escrow deductions."
    },
    {
        id: "prod_art_2",
        name: "Artisan Tool Subsidy Grant",
        category: "grant",
        sector_tags: ["artisan"],
        interestRate: 0,
        durationMonths: 12,
        min_amount: 50000,
        max_amount: 300000,
        targetCapital: 200000,
        status: "draft",
        tagline: "Government-backed tool acquisition grants for skilled workers",
        description: "Federal micro-enterprise tool acquisition grant. Non-repayable for approved artisan guild members."
    },
    {
        id: "prod_art_3",
        name: "Artisan Guild Rotational Ajo",
        category: "ajo",
        sector_tags: ["artisan"],
        interestRate: 0,
        durationMonths: 6,
        min_amount: 10000,
        max_amount: 30000,
        targetCapital: 90000,
        status: "active",
        tagline: "Weekly rotating thrift for guild chapter members",
        description: "Rotational esusu savings cycle for artisan guild members. Weekly payout cycle per member rotation."
    },
]

export const coptellerApplications = globalForCopteller.coptellerApplications || [
    { id: "app_1", productId: "prod_agr_2", userId: "usr_1", userName: "Kalu Onyekachi", amount: 200000, status: "pending", dateApplied: new Date(Date.now() - 86400000 * 2).toISOString() }
]

export const coptellerInvestments = globalForCopteller.coptellerInvestments || [
    { id: "inv_1", schemeId: "prod_trn_1", investorName: "Chioma Nwachukwu", amountFunded: 80000000, yieldEarned: 11840000, status: "active", dateInvested: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: "inv_2", schemeId: "prod_trn_1", investorName: "Ezenwa Ventures MFB", amountFunded: 60000000, yieldEarned: 8880000, status: "active", dateInvested: new Date(Date.now() - 86400000 * 15).toISOString() },
    { id: "inv_3", schemeId: "prod_trn_2", investorName: "Nnamdi Obi (Aba Angel Group)", amountFunded: 45000000, yieldEarned: 7200000, status: "active", dateInvested: new Date(Date.now() - 86400000 * 20).toISOString() },
    { id: "inv_4", schemeId: "prod_trn_2", investorName: "Kalu Onyekachi", amountFunded: 20000000, yieldEarned: 3200000, status: "active", dateInvested: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: "inv_5", schemeId: "prod_agr_1", investorName: "Regional Agricultural Cooperative Fund", amountFunded: 300000000, yieldEarned: 37500000, status: "active", dateInvested: new Date(Date.now() - 86400000 * 60).toISOString() },
    { id: "inv_6", schemeId: "prod_agr_1", investorName: "Green Growth Capital LLC", amountFunded: 150000000, yieldEarned: 18750000, status: "active", dateInvested: new Date(Date.now() - 86400000 * 45).toISOString() },
    { id: "inv_7", schemeId: "prod_com_1", investorName: "Ariaria Market Retail Fund", amountFunded: 90000000, yieldEarned: 11700000, status: "active", dateInvested: new Date(Date.now() - 86400000 * 12).toISOString() },
    { id: "inv_8", schemeId: "prod_com_1", investorName: "Ezenwa Ventures MFB", amountFunded: 30000000, yieldEarned: 3900000, status: "active", dateInvested: new Date(Date.now() - 86400000 * 8).toISOString() },
    { id: "inv_9", schemeId: "prod_art_1", investorName: "Aba Guild Co-Investment", amountFunded: 60000000, yieldEarned: 8400000, status: "active", dateInvested: new Date(Date.now() - 86400000 * 5).toISOString() }
]

if (process.env.NODE_ENV !== 'production') {
    globalForCopteller.coptellerProducts = coptellerProducts
    globalForCopteller.coptellerApplications = coptellerApplications
    globalForCopteller.coptellerInvestments = coptellerInvestments
}
