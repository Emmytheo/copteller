/**
 * lib/copteller/types.ts
 * Centralised TypeScript interfaces and types for the Copteller platform.
 * All Copteller pages and API routes should import from here.
 */

// ─── Product Types ───────────────────────────────────────────────────────────

export type CoptellerProductCategory = 'ajo' | 'lease' | 'loan' | 'grant' | 'bond' | 'insurance'

export type CoptellerProductTypeSlug =
    | 'ajo_rotation'
    | 'hire_purchase'
    | 'micro_loan'
    | 'grant'
    | 'cooperative_bond'
    | 'savings_drive'
    | 'insurance_pool'

export type RepaymentFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'lump_sum'

export type CollateralType = 'none' | 'asset' | 'group_guarantee' | 'cash' | 'property' | 'personal_guarantee'

export type SectorTag =
    | 'transport' | 'agriculture' | 'commerce' | 'artisan'
    | 'health' | 'education' | 'technology' | 'professional'
    | 'housing' | 'manufacturing' | 'energy' | 'financial_services' | 'all'

export interface CoptellerProductType {
    id: string
    name: string
    tagline?: string
    description?: string
    product_type: CoptellerProductTypeSlug
    category: CoptellerProductCategory
    sub_type?: string
    sector_tags?: SectorTag[]
    status: 'active' | 'draft' | 'deprecated'
    repayment_frequency: RepaymentFrequency
    max_members_per_cycle?: number
    // Financial guardrails
    interest_rate?: number
    max_interest_rate?: number
    min_amount?: number
    max_amount?: number
    min_duration_months?: number
    max_duration_months?: number
    // Risk
    requires_guarantor?: boolean
    requires_credit_check?: boolean
    min_credit_score?: number
    collateral_type?: CollateralType
    // Assignment rules
    auto_assign_on_approval?: boolean
    allow_cross_sector_request?: boolean
    allow_multiple_per_member?: boolean
    createdAt: string
    updatedAt: string
}

// ─── Cooperative ─────────────────────────────────────────────────────────────

export type CooperativeType =
    | 'thrift_credit' | 'multipurpose' | 'agricultural' | 'transport'
    | 'trade' | 'professional' | 'housing' | 'consumer' | 'women' | 'youth' | 'other'

export type CooperativeSector =
    | 'transport' | 'agriculture' | 'commerce' | 'artisan'
    | 'health' | 'education' | 'technology' | 'professional'
    | 'housing' | 'manufacturing' | 'energy' | 'financial_services' | 'other'

export type CooperativeStatus = 'pending' | 'active' | 'suspended' | 'closed'

export interface Cooperative {
    id: string
    name: string
    description?: string
    union_leader: { id: string; first_name?: string; last_name?: string } | string
    cooperative_type: CooperativeType
    sector: CooperativeSector
    segment?: string
    registration_number?: string
    state?: string
    lga?: string
    address?: string
    status: CooperativeStatus
    bank_approval_date?: string
    max_members?: number
    current_member_count?: number
    authorized_product_types?: CoptellerProductType[]
    escrowFeePercent: number
    investorYieldSplitPercent: number
    defaultContributionAmount: number
    cycleFrequency: RepaymentFrequency
    marketplaceEnabled?: boolean
    membership_fee_kobo?: number
    monthly_dues_kobo?: number
    late_payment_penalty_kobo?: number
    createdAt: string
    updatedAt: string
}

// ─── Schemes ─────────────────────────────────────────────────────────────────

export type SchemeType =
    | 'ajo_rotation' | 'hire_purchase' | 'loan_pool' | 'grant' | 'bond' | 'savings_drive'

export type SchemeStatus =
    | 'draft' | 'pending_approval' | 'active' | 'paused' | 'completed' | 'cancelled'

export interface CoptellerScheme {
    id: string
    name: string
    description?: string
    cooperative: Cooperative | string
    product_type?: CoptellerProductType | string
    scheme_type: SchemeType
    status: SchemeStatus
    bank_approved: boolean
    // Financial
    target_capital: number
    funded_capital: number
    contribution_amount: number
    yield_rate: number
    repayment_frequency: RepaymentFrequency
    duration_months?: number
    expected_yield?: number
    profit_sharing_percentage: number
    // Schedule & capacity
    start_date?: string
    end_date?: string
    max_participants?: number
    enrolled_count: number
    // Ajo rotation
    payout_order?: string[]
    current_payout_slot: number
    createdAt: string
    updatedAt: string
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export type ContractType =
    | 'ajo_enrollment' | 'hire_purchase' | 'micro_loan' | 'grant' | 'savings_bond' | 'group_savings'

export type ContractStatus =
    | 'pending' | 'active' | 'paused' | 'defaulted' | 'completed' | 'cancelled'

export interface CoptellerContract {
    id: string
    member: { id: string; first_name?: string; last_name?: string } | string
    cooperative: Cooperative | string
    scheme: CoptellerScheme | string
    investment?: string
    contract_type: ContractType
    status: ContractStatus
    // Asset details (HP / Lease)
    asset_name?: string
    asset_identifier?: string
    asset_value?: number
    // Financial tracking
    due_amount: number
    repayment_frequency: RepaymentFrequency
    total_paid: number
    total_obligation: number
    missed_payments: number
    payment_streak: number
    // Schedule
    start_date: string
    end_date?: string
    next_due_date?: string
    ajo_slot_number?: number
    notes?: string
    metadata?: Record<string, any>
    createdAt: string
    updatedAt: string
}

// ─── Memberships ──────────────────────────────────────────────────────────────

export type MemberRole = 'member' | 'admin' | 'treasurer' | 'secretary' | 'chairperson' | 'patron'
export type MemberStatus = 'pending' | 'active' | 'suspended' | 'exited' | 'blacklisted'

export interface CoptellerMembership {
    id: string
    membership_number?: string
    member: { id: string; first_name?: string; last_name?: string } | string
    cooperative: Cooperative | string
    role: MemberRole
    status: MemberStatus
    joined_date: string
    exit_date?: string
    total_contributed: number
    outstanding_balance: number
    credit_score: number
    shares_owned: number
    notes?: string
    createdAt: string
    updatedAt: string
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface CoptellerApiResponse<T> {
    data: T
    meta?: {
        total: number
        page: number
        limit: number
        hasMore: boolean
    }
    error?: string
}

// ─── Legacy types (kept for backwards compatibility) ──────────────────────────

/** @deprecated Use CoptellerProductType */
export interface CoopProduct {
    id: string
    name: string
    category: CoptellerProductCategory
    interestRate: number
    durationMonths: number
    targetCapital: number
    status: 'active' | 'draft' | 'closed'
    sector_tags?: SectorTag[]
    bankProductTypeId?: string
    min_amount?: number
    max_amount?: number
    max_interest_rate?: number
    tagline?: string
    description?: string
}

/** @deprecated Use CoptellerMembership */
export interface Application {
    id: string
    productId: string
    userId: string
    userName: string
    amount: number
    status: 'pending' | 'approved' | 'rejected' | 'disbursed'
    dateApplied: string
}

/** @deprecated Use CoptellerContract for investor tracking */
export interface CoopInvestment {
    id: string
    schemeId: string
    investorName: string
    amountFunded: number
    yieldEarned: number
    status: 'active' | 'completed'
    dateInvested: string
}
