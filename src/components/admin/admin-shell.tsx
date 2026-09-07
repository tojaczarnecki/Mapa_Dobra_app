import Image from "next/image";
import type { AdminPermission } from "@/generated/prisma/enums";
import { UnsavedChangesProvider } from "@/components/admin/unsaved-changes";
import { AdminNav } from "@/components/admin/admin-nav";

type AdminShellProps = {
  displayName: string;
  role: string;
  permissions: AdminPermission[];
  children: React.ReactNode;
};

export function AdminShell({ displayName, role, permissions, children }: AdminShellProps) {
  return (
    <UnsavedChangesProvider>
      <div className="min-h-screen bg-[#f7f5ef] text-foreground">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1400px] items-center gap-5 px-5 py-3 lg:px-8">
          <a href="/admin" className="inline-flex shrink-0 rounded-md p-1" aria-label="Dobra Mapa - panel administratora">
            <Image
              src="/brand/dobra-mapa-logo-header.svg"
              alt="Dobra Mapa"
              width={604}
              height={120}
              priority
              className="h-9 w-auto"
            />
          </a>
          <div className="min-w-0 flex-1"><AdminNav role={role} displayName={displayName} permissions={permissions} /></div>
        </div>
      </header>
      <div className="mx-auto w-full min-w-0 max-w-[1400px]">
        <div className="min-w-0 px-5 py-7 lg:px-8 lg:py-9">{children}</div>
      </div>
      </div>
    </UnsavedChangesProvider>
  );
}
