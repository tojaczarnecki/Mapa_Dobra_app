import Link from "next/link";
import { Pencil, Plus, Search, UserRound } from "lucide-react";
import type { AdminRole } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

const roleLabels: Record<AdminRole, string> = {
  SUPER_ADMIN: "Superadministrator",
  ADMIN: "Administrator",
  MODERATOR: "Moderator",
  PLACE_MANAGER: "Pracownik placówki",
  VIEWER: "Tylko odczyt",
};

const date = (value: Date | null) => value
  ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(value)
  : "Nigdy";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("MANAGE_USERS");
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 160) : "";
  const role = typeof query.role === "string" && Object.keys(roleLabels).includes(query.role)
    ? query.role as AdminRole
    : undefined;
  const active = query.active === "yes" ? true : query.active === "no" ? false : undefined;
  const group = query.group === "facility" ? "facility" : query.group === "staff" ? "staff" : "all";
  const users = await prisma.adminUser.findMany({
    where: {
      ...(q ? { OR: [{ displayName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
      ...(role ? { role } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(group === "facility" ? { role: "PLACE_MANAGER" } : group === "staff" ? { role: { in: ["SUPER_ADMIN", "ADMIN", "MODERATOR", "VIEWER"] } } : {}),
    },
    include: { _count: { select: { placeAccesses: { where: { active: true } } } } },
    orderBy: [{ active: "desc" }, { displayName: "asc" }],
  });

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-brand-strong">Dostęp administracyjny</p>
          <h1 className="mt-1 text-3xl font-bold">Użytkownicy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Konta, role, indywidualne uprawnienia i dostęp do placówek.</p>
        </div>
        <Link href="/admin/uzytkownicy/nowy" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold">
          <Plus aria-hidden="true" size={18} />
          Zaproś użytkownika
        </Link>
      </header>

      <form className="grid gap-3 rounded-lg border border-border bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_160px_180px_auto]">
        <label className="relative">
          <span className="sr-only">Szukaj</span>
          <Search aria-hidden="true" size={17} className="absolute left-3 top-3.5 text-muted-foreground" />
          <input name="q" defaultValue={q} placeholder="Imię lub e-mail" className="min-h-11 w-full rounded-lg border border-border pl-10 pr-3" />
        </label>
        <select name="role" defaultValue={role ?? ""} aria-label="Rola" className="min-h-11 rounded-lg border border-border bg-white px-3">
          <option value="">Wszystkie role</option>
          {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select name="active" defaultValue={query.active ?? ""} aria-label="Stan konta" className="min-h-11 rounded-lg border border-border bg-white px-3">
          <option value="">Każdy stan</option>
          <option value="yes">Aktywne</option>
          <option value="no">Nieaktywne</option>
        </select>
        <select name="group" defaultValue={group} aria-label="Grupa użytkowników" className="min-h-11 rounded-lg border border-border bg-white px-3">
          <option value="all">Wszyscy</option>
          <option value="facility">Placówki</option>
          <option value="staff">Administracja</option>
        </select>
        <button className="min-h-11 rounded-lg border border-brand px-4 text-sm font-bold text-brand-strong">Zastosuj</button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-white">
        {users.length ? users.map((user) => (
          <article key={user.id} className="grid min-w-0 gap-3 border-t border-border px-4 py-3 first:border-t-0 lg:grid-cols-[minmax(220px,1.2fr)_minmax(440px,2fr)_auto] lg:items-center lg:gap-4 lg:py-2.5">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <strong className="truncate text-sm">{user.displayName}</strong>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${user.active ? "bg-brand-soft text-brand-strong" : "bg-surface-muted text-muted-foreground"}`}>{user.active ? "Aktywne" : "Nieaktywne"}</span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
            </div>

            <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:gap-3">
              <div className="min-w-0">
                <dt className="text-[11px] font-bold uppercase text-muted-foreground">Rola</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold">{roleLabels[user.role]}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-muted-foreground">Placówki</dt>
                <dd className="mt-0.5 text-sm font-semibold">{user._count.placeAccesses}</dd>
              </div>
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <dt className="text-[11px] font-bold uppercase text-muted-foreground">Ostatnie logowanie</dt>
                <dd className="mt-0.5 truncate text-xs text-muted-foreground">{date(user.lastLoginAt)}</dd>
              </div>
            </dl>

            <div className="flex min-w-0 flex-wrap gap-1 sm:flex-nowrap lg:justify-end">
              <Link href={`/admin/uzytkownicy/${user.id}`} title={`Podgląd: ${user.displayName}`} aria-label={`Podgląd: ${user.displayName}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold text-brand-strong hover:bg-brand-soft">
                <UserRound aria-hidden="true" size={16} />
                <span className="max-[420px]:sr-only">Podgląd</span>
              </Link>
              <Link href={`/admin/uzytkownicy/${user.id}/edytuj`} title={`Edytuj: ${user.displayName}`} aria-label={`Edytuj: ${user.displayName}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold hover:bg-surface-muted">
                <Pencil aria-hidden="true" size={16} />
                <span className="max-[420px]:sr-only">Edytuj</span>
              </Link>
            </div>
          </article>
        )) : <p className="p-6 text-sm text-muted-foreground">Brak użytkowników dla wybranych filtrów.</p>}
      </div>
    </div>
  );
}
