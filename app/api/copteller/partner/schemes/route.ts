import { NextRequest, NextResponse } from "next/server"
import { getCoptellerAuth } from "@/lib/copteller/auth"
import { INSTITUTIONAL_PARTNERS } from "@/lib/data/partner-directory"

export const dynamic = 'force-dynamic'

export interface PartnerSchemeItem {
    id: string
    code: string
    name: string
    partnerId: string
    partnerSlug: string
    partnerName: string
    sector: 'health' | 'transport' | 'agriculture' | 'commerce' | 'energy'
    description: string
    allocatedCapitalKobo: number
    deployedCapitalKobo: number
    recoveredCapitalKobo: number
    enrolledBeneficiaries: number
    maxCapacityBeneficiaries: number
    wholesalePerUnitKobo: number     // Bulk payment cost per beneficiary
    retailAmortizedPerUnitKobo: number // Total member repayment cost
    repaymentFrequency: 'daily' | 'weekly' | 'monthly'
    weeklyDueKobo: number            // Recurring micro-due amount
    durationMonths: number
    netSpreadMarginKobo: number      // Platform & partner margin yield
    repaymentStreakRate: number      // e.g. 95.4%
    status: 'active' | 'deploying' | 'fully_subscribed' | 'paused'
    eligibleCooperatives: string[]
    requiredProviderType: string
    createdAt: string
}

