import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'
import { ensureOlivePayTables } from '@/lib/copteller/olivepay-schema'
import { ensureMemberOlivePaySubWallet } from '@/lib/copteller/olivepay-sync'
import {
    olivePayClient,
    generateOlivePayTransactionId,
    resolveActiveOlivePayRailMode,
} from '@/lib/copteller/olivepay-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/copteller/wallet/deposit
 * Unified OlivePay + Sandbox Testing Rail Deposit Endpoint supporting all 3 OlivePay funding rails:
 *  1. `method: 'dynamic_va'`  -> Generates 1-time exact-amount Dynamic Virtual Account (integer kobo wire!)
 *  2. `method: 'checkout'`    -> Initializes OlivePay Hosted Checkout (or Recurring Mandate via `reccurringID`)
 *  3. `method: 'static_va'`   -> Returns member's dedicated OlivePay SubWallet Static NUBAN
 *  4. `method: 'direct'` (default backward-compatible) -> Runs signed `subwallet-funding` (SWF-...) on Sandbox Rail!
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        await ensureOlivePayTables()
        const body = await req.json().catch(() => ({}))
        const method = String(body.method || 'direct').toLowerCase()
        const rawAmount = Number(body.amount_naira ?? body.amount ?? 0)

        if (method !== 'static_va' && (!Number.isFinite(rawAmount) || rawAmount <= 0 || rawAmount > 100_000_000)) {
            return NextResponse.json({ error: 'amount must be a valid positive number' }, { status: 400 })
        }

        const amountKobo = Math.round(rawAmount * 100)
        const payload = await getDb()

        // 1. Resolve Customer
        const customerResult = await payload.find({
            collection: 'customers',
            where: {
                or: [
                    { supabase_id: { equals: auth.userId } },
                    ...(auth.email ? [{ email: { equals: auth.email.toLowerCase().trim() } }] : []),
                ],
            },
            limit: 1,
            overrideAccess: true,
        })

        let customerId = customerResult.docs[0]?.id
        if (!customerId) {
            const parts = String(auth.displayName || 'Copteller Member').trim().split(/\s+/)
            const newCust = await payload.create({
                collection: 'customers',
                data: {
                    firstName: parts[0] || 'Member',
                    lastName: parts.slice(1).join(' ') || 'User',
                    email: auth.email || `${auth.userId.slice(0, 8)}@copteller.internal`,
                    supabase_id: auth.userId,
                    is_associated: true,
                    phone_number: '08000000000',
                    kyc_status: 'active',
                    onboarding_status: 'completed',
                },
                overrideAccess: true,
            })
            customerId = newCust.id
        }

        // 2. Resolve Active Ledger Account
        const accountRes = await payload.find({
            collection: 'accounts',
            where: {
                or: [
                    { user_id: { equals: auth.userId } },
                    ...(customerId ? [{ customer: { equals: customerId } }] : []),
                ],
                status: { equals: 'active' },
            },
            limit: 1,
            overrideAccess: true,
        })

        let account = accountRes.docs[0]
        if (!account) {
            const newAccountNum = Math.floor(1000000000 + Math.random() * 9000000000).toString()
            account = await payload.create({
                collection: 'accounts',
                data: {
                    customer: customerId,
                    user_id: auth.userId,
                    account_number: newAccountNum,
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

        // 3. Ensure Member OlivePay SubWallet exists
        const sw = await ensureMemberOlivePaySubWallet({
            userId: auth.userId,
            email: auth.email,
            fullName: auth.displayName,
            accountId: Number(account.id),
            customerId: Number(customerId),
        })

        const railMode = await resolveActiveOlivePayRailMode()

        // ── MODE A: Static Virtual Account Details ───────────────────────────
        if (method === 'static_va') {
            return NextResponse.json({
                success: true,
                method: 'static_va',
                railMode,
                subWalletId: sw.olivepay_sub_wallet_id,
                virtualAccountNumber: sw.virtual_account_number,
                virtualAccountName: sw.virtual_account_name,
                bankName: sw.virtual_account_bank_name || 'OlivePay Bank',
                canSimulateInflow: railMode === 'sandbox_simulator',
            })
        }

        // ── MODE B: One-Time Dynamic Virtual Account (INTEGER KOBO WIRE!) ────
        if (method === 'dynamic_va') {
            const txId = generateOlivePayTransactionId('DVA')
            const vaRes = await olivePayClient.createDynamicVirtualAccount({
                transactionId: txId,
                amountKobo,
                customerName: auth.displayName || auth.email || 'Copteller Member',
                customerEmail: auth.email || `${auth.userId.slice(0, 8)}@copteller.app`,
                bank: body.bank === 'WEMA' ? 'WEMA' : 'OLIVEPAY',
                expiresInMinutes: Number(body.expiresInMinutes || 30),
                applyConvenienceCharge: Boolean(body.applyConvenienceCharge),
                metadata: { userId: auth.userId, accountId: account.id, subWalletId: sw.olivepay_sub_wallet_id },
            })

            if (!vaRes.ok || !vaRes.data) {
                return NextResponse.json({ error: vaRes.message || 'Dynamic VA generation failed' }, { status: 400 })
            }

            await queryCopteller(
                `INSERT INTO copteller.olivepay_virtual_accounts
                 (transaction_id, reference, account_number, account_name, bank_name, bank_code,
                  amount_kobo, fee_kobo, amount_payable_kobo, charge_bearer, status,
                  target_sub_wallet_id, target_account_id, user_id, purpose, expires_at, rail_mode)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, $13, 'wallet_deposit', $14, $15)
                 ON CONFLICT (transaction_id) DO UPDATE SET
                   target_sub_wallet_id = EXCLUDED.target_sub_wallet_id,
                   target_account_id = EXCLUDED.target_account_id,
                   user_id = EXCLUDED.user_id,
                   updated_at = NOW()`,
                [
                    vaRes.data.transactionId || txId,
                    vaRes.data.reference || txId,
                    vaRes.data.accountNumber,
                    vaRes.data.accountName || auth.displayName,
                    vaRes.data.bankName || 'OlivePay Bank',
                    vaRes.data.bankCode || '999999',
                    Number(vaRes.data.amount ?? amountKobo),
                    Number(vaRes.data.fee ?? 0),
                    Number(vaRes.data.amountPayable ?? amountKobo),
                    vaRes.data.chargeBearer || 'merchant',
                    sw.olivepay_sub_wallet_id,
                    Number(account.id),
                    auth.userId,
                    vaRes.data.expiresAt || new Date(Date.now() + 30 * 60_000).toISOString(),
                    vaRes.railMode,
                ]
            )

            return NextResponse.json({
                success: true,
                method: 'dynamic_va',
                railMode: vaRes.railMode,
                virtualAccount: {
                    transactionId: vaRes.data.transactionId || txId,
                    accountNumber: vaRes.data.accountNumber,
                    accountName: vaRes.data.accountName,
                    bankName: vaRes.data.bankName,
                    amountNaira: Number(vaRes.data.amount ?? amountKobo) / 100,
                    feeNaira: Number(vaRes.data.fee ?? 0) / 100,
                    amountPayableNaira: Number(vaRes.data.amountPayable ?? amountKobo) / 100,
                    expiresAt: vaRes.data.expiresAt,
                    status: 'pending',
                },
                canSimulateInflow: vaRes.railMode === 'sandbox_simulator',
            })
        }

        // ── MODE C: OlivePay Hosted Checkout (or Recurring Mandate) ──────────
        if (method === 'checkout') {
            const origin = req.headers.get('origin') || ''
            const callbackUrl = body.callbackUrl || `${origin}/copteller/wallet/callback`
            const txId = generateOlivePayTransactionId('COL')

            const colRes = body.reccurringID
                ? await olivePayClient.initializeRecurringPayment({
                      transactionId: txId,
                      amountKobo,
                      email: auth.email || `${auth.userId.slice(0, 8)}@copteller.app`,
                      reccurringID: String(body.reccurringID),
                      callbackUrl,
                  })
                : await olivePayClient.initializePayment({
                      transactionId: txId,
                      amountKobo,
                      email: auth.email || `${auth.userId.slice(0, 8)}@copteller.app`,
                      name: auth.displayName || 'Copteller Member',
                      callbackUrl,
                  })

            if (!colRes.ok || !colRes.data?.paymentUrl) {
                return NextResponse.json({ error: colRes.message || 'Checkout initialization failed' }, { status: 400 })
            }

            await queryCopteller(
                `INSERT INTO copteller.olivepay_collections
                 (transaction_id, access_code, payment_url, recurring_id, amount_kobo, currency,
                  status, is_successful, user_id, target_account_id, target_sub_wallet_id, purpose, rail_mode)
                 VALUES ($1, $2, $3, $4, $5, 'NGN', 'pending', FALSE, $6, $7, $8, 'wallet_deposit', $9)
                 ON CONFLICT (transaction_id) DO UPDATE SET
                   user_id = EXCLUDED.user_id,
                   target_account_id = EXCLUDED.target_account_id,
                   target_sub_wallet_id = EXCLUDED.target_sub_wallet_id,
                   updated_at = NOW()`,
                [
                    colRes.data.transactionId || txId,
                    colRes.data.accessCode || null,
                    colRes.data.paymentUrl,
                    body.reccurringID || null,
                    amountKobo,
                    auth.userId,
                    Number(account.id),
                    sw.olivepay_sub_wallet_id,
                    colRes.railMode,
                ]
            )

            return NextResponse.json({
                success: true,
                method: 'checkout',
                railMode: colRes.railMode,
                transactionId: colRes.data.transactionId || txId,
                paymentUrl: colRes.data.paymentUrl,
                accessCode: colRes.data.accessCode,
            })
        }

        // ── MODE D: Direct Sandbox / Master -> SubWallet Funding (SWF-...) ───
        const idemKey = `DEP_${auth.userId.slice(0, 8)}_${Date.now()}`
        const fundRes = await olivePayClient.fundSubWalletFromMain({
            subWalletId: sw.olivepay_sub_wallet_id,
            amountKobo,
            narration: `Wallet Top-Up ${rawAmount}`,
            idempotencyKey: idemKey,
        })

        if (!fundRes.ok) {
            return NextResponse.json(
                { error: fundRes.message || 'SubWallet funding failed', responseCode: fundRes.responseCode },
                { status: 400 }
            )
        }

        const currentBal = Number(account.balance || 0)
        const updatedBal = currentBal + amountKobo
        await payload.update({
            collection: 'accounts',
            id: account.id,
            data: { balance: updatedBal, user_id: auth.userId, last_transaction_at: new Date().toISOString() },
            overrideAccess: true,
        })

        const ref = fundRes.data?.reference || `TX_DEP_${Date.now()}`
        await payload.create({
            collection: 'transactions',
            data: {
                reference: ref,
                type: 'credit',
                amount: amountKobo,
                to_account: account.id,
                status: 'successful',
                narration: `Deposit of ₦${rawAmount.toLocaleString()} via OlivePay (${fundRes.railMode})`,
                user_id: auth.userId,
                customer: customerId,
                balance_after: updatedBal,
            },
            overrideAccess: true,
        })

        return NextResponse.json({
            success: true,
            method: 'direct',
            railMode: fundRes.railMode,
            balance: updatedBal,
            reference: ref,
            amount: amountKobo,
            subWalletId: sw.olivepay_sub_wallet_id,
        })
    } catch (error: any) {
        console.error('Wallet deposit error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
