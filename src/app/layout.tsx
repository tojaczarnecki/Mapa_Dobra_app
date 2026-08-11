import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { SiteHeader } from "@/components/app/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mapa Dobra",
  description: "Znajdź pomoc, której potrzebujesz.",
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
          <main id="main-content">{children}</main>
          <MobileBottomNav />
        </div>
      </body>
    </html>
  );
}