let DYNAMIC_PARTNER_SCHEMES: PartnerSchemeItem[] = [
    {
        id: "pschem_abshia_basic",
        code: "ABSHIA-SCH-01",
        name: "Abia Informal Sector Health Protection Float",
        partnerId: "partner_abshia",
        partnerSlug: "abshia",
        partnerName: "Abia State Health Insurance Agency (ABSHIA)",
        sector: "health",
        description: "Bulk annual statutory capitation pre-funded by MFB float. Enrolled cooperative members amortize at ₦300/week through daily Ajo thrifts.",
        allocatedCapitalKobo: 5000000000, // ₦50M
        deployedCapitalKobo: 4200000000,  // ₦42M
        recoveredCapitalKobo: 3024000000, // ₦30.24M
        enrolledBeneficiaries: 2840,
        maxCapacityBeneficiaries: 4000,
        wholesalePerUnitKobo: 1200000,    // ₦12,000 / year wholesale
        retailAmortizedPerUnitKobo: 1440000, // ₦14,400 / year retail
        repaymentFrequency: "weekly",
        weeklyDueKobo: 30000,             // ₦300 / week
        durationMonths: 12,
        netSpreadMarginKobo: 68160000,    // ₦2,400 spread margin per enrolled
        repaymentStreakRate: 94.6,
        status: "active",
        eligibleCooperatives: ["All Registered Abia Artisans & Market Cooperatives"],
        requiredProviderType: "Accredited ABSHIA Hospitals & PHCs",
        createdAt: "2026-01-10T08:00:00Z"
    },
    {
        id: "pschem_abshia_family",
        code: "ABSHIA-SCH-02",
        name: "Cooperative Household Family Health Shield",
        partnerId: "partner_abshia",
        partnerSlug: "abshia",
        partnerName: "Abia State Health Insurance Agency (ABSHIA)",
        sector: "health",
        description: "Comprehensive primary & secondary healthcare coverage for 1 principal member, spouse, and up to 4 biological children under 18.",
        allocatedCapitalKobo: 3500000000, // ₦35M
        deployedCapitalKobo: 2450000000,  // ₦24.5M
        recoveredCapitalKobo: 1813000000, // ₦18.13M
        enrolledBeneficiaries: 580,
        maxCapacityBeneficiaries: 1000,
        wholesalePerUnitKobo: 4500000,    // ₦45,000 wholesale
        retailAmortizedPerUnitKobo: 5200000, // ₦52,000 retail
        repaymentFrequency: "weekly",
        weeklyDueKobo: 100000,            // ₦1,000 / week
        durationMonths: 12,
        netSpreadMarginKobo: 40600000,    // ₦7,000 margin per family
        repaymentStreakRate: 96.8,
        status: "active",
        eligibleCooperatives: ["Ariaria International Market Traders Union", "Aba Central Guild"],
        requiredProviderType: "General Hospitals & Specialist Maternity Centers",
        createdAt: "2026-01-15T09:30:00Z"
    },
    {
        id: "pschem_transport_keke",
        code: "MOT-SCH-01",
        name: "TVS King Commercial Tricycle Subvention Lease",
        partnerId: "partner_simba_tvs",
        partnerSlug: "simba-tvs",
        partnerName: "Simba Group & Abia Ministry of Transport",
        sector: "transport",
        description: "OEM wholesale acquisition float with first-loss credit guarantee. Certified operators pay ₦18,000/week towards ownership over 18 months.",
        allocatedCapitalKobo: 25000000000, // ₦250M
        deployedCapitalKobo: 14500000000,  // ₦145M
        recoveredCapitalKobo: 9860000000,  // ₦98.6M
        enrolledBeneficiaries: 102,
        maxCapacityBeneficiaries: 200,
        wholesalePerUnitKobo: 140000000,   // ₦1.4M
        retailAmortizedPerUnitKobo: 162000000, // ₦1.62M
        repaymentFrequency: "weekly",
        weeklyDueKobo: 1800000,            // ₦18,000 / week
        durationMonths: 18,
        netSpreadMarginKobo: 224400000,    // ₦2.24M total spread margin
        repaymentStreakRate: 93.1,
        status: "active",
        eligibleCooperatives: ["Aba Keke Operators Cooperative Society", "Umuahia Tricycle Transporters Union"],
        requiredProviderType: "TVS Simba Assembly & Master Diagnostics Hub",
        createdAt: "2026-02-01T10:00:00Z"
    },
    {
        id: "pschem_transport_levy",
        code: "ATMA-SCH-02",
        name: "ATMA Roadworthiness & Digital Permit Micro-Financing",
        partnerId: "partner_abia_transport",
        partnerSlug: "abia-transport",
        partnerName: "Abia State Ministry of Transport & ATMA",
        sector: "transport",
        description: "Annual statutory vehicle roadworthiness test, emission tag, and digital transport levy bulk paid by MFB, micro-collected at ₦250/day.",
        allocatedCapitalKobo: 8000000000,  // ₦80M
        deployedCapitalKobo: 4100000000,   // ₦41M
        recoveredCapitalKobo: 3200000000,  // ₦32M
        enrolledBeneficiaries: 1348,
        maxCapacityBeneficiaries: 3000,
        wholesalePerUnitKobo: 3000000,     // ₦30,000
        retailAmortizedPerUnitKobo: 3450000, // ₦34,500
        repaymentFrequency: "daily",
        weeklyDueKobo: 175000,             // ₦1,750 / week (₦250/day)
        durationMonths: 6,
        netSpreadMarginKobo: 60660000,
        repaymentStreakRate: 95.8,
        status: "active",
        eligibleCooperatives: ["All Commercial Transport Guilds"],
        requiredProviderType: "ATMA Computerized Inspection Depots",
        createdAt: "2026-02-15T11:00:00Z"
    },
    {
        id: "pschem_usaid_seeds",
        code: "USAID-SCH-01",
        name: "Hybrid Seedling & Bio-Fertilizer 50% Matching Grant",
        partnerId: "partner_usaid_agro",
        partnerSlug: "usaid-agro",
        partnerName: "USAID / Feed the Future Agribusiness Alliance",
        sector: "agriculture",
        description: "50% non-repayable input subvention voucher paired with 50% input credit for cassava, maize, and vegetable farming clusters.",
        allocatedCapitalKobo: 12000000000, // ₦120M
        deployedCapitalKobo: 7600000000,   // ₦76M
        recoveredCapitalKobo: 7600000000,  // Fully recovered on harvest
        enrolledBeneficiaries: 950,
        maxCapacityBeneficiaries: 1500,
        wholesalePerUnitKobo: 8000000,     // ₦80,000 per farmer package
        retailAmortizedPerUnitKobo: 4000000, // ₦40,000 farmer repayment obligation (50% grant)
        repaymentFrequency: "monthly",
        weeklyDueKobo: 1000000,            // ₦10,000 / month
        durationMonths: 4,
        netSpreadMarginKobo: 0,            // Zero-margin social concessionary
        repaymentStreakRate: 98.4,
        status: "active",
        eligibleCooperatives: ["Umuahia Cassava & Grain Farmers Alliance", "Ohafia Agro Producers Coop"],
        requiredProviderType: "Abia ADP Central Seed & Fertilizer Depot",
        createdAt: "2026-03-01T08:00:00Z"
    },
    {
        id: "pschem_smedan_tooling",
        code: "SMEDAN-SCH-01",
        name: "Artisan Workshop Inverter Tooling Facility",
        partnerId: "partner_smedan",
        partnerSlug: "smedan",
        partnerName: "SMEDAN & Federal Ministry of Industry",
        sector: "commerce",
        description: "Industrial equipment financing for Aba shoe-makers, leather-workers, and metal fabricators with 10% SMEDAN equity subvention.",
        allocatedCapitalKobo: 15000000000, // ₦150M
        deployedCapitalKobo: 9200000000,   // ₦92M
        recoveredCapitalKobo: 6100000000,  // ₦61M
        enrolledBeneficiaries: 328,
        maxCapacityBeneficiaries: 500,
        wholesalePerUnitKobo: 28000000,    // ₦280,000
        retailAmortizedPerUnitKobo: 31000000, // ₦310,000
        repaymentFrequency: "weekly",
        weeklyDueKobo: 600000,             // ₦6,000 / week
        durationMonths: 12,
        netSpreadMarginKobo: 98400000,
        repaymentStreakRate: 91.5,
        status: "active",
        eligibleCooperatives: ["Aba North Welders & Metal Fabricators", "Ariaria Leather Manufacturers"],
        requiredProviderType: "SMEDAN Industrial Development Centre Aba",
        createdAt: "2026-03-15T12:00:00Z"
    }
]

