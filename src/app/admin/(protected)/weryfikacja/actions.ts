"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { geocodePublicAddress, type GeocodingSuggestion } from "@/lib/geocoding/geocoder";
import { requirePermission } from "@/lib/admin/session";
import { slugifyImportValue } from "@/lib/imports/caritas-gdzie-parser";
import { prisma } from "@/lib/prisma";
import { deriveTodayHoursLabel, openingRows, validateOpeningSchedule } from "@/lib/places/opening-hours";
import { getVerificationCompleteness } from "@/lib/verification/completeness";
import { contactReasonsBlockingPublication, parseVerificationContactMethod, parseVerificationContactReasons } from "@/lib/verification/contact";
import { resolveLocationSource } from "@/lib/verification/location";
import { getCandidateComparisonOptions } from "@/lib/verification/queue";
import { parseOrganizationDecision, resolveEffectiveOrganization } from "@/lib/imports/organization-decisions";
import { canUndoCandidateResolution, hasSpreadsheetSourceRowDuplicate, isAllowedSpreadsheetPlaceId, isSpreadsheetBatchMetadata, isSpreadsheetPlaceReviewCandidate, restoreMatcherMatchedPlaceId } from "@/lib/imports/spreadsheet-place-review";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const verificationSources = ["PHONE_CALL", "ORGANIZATION_EMAIL", "VISIT", "OFFICIAL_WEBSITE", "SOCIAL_MEDIA", "OTHER"] as const;

export type VerificationActionState = { error?: string; success?: string };
export type GeocodingActionState = {
  error?: string;
  suggestions?: GeocodingSuggestion[];
  cached?: boolean;
  ambiguous?: boolean;
  attempts?: Array<{ id: "structured" | "normalized" | "place-context"; label: string; query: string; resultCount: number; cached: boolean }>;
};

function formText(formData: FormData, key: string, max: number, required = false) {
  const value = formData.get(key);
  if (typeof value !== "string") return required ? null : "";
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > max) return null;
  return normalized;
}

function jsonRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function jsonText(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function optionalUrl(value: string | null) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function revalidateVerification(id: string) {
  revalidatePath("/admin/weryfikacja");
  revalidatePath(`/admin/weryfikacja/${id}`);
  revalidatePath("/admin/importy");
  revalidatePath("/admin/miejsca");
}

async function readiness(transaction: Prisma.TransactionClient, placeId: string, verified = false, resolveContact = false) {
  const place = await transaction.place.findUniqueOrThrow({
    where: { id: placeId },
    select: {
      name: true,
      addressLine: true,
      latitude: true,
      longitude: true,
      locationSource: true,
      phone: true,
      email: true,
      website: true,
      recordKind: true,
      publicationStatus: true,
      verificationQueueStatus: true,
      verificationStatus: true,
      verifiedAt: true,
      verificationSource: true,
      primaryCategory: { select: { active: true } },
      _count: { select: { categories: true } },
      openingHours: { select: { status: true } },
      requirements: { select: { state: true } },
      createdFromImport: { select: { id: true } },
      importMatchCandidates: { where: { status: "REQUIRES_REVIEW", resolution: null }, select: { id: true } },
      verificationContact: { select: { reasons: true } },
      accommodation: { select: { targetGroups: true } },
    },
  });
  return getVerificationCompleteness({
    name: place.name,
    addressLine: place.addressLine,
    latitude: place.latitude === null ? null : Number(place.latitude),
    longitude: place.longitude === null ? null : Number(place.longitude),
    locationSource: place.locationSource,
    phone: place.phone,
    email: place.email,
    website: place.website,
    recordKind: place.recordKind,
    publicationStatus: place.publicationStatus,
    verificationStatus: verified ? "VERIFIED" : place.verificationStatus,
    verifiedAt: verified ? new Date() : place.verifiedAt,
    verificationSource: place.verificationSource,
    primaryCategoryActive: place.primaryCategory.active,
    categoryCount: place._count.categories,
    hasKnownOpeningHours: place.openingHours.some((row) => row.status !== "UNKNOWN"),
    hasKnownRequirements: place.requirements.some((row) => row.state !== "UNKNOWN"),
    hasImportSource: Boolean(place.createdFromImport),
    hasUnresolvedConflict: place.importMatchCandidates.length > 0,
    blockingContactReasons: place.verificationQueueStatus === "CONTACT_REQUIRED" && !resolveContact
      ? contactReasonsBlockingPublication(place.verificationContact?.reasons ?? [], Boolean(place.accommodation))
      : [],
    accommodation: Boolean(place.accommodation),
    accommodationTargetGroupCount: place.accommodation?.targetGroups.length ?? 0,
  });
}

export async function startPlaceVerification(placeId: string) {
  const session = await requirePermission("VERIFY_PLACES");
  if (!uuidPattern.test(placeId)) return;
  await prisma.$transaction(async (transaction) => {
    const place = await transaction.place.findUnique({ where: { id: placeId }, select: { verificationQueueStatus: true } });
    if (!place || place.verificationQueueStatus !== "PENDING") return;
    await transaction.place.update({ where: { id: placeId }, data: { verificationQueueStatus: "IN_PROGRESS", lastEditedByAdminUserId: session.user.id } });
    await transaction.auditLog.create({
      data: {
        adminUserId: session.user.id,
        action: "VERIFICATION_STARTED",
        entityType: "PLACE",
        entityId: placeId,
        changedFields: ["verificationQueueStatus"],
        previousValues: { verificationQueueStatus: "PENDING" },
        newValues: { verificationQueueStatus: "IN_PROGRESS" },
        changeOrigin: "ADMIN_MANUAL",
        note: "Rozpoczęto weryfikację miejsca.",
      },
    });
  });
  revalidateVerification(placeId);
}

export async function requestPlaceGeocoding(placeId: string): Promise<GeocodingActionState> {
  await requirePermission("VERIFY_PLACES");
  if (!uuidPattern.test(placeId)) return { error: "Nieprawidłowy identyfikator miejsca." };
  const place = await prisma.place.findUnique({ where: { id: placeId }, select: { name: true, addressLine: true, street: true, buildingNumber: true, postalCode: true, city: true } });
  if (!place) return { error: "Nie znaleziono miejsca." };
  try {
    const result = await geocodePublicAddress({ ...place, country: "Polska" });
    if (!result.suggestions.length) return { ...result, error: "Nie udało się ustalić lokalizacji. Ustaw punkt ręcznie." };
    return { ...result, ambiguous: !result.suggestions.some((suggestion) => suggestion.quality === "HIGH") };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Nie udało się pobrać propozycji lokalizacji." };
  }
}

export async function markVerificationContactRequired(
  placeId: string,
  _previousState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const session = await requirePermission("VERIFY_PLACES");
  if (!uuidPattern.test(placeId)) return { error: "Nieprawidłowy identyfikator miejsca." };
  const reasons = parseVerificationContactReasons(formData.getAll("contactReasons"));
  const note = formText(formData, "requiredNote", 1000);
  if (!reasons.length) return { error: "Wybierz przynajmniej jeden powód wymagania kontaktu." };
  if (note === null) return { error: "Notatka jest zbyt długa." };
  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.place.findUnique({
        where: { id: placeId },
        select: { verificationQueueStatus: true, verificationContact: { select: { reasons: true, requiredNote: true } } },
      });
      if (!current) throw new Error("NOT_FOUND");
      const now = new Date();
      await transaction.placeVerificationContact.upsert({
        where: { placeId },
        create: { placeId, reasons, requiredNote: note || null, requiredAt: now, requiredByAdminUserId: session.user.id },
        update: {
          reasons,
          requiredNote: note || null,
          requiredAt: now,
          requiredByAdminUserId: session.user.id,
          contactedAt: null,
          contactMethod: null,
          contactResult: null,
          contactedByAdminUserId: null,
        },
      });
      await transaction.place.update({ where: { id: placeId }, data: { verificationQueueStatus: "CONTACT_REQUIRED", lastEditedByAdminUserId: session.user.id } });
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "VERIFICATION_CONTACT_REQUIRED",
          entityType: "PLACE",
          entityId: placeId,
          changedFields: ["verificationQueueStatus", "verificationContact.reasons", "verificationContact.requiredNote"],
          previousValues: { verificationQueueStatus: current.verificationQueueStatus, reasons: current.verificationContact?.reasons ?? [], note: current.verificationContact?.requiredNote ?? null },
          newValues: { verificationQueueStatus: "CONTACT_REQUIRED", reasons, note: note || null },
          changeOrigin: "ADMIN_MANUAL",
          note: "Miejsce odłożono do kolejki wymagającej kontaktu.",
        },
      });
    });
    revalidateVerification(placeId);
    return { success: "Miejsce dodano do kolejki wymagającej kontaktu." };
  } catch {
    return { error: "Nie udało się zapisać stanu kontaktu. Spróbuj ponownie." };
  }
}

