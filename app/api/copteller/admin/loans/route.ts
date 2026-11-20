import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole } from '@/lib/copteller/auth'
import { withCoptellerTransaction } from '@/lib/copteller/pg'
import crypto from 'crypto'

const ALLOWED_STATUSES = ['pending', 'active', 'repaid', 'defaulted', 'written_off', 'rejected'] as const

export async function GET(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['coop_admin', 'superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const payload = await getDb()
        const result = await payload.find({
            collection: 'loans',
            limit: 100,
            sort: '-createdAt',
            overrideAccess: true,
        })

        return NextResponse.json({ success: true, loans: result.docs })
    } catch (error: any) {
        console.error('Fetch admin loans error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['coop_admin', 'superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const { loan_id, status } = body

        if (!loan_id || !status) {
            return NextResponse.json({ error: 'loan_id and status are required' }, { status: 400 })
        }

        if (!ALLOWED_STATUSES.includes(status)) {
            return NextResponse.json({ error: `Invalid loan status: ${status}` }, { status: 400 })
        }

        const result = await withCoptellerTransaction(async (client) => {
            const loanRes = await client.query(
                `SELECT * FROM copteller.loans WHERE id = $1 FOR UPDATE`,
                [Number(loan_id)]
            )
            const loan = loanRes.rows[0]
            if (!loan) {
                throw new Error('Loan record not found.')
            }

            let disbursementRef: string | null = null
            let creditedAccountId: number | null = null

            // Atomic disbursement when transitioning a pending loan to active
            if (status === 'active' && loan.status === 'pending') {
                const principalKobo = Number(loan.principal || 0)
                if (principalKobo <= 0) {
                    throw new Error('Cannot disburse a loan with zero or negative principal.')
                }

                const accRes = await client.query(
                    loan.account_id
                        ? `SELECT * FROM copteller.accounts WHERE id = $1 FOR UPDATE`
                        : `SELECT * FROM copteller.accounts WHERE user_id = $1 AND status = 'active' ORDER BY id ASC LIMIT 1 FOR UPDATE`,
                    [loan.account_id || loan.user_id]
                )
                const targetAccount = accRes.rows[0]
                if (!targetAccount) {
                    throw new Error('Borrower has no active Copteller account to receive loan disbursement.')
                }

                const newBalance = Number(targetAccount.balance || 0) + principalKobo
                creditedAccountId = targetAccount.id
                disbursementRef = `COPT_DISB_${loan.id}_${Date.now()}_${crypto.randomBytes(2).toString('hex').toUpperCase()}`

                await client.query(
                    `UPDATE copteller.accounts SET balance = $1, last_transaction_at = NOW(), updated_at = NOW() WHERE id = $2`,
                    [newBalance, targetAccount.id]
                )

                await client.query(
                    `INSERT INTO copteller.transactions (
                        reference, type, amount, currency, to_account_id, loan_id,
                        status, narration, channel, balance_after, date, customer_id, user_id,
                        created_at, updated_at
                    ) VALUES (
                        $1, 'disbursement', $2, 'NGN', $3, $4,
                        'successful', $5, 'admin', $6, NOW(), $7, $8,
                        NOW(), NOW()
                    )`,
                    [
                        disbursementRef,
                        principalKobo,
                        targetAccount.id,
                        loan.id,
                        `Copteller Loan Disbursement #${loan.id} (${loan.purpose || 'Cooperative Credit'})`,
                        newBalance,
                        loan.customer_id || targetAccount.customer_id || null,
                        loan.user_id,
                    ]
                )

                const updLoan = await client.query(
                    `UPDATE copteller.loans
                     SET status = 'active', account_id = COALESCE(account_id, $1),
                         disbursed_at = NOW(), updated_at = NOW()
                     WHERE id = $2
                     RETURNING *`,
                    [targetAccount.id, loan.id]
                )

                await client.query(
                    `INSERT INTO copteller.copteller_audit_logs (
                        actor_id, actor_role, actor_name, action, entity_type, entity_id,
                        metadata, created_at, updated_at
                    ) VALUES ($1, $2, $3, 'LOAN_DISBURSED_ATOMIC', 'LOAN', $4, $5, NOW(), NOW())`,
                    [
                        auth.userId,
                        auth.role,
                        auth.displayName || auth.email || 'Admin',
                        String(loan.id),
                        JSON.stringify({
                            reference: disbursementRef,
                            principalKobo,
                            creditedAccountId,
                            previousStatus: loan.status,
                        }),
                    ]
                )

                return { loan: updLoan.rows[0], disbursementRef, creditedAccountId }
            }

            // Standard status update (e.g., rejected / repaid / defaulted / written_off)
            const updLoan = await client.query(
                `UPDATE copteller.loans
                 SET status = $1, updated_at = NOW()
                 WHERE id = $2
                 RETURNING *`,
                [status, loan.id]
            )

            await client.query(
                `INSERT INTO copteller.copteller_audit_logs (
                    actor_id, actor_role, actor_name, action, entity_type, entity_id,
                    metadata, created_at, updated_at
                ) VALUES ($1, $2, $3, 'LOAN_STATUS_UPDATED', 'LOAN', $4, $5, NOW(), NOW())`,
                [
                    auth.userId,
                    auth.role,
                    auth.displayName || auth.email || 'Admin',
                    String(loan.id),
                    JSON.stringify({ previousStatus: loan.status, nextStatus: status }),
                ]
            )

            return { loan: updLoan.rows[0], disbursementRef, creditedAccountId }
        })

        return NextResponse.json({
            success: true,
            loan: result.loan,
            disbursementReference: result.disbursementRef,
            creditedAccountId: result.creditedAccountId,
        })
    } catch (error: any) {
        console.error('Update loan error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 400 })
    }
}
