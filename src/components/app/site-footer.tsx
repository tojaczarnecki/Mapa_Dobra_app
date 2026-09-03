"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUp, Download } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { isStandalonePwa, useIsStandalonePwa } from "@/components/app/use-is-standalone-pwa";

const findLinks = [
  { href: "/szukaj", label: "Szukaj pomocy" },
  { href: "/mapa", label: "Mapa" },
  { href: "/znajdz-nocleg", label: "Nocleg" },
  { href: "/ulubione", label: "Ulubione" },
  { href: "/uruchom-pomoc", label: "Uruchom pomoc" },
];

const contributeLinks = [
  { href: "/zglos-miejsce", label: "Zgłoś nowe miejsce" },
  { href: "/zglos-zmiane", label: "Zgłoś zmianę" },
];

const informationLinks = [
  { href: "/polityka-prywatnosci", label: "Polityka prywatności" },
  { href: "/regulamin", label: "Regulamin" },
  { href: "/dostepnosc", label: "Dostępność" },
  { href: "/cookies", label: "Cookies" },
  { href: "/o-projekcie", label: "O projekcie" },
  { href: "/kontakt", label: "Kontakt" },
];

const footerLinks = [...findLinks, ...contributeLinks, ...informationLinks];

const socialProfiles = [
  { platform: "Facebook", href: null },
  { platform: "Instagram", href: null },
  { platform: "LinkedIn", href: null },
  { platform: "YouTube", href: null },
] as const;

function SocialIcon({ platform }: { platform: (typeof socialProfiles)[number]["platform"] }) {
  if (platform === "Facebook") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M13.5 21v-8h2.75l.4-3h-3.15V8.08c0-.87.24-1.46 1.5-1.46h1.72V3.94c-.3-.04-1.34-.14-2.55-.14-2.52 0-4.25 1.54-4.25 4.37V10H7.1v3h2.82v8h3.58Z" /></svg>;
  }

  if (platform === "Instagram") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>;
  }

  if (platform === "LinkedIn") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M5.15 7.2a2.05 2.05 0 1 0 0-4.1 2.05 2.05 0 0 0 0 4.1ZM3.35 20.9h3.6V9.15h-3.6V20.9ZM9.2 9.15h3.45v1.6h.05c.48-.9 1.66-1.85 3.42-1.85 3.66 0 4.33 2.4 4.33 5.53v6.47h-3.6v-5.74c0-1.37-.03-3.13-1.9-3.13-1.9 0-2.2 1.49-2.2 3.03v5.84H9.2V9.15Z" /></svg>;
  }

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.1a2.8 2.8 0 0 0-1.97-1.98C17.9 4.65 12 4.65 12 4.65s-5.9 0-7.63.47A2.8 2.8 0 0 0 2.4 7.1C1.93 8.84 1.93 12 1.93 12s0 3.16.47 4.9a2.8 2.8 0 0 0 1.97 1.98c1.73.47 7.63.47 7.63.47s5.9 0 7.63-.47a2.8 2.8 0 0 0 1.97-1.98c.47-1.74.47-4.9.47-4.9s0-3.16-.47-4.9ZM10.2 15.15v-6.3l5.2 3.15-5.2 3.15Z" /></svg>;
}

function getInstallAvailability() {
  return typeof window !== "undefined" && !isStandalonePwa();
}

function subscribeToInstallState(onChange: () => void) {
  const onInstalled = () => {
    onChange();
  };
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export function SiteFooter() {
  const pathname = usePathname();
  const standalone = useIsStandalonePwa();
  const installAvailable = useSyncExternalStore(subscribeToInstallState, getInstallAvailability, () => false) && !standalone;

  if (pathname.startsWith("/admin")) return null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const journeyClass = pathname === "/jak-pomagac"
    ? "site-footer-journey-guide-hub"
    : pathname.startsWith("/jak-pomagac/")
      ? "site-footer-journey-guide-article"
      : pathname.startsWith("/pomagam") || pathname.startsWith("/uruchom-pomoc")
        ? "site-footer-journey-help"
        : pathname.startsWith("/szukam") || pathname.startsWith("/szukaj") || pathname.startsWith("/mapa") || pathname.startsWith("/lodz/")
          ? "site-footer-journey-search"
          : "site-footer-journey-neutral";

  return (
    <footer className={`site-footer ${journeyClass}`}>
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" className="site-footer-logo-link" aria-label="Dobra Mapa - strona główna">
            <Image src="/brand/dobra-mapa-logo-footer.svg" alt="Dobra Mapa" width={516} height={335} className="site-footer-logo-asset" />
          </Link>
          <p className="site-footer-brand-statement">Pomoc istnieje. Pomagamy ją znaleźć.</p>
        </div>
      </div>
      <div className="site-footer-links">
        <nav aria-label="Nawigacja stopki" className="site-footer-nav">
          {footerLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          <button type="button" className="site-footer-group-link" onClick={() => window.dispatchEvent(new Event("mapa-dobra:open-cookie-settings"))}>Ustawienia cookies</button>
        </nav>
      </div>
      <div className="site-footer-install-row">
        <section className="site-footer-install-module" aria-labelledby="site-footer-install-title">
          <div className="site-footer-install-heading">
            <div>
              <h2 id="site-footer-install-title">Zainstaluj Dobrą Mapę</h2>
              <p>Miej pomoc zawsze pod ręką. Bez opłat.</p>
            </div>
          </div>
          {installAvailable ? <button type="button" className="site-footer-install" onClick={() => window.dispatchEvent(new Event("mapa-dobra:open-install"))}>
            <Download aria-hidden="true" size={17} />
            Zainstaluj
          </button> : null}
        </section>
      </div>
      <div className="site-footer-bottom">
        <div className="site-footer-bottom-inner">
          <span>© 2026 Dobra Mapa</span>
          <div className="site-footer-social" aria-label="Media społecznościowe">
            {socialProfiles.map(({ platform, href }) => {
              const label = `Dobra Mapa na ${platform}`;
              const content = <SocialIcon platform={platform} />;
              return href ? <a key={platform} href={href} className="site-footer-social-item" aria-label={label} title={label} target="_blank" rel="noopener noreferrer">{content}</a> : <span key={platform} className="site-footer-social-item site-footer-social-item-disabled" role="img" aria-label={label} title={label}>{content}</span>;
            })}
          </div>
          <button type="button" className="site-footer-top" onClick={scrollToTop}>
            <ArrowUp aria-hidden="true" size={17} />
            Do góry
          </button>
        </div>
      </div>
    </footer>
  );
}
