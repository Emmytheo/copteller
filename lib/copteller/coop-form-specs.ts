export type ContributionFrequency = "daily" | "weekly" | "monthly"

export interface CoopCustomField {
    id: string
    label: string
    type: "text" | "number" | "tel" | "select" | "textarea"
    required?: boolean
    placeholder?: string
    options?: string
}

export interface CoopMemberFormSpec {
    /**
     * Injected into the Part D declaration:
     * "I hereby declare that the information given above is correct for the purposes of {declarationPurpose}."
     */
    declarationPurpose: string
    /**
     * Voluntary/personal engagements do not require Union Leader Clearance (false by default).
     * Traditional trade unions that mandate chairman co-signoff can opt in (true).
     */
    requireUnionClearance: boolean
    requirePassportPhoto: boolean
    requireBvn: boolean
    allowedFrequencies: ContributionFrequency[]
    defaultFrequency: ContributionFrequency
    defaultContributionNaira?: number
    customFields: CoopCustomField[]
}

export interface RegisteredCoopProductSummary {
    id: string
    name: string
    tagline?: string
    form_schema?: any[]
}

export interface RegisteredCoopDirectoryItem {
    id: string
    name: string
    description?: string
    sector: string
    segment?: string
    cooperativeType?: string
    regNumber?: string
    state?: string
    lga?: string
    membersCount: number
    adminName?: string
    cycleFrequency?: ContributionFrequency
    defaultContributionNaira?: number
    authorizedProducts: RegisteredCoopProductSummary[]
    memberFormSpec: CoopMemberFormSpec
    isPreset?: boolean
}

export function getSectorDefaultFields(sector: string): CoopCustomField[] {
    switch (sector) {
        case "transport":
            return [
                { id: "route_park", label: "Primary Operating Route / Park", type: "text", required: true, placeholder: "e.g. Main Market – Express Axis" },
                { id: "vehicle_reg", label: "Tricycle / Vehicle Plate No.", type: "text", required: false, placeholder: "Optional if applying for new fleet" },
                { id: "next_of_kin_phone", label: "Next of Kin / Guarantor Phone", type: "tel", required: true, placeholder: "080..." },
            ]
        case "commerce":
            return [
                { id: "market_stall", label: "Market Name & Shop / Stall No.", type: "text", required: true, placeholder: "e.g. Line B, Shop 14" },
                { id: "trade_category", label: "Primary Trade / Goods Category", type: "text", required: false, placeholder: "e.g. Provisions, Textiles" },
            ]
        case "agriculture":
            return [
                { id: "farm_location", label: "Farm Cluster / Community", type: "text", required: true, placeholder: "Ward / Village cluster" },
                { id: "produce_focus", label: "Primary Crop / Livestock", type: "text", required: true, placeholder: "e.g. Cassava, Poultry" },
            ]
        case "artisan":
            return [
                { id: "workshop_address", label: "Workshop / Studio Address", type: "text", required: true, placeholder: "Craft hub or workshop street" },
                { id: "craft_specialty", label: "Craft Specialty", type: "text", required: false, placeholder: "e.g. Footwear, Garments, Welding" },
            ]
        default:
            return [
                { id: "occupation_unit", label: "Trade / Professional Unit", type: "text", required: false, placeholder: "Unit, guild chapter, or department" },
                { id: "next_of_kin_phone", label: "Next of Kin Contact Phone", type: "tel", required: true, placeholder: "080..." },
            ]
    }
}

