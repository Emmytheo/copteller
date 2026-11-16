/**
 * lib/copteller/db.ts
 * Typed Payload CMS helper functions for all Copteller collections.
 * Import from here instead of calling getPayload directly in route handlers.
 * This abstraction makes it easy to later point at a separate DB connection.
 */

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { postgresAdapter } from '@payloadcms/db-postgres'
import type {
    CoptellerProductType,
    CoptellerScheme,
    CoptellerContract,
    CoptellerMembership,
    Cooperative,
} from './types'

// ─── Payload client singleton ─────────────────────────────────────────────────

let coptellerPayloadInstance: any = null

export async function getDb() {
    if (coptellerPayloadInstance) return coptellerPayloadInstance
    coptellerPayloadInstance = await getPayload({ config: configPromise })
    return coptellerPayloadInstance
}

// ─── Product Types ────────────────────────────────────────────────────────────

export async function getProductTypes(opts?: {
    category?: string
    product_type?: string
    sector?: string
    status?: string
    limit?: number
    page?: number
}) {
    const payload = await getDb()
    const where: Record<string, any> = {}

    if (opts?.status) where['status'] = { equals: opts.status }
    else where['status'] = { not_equals: 'deprecated' }

    if (opts?.category) where['category'] = { equals: opts.category }
    if (opts?.product_type) where['product_type'] = { equals: opts.product_type }
    if (opts?.sector) where['sector_tags'] = { contains: opts.sector }

    const result = await payload.find({
        collection: 'copteller-product-types',
        where,
        limit: opts?.limit ?? 50,
        page: opts?.page ?? 1,
        sort: 'name',
    })

    return result
}

export async function getProductTypeById(id: string) {
    const payload = await getDb()
    return payload.findByID({ collection: 'copteller-product-types', id })
}

export async function createProductType(data: Partial<CoptellerProductType>) {
    const payload = await getDb()
    return payload.create({ collection: 'copteller-product-types', data: data as any })
}

export async function updateProductType(id: string, data: Partial<CoptellerProductType>) {
    const payload = await getDb()
    return payload.update({ collection: 'copteller-product-types', id, data: data as any })
}

// ─── Cooperatives ─────────────────────────────────────────────────────────────

export async function getCooperatives(opts?: {
    sector?: string
    cooperative_type?: string
    status?: string
    state?: string
    limit?: number
    page?: number
}) {
    const payload = await getDb()
    const where: Record<string, any> = {}

    if (opts?.status) where['status'] = { equals: opts.status }
    if (opts?.sector) where['sector'] = { equals: opts.sector }
    if (opts?.cooperative_type) where['cooperative_type'] = { equals: opts.cooperative_type }
    if (opts?.state) where['state'] = { like: opts.state }

    return payload.find({
        collection: 'cooperatives',
        where,
        limit: opts?.limit ?? 30,
        page: opts?.page ?? 1,
        depth: 1,
    })
}

export async function getCooperativeById(id: string) {
    const payload = await getDb()
    return payload.findByID({ collection: 'cooperatives', id, depth: 2 })
}

// ─── Schemes ──────────────────────────────────────────────────────────────────

