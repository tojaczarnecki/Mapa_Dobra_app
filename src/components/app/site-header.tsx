"use client";

import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const links = [
  { href: "/szukaj", label: "Szukaj" },
  { href: "/mapa", label: "Mapa" },
  { href: "/znajdz-nocleg", label: "Nocleg" },
  { href: "/encyklopedia", label: "Encyklopedia" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollRef = useRef(0);
  const frameRef = useRef<number | undefined>(undefined);
  const [hidden, setHidden] = useState(false);
  const [keyboardActive, setKeyboardActive] = useState(false);

  useEffect(() => {
    lastScrollRef.current = Math.max(window.scrollY, 0);
    const frame = window.requestAnimationFrame(() => setHidden(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      if (frameRef.current !== undefined) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = undefined;
        if (!window.matchMedia("(max-width: 767px)").matches) { setHidden(false); return; }
        if (document.body.dataset.mobileOverlayOpen === "true") return;
        const current = Math.max(window.scrollY, 0);
        const previous = lastScrollRef.current;
        const delta = current - previous;
        lastScrollRef.current = current;
        if (current <= 20) return setHidden(false);
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active?.getAttribute("contenteditable") === "true") return;
        if (Math.abs(delta) < 8) return;
        if (delta < 0) setHidden(false);
        else if (current > 100) setHidden(true);
      });
    };
    const showForFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && headerRef.current?.contains(event.target)) setHidden(false);
      if (window.matchMedia("(max-width: 767px)").matches && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) setKeyboardActive(true);
    };
    const clearKeyboardMode = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof HTMLInputElement || event.relatedTarget instanceof HTMLTextAreaElement)) setKeyboardActive(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", showForFocus);
    document.addEventListener("focusout", clearKeyboardMode);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", showForFocus);
      document.removeEventListener("focusout", clearKeyboardMode);
      if (frameRef.current !== undefined) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header ref={headerRef} className={`site-header sticky top-0 ${pathname === "/" ? "site-header-home" : ""} ${hidden ? "site-header-hidden" : ""} ${keyboardActive ? "site-header-keyboard-compact" : ""}`}>
      <div className="site-header-inner">
        <Link
          href="/"
          className="site-header-logo-link"
          aria-label="Mapa Dobra - strona główna"
        >
          <Image
            src="/brand/mapa-dobra-logo.svg"
            alt="Mapa Dobra"
            width={170}
            height={40}
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
