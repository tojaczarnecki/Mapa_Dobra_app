"use client";

import Link from "next/link";
import { Download, MapPin } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/szukaj", label: "Szukaj" },
  { href: "/mapa", label: "Mapa" },
  { href: "/znajdz-nocleg", label: "Nocleg" },
];

export function SiteHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  const mobileVisibility = pathname === "/" ? "site-header-home" : "hidden md:block";

  return (
    <header className={`site-header sticky top-0 z-30 ${mobileVisibility}`}>
      <div className="site-header-inner">
        <Link href="/" className="md-brand-lockup" aria-label="Mapa Dobra - strona główna">
          <span className="md-brand-mark" aria-hidden="true">
            <MapPin size={30} strokeWidth={2.4} fill="currentColor" />
            <span className="md-brand-dot" />
          </span>
          <span className="md-brand-name">Mapa Dobra</span>
        </Link>
        <nav aria-label="Główne menu" className="site-header-nav hidden md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="site-header-link"
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            className="site-header-install"
            onClick={() => window.dispatchEvent(new Event("mapa-dobra:open-install"))}
          >
            <Download aria-hidden="true" size={17} />
            Zainstaluj
          </button>
        </nav>
      </div>
    </header>
  );
}
