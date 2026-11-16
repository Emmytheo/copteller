"use client"

import * as React from "react"
import Link from "next/link"
import { GenericDataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Eye, Edit, Trash2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

const PRODUCT_TYPES = [
    { value: "ajo_rotation", label: "Ajo / Rotational Thrift", icon: "🔄" },
    { value: "hire_purchase", label: "Hire Purchase / Asset Lease", icon: "🚛" },
    { value: "micro_loan", label: "Micro Loan Pool", icon: "💰" },
    { value: "grant", label: "Government / Enterprise Grant", icon: "🏛️" },
    { value: "cooperative_bond", label: "Cooperative Bond / Fixed Savings", icon: "🔐" },
    { value: "savings_drive", label: "Group Savings Drive", icon: "🐖" },
    { value: "insurance_pool", label: "Insurance Premium Pool", icon: "🛡️" },
]

export default function SuperadminProductsPage() {
    const [data, setData] = React.useState<any[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const res = await fetch("/api/copteller/products")
            const json = await res.json()
            if (json.data) {
                setData(json.data)
            }
        } catch (error) {
            console.error("Failed to load products:", error)
            toast.error("Failed to load product templates")
        } finally {
            setIsLoading(false)
        }
    }

    React.useEffect(() => {
        fetchData()
    }, [])

    const handleToggleStatus = async (item: any) => {
        const newStatus = item.status === "active" ? "draft" : "active"
        try {
            setData(prev => prev.map(t => t.id === item.id ? { ...t, status: newStatus } : t))
            const res = await fetch(`/api/copteller/products/${item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            })
            if (!res.ok) throw new Error()
            toast.success(`Product "${item.name}" is now ${newStatus}`)
        } catch (e) {
            setData(prev => prev.map(t => t.id === item.id ? { ...t, status: item.status } : t))
            toast.error("Failed to update status")
        }
    }

    const handleDelete = (id: string) => {
        toast("Are you sure you want to deprecate this product template?", {
            action: {
                label: "Deprecate",
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/copteller/products/${id}`, { method: "DELETE" })
                        if (!res.ok) throw new Error()
                        setData(prev => prev.filter(item => item.id !== id))
                        toast.success("Product template deprecated.")
                    } catch (error) {
                        toast.error("Failed to deprecate product template.")
                    }
                }
            },
            cancel: {
                label: "Cancel",
                onClick: () => { }
            }
        })
    }

    const formatAmount = (kobo: number) => {
        if (!kobo) return "—"
        return `₦${(kobo / 100).toLocaleString()}`
    }

    const actionColumn = {
        header: "Actions",
        accessorKey: "id",
        cell: (item: any) => (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href={`/copteller/superadmin/products/${item.id}` as any} className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4 text-muted-foreground" /> View Details
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={`/copteller/superadmin/products/${item.id}` as any} className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4 text-muted-foreground" /> Edit Product
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Deprecate
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    if (isLoading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <RefreshCw className="h-10 w-10 animate-spin text-amber-500" />
                <p className="text-muted-foreground font-semibold text-xs uppercase tracking-widest animate-pulse">Loading products registry...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 px-3 sm:px-6 md:px-8 py-4 sm:py-8 pb-12">
            <GenericDataTable
                title="Product Templates"
                description="Configure templates that cooperatives use to instantiate their schemes."
                data={data}
                searchPlaceholder="Search product templates..."
                searchKey="name"
                actionButton={
                    <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                        <Link href="/copteller/superadmin/products/new" as={undefined} {...({ href: "/copteller/superadmin/products/new" } as any)}>
                            <Plus className="mr-2 h-4 w-4 font-black" /> Add Product
                        </Link>
                    </Button>
                }
                columns={[
                    {
                        header: "Product Template",
                        accessorKey: "name",
                        cell: (item) => (
                            <div className="flex flex-col">
                                <span className="font-semibold text-foreground">{item.name}</span>
                                <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate">{item.tagline || "No tagline"}</span>
                            </div>
                        )
                    },
                    {
                        header: "Product Type",
                        accessorKey: "product_type",
                        cell: (item) => {
                            const found = PRODUCT_TYPES.find(p => p.value === item.product_type)
                            return (
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <span>{found?.icon || "⚙️"}</span>
                                    <span>{found?.label || item.product_type}</span>
                                </div>
                            )
                        }
                    },
                    {
                        header: "Min/Max Amount",
                        accessorKey: "min_amount",
                        cell: (item) => (
                            <div className="flex flex-col text-xs">
                                <span className="font-medium text-foreground">Min: {formatAmount(item.min_amount)}</span>
                                <span className="text-muted-foreground mt-0.5">Max: {item.max_amount ? formatAmount(item.max_amount) : "No Cap"}</span>
                            </div>
                        )
                    },
                    {
                        header: "Interest",
                        accessorKey: "interest_rate",
                        cell: (item) => (
                            <Badge variant="outline" className="text-xs font-semibold">
                                {item.interest_rate || 0}%
                            </Badge>
                        )
                    },
                    {
                        header: "Status",
                        accessorKey: "status",
                        cell: (item) => (
                            <button
                                onClick={() => handleToggleStatus(item)}
                                className="group relative flex items-center gap-1 focus:outline-none transition-transform duration-200 active:scale-95"
                                title={`Click to change status to ${item.status === 'active' ? 'draft' : 'active'}`}
                            >
                                <span
                                    className={`capitalize cursor-pointer select-none transition-all duration-300 font-semibold px-2.5 py-1 flex items-center gap-1.5 rounded-full text-xs ${
                                        item.status === 'active'
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 shadow-none'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                                    {item.status}
                                </span>
                            </button>
                        )
                    },
                    actionColumn
                ]}
                gridRenderItem={(item) => {
                    const typeFound = PRODUCT_TYPES.find(p => p.value === item.product_type)
                    return (
                        <div key={item.id} className="border rounded-2xl p-5 bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-48 border-border">
                            <div>
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <h3 className="font-semibold text-foreground line-clamp-1">{item.name}</h3>
                                        <span className="text-[10px] text-muted-foreground">{typeFound?.icon} {typeFound?.label}</span>
                                    </div>
                                    <Badge variant={item.status === "active" ? "default" : "outline"} className={item.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-none shadow-none" : ""}>
                                        {item.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{item.description}</p>
                            </div>
                            <div className="flex items-center justify-between border-t pt-3 mt-4 text-xs">
                                <span className="font-semibold text-foreground">{formatAmount(item.min_amount)}</span>
                                <Button variant="ghost" size="sm" asChild className="h-7 px-2">
                                    <Link href={`/copteller/superadmin/products/${item.id}` as any}>Configure →</Link>
                                </Button>
                            </div>
                        </div>
                    )
                }}
            />
        </div>
    )
}
