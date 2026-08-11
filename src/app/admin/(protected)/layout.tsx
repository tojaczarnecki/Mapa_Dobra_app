import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin/session";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdmin();

  return (
    <AdminShell displayName={session.user.displayName} role={session.user.role}>
      {children}
    </AdminShell>
  );
}
