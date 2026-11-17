import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Public routes in Standalone Copteller — no auth required
const COPTELLER_PUBLIC_PATTERNS = [
    "/",
    "/copteller/auth",
    "/copteller/forgot-password",
    "/copteller/select-profile",
    "/copteller/onboarding",
    "/copteller/features",
    "/copteller/governance",
    "/copteller/investment",
    "/copteller/mobility",
    "/copteller/products",
    "/copteller/simulator",
    "/copteller/claim",
    "/robots.txt",
    "/sitemap.xml",
    "/api/health",
    "/api/copteller/auth",
    "/api/copteller/cooperatives",
    "/api/copteller/products",
    "/api/copteller/campaigns/claim",
    "/api/copteller/sector-products",
    "/api/account-lookup",
    "/api/mock",
];

function isPayloadAdminRoute(pathname: string): boolean {
    return pathname.startsWith("/admin");
}

function isPublicRoute(pathname: string): boolean {
    const cleanPath = pathname.replace(/\/$/, "") || "/";
    if (cleanPath === "/" || cleanPath === "/copteller") return true;
    return COPTELLER_PUBLIC_PATTERNS.some(
        (p) => p !== "/" && (cleanPath === p || cleanPath.startsWith(p + "/"))
    );
}

// Short-lived in-memory cache for Copteller auth checks
const coptellerAuthCache = new Map<string, { user: any; expiresAt: number }>();
const coptellerInFlightAuth = new Map<string, Promise<any>>();

async function getVerifiedCoptellerUser(request: NextRequest): Promise<any> {
    // Only allow header-based identity override if accompanied by server ADMIN_SECRET
    const internalSecret = request.headers.get("x-copteller-internal-secret");
    const devHeaderUserId = request.headers.get("x-copteller-user-id");
    if (
        devHeaderUserId &&
        internalSecret &&
        process.env.ADMIN_SECRET &&
        internalSecret === process.env.ADMIN_SECRET
    ) {
        return {
            id: devHeaderUserId,
            email: request.headers.get("x-copteller-user-email") || "partner@copteller.ng",
            user_metadata: {
                full_name: request.headers.get("x-copteller-user-name") || "Institutional Partner Desk",
                role: request.headers.get("x-copteller-user-role") || "partner",
            },
        };
    }

    const authCookies = request.cookies
        .getAll()
        .filter((c) => c.name.includes("-auth-token") || c.name.startsWith("sb-"))
        .map((c) => `${c.name}=${c.value}`)
        .join(";");

    if (!authCookies) return null;

    const now = Date.now();
    const cached = coptellerAuthCache.get(authCookies);
    if (cached && cached.expiresAt > now) {
        return cached.user;
    }

    if (coptellerInFlightAuth.has(authCookies)) {
        return await coptellerInFlightAuth.get(authCookies);
    }

    const authPromise = (async () => {
        try {
            const supabaseUrl =
                process.env.NEXT_PUBLIC_COPTELLER_SUPABASE_URL ||
                process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseAnonKey =
                process.env.NEXT_PUBLIC_COPTELLER_SUPABASE_ANON_KEY ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

            const coptellerSupabase = createServerClient(supabaseUrl, supabaseAnonKey, {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll() {},
                },
            });
            const {
                data: { user },
            } = await coptellerSupabase.auth.getUser();
            if (user) {
                coptellerAuthCache.set(authCookies, { user, expiresAt: Date.now() + 30000 });
            }
            return user || null;
        } catch (err: any) {
            console.warn("[copteller/proxy.ts] auth check failed:", err.message);
            return null;
        } finally {
            coptellerInFlightAuth.delete(authCookies);
        }
    })();

    coptellerInFlightAuth.set(authCookies, authPromise);
    return await authPromise;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-url", request.nextUrl.href);
    requestHeaders.set("x-pathname", pathname);

    // Strip any unverified client-supplied identity headers to prevent spoofing
    const internalSecret = request.headers.get("x-copteller-internal-secret");
    if (!internalSecret || internalSecret !== process.env.ADMIN_SECRET) {
        requestHeaders.delete("x-copteller-user-id");
        requestHeaders.delete("x-copteller-user-email");
        requestHeaders.delete("x-copteller-user-name");
        requestHeaders.delete("x-copteller-user-role");
    }

    // Always allow static assets
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/opengraph") ||
        pathname.startsWith("/twitter") ||
        pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|css|js|woff2?)$/)
    ) {
        return NextResponse.next();
    }

    // Payload admin routes — Payload handles its own auth
    if (isPayloadAdminRoute(pathname)) {
        return NextResponse.next();
    }

    // Public Copteller routes
    if (isPublicRoute(pathname)) {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Protected routes require verified Copteller Supabase session
    const coptellerUser = await getVerifiedCoptellerUser(request);

    if (!coptellerUser) {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json(
                { error: "Unauthorized. Please sign in to Copteller." },
                { status: 401 }
            );
        }
        const url = request.nextUrl.clone();
        url.pathname = "/copteller/auth";
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
    }

    // Pass selected copteller profile ID from cookie or header
    const selectedProfileId =
        request.cookies.get("copteller_profile_id")?.value ||
        request.cookies.get("copteller-profile-id")?.value ||
        request.headers.get("x-copteller-profile-id");
    if (selectedProfileId) {
        requestHeaders.set("x-copteller-profile-id", selectedProfileId);
    }
    requestHeaders.set("x-copteller-user-id", coptellerUser.id);
    requestHeaders.set("x-copteller-user-email", coptellerUser.email || "");
    requestHeaders.set("x-copteller-user-name", coptellerUser.user_metadata?.full_name || "");
    requestHeaders.set("x-copteller-user-role", coptellerUser.user_metadata?.role || "member");

    return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};

