"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Play, Activity, Layers, CheckCircle2, XCircle, Clock,
    Cpu, RefreshCw, ArrowLeft, Shield, Eye, Copy, Sparkles,
    FileJson, Terminal, AlertTriangle, Zap, Check, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { DynamicServiceForm } from "@/components/copteller/dynamic-service-form"

type ServiceData = {
    id: string
    name: string
    description: string
    category: any
    fee_type: string
    fee_value: number
    settlement_type: string
    service_intent: string
    form_schema: any[]
}

function SimulatorContent() {
    const searchParams = useSearchParams()
    const preselectedId = searchParams.get("serviceId")

    const [services, setServices] = React.useState<ServiceData[]>([])
    const [selectedServiceId, setSelectedServiceId] = React.useState<string>(preselectedId || "")
    const [selectedRole, setSelectedRole] = React.useState<string>("member")
    const [isLoadingServices, setIsLoadingServices] = React.useState(true)

    // Form test inputs
    const [formData, setFormData] = React.useState<Record<string, any>>({})
    const [isSimulating, setIsSimulating] = React.useState(false)
    const [simulationResult, setSimulationResult] = React.useState<any>(null)

    React.useEffect(() => {
        const fetchServices = async () => {
            setIsLoadingServices(true)
            try {
                const res = await fetch("/api/copteller/services?all=1")
                const data = await res.json()
                if (data.success) {
                    setServices(data.services || [])
                    if (!selectedServiceId && data.services?.length > 0) {
                        setSelectedServiceId(data.services[0].id)
                    }
                }
            } catch (err) {
                console.error("Failed to load services for simulator:", err)
            } finally {
                setIsLoadingServices(false)
            }
        }
        fetchServices()
    }, [])

    const selectedService = services.find(s => s.id === selectedServiceId)

    // Initialize form defaults when service changes
    React.useEffect(() => {
        if (selectedService) {
            const defaults: Record<string, any> = {}
            if (Array.isArray(selectedService.form_schema)) {
                selectedService.form_schema.forEach(field => {
                    if (field.name === "amount") defaults[field.name] = 10000
                    else if (field.name === "accountNumber") defaults[field.name] = "3000392981"
                    else if (field.name === "phoneNumber") defaults[field.name] = "08031234567"
                    else if (field.name === "meterNumber") defaults[field.name] = "44019283741"
                    else defaults[field.name] = field.placeholder || ""
                })
            }
            setFormData(defaults)
            setSimulationResult(null)
        }
    }, [selectedServiceId, selectedService])

    const handleInputChange = (fieldName: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }))
    }

    const handleRunSimulation = async () => {
        if (!selectedService) return
        setIsSimulating(true)
        setSimulationResult(null)

        try {
            const res = await fetch("/api/copteller/services/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serviceId: selectedService.id,
                    formData,
                    mockEnvironment: "sandbox",
                }),
            })
            const data = await res.json()

            if (data.success) {
                toast.success("Simulation executed successfully!")
                setSimulationResult(data)
            } else {
                toast.error(data.error || "Simulation failed")
                setSimulationResult(data)
            }
        } catch (error: any) {
            toast.error(error.message || "Network error during simulation")
        } finally {
            setIsSimulating(false)
        }
    }

    const copyPayload = () => {
        if (simulationResult) {
            navigator.clipboard.writeText(JSON.stringify(simulationResult, null, 2))
            toast.success("Copied simulation telemetry to clipboard")
        }
    }

    return (
        <div className="min-h-[100dvh] bg-background text-foreground">
            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 right-[20%] w-[400px] h-[400px] bg-rose-500/3 dark:bg-rose-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-[15%] w-[350px] h-[350px] bg-emerald-500/3 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                
                {/* ── TOP NAV STRIP ────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
                    <div>
                        <Link
                            href="/copteller/superadmin/services"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Services Manager
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
                            <Activity className="w-7 h-7 text-emerald-500" />
                            Service Simulator &amp; Sandboxing Workbench
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl font-semibold">
                            Interactive test workbench to dry-run form schemas, validation rules, fee calculators, and external API mappings in real-time with zero financial risk.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> Sandbox Mode (Mock Settlement)
                        </span>
                    </div>
                </div>

                {/* ── WORKBENCH GRID ───────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Controls & Interactive Form Runner */}
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* Service & Persona Configurator */}
                        <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">1. Target Service</Label>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{services.length} Published</span>
                            </div>

                            <select
                                value={selectedServiceId}
                                onChange={e => setSelectedServiceId(e.target.value)}
                                disabled={isLoadingServices}
                                className="w-full bg-background border border-border text-xs text-foreground rounded-xl px-3.5 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            >
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.category?.name || "General"})
                                    </option>
                                ))}
                            </select>

                            <div>
                                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-2">2. Simulate As Persona</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                    {[
                                        { id: "member", label: "Member" },
                                        { id: "coop_admin", label: "Coop Admin" },
                                        { id: "agent", label: "POS Agent" },
                                    ].map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setSelectedRole(p.id)}
                                            className={`py-2 px-3 rounded-xl border text-[11px] font-bold transition-all ${
                                                selectedRole === p.id 
                                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                                                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Form Schema Tester */}
                        {selectedService && (
                            <div className="p-6 rounded-2xl bg-card border border-border space-y-6 shadow-sm">
                                <div className="flex items-center justify-between border-b border-border pb-3">
                                    <div>
                                        <h2 className="text-sm font-black">{selectedService.name}</h2>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">{selectedService.description || "Enter form parameters to test simulation."}</p>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-muted border border-border text-muted-foreground">
                                        {selectedService.fee_type === "none" ? "Free" : selectedService.fee_type === "flat" ? `Fee: ₦${selectedService.fee_value}` : `Fee: ${selectedService.fee_value}%`}
                                    </span>
                                </div>

                                <DynamicServiceForm
                                    service={selectedService}
                                    formData={formData}
                                    onChange={handleInputChange}
                                    onSubmit={(e) => { e.preventDefault(); handleRunSimulation() }}
                                    isSubmitting={isSimulating}
                                    submitLabel="Run Sandboxed Simulation"
                                />
                            </div>
                        )}
                    </div>

                    {/* Right Results & Execution Telemetry */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* Execution Steps Trace */}
                        <div className="p-6 rounded-2xl bg-card border border-border space-y-6 shadow-sm">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-emerald-500" />
                                    <h2 className="text-sm font-black">Execution Timeline &amp; Step Telemetry</h2>
                                </div>
                                {simulationResult && (
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                        Duration: {simulationResult.totalDurationMs}ms
                                    </span>
                                )}
                            </div>

                            {!simulationResult ? (
                                <div className="py-16 text-center text-muted-foreground space-y-3">
                                    <Cpu className="w-10 h-10 mx-auto opacity-40 animate-pulse text-emerald-500" />
                                    <p className="text-xs font-medium">Click &quot;Run Sandboxed Simulation&quot; to test this service.</p>
                                    <p className="text-[11px] text-muted-foreground">The simulator will validate inputs, calculate fees, and trace external API integrations.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {simulationResult.traceSteps?.map((step: any, index: number) => (
                                        <motion.div
                                            key={step.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.08 }}
                                            className={`p-4 rounded-xl border ${
                                                step.status === "SUCCESS"
                                                    ? "bg-muted/30 border-border"
                                                    : "bg-rose-500/10 border-rose-500/20"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {step.status === "SUCCESS" ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-rose-500" />
                                                    )}
                                                    <span className="text-xs font-bold">{step.name}</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-muted-foreground">{step.durationMs}ms</span>
                                            </div>

                                            <pre className="text-[10px] font-mono text-foreground bg-[#0a0a0a] p-3 rounded-lg overflow-x-auto text-emerald-400">
                                                {JSON.stringify(step.details, null, 2)}
                                            </pre>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Simulated Receipt Preview */}
                        {simulationResult?.simulatedReceipt && (
                            <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
                                <div className="flex items-center justify-between border-b border-border pb-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                        <h2 className="text-sm font-black">Simulated Receipt Output</h2>
                                    </div>
                                    <Button onClick={copyPayload} size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1">
                                        <Copy className="w-3 h-3" /> Copy JSON
                                    </Button>
                                </div>

                                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 font-mono text-xs">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Reference:</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{simulationResult.simulatedReceipt.simulatedReference}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Service:</span>
                                        <span className="font-bold text-foreground">{simulationResult.simulatedReceipt.serviceName}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Principal:</span>
                                        <span className="font-bold text-foreground">₦{simulationResult.simulatedReceipt.principalAmount?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Calculated Fee:</span>
                                        <span className="font-bold text-foreground">₦{simulationResult.simulatedReceipt.fee?.toLocaleString()}</span>
                                    </div>
                                    <div className="border-t border-border pt-2 flex justify-between font-bold text-sm">
                                        <span>Total Debit:</span>
                                        <span className="text-emerald-600 dark:text-emerald-400">₦{simulationResult.simulatedReceipt.totalAmount?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    )
}

export default function SuperadminServiceSimulatorPage() {
    return (
        <React.Suspense
            fallback={
                <div className="min-h-[100dvh] flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
            }
        >
            <SimulatorContent />
        </React.Suspense>
    )
}
