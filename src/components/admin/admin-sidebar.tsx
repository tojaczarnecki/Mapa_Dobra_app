"use client";

import { BookOpen, Building2, ClipboardList, FileInput, HeartHandshake, LayoutDashboard, LogOut, MapPinned, PanelLeftClose, PanelLeftOpen, SearchCheck, Tags, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import type { AdminPermission } from "@/generated/prisma/enums";

type Props = { role: string; permissions: AdminPermission[] };
type Item = { href: string; label: string; icon: typeof LayoutDashboard; permission: AdminPermission; hideForPlaceManager?: boolean };

const groups: Array<{ label: string; items: Item[] }> = [
  { label: "Praca", items: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "VIEW_DASHBOARD" },
    { href: "/admin/miejsca", label: "Miejsca", icon: MapPinned, permission: "VIEW_PLACES" },
    { href: "/admin/zgloszenia", label: "Zgłoszenia", icon: ClipboardList, permission: "MODERATE_SUBMISSIONS" },
    { href: "/admin/weryfikacja", label: "Weryfikacja", icon: SearchCheck, permission: "VERIFY_PLACES" },
    { href: "/admin/zgloszenia-pomocy", label: "Uruchom pomoc", icon: HeartHandshake, permission: "VIEW_HELP_REQUESTS" },
  ] },
  { label: "Treści", items: [
    { href: "/admin/encyklopedia", label: "Encyklopedia", icon: BookOpen, permission: "VIEW_KNOWLEDGE" },
    { href: "/admin/kategorie", label: "Kategorie", icon: Tags, permission: "VIEW_CATEGORIES", hideForPlaceManager: true },
  ] },
  { label: "Organizacje", items: [
    { href: "/admin/organizacje", label: "Organizacje", icon: Building2, permission: "VIEW_ORGANIZATIONS", hideForPlaceManager: true },
    { href: "/admin/rejestracje-organizacji", label: "Rejestracje", icon: ClipboardList, permission: "MANAGE_ORGANIZATIONS" },
  ] },
  { label: "Narzędzia", items: [
    { href: "/admin/importy", label: "Importy", icon: FileInput, permission: "VIEW_IMPORTS", hideForPlaceManager: true },
    { href: "/admin/uzytkownicy", label: "Użytkownicy", icon: Users, permission: "MANAGE_USERS" },
  ] },
];

export function AdminSidebar({ role, permissions }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const can = (permission: AdminPermission) => permissions.includes(permission);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try { setCollapsed(window.localStorage.getItem("mapa-dobra:admin-sidebar-collapsed") === "true"); } catch { /* local preference is optional */ }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try { window.localStorage.setItem("mapa-dobra:admin-sidebar-collapsed", String(next)); } catch { /* local preference is optional */ }
      return next;
    });
  }

  return (
    <aside className={`admin-sidebar min-w-0 border-b border-border bg-white px-4 py-3 lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r lg:px-3 lg:py-6 ${collapsed ? "admin-sidebar-collapsed" : ""}`}>
      <div className="mb-3 hidden justify-end lg:flex">
        <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground" onClick={toggleCollapsed} aria-label={collapsed ? "Rozwiń menu panelu" : "Zwiń menu panelu"} title={collapsed ? "Rozwiń menu" : "Zwiń menu"}>
          {collapsed ? <PanelLeftOpen aria-hidden="true" size={19} /> : <PanelLeftClose aria-hidden="true" size={19} />}
        </button>
      </div>
      <nav aria-label="Panel administratora" className="grid min-w-0 grid-cols-2 gap-1 min-[380px]:grid-cols-3 sm:flex sm:flex-wrap sm:gap-2 lg:flex-col lg:flex-nowrap">
        {groups.map((group) => {
          const visibleItems = group.items.filter((item) => can(item.permission) && !(item.hideForPlaceManager && role === "PLACE_MANAGER"));
          if (!visibleItems.length) return null;
          return <div key={group.label} className="admin-sidebar-group col-span-2 min-[380px]:col-span-3 sm:contents lg:block">
            <h2 className="admin-sidebar-group-title px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground first:pt-0">{group.label}</h2>
            {visibleItems.map((item) => {
              const href = item.label === "Miejsca" && role === "PLACE_MANAGER" ? "/admin" : item.href;
              const active = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={item.href} href={href} className={`admin-sidebar-link inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft ${active ? "bg-brand-soft text-brand-strong" : ""}`} aria-current={active ? "page" : undefined} title={collapsed ? item.label : undefined}>
                <item.icon aria-hidden="true" size={19} /><span>{item.label}</span>
              </Link>;
            })}
          </div>;
        })}
        <form action={logoutAdmin} className="admin-sidebar-logout col-span-2 min-[380px]:col-span-3 sm:col-span-1 sm:w-auto lg:mt-5 lg:w-full lg:border-t lg:border-border lg:pt-5">
          <button type="submit" className="inline-flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground" title={collapsed ? "Wyloguj" : undefined}><LogOut aria-hidden="true" size={19} /><span>Wyloguj</span></button>
        </form>
      </nav>
    </aside>
  );
}
