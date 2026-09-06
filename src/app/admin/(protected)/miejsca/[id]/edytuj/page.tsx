import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { PlaceForm } from "@/components/admin/places/place-form";
import { getAdminPlace, getAdminPlaceFormOptions, toPlaceAdminPayload } from "@/lib/places/admin-data";
import { requirePermission } from "@/lib/admin/session";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export default async function EditAdminPlacePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("EDIT_PLACES");
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const [place, options] = await Promise.all([getAdminPlace(id), getAdminPlaceFormOptions()]);
  if (!place) notFound();

  return (
    <div className="space-y-5">
      <AdminPageHeader backHref={`/admin/miejsca/${id}`} backLabel="Wróć do miejsca" eyebrow="Edycja miejsca" title={place.name} description="Uzupełnij dane sekcjami. Zmiany zostaną zapisane dopiero po użyciu przycisku „Zapisz zmiany” i mogą wpłynąć na widok publiczny." />
      <PlaceForm initialData={toPlaceAdminPayload(place)} categories={options.categories} organizations={options.organizations} />
    </div>
  );
}
