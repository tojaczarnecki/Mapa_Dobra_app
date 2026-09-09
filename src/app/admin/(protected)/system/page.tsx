import Link from "next/link";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
import { SystemSettingsForm } from "@/components/admin/system/system-settings-form";
import { updateSystemSettings } from "./actions";
import { requirePermission } from "@/lib/admin/session";
import { getSystemState, systemModeDescription, systemModeLabel } from "@/lib/system/settings";

export default async function SystemPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("VIEW_SYSTEM_SETTINGS");
  const state = await getSystemState();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const saved = params.saved === "1";
  const errorMessage = error === "conflict"
    ? "Ustawienia zmieniły się w innej sesji. Odśwież stronę i spróbuj ponownie."
    : error === "confirm"
      ? "Przejście na tryb serwisowy wymaga potwierdzenia."
      : error === "storage"
        ? process.env.NODE_ENV === "development"
          ? "Ustawienia systemowe nie są jeszcze dostępne w lokalnej bazie danych. Wymagana jest migracja."
          : "Ustawienia systemowe są chwilowo niedostępne."
        : "Nie udało się zapisać ustawień. Sprawdź dane i spróbuj ponownie.";

  return <div className="space-y-6"><AdminPageHeader backHref="/admin" backLabel="Dashboard" eyebrow="System" title="System" description="Zarządzaj dostępnością publicznej aplikacji." action={<Link href="/admin/system/podglad" className="inline-flex min-h-11 items-center rounded-md border border-border bg-white px-4 py-2 text-sm font-bold">Podgląd strony serwisowej</Link>} />{saved ? <p className="border border-brand/40 bg-brand-soft px-4 py-3 text-sm font-bold text-brand-strong" role="status">Ustawienia systemu zostały zapisane.</p> : null}{error ? <p className="border border-urgent/40 bg-urgent-soft px-4 py-3 text-sm font-bold text-urgent" role="alert">{errorMessage}</p> : null}<AdminSection title="Status aplikacji" description="Zmiana zacznie obowiązywać po odświeżeniu kolejnych żądań."><div className="border-b border-border bg-white p-5"><p className="text-lg font-bold">{systemModeLabel(state.mode)}</p><p className="mt-1 text-sm text-muted-foreground">{systemModeDescription(state.mode)}</p></div><div className="p-5"><SystemSettingsForm state={state} action={updateSystemSettings} /></div></AdminSection></div>;
}
