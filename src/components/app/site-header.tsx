"use client";

import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/szukaj", label: "Szukaj" },
  { href: "/mapa", label: "Mapa" },
  { href: "/znajdz-nocleg", label: "Nocleg" },
  { href: "/ulubione", label: "Ulubione" },
];

export function SiteHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <header className={`site-header hidden sticky top-0 z-30 md:block ${pathname === "/" ? "site-header-home" : ""}`}>
      <div className="site-header-inner">
        <Link
          href="/"
          className="site-header-logo-link"
          aria-label="Mapa Dobra - strona główna"
        >
          <Image
            src="/brand/mapa-dobra-logo-header-new.svg"
            alt="Mapa Dobra"
            width={604}
            height={120}
            priority
            className="site-header-logo"
          />
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
