import Link from "next/link";
import { ExternalLink, Eye, Filter, Pencil, Plus, Search } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { PlacePublicationBadge } from "@/components/admin/places/place-publication-badge";
import { PlaceRecordBadge } from "@/components/admin/places/place-record-badge";
import { prisma } from "@/lib/prisma";
import {
  operationalStatusLabels,
  placeStatusLabels,
  recordKindLabels,
} from "@/lib/places/constants";
import { isPubliclyVisiblePlace } from "@/lib/places/public-visibility";
import type {
  PlaceOperationalStatusValue,
  PlacePublicationStatusValue,
  PlaceRecordKindValue,
} from "@/types/place-admin";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type SortValue = "name" | "updated" | "verified";

const publicationStatuses = Object.keys(placeStatusLabels) as PlacePublicationStatusValue[];
const operationalStatuses = Object.keys(operationalStatusLabels) as PlaceOperationalStatusValue[];
const recordKinds = Object.keys(recordKindLabels) as PlaceRecordKindValue[];
const sortValues: SortValue[] = ["name", "updated", "verified"];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function optionalEnum<T extends string>(value: string, values: readonly T[]) {
  return values.includes(value as T) ? (value as T) : undefined;
}

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(value)
    : "Brak";
}

export default async function AdminPlacesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = (first(params.q) ?? "").trim().slice(0, 200);
  const publicationValue = first(params.publication) ?? "all";
  const operationalValue = first(params.operational) ?? "all";
  const recordKindValue = first(params.recordKind) ?? "all";
  const categoryValue = first(params.category) ?? "all";
  const accommodationValue = first(params.accommodation) ?? "all";
  const sortValue = optionalEnum(first(params.sort) ?? "updated", sortValues) ?? "updated";
  const publicationStatus = optionalEnum(publicationValue, publicationStatuses);
  const operationalStatus = optionalEnum(operationalValue, operationalStatuses);
  const recordKind = optionalEnum(recordKindValue, recordKinds);

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
    ...(publicationStatus ? { publicationStatus } : {}),
    ...(operationalStatus ? { operationalStatus } : {}),
    ...(recordKind ? { recordKind } : {}),
    ...(categoryValue !== "all"
      ? { categories: { some: { category: { slug: categoryValue } } } }
      : {}),
    ...(accommodationValue === "yes"
      ? { accommodation: { isNot: null } }
      : accommodationValue === "no"
        ? { accommodation: { is: null } }
        : {}),
  };
  const orderBy: Prisma.PlaceOrderByWithRelationInput[] = sortValue === "name"
    ? [{ name: "asc" }]
    : sortValue === "verified"
      ? [{ verifiedAt: { sort: "desc", nulls: "last" } }, { name: "asc" }]
      : [{ updatedAt: "desc" }, { name: "asc" }];

  const [places, categories] = await Promise.all([
    prisma.place.findMany({
      where,
      orderBy,
      include: {
        organization: { select: { name: true } },
        primaryCategory: { select: { name: true, slug: true } },
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
        <Link href="/admin/miejsca/nowe" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-[#10231e] transition hover:bg-brand-strong hover:text-white">
          <Plus aria-hidden="true" size={18} /> Dodaj miejsce
        </Link>
      </header>

      <form method="get" className="grid gap-2.5 rounded-lg border border-border bg-white p-3 sm:grid-cols-2 xl:grid-cols-4 xl:items-end">
        <label className="text-sm font-bold sm:col-span-2">
          <span className="mb-1.5 block">Szukaj</span>
          <span className="relative block">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input name="q" defaultValue={query} className="min-h-11 w-full rounded-lg border border-border bg-white py-2 pl-10 pr-3 font-normal" placeholder="Nazwa, adres lub organizacja" />
          </span>
        </label>
        <SelectFilter label="Publikacja" name="publication" value={publicationValue} options={publicationStatuses.map((value) => ({ value, label: placeStatusLabels[value] }))} />
        <SelectFilter label="Stan działania" name="operational" value={operationalValue} options={operationalStatuses.map((value) => ({ value, label: operationalStatusLabels[value] }))} />
        <SelectFilter label="Kategoria" name="category" value={categoryValue} options={categories.map((category) => ({ value: category.slug, label: category.name }))} />
        <SelectFilter label="Rodzaj rekordu" name="recordKind" value={recordKindValue} options={recordKinds.map((value) => ({ value, label: recordKindLabels[value] }))} />
        <SelectFilter label="Typ miejsca" name="accommodation" value={accommodationValue} options={[{ value: "yes", label: "Noclegi" }, { value: "no", label: "Pozostałe miejsca" }]} />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <SelectFilter label="Sortowanie" name="sort" value={sortValue} options={[{ value: "updated", label: "Ostatnio zmienione" }, { value: "verified", label: "Ostatnio zweryfikowane" }, { value: "name", label: "Nazwa A-Z" }]} />
          <button type="submit" title="Zastosuj filtry" className="mt-[26px] inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold hover:bg-brand-soft xl:px-3">
            <Filter aria-hidden="true" size={18} /> <span className="xl:sr-only">Zastosuj</span>
          </button>
        </div>
      </form>

      {places.length ? (
        <ol className="space-y-2.5">
          {places.map((place) => {
            const canOpenPublicly = isPubliclyVisiblePlace(place);
            const publicHref = `/lodz/${place.primaryCategory.slug}/${place.slug}`;
            return (
              <li key={place.id} className={`rounded-lg border bg-white p-4 ${place.recordKind === "TEST" ? "border-urgent/70" : "border-border"}`}>
                <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(160px,1.2fr)_minmax(130px,.9fr)_120px_125px_125px_auto] xl:items-center">
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-brand-strong">{place.accommodation ? "Nocleg" : place.primaryCategory.name}</span>
                      <PlaceRecordBadge kind={place.recordKind} />
                    </div>
                    <strong className="block text-sm leading-5">{place.name}</strong>
                    {place.organization?.name ? <span className="mt-1 block text-xs text-muted-foreground">{place.organization.name}</span> : null}
                  </div>
                  <div className="min-w-0 text-sm">
                    <span className="block line-clamp-2">{place.addressLine}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">Kategoria: {place.primaryCategory.name}</span>
                  </div>
                  <div className="space-y-1"><span className="block text-xs font-bold text-muted-foreground">Publikacja</span><PlacePublicationBadge status={place.publicationStatus} /></div>
                  <div className="text-sm"><span className="block text-xs font-bold text-muted-foreground">Stan działania</span><strong>{operationalStatusLabels[place.operationalStatus]}</strong></div>
                  <div className="text-xs text-muted-foreground"><span className="block"><strong>Weryfikacja:</strong> {formatDate(place.verifiedAt)}</span><span className="mt-1 block"><strong>Edycja:</strong> {formatDate(place.updatedAt)}</span></div>
                  <div className="flex flex-wrap gap-1.5 xl:justify-end">
                    <ActionLink href={`/admin/miejsca/${place.id}`} label="Podgląd" icon={Eye} />
                    <ActionLink href={`/admin/miejsca/${place.id}/edytuj`} label="Edytuj" icon={Pencil} />
                    {canOpenPublicly ? <ActionLink href={publicHref} label="Otwórz publicznie" icon={ExternalLink} external /> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-white px-5 py-10 text-center text-sm text-muted-foreground">Brak miejsc pasujących do wybranych filtrów.</div>
      )}
    </div>
  );
}

function SelectFilter({ label, name, value, options }: { label: string; name: string; value: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="min-w-0 text-sm font-bold">
      <span className="mb-1.5 block">{label}</span>
      <select name={name} defaultValue={value} className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal">
        <option value="all">Wszystkie</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ActionLink({ href, label, icon: Icon, external = false }: { href: string; label: string; icon: typeof Eye; external?: boolean }) {
  return (
    <Link href={href} target={external ? "_blank" : undefined} title={label} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-white px-2.5 text-brand-strong hover:bg-brand-soft">
      <Icon aria-hidden="true" size={18} /><span className="sr-only">{label}</span>
    </Link>
  );
}
