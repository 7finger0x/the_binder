import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const APP_NAME = "The Binder";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Catalog sports, Pokémon, and TCG cards from a photo of a binder page.",
  manifest: "/__grok/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo-mark.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: "/__grok/icon-180.png",
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F5F5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${fraunces.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg text-ink">
        <PreviewHostBridge />
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
