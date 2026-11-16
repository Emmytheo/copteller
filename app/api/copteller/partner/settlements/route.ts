import { NextRequest, NextResponse } from "next/server"
import { getCoptellerAuth } from "@/lib/copteller/auth"
import { INSTITUTIONAL_PARTNERS } from "@/lib/data/partner-directory"

export const dynamic = 'force-dynamic'

export interface SettlementLedgerEntry {
    id: string
    reference: string
    timestamp: string
    partnerSlug: string
    partnerName: string
    sector: 'health' | 'transport' | 'agriculture' | 'commerce' | 'energy'
    entryType: 'wholesale_float_outflow' | 'member_repayment_inflow' | 'margin_spread_accrual' | 'provider_claim_payout'
    description: string
    counterparty: string
    amountKobo: number
    direction: 'debit' | 'credit'
    status: 'settled' | 'processing' | 'reconciled'
    batchId?: string
}

let SETTLEMENT_LEDGER: SettlementLedgerEntry[] = [
    {
        id: "sttl_01",
        reference: "TX-ABSHIA-FLT-2026-091",
        timestamp: "2026-10-25T09:30:00Z",
        partnerSlug: "abshia",
        partnerName: "Abia State Health Insurance Agency",
        sector: "health",
        entryType: "wholesale_float_outflow",
        description: "Bulk Annual Statutory Capitation Pre-Payment (Tranche 4 - 500 Enrollees)",
        counterparty: "ABSHIA Statutory Treasury (Abia Central Bank Escrow)",
        amountKobo: 600000000, // ₦6,000,000
        direction: "debit",
        status: "settled",
        batchId: "BATCH-ABSHIA-OCT26"
    },
    {
        id: "sttl_02",
        reference: "TX-SWEEP-ABA-26-440",
        timestamp: "2026-10-24T18:00:00Z",
        partnerSlug: "abshia",
        partnerName: "Abia State Health Insurance Agency",
        sector: "health",
        entryType: "member_repayment_inflow",
        description: "Weekly Micro-Amortization Sweeps (2,840 Active Beneficiaries at ₦300/wk)",
        counterparty: "Cooperative Daily Ajo Thrift & Wallet Direct-Debit",
        amountKobo: 85200000, // ₦852,000
        direction: "credit",
        status: "reconciled",
        batchId: "SWEEP-W43-2026"
    },
    {
        id: "sttl_03",
        reference: "TX-MARGIN-ACC-26-101",
        timestamp: "2026-10-24T18:05:00Z",
        partnerSlug: "abshia",
        partnerName: "Abia State Health Insurance Agency",
        sector: "health",
        entryType: "margin_spread_accrual",
        description: "Net Financing Spread Margin Realization (16.2% Annualized Yield Allocation)",
        counterparty: "MFB Float Treasury / Reserve Surplus",
        amountKobo: 14200000, // ₦142,000
        direction: "credit",
        status: "reconciled",
        batchId: "SWEEP-W43-2026"
    },
    {
        id: "sttl_04",
        reference: "TX-HOSP-PAY-ABSUTH-01",
        timestamp: "2026-10-23T14:15:00Z",
        partnerSlug: "abshia",
        partnerName: "Abia State Health Insurance Agency",
        sector: "health",
        entryType: "provider_claim_payout",
        description: "Secondary Care & Emergency Surgical Claim Settlement",
        counterparty: "Abia State University Teaching Hospital (ABSUTH)",
        amountKobo: 124000000, // ₦1,240,000
        direction: "debit",
        status: "settled",
        batchId: "MED-CLAIM-Q3-09"
    },
    {
        id: "sttl_05",
        reference: "TX-TVS-OEM-PUR-018",
        timestamp: "2026-10-22T11:00:00Z",
        partnerSlug: "simba-tvs",
        partnerName: "Simba Group & TVS Motors Nigeria",
        sector: "transport",
        entryType: "wholesale_float_outflow",
        description: "OEM Commercial Tricycle Consignment Pre-Funding (15 Units)",
        counterparty: "Simba Assembly & Service Hub Aba",
        amountKobo: 2100000000, // ₦21,000,000
        direction: "debit",
        status: "settled",
        batchId: "TVS-CONSIGN-OCT-02"
    },
    {
        id: "sttl_06",
        reference: "TX-KEKE-SWEEP-26-89",
        timestamp: "2026-10-21T17:00:00Z",
        partnerSlug: "simba-tvs",
        partnerName: "Simba Group & TVS Motors Nigeria",
        sector: "transport",
        entryType: "member_repayment_inflow",
        description: "Weekly Tricycle Lease Inflows (102 Operators at ₦18k/wk)",
        counterparty: "Aba Keke Operators Cooperative Society",
        amountKobo: 183600000, // ₦1,836,000
        direction: "credit",
        status: "reconciled",
        batchId: "KEKE-SWEEP-W42"
    },
    {
        id: "sttl_07",
        reference: "TX-ATMA-LEVY-BULK-01",
        timestamp: "2026-10-20T10:30:00Z",
        partnerSlug: "abia-transport",
        partnerName: "Abia State Ministry of Transport & ATMA",
        sector: "transport",
        entryType: "wholesale_float_outflow",
        description: "Annual Vehicle Inspection & Transport Permit Statutory Pool Pre-Payment",
        counterparty: "Abia State Board of Internal Revenue / ATMA Treasury",
        amountKobo: 404400000, // ₦4,044,000
        direction: "debit",
        status: "settled",
        batchId: "ATMA-LEVY-OCT-01"
    },
    {
        id: "sttl_08",
        reference: "TX-USAID-RECON-HARVEST",
        timestamp: "2026-10-18T16:00:00Z",
        partnerSlug: "usaid-agro",
        partnerName: "USAID / Feed the Future Agribusiness",
        sector: "agriculture",
        entryType: "member_repayment_inflow",
        description: "Harvest-End Agro Input Credit Sweep (Umuahia Cassava Farmers)",
        counterparty: "Abia ADP Central Seed & Fertilizer Depot",
        amountKobo: 380000000, // ₦3,800,000
        direction: "credit",
        status: "reconciled",
        batchId: "AGRO-RECON-HARVEST-26"
    }
]

