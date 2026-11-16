"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, Building2, Users, Globe, ShieldAlert, TrendingUp, Landmark } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export type ScopeType = "personal" | "business" | "coop" | "global" | "branch" | "support" | "member" | "coop_admin" | "investor" | "partner" | "superadmin" | "bank_staff";
export type ScopeId = string;

export interface Scope {
  id: ScopeId;
  type: ScopeType;
  name: string;
  description: string;
  icon: any;
  role?: string;
  cooperativeName?: string | null;
  onboarding_done?: boolean;
}

// ─── Role → Scope mapping ────────────────────────────────────────────────────

const ROLE_ICON: Record<string, any> = {
  member: User,
  coop_admin: Users,
  investor: TrendingUp,
  partner: Landmark,
  superadmin: ShieldAlert,
  bank_staff: ShieldAlert,
};

const ROLE_LABEL: Record<string, string> = {
  member: "Member Portal",
  coop_admin: "Cooperative Admin",
  investor: "Investor Console",
  partner: "Institutional Partner",
  superadmin: "Bank Superadmin",
  bank_staff: "Bank Staff",
};

const ROLE_DESC: Record<string, string> = {
  member: "Ajo thrift, HP & credit building",
  coop_admin: "Member roster & collections",
  investor: "Scheme capital & yield tracking",
  partner: "Program sponsorship, underwriting & impact",
  superadmin: "Platform audit & governance",
  bank_staff: "Operations & compliance",
};

// ─── Context definition ──────────────────────────────────────────────────────

interface ScopeContextType {
  activeScopeId: ScopeId;
  activeScope: Scope;
  setScopeId: (id: ScopeId) => void;
  scopes: Scope[];
  isLoadingScopes: boolean;
  refreshScopes: () => Promise<void>;
}

const ScopeContext = createContext<ScopeContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function ScopeProvider({
  children,
  role = "client",
}: {
  children: React.ReactNode;
  role?: "client" | "admin";
}) {
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [activeScopeId, setActiveScopeId] = useState<ScopeId>("");
  const [isLoadingScopes, setIsLoadingScopes] = useState(true);

  const buildScopesFromProfiles = (profiles: any[]): Scope[] =>
    profiles.map((p) => ({
      id: p.id,
      type: p.role as ScopeType,
      role: p.role,
      name: p.display_name || ROLE_LABEL[p.role] || p.role,
      description: p.cooperative_name || ROLE_DESC[p.role] || "",
      cooperativeName: p.cooperative_name || null,
      onboarding_done: p.onboarding_done,
      icon: ROLE_ICON[p.role] || User,
    }));

  const router = useRouter();
  const pathname = usePathname();

  const loadProfiles = useCallback(async () => {
    setIsLoadingScopes(true);
    try {
      const res = await fetch("/api/copteller/profile?all=1");
      if (!res.ok) throw new Error("not authenticated");
      const data = await res.json();
      const profiles: any[] = (data.profiles || []).filter((p: any) => p.is_active);

      if (profiles.length > 0) {
        const mapped = buildScopesFromProfiles(profiles);

        setScopes(mapped);

        // If visiting specialized role route, prioritize matching scope
        const routeScope = pathname.startsWith('/copteller/partner')
          ? mapped.find((s) => s.role === 'partner')
          : pathname.startsWith('/copteller/investor')
            ? mapped.find((s) => s.role === 'investor')
            : pathname.startsWith('/copteller/admin')
              ? mapped.find((s) => s.role === 'coop_admin')
              : pathname.startsWith('/copteller/superadmin')
                ? mapped.find((s) => s.role === 'superadmin')
                : null;

        // Restore the previously chosen profile from localStorage
        const saved = localStorage.getItem("active_copteller_profile_id");
        const savedScope = mapped.find((s) => s.id === saved);
        const resolvedId = routeScope?.id || savedScope?.id || mapped[0].id;
        setActiveScopeId(resolvedId);
        if (typeof document !== "undefined") {
          document.cookie = `copteller_profile_id=${resolvedId}; path=/; max-age=31536000; SameSite=Lax`;
        }
      } else {
        // No profiles found! Redirect to onboarding if currently trying to access any dashboard/protected route
        const isProtectedPortal = pathname.startsWith("/copteller/portal") || 
                                 pathname.startsWith("/copteller/dashboard") || 
                                 pathname.startsWith("/copteller/admin") || 
                                 pathname.startsWith("/copteller/investor") ||
                                 pathname.startsWith("/copteller/partner") ||
                                 pathname.startsWith("/copteller/superadmin");
        if (isProtectedPortal && pathname !== "/copteller/onboarding") {
          router.replace("/copteller/onboarding");
        }
      }
    } catch {
      // Unauthenticated or API error — leave scopes empty
      setScopes([]);
    } finally {
      setIsLoadingScopes(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const setScopeId = (id: ScopeId) => {
    const found = scopes.find((s) => s.id === id);
    if (!found) return;
    setActiveScopeId(id);
    localStorage.setItem("active_copteller_profile_id", id);
    localStorage.setItem("active_copteller_role", found.role || "");
    if (typeof document !== "undefined") {
      document.cookie = `copteller_profile_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
    }
  };

  const activeScope =
    scopes.find((s) => s.id === activeScopeId) ||
    scopes[0] || {
      id: "member_fallback",
      type: "member" as ScopeType,
      name: "Member Portal",
      description: "Ajo thrift, HP & credit building",
      icon: User,
    };

  return (
    <ScopeContext.Provider
      value={{
        activeScopeId,
        activeScope,
        setScopeId,
        scopes,
        isLoadingScopes,
        refreshScopes: loadProfiles,
      }}
    >
      {children}
    </ScopeContext.Provider>
  );
}

export function useScope() {
  const context = useContext(ScopeContext);
  if (!context) {
    throw new Error("useScope must be used within a ScopeProvider");
  }
  return context;
}
