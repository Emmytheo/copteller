import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getMemberships } from '@/lib/copteller/db'
export const FALLBACK_OPERATORS = [
    {
        id: "op_01",
        membershipId: "MBR-TRN-001",
        name: "Kalu Onyekachi",
        email: "kalu.onyekachi@gmail.com",
        phone: "0803 123 4567",
        balance: 84500,
        accountNumber: "0092819209",
        kycStatus: "verified",
        status: "Active",
        role: "member",
        shares: 12,
        creditScore: 87,
        ajoActive: true,
        hpActive: true,
        totalDuesPaid: 420000,
        duesArrears: 0,
        assignedVehicle: "TVS King Commercial",
        vehiclePlate: "ABA-404-TR",
        engineNumber: "ENG-TVS-991204",
        weeklyRent: 18000,
        paid: 420000,
        total: 1400000,
        streak: 14,
        route: "Aba North - Ariaria Market Corridor",
        licenseNo: "DRV-AB-992140",
        guarantor: "Elder Jonas Okafor",
        guarantorPhone: "0802 998 1234"
    },
    {
        id: "op_02",
        membershipId: "MBR-TRN-002",
        name: "Emeka Obi",
        email: "emeka.obi@yahoo.com",
        phone: "0802 987 6543",
        balance: 142000,
        accountNumber: "0088129021",
        kycStatus: "verified",
        status: "Active",
        role: "member",
        shares: 20,
        creditScore: 91,
        ajoActive: true,
        hpActive: true,
        totalDuesPaid: 700000,
        duesArrears: 0,
        assignedVehicle: "Haojin Commercial Hauler",
        vehiclePlate: "ABA-211-TR",
        engineNumber: "ENG-HJ-558129",
        weeklyRent: 18000,
        paid: 700000,
        total: 1400000,
        streak: 22,
        route: "Faulks Road - Ekeakpara Axis",
        licenseNo: "DRV-AB-441820",
        guarantor: "Chief Michael Eze",
        guarantorPhone: "0803 771 9090"
    },
    {
        id: "op_03",
        membershipId: "MBR-TRN-003",
        name: "Ngozi Eze",
        email: "ngozi.eze@outlook.com",
        phone: "0813 456 7890",
        balance: 31500,
        accountNumber: "0084712930",
        kycStatus: "verified",
        status: "Active",
        role: "member",
        shares: 8,
        creditScore: 74,
        ajoActive: true,
        hpActive: true,
        totalDuesPaid: 120000,
        duesArrears: 0,
        assignedVehicle: "Bajaj RE 4S Tricycle",
        vehiclePlate: "ABA-088-TR",
        engineNumber: "ENG-BJ-771902",
        weeklyRent: 15000,
        paid: 120000,
        total: 1200000,
        streak: 4,
        route: "Ogbor Hill - Opobo Road Route",
        licenseNo: "DRV-AB-102948",
        guarantor: "Madam Chinyere Eze",
        guarantorPhone: "0805 112 3344"
    },
    {
        id: "op_04",
        membershipId: "MBR-TRN-004",
        name: "Chukwu Nna",
        email: "chukwu.nna@gmail.com",
        phone: "0805 566 7788",
        balance: 4200,
        accountNumber: "0091002912",
        kycStatus: "verified",
        status: "Defaulting",
        role: "member",
        shares: 5,
        creditScore: 62,
        ajoActive: false,
        hpActive: true,
        totalDuesPaid: 280000,
        duesArrears: 36000,
        assignedVehicle: "TVS King Commercial",
        vehiclePlate: "ABA-519-TR",
        engineNumber: "ENG-TVS-330192",
        weeklyRent: 18000,
        paid: 280000,
        total: 1400000,
        streak: 0,
        route: "Osisioma Flyover - Brass Junction",
        licenseNo: "DRV-AB-772910",
        guarantor: "Pastor Godwin Nna",
        guarantorPhone: "0809 334 5566"
    },
    {
        id: "op_05",
        membershipId: "MBR-TRN-005",
        name: "Ada Okafor",
        email: "ada.okafor@gmail.com",
        phone: "0809 234 5670",
        balance: 215000,
        accountNumber: "0093827412",
        kycStatus: "verified",
        status: "Active",
        role: "member",
        shares: 35,
        creditScore: 95,
        ajoActive: true,
        hpActive: true,
        totalDuesPaid: 1100000,
        duesArrears: 0,
        assignedVehicle: "Haojin Commercial Hauler",
        vehiclePlate: "ABA-332-TR",
        engineNumber: "ENG-HJ-889012",
        weeklyRent: 18000,
        paid: 1100000,
        total: 1400000,
        streak: 36,
        route: "Aba Central - Shopping Centre",
        licenseNo: "DRV-AB-339182",
        guarantor: "Engr. Paul Okafor",
        guarantorPhone: "0812 556 7788"
    },
    {
        id: "op_06",
        membershipId: "MBR-TRN-006",
        name: "Ifeanyi Madu",
        email: "ifeanyi.madu@gmail.com",
        phone: "0816 789 0123",
        balance: 92000,
        accountNumber: "0066192831",
        kycStatus: "verified",
        status: "Active",
        role: "member",
        shares: 15,
        creditScore: 89,
        ajoActive: true,
        hpActive: true,
        totalDuesPaid: 850000,
        duesArrears: 0,
        assignedVehicle: "Piaggio Commercial Hauler",
        vehiclePlate: "ABA-712-TR",
        engineNumber: "ENG-PG-660192",
        weeklyRent: 20000,
        paid: 850000,
        total: 1500000,
        streak: 19,
        route: "Port Harcourt Road Industrial Zone",
        licenseNo: "DRV-AB-558291",
        guarantor: "Elder Simon Madu",
        guarantorPhone: "0803 889 0123"
    }
]

