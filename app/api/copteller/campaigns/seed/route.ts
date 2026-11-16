import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerPool } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

export async function seedCampaignsData() {
    const pool = getCoptellerPool()

    const custRes = await pool.query("SELECT * FROM copteller.customers WHERE first_name ILIKE '%Chinedu%' LIMIT 1")
    const chinedu = custRes.rows[0]
    const creatorId = chinedu ? chinedu.supabase_id : 'sys_admin'

    const accRes = await pool.query("SELECT id FROM copteller.accounts ORDER BY balance DESC LIMIT 1")
    const fundingAccountId = accRes.rows.length > 0 ? accRes.rows[0].id : null

    // Clear existing
    await pool.query("DELETE FROM copteller.disbursement_recipients")
    await pool.query("DELETE FROM copteller.disbursement_campaigns")

    // Campaign 1: Transport & Keke grant
    const c1 = await pool.query(`
        INSERT INTO copteller.disbursement_campaigns (
            creator_id, creator_name, organization_name, title, description,
            category, funding_account_id, total_budget, total_disbursed, total_claimed,
            total_recipients, claimed_count, status, escrow_reference, created_at, updated_at
        ) VALUES (
            $1, 'Abia State Ministry of Transport & Trade', 'Directorate of Cooperative Wealth Creation',
            'Abia State Transport & Tricycle Welfare Grant',
            'Zero-collateral fuel subsidy and spare parts maintenance grants for registered Keke and bus operators across Aba and Umuahia transit corridors.',
            'grant', $2, 5000000.00, 3200000.00, 2100000.00,
            64, 42, 'active', 'ESC-ABIA-TRANS-2026', NOW(), NOW()
        ) RETURNING id
    `, [creatorId, fundingAccountId])

    const camp1Id = c1.rows[0].id

    await pool.query(`
        INSERT INTO copteller.disbursement_recipients (
            campaign_id, phone_number, full_name, amount, claim_token, status, claimed_at
        ) VALUES 
        ($1, '08034567890', 'Chukwuemeka Okonkwo (Aba Central Keke Union)', 50000.00, 'CLM-KEKE-01', 'claimed', NOW() - INTERVAL '2 days'),
        ($1, '08123456789', 'Ikechukwu Nnamdi (Ekeoha Transit Unit)', 50000.00, 'CLM-KEKE-02', 'claimed', NOW() - INTERVAL '1 day'),
        ($1, '08098765432', 'Emeka Nwosu (Faulks Road Drivers Guild)', 50000.00, 'CLM-KEKE-03', 'claimed', NOW() - INTERVAL '5 hours'),
        ($1, '07031112233', 'Uchenna Eze (Ariaria Express Chapter)', 50000.00, 'CLM-KEKE-04', 'pending', null),
        ($1, '08154443322', 'Godwin Kanu (Osisioma Route Ward)', 50000.00, 'CLM-KEKE-05', 'pending', null)
    `, [camp1Id])

    // Campaign 2: Ariaria Fire Relief
    const c2 = await pool.query(`
        INSERT INTO copteller.disbursement_campaigns (
            creator_id, creator_name, organization_name, title, description,
            category, funding_account_id, total_budget, total_disbursed, total_claimed,
            total_recipients, claimed_count, status, escrow_reference, created_at, updated_at
        ) VALUES (
            $1, 'Ariaria Emergency Welfare Committee', 'Ariaria International Traders Cooperative Society',
            'Ariaria Market Emergency Fire & Burglary Relief Scheme',
            'Direct compensation and restocking liquidity relief disbursed automatically to shop owners and inventory holders affected by electrical surges.',
            'relief', $2, 12500000.00, 8750000.00, 6250000.00,
            50, 35, 'active', 'ESC-ARIARIA-RELIEF-2026', NOW(), NOW()
        ) RETURNING id
    `, [creatorId, fundingAccountId])

    const camp2Id = c2.rows[0].id

    await pool.query(`
        INSERT INTO copteller.disbursement_recipients (
            campaign_id, phone_number, full_name, amount, claim_token, status, claimed_at
        ) VALUES 
        ($1, '08022233344', 'Amaka Obi (Zone 4 Leather Fabricators)', 250000.00, 'CLM-ARIARIA-01', 'claimed', NOW() - INTERVAL '3 days'),
        ($1, '08055566677', 'Barnabas Nwabueze (Line 12 Shoes & Textiles)', 250000.00, 'CLM-ARIARIA-02', 'claimed', NOW() - INTERVAL '12 hours'),
        ($1, '07067778899', 'Chioma Onyinye (Zone 8 Garment Artisans)', 250000.00, 'CLM-ARIARIA-03', 'pending', null)
    `, [camp2Id])

    // Campaign 3: Aba Youth Tech
    const c3 = await pool.query(`
        INSERT INTO copteller.disbursement_campaigns (
            creator_id, creator_name, organization_name, title, description,
            category, funding_account_id, total_budget, total_disbursed, total_claimed,
            total_recipients, claimed_count, status, escrow_reference, created_at, updated_at
        ) VALUES (
            $1, 'Special Adviser on Youth Enterprise', 'Abia Innovation Hub & Digital Guild',
            'Aba Youth Tech & Apprentice Empowerment Fund',
            'Laptop grants, solar workstation toolkits, and software developer monthly stipends for youths enrolled in the Aba Made Tech Incubator.',
            'empowerment', $2, 3500000.00, 1800000.00, 900000.00,
            30, 15, 'active', 'ESC-YOUTH-TECH-2026', NOW(), NOW()
        ) RETURNING id
    `, [creatorId, fundingAccountId])

    const camp3Id = c3.rows[0].id

    await pool.query(`
        INSERT INTO copteller.disbursement_recipients (
            campaign_id, phone_number, full_name, amount, claim_token, status, claimed_at
        ) VALUES 
        ($1, '08044455566', 'Kelechi Madu (Fullstack Apprentice)', 60000.00, 'CLM-TECH-01', 'claimed', NOW() - INTERVAL '1 day'),
        ($1, '08199988877', 'Chidinma Alvan (UI/UX Design Scholar)', 60000.00, 'CLM-TECH-02', 'pending', null)
    `, [camp3Id])
}

export async function POST(req: NextRequest) {
    try {
        await seedCampaignsData()
        return NextResponse.json({
            success: true,
            message: 'Successfully seeded 3 live disbursement campaigns with 10 recipients'
        })
    } catch (err: any) {
        console.error('[Seed Campaigns Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
