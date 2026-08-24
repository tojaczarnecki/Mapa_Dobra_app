import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/app/public-info-page";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = { title: "Regulamin | Mapa Dobra", alternates: canonicalAlternates("/regulamin") };

export default function TermsPage() {
  return <PublicInfoPage title="Regulamin" />;
}
