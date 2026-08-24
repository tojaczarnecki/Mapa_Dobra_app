"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Download, Menu } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/szukaj", label: "Szukaj" },
  { href: "/mapa", label: "Mapa" },
  { href: "/znajdz-nocleg", label: "Nocleg" },
];

export function SiteHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-4 sm:h-16 sm:px-6 lg:h-[4.5rem] lg:px-8">
        <Link
          href="/"
          className="-m-1.5 inline-flex rounded-md p-1.5"
          aria-label="Mapa Dobra - strona główna"
        >
          <Image
            src="/brand/mapa-dobra-logo.svg"
            alt="Mapa Dobra"
            width={170}
            height={40}
            priority
            className="h-9 w-auto sm:h-11 lg:h-12"
          />
        </Link>
        <nav aria-label="Główne menu" className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="touch-target inline-flex items-center rounded-md px-4 text-[0.95rem] font-semibold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground lg:px-5"
            >
              {link.label}
            </Link>
            ))}
          <button
            type="button"
            className="touch-target inline-flex items-center gap-2 rounded-md px-3 text-sm font-semibold text-brand-strong transition hover:bg-brand-soft"
            onClick={() => window.dispatchEvent(new Event("mapa-dobra:open-install"))}
          >
            <Download aria-hidden="true" size={17} />
            Zainstaluj
          </button>
          </nav>
        <details className="site-mobile-menu md:hidden">
          <summary className="touch-target inline-flex list-none items-center gap-2 rounded-md px-3 text-sm font-semibold text-foreground">
            <Menu aria-hidden="true" size={20} />
            <span>Menu</span>
            <ChevronDown aria-hidden="true" size={16} />
          </summary>
          <nav aria-label="Menu mobilne" className="site-mobile-menu-panel">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="touch-target inline-flex items-center rounded-md px-3 text-sm font-semibold text-foreground">
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              className="touch-target inline-flex items-center gap-2 rounded-md px-3 text-sm font-semibold text-brand-strong"
              onClick={() => window.dispatchEvent(new Event("mapa-dobra:open-install"))}
            >
              <Download aria-hidden="true" size={17} />
              Zainstaluj
            </button>
          </nav>
        </details>
      </div>
    </header>
  );
}
