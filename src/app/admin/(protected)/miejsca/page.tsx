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
type VerificationValue = "UNVERIFIED" | "VERIFIED" | "NEEDS_CONFIRMATION";

const publicationStatuses = Object.keys(placeStatusLabels) as PlacePublicationStatusValue[];
const operationalStatuses = Object.keys(operationalStatusLabels) as PlaceOperationalStatusValue[];
const recordKinds = Object.keys(recordKindLabels) as PlaceRecordKindValue[];
const sortValues: SortValue[] = ["name", "updated", "verified"];
const verificationLabels: Record<VerificationValue, string> = {
  UNVERIFIED: "Niezweryfikowane",
  VERIFIED: "Zweryfikowane",
  NEEDS_CONFIRMATION: "Wymaga weryfikacji",
};

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
  const recordKindValue = first(params.recordKind) ?? "without-test";
  const categoryValue = first(params.category) ?? "all";
  const accommodationValue = first(params.accommodation) ?? "all";
  const verificationValue = first(params.verification) ?? "all";
  const sortValue = optionalEnum(first(params.sort) ?? "updated", sortValues) ?? "updated";
  const publicationStatus = optionalEnum(publicationValue, publicationStatuses);
  const operationalStatus = optionalEnum(operationalValue, operationalStatuses);
  const recordKind = optionalEnum(recordKindValue, recordKinds);
  const verificationStatus = optionalEnum(verificationValue, Object.keys(verificationLabels) as VerificationValue[]);

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
    ...(recordKind ? { recordKind } : recordKindValue === "all" ? {} : { recordKind: { not: "TEST" } }),
    ...(verificationStatus ? { verificationStatus } : {}),
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

      <form method="get" className="grid gap-2 rounded-lg border border-border bg-white p-2.5 sm:grid-cols-2 xl:grid-cols-4 xl:items-end 2xl:grid-cols-[180px_repeat(6,minmax(0,1fr))_150px]">
        <label className="text-sm font-bold sm:col-span-2 xl:col-span-1">
          <span className="mb-1 block">Szukaj</span>
          <span className="relative block">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input name="q" defaultValue={query} className="min-h-11 w-full rounded-lg border border-border bg-white py-2 pl-10 pr-3 font-normal" placeholder="Nazwa, adres lub organizacja" />
          </span>
        </label>
        <SelectFilter label="Publikacja" name="publication" value={publicationValue} options={publicationStatuses.map((value) => ({ value, label: placeStatusLabels[value] }))} />
        <SelectFilter label="Stan działania" name="operational" value={operationalValue} options={operationalStatuses.map((value) => ({ value, label: operationalStatusLabels[value] }))} />
        <SelectFilter label="Kategoria" name="category" value={categoryValue} options={categories.map((category) => ({ value: category.slug, label: category.name }))} />
        <SelectFilter label="Rodzaj rekordu" name="recordKind" value={recordKindValue} includeAll={false} options={[{ value: "without-test", label: "Bez TEST" }, { value: "all", label: "Wszystkie" }, ...recordKinds.map((value) => ({ value, label: recordKindLabels[value] }))]} />
        <SelectFilter label="Weryfikacja" name="verification" value={verificationValue} options={(Object.keys(verificationLabels) as VerificationValue[]).map((value) => ({ value, label: verificationLabels[value] }))} />
        <SelectFilter label="Typ miejsca" name="accommodation" value={accommodationValue} options={[{ value: "yes", label: "Noclegi" }, { value: "no", label: "Pozostałe miejsca" }]} />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <SelectFilter label="Sortowanie" name="sort" value={sortValue} options={[{ value: "updated", label: "Ostatnio zmienione" }, { value: "verified", label: "Ostatnio zweryfikowane" }, { value: "name", label: "Nazwa A-Z" }]} />
          <button type="submit" title="Zastosuj filtry" className="mt-[22px] inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold hover:bg-brand-soft xl:px-3">
            <Filter aria-hidden="true" size={18} /> <span className="xl:sr-only">Zastosuj</span>
          </button>
        </div>
      </form>

      {places.length ? (
        <div>
          <div className="mb-1.5 hidden grid-cols-[minmax(150px,1.2fr)_minmax(115px,.9fr)_100px_105px_70px_105px_160px] gap-2 px-3 text-[11px] font-bold uppercase text-muted-foreground xl:grid">
            <span>Miejsce</span><span>Adres</span><span>Publikacja</span><span>Stan działania</span><span>Rodzaj</span><span>Daty</span><span>Akcje</span>
          </div>
          <ol className="space-y-1.5">
          {places.map((place) => {
            const canOpenPublicly = isPubliclyVisiblePlace(place);
            const publicHref = `/lodz/${place.primaryCategory.slug}/${place.slug}`;
            return (
              <li key={place.id} className={`rounded-md border border-border px-3 py-3 xl:py-2.5 ${place.recordKind === "TEST" ? "bg-urgent-soft/20" : "bg-white"}`}>
                <div className="grid min-w-0 gap-2.5 xl:grid-cols-[minmax(150px,1.2fr)_minmax(115px,.9fr)_100px_105px_70px_105px_160px] xl:items-center xl:gap-2">
                  <div className="min-w-0">
                    <strong className="block text-sm leading-5">{place.name}</strong>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{place.primaryCategory.name}{place.organization?.name ? ` · ${place.organization.name}` : ""}</span>
                  </div>
                  <div className="min-w-0 text-sm">
                    <span className="block line-clamp-2">{place.addressLine}</span>
                  </div>
                  <div className="space-y-1"><span className="block text-xs font-bold text-muted-foreground xl:hidden">Publikacja</span><PlacePublicationBadge status={place.publicationStatus} /></div>
                  <div className="text-sm"><span className="block text-xs font-bold text-muted-foreground xl:hidden">Stan działania</span><strong>{operationalStatusLabels[place.operationalStatus]}</strong></div>
                  <div><span className="mb-1 block text-xs font-bold text-muted-foreground xl:hidden">Rodzaj rekordu</span><PlaceRecordBadge kind={place.recordKind} /></div>
                  <div className="text-xs text-muted-foreground"><span className="block"><strong className="xl:sr-only">Weryfikacja: </strong>{formatDate(place.verifiedAt)}</span><span className="mt-0.5 block"><strong className="xl:sr-only">Edycja: </strong>{formatDate(place.updatedAt)}</span></div>
                  <div className="flex flex-wrap gap-1.5 xl:flex-nowrap xl:justify-end">
                    <ActionLink href={`/admin/miejsca/${place.id}`} label="Podgląd" icon={Eye} />
                    <ActionLink href={`/admin/miejsca/${place.id}/edytuj`} label="Edytuj" icon={Pencil} />
                    {canOpenPublicly ? <ActionLink href={publicHref} label="Otwórz publicznie" icon={ExternalLink} external compact /> : null}
                  </div>
                </div>
              </li>
            );
          })}
          </ol>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-white px-5 py-10 text-center text-sm text-muted-foreground">Brak miejsc pasujących do wybranych filtrów.</div>
      )}
    </div>
  );
}

function SelectFilter({ label, name, value, options, includeAll = true }: { label: string; name: string; value: string; options: Array<{ value: string; label: string }>; includeAll?: boolean }) {
  return (
    <label className="min-w-0 text-sm font-bold">
      <span className="mb-1 block text-xs">{label}</span>
      <select name={name} defaultValue={value} className="min-h-11 w-full rounded-lg border border-border bg-white px-2.5 py-1.5 font-normal">
        {includeAll ? <option value="all">Wszystkie</option> : null}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ActionLink({ href, label, icon: Icon, external = false, compact = false }: { href: string; label: string; icon: typeof Eye; external?: boolean; compact?: boolean }) {
  return (
    <Link href={href} target={external ? "_blank" : undefined} title={label} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-sm font-bold text-brand-strong hover:bg-brand-soft">
      <Icon aria-hidden="true" size={17} /><span className={compact ? "sr-only" : ""}>{label}</span>
    </Link>
  );
}
