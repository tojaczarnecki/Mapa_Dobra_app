import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlaceForm } from "@/components/admin/places/place-form";
import { emptyPlaceAdminPayload, getAdminPlaceFormOptions } from "@/lib/places/admin-data";

export default async function NewAdminPlacePage() {
  const { categories } = await getAdminPlaceFormOptions();
  const primaryCategory = categories[0]?.slug ?? "jedzenie";

  return (
    <div className="space-y-5">
      <Link href="/admin/miejsca" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft">
        <ArrowLeft aria-hidden="true" size={18} />
        Wróć do miejsc
      </Link>
      <header>
        <p className="mb-1 text-sm font-bold text-brand-strong">Baza miejsc</p>
        <h1 className="text-3xl font-bold">Nowe miejsce</h1>
        <p className="mt-2 text-sm text-muted-foreground">Nowy rekord zostanie zapisany jako szkic. Publikacja wymaga osobnej decyzji.</p>
      </header>
      <PlaceForm initialData={emptyPlaceAdminPayload(primaryCategory)} categories={categories} />
    </div>
  );
}
