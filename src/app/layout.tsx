import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { PwaClient } from "@/components/app/pwa-client";
import { SiteHeader } from "@/components/app/site-header";
import { SiteFooter } from "@/components/app/site-footer";
import { PrivacyConsent } from "@/components/app/privacy-consent";
import { getSiteBaseUrl } from "@/lib/site-url";
import "./globals.css";
import "./compact-institutional.css";

export const metadata: Metadata = {
  metadataBase: getSiteBaseUrl(),
  title: "Mapa Dobra",
  description: "Znajdź pomoc, której potrzebujesz.",
  applicationName: "Mapa Dobra",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mapa Dobra",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icon.png", sizes: "256x256", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#13ad87",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pl">
      <body>
        <div className="min-h-screen bg-background text-foreground">
          <a className="skip-link" href="#main-content">
            Przejdź do treści
          </a>
          <SiteHeader />
          <PwaClient enabled />
          <main id="main-content">{children}</main>
          <SiteFooter />
          <MobileBottomNav />
          <PrivacyConsent />
        </div>
      </body>
    </html>
  );
}
