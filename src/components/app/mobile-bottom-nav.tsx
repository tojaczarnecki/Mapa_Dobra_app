"use client";

import Link from "next/link";
import { BookOpen, HeartHandshake, Home, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useIsStandalonePwa } from "@/components/app/use-is-standalone-pwa";

const primaryItems = [
  { href: "/", label: "Start", icon: Home },
  { href: "/szukam", label: "Szukam", icon: Search },
  { href: "/pomagam", label: "Pomagam", icon: HeartHandshake },
  { href: "/jak-pomagac", label: "Jak pomagać", icon: BookOpen },
];

function itemIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/szukam") {
    return pathname === "/szukam" || pathname === "/szukaj" || pathname.startsWith("/szukaj/");
  }
  if (href === "/pomagam") return pathname === "/pomagam" || pathname === "/uruchom-pomoc" || pathname.startsWith("/uruchom-pomoc/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const standalone = useIsStandalonePwa();

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav aria-label="Dolna nawigacja" className={`mobile-bottom-nav ${standalone ? "mobile-bottom-nav-pwa" : ""} ${pathname === "/mapa" ? "map-mode-nav" : ""}`}>
      <div className="mobile-bottom-nav-inner">
          {primaryItems.map((item) => {
            const active = itemIsActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-bottom-nav-item ${active ? "mobile-bottom-nav-item-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <item.icon aria-hidden="true" size={22} strokeWidth={1.9} />
                {item.label}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
