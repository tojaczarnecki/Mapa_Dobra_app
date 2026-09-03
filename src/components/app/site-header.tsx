"use client";

import Image from "next/image";
import Link from "next/link";
import { Download, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useIsStandalonePwa } from "@/components/app/use-is-standalone-pwa";

const links = [
  { href: "/szukam", label: "Szukam wsparcia" },
  { href: "/pomagam", label: "Chcę komuś pomóc" },
  { href: "/jak-pomagac", label: "Jak pomagać" },
  { href: "/ulubione", label: "Ulubione" },
];

function isRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const standalone = useIsStandalonePwa();
  const journeyClass = pathname.startsWith("/pomagam") || pathname.startsWith("/uruchom-pomoc")
    ? "site-header-journey-help"
    : pathname.startsWith("/jak-pomagac")
      ? "site-header-journey-guide"
      : pathname.startsWith("/szukam") || pathname.startsWith("/szukaj") || pathname.startsWith("/mapa")
        ? "site-header-journey-search"
        : "site-header-journey-neutral";

  if (pathname.startsWith("/admin")) return null;

  return (
    <header className={`site-header ${journeyClass} sticky top-0 z-30 ${standalone ? "site-header-standalone" : ""} ${pathname === "/" ? "site-header-home" : ""}`}>
      <div className="site-header-inner">
        <Link
          href="/"
          className="site-header-logo-link"
          aria-label="Dobra Mapa - strona główna"
        >
          <Image
            src="/brand/dobra-mapa-logo-header.svg"
            alt="Dobra Mapa"
            width={606}
            height={120}
            priority
            className="site-header-logo-asset"
          />
        </Link>
        <nav aria-label="Główne menu" className="site-header-nav site-header-desktop-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="site-header-link"
              aria-current={
                (link.href === "/szukam" && (isRoute(pathname, "/szukam") || isRoute(pathname, "/szukaj"))) ||
                (link.href === "/pomagam" && (isRoute(pathname, "/pomagam") || isRoute(pathname, "/uruchom-pomoc"))) ||
                (link.href === "/jak-pomagac" && isRoute(pathname, "/jak-pomagac")) ||
                (link.href === "/ulubione" && isRoute(pathname, "/ulubione"))
                  ? "page"
                  : undefined
              }
            >
              {link.label}
            </Link>
          ))}
          {!standalone ? <button
              type="button"
              className="site-header-install"
              onClick={() => window.dispatchEvent(new Event("mapa-dobra:open-install"))}
            >
              <Download aria-hidden="true" size={17} />
              Zainstaluj
            </button> : null}
        </nav>
        <details className="site-header-mobile-menu">
          <summary className="site-header-mobile-menu-toggle">
            <Menu aria-hidden="true" size={20} />
            <span>Menu</span>
          </summary>
          <div className="site-header-mobile-menu-panel">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="site-header-mobile-menu-link"
                aria-current={
                  ((link.href === "/szukam" && (isRoute(pathname, "/szukam") || isRoute(pathname, "/szukaj"))) ||
                    (link.href === "/pomagam" && (isRoute(pathname, "/pomagam") || isRoute(pathname, "/uruchom-pomoc"))) ||
                    (link.href === "/jak-pomagac" && isRoute(pathname, "/jak-pomagac")) ||
                    (link.href === "/ulubione" && isRoute(pathname, "/ulubione"))) ? "page" : undefined
                }
              >
                {link.label}
              </Link>
            ))}
            {!standalone ? <button type="button" className="site-header-mobile-menu-link" onClick={() => window.dispatchEvent(new Event("mapa-dobra:open-install"))}>
              <Download aria-hidden="true" size={17} />
              Zainstaluj
            </button> : null}
          </div>
        </details>
      </div>
    </header>
  );
}
