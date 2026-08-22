import type { Metadata } from "next";
import { NewPlaceForm } from "@/components/submissions/new-place-form";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Dodaj nowe miejsce | Mapa Dobra",
  description: "Zgłoś miejsce pomocy, którego brakuje w Mapie Dobra.",
  alternates: canonicalAlternates("/zglos-miejsce"),
};

export default function ReportNewPlacePage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[800px] px-4 pb-28 pt-4 sm:px-6 sm:pt-7 md:pb-16 lg:px-8">
      <NewPlaceForm />
    </div>
  );
}
