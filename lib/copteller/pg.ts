import { Pool, type QueryResult, type QueryResultRow } from 'pg'

let poolInstance: Pool | null = null

export function getCoptellerPool(): Pool {
    if (poolInstance) return poolInstance

    const connectionString = process.env.COPTELLER_DATABASE_URI || process.env.DATABASE_URI
    if (!connectionString) {
        throw new Error('Neither COPTELLER_DATABASE_URI nor DATABASE_URI is defined.')
    }

    poolInstance = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 8,
        idleTimeoutMillis: 15000,
        connectionTimeoutMillis: 2500,
        statement_timeout: 3000,
    })

    poolInstance.on('error', (err) => {
        console.warn('[Copteller PG Pool] Unexpected error on client, recycling pool:', err.message)
        try {
            poolInstance?.end().catch(() => {})
        } catch {}
        poolInstance = null
    })

    return poolInstance
}

/**
 * Robust query execution helper with fail-fast recovery
 */
export async function queryCopteller<R extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<R>> {
    const pool = getCoptellerPool()
    try {
        return await pool.query<R>(text, params)
    } catch (err: any) {
        // If timeout or connection failure, invalidate pool and throw fast
        if (
            err.message?.includes('timeout') ||
            err.message?.includes('Connection terminated') ||
            err.message?.includes('closed') ||
            err.message?.includes('ECONNRESET')
        ) {
            try {
                poolInstance?.end().catch(() => {})
            } catch {}
            poolInstance = null
        }
        throw err
    }
}