export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const { searchParams } = new URL(req.url)
        const partnerSlug = searchParams.get('partner')
        const sector = searchParams.get('sector')
        const search = searchParams.get('search')?.toLowerCase().trim()

        let list = [...DYNAMIC_PARTNER_SCHEMES]

        if (partnerSlug && partnerSlug !== 'all') {
            list = list.filter(s => s.partnerSlug === partnerSlug)
        }
        if (sector && sector !== 'all') {
            list = list.filter(s => s.sector === sector)
        }
        if (search) {
            list = list.filter(s =>
                s.name.toLowerCase().includes(search) ||
                s.code.toLowerCase().includes(search) ||
                s.description.toLowerCase().includes(search) ||
                s.partnerName.toLowerCase().includes(search)
            )
        }

        const totalAllocatedKobo = list.reduce((acc, s) => acc + s.allocatedCapitalKobo, 0)
        const totalDeployedKobo = list.reduce((acc, s) => acc + s.deployedCapitalKobo, 0)
        const totalRecoveredKobo = list.reduce((acc, s) => acc + s.recoveredCapitalKobo, 0)
        const totalEnrolled = list.reduce((acc, s) => acc + s.enrolledBeneficiaries, 0)
        const totalSpreadMarginKobo = list.reduce((acc, s) => acc + s.netSpreadMarginKobo, 0)

        return NextResponse.json({
            success: true,
            total: list.length,
            schemes: list,
            aggregateMetrics: {
                totalAllocatedKobo,
                totalDeployedKobo,
                totalRecoveredKobo,
                totalEnrolled,
                totalSpreadMarginKobo,
                recoveryRate: totalDeployedKobo > 0 ? ((totalRecoveredKobo / totalDeployedKobo) * 100).toFixed(1) : "0"
            }
        })
    } catch (err: any) {
        console.error("Partner Schemes GET Error:", err)
        return NextResponse.json({ error: err.message || "Failed to load partner schemes" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const {
            name,
            partnerSlug = 'abshia',
            sector = 'health',
            description,
            allocatedCapitalKobo = 1000000000,
            wholesalePerUnitKobo = 1200000,
            retailAmortizedPerUnitKobo = 1440000,
            weeklyDueKobo = 30000,
            repaymentFrequency = 'weekly',
            durationMonths = 12,
            maxCapacityBeneficiaries = 500,
            eligibleCooperatives = ["All Abia State Cooperatives"],
            requiredProviderType = "Accredited Facilities"
        } = body

        if (!name || !description) {
            return NextResponse.json({ error: "Scheme name and mandate description are required" }, { status: 400 })
        }

        const partner = INSTITUTIONAL_PARTNERS.find(p => p.slug === partnerSlug) || INSTITUTIONAL_PARTNERS[0]
        const prefix = sector === 'health' ? 'ABSHIA' : sector === 'transport' ? 'MOT' : sector === 'agriculture' ? 'USAID' : 'SMEDAN'
        const code = `${prefix}-SCH-${Math.floor(10 + Math.random() * 90)}`
        const newId = `pschem_${Date.now()}`

        const newScheme: PartnerSchemeItem = {
            id: newId,
            code,
            name,
            partnerId: partner.id,
            partnerSlug: partner.slug,
            partnerName: partner.name,
            sector,
            description,
            allocatedCapitalKobo: Number(allocatedCapitalKobo),
            deployedCapitalKobo: 0,
            recoveredCapitalKobo: 0,
            enrolledBeneficiaries: 0,
            maxCapacityBeneficiaries: Number(maxCapacityBeneficiaries),
            wholesalePerUnitKobo: Number(wholesalePerUnitKobo),
            retailAmortizedPerUnitKobo: Number(retailAmortizedPerUnitKobo),
            repaymentFrequency,
            weeklyDueKobo: Number(weeklyDueKobo),
            durationMonths: Number(durationMonths),
            netSpreadMarginKobo: 0,
            repaymentStreakRate: 100,
            status: "deploying",
            eligibleCooperatives: Array.isArray(eligibleCooperatives) ? eligibleCooperatives : [eligibleCooperatives],
            requiredProviderType,
            createdAt: new Date().toISOString()
        }

        DYNAMIC_PARTNER_SCHEMES.unshift(newScheme)

        return NextResponse.json({
            success: true,
            scheme: newScheme,
            message: "Institutional scheme tranche created and staged for capital deployment."
        })
    } catch (err: any) {
        console.error("Partner Schemes POST Error:", err)
        return NextResponse.json({ error: err.message || "Failed to create partner scheme" }, { status: 500 })
    }
}
