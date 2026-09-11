import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UncertainSupportFlow } from "@/components/search/uncertain-support-flow-v2";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Szukam wsparcia | Dobra Mapa",
  description: "Znajdź pomoc dla siebie.",
  alternates: canonicalAlternates("/szukam"),
};

export const dynamic = "force-dynamic";

type SupportSearchEntryProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SupportSearchEntry({ searchParams }: SupportSearchEntryProps) {
  const params = await searchParams;
  const mode = Array.isArray(params.tryb) ? params.tryb[0] : params.tryb;

  if (mode === "guided") {
    return <UncertainSupportFlow />;
  }

  redirect("/szukaj");
}