export async function recordVerificationContact(
  placeId: string,
  _previousState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const session = await requirePermission("VERIFY_PLACES");
  if (!uuidPattern.test(placeId)) return { error: "Nieprawidłowy identyfikator miejsca." };
  const method = parseVerificationContactMethod(formData.get("contactMethod"));
  const result = formText(formData, "contactResult", 2000, true);
  const contactedAtValue = formText(formData, "contactedAt", 40, true);
  const contactedAt = contactedAtValue ? new Date(contactedAtValue) : null;
  if (!method) return { error: "Wybierz formę kontaktu." };
  if (!result) return { error: "Krótko zapisz rezultat kontaktu." };
  if (!contactedAt || Number.isNaN(contactedAt.getTime()) || contactedAt.getTime() > Date.now() + 5 * 60 * 1000) return { error: "Podaj prawidłową datę kontaktu." };
  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.placeVerificationContact.findUnique({ where: { placeId } });
      if (!current) throw new Error("NOT_FOUND");
      await transaction.placeVerificationContact.update({
        where: { placeId },
        data: { contactedAt, contactMethod: method, contactResult: result, contactedByAdminUserId: session.user.id },
      });
      await transaction.place.update({ where: { id: placeId }, data: { lastEditedByAdminUserId: session.user.id } });
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "VERIFICATION_CONTACT_RECORDED",
          entityType: "PLACE",
          entityId: placeId,
          changedFields: ["verificationContact.contactedAt", "verificationContact.contactMethod", "verificationContact.contactResult"],
          previousValues: { contactedAt: current.contactedAt, contactMethod: current.contactMethod, contactResult: current.contactResult },
          newValues: { contactedAt, contactMethod: method, contactResult: result },
          changeOrigin: "ADMIN_MANUAL",
          note: "Zapisano rezultat kontaktu. Miejsce nie zostało automatycznie oznaczone jako zweryfikowane.",
        },
      });
    });
    revalidateVerification(placeId);
    return { success: "Rezultat kontaktu zapisano. Weryfikację zakończ osobną akcją." };
  } catch {
    return { error: "Nie udało się zapisać rezultatu kontaktu. Spróbuj ponownie." };
  }
}

export async function savePlaceLocation(
  placeId: string,
  nextId: string | null,
  _previousState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const session = await requirePermission("VERIFY_PLACES");
  if (!uuidPattern.test(placeId)) return { error: "Nieprawidłowy identyfikator miejsca." };
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const source = resolveLocationSource(formData.get("locationSource"));
  if (!source) return { error: "Wybierz propozycję geokodera albo ustaw lokalizację ręcznie." };
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 49 || latitude > 55 || longitude < 14 || longitude > 25) {
    return { error: "Podaj prawidłowe współrzędne lokalizacji w Polsce." };
  }
  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.place.findUnique({
        where: { id: placeId },
        select: { latitude: true, longitude: true, locationSource: true, verificationQueueStatus: true, verificationStatus: true },
      });
      if (!current) throw new Error("NOT_FOUND");
      await transaction.place.update({
        where: { id: placeId },
        data: {
          latitude,
          longitude,
          locationSource: source,
          locationUpdatedAt: new Date(),
          verificationQueueStatus: current.verificationQueueStatus === "PENDING" ? "IN_PROGRESS" : current.verificationQueueStatus,
          lastEditedByAdminUserId: session.user.id,
        },
      });
      const complete = await readiness(transaction, placeId);
      if (current.verificationStatus === "VERIFIED" && current.verificationQueueStatus !== "CONTACT_REQUIRED") {
        await transaction.place.update({ where: { id: placeId }, data: { verificationQueueStatus: complete.readyToPublish ? "READY" : "VERIFIED" } });
      }
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "LOCATION_UPDATED",
          entityType: "PLACE",
          entityId: placeId,
          changedFields: ["latitude", "longitude", "locationSource"],
          previousValues: { latitude: current.latitude?.toString() ?? null, longitude: current.longitude?.toString() ?? null, locationSource: current.locationSource },
          newValues: { latitude, longitude, locationSource: source },
          changeOrigin: "ADMIN_MANUAL",
          note: source === "GEOCODER" ? "Administrator zatwierdził propozycję geokodera." : "Administrator ustawił lokalizację ręcznie.",
        },
      });
    });
  } catch {
    return { error: "Nie udało się zapisać lokalizacji. Spróbuj ponownie." };
  }
  revalidateVerification(placeId);
  revalidatePath(`/admin/miejsca/${placeId}`);
  if (formData.get("intent") === "next" && nextId && uuidPattern.test(nextId)) redirect(`/admin/weryfikacja/${nextId}`);
  return { success: source === "GEOCODER" ? "Proponowana lokalizacja została zatwierdzona." : "Lokalizacja ustawiona ręcznie." };
}