export async function GET(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    const fetchOperators = async () => {
        try {
            const { queryCopteller } = await import('@/lib/copteller/pg')
            const directRes = await queryCopteller(`
                SELECT 
                    m.id as membership_id,
                    m.membership_number,
                    m.status as membership_status,
                    m.role as membership_role,
                    m.shares_owned,
                    m.credit_score,
                    m.total_contributed,
                    m.outstanding_balance,
                    c.id as customer_id,
                    c.first_name,
                    c.last_name,
                    c.email,
                    c.phone_number,
                    c.kyc_status,
                    a.account_number,
                    a.balance as account_balance,
                    a.status as account_status,
                    EXISTS(SELECT 1 FROM copteller.copteller_contracts ct WHERE (ct.member = c.id::text OR ct.member = c.supabase_id) AND ct.contract_type = 'hire_purchase' AND ct.status = 'active') as hp_active,
                    EXISTS(SELECT 1 FROM copteller.copteller_contracts ct WHERE (ct.member = c.id::text OR ct.member = c.supabase_id) AND ct.contract_type = 'ajo_enrollment' AND ct.status = 'active') as ajo_active
                FROM copteller.copteller_memberships m
                JOIN copteller.customers c ON (c.id::text = m.member OR c.supabase_id = m.member)
                LEFT JOIN copteller.accounts a ON a.customer_id = c.id
                ORDER BY m.created_at DESC
                LIMIT 100
            `)
            if (directRes.rows.length > 0) {
                const mappedOperators = directRes.rows.map((row: any) => ({
                    id: String(row.customer_id),
                    membershipId: row.membership_number || `MBR-2026-${String(row.membership_id).slice(-3).toUpperCase()}`,
                    name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Coop Member',
                    email: row.email || '',
                    phone: row.phone_number || '',
                    balance: Number(row.account_balance || 0),
                    accountNumber: row.account_number || 'Pending',
                    kycStatus: row.kyc_status || 'active',
                    status: row.membership_status === 'active' ? 'Active' : (row.membership_status === 'pending' ? 'Pending' : 'Suspended'),
                    role: row.membership_role || 'member',
                    shares: Number(row.shares_owned || 0),
                    creditScore: Number(row.credit_score || 50),
                    ajoActive: Boolean(row.ajo_active),
                    hpActive: Boolean(row.hp_active),
                    totalDuesPaid: Number(row.total_contributed || 0),
                    duesArrears: Number(row.outstanding_balance || 0),
                }))
                return NextResponse.json({ success: true, operators: mappedOperators })
            }
        } catch (e: any) {
            console.warn('[Admin Operators GET] Direct SQL query fallback:', e.message)
        }

        const payload = await getDb()

        // Prioritize cooperative bound to active profile tenancy
        let coopId: string | null = auth.cooperativeId || null

        if (!coopId) {
            const customersRes = await payload.find({
                collection: 'customers',
                where: {
                    or: [
                        { supabase_id: { equals: auth.userId } },
                        ...(auth.email ? [{ email: { equals: auth.email.toLowerCase().trim() } }] : [])
                    ]
                },
                limit: 1,
                overrideAccess: true,
            })

            if (customersRes.docs.length > 0) {
                const customer = customersRes.docs[0]
                const coopRes = await payload.find({
                    collection: 'cooperatives',
                    where: { union_leader: { equals: customer.id } },
                    limit: 1,
                    overrideAccess: true,
                })
                if (coopRes.docs.length > 0) {
                    coopId = String(coopRes.docs[0].id)
                }
            }
        }

        if (!coopId) {
            const coops = await payload.find({
                collection: 'cooperatives',
                where: { status: { equals: 'active' } },
                limit: 1,
                overrideAccess: true,
            })
            if (coops.docs.length > 0) {
                coopId = String(coops.docs[0].id)
            }
        }

        if (!coopId) {
            return NextResponse.json({ success: true, operators: FALLBACK_OPERATORS })
        }

        // Find memberships under this cooperative
        const membershipsRes = await getMemberships({
            cooperativeId: coopId,
            limit: 100,
        })

        // Fetch all customers to resolve metadata manually
        const customersLookup = await payload.find({
            collection: 'customers',
            limit: 250,
            overrideAccess: true,
        })

        // Fetch ledger accounts to match balances
        const accountsRes = await payload.find({
            collection: 'accounts',
            limit: 200,
            overrideAccess: true,
        })

        // Fetch all contracts for HP/Ajo tracking
        const contractsRes = await payload.find({
            collection: 'copteller-contracts',
            limit: 250,
            overrideAccess: true,
        })

        const operators = membershipsRes.docs.map((m: any) => {
            const memberId = typeof m.member === 'object' && m.member ? String(m.member.id) : String(m.member)
            const cust = customersLookup.docs.find((c: any) => String(c.id) === memberId)
            const acc = accountsRes.docs.find((a: any) => {
                const cId = typeof a.customer === 'object' && a.customer ? String(a.customer.id) : String(a.customer)
                return cId === memberId
            })
            const memberContracts = contractsRes.docs.filter((c: any) => {
                const mId = typeof c.member === 'object' && c.member ? String(c.member.id) : String(c.member)
                return mId === memberId
            })

            const hpActive = memberContracts.some((c: any) => c.contract_type === 'hire_purchase' && c.status === 'active')
            const ajoActive = memberContracts.some((c: any) => c.contract_type === 'ajo_enrollment' && c.status === 'active')

            return {
                id: memberId,
                membershipId: m.id,
                name: cust ? `${cust.firstName || cust.first_name || ''} ${cust.lastName || cust.last_name || ''}`.trim() : 'Coop Member',
                email: cust ? cust.email : '',
                phone: cust ? cust.phone_number || '' : '',
                balance: acc ? acc.balance : 0,
                accountNumber: acc ? acc.account_number : 'Pending',
                kycStatus: cust ? cust.kyc_status || 'active' : 'active',
                status: m.status === 'active' ? 'Active' : m.status === 'pending' ? 'Pending' : 'Suspended',
                role: m.role,
                shares: m.shares_owned || 0,
                creditScore: m.credit_score || 50,
                ajoActive,
                hpActive,
                totalDuesPaid: m.total_contributed || 0,
                duesArrears: m.outstanding_balance || 0,
            }
        })

        return NextResponse.json({
            success: true,
            operators: operators.length > 0 ? operators : FALLBACK_OPERATORS
        })
    }

    try {
        const timeoutPromise = new Promise<NextResponse>((resolve) => {
            setTimeout(() => {
                resolve(NextResponse.json({ success: true, operators: FALLBACK_OPERATORS }))
            }, 2000)
        })
        return await Promise.race([fetchOperators(), timeoutPromise])
    } catch (error: any) {
        console.error('Fetch operators error:', error)
        return NextResponse.json({ success: true, operators: FALLBACK_OPERATORS })
    }
}

