import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { PwaClient } from "@/components/app/pwa-client";
import { LaunchSplash } from "@/components/app/launch-splash";
import { SiteHeader } from "@/components/app/site-header";
import { SiteFooter } from "@/components/app/site-footer";
import { PrivacyConsent } from "@/components/app/privacy-consent";
import { getSiteBaseUrl } from "@/lib/site-url";
import { isConsentChoice, PRIVACY_CONSENT_COOKIE, type ConsentChoice } from "@/lib/privacy/consent";
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
    icon: [{ url: "/icons/mapa-dobra-favicon.png", sizes: "734x734", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B4F48",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const initialConsentValue = cookieStore.get(PRIVACY_CONSENT_COOKIE)?.value;
  const initialConsent: ConsentChoice | null = isConsentChoice(initialConsentValue) ? initialConsentValue : null;

  return (
    <html lang="pl">
      <body>
        <LaunchSplash />
        <div className="min-h-screen bg-background text-foreground">
          <PrivacyConsent initialConsent={initialConsent}>
            <a className="skip-link" href="#main-content">
              Przejdź do treści
            </a>
            <SiteHeader />
            <PwaClient enabled />
            <main id="main-content">{children}</main>
            <SiteFooter />
            <MobileBottomNav />
          </PrivacyConsent>
        </div>
      </body>
    </html>
  );
}