export async function saveVerificationWorkingData(
  placeId: string,
  nextId: string | null,
  _previousState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const session = await requirePermission("VERIFY_PLACES");
  if (!uuidPattern.test(placeId)) return { error: "Nieprawidłowy identyfikator miejsca." };
  const name = formText(formData, "name", 250, true);
  const addressLine = formText(formData, "addressLine", 400, true);
  const street = formText(formData, "street", 300);
  const buildingNumber = formText(formData, "buildingNumber", 40);
  const postalCode = formText(formData, "postalCode", 20);
  const city = formText(formData, "city", 120, true);
  const district = formText(formData, "district", 120);
  const phone = formText(formData, "phone", 50);
  const email = formText(formData, "email", 320);
  const website = formText(formData, "website", 2048);
  const organizationId = formText(formData, "organizationId", 36);
  const primaryCategorySlug = formText(formData, "primaryCategorySlug", 120, true);
  const categorySlugs = [...new Set(formData.getAll("categorySlugs").filter((value): value is string => typeof value === "string"))];
  let openingValue: unknown;
  try {
    openingValue = JSON.parse(String(formData.get("openingHoursJson") ?? "null"));
  } catch {
    return { error: "Nie udało się odczytać godzin działania." };
  }
  const opening = validateOpeningSchedule(openingValue);
  if (!name || !addressLine || !city || !primaryCategorySlug || !categorySlugs.includes(primaryCategorySlug)) {
    return { error: "Uzupełnij nazwę, adres i wybierz główną kategorię należącą do miejsca." };
  }
  if ([street, buildingNumber, postalCode, district, phone, email, website, organizationId].some((value) => value === null)) {
    return { error: "Jedno z pól przekracza dozwoloną długość." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) return { error: "Podaj prawidłowy adres e-mail." };
  if (!optionalUrl(website)) return { error: "Adres WWW musi rozpoczynać się od http:// lub https://." };
  if (!opening.ok) return { error: opening.error };

  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.place.findUnique({ where: { id: placeId }, include: { categories: { include: { category: true } }, openingHours: true } });
      if (!current) throw new Error("NOT_FOUND");
      const categories = await transaction.category.findMany({ where: { slug: { in: categorySlugs }, active: true }, select: { id: true, slug: true } });
      if (categories.length !== categorySlugs.length) throw new Error("CATEGORY");
      const primaryCategory = categories.find((category) => category.slug === primaryCategorySlug);
      if (!primaryCategory) throw new Error("CATEGORY");
      if (organizationId) {
        const organization = await transaction.organization.findFirst({ where: { id: organizationId, active: true }, select: { id: true } });
        if (!organization) throw new Error("ORGANIZATION");
      }
      await transaction.placeCategory.deleteMany({ where: { placeId } });
      await transaction.openingHours.deleteMany({ where: { placeId, kind: "OPERATION" } });
      await transaction.place.update({
        where: { id: placeId },
        data: {
          name,
          addressLine,
          street: street || null,
          buildingNumber: buildingNumber || null,
          postalCode: postalCode || null,
          city,
          district: district || null,
          phone: phone || null,
          email: email || null,
          website: website || null,
          organizationId: organizationId || null,
          primaryCategoryId: primaryCategory.id,
          todayHoursLabel: deriveTodayHoursLabel(opening.days),
          verificationQueueStatus: current.verificationQueueStatus === "PENDING" ? "IN_PROGRESS" : current.verificationQueueStatus,
          lastEditedByAdminUserId: session.user.id,
          categories: { create: categorySlugs.map((slug, sortOrder) => ({ categoryId: categories.find((item) => item.slug === slug)!.id, sortOrder })) },
          openingHours: { create: openingRows(opening.days, "OPERATION") },
        },
      });
      if (current.verificationStatus === "VERIFIED") {
        const complete = await readiness(transaction, placeId);
        if (current.verificationQueueStatus !== "CONTACT_REQUIRED") {
          await transaction.place.update({ where: { id: placeId }, data: { verificationQueueStatus: complete.readyToPublish ? "READY" : "VERIFIED" } });
        }
      }
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "PLACE_UPDATED",
          entityType: "PLACE",
          entityId: placeId,
          changedFields: ["name", "address", "contact", "organization", "categories", "openingHours"],
          previousValues: {
            name: current.name,
            addressLine: current.addressLine,
            phone: current.phone,
            email: current.email,
            website: current.website,
            categorySlugs: current.categories.map((item) => item.category.slug),
          },
          newValues: { name, addressLine, phone: phone || null, email: email || null, website: website || null, categorySlugs },
          changeOrigin: "ADMIN_MANUAL",
          note: "Zapisano dane robocze podczas weryfikacji importu.",
        },
      });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "CATEGORY") return { error: "Wybrana kategoria jest nieaktywna lub nie istnieje." };
    if (reason === "ORGANIZATION") return { error: "Wybrana organizacja jest nieaktywna lub nie istnieje." };
    return { error: "Nie udało się zapisać danych roboczych. Spróbuj ponownie." };
  }
  revalidateVerification(placeId);
  revalidatePath(`/admin/miejsca/${placeId}`);
  if (formData.get("intent") === "next" && nextId && uuidPattern.test(nextId)) redirect(`/admin/weryfikacja/${nextId}`);
  return { success: "Dane robocze zostały zapisane." };
}

