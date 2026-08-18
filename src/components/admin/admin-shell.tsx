import Image from "next/image";
import Link from "next/link";
import { Building2, ClipboardList, FileInput, LayoutDashboard, LogOut, MapPinned, SearchCheck, Tags } from "lucide-react";
import { logoutAdmin } from "@/app/admin/actions";
import { UnsavedChangesProvider } from "@/components/admin/unsaved-changes";

type AdminShellProps = {
  displayName: string;
  role: string;
  children: React.ReactNode;
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Superadministrator",
  ADMIN: "Administrator",
  MODERATOR: "Moderator",
};

export function AdminShell({ displayName, role, children }: AdminShellProps) {
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
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <LayoutDashboard aria-hidden="true" size={19} />
              Dashboard
            </Link>
            <Link
              href="/admin/zgloszenia"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <ClipboardList aria-hidden="true" size={19} />
              Zgłoszenia
            </Link>
            <Link
              href="/admin/miejsca"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <MapPinned aria-hidden="true" size={19} />
              Miejsca
            </Link>
            <Link
              href="/admin/organizacje"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <Building2 aria-hidden="true" size={19} />
              Organizacje
            </Link>
            <Link
              href="/admin/kategorie"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <Tags aria-hidden="true" size={19} />
              Kategorie
            </Link>
            <Link
              href="/admin/importy"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <FileInput aria-hidden="true" size={19} />
              Importy
            </Link>
            <Link
              href="/admin/weryfikacja"
              className="inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-brand-soft"
            >
              <SearchCheck aria-hidden="true" size={19} />
              Weryfikacja
            </Link>
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
