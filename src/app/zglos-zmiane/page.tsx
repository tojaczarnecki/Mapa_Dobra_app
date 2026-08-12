import type { Metadata } from "next";
import { PlaceUpdateForm } from "@/components/submissions/place-update-form";
import { getPublicPlaceContext } from "@/lib/places/public-data";

export const metadata: Metadata = {
  title: "Zgłoś zmianę | Mapa Dobra",
  description: "Zgłoś zmianę lub błąd w informacjach o miejscu pomocy.",
};

type UpdatePageProps = {
  searchParams: Promise<{
    place?: string | string[];
  }>;
};

export default async function ReportUpdatePage({ searchParams }: UpdatePageProps) {
  const rawPlace = (await searchParams).place;
  const requestedPlace = Array.isArray(rawPlace) ? rawPlace[0] : rawPlace;
  const placeContext = requestedPlace ? await getPublicPlaceContext(requestedPlace) : undefined;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[800px] px-4 pb-28 pt-4 sm:px-6 sm:pt-7 md:pb-16 lg:px-8">
      <PlaceUpdateForm place={placeContext} requestedPlace={requestedPlace} />
    </div>
  );
}
