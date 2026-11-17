import type { MetadataRoute } from "next"

const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.NEXT_PUBLIC_COPTELLER_APP_URL || "https://copteller.vercel.app"

export default function sitemap(): MetadataRoute.Sitemap {
    const publicRoutes = [
        "/copteller",
        "/copteller/features",
        "/copteller/products",
        "/copteller/investment",
        "/copteller/governance",
        "/copteller/mobility",
        "/copteller/simulator",
        "/copteller/onboarding",
        "/copteller/onboarding/member",
        "/copteller/onboarding/admin",
        "/copteller/onboarding/partner",
    ]

    return publicRoutes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "/copteller" ? "weekly" : "monthly",
        priority: route === "/copteller" ? 1 : 0.8,
    }))
}
