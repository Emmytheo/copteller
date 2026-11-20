import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerPool } from '@/lib/copteller/pg'
import { isProductionMaintenanceBlocked, requireCoptellerRole } from '@/lib/copteller/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        if (isProductionMaintenanceBlocked()) {
            return NextResponse.json({ error: 'Destructive seed endpoint is disabled in production.' }, { status: 403 })
        }
        const auth = await requireCoptellerRole(req, ['superadmin'])
        if (auth instanceof NextResponse) return auth

        const pool = getCoptellerPool()

        const custRes = await pool.query("SELECT * FROM copteller.customers WHERE first_name ILIKE '%Chinedu%' LIMIT 1")
        const chinedu = custRes.rows[0]
        if (!chinedu) return NextResponse.json({ error: 'Chinedu not found' }, { status: 404 })

        const accRes = await pool.query("SELECT * FROM copteller.accounts WHERE customer_id = $1 LIMIT 1", [chinedu.id])
        const acc = accRes.rows[0]
        if (!acc) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

        // Clear existing
        await pool.query("DELETE FROM copteller.social_circle_contributions")
        await pool.query("DELETE FROM copteller.social_circle_members")
        await pool.query("DELETE FROM copteller.social_circles")

        // Circle 1: Rotational Esusu
        const c1 = await pool.query(`
            INSERT INTO copteller.social_circles (
                creator_id, name, description, circle_type, category, contribution_amount,
                frequency, target_amount, current_pool, total_collected, max_members, current_round,
                status, invite_code, vault_account_id
            ) VALUES (
                $1, 'Aba Keke Drivers Weekly Esusu & Maintenance Rotation',
                'Automated weekly thrift rotation for tricycle operators across Aba North and South unions. Zero defaulting with automated escrow lock.',
                'rotational_esusu', 'cooperative', 10000.00,
                'weekly', 120000.00, 70000.00, 240000.00, 12, 3,
                'active', 'KEKE-ABA-26', $2
            ) RETURNING id
        `, [acc.user_id, acc.id])

        await pool.query(`
            INSERT INTO copteller.social_circle_members (circle_id, user_id, account_id, name, phone_number, role, rotation_order, has_received_payout, total_contributed, status)
            VALUES 
            ($1, $2, $3, 'Chinedu Okafor (Chairman)', '08012345678', 'admin', 1, true, 30000.00, 'active'),
            ($1, 'sys_member_1', null, 'Emeka Nwosu', '08031112233', 'member', 2, true, 30000.00, 'active'),
            ($1, 'sys_member_2', null, 'Kalu Ibe', '08024445566', 'member', 3, false, 30000.00, 'active'),
            ($1, 'sys_member_3', null, 'Sunday Ogbonna', '08057778899', 'member', 4, false, 30000.00, 'active'),
            ($1, 'sys_member_4', null, 'Uche Nnanna', '08069990011', 'member', 5, false, 30000.00, 'active'),
            ($1, 'sys_member_5', null, 'Obinna Eze', '08072223344', 'member', 6, false, 30000.00, 'active'),
            ($1, 'sys_member_6', null, 'Pastor Christian', '08095556677', 'member', 7, false, 30000.00, 'active')
        `, [c1.rows[0].id, acc.user_id, acc.id])

        // Circle 2: Target Vault
        const c2 = await pool.query(`
            INSERT INTO copteller.social_circles (
                creator_id, name, description, circle_type, category, contribution_amount,
                frequency, target_amount, current_pool, total_collected, max_members, current_round,
                status, invite_code, vault_account_id
            ) VALUES (
                $1, 'University Alumni Cooperative Project Fund',
                'Joint target vault toward co-funding the Aba youth tech hub expansion and end-of-year reunion welfare banquet.',
                'target_vault', 'alumni', 25000.00,
                'monthly', 2000000.00, 850000.00, 850000.00, 25, 1,
                'active', 'ABSU-TECH-18', $2
            ) RETURNING id
        `, [acc.user_id, acc.id])

        await pool.query(`
            INSERT INTO copteller.social_circle_members (circle_id, user_id, account_id, name, phone_number, role, rotation_order, has_received_payout, total_contributed, status)
            VALUES 
            ($1, $2, $3, 'Chinedu Okafor', '08012345678', 'admin', null, false, 75000.00, 'active'),
            ($1, 'sys_alumni_1', null, 'Engr. Nnamdi Kanu', '08033334455', 'member', null, false, 75000.00, 'active'),
            ($1, 'sys_alumni_2', null, 'Barrister Ifeoma Okoro', '08055556677', 'member', null, false, 100000.00, 'active'),
            ($1, 'sys_alumni_3', null, 'Dr. Ngozi Adeleke', '08077778899', 'member', null, false, 150000.00, 'active')
        `, [c2.rows[0].id, acc.user_id, acc.id])

        // Circle 3: Ariaria Traders
        const c3 = await pool.query(`
            INSERT INTO copteller.social_circles (
                creator_id, name, description, circle_type, category, contribution_amount,
                frequency, target_amount, current_pool, total_collected, max_members, current_round,
                status, invite_code, vault_account_id
            ) VALUES (
                $1, 'Ariaria Market Electronic Traders Year-End Bulk Hamper Pool',
                'Target cooperative pool for bulk purchasing of wholesale rice, vegetable oil, and generator parts directly from factories.',
                'target_vault', 'traders', 15000.00,
                'monthly', 600000.00, 315000.00, 315000.00, 15, 1,
                'active', 'ARIARIA-BULK', $2
            ) RETURNING id
        `, [acc.user_id, acc.id])

        await pool.query(`
            INSERT INTO copteller.social_circle_members (circle_id, user_id, account_id, name, phone_number, role, rotation_order, has_received_payout, total_contributed, status)
            VALUES 
            ($1, $2, $3, 'Chinedu Okafor', '08012345678', 'member', null, false, 45000.00, 'active'),
            ($1, 'sys_trader_1', null, 'Chief Boniface (Line 4)', '08021113355', 'admin', null, false, 60000.00, 'active'),
            ($1, 'sys_trader_2', null, 'Mama Adaeze Provision Stores', '08042224466', 'member', null, false, 60000.00, 'active')
        `, [c3.rows[0].id, acc.user_id, acc.id])

        return NextResponse.json({ success: true, message: 'Seeded 3 realistic circles successfully' })
    } catch (err: any) {
        console.error('Seed error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