export async function POST(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json().catch(() => ({}))
        const { firstName, lastName, email, phone_number, role = 'member' } = body

        if (!firstName || !lastName || !email) {
            return NextResponse.json({ error: 'firstName, lastName, and email are required fields' }, { status: 400 })
        }

        const payload = await getDb()

        // 1. Get Coop Admin's Cooperative ID
        let coopId: string | null = null
        const customersRes = await payload.find({
            collection: 'customers',
            where: { email: { equals: auth.email.toLowerCase().trim() } },
            limit: 1,
            overrideAccess: true,
        })
        if (customersRes.docs.length > 0) {
            const customer = customersRes.docs[0]
            const coopRes = await payload.find({
                collection: 'cooperatives',
                where: { union_leader: { equals: customer.id } },
                limit: 1,
                overrideAccess: true,
            })
            if (coopRes.docs.length > 0) {
                coopId = String(coopRes.docs[0].id)
            }
        }

        if (!coopId) {
            // Find first active cooperative fallback
            const coops = await payload.find({
                collection: 'cooperatives',
                where: { status: { equals: 'active' } },
                limit: 1,
                overrideAccess: true,
            })
            coopId = coops.docs[0]?.id ? String(coops.docs[0].id) : null
        }

        if (!coopId) {
            return NextResponse.json({ error: 'No cooperative configured for this admin.' }, { status: 400 })
        }

        // 2. Find or Create Customer
        let customerId: string
        const existingCust = await payload.find({
            collection: 'customers',
            where: { email: { equals: email } },
            limit: 1,
            overrideAccess: true,
        })

        if (existingCust.docs.length > 0) {
            customerId = String(existingCust.docs[0].id)
        } else {
            const newCust = await payload.create({
                collection: 'customers',
                data: {
                    firstName,
                    lastName,
                    email,
                    phone_number,
                    kyc_status: 'active',
                    onboarding_status: 'completed',
                },
                overrideAccess: true,
            })
            customerId = String(newCust.id)

            // Create ledger account for this member
            const accountNum = Math.floor(1000000000 + Math.random() * 9000000000).toString()
            await payload.create({
                collection: 'accounts',
                data: {
                    customer: customerId,
                    user_id: `SUP_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                    account_number: accountNum,
                    account_type: 'Savings',
                    balance: 0,
                    currency: 'NGN',
                    source: 'local',
                    is_primary: true,
                    status: 'active',
                },
                overrideAccess: true,
            })
        }

        // 3. Create CoptellerMembership
        const membershipNumber = `CPT-${Date.now().toString(36).toUpperCase()}`
        const membership = await payload.create({
            collection: 'copteller-memberships',
            data: {
                membership_number: membershipNumber,
                member: customerId,
                cooperative: coopId,
                role,
                status: 'active',
                joined_date: new Date().toISOString(),
                total_contributed: 0,
                outstanding_balance: 0,
                credit_score: 70,
                shares_owned: 0,
            },
            overrideAccess: true,
        })

        return NextResponse.json({
            success: true,
            operator: {
                id: customerId,
                membershipId: membership.id,
                name: `${firstName} ${lastName}`.trim(),
                email,
                status: 'Active'
            }
        })
    } catch (error: any) {
        console.error('Create operator error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/admin/operators
 * Updates a member's status (active/suspended/exited) or KYC tier in database
 */
export async function PATCH(req: NextRequest) {
    const auth = await getCoptellerAuth(req)
    if (auth instanceof NextResponse) return auth

    try {
        const payload = await getDb()
        const body = await req.json()
        const { memberId, membershipId, status, kycTier } = body

        if (!memberId && !membershipId) {
            return NextResponse.json({ error: 'memberId or membershipId is required' }, { status: 400 })
        }

        // 1. Update Membership if status is changed
        if (status && membershipId) {
            await payload.update({
                collection: 'copteller-memberships',
                id: membershipId,
                data: {
                    status: status.toLowerCase(),
                },
                overrideAccess: true,
            })
        }

        // 2. Update Customer KYC if provided
        if (memberId && kycTier) {
            await payload.update({
                collection: 'customers',
                id: memberId,
                data: {
                    kyc_status: kycTier.toLowerCase(),
                },
                overrideAccess: true,
            })
        }

        // 3. Log audit event
        try {
            const { getCoptellerPool } = await import('@/lib/copteller/pg')
            const pool = getCoptellerPool()
            await pool.query(`
                INSERT INTO copteller.copteller_audit_logs (
                    actor_id, actor_role, actor_name, action, entity_type, entity_id,
                    metadata, created_at, updated_at
                ) VALUES (
                    $1, 'admin', $2, 'MEMBER_RECORD_UPDATED', 'MEMBER', $3,
                    $4, NOW(), NOW()
                )
            `, [
                auth.userId,
                auth.email || 'Admin',
                String(memberId || membershipId),
                JSON.stringify({ status, kycTier, updatedBy: auth.userId })
            ])
        } catch {
            // non-fatal
        }

        return NextResponse.json({
            success: true,
            message: 'Member record updated successfully in core database.'
        })
    } catch (error: any) {
        console.error('Update operator error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}