export async function markPlaceVerified(
  placeId: string,
  _previousState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const session = await requirePermission("VERIFY_PLACES");
  if (!uuidPattern.test(placeId)) return { error: "Nieprawidłowy identyfikator miejsca." };
  const source = formData.get("verificationSource");
  const sourceUrl = formText(formData, "sourceUrl", 2048);
  const note = formText(formData, "note", 1000);
  if (typeof source !== "string" || !verificationSources.includes(source as (typeof verificationSources)[number])) return { error: "Wybierz źródło aktualnej weryfikacji." };
  if (sourceUrl === null || !optionalUrl(sourceUrl)) return { error: "Podaj prawidłowy URL źródła lub pozostaw pole puste." };
  if (note === null) return { error: "Notatka jest zbyt długa." };
  try {
    const queueStatus = await prisma.$transaction(async (transaction) => {
      const current = await transaction.place.findUnique({ where: { id: placeId }, select: { verificationStatus: true, verifiedAt: true, verificationSource: true } });
      if (!current) throw new Error("NOT_FOUND");
      const now = new Date();
      await transaction.place.update({
        where: { id: placeId },
        data: {
          verificationStatus: "VERIFIED",
          verifiedAt: now,
          verifiedByAdminUserId: session.user.id,
          verificationSource: source as (typeof verificationSources)[number],
          verificationSourceUrl: sourceUrl || null,
          verificationNote: note || null,
          lastEditedByAdminUserId: session.user.id,
        },
      });
      const complete = await readiness(transaction, placeId, true, true);
      const nextStatus = complete.readyToPublish ? "READY" as const : "VERIFIED" as const;
      await transaction.place.update({ where: { id: placeId }, data: { verificationQueueStatus: nextStatus } });
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "PLACE_VERIFIED",
          entityType: "PLACE",
          entityId: placeId,
          changedFields: ["verificationStatus", "verifiedAt", "verificationSource", "verificationSourceUrl", "verificationQueueStatus"],
          previousValues: { verificationStatus: current.verificationStatus, verifiedAt: current.verifiedAt, verificationSource: current.verificationSource },
          newValues: { verificationStatus: "VERIFIED", verifiedAt: now, verificationSource: source, verificationSourceUrl: sourceUrl || null, verificationQueueStatus: nextStatus },
          changeOrigin: "ADMIN_MANUAL",
          sourceType: source as (typeof verificationSources)[number],
          note: note || "Administrator potwierdził aktualność danych.",
        },
      });
      return nextStatus;
    });
    revalidateVerification(placeId);
    revalidatePath(`/admin/miejsca/${placeId}`);
    return { success: queueStatus === "READY" ? "Miejsce zweryfikowano i jest gotowe do świadomej publikacji." : "Miejsce zweryfikowano, ale wymaga jeszcze uzupełnienia danych wymaganych do publikacji." };
  } catch {
    return { error: "Nie udało się zapisać weryfikacji. Spróbuj ponownie." };
  }
}

export async function publishVerifiedPlace(placeId: string): Promise<VerificationActionState> {
  const session = await requirePermission("PUBLISH_PLACES");
  if (!uuidPattern.test(placeId)) return { error: "Nieprawidłowy identyfikator miejsca." };
  try {
    const publicPath = await prisma.$transaction(async (transaction) => {
      const place = await transaction.place.findUnique({
        where: { id: placeId },
        include: { primaryCategory: true, categories: { include: { category: true } } },
      });
      if (!place || place.verificationQueueStatus !== "READY") {
        throw new Error("NOT_READY");
      }
      const complete = await readiness(transaction, placeId);
      if (!complete.readyToPublish) {
        throw new Error("NOT_READY");
      }
      await transaction.place.update({ where: { id: placeId }, data: { publicationStatus: "PUBLISHED", verificationQueueStatus: "VERIFIED", lastEditedByAdminUserId: session.user.id } });
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "PLACE_PUBLISHED",
          entityType: "PLACE",
          entityId: placeId,
          changedFields: ["publicationStatus", "verificationQueueStatus"],
          previousValues: { publicationStatus: place.publicationStatus, verificationQueueStatus: place.verificationQueueStatus },
          newValues: { publicationStatus: "PUBLISHED", verificationQueueStatus: "VERIFIED" },
          changeOrigin: "ADMIN_MANUAL",
          note: "Administrator świadomie opublikował zweryfikowane miejsce.",
        },
      });
      return `/lodz/${place.primaryCategory.slug}/${place.slug}`;
    });
    revalidateVerification(placeId);
    revalidatePath(publicPath);
    revalidatePath("/szukaj");
    revalidatePath("/mapa");
    revalidatePath("/znajdz-nocleg");
    return { success: "Miejsce zostało opublikowane." };
  } catch {
    return { error: "Miejsce nie spełnia jeszcze warunków publikacji albo nie jest rekordem PRODUCTION." };
  }
}

export async function startCandidateVerification(candidateId: string) {
  const session = await requirePermission("VERIFY_PLACES");
  if (!uuidPattern.test(candidateId)) return;
  await prisma.$transaction(async (transaction) => {
    const candidate = await transaction.importCandidate.findUnique({ where: { id: candidateId }, select: { queueStatus: true, status: true, resolution: true, proposedData: true, importBatch: { select: { metadata: true } } } });
    const legacySpreadsheetReview = candidate ? isSpreadsheetPlaceReviewCandidate(candidate) : false;
    if (!candidate || (candidate.queueStatus !== "PENDING" && !legacySpreadsheetReview)) return;
    await transaction.importCandidate.update({ where: { id: candidateId }, data: { queueStatus: "IN_PROGRESS" } });
    await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: "VERIFICATION_STARTED", entityType: "IMPORT_CANDIDATE", entityId: candidateId, changedFields: ["queueStatus"], previousValues: { queueStatus: "PENDING" }, newValues: { queueStatus: "IN_PROGRESS" }, changeOrigin: "SOURCE_IMPORT", sourceReferenceId: candidateId, note: "Rozpoczęto analizę kandydata importowego." } });
  });
  revalidateVerification(candidateId);
}

