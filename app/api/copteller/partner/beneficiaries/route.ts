import { NextRequest, NextResponse } from "next/server"
import { requireCoptellerRole } from "@/lib/copteller/auth"
import { ACCREDITED_PROVIDERS } from "@/lib/data/partner-directory"

export const dynamic = 'force-dynamic'

// High-fidelity active beneficiaries dataset
const SAMPLE_BENEFICIARIES = [
    {
        id: "ben_01",
        memberName: "Chinedu Okafor",
        phone: "0803 491 8820",
        nin: "29481048291",
        cooperativeName: "Aba Central Transport Guild",
        sector: "transport",
        partnerSlug: "abshia",
        packageName: "ABSHIA Informal Sector Health Cover",
        policyCode: "NAHM-COOP-26-1049",
        assignedProvider: "Regional Teaching Hospital & Clinic Network",
        assignedProviderCode: "NAHM-FAC-001",
        coverageStartDate: "2026-01-15T00:00:00Z",
        coverageExpiryDate: "2027-01-14T23:59:59Z",
        wholesaleFloatCost: 1200000, // ₦12,000
        totalObligation: 1440000,    // ₦14,400
        weeklyDue: 30000,            // ₦300/week
        totalPaid: 960000,           // ₦9,600 paid so far
        repaymentStreakWeeks: 32,
        status: "active_cover",
        dependentsCount: 0
    },
    {
        id: "ben_02",
        memberName: "Amara Okonkwo",
        phone: "0812 900 4812",
        nin: "48201948192",
        cooperativeName: "Ariaria International Market Traders Union",
        sector: "commerce",
        partnerSlug: "abshia",
        packageName: "Cooperative Household Family Health Shield",
        policyCode: "NAHM-COOP-26-1052",
        assignedProvider: "Living Word Mission Hospital Aba",
        assignedProviderCode: "NAHM-FAC-004",
        coverageStartDate: "2026-02-01T00:00:00Z",
        coverageExpiryDate: "2027-01-31T23:59:59Z",
        wholesaleFloatCost: 4500000, // ₦45,000
        totalObligation: 5200000,    // ₦52,000
        weeklyDue: 100000,           // ₦1,000/week
        totalPaid: 3600000,          // ₦36,000
        repaymentStreakWeeks: 36,
        status: "active_cover",
        dependentsCount: 3
    },
    {
        id: "ben_03",
        memberName: "Kalu Onyekachi",
        phone: "0806 331 9021",
        nin: "99182048102",
        cooperativeName: "Aba Keke Operators Cooperative Society",
        sector: "transport",
        partnerSlug: "abia-transport",
        packageName: "TVS King Commercial Tricycle Subvention Lease",
        policyCode: "TRK-LEASE-ABA-404",
        assignedProvider: "TVS Simba Assembly & Master Diagnostics Hub",
        assignedProviderCode: "TVS-WKSH-01",
        coverageStartDate: "2026-03-10T00:00:00Z",
        coverageExpiryDate: "2027-09-10T00:00:00Z",
        wholesaleFloatCost: 140000000, // ₦1.4M
        totalObligation: 162000000,    // ₦1.62M
        weeklyDue: 1800000,            // ₦18k/week
        totalPaid: 54000000,           // ₦540,000
        repaymentStreakWeeks: 30,
        status: "active_cover",
        dependentsCount: 0
    },
    {
        id: "ben_04",
        memberName: "Ngozi Eze",
        phone: "0805 771 2891",
        nin: "88201948123",
        cooperativeName: "Umuahia Cassava & Grain Farmers Alliance",
        sector: "agriculture",
        partnerSlug: "usaid-agro",
        packageName: "Hybrid Seedling & Fertilizer Matching Grant",
        policyCode: "AGRO-USAID-26-881",
        assignedProvider: "Regional Agro Seed & Fertilizer Depot",
        assignedProviderCode: "AGRO-DEPOT-01",
        coverageStartDate: "2026-04-01T00:00:00Z",
        coverageExpiryDate: "2026-10-31T00:00:00Z",
        wholesaleFloatCost: 8000000,  // ₦80,000
        totalObligation: 4000000,     // 50% matching grant subsidy
        weeklyDue: 150000,
        totalPaid: 4000000,           // Fully recovered
        repaymentStreakWeeks: 26,
        status: "completed",
        dependentsCount: 0
    },
    {
        id: "ben_05",
        memberName: "Ifeanyi Umeh",
        phone: "0803 229 1102",
        nin: "11928401928",
        cooperativeName: "Aba North Welders & Metal Fabricators Union",
        sector: "artisan",
        partnerSlug: "smedan",
        packageName: "Artisan Inverter Welding Machine Facility",
        policyCode: "SMEDAN-MFG-ABA-209",
        assignedProvider: "SMEDAN Industrial Development Centre Aba",
        assignedProviderCode: "SMEDAN-IDC-01",
        coverageStartDate: "2026-05-15T00:00:00Z",
        coverageExpiryDate: "2027-05-15T00:00:00Z",
        wholesaleFloatCost: 28000000, // ₦280k
        totalObligation: 31000000,
        weeklyDue: 600000,
        totalPaid: 12000000,
        repaymentStreakWeeks: 20,
        status: "active_cover",
        dependentsCount: 0
    }
]

export async function GET(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['partner', 'superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const { searchParams } = new URL(req.url)
        const partnerSlug = searchParams.get('partner')
        const search = searchParams.get('search')?.toLowerCase().trim()
        const status = searchParams.get('status')
        const cooperative = searchParams.get('cooperative')

        let list = [...SAMPLE_BENEFICIARIES]

        if (partnerSlug && partnerSlug !== 'all') {
            list = list.filter(b => b.partnerSlug === partnerSlug)
        }
        if (status && status !== 'all') {
            list = list.filter(b => b.status === status)
        }
        if (cooperative && cooperative !== 'all') {
            list = list.filter(b => b.cooperativeName.toLowerCase().includes(cooperative.toLowerCase()))
        }
        if (search) {
            list = list.filter(b => 
                b.memberName.toLowerCase().includes(search) ||
                b.phone.includes(search) ||
                b.policyCode.toLowerCase().includes(search) ||
                b.nin.includes(search) ||
                b.assignedProvider.toLowerCase().includes(search)
            )
        }

        const totalObligationKobo = list.reduce((a, b) => a + b.totalObligation, 0)
        const totalPaidKobo = list.reduce((a, b) => a + b.totalPaid, 0)
        const wholesaleCostKobo = list.reduce((a, b) => a + b.wholesaleFloatCost, 0)

        return NextResponse.json({
            success: true,
            total: list.length,
            beneficiaries: list,
            summary: {
                totalWholesaleFloatKobo: wholesaleCostKobo,
                totalObligationKobo,
                totalPaidKobo,
                netAccruedMarginKobo: totalPaidKobo > wholesaleCostKobo ? totalPaidKobo - wholesaleCostKobo : Math.round(totalPaidKobo * 0.16),
                repaymentRatePercent: totalObligationKobo > 0 ? Math.round((totalPaidKobo / totalObligationKobo) * 100) : 0
            }
        })
    } catch (err: any) {
        console.error("Partner Beneficiaries GET Error:", err)
        return NextResponse.json({ error: err.message || "Failed to load beneficiaries" }, { status: 500 })
    }
}
