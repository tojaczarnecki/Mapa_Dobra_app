"use client";

import Link from "next/link";
import Image from "next/image";
import { Building2, ChevronDown, ClipboardList, FileInput, HeartHandshake, LayoutDashboard, ListTodo, LogOut, MapPinned, Menu, SearchCheck, Settings, Tags, Users, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AdminPermission } from "@/generated/prisma/enums";
import { logoutAdmin } from "@/app/admin/actions";

type AdminNavProps = { role: string; displayName: string; permissions: AdminPermission[] };
type NavItem = { href: string; label: string; permission?: AdminPermission; icon: typeof LayoutDashboard; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  { label: "Operacje", items: [
    { href: "/admin/zgloszenia", label: "Zgłoszenia", permission: "MODERATE_SUBMISSIONS", icon: ClipboardList },
    { href: "/admin/zgloszenia-pomocy", label: "Zgłoszenia pomocy", permission: "VIEW_HELP_REQUESTS", icon: HeartHandshake },
    { href: "/admin/potrzeby", label: "Potrzeby", permission: "MANAGE_VOLUNTEER_NEEDS", icon: ListTodo },
  ] },
  { label: "Katalog", items: [
    { href: "/admin/miejsca", label: "Miejsca", permission: "VIEW_PLACES", icon: MapPinned },
    { href: "/admin/organizacje", label: "Organizacje", permission: "VIEW_ORGANIZATIONS", icon: Building2 },
    { href: "/admin/kategorie", label: "Kategorie", permission: "VIEW_CATEGORIES", icon: Tags },
  ] },
  { label: "Jakość danych", items: [
    { href: "/admin/weryfikacja", label: "Weryfikacja", permission: "VERIFY_PLACES", icon: SearchCheck },
    { href: "/admin/importy", label: "Importy", permission: "VIEW_IMPORTS", icon: FileInput },
  ] },
  { label: "Administracja", items: [
    { href: "/admin/uzytkownicy", label: "Użytkownicy i dostęp", permission: "MANAGE_USERS", icon: Users },
    { href: "/admin/system", label: "System", permission: "VIEW_SYSTEM_SETTINGS", icon: Settings },
  ] },
];

const roleLabels: Record<string, string> = { SUPER_ADMIN: "Superadministrator", ADMIN: "Administrator", MODERATOR: "Moderator", PLACE_MANAGER: "Pracownik placówki", VIEWER: "Tylko odczyt" };

function visibleItems(group: NavGroup, role: string, permissions: AdminPermission[]) {
  return group.items.filter((item) => permissions.includes(item.permission!) && !(role === "PLACE_MANAGER" && !["/admin/miejsca", "/admin/zgloszenia", "/admin/potrzeby"].includes(item.href)));
}

