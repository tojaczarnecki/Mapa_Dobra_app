import Image from "next/image";
import Link from "next/link";
import { Building2, ClipboardList, FileInput, HeartHandshake, LayoutDashboard, LogOut, MapPinned, SearchCheck, Tags, Users } from "lucide-react";
import type { AdminPermission } from "@/generated/prisma/enums";
import { logoutAdmin } from "@/app/admin/actions";
import { UnsavedChangesProvider } from "@/components/admin/unsaved-changes";

type AdminShellProps = {
  displayName: string;
  role: string;
  permissions: AdminPermission[];
  children: React.ReactNode;
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Superadministrator",
  ADMIN: "Administrator",
  MODERATOR: "Moderator",
  PLACE_MANAGER: "Pracownik placówki",
  VIEWER: "Tylko odczyt",
};

export function AdminShell({ displayName, role, permissions, children }: AdminShellProps) {
  const can = (permission: AdminPermission) => permissions.includes(permission);
  return (
    <UnsavedChangesProvider>
      <div className="min-h-screen bg-[#f7f5ef] text-foreground">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1200px] items-center justify-between gap-6 px-5 py-3 lg:px-8">
          <Link href="/admin" className="inline-flex rounded-md p-1" aria-label="Mapa Dobra - panel administratora">
            <Image
              src="/brand/mapa-dobra-logo.svg"
              alt="Mapa Dobra"
              width={170}
              height={40}
              priority
              className="h-9 w-auto"
            />
          </Link>
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-bold">{displayName}</p>
            <p className="text-xs text-muted-foreground">{roleLabels[role] ?? role}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full min-w-0 max-w-[1200px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-border bg-white px-4 py-3 lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <nav aria-label="Panel administratora" className="grid min-w-0 grid-cols-2 gap-1 min-[380px]:grid-cols-3 sm:flex sm:flex-wrap sm:gap-2 lg:flex-col lg:flex-nowrap">
            {can("VIEW_DASHBOARD") ? <Link
              href="/admin"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <LayoutDashboard aria-hidden="true" size={19} />
              Dashboard
            </Link> : null}
            {can("MODERATE_SUBMISSIONS") ? <Link
              href="/admin/zgloszenia"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <ClipboardList aria-hidden="true" size={19} />
              Zgłoszenia
            </Link> : null}
            {can("VIEW_PLACES") ? <Link
              href={role === "PLACE_MANAGER" ? "/admin" : "/admin/miejsca"}
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <MapPinned aria-hidden="true" size={19} />
              {role === "PLACE_MANAGER" ? "Moje placówki" : "Miejsca"}
            </Link> : null}
            {can("VIEW_ORGANIZATIONS") && role !== "PLACE_MANAGER" ? <Link
              href="/admin/organizacje"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <Building2 aria-hidden="true" size={19} />
              Organizacje
            </Link> : null}
            {can("VIEW_CATEGORIES") && role !== "PLACE_MANAGER" ? <Link
              href="/admin/kategorie"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <Tags aria-hidden="true" size={19} />
              Kategorie
            </Link> : null}
            {can("VIEW_IMPORTS") && role !== "PLACE_MANAGER" ? <Link
              href="/admin/importy"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <FileInput aria-hidden="true" size={19} />
              Importy
            </Link> : null}
            {can("VERIFY_PLACES") ? <Link
              href="/admin/weryfikacja"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <SearchCheck aria-hidden="true" size={19} />
              Weryfikacja
            </Link> : null}
            {can("VIEW_HELP_REQUESTS") ? <Link
              href="/admin/zgloszenia-pomocy"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-[#fff1cf]"
            >
              <HeartHandshake aria-hidden="true" size={19} />
              Uruchom pomoc
            </Link> : null}
            {can("MANAGE_USERS") ? <Link
              href="/admin/uzytkownicy"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <Users aria-hidden="true" size={19} />
              Użytkownicy
            </Link> : null}
            <form action={logoutAdmin} className="col-span-2 min-[380px]:col-span-3 sm:col-span-1 sm:w-auto lg:mt-5 lg:w-full lg:border-t lg:border-border lg:pt-5">
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
              >
                <LogOut aria-hidden="true" size={19} />
                Wyloguj
              </button>
            </form>
          </nav>
        </aside>
        <div className="min-w-0 px-5 py-7 lg:px-8 lg:py-9">{children}</div>
      </div>
      </div>
    </UnsavedChangesProvider>
  );
}
