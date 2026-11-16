"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

export default function CirclesPage() {
    const router = useRouter()
    React.useEffect(() => {
        router.replace('/copteller/esusu')
    }, [router])

    return (
        <div className="flex h-[70vh] flex-col items-center justify-center gap-4 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-muted-foreground font-medium text-xs">Redirecting to Two-Track Thrift Hub...</p>
        </div>
    )
}
