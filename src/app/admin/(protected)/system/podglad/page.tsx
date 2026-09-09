import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { MaintenanceScreen } from "@/components/app/public-page-shell";
import { requirePermission } from "@/lib/admin/session";
import { getSystemState } from "@/lib/system/settings";

export default async function SystemPreviewPage() {
  await requirePermission("VIEW_SYSTEM_SETTINGS");
  const state = await getSystemState();

  return <div className="space-y-6"><AdminPageHeader backHref="/admin/system" backLabel="Ustawienia systemu" eyebrow="System" title="Podgląd strony serwisowej" description="To jest podgląd. Nie zmienia globalnego trybu ani ustawień." /><div className="overflow-hidden border border-border"><MaintenanceScreen state={state} /></div><Link href="/admin/system" className="inline-flex min-h-11 items-center border border-border bg-white px-4 text-sm font-bold hover:bg-surface-muted">← Wróć do ustawień systemu</Link></div>;
}
