import type { Metadata } from "next";
import { PlaceCorrectionChooser } from "@/components/submissions/place-correction-chooser";
import { PlaceUpdateHub } from "@/components/submissions/place-update-hub";
import { getPublicPlaceContext, getPublicSearchPlaces } from "@/lib/places/public-data";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Zgłoś zmianę | Mapa Dobra",
  description: "Zgłoś zmianę lub błąd w informacjach o miejscu pomocy.",
  alternates: canonicalAlternates("/zglos-zmiane"),
};

type UpdatePageProps = {
  searchParams: Promise<{
    place?: string | string[];
    field?: string | string[];
  }>;
};

export default async function ReportUpdatePage({ searchParams }: UpdatePageProps) {
  const params = await searchParams;
  const rawPlace = params.place;
  const rawField = params.field;
  const requestedPlace = Array.isArray(rawPlace) ? rawPlace[0] : rawPlace;
  const requestedField = Array.isArray(rawField) ? rawField[0] : rawField;
  const placeContext = requestedPlace ? await getPublicPlaceContext(requestedPlace) : undefined;
  const places = placeContext ? undefined : (await getPublicSearchPlaces()).map(({ id, name, address, helpTypes }) => ({ id, name, address, helpTypes }));

  return (
    <div className="public-service-page mx-auto w-full min-w-0 max-w-[760px] px-4 pb-28 pt-4 sm:px-6 sm:pt-7 md:pb-16 lg:px-8">
      {placeContext ? <PlaceCorrectionChooser place={placeContext} autoOpenField={requestedField} /> : <PlaceUpdateHub places={places ?? []} initialQuery={requestedPlace ?? ""} />}
    </div>
  );
}
