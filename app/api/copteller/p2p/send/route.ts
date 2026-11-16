import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { getCoptellerPool } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/p2p/send
 * Executes an instant, zero-fee transfer between two Copteller accounts/household members.
 * Supports sending via verified Account Number or Customer ID.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const {
            recipientAccountNumber,
            amount,
            narration = 'Copteller P2P Transfer'
        } = body

        const amountNum = Number(amount)
        if (!amountNum || amountNum <= 0) {
            return NextResponse.json({ error: 'Please enter a valid amount to send.' }, { status: 400 })
        }
        const amountKobo = Math.round(amountNum * 100)

        if (!recipientAccountNumber || !String(recipientAccountNumber).trim()) {
            return NextResponse.json({ error: 'Recipient account number is required.' }, { status: 400 })
        }
        const cleanRecipientAcc = String(recipientAccountNumber).trim()

        const pool = getCoptellerPool()
        const client = await pool.connect()

        try {
            await client.query('BEGIN')

            // 1. Fetch sender's primary account with lock
            let senderAccRes = await client.query(`
                SELECT a.*, TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) as sender_name
                FROM copteller.accounts a
                LEFT JOIN copteller.customers c ON c.id = a.customer_id
                WHERE a.user_id = $1 AND a.status = 'active'
                ORDER BY a.created_at ASC LIMIT 1
                FOR UPDATE OF a
            `, [auth.userId])

            if (senderAccRes.rows.length === 0) {
                // Try customer fallback
                senderAccRes = await client.query(`
                    SELECT a.*, TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) as sender_name
                    FROM copteller.accounts a
                    JOIN copteller.customers c ON c.id = a.customer_id
                    WHERE (c.supabase_id = $1 OR lower(c.email) = lower($2))
                      AND a.status = 'active'
                    ORDER BY a.created_at ASC LIMIT 1
                    FOR UPDATE OF a
                `, [auth.userId, auth.email])
            }

            if (senderAccRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Sender does not have an active Copteller account.' }, { status: 404 })
            }

            const senderAcc = senderAccRes.rows[0]
            const senderBalanceKobo = Number(senderAcc.balance || 0)

            if (senderBalanceKobo < amountKobo) {
                await client.query('ROLLBACK')
                return NextResponse.json({
                    error: `Insufficient funds. Available: ₦${(senderBalanceKobo / 100).toLocaleString()}, Required: ₦${amountNum.toLocaleString()}`
                }, { status: 400 })
            }

            // 2. Fetch recipient account with lock
            const recipientAccRes = await client.query(`
                SELECT a.*, TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) as recipient_name, c.phone_number as recipient_phone
                FROM copteller.accounts a
                LEFT JOIN copteller.customers c ON c.id = a.customer_id
                WHERE a.account_number = $1 AND a.status = 'active'
                FOR UPDATE OF a
            `, [cleanRecipientAcc])

            if (recipientAccRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: `Recipient account ${cleanRecipientAcc} not found or inactive.` }, { status: 404 })
            }

            const recipientAcc = recipientAccRes.rows[0]

            // Prevent sending to own account
            if (recipientAcc.id === senderAcc.id) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'You cannot perform a P2P transfer to the same account.' }, { status: 400 })
            }

            // 3. Debit sender account
            const newSenderBalKobo = senderBalanceKobo - amountKobo
            await client.query(`
                UPDATE copteller.accounts
                SET balance = $1, updated_at = NOW(), last_transaction_at = NOW()
                WHERE id = $2
            `, [newSenderBalKobo, senderAcc.id])

            // 4. Credit recipient account
            const recipientBalanceKobo = Number(recipientAcc.balance || 0)
            const newRecipientBalKobo = recipientBalanceKobo + amountKobo
            await client.query(`
                UPDATE copteller.accounts
                SET balance = $1, updated_at = NOW(), last_transaction_at = NOW()
                WHERE id = $2
            `, [newRecipientBalKobo, recipientAcc.id])

            // 5. Create transaction records
            const txRefDebit = `P2P_DR_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            const txRefCredit = `P2P_CR_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`

            const senderDisplayName = senderAcc.sender_name || auth.displayName || 'Copteller User'
            const recipientDisplayName = recipientAcc.recipient_name || 'Copteller User'

            // Debit log for sender
            await client.query(`
                INSERT INTO copteller.transactions (
                    reference, type, amount, from_account_id, to_account_id,
                    status, narration, user_id, customer_id, balance_after
                ) VALUES ($1, 'debit', $2, $3, $4, 'successful', $5, $6, $7, $8)
            `, [
                txRefDebit,
                amountKobo,
                senderAcc.id,
                recipientAcc.id,
                `P2P transfer to ${recipientDisplayName} (${recipientAcc.account_number}) - ${narration}`,
                auth.userId,
                senderAcc.customer_id,
                newSenderBalKobo
            ])

            // Credit log for recipient
            await client.query(`
                INSERT INTO copteller.transactions (
                    reference, type, amount, from_account_id, to_account_id,
                    status, narration, user_id, customer_id, balance_after
                ) VALUES ($1, 'credit', $2, $3, $4, 'successful', $5, $6, $7, $8)
            `, [
                txRefCredit,
                amountKobo,
                senderAcc.id,
                recipientAcc.id,
                `P2P transfer from ${senderDisplayName} - ${narration}`,
                recipientAcc.user_id,
                recipientAcc.customer_id,
                newRecipientBalKobo
            ])

            await client.query('COMMIT')

            return NextResponse.json({
                success: true,
                message: `₦${amountNum.toLocaleString()} sent instantly to ${recipientDisplayName}!`,
                reference: txRefDebit,
                amount: amountNum,
                fee: 0.00,
                recipientName: recipientDisplayName,
                recipientAccountNumber: recipientAcc.account_number,
                senderBalanceNaira: newSenderBalKobo / 100,
            })
        } catch (txErr) {
            await client.query('ROLLBACK')
            throw txErr
        } finally {
            client.release()
        }
    } catch (err: any) {
        console.error('[P2P Send Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
