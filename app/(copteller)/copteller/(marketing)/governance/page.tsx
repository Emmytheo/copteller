"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    ShieldCheck, 
    Upload, 
    FileText, 
    CheckCircle2, 
    ArrowRight, 
    Users, 
    Briefcase,
    Globe,
    Cpu,
    Play,
    Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"

export default function CoptellerGovernancePage() {
    const [wizardStep, setWizardStep] = React.useState<number>(1)
    const [coopName, setCoopName] = React.useState<string>("")
    const [coopSector, setCoopSector] = React.useState<string>("transport")
    const [uploading, setUploading] = React.useState<boolean>(false)
    const [uploadCompleted, setUploadCompleted] = React.useState<boolean>(false)
    const [deploying, setDeploying] = React.useState<boolean>(false)
    const [deployLog, setDeployLog] = React.useState<string[]>([])

    // Simulated file upload
    const handleFileUpload = () => {
        setUploading(true)
        setTimeout(() => {
            setUploading(false)
            setUploadCompleted(true)
            toast.success("Guild Roster (CSV) uploaded and validated successfully!")
        }, 1500)
    }

    // Simulated Smart Vault Deployment
    const handleDeployVault = () => {
        setDeploying(true)
        setDeployLog([])
        const logs = [
            "Initializing Copteller vault security context...",
            "Retrieving cooperative society metadata from CAC registry...",
            "Creating digital Escrow accounts under partner MFB vaults...",
            "Validating bylaws: Rotation max limit set to 30 days...",
            "Deploying TVS King HP dynamic split executors...",
            "Reserve requirement check: 10% cash backing verified...",
            "Handshake completed: Digital ledger verified by regulator...",
            "Deployment Successful! Escrow Vault ID: CT-8294-ABA active."
        ]
        
        logs.forEach((log, index) => {
            setTimeout(() => {
                setDeployLog(prev => [...prev, log])
                if (index === logs.length - 1) {
                    setDeploying(false)
                    toast.success("Escrow Smart Vault Deployed & Cleared!")
                }
            }, (index + 1) * 600)
        });
    }

    return (
        <div className="bg-background text-foreground min-h-[100dvh] py-16 px-6 md:px-8 relative overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-600/5 dark:bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-600/5 dark:bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto space-y-16 relative z-10">
                
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-505/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                        Union Regulation
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                        Cooperative Governance
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                        Copteller operates under trade guild governance parameters, audited by partner MFB compliance standards. Read rules or configure your union vault parameters below.
                    </p>
                </div>

                {/* Grid: Bylaws & Auditing Principles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 space-y-4 backdrop-blur-md">
                        <div className="p-3 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl w-fit">
                            <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-black">MFB Deposit Auditing</h3>
                        <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                            Copteller is not a standalone credit registry. All deposits and thrift balances are wrapped inside bank accounts held at partner MFBs, insuring union member capital up to NDIC thresholds.
                        </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-900 rounded-3xl p-8 space-y-4 backdrop-blur-md">
                        <div className="p-3 bg-slate-105/50 border border-slate-200 dark:border-slate-800 rounded-2xl w-fit">
                            <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-2xl font-black">Bylaws Frameworks</h3>
                        <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                            Every registered cooperative society submits a digitized copy of their Bylaws and Rules. Dynamic workflows use these variables to enforce maximum rotation timeouts and target default interest margins.
                        </p>
                    </div>
                </div>

                {/* Onboarding Wizard Segment */}
                <section className="bg-slate-50/50 dark:bg-slate-955/10 border border-slate-200 dark:border-slate-900 rounded-[32px] p-8 md:p-12 space-y-8 backdrop-blur-md">
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl md:text-3xl font-black">Interactive Union Setup Wizard</h3>
                        <p className="text-xs text-muted-foreground font-semibold">Simulate how a trade group sets up their digital cooperative profile in less than 5 minutes.</p>
                    </div>

                    {/* Progress indicators */}
                    <div className="max-w-md mx-auto flex items-center justify-between text-xs font-black relative">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-900 -z-10" />
                        {[1, 2, 3].map(step => (
                            <button
                                key={step}
                                onClick={() => setWizardStep(step)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border font-black transition-all ${wizardStep === step ? 'bg-emerald-600 text-white dark:text-black border-emerald-500' : wizardStep > step ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-950 text-muted-foreground border-slate-200 dark:border-slate-900'}`}
                            >
                                {step}
                            </button>
                        ))}
                    </div>

                    {/* Step Content */}
                    <div className="bg-slate-100 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 p-8 rounded-2xl max-w-xl mx-auto space-y-6">
                        <AnimatePresence mode="wait">
                            {wizardStep === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-4"
                                >
                                    <h4 className="text-base font-black">Step 1: Cooperative Profile & Sector</h4>
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cooperative Society Name</label>
                                            <input 
                                                type="text" placeholder="e.g. Aba Transport Operator Union" value={coopName} onChange={(e) => setCoopName(e.target.value)}
                                                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-555"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Guild Sector</label>
                                            <select 
                                                value={coopSector} onChange={(e) => setCoopSector(e.target.value)}
                                                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-555"
                                            >
                                                <option value="transport">Transport (Keke/Tricycles)</option>
                                                <option value="retail">Retail Market Guilds</option>
                                                <option value="agro">Agricultural Cooperatives</option>
                                            </select>
                                        </div>
                                    </div>
                                    <Button 
                                        disabled={!coopName}
                                        onClick={() => setWizardStep(2)}
                                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white dark:text-black font-black rounded-xl text-xs flex items-center justify-center gap-1 border-0"
                                    >
                                        Next Stage <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </motion.div>
                            )}

                            {wizardStep === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-4 text-center"
                                >
                                    <h4 className="text-base font-black">Step 2: Upload Member Roster</h4>
                                    <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                                        Upload a structured CSV holding your guild operators details to register their ledger wallets.
                                    </p>
                                    
                                    <div 
                                        onClick={handleFileUpload}
                                        className="border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                                    >
                                        {uploading ? (
                                            <Loader2 className="h-8 w-8 text-emerald-555 animate-spin" />
                                        ) : uploadCompleted ? (
                                            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-450" />
                                        ) : (
                                            <Upload className="h-8 w-8 text-slate-400" />
                                        )}
                                        <span className="text-xs font-black uppercase text-slate-400">
                                            {uploading ? 'Validating Roster...' : uploadCompleted ? 'Uploaded!' : 'Upload Roster.csv'}
                                        </span>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button variant="outline" className="flex-1 h-11 text-xs font-black rounded-xl" onClick={() => setWizardStep(1)}>Back</Button>
                                        <Button 
                                            disabled={!uploadCompleted}
                                            onClick={() => setWizardStep(3)}
                                            className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white dark:text-black font-black rounded-xl text-xs flex items-center justify-center gap-1 border-0"
                                        >
                                            Next Stage <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {wizardStep === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-5"
                                >
                                    <h4 className="text-base font-black">Step 3: Deploy Smart Vault</h4>
                                    <p className="text-xs text-muted-foreground font-semibold leading-relaxed text-center">
                                        Deploying registers a secure Escrow pool directly mapping MFB ledger splits.
                                    </p>

                                    {!deploying && deployLog.length === 8 ? (
                                        /* Deployed Success Summary Card */
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 space-y-4 font-sans text-xs">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                                                    <ShieldCheck className="h-5 w-5 animate-bounce" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground font-black uppercase">Vault Registration Complete</p>
                                                    <h5 className="font-black text-foreground">Escrow Smart Vault Active</h5>
                                                </div>
                                            </div>

                                            <div className="divide-y divide-slate-100 dark:divide-slate-900 border border-slate-200 dark:border-slate-900 rounded-xl overflow-hidden font-bold">
                                                <div className="flex justify-between px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/30">
                                                    <span className="text-muted-foreground">Cooperative</span>
                                                    <span className="text-foreground font-black">{coopName}</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-2.5">
                                                    <span className="text-muted-foreground">Vault ID</span>
                                                    <span className="font-mono text-emerald-650 dark:text-emerald-450 font-extrabold">CT-8294-ABA</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-2.5">
                                                    <span className="text-muted-foreground">Clearing Fee</span>
                                                    <span className="text-foreground font-black">1.5% at source</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-2.5">
                                                    <span className="text-muted-foreground">Reserves Backing</span>
                                                    <span className="text-foreground font-black">1:1 Escrow Reserves</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <Button onClick={() => { setWizardStep(1); setDeployLog([]); setCoopName("") }} variant="outline" className="flex-1 h-10 text-xs font-bold rounded-xl">
                                                    Reset Wizard
                                                </Button>
                                                <Button asChild className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs rounded-xl border-none">
                                                    <Link href="/copteller/onboarding/admin">Onboard Admin Console →</Link>
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        /* Deployment trigger and logging */
                                        <div className="space-y-4">
                                            <Button 
                                                disabled={deploying || deployLog.length > 0}
                                                onClick={handleDeployVault}
                                                className="w-full h-11 bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black font-black rounded-xl text-xs flex items-center justify-center gap-1.5 border-0 shadow-md"
                                            >
                                                <Cpu className="h-4 w-4" /> Deploy Union Escrow Vault
                                            </Button>

                                            {deployLog.length > 0 && (
                                                <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-[9px] text-emerald-450 space-y-1.5 h-36 overflow-y-auto">
                                                    {deployLog.map((log, idx) => (
                                                        <div key={idx} className="flex gap-1.5">
                                                            <span className="text-slate-500 shrink-0">&gt;</span>
                                                            <span className="leading-relaxed">{log}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex gap-3">
                                                <Button disabled={deploying} variant="outline" className="w-full h-11 text-xs font-black rounded-xl" onClick={() => setWizardStep(2)}>Back</Button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

            </div>
        </div>
    )
}
