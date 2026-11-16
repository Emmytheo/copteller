import { NextRequest, NextResponse } from "next/server"
import { getCoptellerAuth } from "@/lib/copteller/auth"
import { ACCREDITED_PROVIDERS, AccreditedProvider } from "@/lib/data/partner-directory"

export const dynamic = 'force-dynamic'

// In-memory extension store for dynamic runtime provider additions
let dynamicProviders: AccreditedProvider[] = [...ACCREDITED_PROVIDERS]

export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const { searchParams } = new URL(req.url)
        const partnerSlug = searchParams.get('partner')
        const sector = searchParams.get('sector')
        const zone = searchParams.get('zone')
        const search = searchParams.get('search')?.toLowerCase().trim()

        let list = [...dynamicProviders]

        if (partnerSlug && partnerSlug !== 'all') {
            list = list.filter(p => p.partnerSlug === partnerSlug)
        }
        if (sector && sector !== 'all') {
            list = list.filter(p => p.sector === sector)
        }
        if (zone && zone !== 'all') {
            list = list.filter(p => p.zone.toLowerCase() === zone.toLowerCase())
        }
        if (search) {
            list = list.filter(p => 
                p.name.toLowerCase().includes(search) ||
                p.address.toLowerCase().includes(search) ||
                p.facilityCode.toLowerCase().includes(search) ||
                p.lga.toLowerCase().includes(search)
            )
        }

        return NextResponse.json({
            success: true,
            total: list.length,
            providers: list
        })
    } catch (err: any) {
        console.error("Partner Providers GET Error:", err)
        return NextResponse.json({ error: err.message || "Failed to load providers" }, { status: 500 })
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
            category = 'specialist_clinic',
            sector = 'health',
            zone = 'Aba',
            lga = 'Aba South',
            address,
            headOfFacility,
            phone,
            capacityBedsOrBays = 40,
            servicesOffered = []
        } = body

        if (!name || !address || !phone) {
            return NextResponse.json({ error: "Facility name, address, and contact phone are required" }, { status: 400 })
        }

        const newId = `prov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        const codePrefix = sector === 'health' ? 'ABSHIA-FAC' : sector === 'transport' ? 'ATMA-WKSH' : 'AGRO-DEPOT'
        const facilityCode = `${codePrefix}-${Math.floor(100 + Math.random() * 900)}`

        const newProvider: AccreditedProvider = {
            id: newId,
            partnerId: partnerSlug === 'abshia' ? 'partner_abshia' : `partner_${partnerSlug}`,
            partnerSlug,
            name,
            category,
            sector,
            facilityCode,
            zone,
            lga,
            address,
            headOfFacility,
            phone,
            capacityBedsOrBays: Number(capacityBedsOrBays) || 20,
            status: "accredited",
            servicesOffered: Array.isArray(servicesOffered) ? servicesOffered : (servicesOffered ? String(servicesOffered).split(',').map((s: string) => s.trim()) : ["Outpatient Care", "General Medicine"])
        }

        dynamicProviders.unshift(newProvider)

        return NextResponse.json({
            success: true,
            provider: newProvider,
            message: `Facility "${name}" (${facilityCode}) accredited successfully.`
        }, { status: 201 })
    } catch (err: any) {
        console.error("Partner Providers POST Error:", err)
        return NextResponse.json({ error: err.message || "Failed to add facility" }, { status: 500 })
    }
}
