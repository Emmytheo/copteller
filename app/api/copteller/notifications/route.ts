import { NextRequest, NextResponse } from 'next/server'
import { getCoptellerAuth } from '@/lib/copteller/auth'
import { queryCopteller } from '@/lib/copteller/pg'

export const dynamic = 'force-dynamic'

interface NotificationItem {
    id: string
    title: string
    desc: string
    time: string
    timestamp: number
    read: boolean
    type: 'transaction' | 'security' | 'esusu' | 'membership' | 'general'
}

function timeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * GET /api/copteller/notifications
 * Dynamically compiles real notification feeds from:
 * 1. copteller.transactions (credits, debits, dues, payouts)
 * 2. copteller.copteller_audit_logs (security changes, card actions, credit reviews)
 * 3. copteller.customers metadata (saved preferences and read markers)
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        // 1. Resolve customer
        let customer: any = null
        try {
            const custRes = await queryCopteller(`
                SELECT id, first_name, last_name, email, metadata
                FROM copteller.customers
                WHERE (supabase_id = $1 OR lower(email) = lower($2))
                LIMIT 1
            `, [auth.userId, auth.email])
            customer = custRes.rows[0]
        } catch (e: any) {
            console.warn('[Copteller Notifications GET] Customer query warning:', e.message)
        }

        const metadata = customer?.metadata || {}
        const readIds: string[] = Array.isArray(metadata.read_notification_ids) ? metadata.read_notification_ids : []
        const prefs = metadata.notification_prefs || {
            emailAlerts: true,
            smsAlerts: false,
            marketing: false,
            ajoReminders: true
        }

        const items: NotificationItem[] = []

        // 2. Query recent transactions (inflows, outflows, dues payments)
        try {
            const txRes = await queryCopteller(`
                SELECT id, reference, type, amount, narration, status, created_at, date
                FROM copteller.transactions
                WHERE (customer_id = $1 OR user_id = $2)
                ORDER BY created_at DESC
                LIMIT 15
            `, [customer?.id || -1, auth.userId])

            for (const tx of txRes.rows) {
                const id = `tx_${tx.id}`
                const date = new Date(tx.created_at || tx.date)
                const amountFormatted = `₦${(Number(tx.amount || 0) / 100).toLocaleString()}`
                const isCredit = tx.type?.toLowerCase() === 'credit'
                
                let title = isCredit ? `Wallet deposit received` : `Payment processed`
                if (tx.narration?.toLowerCase().includes('dues')) {
                    title = `Membership dues confirmed`
                } else if (tx.narration?.toLowerCase().includes('ajo') || tx.narration?.toLowerCase().includes('esusu')) {
                    title = isCredit ? `Ajo Cycle payout cleared` : `Ajo contribution deducted`
                } else if (tx.narration?.toLowerCase().includes('smart card')) {
                    title = `Smart Card transaction`
                }

                items.push({
                    id,
                    title,
                    desc: `${amountFormatted} — ${tx.narration || (isCredit ? 'Credit received to Copteller wallet.' : 'Debit from Copteller account.')}`,
                    time: timeAgo(date),
                    timestamp: date.getTime(),
                    read: readIds.includes(id),
                    type: 'transaction'
                })
            }
        } catch {}

        // 3. Query recent audit logs for security / card / credit actions
        try {
            const logRes = await queryCopteller(`
                SELECT id, action, entity_type, created_at, metadata
                FROM copteller.copteller_audit_logs
                WHERE (actor_id = $1 OR entity_id = $2)
                ORDER BY created_at DESC
                LIMIT 10
            `, [auth.userId, String(customer?.id || -1)])

            for (const log of logRes.rows) {
                const id = `log_${log.id}`
                const date = new Date(log.created_at)
                let title = 'Security alert'
                let desc = 'Account profile parameters modified.'
                let type: NotificationItem['type'] = 'security'

                if (log.action === 'SECURITY_PIN_UPDATE' || log.action === 'SECURITY_PIN_SET') {
                    title = 'Transaction PIN updated'
                    desc = 'Your 4-digit transaction authorization token was updated and synced across cards.'
                } else if (log.action === 'BIOMETRICS_TOGGLE') {
                    title = 'Biometric security changed'
                    desc = log.metadata?.event || 'Biometric authorization setting toggled.'
                } else if (log.action === 'CARD_ISSUED') {
                    title = 'Smart Card activated'
                    desc = `New ${log.metadata?.network || 'Verve'} card provisioned and ready for usage.`
                    type = 'general'
                } else if (log.action === 'CARD_FROZEN') {
                    title = 'Smart Card frozen'
                    desc = 'Temporary card freeze activated on payment switch.'
                    type = 'security'
                } else if (log.action === 'CARD_LIMITS_UPDATE') {
                    title = 'Card limits adjusted'
                    desc = 'Daily velocity limits updated on core switch.'
                    type = 'general'
                } else if (log.action === 'CREDIT_LIMIT_REVIEW_REQUEST') {
                    title = 'Credit limit audit initiated'
                    desc = 'Your credit rating review request was recorded and forwarded to the committee.'
                    type = 'membership'
                } else {
                    continue // Skip unhelpful internal logs
                }

                items.push({
                    id,
                    title,
                    desc,
                    time: timeAgo(date),
                    timestamp: date.getTime(),
                    read: readIds.includes(id),
                    type
                })
            }
        } catch {}

        // Sort combined feed by timestamp descending
        items.sort((a, b) => b.timestamp - a.timestamp)

        // If no records exist yet (brand new account), supply a friendly welcome notification
        if (items.length === 0) {
            items.push({
                id: 'welcome_copteller',
                title: 'Welcome to Copteller',
                desc: 'Your cooperative digital banking account is active. Explore Ajo Circles, Smart Cards, and Membership Dues.',
                time: 'Just now',
                timestamp: Date.now(),
                read: readIds.includes('welcome_copteller'),
                type: 'general'
            })
        }

        const unreadCount = items.filter(n => !n.read).length

        return NextResponse.json({
            success: true,
            notifications: items,
            unreadCount,
            preferences: prefs
        })
    } catch (error: any) {
        console.error('[Copteller Notifications GET] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/copteller/notifications
 * Updates user notification preferences or marks notifications as read.
 */
export async function PATCH(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json()

        const custRes = await queryCopteller(`
            SELECT id, metadata
            FROM copteller.customers
            WHERE (supabase_id = $1 OR lower(email) = lower($2))
            LIMIT 1
        `, [auth.userId, auth.email])

        const customer = custRes.rows[0]
        if (!customer) {
            return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
        }

        const currentMeta = customer.metadata || {}
        let updatedMeta = { ...currentMeta }

        // If marking all as read:
        if (body.markAllRead && Array.isArray(body.notificationIds)) {
            const existingRead: string[] = Array.isArray(currentMeta.read_notification_ids) ? currentMeta.read_notification_ids : []
            const combinedRead = Array.from(new Set([...existingRead, ...body.notificationIds]))
            updatedMeta.read_notification_ids = combinedRead
        }

        // If marking single notification as read:
        if (body.markSingleRead && typeof body.notificationId === 'string') {
            const existingRead: string[] = Array.isArray(currentMeta.read_notification_ids) ? currentMeta.read_notification_ids : []
            if (!existingRead.includes(body.notificationId)) {
                updatedMeta.read_notification_ids = [...existingRead, body.notificationId]
            }
        }

        // If updating notification preferences:
        if (body.preferences && typeof body.preferences === 'object') {
            updatedMeta.notification_prefs = {
                ...(currentMeta.notification_prefs || {}),
                ...body.preferences
            }
        }

        await queryCopteller(`
            UPDATE copteller.customers
            SET metadata = $1, updated_at = NOW()
            WHERE id = $2
        `, [JSON.stringify(updatedMeta), customer.id])

        return NextResponse.json({
            success: true,
            message: 'Preferences updated successfully.',
            preferences: updatedMeta.notification_prefs
        })
    } catch (error: any) {
        console.error('[Copteller Notifications PATCH] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
