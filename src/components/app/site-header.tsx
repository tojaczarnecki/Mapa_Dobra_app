"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { resolveJourney } from "@/lib/journeys";
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
  const searchParams = useSearchParams();
  const standalone = useIsStandalonePwa();
  const journey = resolveJourney(pathname, searchParams);
  const journeyClass = journey === "help"
    ? "site-header-journey-help"
    : journey === "guide" || journey === "guided"
      ? "site-header-journey-guide"
      : journey === "search" || journey === "now"
        ? "site-header-journey-search"
        : "site-header-journey-neutral";

  if (pathname.startsWith("/admin") || pathname === "/") return null;

  return (
      <header className={`site-header ${journeyClass} z-30 ${standalone ? "site-header-standalone" : ""} ${pathname === "/" ? "site-header-home" : ""}`}>
      <div className="site-header-inner">
        <Link
          href="/"
          className="site-header-logo-link"
          aria-label="Dobra Mapa - strona główna"
        >
          <Image
            src="/brand/dobra-mapa-logo-header.svg"
            alt="Dobra Mapa"
            width={1926}
            height={378}
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
          </div>
        </details>
      </div>
    </header>
  );
}
