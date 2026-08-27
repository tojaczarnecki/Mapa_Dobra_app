"use client";

import Link from "next/link";
import { BedDouble, Bell, BookOpen, Bookmark, ChevronRight, Flag, Home, LifeBuoy, Map, MapPinPlus, Menu, Search, Smartphone, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const primaryItems = [
  { href: "/", label: "Start", icon: Home },
  { href: "/szukaj", label: "Pomoc", icon: Search },
  { href: "/mapa", label: "Mapa", icon: Map },
];

const moreItems = [
  { href: "/znajdz-nocleg", label: "Nocleg na dziś", icon: BedDouble, group: "quick", quickPath: true },
  { href: "/uruchom-pomoc", label: "Uruchom pomoc", icon: LifeBuoy, group: "quick", prominent: true },
  { href: "/zapisane", label: "Zapisane miejsca", icon: Bookmark, group: "personal" },
  { href: "/ustawienia/powiadomienia", label: "Powiadomienia", icon: Bell, group: "personal" },
  { href: "/encyklopedia", label: "Encyklopedia Dobra", icon: BookOpen, group: "learn" },
  { href: "/zglos-miejsce", label: "Zgłoś nowe miejsce", icon: MapPinPlus, group: "engage" },
  { href: "/zglos-zmiane", label: "Zgłoś zmianę", icon: Flag, group: "engage" },
];

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function getInstallAvailability() {
  return typeof window !== "undefined" && !isStandalone();
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

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const installAvailable = useSyncExternalStore(subscribeToInstallState, getInstallAvailability, () => false);

  useEffect(() => {
    document.body.dataset.mobileOverlayOpen = moreOpen ? "true" : "false";
    return () => { delete document.body.dataset.mobileOverlayOpen; };
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    const moreButton = moreButtonRef.current;
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      moreButton?.focus();
    };
  }, [moreOpen]);

  if (pathname.startsWith("/admin")) return null;

  const closeMore = () => setMoreOpen(false);
  const isMoreItemActive = (href: string) => href === "/#kategorie" ? pathname === "/" : pathname === href;

  return (
    <>
      <nav aria-label="Dolna nawigacja" className="mobile-bottom-nav md:hidden">
        <div className="mobile-bottom-nav-inner">
          {primaryItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-bottom-nav-item ${active ? "mobile-bottom-nav-item-active !text-[#18364d]" : "!text-[#5f6973]"}`}
                aria-current={active ? "page" : undefined}
              >
                <item.icon aria-hidden="true" size={23} strokeWidth={1.9} />
                {item.label}
              </Link>
            );
          })}
          <button
            ref={moreButtonRef}
            type="button"
            className={`mobile-bottom-nav-item ${moreOpen ? "mobile-bottom-nav-item-active !text-[#18364d]" : "!text-[#5f6973]"}`}
            aria-expanded={moreOpen}
            aria-controls="mobile-more-sheet"
            onClick={() => setMoreOpen((current) => !current)}
          >
            <Menu aria-hidden="true" size={23} strokeWidth={1.9} />
            Więcej
          </button>
        </div>
      </nav>

      {moreOpen ? <div className="mobile-more-layer">
        <button type="button" className="mobile-more-backdrop" aria-label="Zamknij menu Więcej" onClick={closeMore} />
        <div
          id="mobile-more-sheet"
          ref={sheetRef}
          className="mobile-more-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-more-title"
          tabIndex={-1}
        >
          <div className="mobile-more-handle" aria-hidden="true" />
          <div className="mobile-more-heading">
            <h2 id="mobile-more-title">Więcej</h2>
            <button type="button" className="mobile-more-close" onClick={closeMore} aria-label="Zamknij menu Więcej">
              <X aria-hidden="true" size={21} />
            </button>
          </div>
          <nav aria-label="Więcej opcji" className="mobile-more-links">
            <section className="mobile-more-group mobile-more-group-primary" aria-labelledby="mobile-more-quick-title">
              <h3 id="mobile-more-quick-title">Szybko</h3>
              {moreItems.filter((item) => item.group === "quick").map((item) => (
                <Link key={item.href} href={item.href} onClick={closeMore} className={`${item.quickPath ? "mobile-more-link-quick " : ""}${item.prominent ? "mobile-more-link-prominent " : ""}${isMoreItemActive(item.href) ? "mobile-more-link-active" : ""}`} aria-current={isMoreItemActive(item.href) ? "page" : undefined}>
                  <item.icon aria-hidden="true" size={21} strokeWidth={1.8} />
                  <span>{item.label}</span>
                  <ChevronRight aria-hidden="true" size={19} />
                </Link>
              ))}
            </section>
            <section className="mobile-more-group" aria-labelledby="mobile-more-personal-title">
              <h3 id="mobile-more-personal-title">Dla mnie</h3>
              {moreItems.filter((item) => item.group === "personal").map((item) => (
                <Link key={item.href} href={item.href} onClick={closeMore} className={`${item.quickPath ? "mobile-more-link-quick " : ""}${item.prominent ? "mobile-more-link-prominent " : ""}${isMoreItemActive(item.href) ? "mobile-more-link-active" : ""}`} aria-current={isMoreItemActive(item.href) ? "page" : undefined}>
                  <item.icon aria-hidden="true" size={21} strokeWidth={1.8} />
                  <span>{item.label}</span>
                  <ChevronRight aria-hidden="true" size={19} />
                </Link>
              ))}
            </section>
            <section className="mobile-more-group" aria-labelledby="mobile-more-learn-title">
              <h3 id="mobile-more-learn-title">Dowiedz się</h3>
              {moreItems.filter((item) => item.group === "learn").map((item) => (
                <Link key={item.href} href={item.href} onClick={closeMore} className={isMoreItemActive(item.href) ? "mobile-more-link-active" : ""} aria-current={isMoreItemActive(item.href) ? "page" : undefined}>
                  <item.icon aria-hidden="true" size={20} strokeWidth={1.8} /><span>{item.label}</span><ChevronRight aria-hidden="true" size={18} />
                </Link>
              ))}
            </section>
            <section className="mobile-more-group mobile-more-group-engage" aria-labelledby="mobile-more-engage-title">
              <h3 id="mobile-more-engage-title">Zaangażuj się</h3>
              {moreItems.filter((item) => item.group === "engage").map((item) => (
                <Link key={item.href} href={item.href} onClick={closeMore} className={isMoreItemActive(item.href) ? "mobile-more-link-active" : ""} aria-current={isMoreItemActive(item.href) ? "page" : undefined}>
                  <item.icon aria-hidden="true" size={20} strokeWidth={1.8} />
                  <span>{item.label}</span>
                  <ChevronRight aria-hidden="true" size={18} />
                </Link>
              ))}
            </section>
          </nav>
          {installAvailable ? <button type="button" className="mobile-more-install" onClick={() => { closeMore(); window.dispatchEvent(new Event("mapa-dobra:open-install")); }}>
            <Smartphone aria-hidden="true" size={20} />
            <span>Zainstaluj Mapę Dobra — bezpłatnie</span>
            <ChevronRight aria-hidden="true" size={19} />
          </button> : null}
        </div>
      </div> : null}
    </>
  );
}
