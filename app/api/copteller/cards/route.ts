import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

/**
 * Generate a realistic masked card number and full demo PAN for digital banking
 */
function generateCardDetails(network: string) {
    const prefix = network.toLowerCase() === 'visa' ? '4000' : network.toLowerCase() === 'mastercard' ? '5399' : '5061'
    const middle1 = Math.floor(1000 + Math.random() * 9000).toString()
    const middle2 = Math.floor(1000 + Math.random() * 9000).toString()
    const last4 = Math.floor(1000 + Math.random() * 9000).toString()
    
    const fullNumber = `${prefix} ${middle1} ${middle2} ${last4}`
    const maskedNumber = `${prefix} •••• •••• ${last4}`
    
    const now = new Date()
    const expiryYear = (now.getFullYear() + 3).toString().slice(-2)
    const expiryMonth = String(now.getMonth() + 1).padStart(2, '0')
    const expiry = `${expiryMonth}/${expiryYear}`
    const cvv = Math.floor(100 + Math.random() * 900).toString()

    return { fullNumber, maskedNumber, expiry, cvv }
}

/**
 * GET /api/copteller/cards
 * Fetches all smart cards for the authenticated user.
 * If none exist, auto-provisions an initial Copteller Verve card linked to the primary account.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        // 1. Fetch user's primary account and customer
        let primaryAccount: any = null
        try {
            const accRes = await queryCopteller(`
                SELECT a.id, a.account_number, a.balance, c.id as customer_id, c.first_name, c.last_name
                FROM copteller.accounts a
                LEFT JOIN copteller.customers c ON c.id = a.customer_id
                WHERE a.user_id = $1 AND a.status = 'active'
                ORDER BY a.created_at ASC
                LIMIT 1
            `, [auth.userId])
            primaryAccount = accRes.rows[0]

            if (!primaryAccount) {
                // Check by email in customer table
                const custRes = await queryCopteller(`
                    SELECT a.id, a.account_number, a.balance, c.id as customer_id, c.first_name, c.last_name
                    FROM copteller.accounts a
                    JOIN copteller.customers c ON c.id = a.customer_id
                    WHERE (c.supabase_id = $1 OR lower(c.email) = lower($2))
                      AND a.status = 'active'
                    LIMIT 1
                `, [auth.userId, auth.email])
                primaryAccount = custRes.rows[0]
            }
        } catch (e: any) {
            console.warn('[Copteller Cards] Account query fallback:', e.message)
        }

        const holderName = primaryAccount?.first_name 
            ? `${primaryAccount.first_name} ${primaryAccount.last_name || ''}`.trim().toUpperCase()
            : (auth.displayName || 'COPTELLER MEMBER').toUpperCase()

        // 2. Fetch existing cards
        let cardsRes: any = { rows: [] }
        try {
            cardsRes = await queryCopteller(`
                SELECT * FROM copteller.smart_cards
                WHERE user_id = $1 OR customer_id = $2
                ORDER BY created_at DESC
            `, [auth.userId, primaryAccount?.customer_id || -1])
        } catch {}

        // 3. Auto-provision primary card if user has none
        if (cardsRes.rows.length === 0 && primaryAccount) {
            try {
                const cardData = generateCardDetails('Verve')
                const insertRes = await queryCopteller(`
                    INSERT INTO copteller.smart_cards (
                        customer_id, user_id, account_id, card_token, card_holder_name,
                        card_network, card_type, card_number_masked, limit_pos, limit_web,
                        limit_atm, is_frozen, expiry_date, status, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5,
                        'Verve', 'debit', $6, 150000, 100000,
                        50000, false, NOW() + INTERVAL '3 years', 'active', NOW(), NOW()
                    )
                    RETURNING *
                `, [
                    primaryAccount.customer_id || null,
                    auth.userId,
                    primaryAccount.id,
                    `CTK_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    holderName,
                    cardData.maskedNumber
                ])

                cardsRes = insertRes
            } catch {}
        }

        return NextResponse.json({
            success: true,
            cards: cardsRes.rows.map((c: any) => ({
                id: String(c.id),
                card_type: c.card_network || 'Verve',
                card_number_masked: c.card_number_masked,
                card_number_full: c.card_number_masked, // Masked PAN for security
                expiry: c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' }) : '12/28',
                cvv: '•••',
                is_frozen: Boolean(c.is_frozen),
                dailyLimit: Number(c.limit_pos || 150000) + Number(c.limit_web || 100000),
                atmLimit: Number(c.limit_atm || 50000),
                posLimit: Number(c.limit_pos || 150000),
                webLimit: Number(c.limit_web || 100000),
                cardholder: c.card_holder_name || holderName,
                status: c.status || 'active',
                accentColor: c.card_network === 'Visa'
                    ? 'from-indigo-950 via-slate-900 to-blue-950 border-blue-500/30'
                    : c.card_network === 'MasterCard'
                    ? 'from-amber-950 via-slate-900 to-red-950 border-amber-500/30'
                    : 'from-emerald-950 via-slate-900 to-emerald-900 border-emerald-500/30'
            }))
        })
    } catch (err: any) {
        console.error('[GET /api/copteller/cards error]', err)
        return NextResponse.json({ error: err.message || 'Failed to fetch cards' }, { status: 500 })
    }
}

/**
 * POST /api/copteller/cards
 * Requests a new physical or virtual card (Verve, Visa, MasterCard)
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const { cardType = 'Verve', dailyLimit = 150000, atmLimit = 50000, posLimit = 100000 } = body

        // Fetch primary account
        const accRes = await queryCopteller(`
            SELECT a.id, c.id as customer_id, c.first_name, c.last_name
            FROM copteller.accounts a
            LEFT JOIN copteller.customers c ON c.id = a.customer_id
            WHERE (a.user_id = $1 OR c.supabase_id = $1) AND a.status = 'active'
            ORDER BY a.created_at ASC
            LIMIT 1
        `, [auth.userId])

        const primaryAccount = accRes.rows[0]
        if (!primaryAccount) {
            return NextResponse.json({ error: 'No active account found to link this card.' }, { status: 404 })
        }

        const holderName = primaryAccount.first_name
            ? `${primaryAccount.first_name} ${primaryAccount.last_name || ''}`.trim().toUpperCase()
            : (auth.displayName || 'COPTELLER MEMBER').toUpperCase()

        const cardDetails = generateCardDetails(cardType)

        const insertRes = await queryCopteller(`
            INSERT INTO copteller.smart_cards (
                customer_id, user_id, account_id, card_token, card_holder_name,
                card_network, card_type, card_number_masked, limit_pos, limit_web,
                limit_atm, is_frozen, expiry_date, status, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, 'debit', $7, $8, $9,
                $10, false, NOW() + INTERVAL '3 years', 'active', NOW(), NOW()
            )
            RETURNING *
        `, [
            primaryAccount.customer_id || null,
            auth.userId,
            primaryAccount.id,
            `CTK_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            holderName,
            cardType,
            cardDetails.maskedNumber,
            Number(posLimit),
            Number(dailyLimit) - Number(posLimit),
            Number(atmLimit)
        ])

        const newCard = insertRes.rows[0]

        return NextResponse.json({
            success: true,
            message: `New ${cardType} Smart Card successfully issued!`,
            card: {
                id: String(newCard.id),
                card_type: newCard.card_network,
                card_number_masked: newCard.card_number_masked,
                card_number_full: newCard.card_number_masked,
                expiry: '12/29',
                cvv: '•••',
                is_frozen: false,
                dailyLimit: Number(dailyLimit),
                atmLimit: Number(atmLimit),
                posLimit: Number(posLimit),
                cardholder: holderName,
                accentColor: cardType === 'Visa'
                    ? 'from-indigo-950 via-slate-900 to-blue-950 border-blue-500/30'
                    : cardType === 'MasterCard'
                    ? 'from-amber-950 via-slate-900 to-red-950 border-amber-500/30'
                    : 'from-emerald-950 via-slate-900 to-emerald-900 border-emerald-500/30'
            }
        })
    } catch (err: any) {
        console.error('[POST /api/copteller/cards error]', err)
        return NextResponse.json({ error: err.message || 'Failed to issue card' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/cards
 * Updates card status (freeze/unfreeze) or spending limits
 */
