import type { MetadataRoute } from "next"

const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.NEXT_PUBLIC_COPTELLER_APP_URL || "https://copteller.vercel.app"

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: [
                    "/copteller",
                    "/copteller/features",
                    "/copteller/products",
                    "/copteller/investment",
                    "/copteller/governance",
                    "/copteller/mobility",
                    "/copteller/simulator",
                    "/copteller/onboarding",
                ],
                disallow: [
                    "/api/",
                    "/admin/",
                    "/copteller/admin/",
                    "/copteller/partner/",
                    "/copteller/superadmin/",
                    "/copteller/dashboard/",
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