export async function getSchemes(opts?: {
    cooperativeId?: string
    scheme_type?: string
    status?: string
    bank_approved?: boolean
    limit?: number
    page?: number
}) {
    try {
        const { queryCopteller } = await import('./pg')
        const conditions: string[] = []
        const values: any[] = []
        let idx = 1

        if (opts?.cooperativeId) {
            conditions.push(`cooperative = $${idx++}`)
            values.push(opts.cooperativeId)
        }
        if (opts?.scheme_type) {
            conditions.push(`scheme_type = $${idx++}`)
            values.push(opts.scheme_type)
        }
        if (opts?.status) {
            conditions.push(`status = $${idx++}`)
            values.push(opts.status)
        }
        if (opts?.bank_approved !== undefined) {
            conditions.push(`bank_approved = $${idx++}`)
            values.push(opts.bank_approved)
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
        const limit = opts?.limit ?? 20
        const page = opts?.page ?? 1
        const offset = (page - 1) * limit

        const countRes = await queryCopteller(`SELECT COUNT(*) as count FROM copteller.copteller_schemes ${whereClause}`, values)
        const total = parseInt(countRes.rows[0]?.count || '0', 10)

        const rowsRes = await queryCopteller(`
            SELECT * FROM copteller.copteller_schemes 
            ${whereClause} 
            ORDER BY id ASC 
            LIMIT $${idx++} OFFSET $${idx++}
        `, [...values, limit, offset])

        return {
            docs: rowsRes.rows,
            totalDocs: total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
        }
    } catch (err: any) {
        console.warn('[getSchemes] Fallback to Payload:', err.message)
        const payload = await getDb()
        const where: Record<string, any> = {}

        if (opts?.cooperativeId) where['cooperative'] = { equals: opts.cooperativeId }
        if (opts?.scheme_type) where['scheme_type'] = { equals: opts.scheme_type }
        if (opts?.status) where['status'] = { equals: opts.status }
        if (opts?.bank_approved !== undefined) where['bank_approved'] = { equals: opts.bank_approved }

        return payload.find({
            collection: 'copteller-schemes',
            where,
            limit: opts?.limit ?? 20,
            page: opts?.page ?? 1,
            depth: 2,
            sort: '-createdAt',
        })
    }
}

export async function getSchemeById(id: string | number) {
    try {
        const { queryCopteller } = await import('./pg')
        const res = await queryCopteller(`SELECT * FROM copteller.copteller_schemes WHERE id = $1`, [id])
        return res.rows[0] || null
    } catch (err) {
        const payload = await getDb()
        return payload.findByID({ collection: 'copteller-schemes', id: String(id), depth: 2 })
    }
}

export async function createScheme(data: Partial<CoptellerScheme>) {
    const payload = await getDb()
    return payload.create({ collection: 'copteller-schemes', data: data as any })
}

export async function updateScheme(id: string, data: Partial<CoptellerScheme>) {
    const payload = await getDb()
    return payload.update({ collection: 'copteller-schemes', id, data: data as any })
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export async function getContracts(opts?: {
    memberId?: string
    cooperativeId?: string
    schemeId?: string
    contract_type?: string
    status?: string
    limit?: number
    page?: number
}) {
    try {
        const { queryCopteller } = await import('./pg')
        const conditions: string[] = []
        const values: any[] = []
        let idx = 1

        if (opts?.memberId) {
            conditions.push(`member = $${idx++}`)
            values.push(opts.memberId)
        }
        if (opts?.cooperativeId) {
            conditions.push(`cooperative = $${idx++}`)
            values.push(opts.cooperativeId)
        }
        if (opts?.schemeId) {
            conditions.push(`scheme = $${idx++}`)
            values.push(opts.schemeId)
        }
        if (opts?.contract_type) {
            conditions.push(`contract_type = $${idx++}`)
            values.push(opts.contract_type)
        }
        if (opts?.status) {
            conditions.push(`status = $${idx++}`)
            values.push(opts.status)
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
        const limit = opts?.limit ?? 20
        const page = opts?.page ?? 1
        const offset = (page - 1) * limit

        const countRes = await queryCopteller(`SELECT COUNT(*) as count FROM copteller.copteller_contracts ${whereClause}`, values)
        const total = parseInt(countRes.rows[0]?.count || '0', 10)

        const rowsRes = await queryCopteller(`
            SELECT * FROM copteller.copteller_contracts 
            ${whereClause} 
            ORDER BY created_at DESC 
            LIMIT $${idx++} OFFSET $${idx++}
        `, [...values, limit, offset])

        return {
            docs: rowsRes.rows,
            totalDocs: total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
        }
    } catch (err: any) {
        console.warn('[getContracts] Fallback to Payload:', err.message)
        const payload = await getDb()
        const where: Record<string, any> = {}

        if (opts?.memberId) where['member'] = { equals: opts.memberId }
        if (opts?.cooperativeId) where['cooperative'] = { equals: opts.cooperativeId }
        if (opts?.schemeId) where['scheme'] = { equals: opts.schemeId }
        if (opts?.contract_type) where['contract_type'] = { equals: opts.contract_type }
        if (opts?.status) where['status'] = { equals: opts.status }

        return payload.find({
            collection: 'copteller-contracts',
            where,
            limit: opts?.limit ?? 20,
            page: opts?.page ?? 1,
            depth: 2,
            sort: '-createdAt',
        })
    }
}

export async function getContractById(id: string) {
    try {
        const { queryCopteller } = await import('./pg')
        const res = await queryCopteller(`SELECT * FROM copteller.copteller_contracts WHERE id = $1`, [id])
        return res.rows[0] || null
    } catch {
        const payload = await getDb()
        return payload.findByID({ collection: 'copteller-contracts', id, depth: 2 })
    }
}

export async function createContract(data: Partial<CoptellerContract>) {
    const payload = await getDb()
    return payload.create({ collection: 'copteller-contracts', data: data as any })
}

export async function updateContract(id: string, data: Partial<CoptellerContract>) {
    const payload = await getDb()
    return payload.update({ collection: 'copteller-contracts', id, data: data as any })
}

// ─── Memberships ──────────────────────────────────────────────────────────────

export async function getMemberships(opts?: {
    memberId?: string
    cooperativeId?: string
    role?: string
    status?: string
    limit?: number
    page?: number
}) {
    try {
        const { queryCopteller } = await import('./pg')
        const conditions: string[] = []
        const values: any[] = []
        let idx = 1

        if (opts?.memberId) {
            conditions.push(`member = $${idx++}`)
            values.push(opts.memberId)
        }
        if (opts?.cooperativeId) {
            conditions.push(`cooperative = $${idx++}`)
            values.push(opts.cooperativeId)
        }
        if (opts?.role) {
            conditions.push(`role = $${idx++}`)
            values.push(opts.role)
        }
        if (opts?.status) {
            conditions.push(`status = $${idx++}`)
            values.push(opts.status)
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
        const limit = opts?.limit ?? 50
        const page = opts?.page ?? 1
        const offset = (page - 1) * limit

        const countRes = await queryCopteller(`SELECT COUNT(*) as count FROM copteller.copteller_memberships ${whereClause}`, values)
        const total = parseInt(countRes.rows[0]?.count || '0', 10)

        const rowsRes = await queryCopteller(`
            SELECT * FROM copteller.copteller_memberships 
            ${whereClause} 
            ORDER BY joined_date DESC 
            LIMIT $${idx++} OFFSET $${idx++}
        `, [...values, limit, offset])

        return {
            docs: rowsRes.rows,
            totalDocs: total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
        }
    } catch (err: any) {
        console.warn('[getMemberships] Fallback to Payload:', err.message)
        const payload = await getDb()
        const where: Record<string, any> = {}

        if (opts?.memberId) where['member'] = { equals: opts.memberId }
        if (opts?.cooperativeId) where['cooperative'] = { equals: opts.cooperativeId }
        if (opts?.role) where['role'] = { equals: opts.role }
        if (opts?.status) where['status'] = { equals: opts.status }

        return payload.find({
            collection: 'copteller-memberships',
            where,
            limit: opts?.limit ?? 50,
            page: opts?.page ?? 1,
            depth: 2,
            sort: '-joined_date',
        })
    }
}

export async function getMembershipById(id: string) {
    const payload = await getDb()
    return payload.findByID({ collection: 'copteller-memberships', id, depth: 2 })
}

export async function createMembership(data: Partial<CoptellerMembership>) {
    try {
        const payload = await getDb()
        return await payload.create({
            collection: 'copteller-memberships',
            data: data as any,
            overrideAccess: true,
        })
    } catch (err: any) {
        console.warn('[createMembership] Payload create failed, falling back to direct SQL insert:', err.message)
        const { queryCopteller } = await import('./pg')
        const res = await queryCopteller(`
            INSERT INTO copteller.copteller_memberships 
                (membership_number, member, cooperative, role, status, joined_date, total_contributed, outstanding_balance, credit_score, shares_owned, notes)
            VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            data.membership_number,
            String(data.member),
            String(data.cooperative),
            data.role || 'member',
            data.status || 'active',
            data.joined_date || new Date().toISOString(),
            data.total_contributed ?? 0,
            data.outstanding_balance ?? 0,
            data.credit_score ?? 50,
            data.shares_owned ?? 0,
            data.notes || null,
        ])
        return res.rows[0]
    }
}

export async function updateMembership(id: string, data: Partial<CoptellerMembership>) {
    try {
        const payload = await getDb()
        return await payload.update({
            collection: 'copteller-memberships',
            id,
            data: data as any,
            overrideAccess: true,
        })
    } catch (err: any) {
        console.warn('[updateMembership] Payload update failed, falling back to direct SQL update:', err.message)
        const { queryCopteller } = await import('./pg')
        const fields: string[] = []
        const values: any[] = []
        let idx = 1

        if (data.total_contributed !== undefined) {
            fields.push(`total_contributed = $${idx++}`)
            values.push(data.total_contributed)
        }
        if (data.outstanding_balance !== undefined) {
            fields.push(`outstanding_balance = $${idx++}`)
            values.push(data.outstanding_balance)
        }
        if (data.credit_score !== undefined) {
            fields.push(`credit_score = $${idx++}`)
            values.push(data.credit_score)
        }
        if (data.status !== undefined) {
            fields.push(`status = $${idx++}`)
            values.push(data.status)
        }
        if (data.role !== undefined) {
            fields.push(`role = $${idx++}`)
            values.push(data.role)
        }

        fields.push(`updated_at = NOW()`)
        values.push(Number(id))

        const res = await queryCopteller(`
            UPDATE copteller.copteller_memberships
            SET ${fields.join(', ')}
            WHERE id = $${idx}
            RETURNING *
        `, values)
        return res.rows[0]
    }
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

export async function writeAuditLog(entry: {
    actor_id: string
    actor_role: string
    actor_name?: string
    action: string
    entity_type: string
    entity_id: string
    before_state?: object
    after_state?: object
    amount_kobo?: number
    ip_address?: string
    cooperative?: string
    metadata?: object
}) {
    try {
        const payload = await getDb()
        await payload.create({
            collection: 'copteller-audit-logs',
            data: entry as any,
        })
    } catch (err) {
        // Audit logging should never break the primary operation
        console.error('[Copteller AuditLog] Failed to write audit log:', err)
    }
}

// ─── Summary helpers ──────────────────────────────────────────────────────────

/** Returns all active contracts for a member across all cooperatives */
export async function getMemberActiveContracts(customerId: string) {
    return getContracts({
        memberId: customerId,
        status: 'active',
        limit: 100,
    })
}

/** Returns all cooperative memberships for a member */
export async function getMemberCooperatives(customerId: string) {
    return getMemberships({
        memberId: customerId,
        status: 'active',
    })
}

/** Returns all active schemes for a cooperative */
export async function getCooperativeActiveSchemes(cooperativeId: string) {
    return getSchemes({
        cooperativeId,
        status: 'active',
        bank_approved: true,
    })
}

/** Returns aggregate stats for the superadmin dashboard */
export async function getPlatformStats() {
    const payload = await getDb()
    const [cooperatives, schemes, contracts, memberships] = await Promise.all([
        payload.find({ collection: 'cooperatives', where: { status: { equals: 'active' } }, limit: 0 }),
        payload.find({ collection: 'copteller-schemes', where: { status: { equals: 'active' } }, limit: 0 }),
        payload.find({ collection: 'copteller-contracts', where: { status: { equals: 'active' } }, limit: 0 }),
        payload.find({ collection: 'copteller-memberships', where: { status: { equals: 'active' } }, limit: 0 }),
    ])
    return {
        totalCooperatives: cooperatives.totalDocs,
        totalActiveSchemes: schemes.totalDocs,
        totalActiveContracts: contracts.totalDocs,
        totalActiveMembers: memberships.totalDocs,
    }
}
