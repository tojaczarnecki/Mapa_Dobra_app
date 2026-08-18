import Link from "next/link";
import { ArrowLeft, Building2, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { QuickAvailabilityForm } from "@/components/admin/places/quick-availability-form";
import { AdmissionHoursForm, AdmissionStatusForm, FacilityContactForm } from "@/components/admin/users/facility-operations";
import type { AdminPermission } from "@/generated/prisma/enums";
import { requirePlacePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { scheduleFromRows } from "@/lib/places/opening-hours";

export default async function FacilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePlacePermission("VIEW_PLACES", id);
  const [place, access] = await Promise.all([
    prisma.place.findUnique({ where: { id }, include: { organization: { select: { name: true } }, openingHours: { where: { kind: "ADMISSION" }, orderBy: [{ weekday: "asc" }, { sortOrder: "asc" }] }, accommodation: { include: { capacityGroups: { where: { active: true }, orderBy: { sortOrder: "asc" } } } } } }),
    prisma.userPlaceAccess.findUnique({ where: { adminUserId_placeId: { adminUserId: session.user.id, placeId: id } }, select: { active: true, permissions: true } }),
  ]);
  if (!place) notFound();
  const can = (permission: AdminPermission) => session.user.permissions.includes(permission) || Boolean(access?.active && access.permissions.includes(permission));
  const admissionDays = scheduleFromRows(place.openingHours, "ADMISSION");
  return <div className="space-y-5"><Link href="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ArrowLeft aria-hidden="true" size={18} />Moje placówki</Link><header className="rounded-lg border border-border bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-brand-strong">Przypisana placówka</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{place.name}</h1><p className="mt-2 text-sm text-muted-foreground">{place.addressLine}</p>{place.organization ? <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 aria-hidden="true" size={15} />{place.organization.name}</p> : null}</div>{place.phone ? <a href={`tel:${place.phone.replace(/\s+/gu, "")}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-bold"><Phone aria-hidden="true" size={17} />Zadzwoń</a> : null}</div></header>
    {!place.accommodation ? <section className="rounded-lg border border-border bg-white p-4"><h2 className="font-bold">Dane placówki</h2><p className="mt-2 text-sm text-muted-foreground">To miejsce nie posiada modułu noclegowego. Dostępne operacje wynikają z nadanych uprawnień.</p></section> : <>
      {can("UPDATE_BED_AVAILABILITY") ? <section className="rounded-lg border border-border bg-white p-4"><h2 className="text-lg font-bold">Wolne miejsca</h2><QuickAvailabilityForm placeId={place.id} groups={place.accommodation.capacityGroups} /></section> : null}
      {can("UPDATE_ADMISSION_STATUS") ? <section className="rounded-lg border border-border bg-white p-4"><h2 className="mb-3 text-lg font-bold">Status przyjęć</h2><AdmissionStatusForm placeId={place.id} value={place.accommodation.acceptsToday} /></section> : null}
      {can("UPDATE_ADMISSION_HOURS") ? <section className="rounded-lg border border-border bg-white p-4"><h2 className="mb-3 text-lg font-bold">Godziny przyjęć</h2><AdmissionHoursForm placeId={place.id} days={admissionDays} /></section> : null}
    </>}
    {can("UPDATE_PLACE_CONTACT") ? <section className="rounded-lg border border-border bg-white p-4"><h2 className="mb-3 text-lg font-bold">Kontakt placówki</h2><FacilityContactForm placeId={place.id} phone={place.phone} email={place.email} website={place.website} /></section> : null}
    {!can("UPDATE_BED_AVAILABILITY") && !can("UPDATE_ADMISSION_STATUS") && !can("UPDATE_ADMISSION_HOURS") && !can("UPDATE_PLACE_CONTACT") ? <p className="rounded-lg bg-surface-muted p-4 text-sm">Masz dostęp tylko do podglądu tego miejsca.</p> : null}
  </div>;
}
