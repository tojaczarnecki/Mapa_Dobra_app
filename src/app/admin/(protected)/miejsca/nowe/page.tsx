import { AdminPageHeader, AdminImpactSummary } from "@/components/admin/admin-ui";
import { PlaceForm } from "@/components/admin/places/place-form";
import { emptyPlaceAdminPayload, getAdminPlaceFormOptions } from "@/lib/places/admin-data";
import { requirePermission } from "@/lib/admin/session";

export default async function NewAdminPlacePage() {
  await requirePermission("CREATE_PLACES");
  const { categories, organizations } = await getAdminPlaceFormOptions();
  const primaryCategory = categories.find((category) => category.active)?.slug ?? "jedzenie";

  return (
    <div className="space-y-5">
      <AdminPageHeader backHref="/admin/miejsca" backLabel="Wróć do miejsc" eyebrow="Baza miejsc" title="Nowe miejsce" description="Uzupełnij minimum potrzebne do utworzenia szkicu." />
      <AdminImpactSummary title="Tworzysz szkic miejsca"><p>Nie będzie jeszcze widoczne publicznie. Po zapisaniu możesz uzupełnić dane, zweryfikować je i dopiero potem opublikować miejsce.</p><p className="mt-2 font-semibold">Minimum: nazwa, adres lub lokalizacja, kategoria oraz organizacja, jeśli jest wymagana.</p></AdminImpactSummary>
      <PlaceForm initialData={emptyPlaceAdminPayload(primaryCategory)} categories={categories} organizations={organizations} />
    </div>
  );
}
