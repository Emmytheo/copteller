'use client'
import React, { useState, useMemo } from 'react'
import { TaskRegistry } from '@/lib/workflow/task/registry'
import { TaskType, TaskCategory } from '@/lib/workflow/types'
import { Badge } from '@/components/ui/badge'
import { X, Search, ChevronDown, ChevronRight, Sparkles, Plus } from 'lucide-react'

const CATEGORY_META: Record<string, { label: string; accent?: string }> = {
    OLIVEPAY: { label: 'OlivePay Settlement & Escrow', accent: 'text-emerald-600 dark:text-emerald-400' },
    FLOW_CONTROL: { label: 'Flow Control' },
    API_INTEGRATION: { label: 'API & Core Rails' },
    APPROVAL: { label: 'Approvals & Gates' },
    NOTIFICATION: { label: 'Notifications' },
    DATA: { label: 'Data & Mapping' },
    DOCUMENT: { label: 'Documents' },
    COMPLIANCE: { label: 'KYC & Compliance' },
    CUSTOM: { label: 'Custom & Sync' },
}

export function TaskMenu({
    isOpen,
    onClose,
    onQuickAdd,
}: {
    isOpen: boolean
    onClose: () => void
    onQuickAdd?: (type: TaskType) => void
}) {
    const [search, setSearch] = useState('')
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

    const onDragStart = (e: React.DragEvent, type: TaskType) => {
        e.dataTransfer.setData('application/reactflow', type)
        e.dataTransfer.effectAllowed = 'move'
        if (window.innerWidth < 768) onClose()
    }

    const toggleCategory = (cat: string) => {
        setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))
    }

    const allTasks = useMemo(() => Object.values(TaskRegistry), [])

    const isSearching = search.trim().length > 0
    const q = search.toLowerCase().trim()

    const filteredFlat = useMemo(() => {
        if (!isSearching) return []
        return allTasks.filter((t) =>
            t.label.toLowerCase().includes(q) ||
            t.type.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q)
        )
    }, [allTasks, q, isSearching])

    const categories = useMemo(() => Object.values(TaskCategory), [])

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`
                    absolute md:relative z-50 h-full w-72 md:w-68 bg-background border-r flex flex-col overflow-hidden shrink-0 transition-all duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full md:-translate-x-72 md:w-0 md:opacity-0 md:hidden md:border-none'}
                `}
            >
                {/* Header */}
                <div className="px-4 pt-4 pb-3 shrink-0 border-b">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                                Node Palette
                                <Badge variant="secondary" className="text-[9px] font-mono px-1.5 py-0">
                                    {allTasks.length}
                                </Badge>
                            </h2>
                            <p className="text-[11px] text-muted-foreground">Drag or click + to add to canvas</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-md"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search nodes (e.g. OlivePay, Hold)…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background transition-colors"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Node list */}
                <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3 pb-20">
                    {isSearching ? (
                        filteredFlat.length === 0 ? (
                            <div className="text-center text-xs text-muted-foreground py-8">
                                No nodes match &quot;{search}&quot;
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <p className="px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                                    {filteredFlat.length} result{filteredFlat.length !== 1 ? 's' : ''}
                                </p>
                                {filteredFlat
                                    .sort((a, b) => a.label.localeCompare(b.label))
                                    .map((task) => (
                                        <TaskItem
                                            key={task.type}
                                            task={task}
                                            onDragStart={onDragStart}
                                            onQuickAdd={onQuickAdd}
                                        />
                                    ))}
                            </div>
                        )
                    ) : (
                        categories.map((cat) => {
                            const tasks = allTasks
                                .filter((t) => t.category === cat)
                                .sort((a, b) => a.label.localeCompare(b.label))
                            if (tasks.length === 0) return null
                            const isCollapsed = !!collapsed[cat]
                            const meta = CATEGORY_META[cat] || { label: cat.replace(/_/g, ' ') }
                            const isOlivePay = cat === TaskCategory.OLIVEPAY

                            return (
                                <div key={cat} className={`rounded-xl ${isOlivePay ? 'bg-emerald-500/[0.04] border border-emerald-500/20 p-1.5' : ''}`}>
                                    <button
                                        type="button"
                                        onClick={() => toggleCategory(cat)}
                                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
                                    >
                                        <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${meta.accent || 'text-muted-foreground'}`}>
                                            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                            {isOlivePay && <Sparkles size={11} className="text-emerald-500" />}
                                            {meta.label}
                                        </span>
                                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                            {tasks.length}
                                        </span>
                                    </button>
                                    {!isCollapsed && (
                                        <div className="space-y-0.5 mt-1">
                                            {tasks.map((task) => (
                                                <TaskItem
                                                    key={task.type}
                                                    task={task}
                                                    isOlivePay={isOlivePay}
                                                    onDragStart={onDragStart}
                                                    onQuickAdd={onQuickAdd}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </aside>
        </>
    )
}

function TaskItem({
    task,
    isOlivePay,
    onDragStart,
    onQuickAdd,
}: {
    task: any
    isOlivePay?: boolean
    onDragStart: (e: React.DragEvent, type: TaskType) => void
    onQuickAdd?: (type: TaskType) => void
}) {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.type)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-grab active:cursor-grabbing border border-transparent hover:border-border transition-colors group"
            title={task.description || task.label}
        >
            <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform ${
                isOlivePay
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-primary/10 text-primary'
            }`}>
                <task.icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold leading-tight truncate">{task.label}</div>
                {task.isEntryPoint && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 mt-0.5">Entry</Badge>
                )}
            </div>
            {onQuickAdd && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onQuickAdd(task.type)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-primary/15 text-primary transition-all shrink-0"
                    title={`Add ${task.label} to canvas`}
                >
                    <Plus size={13} />
                </button>
            )}
        </div>
    )
}
