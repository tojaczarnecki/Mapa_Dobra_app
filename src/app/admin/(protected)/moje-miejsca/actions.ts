"use server";

import { revalidatePath } from "next/cache";
import { requirePlacePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { openingRows, validateOpeningSchedule } from "@/lib/places/opening-hours";

export type FacilityActionState = { error?: string; success?: string };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const confirmablePublicationStatuses = ["PUBLISHED", "TEMPORARILY_CLOSED", "PERMANENTLY_CLOSED"] as const;

function clean(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max + 1) : "";
}

function revalidate(placeId: string, publicPath: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/moje-miejsca/${placeId}`);
  revalidatePath("/szukaj");
  revalidatePath("/znajdz-nocleg");
  revalidatePath("/mapa");
  revalidatePath(publicPath);
}

export async function confirmFacilityDataCurrent(
  placeId: string,
  _state: FacilityActionState,
  formData: FormData,
): Promise<FacilityActionState> {
  if (!uuidPattern.test(placeId)) return { error: "Nieprawidłowa placówka." };
  if (formData.get("confirmCurrent") !== "yes") {
    return { error: "Potwierdź, że sprawdziłeś aktualność danych placówki." };
  }

  const session = await requirePlacePermission("VERIFY_PLACES", placeId);
  try {
    const publicPath = await prisma.$transaction(async (transaction) => {
      const place = await transaction.place.findUniqueOrThrow({
        where: { id: placeId },
        select: {
          verificationStatus: true,
          verifiedAt: true,
          verificationSource: true,
          verificationSourceUrl: true,
          verificationNote: true,
          publicationStatus: true,
          verificationQueueStatus: true,
          slug: true,
          primaryCategory: { select: { slug: true } },
        },
      });

      if (!confirmablePublicationStatuses.includes(place.publicationStatus as (typeof confirmablePublicationStatuses)[number])) {
        throw new Error("NOT_PUBLIC");
      }
      if (place.verificationQueueStatus && place.verificationQueueStatus !== "VERIFIED") {
        throw new Error("ACTIVE_VERIFICATION");
      }

      const now = new Date();
      const representative = session.user.role === "PLACE_MANAGER";
      const publicNote = representative
        ? "Aktualność danych potwierdzona przez uprawnionego przedstawiciela placówki."
        : "Aktualność danych potwierdzona przez administratora Mapy Dobra.";

      await transaction.place.update({
        where: { id: placeId },
        data: {
          verificationStatus: "VERIFIED",
          verifiedAt: now,
          verifiedByAdminUserId: session.user.id,
          verificationSource: "OTHER",
          verificationSourceUrl: null,
          verificationNote: publicNote,
          lastEditedByAdminUserId: session.user.id,
        },
      });
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "PLACE_VERIFIED",
          entityType: "PLACE",
          entityId: placeId,
          changedFields: ["verificationStatus", "verifiedAt", "verifiedByAdminUserId", "verificationSource", "verificationSourceUrl", "verificationNote"],
          previousValues: {
            verificationStatus: place.verificationStatus,
            verifiedAt: place.verifiedAt,
            verificationSource: place.verificationSource,
            verificationSourceUrl: place.verificationSourceUrl,
            verificationNote: place.verificationNote,
          },
          newValues: {
            verificationStatus: "VERIFIED",
            verifiedAt: now,
            verificationSource: "OTHER",
            verificationSourceUrl: null,
            verificationNote: publicNote,
          },
          changeOrigin: representative ? "FACILITY_REPRESENTATIVE" : "ADMIN_MANUAL",
          sourceType: "OTHER",
          note: representative
            ? "Uprawniony przedstawiciel placówki potwierdził aktualność opublikowanych danych."
            : "Administrator potwierdził aktualność opublikowanych danych z poziomu placówki.",
        },
      });

      return `/lodz/${place.primaryCategory.slug}/${place.slug}`;
    });

    revalidate(placeId, publicPath);
    return { success: "Aktualność danych została potwierdzona." };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "NOT_PUBLIC") return { error: "Aktualność można potwierdzić tutaj tylko dla opublikowanego miejsca." };
    if (reason === "ACTIVE_VERIFICATION") return { error: "To miejsce ma otwartą weryfikację administracyjną. Zakończ ją w kolejce weryfikacji." };
    return { error: "Nie udało się potwierdzić aktualności danych." };
  }
}

export async function updateAdmissionStatus(placeId: string, _state: FacilityActionState, formData: FormData): Promise<FacilityActionState> {
  if (!uuidPattern.test(placeId)) return { error: "Nieprawidłowa placówka." };
  const session = await requirePlacePermission("UPDATE_ADMISSION_STATUS", placeId);
  const status = clean(formData.get("status"), 20);
  if (!["ACTIVE", "SUSPENDED", "UNKNOWN"].includes(status)) return { error: "Wybierz prawidłowy status przyjęć." };
  try {
    const publicPath = await prisma.$transaction(async (transaction) => {
      const place = await transaction.place.findUniqueOrThrow({ where: { id: placeId }, select: { slug: true, primaryCategory: { select: { slug: true } }, accommodation: { select: { id: true, acceptsToday: true, availabilityState: true } } } });
      if (!place.accommodation) throw new Error("NO_ACCOMMODATION");
      const acceptsToday = status === "ACTIVE" ? "YES" : status === "SUSPENDED" ? "NO" : "UNKNOWN";
      const availabilityState = status === "SUSPENDED" ? "SUSPENDED" : status === "UNKNOWN" ? "UNKNOWN" : place.accommodation.availabilityState === "SUSPENDED" ? "UNKNOWN" : place.accommodation.availabilityState;
      await transaction.accommodationDetails.update({ where: { id: place.accommodation.id }, data: { acceptsToday, availabilityState } });
      await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: "ADMISSION_STATUS_UPDATED", entityType: "PLACE", entityId: placeId, changedFields: ["accommodation.acceptsToday", "accommodation.availabilityState"], previousValues: { acceptsToday: place.accommodation.acceptsToday, availabilityState: place.accommodation.availabilityState }, newValues: { acceptsToday, availabilityState }, changeOrigin: session.user.role === "PLACE_MANAGER" ? "FACILITY_REPRESENTATIVE" : "ADMIN_MANUAL", note: "Zaktualizowano bieżący status przyjęć." } });
      return `/lodz/${place.primaryCategory.slug}/${place.slug}`;
    });
    revalidate(placeId, publicPath);
    return { success: "Status przyjęć został zaktualizowany." };
  } catch { return { error: "Nie udało się zapisać statusu przyjęć." }; }
}

export async function updateAdmissionHours(placeId: string, _state: FacilityActionState, formData: FormData): Promise<FacilityActionState> {
  if (!uuidPattern.test(placeId)) return { error: "Nieprawidłowa placówka." };
  const session = await requirePlacePermission("UPDATE_ADMISSION_HOURS", placeId);
  const raw = clean(formData.get("openingHoursJson"), 30_000);
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { error: "Nie udało się odczytać godzin." }; }
  const validation = validateOpeningSchedule(parsed);
  if (!validation.ok) return { error: validation.error };
  try {
    const publicPath = await prisma.$transaction(async (transaction) => {
      const place = await transaction.place.findUniqueOrThrow({ where: { id: placeId }, select: { slug: true, primaryCategory: { select: { slug: true } }, accommodation: { select: { id: true } }, openingHours: { where: { kind: "ADMISSION" } } } });
      if (!place.accommodation) throw new Error("NO_ACCOMMODATION");
      await transaction.openingHours.deleteMany({ where: { placeId, kind: "ADMISSION" } });
      await transaction.openingHours.createMany({ data: openingRows(validation.days, "ADMISSION").map((row) => ({ ...row, placeId })) });
      await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: "ADMISSION_HOURS_UPDATED", entityType: "PLACE", entityId: placeId, changedFields: ["openingHours.ADMISSION"], previousValues: { rows: place.openingHours }, newValues: { days: validation.days }, changeOrigin: session.user.role === "PLACE_MANAGER" ? "FACILITY_REPRESENTATIVE" : "ADMIN_MANUAL", note: "Zaktualizowano godziny przyjęć placówki." } });
      return `/lodz/${place.primaryCategory.slug}/${place.slug}`;
    });
    revalidate(placeId, publicPath);
    return { success: "Godziny przyjęć zostały zapisane." };
  } catch { return { error: "Nie udało się zapisać godzin przyjęć." }; }
}

export async function updateFacilityContact(placeId: string, _state: FacilityActionState, formData: FormData): Promise<FacilityActionState> {
  if (!uuidPattern.test(placeId)) return { error: "Nieprawidłowa placówka." };
  const session = await requirePlacePermission("UPDATE_PLACE_CONTACT", placeId);
  const phone = clean(formData.get("phone"), 50);
  const email = clean(formData.get("email"), 320).toLocaleLowerCase("pl-PL");
  const website = clean(formData.get("website"), 2048);
  if (phone.length > 50 || email.length > 320 || website.length > 2048 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email))) return { error: "Sprawdź dane kontaktowe." };
  if (website) { try { const url = new URL(website); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); } catch { return { error: "Podaj pełny adres WWW zaczynający się od http:// lub https://." }; } }
  try {
    const publicPath = await prisma.$transaction(async (transaction) => {
      const place = await transaction.place.findUniqueOrThrow({ where: { id: placeId }, select: { phone: true, email: true, website: true, slug: true, primaryCategory: { select: { slug: true } } } });
      await transaction.place.update({ where: { id: placeId }, data: { phone: phone || null, email: email || null, website: website || null, lastEditedByAdminUserId: session.user.id } });
      await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: "PLACE_CONTACT_UPDATED", entityType: "PLACE", entityId: placeId, changedFields: ["phone", "email", "website"], previousValues: { phone: place.phone, email: place.email, website: place.website }, newValues: { phone: phone || null, email: email || null, website: website || null }, changeOrigin: session.user.role === "PLACE_MANAGER" ? "FACILITY_REPRESENTATIVE" : "ADMIN_MANUAL", note: "Kontakt zaktualizowany przez uprawnionego użytkownika placówki." } });
      return `/lodz/${place.primaryCategory.slug}/${place.slug}`;
    });
    revalidate(placeId, publicPath);
    return { success: "Dane kontaktowe zostały zapisane." };
  } catch { return { error: "Nie udało się zapisać danych kontaktowych." }; }
}
