import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireCoptellerRole, timingSafeSecretMatch } from '@/lib/copteller/auth'
import { getCoptellerPool, queryCopteller } from '@/lib/copteller/pg'
import { getActivePartnerBankConfig } from '@/lib/copteller/partner-bank-adapter'

export const dynamic = 'force-dynamic'

function isBridgeAuthenticated(req: NextRequest): boolean {
    const headerSecret =
        req.headers.get('x-copteller-bridge-secret') ||
        req.headers.get('x-copteller-internal-secret') ||
        (req.headers.get('authorization')?.startsWith('Bearer ')
            ? req.headers.get('authorization')!.slice(7).trim()
            : null)

    if (!headerSecret) return false
    return (
        timingSafeSecretMatch(headerSecret, process.env.COPTELLER_BRIDGE_SECRET) ||
        timingSafeSecretMatch(headerSecret, process.env.ADMIN_SECRET)
    )
}

async function authorizeBridge(req: NextRequest) {
    if (isBridgeAuthenticated(req)) {
        return { actorEmail: req.headers.get('x-partner-actor') || 'partner-bank@bridge.internal', viaSecret: true }
    }
    const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
    if (auth instanceof NextResponse) return auth
    return { actorEmail: auth.email || 'admin@copteller.app', viaSecret: false }
}

/**
 * GET /api/copteller/banksuite/bridge
 * Headless Cooperative Submodule Read API (v3.0 — Bank-Agnostic & Independently Deployable).
 * Supports:
 *  - Default: full cooperative registry, schemes, contracts, loans, member credit scores, vaults, audit logs & active partnerBank descriptor
 *  - ?action=member_lookup&query=... : lookup active cooperative member wallet for Partner POS Agent Cash-In
 *  - ?action=customer_link&email=...&bvn=... : cross-match a Partner Bank customer with their Copteller Trust Score & active contracts
 */