export function AdminNav({ role, displayName, permissions }: AdminNavProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isActive = (item: NavItem) => item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const visibleGroups = groups.map((group) => ({ ...group, items: visibleItems(group, role, permissions) })).filter((group) => group.items.length);
  const dashboardVisible = permissions.includes("VIEW_DASHBOARD");
  const activeGroup = visibleGroups.find((group) => group.items.some(isActive))?.label;

  useEffect(() => {
    if (mobileOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => mobileDrawerRef.current?.focus());
      const handleDrawerTab = (event: KeyboardEvent) => {
        if (event.key !== "Tab" || !mobileDrawerRef.current) return;
        const focusable = Array.from(mobileDrawerRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])"));
        if (!focusable.length) return;
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
      document.addEventListener("keydown", handleDrawerTab);
      return () => {
        document.body.style.overflow = previousOverflow;
        document.removeEventListener("keydown", handleDrawerTab);
      };
    }
    return undefined;
  }, [mobileOpen]);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenGroup(null);
        setProfileOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenGroup(null);
        setProfileOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function closeMenus() {
    setOpenGroup(null);
    setProfileOpen(false);
    setMobileOpen(false);
    requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
  }

  return (
    <nav ref={navRef} aria-label="Panel administratora" className="min-w-0">
      <div className="flex min-h-12 items-center justify-between gap-2">
        <div className="hidden min-w-0 items-center gap-1 lg:flex">
          {dashboardVisible ? <Link href="/admin" aria-current={pathname === "/admin" ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold transition ${pathname === "/admin" ? "bg-brand-soft text-brand-strong" : "hover:bg-brand-soft"}`}><LayoutDashboard aria-hidden="true" size={18} />Dashboard</Link> : null}
          {visibleGroups.map((group) => {
            const open = openGroup === group.label;
            return <div key={group.label} className="relative"><button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => { setProfileOpen(false); setOpenGroup(open ? null : group.label); }} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-bold transition ${activeGroup === group.label ? "bg-brand-soft text-brand-strong" : "hover:bg-brand-soft"}`}>{group.label}<ChevronDown aria-hidden="true" size={16} className={`transition ${open ? "rotate-180" : ""}`} /></button>{open ? <div role="menu" className="absolute left-0 top-[calc(100%+8px)] z-40 w-60 rounded-lg border border-border bg-white p-2 shadow-lg"><p className="px-3 pb-1 pt-1 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{group.label}</p>{group.items.map((item) => { const Icon = item.icon; return <Link key={item.href} role="menuitem" href={role === "PLACE_MANAGER" && item.href === "/admin/miejsca" ? "/admin" : item.href} aria-current={isActive(item) ? "page" : undefined} onClick={closeMenus} className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-bold transition ${isActive(item) ? "bg-brand-soft text-brand-strong" : "hover:bg-brand-soft"}`}><Icon aria-hidden="true" size={18} />{role === "PLACE_MANAGER" && item.href === "/admin/miejsca" ? "Moje placówki" : item.label}</Link>; })}</div> : null}</div>;
          })}
        </div>
        <button ref={mobileMenuButtonRef} type="button" aria-label="Otwórz menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen((current) => !current)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border hover:bg-brand-soft lg:hidden"><Menu aria-hidden="true" size={20} /></button>
        <div className="relative ml-auto hidden lg:block"><button type="button" aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => { setOpenGroup(null); setProfileOpen((current) => !current); }} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg px-2 text-left hover:bg-brand-soft"><span className="min-w-0"><span className="block truncate text-sm font-bold">{displayName}</span><span className="hidden text-xs text-muted-foreground sm:block">{roleLabels[role] ?? role}</span></span><ChevronDown aria-hidden="true" size={16} className={profileOpen ? "rotate-180" : ""} /></button>{profileOpen ? <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-40 w-60 rounded-lg border border-border bg-white p-2 shadow-lg"><div className="border-b border-border px-3 pb-3 pt-2"><p className="text-sm font-bold">{displayName}</p><p className="mt-1 text-xs text-muted-foreground">{roleLabels[role] ?? role}</p></div><form action={logoutAdmin}><button type="submit" role="menuitem" className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-surface-muted hover:text-foreground"><LogOut aria-hidden="true" size={18} />Wyloguj</button></form></div> : null}</div>
      </div>
      {mobileOpen ? <div className="fixed inset-0 z-50 bg-foreground/35 lg:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMenus(); }}><div ref={mobileDrawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Menu panelu administratora" className="ml-auto flex h-[100dvh] w-[min(360px,calc(100vw-16px))] min-w-0 flex-col overflow-y-auto border-l border-border bg-white p-4 shadow-xl"><div className="flex min-h-12 items-center justify-between gap-3 border-b border-border pb-3"><Link href="/admin" onClick={closeMenus} aria-label="Dobra Mapa - panel administratora" className="min-w-0"><Image src="/brand/dobra-mapa-logo-header.svg" alt="Dobra Mapa" width={604} height={120} className="h-8 w-auto max-w-full" /></Link><button type="button" aria-label="Zamknij menu" onClick={closeMenus} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-brand-soft"><X aria-hidden="true" size={20} /></button></div><div className="border-b border-border py-4"><p className="text-sm font-bold">{displayName}</p><p className="mt-1 text-xs text-muted-foreground">{roleLabels[role] ?? role}</p></div><div className="mt-3 space-y-1">{dashboardVisible ? <Link href="/admin" onClick={closeMenus} aria-current={pathname === "/admin" ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-bold ${pathname === "/admin" ? "bg-brand-soft text-brand-strong" : "hover:bg-brand-soft"}`}><LayoutDashboard aria-hidden="true" size={18} />Dashboard</Link> : null}{visibleGroups.map((group) => { const open = openGroup === group.label || activeGroup === group.label; return <div key={group.label} className="border-t border-border first:border-t-0"><button type="button" aria-expanded={open} onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)} className={`flex min-h-11 w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm font-extrabold ${activeGroup === group.label ? "text-brand-strong" : ""}`}>{group.label}<ChevronDown aria-hidden="true" size={17} className={`shrink-0 ${open ? "rotate-180" : ""}`} /></button>{open ? <div role="menu" className="pb-1">{group.items.map((item) => { const Icon = item.icon; return <Link key={item.href} role="menuitem" href={role === "PLACE_MANAGER" && item.href === "/admin/miejsca" ? "/admin" : item.href} onClick={closeMenus} aria-current={isActive(item) ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 pl-6 text-sm font-bold ${isActive(item) ? "bg-brand-soft text-brand-strong" : "hover:bg-brand-soft"}`}><Icon aria-hidden="true" size={18} />{role === "PLACE_MANAGER" && item.href === "/admin/miejsca" ? "Moje placówki" : item.label}</Link>; })}</div> : null}</div>; })}</div><div className="mt-auto border-t border-border pt-3"><form action={logoutAdmin}><button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-surface-muted hover:text-foreground"><LogOut aria-hidden="true" size={18} />Wyloguj</button></form></div></div></div> : null}
    </nav>
  );
}
