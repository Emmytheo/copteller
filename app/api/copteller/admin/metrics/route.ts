import { getDb } from '@/lib/copteller/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireCoptellerRole } from '@/lib/copteller/auth'

export async function GET(req: NextRequest) {
    try {
        const auth = await requireCoptellerRole(req, ['superadmin', 'bank_staff'])
        if (auth instanceof NextResponse) return auth

        const payload = await getDb()

        // 1. Fetch Cooperatives
        const coopsRes = await payload.find({
            collection: 'cooperatives',
            limit: 250,
            overrideAccess: true,
        })
        const cooperatives = coopsRes.docs || []
        const totalCoopsCount = cooperatives.length
        const activeCoopsCount = cooperatives.filter((c: any) => c.status === 'active').length
        const pendingCoopsCount = cooperatives.filter((c: any) => c.status !== 'active').length

        // 2. Fetch Schemes
        const schemesRes = await payload.find({
            collection: 'copteller-schemes',
            limit: 250,
            overrideAccess: true,
        })
        const schemes = schemesRes.docs || []
        const totalSchemesCount = schemes.length
        const activeSchemesCount = schemes.filter((s: any) => s.status === 'active').length

        // 3. Fetch Contracts
        const contractsRes = await payload.find({
            collection: 'copteller-contracts',
            limit: 250,
            overrideAccess: true,
        })
        const contracts = contractsRes.docs || []
        const totalContractsCount = contracts.length
        const activeContractsCount = contracts.filter((c: any) => c.status === 'active').length
        const defaultedContractsCount = contracts.filter((c: any) => c.status === 'defaulted').length
        const completedContractsCount = contracts.filter((c: any) => c.status === 'completed').length

        // Book Value & Repayments
        const totalBookValue = contracts.reduce((sum: number, c: any) => sum + (c.total_obligation || 0), 0) / 100
        const totalRepaid = contracts.reduce((sum: number, c: any) => sum + (c.total_paid || 0), 0) / 100

        // 4. Fetch Accounts (total funds under management)
        const accountsRes = await payload.find({
            collection: 'accounts',
            limit: 250,
            overrideAccess: true,
        })
        const accounts = accountsRes.docs || []
        const totalEscrowKobo = accounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0)
        const totalEscrowNaira = totalEscrowKobo / 100

        // 5. Memberships & average credit score
        const membershipsRes = await payload.find({
            collection: 'copteller-memberships',
            limit: 250,
            overrideAccess: true,
        })
        const memberships = membershipsRes.docs || []
        const scores = memberships.map((m: any) => m.credit_score || 50)
        const avgCreditScore = scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 75

        // 6. Sector Distribution (cooperatives count by sector)
        const sectorCounts: Record<string, number> = {}
        const sectorAum: Record<string, number> = {}
        
        cooperatives.forEach((c: any) => {
            const sec = c.sector || 'general'
            sectorCounts[sec] = (sectorCounts[sec] || 0) + 1
        })

        // Accumulate AUM from contracts matching cooperatives in sector
        contracts.forEach((c: any) => {
            const coopId = typeof c.cooperative === 'object' ? c.cooperative?.id : c.cooperative
            const coop = cooperatives.find((co: any) => String(co.id) === String(coopId))
            const sec = coop?.sector || 'general'
            sectorAum[sec] = (sectorAum[sec] || 0) + (c.total_obligation || 0) / 100
        })

        const totalObligationAll = contracts.reduce((sum: number, c: any) => sum + (c.total_obligation || 0), 0) / 100
        const sectorList = Object.keys(sectorCounts).map(sec => {
            const count = sectorCounts[sec]
            const aumVal = sectorAum[sec] || 0
            const pct = totalObligationAll > 0 ? Math.round((aumVal / totalObligationAll) * 100) : 25
            return {
                sector: sec.charAt(0).toUpperCase() + sec.slice(1),
                coops: count,
                aum: `₦${Number(aumVal).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                pct: pct || 25,
            }
        })

        // 7. Dynamic Alert Lists
        const alerts = [
            { label: `${pendingCoopsCount} union approval${pendingCoopsCount === 1 ? '' : 's'} pending`, type: pendingCoopsCount > 0 ? "warning" : "info" },
            { label: `${defaultedContractsCount} HP asset default${defaultedContractsCount === 1 ? '' : 's'} flagged`, type: defaultedContractsCount > 0 ? "error" : "info" },
            { label: `${activeSchemesCount} active scheme${activeSchemesCount === 1 ? '' : 's'} running`, type: "info" }
        ]

        // 8. Collection Rate
        const totalDueAmount = contracts.reduce((sum: number, c: any) => sum + (c.due_amount || 0), 0)
        const collectionRate = totalDueAmount > 0 ? ((totalRepaid * 100) / (totalBookValue || 1)).toFixed(1) : "95.5"

        return NextResponse.json({
            success: true,
            metrics: {
                totalCoops: activeCoopsCount,
                pendingCoopsCount,
                activeSchemes: activeSchemesCount,
                hpAssetsTracked: totalContractsCount,
                platformEscrow: totalEscrowNaira,
                totalBookValue,
                totalRepaid,
                avgCreditScore: avgCreditScore.toFixed(1),
                collectionRate,
                sectorList,
                alerts,
            }
        })
    } catch (error: any) {
        console.error('Copteller GET admin metrics error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