export async function resolveCandidateSamePlace(
  candidateId: string,
  _previousState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const session = await requirePermission("VERIFY_PLACES");
  const placeId = formText(formData, "placeId", 36, true);
  const note = formText(formData, "note", 1000);
  if (!uuidPattern.test(candidateId) || !placeId || !uuidPattern.test(placeId) || note === null) return { error: "Wybierz prawidłowe istniejące miejsce." };
  const candidateContext = await prisma.importCandidate.findUnique({ where: { id: candidateId }, select: { matchedPlaceId: true, status: true, resolution: true, queueStatus: true, proposedData: true, importBatch: { select: { metadata: true } } } });
  const spreadsheetPlaceReview = candidateContext ? isSpreadsheetPlaceReviewCandidate(candidateContext) || (isSpreadsheetBatchMetadata(candidateContext.importBatch.metadata) && candidateContext.queueStatus === "PENDING" && !candidateContext.resolution) : false;
  if (candidateContext && isSpreadsheetBatchMetadata(candidateContext.importBatch.metadata) && !spreadsheetPlaceReview && !candidateContext.resolution) return { error: "Ten kandydat ma inny typ konfliktu i nie może zostać rozstrzygnięty w tym kroku." };
  const allowedSpreadsheetPlaceIds = spreadsheetPlaceReview
    ? new Set((await getCandidateComparisonOptions(candidateId)).suggestions.map((place) => place.id).concat(candidateContext?.matchedPlaceId ?? ""))
    : null;
  if (spreadsheetPlaceReview && !isAllowedSpreadsheetPlaceId([...allowedSpreadsheetPlaceIds ?? []], placeId)) return { error: "Wybierz miejsce wskazane w analizie tego kandydata." };
  try {
    await prisma.$transaction(async (transaction) => {
      const [candidate, place] = await Promise.all([
        transaction.importCandidate.findUnique({ where: { id: candidateId }, select: { id: true, status: true, matchedPlaceId: true, resolution: true, proposedData: true, importBatch: { select: { metadata: true } } } }),
        transaction.place.findUnique({ where: { id: placeId }, select: { id: true, name: true } }),
      ]);
      if (!candidate || !place) throw new Error("NOT_FOUND");
      if (candidate.resolution) throw new Error("ALREADY_RESOLVED");
      if (spreadsheetPlaceReview && !isAllowedSpreadsheetPlaceId([...allowedSpreadsheetPlaceIds ?? []], placeId)) throw new Error("INVALID_PLACE_OPTION");
      await transaction.importCandidate.update({ where: { id: candidateId }, data: { status: "MATCH_EXISTING", matchedPlaceId: placeId, resolution: "SAME_PLACE", queueStatus: "VERIFIED", resolvedAt: new Date(), resolvedByAdminUserId: session.user.id, resolutionNote: note || null } });
      await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: "IMPORT_CONFLICT_RESOLVED", entityType: "IMPORT_CANDIDATE", entityId: candidateId, changedFields: ["status", "matchedPlaceId", "resolution", "queueStatus"], previousValues: { status: candidate.status, matchedPlaceId: candidate.matchedPlaceId }, newValues: { status: "MATCH_EXISTING", matchedPlaceId: placeId, resolution: "SAME_PLACE", queueStatus: "VERIFIED" }, changeOrigin: "SOURCE_IMPORT", sourceReferenceId: candidateId, note: note || `Połączono źródło z miejscem: ${place.name}.` } });
    });
    revalidateVerification(candidateId);
    return { success: "Źródło powiązano z istniejącym miejscem bez nadpisywania jego danych." };
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_RESOLVED") return { error: "Ten kandydat został już rozstrzygnięty." };
    if (error instanceof Error && error.message === "INVALID_PLACE_OPTION") return { error: "Wybierz miejsce wskazane w analizie tego kandydata." };
    return { error: "Nie udało się powiązać kandydata z miejscem." };
  }
}

