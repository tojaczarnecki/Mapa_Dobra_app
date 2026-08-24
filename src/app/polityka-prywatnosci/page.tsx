import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/app/public-info-page";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = { title: "Polityka prywatności | Mapa Dobra", alternates: canonicalAlternates("/polityka-prywatnosci") };

export default function PrivacyPolicyPage() {
  return <PublicInfoPage title="Polityka prywatności" />;
}
