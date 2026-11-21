"use client"

import * as React from "react"

interface PartnerBankInfo {
    provider: string
    bankName: string
    primaryEscrowNuban: string | null
    escrowAccountNumber: string
}

let cachedPartner: PartnerBankInfo | null = null
let inflight: Promise<PartnerBankInfo | null> | null = null

async function fetchPartnerBank(): Promise<PartnerBankInfo | null> {
    if (cachedPartner) return cachedPartner
    if (!inflight) {
        inflight = fetch("/api/copteller/partner-bank", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d?.success && d.partnerBank) {
                    cachedPartner = d.partnerBank
                    return cachedPartner
                }
                return null
            })
            .catch(() => null)
    }
    return inflight
}

export function useActivePartnerBank() {
    const [partner, setPartner] = React.useState<PartnerBankInfo | null>(cachedPartner)
    React.useEffect(() => {
        let mounted = true
        fetchPartnerBank().then((p) => {
            if (mounted && p) setPartner(p)
        })
        return () => {
            mounted = false
        }
    }, [])
    return partner
}

export function PartnerEscrowInlineLabel({ prefix = "Partner Bank Escrow" }: { prefix?: string }) {
    const partner = useActivePartnerBank()
    const bankName = partner?.bankName || "Licensed Partner MFB"
    const nuban = partner?.primaryEscrowNuban
    return (
        <span>
            {prefix}: <strong>{bankName}</strong>
            {nuban ? ` · Escrow #${nuban}` : " · Dynamic Escrow Rail"}
        </span>
    )
}
