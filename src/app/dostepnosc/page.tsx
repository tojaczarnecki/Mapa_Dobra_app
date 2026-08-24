import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/app/public-info-page";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = { title: "Dostępność | Mapa Dobra", alternates: canonicalAlternates("/dostepnosc") };

export default function AccessibilityPage() {
  return <PublicInfoPage title="Dostępność" />;
}
