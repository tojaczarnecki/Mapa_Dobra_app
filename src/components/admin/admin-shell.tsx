import Image from "next/image";
import type { AdminPermission } from "@/generated/prisma/enums";
import { UnsavedChangesProvider } from "@/components/admin/unsaved-changes";
import { AdminNav } from "@/components/admin/admin-nav";
import Link from "next/link";
import type { SystemState } from "@/lib/system/settings";
import { systemModeLabel } from "@/lib/system/settings";

type AdminShellProps = {
  displayName: string;
  role: string;
  permissions: AdminPermission[];
  children: React.ReactNode;
  systemState: SystemState;
};

export function AdminShell({ displayName, role, permissions, children, systemState }: AdminShellProps) {
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
        {systemState.mode !== "NORMAL" ? <div className={`mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 border px-4 py-3 text-sm font-bold lg:mx-8 ${systemState.mode === "MAINTENANCE" ? "border-urgent/40 bg-urgent-soft text-urgent" : "border-[#9a6700]/40 bg-[#fff6dc] text-[#684500]"}`} role="status"><span>Publiczna aplikacja: {systemModeLabel(systemState.mode)}</span><Link href="/admin/system" className="underline underline-offset-2">Zmień</Link></div> : null}
        <div className="min-w-0 px-5 py-7 lg:px-8 lg:py-9">{children}</div>
      </div>
      </div>
    </UnsavedChangesProvider>
  );
}
