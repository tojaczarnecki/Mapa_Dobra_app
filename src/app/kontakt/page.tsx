import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/app/public-info-page";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Kontakt | Dobra Mapa",
  alternates: canonicalAlternates("/kontakt"),
  robots: { index: false, follow: false },
};

export default function ContactPage() {
  return (
    <PublicInfoPage title="Kontakt">
      <div className="mt-6 space-y-4 leading-7 text-muted-foreground">
        <p>Publiczne dane kontaktowe operatora Dobrej Mapy nie zostały jeszcze opublikowane dla wersji pilotażowej.</p>
        <p>Przed publicznym startem ta strona musi zawierać właściwy kanał kontaktu do operatora serwisu oraz kontakt dotyczący prywatności i dostępności.</p>
      </div>
    </PublicInfoPage>
  );
}
