import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const secret = searchParams.get('secret')
    
    // Simple protection
    if (secret !== 'sync-copteller-123') {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const dbUri = process.env.COPTELLER_DATABASE_URI
    if (!dbUri) {
        return NextResponse.json({ error: 'COPTELLER_DATABASE_URI not configured.' }, { status: 500 })
    }

    const logMessages: string[] = []
    const log = (msg: string) => {
        console.log(`[DB-SYNC] ${msg}`)
        logMessages.push(msg)
    }

    log('Starting Copteller database synchronization...')

    // 1. Create schema copteller if not exists
    const client = new Client({
        connectionString: dbUri,
        ssl: { rejectUnauthorized: false }
    })
    
    try {
        await client.connect()
        log('Connected directly to PostgreSQL.')
        await client.query('CREATE SCHEMA IF NOT EXISTS copteller')
        log('Successfully created/verified "copteller" schema.')
    } catch (err: any) {
        log(`Failed direct PostgreSQL schema creation: ${err.message}`)
        return NextResponse.json({ success: false, errors: logMessages }, { status: 500 })
    } finally {
        await client.end()
    }

    // 2. Initialize Copteller Payload DB and trigger schema push
    try {
        log('Initializing custom Copteller Payload instance...')
        const payload = await getDb()
        log('Payload initialized.')

        const db = payload.db
        log(`DB adapter keys: ${JSON.stringify(Object.keys(db))}`)

        if (typeof db.push === 'function') {
            log('Found db.push() function. Executing schema push...')
            await db.push()
            log('db.push() completed successfully!')
        } else if (typeof db.schemaPush === 'function') {
            log('Found db.schemaPush() function. Executing schema push...')
            await db.schemaPush()
            log('db.schemaPush() completed successfully!')
        } else if (typeof db.sync === 'function') {
            log('Found db.sync() function. Executing...')
            await db.sync()
            log('db.sync() completed successfully!')
        } else {
            log('No direct schema push method found on DB adapter. Let us try calling schemaPush or sync if hidden.')
        }

        return NextResponse.json({
            success: true,
            logs: logMessages
        })
    } catch (err: any) {
        log(`Payload db push operation failed: ${err.message}`)
        if (err.stack) console.error(err.stack)
        return NextResponse.json({
            success: false,
            error: err.message,
            logs: logMessages
        }, { status: 500 })
    }
}