async function uniquePlaceSlug(transaction: Prisma.TransactionClient, name: string, candidateId: string) {
  const base = slugifyImportValue(name).slice(0, 170) || `miejsce-${candidateId.slice(0, 8)}`;
  let slug = base;
  let suffix = 1;
  while (await transaction.place.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${candidateId.slice(0, 6)}${suffix > 1 ? `-${suffix}` : ""}`;
    suffix += 1;
  }
  return slug;
}

function candidateOpeningRows(value: unknown, kind: "OPERATION" | "ADMISSION") {
  const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
  const statuses = ["OPEN", "CLOSED", "UNKNOWN"] as const;
  if (!Array.isArray(value)) return [];
  return value.flatMap((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const item = row as Record<string, unknown>;
    if (typeof item.weekday !== "string" || !weekdays.includes(item.weekday as (typeof weekdays)[number]) || typeof item.status !== "string" || !statuses.includes(item.status as (typeof statuses)[number])) return [];
    return [{
      kind,
      weekday: item.weekday as (typeof weekdays)[number],
      status: item.status as (typeof statuses)[number],
      opensAt: typeof item.opensAt === "string" ? item.opensAt.slice(0, 5) : null,
      closesAt: typeof item.closesAt === "string" ? item.closesAt.slice(0, 5) : null,
      note: typeof item.note === "string" ? item.note.slice(0, 240) : null,
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
    }];
  });
}

function candidateRequirements(value: unknown) {
  const kinds = ["REFERRAL", "DOCUMENT", "FEE", "LODZ_REGISTRATION", "APPOINTMENT", "OTHER"] as const;
  const states = ["YES", "NO", "UNKNOWN"] as const;
  if (!Array.isArray(value)) return [];
  return value.flatMap((row, sortOrder) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const item = row as Record<string, unknown>;
    if (typeof item.kind !== "string" || !kinds.includes(item.kind as (typeof kinds)[number]) || typeof item.state !== "string" || !states.includes(item.state as (typeof states)[number])) return [];
    return [{ kind: item.kind as (typeof kinds)[number], state: item.state as (typeof states)[number], label: typeof item.label === "string" ? item.label.slice(0, 240) : item.kind, note: null, sortOrder }];
  });
}

function candidateAccessibility(value: unknown) {
  const features = ["STEP_FREE_ENTRANCE", "RAMP", "ELEVATOR", "ACCESSIBLE_TOILET", "ACCESSIBLE_SHOWER", "WHEELCHAIR_PLACE", "ASSISTANCE_DOG", "CARE_SERVICES", "STAY_WITH_ASSISTANT", "OTHER"] as const;
  const states = ["YES", "NO", "UNKNOWN"] as const;
  if (!Array.isArray(value)) return [];
  return value.flatMap((row, sortOrder) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const item = row as Record<string, unknown>;
    if (typeof item.feature !== "string" || !features.includes(item.feature as (typeof features)[number]) || typeof item.state !== "string" || !states.includes(item.state as (typeof states)[number])) return [];
    return [{ feature: item.feature as (typeof features)[number], state: item.state as (typeof states)[number], label: item.feature.slice(0, 240), note: null, sortOrder }];
  });
}

function candidateAccommodation(value: unknown) {
  const types = ["SHELTER", "NIGHT_SHELTER", "WARMING_CENTER", "HOSTEL", "INTERVENTION_HOSTEL", "CARE_SHELTER", "WOMEN_WITH_CHILDREN_HOME", "OTHER"] as const;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.type !== "string" || !types.includes(item.type as (typeof types)[number])) return null;
  const targetGroups = Array.isArray(item.targetGroups) ? item.targetGroups.filter((group): group is string => typeof group === "string").slice(0, 30) : [];
  const capacityGroups = Array.isArray(item.capacityGroups) ? item.capacityGroups.flatMap((group) => {
    if (!group || typeof group !== "object" || Array.isArray(group)) return [];
    const capacity = group as Record<string, unknown>;
    const totalBeds = typeof capacity.totalBeds === "number" && Number.isInteger(capacity.totalBeds) && capacity.totalBeds >= 0 ? capacity.totalBeds : null;
    return [{ label: typeof capacity.label === "string" ? capacity.label.slice(0, 160) : "Miejsca ogółem", totalBeds, availableBeds: null }];
  }) : [];
  return { type: item.type as (typeof types)[number], targetGroups, capacityGroups };
}

export async function resolveCandidateDifferentPlace(
  candidateId: string,
  _previousState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const session = await requirePermission("VERIFY_PLACES");
  if (!uuidPattern.test(candidateId)) return { error: "Nieprawidłowy identyfikator kandydata." };
  const candidateContext = await prisma.importCandidate.findUnique({ where: { id: candidateId }, select: { status: true, resolution: true, createdPlaceId: true, queueStatus: true, proposedData: true, importBatch: { select: { metadata: true } } } });
  const spreadsheetPlaceReview = candidateContext ? isSpreadsheetPlaceReviewCandidate(candidateContext) || (isSpreadsheetBatchMetadata(candidateContext.importBatch.metadata) && candidateContext.queueStatus === "PENDING" && !candidateContext.resolution) : false;
  if (candidateContext && isSpreadsheetBatchMetadata(candidateContext.importBatch.metadata) && !candidateContext.resolution && !spreadsheetPlaceReview) return { error: "Najpierw rozstrzygnij pozostałe konflikty tego rekordu." };
  let name = formText(formData, "name", 250, !spreadsheetPlaceReview);
  let addressLine = formText(formData, "addressLine", 400, !spreadsheetPlaceReview);
  let primaryCategorySlug = formText(formData, "primaryCategorySlug", 120, !spreadsheetPlaceReview);
  let categorySlugs = [...new Set(formData.getAll("categorySlugs").filter((value): value is string => typeof value === "string"))];
  let organizationId = formText(formData, "organizationId", 36);
  const note = formText(formData, "note", 1000);
  if (note === null || (!spreadsheetPlaceReview && (!name || !addressLine || !primaryCategorySlug || !categorySlugs.includes(primaryCategorySlug)))) return { error: "Uzupełnij nazwę, stały adres oraz aktywną kategorię główną." };
  try {
    const placeId = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "import_candidates" WHERE "id" = ${candidateId}::uuid FOR UPDATE`);
      const candidate = await transaction.importCandidate.findUnique({ where: { id: candidateId }, include: { importBatch: true, organizationDecision: { select: { decision: true, organizationId: true } } } });
      if (!candidate) throw new Error("NOT_FOUND");
      if (candidate.resolution || candidate.createdPlaceId) throw new Error("ALREADY_RESOLVED");
      const spreadsheetCandidate = isSpreadsheetBatchMetadata(candidate.importBatch.metadata);
      if (spreadsheetCandidate) {
        const queuedSpreadsheetPlaceReview = candidate.queueStatus === "PENDING" && !candidate.resolution;
        if ((!isSpreadsheetPlaceReviewCandidate(candidate) && !queuedSpreadsheetPlaceReview) || hasSpreadsheetSourceRowDuplicate(candidate)) throw new Error("SPREADSHEET_REVIEW");
        const proposed = jsonRecord(candidate.proposedData);
        const mapped = jsonRecord(proposed?.mappedValues);
        const analysis = jsonRecord(proposed?.analysis);
        const category = jsonRecord(analysis?.category);
        const organization = jsonRecord(analysis?.organization);
        name = jsonText(mapped?.name, 250);
        addressLine = jsonText(mapped?.addressLine, 400);
        const categoryStatus = jsonText(category?.status, 40);
        const sourceCategorySlug = jsonText(category?.categorySlug, 120) ?? candidate.primaryCategorySlug;
        const selectedCategorySlug = primaryCategorySlug;
        primaryCategorySlug = categoryStatus === "MATCHED" ? sourceCategorySlug : selectedCategorySlug;
        categorySlugs = categoryStatus === "MATCHED" && sourceCategorySlug ? [sourceCategorySlug] : (selectedCategorySlug ? [selectedCategorySlug] : []);
        const organizationStatus = jsonText(organization?.status, 40);
        const sourceOrganizationId = jsonText(organization?.organizationId, 36);
        if (!name || !addressLine || !primaryCategorySlug || !categorySlugs.includes(primaryCategorySlug)) throw new Error("CATEGORY_SELECTION");
        if (categoryStatus !== "MATCHED" && selectedCategorySlug === null) throw new Error("CATEGORY_SELECTION");
        const persistedOrganizationDecision = parseOrganizationDecision(candidate.organizationDecision);
        const organizationLookupId = persistedOrganizationDecision?.decision === "SELECTED_ORGANIZATION"
          ? persistedOrganizationDecision.organizationId
          : organizationStatus === "MATCHED" ? sourceOrganizationId : null;
        const currentOrganization = organizationLookupId
          ? await transaction.organization.findUnique({ where: { id: organizationLookupId }, select: { id: true, active: true } })
          : null;
        const effectiveOrganization = resolveEffectiveOrganization(
          { status: organizationStatus as "NONE" | "MATCHED" | "POSSIBLE" | "CONFLICT" | "NEW_CANDIDATE", organizationId: sourceOrganizationId },
          persistedOrganizationDecision,
          currentOrganization,
        );
        if (effectiveOrganization.status === "UNRESOLVED" || effectiveOrganization.status === "BLOCKED_INACTIVE_MATCH") throw new Error("ORGANIZATION");
        organizationId = effectiveOrganization.organizationId;
      }
      const categories = await transaction.category.findMany({ where: { slug: { in: categorySlugs }, active: true } });
      if (categories.length !== categorySlugs.length) throw new Error("CATEGORY");
      const primary = categories.find((item) => item.slug === primaryCategorySlug);
      if (!primary) throw new Error("CATEGORY");
      if (!name || !addressLine || !primaryCategorySlug) throw new Error("CATEGORY");
      const finalName = name;
      const finalAddressLine = addressLine;
      if (organizationId && !await transaction.organization.findFirst({ where: { id: organizationId, active: true }, select: { id: true } })) throw new Error("ORGANIZATION");
      const proposed = candidate.proposedData as Record<string, unknown>;
      const proposedAccommodation = candidateAccommodation(proposed.accommodation);
      const batchMetadata = candidate.importBatch.metadata;
      const recordKind = batchMetadata && typeof batchMetadata === "object" && !Array.isArray(batchMetadata) && batchMetadata.recordKind === "TEST"
        ? "TEST"
        : "PRODUCTION";
      const place = await transaction.place.create({
        data: {
          slug: await uniquePlaceSlug(transaction, finalName, candidateId),
          name: finalName,
          organizationId: organizationId || null,
          primaryCategoryId: primary.id,
          typeLabel: proposed.accommodation ? "Miejsce noclegowe" : "Punkt pomocy",
          description: typeof proposed.description === "string" ? proposed.description.slice(0, 4000) : null,
          addressLine: finalAddressLine,
          street: typeof proposed.street === "string" ? proposed.street.slice(0, 300) : null,
          buildingNumber: typeof proposed.buildingNumber === "string" ? proposed.buildingNumber.slice(0, 40) : null,
          postalCode: typeof proposed.postalCode === "string" ? proposed.postalCode.slice(0, 20) : null,
          city: typeof proposed.city === "string" ? proposed.city.slice(0, 120) : "Łódź",
          phone: candidate.proposedPhone?.slice(0, 50) ?? null,
          email: candidate.proposedEmail?.slice(0, 320) ?? null,
          website: candidate.proposedWebsite?.slice(0, 2048) ?? null,
          publicationStatus: "DRAFT",
          verificationStatus: "NEEDS_CONFIRMATION",
          verificationQueueStatus: "PENDING",
          operationalStatus: "UNKNOWN",
          recordKind,
          internalNote: `Utworzono po decyzji „To różne miejsca” z paczki ${candidate.importBatch.key}.`,
          audience: Array.isArray(proposed.audience) ? proposed.audience.filter((item): item is string => typeof item === "string").slice(0, 30) : [],
          services: Array.isArray(proposed.services) ? proposed.services.filter((item): item is string => typeof item === "string").slice(0, 30) : [],
          lastEditedByAdminUserId: session.user.id,
          categories: { create: categorySlugs.map((slug, sortOrder) => ({ categoryId: categories.find((item) => item.slug === slug)!.id, sortOrder })) },
        },
      });
      const hours = [
        ...candidateOpeningRows(proposed.operationHours, "OPERATION"),
        ...candidateOpeningRows(proposed.admissionHours, "ADMISSION"),
      ];
      if (hours.length) await transaction.openingHours.createMany({ data: hours.map((row) => ({ ...row, placeId: place.id })) });
      const requirements = candidateRequirements(proposed.requirements);
      if (requirements.length) await transaction.placeRequirement.createMany({ data: requirements.map((row) => ({ ...row, placeId: place.id })) });
      const accessibility = candidateAccessibility(proposed.accessibility);
      if (accessibility.length) await transaction.placeAccessibility.createMany({ data: accessibility.map((row) => ({ ...row, placeId: place.id })) });
      if (proposedAccommodation) {
        await transaction.accommodationDetails.create({
          data: {
            placeId: place.id,
            type: proposedAccommodation.type,
            targetGroups: proposedAccommodation.targetGroups,
            audienceLabel: proposedAccommodation.targetGroups.join(" · ") || null,
            acceptedProfiles: [],
            admissionHoursDescription: typeof proposed.rawAdmissionHours === "string" ? proposed.rawAdmissionHours.slice(0, 1200) : null,
            acceptsToday: "UNKNOWN",
            lodzRegistrationRequired: "UNKNOWN",
            referralRequired: "UNKNOWN",
            documentRequired: "UNKNOWN",
            sobrietyPolicy: "UNKNOWN",
            petPolicy: "UNKNOWN",
            wheelchairAccessibility: "UNKNOWN",
            careServices: "UNKNOWN",
            partialDependencySupport: "UNKNOWN",
            availabilityState: "UNKNOWN",
            availabilityLabel: "Brak aktualnych danych o wolnych miejscach",
            availabilityNote: "Pojemność ze źródła nie oznacza liczby wolnych miejsc.",
            importantNote: "Wymaga bieżącego potwierdzenia przed przyjazdem.",
            capacityGroups: { create: proposedAccommodation.capacityGroups.map((group, sortOrder) => ({ ...group, active: true, sortOrder, availabilityUpdatedAt: null })) },
          },
        });
      }
      await transaction.importCandidate.update({ where: { id: candidateId }, data: { status: "IMPORTED", createdPlaceId: place.id, resolution: "DIFFERENT_PLACE", queueStatus: "VERIFIED", resolvedAt: new Date(), resolvedByAdminUserId: session.user.id, resolutionNote: note || null } });
      await transaction.auditLog.createMany({ data: [
        { adminUserId: session.user.id, action: "IMPORT_CONFLICT_RESOLVED", entityType: "IMPORT_CANDIDATE", entityId: candidateId, changedFields: ["status", "createdPlaceId", "resolution", "queueStatus"], previousValues: { status: candidate.status }, newValues: { status: "IMPORTED", createdPlaceId: place.id, resolution: "DIFFERENT_PLACE", queueStatus: "VERIFIED" }, changeOrigin: "SOURCE_IMPORT", sourceReferenceId: candidateId, note: note || "Potwierdzono, że kandydat jest osobnym miejscem." },
        { adminUserId: session.user.id, action: "PLACE_CREATED", entityType: "PLACE", entityId: place.id, changedFields: ["recordKind", "publicationStatus", "verificationStatus"], previousValues: Prisma.JsonNull, newValues: { recordKind, publicationStatus: "DRAFT", verificationStatus: "NEEDS_CONFIRMATION" }, changeOrigin: "SOURCE_IMPORT", sourceReferenceId: candidateId, note: "Utworzono szkic po ręcznym rozwiązaniu konfliktu importowego." },
      ] });
      return place.id;
    });
    revalidateVerification(candidateId);
    revalidatePath(`/admin/miejsca/${placeId}`);
    return { success: "Utworzono osobny szkic miejsca. Nadal wymaga lokalizacji i aktualnej weryfikacji." };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "ALREADY_RESOLVED") return { error: "Ten kandydat został już rozstrzygnięty." };
    if (reason === "SPREADSHEET_REVIEW") return { error: "Ten rekord ma nierozstrzygnięty konflikt, którego nie można obejść tą decyzją." };
    if (reason === "CATEGORY_SELECTION") return { error: "Kategoria z importu wymaga rozstrzygnięcia przed utworzeniem placówki." };
    if (reason === "ORGANIZATION_OPTION") return { error: "Wybierz organizację wskazaną w analizie albo opcję bez organizacji." };
    if (reason === "CATEGORY") return { error: "Wybrana kategoria jest nieaktywna lub nie istnieje." };
    if (reason === "ORGANIZATION") return { error: "Wybrana organizacja jest nieaktywna lub nie istnieje." };
    return { error: "Nie udało się utworzyć osobnego szkicu." };
  }
}