export function resolveMemberFormSpec(
    coopName: string,
    rawSpec?: Partial<CoopMemberFormSpec> | null,
    sector = "commerce",
    defaults?: { frequency?: string; contributionNaira?: number }
): CoopMemberFormSpec {
    const cleanName = coopName?.trim() || "Copteller Cooperative System"
    const freqCandidate = (rawSpec?.defaultFrequency || defaults?.frequency || "weekly") as string
    const defaultFrequency: ContributionFrequency =
        freqCandidate === "daily" || freqCandidate === "monthly" ? freqCandidate : "weekly"

    const allowedFrequencies: ContributionFrequency[] =
        Array.isArray(rawSpec?.allowedFrequencies) && rawSpec!.allowedFrequencies.length > 0
            ? rawSpec!.allowedFrequencies.filter((f): f is ContributionFrequency =>
                f === "daily" || f === "weekly" || f === "monthly"
            )
            : ["daily", "weekly", "monthly"]

    return {
        declarationPurpose: rawSpec?.declarationPurpose?.trim() || `the ${cleanName}`,
        // Default to false: voluntary personal engagement, eliminating unnecessary union clearance encumbrance
        requireUnionClearance: typeof rawSpec?.requireUnionClearance === "boolean" ? rawSpec.requireUnionClearance : false,
        requirePassportPhoto: typeof rawSpec?.requirePassportPhoto === "boolean" ? rawSpec.requirePassportPhoto : true,
        requireBvn: typeof rawSpec?.requireBvn === "boolean" ? rawSpec.requireBvn : true,
        allowedFrequencies,
        defaultFrequency,
        defaultContributionNaira: rawSpec?.defaultContributionNaira ?? defaults?.contributionNaira,
        customFields: Array.isArray(rawSpec?.customFields) && rawSpec!.customFields.length > 0
            ? rawSpec!.customFields
            : getSectorDefaultFields(sector),
    }
}

export const PRESET_REGISTERED_COOPS: RegisteredCoopDirectoryItem[] = [
    {
        id: "preset_keke_owners",
        name: "Copteller's Keke Owners and Operators Cooperative",
        description: "Personal & voluntary mobility thrift and hire-purchase fleet cooperative for commercial tricycle owners and drivers.",
        sector: "transport",
        segment: "Tricycle (Keke)",
        cooperativeType: "transport",
        regNumber: "COOP-KEKE-001",
        state: "Multi-State Network",
        lga: "Regional Transit Hubs",
        membersCount: 184,
        adminName: "Cooperative Operations Desk",
        cycleFrequency: "weekly",
        defaultContributionNaira: 15000,
        authorizedProducts: [],
        memberFormSpec: {
            declarationPurpose: "Copteller's KEKE OWNERS and OPERATORS COOPERATIVE",
            requireUnionClearance: false,
            requirePassportPhoto: true,
            requireBvn: true,
            allowedFrequencies: ["daily", "weekly", "monthly"],
            defaultFrequency: "weekly",
            defaultContributionNaira: 15000,
            customFields: getSectorDefaultFields("transport"),
        },
        isPreset: true,
    },
    {
        id: "preset_market_traders",
        name: "Progressive Market Traders Multipurpose Cooperative",
        description: "Daily and weekly rotational thrift (Ajo) and working-capital restock pool for retail & wholesale merchants.",
        sector: "commerce",
        segment: "Retail & Wholesale Traders",
        cooperativeType: "trade",
        regNumber: "COOP-MKT-204",
        state: "National Commercial Hubs",
        lga: "Central Market Zone",
        membersCount: 312,
        adminName: "Merchant Treasury Desk",
        cycleFrequency: "daily",
        defaultContributionNaira: 5000,
        authorizedProducts: [],
        memberFormSpec: {
            declarationPurpose: "Progressive Market Traders Multipurpose Cooperative",
            requireUnionClearance: false,
            requirePassportPhoto: true,
            requireBvn: true,
            allowedFrequencies: ["daily", "weekly", "monthly"],
            defaultFrequency: "daily",
            defaultContributionNaira: 5000,
            customFields: getSectorDefaultFields("commerce"),
        },
        isPreset: true,
    },
    {
        id: "preset_agro_alliance",
        name: "Emerald Agro-Allied Producers Cooperative",
        description: "Seasonal harvest escrow, input procurement, and shared cold-chain financing for crop and poultry producers.",
        sector: "agriculture",
        segment: "Crop & Poultry Farming",
        cooperativeType: "agricultural",
        regNumber: "COOP-AGR-118",
        state: "Agric Belt Chapters",
        lga: "Agro Cluster Zone",
        membersCount: 96,
        adminName: "Agro Cluster Desk",
        cycleFrequency: "monthly",
        defaultContributionNaira: 25000,
        authorizedProducts: [],
        memberFormSpec: {
            declarationPurpose: "Emerald Agro-Allied Producers Cooperative",
            requireUnionClearance: false,
            requirePassportPhoto: true,
            requireBvn: true,
            allowedFrequencies: ["weekly", "monthly"],
            defaultFrequency: "monthly",
            defaultContributionNaira: 25000,
            customFields: getSectorDefaultFields("agriculture"),
        },
        isPreset: true,
    },
    {
        id: "preset_artisan_guild",
        name: "Unified Artisans & Garment Makers Society",
        description: "Equipment acquisition and workshop empowerment scheme requiring guild workshop verification.",
        sector: "artisan",
        segment: "Garment & Footwear Makers",
        cooperativeType: "multipurpose",
        regNumber: "COOP-ART-309",
        state: "Industrial Craft Hubs",
        lga: "Artisan Corridor",
        membersCount: 145,
        adminName: "Craft Guild Secretariat",
        cycleFrequency: "weekly",
        defaultContributionNaira: 10000,
        authorizedProducts: [],
        memberFormSpec: {
            declarationPurpose: "Unified Artisans & Garment Makers Society",
            requireUnionClearance: true,
            requirePassportPhoto: true,
            requireBvn: true,
            allowedFrequencies: ["weekly", "monthly"],
            defaultFrequency: "weekly",
            defaultContributionNaira: 10000,
            customFields: getSectorDefaultFields("artisan"),
        },
        isPreset: true,
    },
]