export async function PATCH(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const { cardId, action, isFrozen, posLimit, atmLimit, webLimit } = body

        if (!cardId) {
            return NextResponse.json({ error: 'cardId is required' }, { status: 400 })
        }

        if (action === 'toggle_freeze') {
            const updateRes = await queryCopteller(`
                UPDATE copteller.smart_cards
                SET is_frozen = $1, updated_at = NOW()
                WHERE id = $2 AND user_id = $3
                RETURNING is_frozen
            `, [Boolean(isFrozen), parseInt(cardId), auth.userId])

            if (updateRes.rows.length === 0) {
                return NextResponse.json({ error: 'Card not found or unauthorized' }, { status: 404 })
            }

            return NextResponse.json({
                success: true,
                is_frozen: updateRes.rows[0].is_frozen,
                message: updateRes.rows[0].is_frozen ? 'Card has been locked & frozen.' : 'Card is active & operational.'
            })
        }

        if (action === 'update_limits') {
            const updateRes = await queryCopteller(`
                UPDATE copteller.smart_cards
                SET limit_pos = COALESCE($1, limit_pos),
                    limit_atm = COALESCE($2, limit_atm),
                    limit_web = COALESCE($3, limit_web),
                    updated_at = NOW()
                WHERE id = $4 AND user_id = $5
                RETURNING *
            `, [
                posLimit !== undefined ? Number(posLimit) : null,
                atmLimit !== undefined ? Number(atmLimit) : null,
                webLimit !== undefined ? Number(webLimit) : null,
                parseInt(cardId),
                auth.userId
            ])

            if (updateRes.rows.length === 0) {
                return NextResponse.json({ error: 'Card not found or unauthorized' }, { status: 404 })
            }

            return NextResponse.json({
                success: true,
                message: 'Spending limits successfully updated in core banking card switch.'
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err: any) {
        console.error('[PATCH /api/copteller/cards error]', err)
        return NextResponse.json({ error: err.message || 'Failed to update card' }, { status: 500 })
    }
}