export async function skipImportCandidate(
  candidateId: string,
  _previousState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const session = await requirePermission("VERIFY_PLACES");
  const reason = formText(formData, "reason", 1000, true);
  if (!uuidPattern.test(candidateId) || !reason) return { error: "Podaj krótki powód pominięcia." };
  try {
    await prisma.$transaction(async (transaction) => {
      const candidate = await transaction.importCandidate.findUnique({ where: { id: candidateId }, select: { status: true, resolution: true } });
      if (!candidate) throw new Error("NOT_FOUND");
      if (candidate.resolution) throw new Error("ALREADY_RESOLVED");
      await transaction.importCandidate.update({ where: { id: candidateId }, data: { status: "SKIPPED", queueStatus: "SKIPPED", resolution: "SKIPPED", resolvedAt: new Date(), resolvedByAdminUserId: session.user.id, resolutionNote: reason } });
      await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: "IMPORT_CANDIDATE_SKIPPED", entityType: "IMPORT_CANDIDATE", entityId: candidateId, changedFields: ["status", "queueStatus", "resolution"], previousValues: { status: candidate.status }, newValues: { status: "SKIPPED", queueStatus: "SKIPPED", resolution: "SKIPPED" }, changeOrigin: "SOURCE_IMPORT", sourceReferenceId: candidateId, note: reason } });
    });
    revalidateVerification(candidateId);
    return { success: "Kandydat został pominięty i pozostaje w historii importu." };
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_RESOLVED") return { error: "Ten kandydat został już rozstrzygnięty." };
    return { error: "Nie udało się pominąć kandydata." };
  }
}