export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const { searchParams } = new URL(req.url)
        const partnerSlug = searchParams.get('partner')
        const sector = searchParams.get('sector')
        const type = searchParams.get('type')
        const search = searchParams.get('search')?.toLowerCase().trim()

        let list = [...SETTLEMENT_LEDGER]

        if (partnerSlug && partnerSlug !== 'all') {
            list = list.filter(item => item.partnerSlug === partnerSlug)
        }
        if (sector && sector !== 'all') {
            list = list.filter(item => item.sector === sector)
        }
        if (type && type !== 'all') {
            list = list.filter(item => item.entryType === type)
        }
        if (search) {
            list = list.filter(item =>
                item.reference.toLowerCase().includes(search) ||
                item.description.toLowerCase().includes(search) ||
                item.counterparty.toLowerCase().includes(search)
            )
        }

        const totalWholesaleOutflowKobo = list
            .filter(i => i.entryType === 'wholesale_float_outflow' || i.entryType === 'provider_claim_payout')
            .reduce((acc, i) => acc + i.amountKobo, 0)

        const totalMemberInflowsKobo = list
            .filter(i => i.entryType === 'member_repayment_inflow')
            .reduce((acc, i) => acc + i.amountKobo, 0)

        const totalMarginSpreadKobo = list
            .filter(i => i.entryType === 'margin_spread_accrual')
            .reduce((acc, i) => acc + i.amountKobo, 0)

        const netFloatDeficitKobo = Math.max(0, totalWholesaleOutflowKobo - totalMemberInflowsKobo)

        return NextResponse.json({
            success: true,
            total: list.length,
            ledger: list,
            summary: {
                totalWholesaleOutflowKobo,
                totalMemberInflowsKobo,
                totalMarginSpreadKobo,
                netFloatDeficitKobo,
                reconciliationHealth: "99.2% on-schedule"
            }
        })
    } catch (err: any) {
        console.error("Settlement Ledger GET Error:", err)
        return NextResponse.json({ error: err.message || "Failed to load settlement ledger" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const {
            partnerSlug = 'abshia',
            sector = 'health',
            entryType = 'wholesale_float_outflow',
            description,
            counterparty,
            amountKobo
        } = body

        if (!description || !amountKobo || !counterparty) {
            return NextResponse.json({ error: "Description, counterparty, and amount are required" }, { status: 400 })
        }

        const partner = INSTITUTIONAL_PARTNERS.find(p => p.slug === partnerSlug) || INSTITUTIONAL_PARTNERS[0]
        const reference = `TX-${partnerSlug.toUpperCase()}-${Date.now().toString().slice(-6)}`

        const newEntry: SettlementLedgerEntry = {
            id: `sttl_${Date.now()}`,
            reference,
            timestamp: new Date().toISOString(),
            partnerSlug,
            partnerName: partner.name,
            sector,
            entryType,
            description,
            counterparty,
            amountKobo: Number(amountKobo),
            direction: entryType.includes('inflow') || entryType.includes('spread') ? 'credit' : 'debit',
            status: "settled",
            batchId: `MANUAL-${Date.now().toString().slice(-4)}`
        }

        SETTLEMENT_LEDGER.unshift(newEntry)

        return NextResponse.json({
            success: true,
            entry: newEntry,
            message: "Float transaction recorded and settled in the institutional ledger."
        })
    } catch (err: any) {
        console.error("Settlement Ledger POST Error:", err)
        return NextResponse.json({ error: err.message || "Failed to post settlement entry" }, { status: 500 })
    }
}
