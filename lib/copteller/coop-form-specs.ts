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
     * Union Leader / Cooperative President signature block on application forms.
     * Reinstated to true by default for official society endorsement.
     */
    requireUnionClearance: boolean
    /**
     * Partner Microfinance Bank / Bank Auditor approval signature block.
     * Optional (false by default); cooperatives or admins may enable when bank countersignature is required.
     */
    requireBankSignature: boolean
    /**
     * Form density/privacy preset:
     * - "standard": full KYC/registration metadata, BVN/DOB, and account class checkboxes
     * - "lite": minimal non-sensitive field capture (omits BVN/NIN/DOB/email, registration data, and account class strip)
     */
    formMode?: "standard" | "lite"
    requirePassportPhoto: boolean
    requireBvn: boolean
    /**
     * Configurable label for Part C contribution amount field (defaults to "Target Contribution Amount (₦)").
     */
    contributionFieldLabel?: string
    /**
     * When true, pre-fills defaultContributionNaira on printed forms.
     * When false (default), leaves the contribution line blank so each member can write their chosen amount.
     */
    prefillContributionAmount?: boolean
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
    certificateCode?: string
    registrationDate?: string
    issuingAuthority?: string
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
                { id: "route_park", label: "Primary Operating Route / Park", type: "text", required: true, placeholder: "e.g. Umuahia Main Market – Isi Gate" },
                { id: "vehicle_reg", label: "Tricycle (Keke) Plate / Chassis No.", type: "text", required: false, placeholder: "Optional if applying for new fleet" },
                { id: "next_of_kin_name", label: "Next of Kin / Guarantor Full Name", type: "text", required: true, placeholder: "Full legal name" },
                { id: "next_of_kin_phone", label: "Next of Kin / Guarantor Phone", type: "tel", required: true, placeholder: "080..." },
            ]
        case "commerce":
            return [
                { id: "market_stall", label: "Market Name & Shop / Stall No.", type: "text", required: true, placeholder: "e.g. Line B, Shop 14" },
                { id: "trade_category", label: "Primary Trade / Goods Category", type: "text", required: false, placeholder: "e.g. Provisions, Textiles" },
                { id: "next_of_kin_name", label: "Next of Kin Full Name", type: "text", required: true, placeholder: "Full legal name" },
                { id: "next_of_kin_phone", label: "Next of Kin Contact Phone", type: "tel", required: true, placeholder: "080..." },
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
        // Union Leader signature reinstated as default (true)
        requireUnionClearance: typeof rawSpec?.requireUnionClearance === "boolean" ? rawSpec.requireUnionClearance : true,
        // Partner Bank / MFB signature is optional (false by default)
        requireBankSignature: typeof rawSpec?.requireBankSignature === "boolean" ? rawSpec.requireBankSignature : false,
        formMode: rawSpec?.formMode === "lite" ? "lite" : "standard",
        requirePassportPhoto: typeof rawSpec?.requirePassportPhoto === "boolean" ? rawSpec.requirePassportPhoto : true,
        requireBvn: typeof rawSpec?.requireBvn === "boolean" ? rawSpec.requireBvn : true,
        contributionFieldLabel: rawSpec?.contributionFieldLabel?.trim() || "Target Contribution Amount (₦)",
        prefillContributionAmount: typeof rawSpec?.prefillContributionAmount === "boolean" ? rawSpec.prefillContributionAmount : false,
        allowedFrequencies,
        defaultFrequency,
        defaultContributionNaira: rawSpec?.defaultContributionNaira ?? defaults?.contributionNaira,
        customFields: Array.isArray(rawSpec?.customFields) && rawSpec!.customFields.length > 0
            ? rawSpec!.customFields
            : getSectorDefaultFields(sector),
    }
}

export const OFFICIAL_KEKE_COOP_REG_NO = "ABSG/MOPASP/2026/00430"

export const PRESET_REGISTERED_COOPS: RegisteredCoopDirectoryItem[] = [
    {
        id: "preset_keke_owners",
        name: "KEKE OWNERS & OPERATORS MULTI-PURPOSE CO-OPERATIVE SOCIETY LIMITED",
        description: "Registered under Section 5(1) of the Nigeria Co-operative Societies Act 2004 (Abia State COOP 15, Reg. No. ABSG/MOPASP/2026/00430) for commercial tricycle (Keke) owners and operators.",
        sector: "transport",
        segment: "Tricycle (Keke) Owners & Operators",
        cooperativeType: "multipurpose",
        regNumber: OFFICIAL_KEKE_COOP_REG_NO,
        certificateCode: "COOP 15",
        registrationDate: "14 October 2026",
        issuingAuthority: "Director of Cooperatives, Abia State of Nigeria",
        state: "Abia State",
        lga: "Umuahia",
        membersCount: 10,
        adminName: "Union Leadership Secretariat",
        cycleFrequency: "weekly",
        defaultContributionNaira: 15000,
        authorizedProducts: [],
        memberFormSpec: {
            declarationPurpose: "KEKE OWNERS & OPERATORS MULTI-PURPOSE CO-OPERATIVE SOCIETY LIMITED (Reg. No: ABSG/MOPASP/2026/00430)",
            requireUnionClearance: true,
            requireBankSignature: false,
            requirePassportPhoto: true,
            requireBvn: true,
            contributionFieldLabel: "Target Contribution Amount (₦)",
            prefillContributionAmount: false,
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
            requireUnionClearance: true,
            requireBankSignature: false,
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
            requireUnionClearance: true,
            requireBankSignature: false,
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
            requireBankSignature: false,
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
    const contribRaw = Number(c?.defaultContributionAmount ?? c?.default_contribution_amount ?? 0)
    const defaultContributionNaira =
        contribRaw > 0 ? (contribRaw >= 100000 ? Math.round(contribRaw / 100) : contribRaw) : undefined

    const sector = String(c?.sector || "commerce")
    const meta = (c?.metadata && typeof c.metadata === "object" ? c.metadata : {}) as Record<string, any>
    const rawSpec = (meta.memberFormSpec || c?.memberFormSpec || null) as Partial<CoopMemberFormSpec> | null
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

    const cycleFreqRaw = c?.cycleFrequency ?? c?.cycle_frequency
    const cycleFrequency: ContributionFrequency =
        cycleFreqRaw === "daily" || cycleFreqRaw === "monthly" ? cycleFreqRaw : "weekly"

    return {
        id: String(c.id),
        name: String(c.name || "Registered Cooperative"),
        description: c.description ? String(c.description) : undefined,
        sector,
        segment: c.segment ? String(c.segment) : undefined,
        cooperativeType: c.cooperative_type ? String(c.cooperative_type) : undefined,
        regNumber: c.registration_number ? String(c.registration_number) : undefined,
        certificateCode: meta.certificate_form_code ? String(meta.certificate_form_code) : undefined,
        registrationDate: meta.registration_date_display
            ? String(meta.registration_date_display)
            : meta.registration_date
                ? String(meta.registration_date)
                : undefined,
        issuingAuthority: meta.issuing_authority ? String(meta.issuing_authority) : undefined,
        state: c.state ? String(c.state) : undefined,
        lga: c.lga ? String(c.lga) : undefined,
        membersCount: Number(c.current_member_count || c.members_count || 0),
        adminName,
        cycleFrequency,
        defaultContributionNaira,
        authorizedProducts,
        memberFormSpec: resolveMemberFormSpec(String(c.name || ""), rawSpec, sector, {
            frequency: cycleFrequency,
            contributionNaira: defaultContributionNaira,
        }),
        isPreset: false,
    }
}