export async function undoCandidateResolution(candidateId: string): Promise<VerificationActionState> {
  const session = await requirePermission("VERIFY_PLACES");
  if (!uuidPattern.test(candidateId)) return { error: "Nieprawidłowy identyfikator kandydata." };
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "import_candidates" WHERE "id" = ${candidateId}::uuid FOR UPDATE`);
      const candidate = await transaction.importCandidate.findUnique({
        where: { id: candidateId },
        select: { id: true, resolution: true, createdPlaceId: true, matchedPlaceId: true, resolvedAt: true, resolvedByAdminUserId: true, resolutionNote: true, queueStatus: true, status: true, proposedData: true, importBatch: { select: { metadata: true } } },
      });
      if (!candidate) throw new Error("NOT_FOUND");
      if (!canUndoCandidateResolution(candidate)) throw new Error("NOT_UNDOABLE");
      const spreadsheetPlaceReview = isSpreadsheetPlaceReviewCandidate(candidate);
      const restoredMatchedPlaceId = restoreMatcherMatchedPlaceId(candidate.proposedData);
      await transaction.importCandidate.update({
        where: { id: candidateId },
        data: {
          status: "REQUIRES_REVIEW",
          matchedPlaceId: restoredMatchedPlaceId,
          resolution: null,
          queueStatus: spreadsheetPlaceReview ? "PENDING" : "PENDING",
          resolvedAt: null,
          resolvedByAdminUserId: null,
          resolutionNote: null,
        },
      });
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "IMPORT_CANDIDATE_REOPENED",
          entityType: "IMPORT_CANDIDATE",
          entityId: candidateId,
          changedFields: ["status", "matchedPlaceId", "resolution", "queueStatus", "resolvedAt", "resolvedByAdminUserId", "resolutionNote"],
          previousValues: { status: candidate.status, matchedPlaceId: candidate.matchedPlaceId, resolution: candidate.resolution, queueStatus: candidate.queueStatus },
          newValues: { status: "REQUIRES_REVIEW", matchedPlaceId: restoredMatchedPlaceId, resolution: null, queueStatus: "PENDING" },
          changeOrigin: "SOURCE_IMPORT",
          sourceReferenceId: candidateId,
          note: "Cofnięto decyzję i ponownie skierowano kandydata do weryfikacji.",
        },
      });
    });
    revalidateVerification(candidateId);
    return { success: "Decyzja została cofnięta. Rekord wrócił do weryfikacji." };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_UNDOABLE") return { error: "Tej decyzji nie można cofnąć." };
    return { error: "Nie udało się cofnąć decyzji." };
  }
}
