'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ProviderActions() {
    const router = useRouter()

    const handleNew = () => {
        router.push('/copteller/superadmin/providers?id=new')
    }

    return (
        <button onClick={handleNew} className="p-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-md transition-colors">
            <Plus size={16} />
        </button>
    )
}
