"use client"

import * as React from "react"
import { PartnerOrgProvider } from "@/context/partner-org-context"
import { PartnerScopeBar } from "@/components/copteller/partner-scope-bar"

export default function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
    return (
        <PartnerOrgProvider>
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 font-sans">
                <PartnerScopeBar />
                {children}
            </div>
        </PartnerOrgProvider>
    )
}
