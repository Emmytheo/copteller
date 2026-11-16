import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { PaletteProvider } from "@/context/palette-context";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_COPTELLER_APP_URL || "http://localhost:3001";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export const metadata: Metadata = {
    metadataBase: new URL(defaultUrl),
    title: {
        template: '%s | Copteller Cooperative OS',
        default: 'Copteller — Digital Cooperative, Thrift & Fleet Financing OS',
    },
    description: "Autonomous Cooperative Governance, Rotational Thrift (Ajo), Asset Hire-Purchase, and Institutional Liquidity Syndication Platform.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Rubik:ital,wght@0,300..900;1,300..900&family=Playfair+Display:wght@500;700&display=swap" rel="stylesheet" />
            </head>
            <body className="font-sans antialiased bg-background text-foreground">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <PaletteProvider>
                        {children}
                    </PaletteProvider>
                </ThemeProvider>
                <Toaster />
            </body>
        </html>
    );
}
