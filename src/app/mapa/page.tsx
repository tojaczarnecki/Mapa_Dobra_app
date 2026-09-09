import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Mapa miejsc pomocy | Dobra Mapa",
  description: "Znajdź miejsca pomocy w swojej okolicy na mapie Łodzi.",
  alternates: canonicalAlternates("/mapa"),
};

type MapPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const first = firstValue(value);
    if (first && key !== "view") query.set(key, first);
  }
  query.set("view", "map");
  redirect(`/szukaj?${query.toString()}`);
}