export async function GET(req: NextRequest) {
    const auth = await authorizeBridge(req)
    if (auth instanceof NextResponse) return auth

    const action = req.nextUrl.searchParams.get('action') || 'snapshot'

    try {
        // 1. Member Lookup (for remote Partner Bank POS Agent Cash-In without DB coupling)
        if (action === 'member_lookup') {
            const clean = String(req.nextUrl.searchParams.get('query') || '').trim()
            if (!clean) {
                return NextResponse.json({ error: 'query parameter is required' }, { status: 400 })
            }
            const res = await queryCopteller(
                `
                SELECT a.id AS account_id, a.account_number, a.balance, a.user_id,
                       c.id AS customer_id,
                       COALESCE(NULLIF(TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')), ''), c.email, a.user_id) AS full_name,
                       c.email, c.phone_number,
                       m.cooperative AS cooperative_ref,
                       co.id AS cooperative_id,
                       COALESCE(co.name, m.cooperative, 'Copteller Cooperative Member') AS cooperative_name
                FROM copteller.accounts a
                LEFT JOIN copteller.customers c ON c.id = a.customer_id OR c.supabase_id = a.user_id
                LEFT JOIN copteller.copteller_memberships m ON m.member = a.user_id OR m.member = c.email
                LEFT JOIN copteller.cooperatives co ON co.id::text = m.cooperative OR LOWER(co.name) = LOWER(m.cooperative)
                WHERE a.status = 'active'
                  AND (
                      a.account_number = $1
                      OR LOWER(COALESCE(c.email, '')) = LOWER($1)
                      OR REPLACE(COALESCE(c.phone_number, ''), ' ', '') LIKE '%' || REPLACE($1, ' ', '') || '%'
                  )
                ORDER BY a.is_primary DESC, a.id ASC
                LIMIT 1
                `,
                [clean]
            )
            const r = res.rows[0]
            if (!r) {
                return NextResponse.json({ success: true, member: null })
            }
            return NextResponse.json({
                success: true,
                member: {
                    accountId: Number(r.account_id),
                    accountNumber: String(r.account_number),
                    balanceKobo: Number(r.balance || 0),
                    userId: String(r.user_id || ''),
                    customerId: r.customer_id ? Number(r.customer_id) : null,
                    fullName: String(r.full_name || 'Cooperative Member'),
                    email: r.email || null,
                    phone: r.phone_number || null,
                    cooperativeId: r.cooperative_id ? Number(r.cooperative_id) : null,
                    cooperativeName: String(r.cooperative_name),
                },
            })
        }

        // 2. Customer Cross-Link (Trust Score & Memberships for Partner Bank Customer 360 / Client Hub)
        if (action === 'customer_link') {
            const email = String(req.nextUrl.searchParams.get('email') || '').trim().toLowerCase()
            const bvn = String(req.nextUrl.searchParams.get('bvn') || '').trim()
            if (!email && !bvn) {
                return NextResponse.json({ success: true, link: null })
            }
            const custRes = await queryCopteller(
                `SELECT id, first_name, last_name, email, phone_number, bvn, supabase_id, kyc_status
                 FROM copteller.customers
                 WHERE ($1 <> '' AND LOWER(email) = $1) OR ($2 <> '' AND bvn = $2)
                 LIMIT 1`,
                [email, bvn]
            )
            const c = custRes.rows[0]
            if (!c) {
                return NextResponse.json({ success: true, link: null })
            }
            const [accRes, memRes, contractRes] = await Promise.all([
                queryCopteller(
                    `SELECT account_number, balance, status FROM copteller.accounts WHERE customer_id = $1 OR user_id = $2 ORDER BY is_primary DESC LIMIT 3`,
                    [c.id, c.supabase_id || '']
                ),
                queryCopteller(
                    `SELECT m.*, co.name AS coop_name, co.registration_number AS coop_reg
                     FROM copteller.copteller_memberships m
                     LEFT JOIN copteller.cooperatives co ON co.id::text = m.cooperative OR LOWER(co.name) = LOWER(m.cooperative)
                     WHERE m.member = $1 OR m.member = $2 OR m.member = $3
                     ORDER BY m.created_at DESC LIMIT 5`,
                    [c.supabase_id || '', c.email || '', String(c.id)]
                ),
                queryCopteller(
                    `SELECT id, contract_type, asset_name, total_obligation, total_paid, payment_streak, missed_payments, status
                     FROM copteller.copteller_contracts
                     WHERE member = $1 OR member = $2 OR member = $3
                     ORDER BY created_at DESC LIMIT 5`,
                    [c.supabase_id || '', c.email || '', String(c.id)]
                ),
            ])

            const totalWalletKobo = accRes.rows.reduce((s, a) => s + Number(a.balance || 0), 0)
            const primaryMem = memRes.rows[0]
            const rawScore = Number(primaryMem?.credit_score || 72)
            const trustScore850 = rawScore > 100 ? rawScore : Math.round(300 + rawScore * 5.5)

            return NextResponse.json({
                success: true,
                link: {
                    linked: true,
                    customerName: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email,
                    walletBalanceKobo: totalWalletKobo,
                    primaryAccountNumber: accRes.rows[0]?.account_number || null,
                    trustScore850,
                    creditTier:
                        trustScore850 >= 740
                            ? 'Tier 1 Prime'
                            : trustScore850 >= 650
                              ? 'Tier 2 Standard'
                              : 'Tier 3 Developing',
                    memberships: memRes.rows,
                    contracts: contractRes.rows,
                },
            })
        }

        // 3. Default: Full Headless Institutional Oversight Snapshot
        const [coopsRes, schemesRes, contractsRes, loansRes, vaultsRes, membersRes, memberScoresRes, auditRes] =
            await Promise.all([
                queryCopteller(`
                    SELECT c.id, c.name, c.description, c.cooperative_type, c.sector, c.segment,
                           c.registration_number, c.state, c.lga, c.status, c.bank_approval_date,
                           c.max_members, c.current_member_count, c.escrow_fee_percent,
                           c.default_contribution_amount, c.cycle_frequency, c.marketplace_enabled,
                           c.metadata, c.created_at,
                           COALESCE(cust.first_name || ' ' || cust.last_name, cust.email, 'Unassigned') AS leader_name,
                           cust.email AS leader_email
                    FROM copteller.cooperatives c
                    LEFT JOIN copteller.customers cust ON cust.id = c.union_leader_id
                    ORDER BY c.created_at DESC LIMIT 200
                `),
                queryCopteller(`
                    SELECT id, name, description, cooperative, scheme_type, status, bank_approved,
                           target_capital, funded_capital, contribution_amount, yield_rate,
                           repayment_frequency, duration_months, max_participants, enrolled_count, created_at
                    FROM copteller.copteller_schemes
                    ORDER BY created_at DESC LIMIT 100
                `),
                queryCopteller(`
                    SELECT id, member, cooperative, scheme_id, contract_type, asset_name,
                           asset_identifier, asset_value, due_amount, weekly_due_amount,
                           repayment_frequency, total_obligation, total_paid, missed_payments,
                           payment_streak, next_due_date, status, created_at
                    FROM copteller.copteller_contracts
                    ORDER BY created_at DESC LIMIT 200
                `),
                queryCopteller(`
                    SELECT l.id, l.user_id, l.account_id, l.principal, l.outstanding_balance,
                           l.interest_rate, l.duration_months, l.status, l.purpose, l.disbursed_at, l.created_at,
                           COALESCE(cust.first_name || ' ' || cust.last_name, cust.email, l.user_id) AS borrower_name,
                           cust.email AS borrower_email, cust.bvn AS borrower_bvn
                    FROM copteller.loans l
                    LEFT JOIN copteller.customers cust ON cust.id = l.customer_id
                    ORDER BY l.created_at DESC LIMIT 100
                `),
                queryCopteller(`
                    SELECT COUNT(*)::int AS account_count,
                           COALESCE(SUM(balance), 0)::bigint AS total_vault_kobo
                    FROM copteller.accounts
                    WHERE status = 'active'
                `),
                queryCopteller(`
                    SELECT COUNT(*)::int AS active_members,
                           COALESCE(AVG(credit_score), 0)::numeric(6,1) AS avg_credit_score,
                           COALESCE(SUM(total_contributed), 0)::bigint AS total_contributed_kobo
                    FROM copteller.copteller_memberships
                    WHERE status = 'active'
                `),
                queryCopteller(`
                    SELECT m.member, m.cooperative, m.credit_score, m.total_contributed, m.status, m.role,
                           COALESCE(c.first_name || ' ' || c.last_name, c.email, m.member) AS member_name,
                           c.email, c.phone_number, c.bvn
                    FROM copteller.copteller_memberships m
                    LEFT JOIN copteller.customers c ON c.supabase_id = m.member OR c.email = m.member OR c.id::text = m.member
                    ORDER BY m.credit_score DESC NULLS LAST
                    LIMIT 50
                `).catch(() => ({ rows: [] as any[] })),
                queryCopteller(`
                    SELECT id, actor_id, actor_role, actor_name, action, entity_type, entity_id, amount_kobo, metadata, created_at
                    FROM copteller.copteller_audit_logs
                    ORDER BY created_at DESC LIMIT 50
                `).catch(() => ({ rows: [] as any[] })),
            ])

        const contracts = contractsRes.rows
        const obligationKobo = contracts.reduce((s, c) => s + Number(c.total_obligation || c.asset_value || 0), 0)
        const collectedKobo = contracts.reduce((s, c) => s + Number(c.total_paid || 0), 0)
        const activeContracts = contracts.filter((c) => c.status === 'active').length
        const defaultingContracts = contracts.filter((c) => c.status === 'defaulted' || Number(c.missed_payments || 0) >= 2).length
        const completedContracts = contracts.filter((c) => c.status === 'completed').length

        return NextResponse.json({
            success: true,
            bridgeVersion: '3.0',
            protocol: 'Copteller-Headless-PartnerBank-5Rail',
            timestamp: new Date().toISOString(),
            partnerBank: getActivePartnerBankConfig(),
            metrics: {
                cooperativeCount: coopsRes.rows.length,
                schemeCount: schemesRes.rows.length,
                activeMembers: Number(membersRes.rows[0]?.active_members || 0),
                avgCreditScore: Number(membersRes.rows[0]?.avg_credit_score || 0),
                totalContributedKobo: Number(membersRes.rows[0]?.total_contributed_kobo || 0),
                contractsTotal: contracts.length,
                contractsActive: activeContracts,
                contractsDefaulting: defaultingContracts,
                contractsCompleted: completedContracts,
                totalContractObligationKobo: obligationKobo,
                totalContractCollectedKobo: collectedKobo,
                collectionRatePct: obligationKobo > 0 ? Number(((collectedKobo / obligationKobo) * 100).toFixed(1)) : 100,
                activeAccounts: Number(vaultsRes.rows[0]?.account_count || 0),
                totalVaultBalanceKobo: Number(vaultsRes.rows[0]?.total_vault_kobo || 0),
            },
            cooperatives: coopsRes.rows.map((c) => ({
                ...c,
                banksuiteEscrowNuban: c.metadata?.banksuite_escrow_nuban || null,
                partnerBankName: c.metadata?.partner_bank_name || null,
            })),
            schemes: schemesRes.rows,
            contracts,
            loans: loansRes.rows,
            memberScores: memberScoresRes.rows,
            auditLogs: auditRes.rows,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Headless bridge query failed' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/banksuite/bridge
 * Headless Cooperative Administration Command Endpoint (v3.0).
 * Allows ANY authenticated Partner Bank (BankSuite, Kuda ops, Qore MFB) to execute
 * cooperative governance, escrow NUBAN binding, POS cash-in wallet crediting, and loan underwriting
 * over signed HTTP — with zero direct database sharing required.
 */
export async function POST(req: NextRequest) {
    const auth = await authorizeBridge(req)
    if (auth instanceof NextResponse) return auth

    try {
        const body = await req.json().catch(() => ({}))
        const action = String(body.action || '').trim()

        // 1. Bind Regulated Partner Bank Escrow NUBAN to a Cooperative
        if (action === 'bind_escrow_nuban') {
            const coopId = Number(body.cooperative_id)
            const escrowNuban = String(body.escrow_nuban || '').trim()
            const partnerBankName = String(body.partner_bank_name || 'Partner MFB').trim()
            const partnerProvider = String(body.partner_provider || 'banksuite').trim()
            if (!coopId || !escrowNuban) {
                return NextResponse.json({ error: 'cooperative_id and escrow_nuban are required' }, { status: 400 })
            }

            const upd = await queryCopteller(
                `UPDATE copteller.cooperatives
                 SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb,
                     updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, name, status, metadata`,
                [
                    JSON.stringify({
                        banksuite_escrow_nuban: escrowNuban,
                        partner_bank_name: partnerBankName,
                        partner_bank_provider: partnerProvider,
                        escrow_bound_at: new Date().toISOString(),
                        escrow_bound_by: auth.actorEmail,
                    }),
                    coopId,
                ]
            )
            if (!upd.rows[0]) return NextResponse.json({ error: 'Cooperative not found' }, { status: 404 })
            return NextResponse.json({ success: true, cooperative: upd.rows[0] })
        }

        // 2. Approve / Suspend Cooperative
        if (action === 'approve_cooperative' || action === 'suspend_cooperative') {
            const coopId = Number(body.cooperative_id)
            const nextStatus = action === 'approve_cooperative' ? 'active' : 'suspended'
            if (!coopId) return NextResponse.json({ error: 'cooperative_id is required' }, { status: 400 })

            const upd = await queryCopteller(
                `UPDATE copteller.cooperatives
                 SET status = $1,
                     bank_approval_date = CASE WHEN $1 = 'active' THEN COALESCE(bank_approval_date, NOW()) ELSE bank_approval_date END,
                     updated_at = NOW()
                 WHERE id = $2 RETURNING id, name, status`,
                [nextStatus, coopId]
            )
            if (!upd.rows[0]) return NextResponse.json({ error: 'Cooperative not found' }, { status: 404 })
            return NextResponse.json({ success: true, cooperative: upd.rows[0] })
        }

        // 3. Approve or Revoke Cooperative Scheme
        if (action === 'approve_scheme') {
            const schemeId = Number(body.scheme_id)
            const bankApproved = body.bank_approved !== false
            if (!schemeId) return NextResponse.json({ error: 'scheme_id is required' }, { status: 400 })
            const upd = await queryCopteller(
                `UPDATE copteller.copteller_schemes
                 SET bank_approved = $1,
                     status = CASE WHEN $1 = TRUE AND status = 'pending' THEN 'active' ELSE status END,
                     updated_at = NOW()
                 WHERE id = $2 RETURNING id, name, status, bank_approved`,
                [bankApproved, schemeId]
            )
            if (!upd.rows[0]) return NextResponse.json({ error: 'Scheme not found' }, { status: 404 })
            return NextResponse.json({ success: true, scheme: upd.rows[0] })
        }

        // 4. Credit Member Wallet from Remote Partner Bank POS Agent Cash-In (Atomic)
        if (action === 'credit_member_cashin') {
            const accountId = Number(body.account_id)
            const amountKobo = Math.round(Number(body.amount_kobo || 0))
            const reference = String(body.reference || `PB_CASHIN_${Date.now()}_${crypto.randomBytes(2).toString('hex').toUpperCase()}`).trim()
            const agentEmail = String(body.agent_email || auth.actorEmail)
            const partnerBankName = String(body.partner_bank_name || 'Partner Bank POS Agent')

            if (!accountId || !Number.isFinite(amountKobo) || amountKobo <= 0) {
                return NextResponse.json({ error: 'Valid account_id and positive amount_kobo are required' }, { status: 400 })
            }

            const pool = getCoptellerPool()
            const client = await pool.connect()
            try {
                await client.query('BEGIN')
                const mAcc = await client.query(
                    `SELECT id, balance, customer_id, user_id, account_number FROM copteller.accounts WHERE id = $1 FOR UPDATE`,
                    [accountId]
                )
                if (!mAcc.rows[0]) throw new Error('Member wallet account not found.')
                const newBal = Number(mAcc.rows[0].balance || 0) + amountKobo
                await client.query(
                    `UPDATE copteller.accounts SET balance = $1, last_transaction_at = NOW(), updated_at = NOW() WHERE id = $2`,
                    [newBal, accountId]
                )
                await client.query(
                    `INSERT INTO copteller.transactions (
                        reference, type, amount, currency, to_account_id, status, narration,
                        channel, balance_after, date, metadata, customer_id, user_id, created_at, updated_at
                     ) VALUES ($1, 'credit', $2, 'NGN', $3, 'successful', $4, 'portal', $5, NOW(), $6::jsonb, $7, $8, NOW(), NOW())`,
                    [
                        reference,
                        amountKobo,
                        accountId,
                        `${partnerBankName} Cash-In (${agentEmail})`,
                        newBal,
                        JSON.stringify({ source: 'partner_bank_headless_pos', agent_email: agentEmail, partner_bank: partnerBankName }),
                        mAcc.rows[0].customer_id || null,
                        mAcc.rows[0].user_id,
                    ]
                )
                await client.query('COMMIT')
                return NextResponse.json({
                    success: true,
                    reference,
                    accountNumber: mAcc.rows[0].account_number,
                    newBalanceKobo: newBal,
                })
            } catch (err: any) {
                try { await client.query('ROLLBACK') } catch {}
                return NextResponse.json({ error: err.message || 'Member cash-in credit failed' }, { status: 400 })
            } finally {
                client.release()
            }
        }

        // 5. Approve / Reject Co-Underwritten Cooperative Loan
        if (action === 'approve_loan' || action === 'reject_loan') {
            const loanId = Number(body.loan_id)
            if (!loanId) return NextResponse.json({ error: 'loan_id is required' }, { status: 400 })

            if (action === 'reject_loan') {
                const upd = await queryCopteller(
                    `UPDATE copteller.loans SET status = 'rejected', updated_at = NOW() WHERE id = $1 RETURNING id, status`,
                    [loanId]
                )
                return NextResponse.json({ success: true, loan: upd.rows[0] })
            }

            const pool = getCoptellerPool()
            const client = await pool.connect()
            try {
                await client.query('BEGIN')
                const lRes = await client.query(`SELECT * FROM copteller.loans WHERE id = $1 FOR UPDATE`, [loanId])
                const loan = lRes.rows[0]
                if (!loan) throw new Error('Loan not found')
                if (loan.status !== 'pending') throw new Error(`Loan already ${loan.status}`)
                const principalKobo = Math.round(Number(loan.principal || 0))
                const ref = `COP_DISB_${loanId}_${Date.now()}`

                const updLoan = await client.query(
                    `UPDATE copteller.loans SET status = 'active', disbursed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
                    [loanId]
                )
                let creditedAccountNumber: string | null = null
                if (loan.account_id) {
                    const accUpd = await client.query(
                        `UPDATE copteller.accounts SET balance = balance + $1, last_transaction_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING account_number, balance, customer_id, user_id`,
                        [principalKobo, loan.account_id]
                    )
                    if (accUpd.rows[0]) {
                        creditedAccountNumber = String(accUpd.rows[0].account_number)
                        await client.query(
                            `INSERT INTO copteller.transactions (
                                reference, type, amount, currency, to_account_id, loan_id,
                                status, narration, channel, balance_after, date, metadata,
                                customer_id, user_id, created_at, updated_at
                             ) VALUES ($1, 'disbursement', $2, 'NGN', $3, $4, 'successful', $5, 'admin', $6, NOW(), $7::jsonb, $8, $9, NOW(), NOW())`,
                            [
                                ref,
                                principalKobo,
                                loan.account_id,
                                loanId,
                                `Partner Bank Approved Disbursement (#${loanId})`,
                                Number(accUpd.rows[0].balance || 0),
                                JSON.stringify({ approved_by: auth.actorEmail, source: 'headless_bridge_v3' }),
                                loan.customer_id || accUpd.rows[0].customer_id || null,
                                loan.user_id || accUpd.rows[0].user_id,
                            ]
                        )
                    }
                }
                await client.query('COMMIT')
                return NextResponse.json({
                    success: true,
                    loan: updLoan.rows[0],
                    loanId,
                    principalKobo,
                    reference: ref,
                    creditedAccountNumber,
                    status: 'active',
                })
            } catch (err: any) {
                try { await client.query('ROLLBACK') } catch {}
                return NextResponse.json({ error: err.message }, { status: 400 })
            } finally {
                client.release()
            }
        }

        return NextResponse.json({ error: `Unsupported headless bridge action "${action}"` }, { status: 400 })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Headless bridge command failed' }, { status: 500 })
    }
}
