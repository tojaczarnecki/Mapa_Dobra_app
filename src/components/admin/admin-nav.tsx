"use client";

import Link from "next/link";
import { Building2, ClipboardList, FileInput, HeartHandshake, LayoutDashboard, ListTodo, LogOut, MapPinned, SearchCheck, Tags, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import type { AdminPermission } from "@/generated/prisma/enums";
import { logoutAdmin } from "@/app/admin/actions";

type AdminNavProps = { role: string; permissions: AdminPermission[] };
type NavItem = { href: string; label: string; permission?: AdminPermission; icon: typeof LayoutDashboard; exact?: boolean };

const groups: Array<{ label: string; items: NavItem[] }> = [
  { label: "Operacje", items: [
    { href: "/admin", label: "Dashboard", permission: "VIEW_DASHBOARD", icon: LayoutDashboard, exact: true },
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
  ] },
];

export function AdminNav({ role, permissions }: AdminNavProps) {
  const pathname = usePathname();
  const can = (permission?: AdminPermission) => !permission || permissions.includes(permission);
  const isActive = (item: NavItem) => item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return <nav aria-label="Panel administratora" className="grid min-w-0 grid-cols-2 gap-4 min-[380px]:grid-cols-3 sm:flex sm:flex-wrap sm:gap-5 lg:flex-col lg:flex-nowrap">
    {groups.map((group) => {
      const visible = group.items.filter((item) => can(item.permission) && !(role === "PLACE_MANAGER" && item.href !== "/admin" && ["/admin/miejsca", "/admin/zgloszenia", "/admin/potrzeby"].includes(item.href)));
      if (!visible.length) return null;
      return <div key={group.label} className="contents lg:block"><p className="col-span-full hidden px-3 pt-2 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground first:pt-0 lg:block">{group.label}</p>{visible.map((item) => { const Icon = item.icon; const active = isActive(item); return <Link key={item.href} href={role === "PLACE_MANAGER" && item.href === "/admin/miejsca" ? "/admin" : item.href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-brand-soft text-brand-strong" : "hover:bg-brand-soft"}`}><Icon aria-hidden="true" size={19} /><span className="truncate">{role === "PLACE_MANAGER" && item.href === "/admin/miejsca" ? "Moje placówki" : item.label}</span></Link>; })}</div>;
    })}
    <form action={logoutAdmin} className="col-span-2 min-[380px]:col-span-3 sm:col-span-1 sm:w-auto lg:mt-5 lg:w-full lg:border-t lg:border-border lg:pt-5"><button type="submit" className="inline-flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"><LogOut aria-hidden="true" size={19} />Wyloguj</button></form>
  </nav>;
}
