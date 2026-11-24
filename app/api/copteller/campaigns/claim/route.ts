import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerPool } from '@/lib/copteller/pg'
import { olivePayClient } from '@/lib/copteller/olivepay-client'
import { ensureMemberOlivePaySubWallet } from '@/lib/copteller/olivepay-sync'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copteller/campaigns/claim?token=...
 * Public verification of a claim token
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const token = searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Claim token is required.' }, { status: 400 })
        }

        const pool = getCoptellerPool()

        const res = await pool.query(`
            SELECT 
                r.id as recipient_id,
                r.claim_reference,
                r.full_name,
                r.phone_number,
                r.amount,
                r.status,
                r.claimed_at,
                r.payout_method,
                r.transaction_reference,
                c.id as campaign_id,
                c.title as campaign_title,
                c.organization_name,
                c.category,
                c.description,
                c.expires_at,
                c.status as campaign_status
            FROM copteller.disbursement_recipients r
            JOIN copteller.disbursement_campaigns c ON c.id = r.campaign_id
            WHERE r.claim_token = $1
        `, [token.trim()])

        if (res.rows.length === 0) {
            return NextResponse.json({ error: 'Invalid or unknown claim token.' }, { status: 404 })
        }

        const data = res.rows[0]

        // Mask phone number for privacy e.g. 0803***4321
        const phone = data.phone_number || ''
        const maskedPhone = phone.length > 7
            ? phone.substring(0, 4) + '***' + phone.substring(phone.length - 4)
            : phone

        const isExpired = data.expires_at && new Date(data.expires_at) < new Date()

        return NextResponse.json({
            success: true,
            recipient: {
                reference: data.claim_reference,
                fullName: data.full_name,
                maskedPhone,
                rawPhone: data.phone_number,
                amount: Number(data.amount),
                status: isExpired && data.status === 'pending' ? 'expired' : data.status,
                claimedAt: data.claimed_at,
                payoutMethod: data.payout_method,
                transactionReference: data.transaction_reference,
            },
            campaign: {
                id: data.campaign_id,
                title: data.campaign_title,
                organizationName: data.organization_name,
                category: data.category,
                description: data.description,
                expiresAt: data.expires_at,
                status: data.campaign_status
            }
        })
    } catch (err: any) {
        console.error('[Public Claim Lookup Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/campaigns/claim
 * Executes a claim payout: to a Copteller wallet (existing or newly auto-provisioned) or direct NIP bank withdrawal
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))
        const {
            token,
            payoutMethod = 'wallet_credit', // 'wallet_credit' or 'direct_bank_transfer'
            bankCode,
            bankName,
            accountNumber,
            accountName,
            phoneNumber,
            pin
        } = body

        if (!token) {
            return NextResponse.json({ error: 'Claim token is required.' }, { status: 400 })
        }

        const pool = getCoptellerPool()
        const client = await pool.connect()

        try {
            await client.query('BEGIN')

            // 1. Fetch Recipient & Campaign
            const recRes = await client.query(`
                SELECT 
                    r.*,
                    c.title as campaign_title,
                    c.organization_name,
                    c.expires_at,
                    c.status as campaign_status
                FROM copteller.disbursement_recipients r
                JOIN copteller.disbursement_campaigns c ON c.id = r.campaign_id
                WHERE r.claim_token = $1 FOR UPDATE OF r
            `, [token.trim()])

            if (recRes.rows.length === 0) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Invalid or unknown claim token.' }, { status: 404 })
            }

            const recipient = recRes.rows[0]

            if (recipient.status === 'claimed') {
                await client.query('ROLLBACK')
                return NextResponse.json({
                    error: `This grant has already been claimed on ${new Date(recipient.claimed_at).toLocaleDateString()}. Reference: ${recipient.claim_reference}`
                }, { status: 400 })
            }

            if (recipient.expires_at && new Date(recipient.expires_at) < new Date()) {
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'This disbursement offer has expired.' }, { status: 400 })
            }

            const amount = Number(recipient.amount)
            const amountKobo = Math.round(amount * 100)
            const txRef = `CLM-TX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

            let targetCustomerId = recipient.claimed_by_customer_id || null
            let targetAccountId = recipient.claimed_by_account_id || null
            let newlyProvisioned = false
            let assignedAccountNumber = null

            // 2. Handle Payout Options
            if (payoutMethod === 'wallet_credit') {
                const rawPhone = (phoneNumber || recipient.phone_number || '').trim().replace(/\s+/g, '')

                // Find existing customer by phone number
                const custRes = await client.query(`
                    SELECT c.id, c.first_name, c.last_name, a.id as account_id, a.account_number, a.balance
                    FROM copteller.customers c
                    LEFT JOIN copteller.accounts a ON a.customer_id = c.id
                    WHERE c.phone_number = $1 OR c.email = $2
                    LIMIT 1
                `, [rawPhone, `${rawPhone}@copteller.internal`])

                if (custRes.rows.length > 0 && custRes.rows[0].account_id) {
                    targetCustomerId = custRes.rows[0].id
                    targetAccountId = custRes.rows[0].account_id
                    assignedAccountNumber = custRes.rows[0].account_number

                    // Credit existing account in Kobo
                    await client.query(`
                        UPDATE copteller.accounts
                        SET balance = balance + $1, updated_at = NOW()
                        WHERE id = $2
                    `, [amountKobo, targetAccountId])
                } else {
                    // Auto-provision brand new customer & wallet for this citizen!
                    const nameParts = recipient.full_name.trim().split(' ')
                    const firstName = nameParts[0] || 'Citizen'
                    const lastName = nameParts.slice(1).join(' ') || 'Beneficiary'
                    const autoEmail = `${rawPhone}@copteller.citizen.ng`

                    const newCust = await client.query(`
                        INSERT INTO copteller.customers (
                            first_name, last_name, phone_number, email,
                            kyc_status, onboarding_status, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, 'tier_1', 'completed', NOW(), NOW())
                        RETURNING id
                    `, [firstName, lastName, rawPhone, autoEmail])

                    targetCustomerId = newCust.rows[0].id

                    // Generate unique 10-digit account number starting with 300
                    assignedAccountNumber = `300${Math.floor(1000000 + Math.random() * 9000000)}`

                    const newAcc = await client.query(`
                        INSERT INTO copteller.accounts (
                            customer_id, user_id, account_number, account_type,
                            balance, currency, source, is_primary, status, created_at, updated_at
                        ) VALUES (
                            $1, $2, $3, 'Savings', $4, 'NGN', 'local', true, 'active', NOW(), NOW()
                        ) RETURNING id
                    `, [targetCustomerId, `CITIZEN_${rawPhone}`, assignedAccountNumber, amountKobo])

                    targetAccountId = newAcc.rows[0].id
                    newlyProvisioned = true
                }

                // Write credit transaction in Kobo
                await client.query(`
                    INSERT INTO copteller.transactions (
                        reference, to_account_id, amount, type, status, narration, created_at
                    ) VALUES ($1, $2, $3, 'credit', 'successful', $4, NOW())
                `, [
                    txRef,
                    targetAccountId,
                    amountKobo,
                    `Disbursement Grant Claim: ${recipient.campaign_title} (${recipient.organization_name})`
                ])
            } else {
                // Direct commercial bank transfer
                if (!accountNumber || !bankCode) {
                    await client.query('ROLLBACK')
                    return NextResponse.json({ error: 'Bank code and account number are required for bank withdrawal.' }, { status: 400 })
                }

                // Write bank outflow transaction in Kobo
                await client.query(`
                    INSERT INTO copteller.transactions (
                        reference, amount, type, status, narration, created_at
                    ) VALUES ($1, $2, 'debit', 'successful', $3, NOW())
                `, [
                    txRef,
                    amountKobo,
                    `Disbursement Bank Transfer to ${accountName || 'Beneficiary'} (${bankName || bankCode} - ${accountNumber})`
                ])
            }

            // 3. Mark recipient as claimed
            await client.query(`
                UPDATE copteller.disbursement_recipients
                SET 
                    status = 'claimed',
                    claimed_at = NOW(),
                    claimed_by_customer_id = $1,
                    claimed_by_account_id = $2,
                    payout_method = $3,
                    payout_bank_code = $4,
                    payout_account_number = $5,
                    payout_account_name = $6,
                    transaction_reference = $7,
                    updated_at = NOW()
                WHERE id = $8
            `, [
                targetCustomerId,
                targetAccountId,
                payoutMethod,
                bankCode || null,
                accountNumber || null,
                accountName || null,
                txRef,
                recipient.id
            ])

            // 4. Update campaign totals (in Naira as stored on disbursement_campaigns)
            await client.query(`
                UPDATE copteller.disbursement_campaigns
                SET 
                    claimed_count = claimed_count + 1,
                    total_claimed = total_claimed + $1,
                    updated_at = NOW()
                WHERE id = $2
            `, [amount, recipient.campaign_id])

            await client.query('COMMIT')

            // Dispatch live/sandbox OlivePay settlement rail (zero-priced SWF for wallet_credit, signed NIP payout for direct_bank_transfer)
            let olivePaySettlement: any = null
            try {
                if (payoutMethod === 'wallet_credit') {
                    const sw = await ensureMemberOlivePaySubWallet({
                        userId: `CITIZEN_${(phoneNumber || recipient.phone_number || recipient.id).toString().trim()}`,
                        email: `${(phoneNumber || recipient.phone_number || recipient.id).toString().trim()}@copteller.citizen.ng`,
                        fullName: recipient.full_name,
                        phoneNumber: String(phoneNumber || recipient.phone_number || '08000000000'),
                        accountId: targetAccountId ? Number(targetAccountId) : null,
                        customerId: targetCustomerId ? Number(targetCustomerId) : null,
                    })
                    const swf = await olivePayClient.fundSubWalletFromMain({
                        subWalletId: sw.olivepay_sub_wallet_id,
                        amountKobo,
                        narration: `Grant ${recipient.claim_reference}`,
                        idempotencyKey: txRef,
                    })
                    olivePaySettlement = {
                        rail: 'subwallet_funding',
                        railMode: swf.railMode,
                        reference: swf.data?.reference || txRef,
                        status: swf.data?.status || 'SETTLED',
                        subWalletId: sw.olivepay_sub_wallet_id,
                        virtualAccountNumber: sw.virtual_account_number,
                    }
                } else if (bankCode && accountNumber) {
                    const payout = await olivePayClient.sendMerchantPayout({
                        amountKobo,
                        destinationBankCode: String(bankCode),
                        destinationAccountNumber: String(accountNumber),
                        beneficiaryName: String(accountName || recipient.full_name),
                        narration: `Grant ${recipient.claim_reference}`,
                        idempotencyKey: txRef,
                    })
                    olivePaySettlement = {
                        rail: 'merchant_payout',
                        railMode: payout.railMode,
                        reference: payout.data?.reference || txRef,
                        status: payout.data?.status || (payout.isPending ? 'PENDING' : 'SUCCESS'),
                    }
                }
            } catch (opErr: any) {
                console.warn('[Campaign Claim] OlivePay settlement mirror warning:', opErr.message)
            }

            return NextResponse.json({
                success: true,
                claimReference: recipient.claim_reference,
                transactionReference: txRef,
                olivePaySettlement,
                amount,
                payoutMethod,
                newlyProvisioned,
                walletInfo: newlyProvisioned ? {
                    accountNumber: olivePaySettlement?.virtualAccountNumber || assignedAccountNumber,
                    balance: amount,
                    owner: recipient.full_name,
                    note: 'Your new Copteller OlivePay SubWallet is ready with zero fees.'
                } : null,
                message: `Successfully claimed ₦${amount.toLocaleString()} from ${recipient.campaign_title}.`
            })
        } catch (txErr) {
            await client.query('ROLLBACK')
            throw txErr
        } finally {
            client.release()
        }
    } catch (err: any) {
        console.error('[Execute Claim Error]', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
