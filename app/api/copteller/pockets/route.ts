import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool, queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/pockets
 * Retrieves all household pockets/sub-wallets for the authenticated user,
 * along with their primary account balance and overall savings health.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        // 1. Fetch user's primary active account
        const accRes = await queryCopteller(`
            SELECT id, account_number, balance, status
            FROM copteller.accounts
            WHERE user_id = $1 AND status = 'active'
            ORDER BY created_at ASC
            LIMIT 1
        `, [auth.userId])

        let primaryAccount = accRes.rows[0]
        if (!primaryAccount) {
            // Check via customer lookup
            const custAccRes = await queryCopteller(`
                SELECT a.id, a.account_number, a.balance, a.status
                FROM copteller.accounts a
                JOIN copteller.customers c ON c.id = a.customer_id
                WHERE (c.supabase_id = $1 OR lower(c.email) = lower($2))
                  AND a.status = 'active'
                ORDER BY a.created_at ASC
                LIMIT 1
            `, [auth.userId, auth.email])
            primaryAccount = custAccRes.rows[0]
        }

        if (!primaryAccount) {
            return NextResponse.json({
                success: true,
                hasAccount: false,
                primaryAccount: null,
                pockets: [],
                metrics: { totalStashed: 0, primaryBalance: 0, pocketCount: 0 }
            })
        }

        // 2. Fetch user's pockets
        const pocketsRes = await queryCopteller(`
            SELECT 
                p.*,
                COALESCE((
                    SELECT COUNT(*) 
                    FROM copteller.pocket_transactions pt 
                    WHERE pt.pocket_id = p.id
                ), 0) as transaction_count
            FROM copteller.pockets p
            WHERE p.account_id = $1
            ORDER BY p.created_at DESC
        `, [primaryAccount.id])

        // 3. Fetch recent pocket transactions
        const historyRes = await queryCopteller(`
            SELECT 
                pt.*,
                p.name as pocket_name,
                p.category as pocket_category,
                p.icon as pocket_icon,
                p.color as pocket_color
            FROM copteller.pocket_transactions pt
            JOIN copteller.pockets p ON p.id = pt.pocket_id
            WHERE pt.account_id = $1
            ORDER BY pt.created_at DESC
            LIMIT 20
        `, [primaryAccount.id])

        const pockets = pocketsRes.rows
        const totalStashed = pockets.reduce((sum, p) => sum + Number(p.balance || 0), 0)
        const primaryBalNaira = Number(primaryAccount.balance || 0) / 100

        return NextResponse.json({
            success: true,
            hasAccount: true,
            primaryAccount: {
                id: primaryAccount.id,
                accountNumber: primaryAccount.account_number,
                balanceNaira: primaryBalNaira,
            },
            pockets,
            recentTransactions: historyRes.rows,
            metrics: {
                totalStashed,
                primaryBalance: primaryBalNaira,
                totalNetWorth: primaryBalNaira + totalStashed,
                pocketCount: pockets.length,
            }
        })
    } catch (err: any) {
        console.error('[Pockets GET Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/pockets
 * Creates a new purpose-driven household sub-wallet pocket
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const {
            name,
            category = 'custom', // 'feeding' | 'school_fees' | 'rent' | 'utility' | 'emergency' | 'business' | 'custom'
            targetAmount = 0,
            icon = 'wallet',
            color = 'blue',
            isLocked = false,
            unlockDate = null,
            initialStash = 0
        } = body

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Pocket name is required (e.g. "School Fees", "Feeding & Groceries")' }, { status: 400 })
        }

        const pool = getCoptellerPool()

        // 1. Get primary account
        let accRes = await queryCopteller(`
            SELECT id, balance FROM copteller.accounts 
            WHERE user_id = $1 AND status = 'active'
            ORDER BY created_at ASC LIMIT 1
        `, [auth.userId])

        let primaryAccount = accRes.rows[0]
        if (!primaryAccount) {
            const custAccRes = await queryCopteller(`
                SELECT a.id, a.balance FROM copteller.accounts a
                JOIN copteller.customers c ON c.id = a.customer_id
                WHERE (c.supabase_id = $1 OR lower(c.email) = lower($2)) AND a.status = 'active'
                ORDER BY a.created_at ASC LIMIT 1
            `, [auth.userId, auth.email])
            primaryAccount = custAccRes.rows[0]
        }

        if (!primaryAccount) {
            return NextResponse.json({ error: 'No active primary account found to host this pocket.' }, { status: 404 })
        }

        const initialStashNum = Number(initialStash) || 0
        const initialStashKobo = Math.round(initialStashNum * 100)

        if (initialStashNum > 0 && Number(primaryAccount.balance || 0) < initialStashKobo) {
            return NextResponse.json({
                error: `Insufficient primary balance to perform initial stash of ₦${initialStashNum.toLocaleString()}. Available: ₦${(Number(primaryAccount.balance || 0) / 100).toLocaleString()}`
            }, { status: 400 })
        }

        // 2. Create the pocket
        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            const insertRes = await client.query(`
                INSERT INTO copteller.pockets (
                    user_id, account_id, name, category, target_amount, balance,
                    icon, color, is_locked, unlock_date, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
                RETURNING *
            `, [
                auth.userId,
                primaryAccount.id,
                name.trim(),
                category,
                Number(targetAmount) || 0,
                initialStashNum,
                icon,
                color,
                Boolean(isLocked),
                unlockDate ? new Date(unlockDate) : null
            ])

            const newPocket = insertRes.rows[0]

            // If initial stash, debit main account and record transaction
            if (initialStashNum > 0) {
                const newAccBal = Number(primaryAccount.balance) - initialStashKobo
                await client.query(`
                    UPDATE copteller.accounts
                    SET balance = $1, updated_at = NOW()
                    WHERE id = $2
                `, [newAccBal, primaryAccount.id])

                const txRef = `PKT_STASH_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`
                await client.query(`
                    INSERT INTO copteller.pocket_transactions (
                        pocket_id, account_id, type, amount, balance_after, narration, reference
                    ) VALUES ($1, $2, 'stash', $3, $4, $5, $6)
                `, [
                    newPocket.id,
                    primaryAccount.id,
                    initialStashNum,
                    initialStashNum,
                    `Initial stash for ${name.trim()}`,
                    txRef
                ])

                // Also log to main ledger transactions
                await client.query(`
                    INSERT INTO copteller.transactions (
                        reference, type, amount, from_account_id, status, narration, user_id, balance_after
                    ) VALUES ($1, 'debit', $2, $3, 'successful', $4, $5, $6)
                `, [
                    txRef,
                    initialStashKobo,
                    primaryAccount.id,
                    `Stashed into Pocket: ${name.trim()}`,
                    auth.userId,
                    newAccBal
                ])
            }

            await client.query('COMMIT')

            return NextResponse.json({
                success: true,
                pocket: newPocket,
                message: `Pocket "${name.trim()}" created successfully!`
            })
        } catch (txErr) {
            await client.query('ROLLBACK')
            throw txErr
        } finally {
            client.release()
        }
    } catch (err: any) {
        console.error('[Pockets POST Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
