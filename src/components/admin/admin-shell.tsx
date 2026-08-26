import Image from "next/image";
import Link from "next/link";
import type { AdminPermission } from "@/generated/prisma/enums";
import { UnsavedChangesProvider } from "@/components/admin/unsaved-changes";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

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
      <div className="min-h-screen bg-background text-foreground">
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
        <AdminSidebar role={role} permissions={permissions} />
        <div className="min-w-0 px-5 py-7 lg:px-8 lg:py-9">{children}</div>
      </div>
      </div>
    </UnsavedChangesProvider>
  );
}
