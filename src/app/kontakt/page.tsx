import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/app/public-info-page";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = { title: "Kontakt | Mapa Dobra", alternates: canonicalAlternates("/kontakt") };

export default function ContactPage() {
  return <PublicInfoPage title="Kontakt" />;
}