export function normalizeDbCoopToDirectoryItem(c: any): RegisteredCoopDirectoryItem {
    const contribRaw = Number(c?.defaultContributionAmount ?? 0)
    const defaultContributionNaira =
        contribRaw > 0 ? (contribRaw >= 1000 ? Math.round(contribRaw / 100) : contribRaw) : undefined

    const sector = String(c?.sector || "commerce")
    const rawSpec = (c?.metadata?.memberFormSpec || c?.memberFormSpec || null) as Partial<CoopMemberFormSpec> | null
    const adminName = c?.union_leader && typeof c.union_leader === "object"
        ? [c.union_leader.firstName, c.union_leader.lastName].filter(Boolean).join(" ") || "Cooperative Admin"
        : "Cooperative Admin"

    const authorizedProducts: RegisteredCoopProductSummary[] = Array.isArray(c?.authorized_product_types)
        ? c.authorized_product_types
            .filter((p: any) => p && typeof p === "object")
            .map((p: any) => ({
                id: String(p.id),
                name: String(p.name || "Scheme Product"),
                tagline: p.tagline ? String(p.tagline) : undefined,
                form_schema: Array.isArray(p.form_schema) ? p.form_schema : [],
            }))
        : []

    return {
        id: String(c.id),
        name: String(c.name || "Registered Cooperative"),
        description: c.description ? String(c.description) : undefined,
        sector,
        segment: c.segment ? String(c.segment) : undefined,
        cooperativeType: c.cooperative_type ? String(c.cooperative_type) : undefined,
        regNumber: c.registration_number ? String(c.registration_number) : undefined,
        state: c.state ? String(c.state) : undefined,
        lga: c.lga ? String(c.lga) : undefined,
        membersCount: Number(c.current_member_count || c.members_count || 0),
        adminName,
        cycleFrequency: (c.cycleFrequency === "daily" || c.cycleFrequency === "monthly" ? c.cycleFrequency : "weekly"),
        defaultContributionNaira,
        authorizedProducts,
        memberFormSpec: resolveMemberFormSpec(String(c.name || ""), rawSpec, sector, {
            frequency: c.cycleFrequency,
            contributionNaira: defaultContributionNaira,
        }),
        isPreset: false,
    }
}
