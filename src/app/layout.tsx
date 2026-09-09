import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { PwaClient } from "@/components/app/pwa-client";
import { SiteHeader } from "@/components/app/site-header";
import { SiteFooter } from "@/components/app/site-footer";
import { PrivacyConsent } from "@/components/app/privacy-consent";
import { PublicPageShell } from "@/components/app/public-page-shell";
import { getSiteBaseUrl } from "@/lib/site-url";
import { getSystemState } from "@/lib/system/settings";
import { isConsentChoice, PRIVACY_CONSENT_COOKIE, type ConsentChoice } from "@/lib/privacy/consent";
import "./globals.css";
import "./compact-institutional.css";
import "./editorial-guides.css";
import "./public-page-shell.css";
import "./search-list-polish.css";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "./home-pdf-fidelity.css";
import "./support-flow-fidelity.css";
import "./support-search-fidelity.css";
import "./search-results-fidelity.css";

export const metadata: Metadata = {
  metadataBase: getSiteBaseUrl(),
  title: "Dobra Mapa",
  description: "Znajdź pomoc, której potrzebujesz.",
  applicationName: "Dobra Mapa",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dobra Mapa",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/mapa-dobra-favicon.png", sizes: "734x734", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#e8efed",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const initialConsentValue = cookieStore.get(PRIVACY_CONSENT_COOKIE)?.value;
  const initialConsent: ConsentChoice | null = isConsentChoice(initialConsentValue) ? initialConsentValue : null;
  const systemState = await getSystemState();

  return (
    <html lang="pl" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `(() => { try { const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; document.documentElement.dataset.displayMode = standalone ? "standalone" : "browser"; } catch (_) {} })();` }} />
        <PrivacyConsent initialConsent={initialConsent}>
          <PublicPageShell systemState={systemState}>
            <a className="skip-link" href="#main-content">
              Przejdź do treści
            </a>
            <SiteHeader />
            <PwaClient enabled />
            <main id="main-content">{children}</main>
            <SiteFooter />
            <MobileBottomNav />
          </PublicPageShell>
        </PrivacyConsent>
      </body>
    </html>
  );
}
