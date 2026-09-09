import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/app/public-info-page";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Regulamin | Dobra Mapa",
  alternates: canonicalAlternates("/regulamin"),
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <PublicInfoPage title="Regulamin">
      <div className="mt-6 space-y-4 leading-7 text-muted-foreground">
        <p>Finalny regulamin Dobrej Mapy nie został jeszcze opublikowany. Nie pokazujemy wersji roboczej jako obowiązujących warunków korzystania z usługi.</p>
        <p>Przed publicznym pilotażem regulamin musi zostać uzupełniony i zatwierdzony dla finalnego operatora serwisu oraz faktycznego zakresu funkcji dostępnych użytkownikom.</p>
      </div>
    </PublicInfoPage>
  );
}
