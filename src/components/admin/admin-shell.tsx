import Image from "next/image";
import Link from "next/link";
import type { AdminPermission } from "@/generated/prisma/enums";
import { UnsavedChangesProvider } from "@/components/admin/unsaved-changes";
import { AdminNav } from "@/components/admin/admin-nav";

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
  return (
    <UnsavedChangesProvider>
      <div className="min-h-screen bg-[#f7f5ef] text-foreground">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1200px] items-center justify-between gap-6 px-5 py-3 lg:px-8">
          <Link href="/admin" className="inline-flex rounded-md p-1" aria-label="Dobra Mapa - panel administratora">
            <Image
              src="/brand/dobra-mapa-logo-header.svg"
              alt="Dobra Mapa"
              width={604}
              height={120}
              priority
              className="h-9 w-auto"
            />
          </Link>
          <div className="min-w-0 text-right" aria-label={`Zalogowano jako ${displayName}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Zalogowano jako</p>
            <p className="truncate text-sm font-bold">{displayName}</p>
            <p className="text-xs text-muted-foreground">{roleLabels[role] ?? role}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full min-w-0 max-w-[1200px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-border bg-white px-4 py-3 lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <AdminNav role={role} permissions={permissions} />
        </aside>
        <div className="min-w-0 px-5 py-7 lg:px-8 lg:py-9">{children}</div>
      </div>
      </div>
    </UnsavedChangesProvider>
  );
}
