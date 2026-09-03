import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/app/public-info-page";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = { title: "O projekcie | Dobra Mapa", alternates: canonicalAlternates("/o-projekcie") };

export default function AboutProjectPage() {
  return <PublicInfoPage title="O projekcie" />;
}
