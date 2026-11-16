"use client"

import * as React from "react"
import { INSTITUTIONAL_PARTNERS, InstitutionalPartner, PartnerSubscope } from "@/lib/data/partner-directory"

interface PartnerOrgContextType {
    activeOrg: InstitutionalPartner
    activeOrgSlug: string
    activeSubscopeId: string
    activeSubscope: PartnerSubscope | null
    switchOrg: (slug: string) => void
    switchSubscope: (subscopeId: string) => void
    allOrgs: InstitutionalPartner[]
    allSubscopes: PartnerSubscope[]
}

const PartnerOrgContext = React.createContext<PartnerOrgContextType | undefined>(undefined)

export function PartnerOrgProvider({ children }: { children: React.ReactNode }) {
    const [activeOrgSlug, setActiveOrgSlug] = React.useState<string>("abshia")
    const [activeSubscopeId, setActiveSubscopeId] = React.useState<string>("all")

    // Initialize from localStorage or URL on mount
    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search)
            const paramOrg = urlParams.get("partner")
            const paramSub = urlParams.get("subscope")

            const savedOrg = paramOrg || localStorage.getItem("active_partner_org_slug") || "abshia"
            const savedSub = paramSub || localStorage.getItem("active_partner_subscope_id") || "all"

            if (INSTITUTIONAL_PARTNERS.some(p => p.slug === savedOrg)) {
                setActiveOrgSlug(savedOrg)
            }
            setActiveSubscopeId(savedSub)
        }
    }, [])

    const activeOrg = React.useMemo(() => {
        return INSTITUTIONAL_PARTNERS.find(p => p.slug === activeOrgSlug) || INSTITUTIONAL_PARTNERS[0]
    }, [activeOrgSlug])

    const allSubscopes = React.useMemo(() => {
        return activeOrg.subscopes || []
    }, [activeOrg])

    const activeSubscope = React.useMemo(() => {
        if (activeSubscopeId === "all") return null
        return allSubscopes.find(s => s.id === activeSubscopeId) || null
    }, [activeSubscopeId, allSubscopes])

    const switchOrg = React.useCallback((slug: string) => {
        const found = INSTITUTIONAL_PARTNERS.find(p => p.slug === slug)
        if (!found) return
        setActiveOrgSlug(slug)
        setActiveSubscopeId("all")
        if (typeof window !== "undefined") {
            localStorage.setItem("active_partner_org_slug", slug)
            localStorage.setItem("active_partner_subscope_id", "all")
            document.cookie = `copteller_partner_slug=${slug}; path=/; max-age=31536000; SameSite=Lax`
        }
    }, [])

    const switchSubscope = React.useCallback((subscopeId: string) => {
        setActiveSubscopeId(subscopeId)
        if (typeof window !== "undefined") {
            localStorage.setItem("active_partner_subscope_id", subscopeId)
            document.cookie = `copteller_partner_subscope=${subscopeId}; path=/; max-age=31536000; SameSite=Lax`
        }
    }, [])

    return (
        <PartnerOrgContext.Provider
            value={{
                activeOrg,
                activeOrgSlug,
                activeSubscopeId,
                activeSubscope,
                switchOrg,
                switchSubscope,
                allOrgs: INSTITUTIONAL_PARTNERS,
                allSubscopes
            }}
        >
            {children}
        </PartnerOrgContext.Provider>
    )
}

export function usePartnerOrg() {
    const context = React.useContext(PartnerOrgContext)
    if (!context) {
        throw new Error("usePartnerOrg must be used within a PartnerOrgProvider")
    }
    return context
}
