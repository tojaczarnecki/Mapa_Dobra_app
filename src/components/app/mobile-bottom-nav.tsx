"use client";

import Link from "next/link";
import { Bookmark, Grid2X2, Map, Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";

const primaryItems = [
  { href: "/szukaj", label: "Szukaj", icon: Search },
  { href: "/mapa", label: "Mapa", icon: Map },
  { href: "/#kategorie", label: "Kategorie", icon: Grid2X2 },
];

const secondaryItems = [
  { label: "Zapisane", icon: Bookmark },
  { label: "Więcej", icon: Menu },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav
      aria-label="Dolna nawigacja"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgb(17_24_39_/_8%)] md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {primaryItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="touch-target flex flex-col items-center justify-center gap-1 rounded-md px-2 text-center text-[0.72rem] font-semibold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
          >
            <item.icon aria-hidden="true" size={18} strokeWidth={2} />
            {item.label}
          </Link>
        ))}
        {secondaryItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className="touch-target flex flex-col items-center justify-center gap-1 rounded-md px-2 text-[0.72rem] font-semibold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
          >
            <item.icon aria-hidden="true" size={18} strokeWidth={2} />
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
