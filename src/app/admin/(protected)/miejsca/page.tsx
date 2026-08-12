import Link from "next/link";
import { ArrowRight, Filter, Plus, Search } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { placeStatusLabels } from "@/lib/places/constants";
import { PlacePublicationBadge } from "@/components/admin/places/place-publication-badge";
import type { PlacePublicationStatusValue } from "@/types/place-admin";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const statuses = Object.keys(placeStatusLabels) as PlacePublicationStatusValue[];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPlacesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = (first(params.q) ?? "").trim().slice(0, 200);
  const statusValue = first(params.status) ?? "all";
  const categoryValue = first(params.category) ?? "all";
  const status = statuses.includes(statusValue as PlacePublicationStatusValue)
    ? (statusValue as PlacePublicationStatusValue)
    : undefined;

  const where: Prisma.PlaceWhereInput = {
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { addressLine: { contains: query, mode: "insensitive" } },
            { organization: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(status ? { publicationStatus: status } : {}),
    ...(categoryValue !== "all" ? { categories: { some: { category: { slug: categoryValue } } } } : {}),
  };

  const [places, categories] = await Promise.all([
    prisma.place.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      include: {
        organization: { select: { name: true } },
        primaryCategory: { select: { name: true } },
        accommodation: { select: { id: true } },
      },
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { slug: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-bold text-brand-strong">Baza miejsc</p>
          <h1 className="text-3xl font-bold">Miejsca</h1>
          <p className="mt-2 text-sm text-muted-foreground">{places.length} miejsc w bieżącym widoku</p>
        </div>
        <Link
          href="/admin/miejsca/nowe"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-[#10231e] transition hover:bg-brand-strong hover:text-white"
        >
          <Plus aria-hidden="true" size={18} />
          Dodaj miejsce
        </Link>
      </header>

      <form method="get" className="grid gap-2.5 rounded-lg border border-border bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.4fr)_1fr_1fr_auto] lg:items-end">
        <label className="text-sm font-bold">
          <span className="mb-1.5 block">Szukaj</span>
          <span className="relative block">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input name="q" defaultValue={query} className="min-h-11 w-full rounded-lg border border-border bg-white py-2 pl-10 pr-3 font-normal" placeholder="Nazwa, adres, organizacja" />
          </span>
        </label>
        <label className="text-sm font-bold">
          <span className="mb-1.5 block">Status</span>
          <select name="status" defaultValue={statusValue} className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal">
            <option value="all">Wszystkie</option>
            {statuses.map((item) => <option key={item} value={item}>{placeStatusLabels[item]}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">
          <span className="mb-1.5 block">Kategoria</span>
          <select name="category" defaultValue={categoryValue} className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal">
            <option value="all">Wszystkie</option>
            {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
          </select>
        </label>
        <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold hover:bg-brand-soft">
          <Filter aria-hidden="true" size={18} />
          Zastosuj
        </button>
      </form>

      {places.length ? (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(170px,.8fr)_150px_110px_28px] gap-4 border-b border-border bg-[#f5f3ed] px-5 py-3 text-xs font-bold uppercase text-muted-foreground md:grid">
            <span>Miejsce</span><span>Adres</span><span>Kategoria</span><span>Status</span><span className="sr-only">Otwórz</span>
          </div>
          <ol className="divide-y divide-border">
            {places.map((place) => (
              <li key={place.id}>
                <Link href={`/admin/miejsca/${place.id}`} className="grid min-w-0 gap-2.5 px-4 py-3.5 transition hover:bg-brand-soft/45 sm:px-5 md:grid-cols-[minmax(0,1.3fr)_minmax(170px,.8fr)_150px_110px_28px] md:items-center md:gap-4">
                  <div className="min-w-0">
                    <span className="mb-1 block text-xs font-bold text-brand-strong">{place.accommodation ? "Nocleg" : place.organization?.name ?? "Miejsce pomocy"}</span>
                    <strong className="block truncate text-sm">{place.name}</strong>
                    {place.recordKind !== "PRODUCTION" ? (
                      <span className="mt-1 block text-xs font-bold text-muted-foreground">
                        Rekord {place.recordKind}
                      </span>
                    ) : null}
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{place.addressLine}</p>
                  <p className="text-sm font-semibold">{place.primaryCategory.name}</p>
                  <PlacePublicationBadge status={place.publicationStatus} />
                  <ArrowRight aria-hidden="true" className="hidden text-brand-strong md:block" size={19} />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-white px-5 py-10 text-center text-sm text-muted-foreground">Brak miejsc pasujących do wybranych filtrów.</div>
      )}
    </div>
  );
}
