import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin/session";
import { getSystemState } from "@/lib/system/settings";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdmin();
  const systemState = await getSystemState();

  return (
    <AdminShell displayName={session.user.displayName} role={session.user.role} permissions={session.user.permissions} systemState={systemState}>
      {children}
    </AdminShell>
  );
}
