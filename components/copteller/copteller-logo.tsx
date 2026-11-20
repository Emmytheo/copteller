import * as React from "react"
import { cn } from "@/lib/utils"

export type CoptellerLogoVariant = "color" | "print" | "mono" | "watermark"

export interface CoptellerMarkProps {
    size?: number
    variant?: CoptellerLogoVariant
    className?: string
}

/**
 * Copteller Institutional Crest Mark:
 * Architectural vault-shield squircle framing an optically centered interlocking
 * Cooperative "C" ring and Sovereign Gold Teller "T" clearing pillar — symbolizing
 * rotational thrift unity and regulated cooperative escrow.
 */
export function CoptellerMark({
    size = 36,
    variant = "color",
    className,
}: CoptellerMarkProps) {
    const uid = React.useId().replace(/:/g, "")

    if (variant === "watermark") {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                aria-hidden="true"
            >
                <rect x="4" y="4" width="56" height="56" rx="14" stroke="#064E3B" strokeWidth="2" />
                <path d="M18 11H46L53 18V46L46 53H18L11 46V18L18 11Z" stroke="#064E3B" strokeWidth="1.25" strokeDasharray="3 2" />
                <path
                    d="M41.3 19.7C38.7 17.6 35.4 16.5 31.8 16.5C23.2 16.5 16.3 23.4 16.3 32C16.3 40.6 23.2 47.5 31.8 47.5C35.5 47.5 38.8 46.3 41.4 44.1"
                    stroke="#064E3B"
                    strokeWidth="5.2"
                    strokeLinecap="round"
                />
                <path d="M30.8 23.5H48.2" stroke="#064E3B" strokeWidth="4.4" strokeLinecap="round" />
                <path d="M39.5 23.5V41.5" stroke="#064E3B" strokeWidth="4.4" strokeLinecap="round" />
                <circle cx="31.5" cy="32" r="2.8" fill="#064E3B" />
            </svg>
        )
    }

    if (variant === "mono") {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                aria-label="Copteller Emblem"
            >
                <rect x="3" y="3" width="58" height="58" rx="15" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5" />
                <path
                    d="M41.3 19.7C38.7 17.6 35.4 16.5 31.8 16.5C23.2 16.5 16.3 23.4 16.3 32C16.3 40.6 23.2 47.5 31.8 47.5C35.5 47.5 38.8 46.3 41.4 44.1"
                    stroke="currentColor"
                    strokeWidth="5.6"
                    strokeLinecap="round"
                />
                <path d="M30.8 23.5H48.2" stroke="currentColor" strokeWidth="4.6" strokeLinecap="round" />
                <path d="M39.5 23.5V41.5" stroke="currentColor" strokeWidth="4.6" strokeLinecap="round" />
                <circle cx="31.5" cy="32" r="2.8" fill="currentColor" />
            </svg>
        )
    }

    const isPrint = variant === "print"
    const bgId = `ct-bg-${uid}`
    const arcId = `ct-arc-${uid}`
    const goldId = `ct-gold-${uid}`

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("shrink-0 block", className)}
            aria-label="Copteller Emblem"
        >
            <defs>
                <linearGradient id={bgId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={isPrint ? "#064E3B" : "#065F46"} />
                    <stop offset="55%" stopColor={isPrint ? "#047857" : "#059669"} />
                    <stop offset="100%" stopColor="#022C22" />
                </linearGradient>
                <linearGradient id={arcId} x1="12" y1="14" x2="46" y2="50" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={isPrint ? "#FFFFFF" : "#A7F3D0"} />
                    <stop offset="55%" stopColor={isPrint ? "#ECFDF5" : "#34D399"} />
                    <stop offset="100%" stopColor={isPrint ? "#D1FAE5" : "#10B981"} />
                </linearGradient>
                <linearGradient id={goldId} x1="28" y1="16" x2="50" y2="48" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={isPrint ? "#FDE68A" : "#FEF08A"} />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
            </defs>
            {/* Vault Shield Squircle */}
            <rect x="3" y="3" width="58" height="58" rx="15" fill={`url(#${bgId})`} />
            <rect
                x="4.5"
                y="4.5"
                width="55"
                height="55"
                rx="13.5"
                stroke={isPrint ? "#D97706" : "#34D399"}
                strokeOpacity={isPrint ? "0.6" : "0.4"}
                strokeWidth="1.5"
            />
            {/* Inner Precision Vault Octagon */}
            <path
                d="M18 11H46L53 18V46L46 53H18L11 46V18L18 11Z"
                stroke="#FFFFFF"
                strokeOpacity="0.16"
                strokeWidth="1.2"
            />
            {/* Cooperative Interlocking C Ring (optically centered at 32,32) */}
            <path
                d="M41.3 19.7C38.7 17.6 35.4 16.5 31.8 16.5C23.2 16.5 16.3 23.4 16.3 32C16.3 40.6 23.2 47.5 31.8 47.5C35.5 47.5 38.8 46.3 41.4 44.1"
                stroke={`url(#${arcId})`}
                strokeWidth="5.6"
                strokeLinecap="round"
            />
            {/* Sovereign Gold Teller Pillar (T) */}
            <path d="M30.8 23.5H48.2" stroke={`url(#${goldId})`} strokeWidth="4.6" strokeLinecap="round" />
            <path d="M39.5 23.5V41.5" stroke={`url(#${goldId})`} strokeWidth="4.6" strokeLinecap="round" />
            {/* Center Clearing Vault Node */}
            <circle cx="31.5" cy="32" r="2.8" fill="#ECFDF5" />
        </svg>
    )
}

export interface CoptellerLogoProps {
    variant?: CoptellerLogoVariant
    size?: "sm" | "md" | "lg"
    markOnly?: boolean
    subtitle?: string | false
    className?: string
    wordmarkClassName?: string
}

const SIZE_MAP = {
    sm: { icon: 32, title: "text-[14px] tracking-[0.2em]", sub: "text-[7.5px] tracking-[0.16em]" },
    md: { icon: 36, title: "text-base tracking-[0.22em]", sub: "text-[8.5px] tracking-[0.18em]" },
    lg: { icon: 44, title: "text-xl tracking-[0.22em]", sub: "text-[9.5px] tracking-[0.2em]" },
} as const

export function CoptellerLogo({
    variant = "color",
    size = "md",
    markOnly = false,
    subtitle = "Cooperative Escrow OS",
    className,
    wordmarkClassName,
}: CoptellerLogoProps) {
    const cfg = SIZE_MAP[size]
    const isPrint = variant === "print"

    return (
        <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
            <CoptellerMark
                size={cfg.icon}
                variant={variant}
                className={isPrint ? "" : "drop-shadow-sm"}
            />
            {!markOnly && (
                <div className={cn("flex flex-col justify-center leading-none", wordmarkClassName)}>
                    <span
                        className={cn(
                            "font-black uppercase leading-none",
                            cfg.title,
                            isPrint
                                ? "text-[#064E3B]"
                                : "bg-gradient-to-r from-emerald-700 via-emerald-600 to-amber-600 dark:from-emerald-300 dark:via-emerald-400 dark:to-amber-400 bg-clip-text text-transparent"
                        )}
                    >
                        COPTELLER
                    </span>
                    {subtitle && (
                        <span
                            className={cn(
                                "font-bold uppercase leading-none mt-[4px]",
                                cfg.sub,
                                isPrint ? "text-amber-700" : "text-muted-foreground"
                            )}
                        >
                            {subtitle}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
