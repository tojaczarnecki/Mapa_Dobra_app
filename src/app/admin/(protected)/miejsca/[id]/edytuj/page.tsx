import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PlaceForm } from "@/components/admin/places/place-form";
import { getAdminPlace, getAdminPlaceFormOptions, toPlaceAdminPayload } from "@/lib/places/admin-data";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export default async function EditAdminPlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const [place, options] = await Promise.all([getAdminPlace(id), getAdminPlaceFormOptions()]);
  if (!place) notFound();

  return (
    <div className="space-y-5">
      <Link href={`/admin/miejsca/${id}`} className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft">
        <ArrowLeft aria-hidden="true" size={18} />
        Wróć do miejsca
      </Link>
      <header>
        <p className="mb-1 text-sm font-bold text-brand-strong">Edycja miejsca</p>
        <h1 className="text-3xl font-bold">{place.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Zmiany zostaną zapisane dopiero po użyciu przycisku „Zapisz zmiany”.</p>
      </header>
      <PlaceForm initialData={toPlaceAdminPayload(place)} categories={options.categories} organizations={options.organizations} />
    </div>
  );
}
