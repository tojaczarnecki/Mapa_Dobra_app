"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, requirePlacePermission } from "@/lib/admin/session";
import { validatePlaceAdminPayload } from "@/lib/places/admin-validation";
import { deriveTodayHoursLabel, openingRows } from "@/lib/places/opening-hours";
import {
  requiresOperationalStatusOnRepublish,
  validatePlaceStatusCombination,
} from "@/lib/places/publication-status";
import type {
  PlaceAdminPayload,
  PlaceFormActionState,
  PlaceOperationalStatusValue,
  PlacePublicationStatusValue,
  QuickAvailabilityActionState,
} from "@/types/place-admin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const allowedStatuses: PlacePublicationStatusValue[] = [
  "DRAFT",
  "PUBLISHED",
  "TEMPORARILY_CLOSED",
  "PERMANENTLY_CLOSED",
  "ARCHIVED",
];

function placeScalarData(
  payload: PlaceAdminPayload,
  organizationId: string | null,
  primaryCategoryId: string,
  adminUserId: string,
) {
  return {
    slug: payload.slug,
    name: payload.name,
    organizationId,
    primaryCategoryId,
    typeLabel: payload.typeLabel || null,
    description: payload.description || null,
    street: payload.street || null,
    buildingNumber: payload.buildingNumber || null,
    addressLine: payload.addressLine,
    postalCode: payload.postalCode || null,
    city: payload.city,
    district: payload.district || null,
    latitude: payload.latitude,
    longitude: payload.longitude,
    phone: payload.phone || null,
    email: payload.email || null,
    website: payload.website || null,
    socialMedia: payload.socialMedia || null,
    operationalStatus: payload.operationalStatus,
    todayHoursLabel: deriveTodayHoursLabel(payload.openingHours.operation),
    audience: payload.audience,
    services: payload.services,
    internalNote: payload.internalNote || null,
    lastEditedByAdminUserId: adminUserId,
    ...(payload.markVerified
      ? {
          verificationStatus: "VERIFIED" as const,
          verifiedAt: new Date(),
          verifiedByAdminUserId: adminUserId,
          verificationSource: payload.verificationSource,
        }
      : {}),
  };
}

function accommodationScalarData(payload: NonNullable<PlaceAdminPayload["accommodation"]>) {
  return {
    type: payload.type,
    audienceLabel: payload.audienceLabel || null,
    targetGroups: payload.targetGroups,
    acceptedProfiles: payload.acceptedProfiles,
    admissionHoursDescription: payload.admissionHoursDescription || null,
    acceptsToday: payload.acceptsToday,
    lodzRegistrationRequired: payload.lodzRegistrationRequired,
    referralRequired: payload.referralRequired,
    documentRequired: payload.documentRequired,
    sobrietyPolicy: payload.sobrietyPolicy,
    sobrietyNote: payload.sobrietyNote || null,
    petPolicy: payload.petPolicy,
    petNote: payload.petNote || null,
    wheelchairAccessibility: payload.wheelchairAccessibility,
    careServices: payload.careServices,
    partialDependencySupport: payload.partialDependencySupport,
    mealsInfo: payload.mealsInfo || null,
    hygieneInfo: payload.hygieneInfo || null,
    luggageInfo: payload.luggageInfo || null,
    returnTimeInfo: payload.returnTimeInfo || null,
    maxStayInfo: payload.maxStayInfo || null,
    feeInfo: payload.feeInfo || null,
    availabilityState: payload.availabilityState,
    availabilityLabel: payload.availabilityLabel || null,
    availabilityNote: payload.availabilityNote || null,
    importantNote: payload.importantNote || null,
  };
}

function auditSnapshot(place: {
  name: string;
  slug: string;
  addressLine: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  publicationStatus: string;
  operationalStatus: string;
  categories: Array<{ category: { slug: string } }>;
  openingHours: unknown[];
  requirements: unknown[];
  accessibility: unknown[];
  accommodation: unknown;
  organizationId: string | null;
}) {
  return {
    name: place.name,
    slug: place.slug,
    addressLine: place.addressLine,
    phone: place.phone,
    email: place.email,
    website: place.website,
    publicationStatus: place.publicationStatus,
    operationalStatus: place.operationalStatus,
    categories: place.categories.map((item) => item.category.slug),
    openingHours: place.openingHours,
    requirements: place.requirements,
    accessibility: place.accessibility,
    accommodation: place.accommodation,
    organizationId: place.organizationId,
  };
}

function changedFields(previous: Record<string, unknown> | null, next: Record<string, unknown>) {
  if (!previous) return Object.keys(next);
  return Object.keys(next).filter(
    (key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]),
  );
}

const placeAuditInclude = {
  categories: { include: { category: true }, orderBy: { sortOrder: "asc" as const } },
  openingHours: { orderBy: [{ kind: "asc" as const }, { weekday: "asc" as const }, { sortOrder: "asc" as const }] },
  requirements: { orderBy: { sortOrder: "asc" as const } },
  accessibility: { orderBy: { sortOrder: "asc" as const } },
  accommodation: { include: { capacityGroups: { orderBy: { sortOrder: "asc" as const } } } },
} satisfies Prisma.PlaceInclude;

export async function savePlace(
  _previousState: PlaceFormActionState,
  formData: FormData,
): Promise<PlaceFormActionState> {
  const rawPayload = formData.get("payload");
  if (typeof rawPayload !== "string" || rawPayload.length > 200_000) {
    return { error: "Nie udało się odczytać formularza." };
  }

  let input: unknown;
  try {
    input = JSON.parse(rawPayload);
  } catch {
    return { error: "Nie udało się odczytać formularza." };
  }
  const validation = validatePlaceAdminPayload(input);
  if (!validation.ok) {
    return {
      error: validation.reason === "invalid-fields"
        ? "Sprawdź wymagane pola i poprawność wprowadzonych danych."
        : validation.reason,
    };
  }
  const payload = validation.data;
  const session = await requirePermission(payload.id ? "EDIT_PLACES" : "CREATE_PLACES");

  try {
    const savedId = await prisma.$transaction(async (transaction) => {
      const existing = payload.id
        ? await transaction.place.findUnique({
            where: { id: payload.id },
            include: placeAuditInclude,
          })
        : null;
      if (payload.id && !existing) throw new Error("NOT_FOUND");
      if (existing?.accommodation && !payload.isAccommodation) {
        throw new Error("ACCOMMODATION_REMOVAL");
      }

      const duplicateSlug = await transaction.place.findFirst({
        where: { slug: payload.slug, ...(payload.id ? { id: { not: payload.id } } : {}) },
        select: { id: true },
      });
      if (duplicateSlug) throw new Error("DUPLICATE_SLUG");

      const categoryRecords = await transaction.category.findMany({
        where: { slug: { in: payload.categorySlugs } },
        select: { id: true, slug: true, active: true },
      });
      if (categoryRecords.length !== payload.categorySlugs.length) throw new Error("CATEGORY");
      const categoryIdBySlug = new Map(categoryRecords.map((item) => [item.slug, item.id]));
      const primaryCategoryId = categoryIdBySlug.get(payload.primaryCategorySlug);
      if (!primaryCategoryId) throw new Error("CATEGORY");
      const primaryCategory = categoryRecords.find((item) => item.slug === payload.primaryCategorySlug);
      if (!primaryCategory?.active && existing?.primaryCategoryId !== primaryCategoryId) {
        throw new Error("INACTIVE_PRIMARY_CATEGORY");
      }

      let organizationId: string | null = null;
      if (payload.organizationId) {
        const organization = await transaction.organization.findUnique({
          where: { id: payload.organizationId },
          select: { id: true, active: true },
        });
        if (!organization || (!organization.active && existing?.organizationId !== organization.id)) {
          throw new Error("ORGANIZATION");
        }
        organizationId = organization.id;
      }

      const scalarData = placeScalarData(
        payload,
        organizationId,
        primaryCategoryId,
        session.user.id,
      );
      const place = existing
        ? await transaction.place.update({ where: { id: existing.id }, data: scalarData })
        : await transaction.place.create({
            data: {
              ...scalarData,
              publicationStatus: "DRAFT",
              verificationStatus: payload.markVerified ? "VERIFIED" : "UNVERIFIED",
              recordKind: "PRODUCTION",
              isDemo: false,
            },
          });

      await Promise.all([
        transaction.placeCategory.deleteMany({ where: { placeId: place.id } }),
        transaction.openingHours.deleteMany({ where: { placeId: place.id } }),
        transaction.placeRequirement.deleteMany({ where: { placeId: place.id } }),
        transaction.placeAccessibility.deleteMany({ where: { placeId: place.id } }),
      ]);

      await transaction.placeCategory.createMany({
        data: payload.categorySlugs.map((slug, sortOrder) => ({
          placeId: place.id,
          categoryId: categoryIdBySlug.get(slug)!,
          sortOrder,
        })),
      });
      await transaction.openingHours.createMany({
        data: [
          ...openingRows(payload.openingHours.operation, "OPERATION"),
          ...(payload.isAccommodation ? openingRows(payload.openingHours.admission, "ADMISSION") : []),
        ].map((item) => ({ ...item, placeId: place.id })),
      });
      await transaction.placeRequirement.createMany({
        data: payload.requirements.map((item, sortOrder) => ({
          placeId: place.id,
          kind: item.kind,
          state: item.state,
          label: item.label,
          note: item.note || null,
          sortOrder,
        })),
      });
      await transaction.placeAccessibility.createMany({
        data: payload.accessibility.map((item, sortOrder) => ({
          placeId: place.id,
          feature: item.feature,
          state: item.state,
          label: item.label,
          note: item.note || null,
          sortOrder,
        })),
      });

      if (payload.isAccommodation && payload.accommodation) {
        const priorAccommodation = existing?.accommodation;
        const priorState = priorAccommodation?.availabilityState;
        const capacityChanged = payload.accommodation.capacityGroups.some((group) => {
          const previous = priorAccommodation?.capacityGroups.find((item) => item.id === group.id);
          return !previous || previous.availableBeds !== group.availableBeds || previous.totalBeds !== group.totalBeds || previous.active !== group.active;
        });
        const availabilityChanged = priorState !== payload.accommodation.availabilityState || capacityChanged;
        const accommodationData = {
          ...accommodationScalarData(payload.accommodation),
          ...(availabilityChanged ? { availabilityConfirmedAt: new Date() } : {}),
        };
        const savedAccommodation = priorAccommodation
          ? await transaction.accommodationDetails.update({
              where: { id: priorAccommodation.id },
              data: accommodationData,
            })
          : await transaction.accommodationDetails.create({
              data: { placeId: place.id, ...accommodationData },
            });

        const retainedIds: string[] = [];
        for (const [sortOrder, group] of payload.accommodation.capacityGroups.entries()) {
          const previous = priorAccommodation?.capacityGroups.find((item) => item.id === group.id);
          const savedGroup = previous
            ? await transaction.accommodationCapacityGroup.update({
                where: { id: previous.id },
                data: {
                  label: group.label,
                  totalBeds: group.totalBeds,
                  availableBeds: group.availableBeds,
                  active: group.active,
                  sortOrder,
                  ...(previous.availableBeds !== group.availableBeds || previous.totalBeds !== group.totalBeds
                    ? { availabilityUpdatedAt: new Date(), updatedByAdminUserId: session.user.id }
                    : {}),
                },
              })
            : await transaction.accommodationCapacityGroup.create({
                data: {
                  accommodationDetailsId: savedAccommodation.id,
                  label: group.label,
                  totalBeds: group.totalBeds,
                  availableBeds: group.availableBeds,
                  active: group.active,
                  availabilityUpdatedAt: new Date(),
                  updatedByAdminUserId: session.user.id,
                  sortOrder,
                },
              });
          retainedIds.push(savedGroup.id);
          if (!previous || previous.availableBeds !== group.availableBeds || previous.totalBeds !== group.totalBeds) {
            await transaction.accommodationAvailabilityHistory.create({
              data: {
                accommodationDetailsId: savedAccommodation.id,
                capacityGroupId: savedGroup.id,
                availabilityState: payload.accommodation.availabilityState,
                availableBeds: group.availableBeds,
                totalBeds: group.totalBeds,
                reportedAt: new Date(),
                adminUserId: session.user.id,
                origin: "ADMIN_MANUAL",
                note: payload.accommodation.availabilityNote || null,
              },
            });
            await transaction.auditLog.create({
              data: {
                adminUserId: session.user.id,
                action: "AVAILABILITY_UPDATED",
                entityType: "ACCOMMODATION_CAPACITY_GROUP",
                entityId: savedGroup.id,
                changedFields: ["availableBeds", "totalBeds"],
                previousValues: previous
                  ? ({ availableBeds: previous.availableBeds, totalBeds: previous.totalBeds } as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
                newValues: {
                  availableBeds: group.availableBeds,
                  totalBeds: group.totalBeds,
                },
                changeOrigin: "ADMIN_MANUAL",
                sourceType: payload.markVerified ? payload.verificationSource : null,
                note: payload.internalNote || null,
              },
            });
          }
        }
        if (priorAccommodation) {
          await transaction.accommodationCapacityGroup.updateMany({
            where: {
              accommodationDetailsId: savedAccommodation.id,
              ...(retainedIds.length ? { id: { notIn: retainedIds } } : {}),
            },
            data: { active: false },
          });
        }
        if (availabilityChanged && payload.accommodation.capacityGroups.length === 0) {
          await transaction.accommodationAvailabilityHistory.create({
            data: {
              accommodationDetailsId: savedAccommodation.id,
              availabilityState: payload.accommodation.availabilityState,
              reportedAt: new Date(),
              adminUserId: session.user.id,
              origin: "ADMIN_MANUAL",
              note: payload.accommodation.availabilityNote || null,
            },
          });
        }
      }

      const completePlace = await transaction.place.findUniqueOrThrow({
        where: { id: place.id },
        include: placeAuditInclude,
      });
      const previousSnapshot = existing ? auditSnapshot(existing) : null;
      const nextSnapshot = auditSnapshot(completePlace);
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: existing ? "PLACE_UPDATED" : "PLACE_CREATED",
          entityType: "PLACE",
          entityId: place.id,
          changedFields: changedFields(previousSnapshot, nextSnapshot),
          previousValues: previousSnapshot
            ? (JSON.parse(JSON.stringify(previousSnapshot)) as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          newValues: JSON.parse(JSON.stringify(nextSnapshot)) as Prisma.InputJsonValue,
          changeOrigin: "ADMIN_MANUAL",
          sourceType: payload.markVerified ? payload.verificationSource : null,
          note: payload.internalNote || null,
        },
      });

      return place.id;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/miejsca");
    revalidatePath(`/admin/miejsca/${savedId}`);
    revalidatePath("/szukaj");
    revalidatePath("/mapa");
    return { success: "Dane miejsca zostały zapisane.", placeId: savedId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "DUPLICATE_SLUG") return { error: "Inne miejsce używa już tego slugu." };
    if (reason === "ORGANIZATION") return { error: "Wybierz aktywną organizację z listy lub pozostaw brak organizacji." };
    if (reason === "INACTIVE_PRIMARY_CATEGORY") return { error: "Nieaktywna kategoria nie może zostać wybrana jako nowa kategoria główna." };
    if (reason === "ACCOMMODATION_REMOVAL") {
      return { error: "Danych noclegowych nie można usunąć tym formularzem. Zmień status miejsca lub skontaktuj się z superadministratorem." };
    }
    return { error: "Nie udało się zapisać miejsca. Sprawdź dane i spróbuj ponownie." };
  }
}

export async function changePlaceStatus(
  _previousState: PlaceFormActionState,
  formData: FormData,
): Promise<PlaceFormActionState> {
  const session = await requirePermission("CHANGE_PLACE_STATUS");
  const placeId = formData.get("placeId");
  const status = formData.get("status");
  const operationalStatus = formData.get("operationalStatus");
  if (
    typeof placeId !== "string" ||
    !uuidPattern.test(placeId) ||
    typeof status !== "string" ||
    !allowedStatuses.includes(status as PlacePublicationStatusValue)
  ) {
    return { error: "Nie udało się zmienić statusu miejsca." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.place.findUnique({
        where: { id: placeId },
        select: { publicationStatus: true, operationalStatus: true },
      });
      if (!current) throw new Error("NOT_FOUND");
      const targetStatus = status as PlacePublicationStatusValue;
      const needsExplicitOperationalStatus = requiresOperationalStatusOnRepublish(
        current.publicationStatus,
        targetStatus,
      );
      const validOperationalStatuses: PlaceOperationalStatusValue[] = ["OPEN", "CLOSED", "OPEN_TODAY", "UNKNOWN"];
      const selectedOperationalStatus =
        typeof operationalStatus === "string" && validOperationalStatuses.includes(operationalStatus as PlaceOperationalStatusValue)
          ? operationalStatus as PlaceOperationalStatusValue
          : null;
      if (needsExplicitOperationalStatus && !selectedOperationalStatus) throw new Error("OPERATIONAL_REQUIRED");
      const nextOperationalStatus = targetStatus === "TEMPORARILY_CLOSED" || targetStatus === "PERMANENTLY_CLOSED"
        ? "CLOSED" as const
        : selectedOperationalStatus ?? current.operationalStatus;
      const combination = validatePlaceStatusCombination(targetStatus, nextOperationalStatus);
      if (!combination.ok) throw new Error("STATUS_CONFLICT");
      await transaction.place.update({
        where: { id: placeId },
        data: {
          publicationStatus: targetStatus,
          lastEditedByAdminUserId: session.user.id,
          operationalStatus: nextOperationalStatus,
        },
      });
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: targetStatus === "PUBLISHED" ? "PLACE_PUBLISHED" : "PLACE_STATUS_CHANGED",
          entityType: "PLACE",
          entityId: placeId,
          changedFields: ["publicationStatus", "operationalStatus"],
          previousValues: { publicationStatus: current.publicationStatus, operationalStatus: current.operationalStatus },
          newValues: { publicationStatus: targetStatus, operationalStatus: nextOperationalStatus },
          changeOrigin: "ADMIN_MANUAL",
        },
      });
    });
    revalidatePath("/admin/miejsca");
    revalidatePath(`/admin/miejsca/${placeId}`);
    revalidatePath("/szukaj");
    revalidatePath("/mapa");
    return { success: "Status miejsca został zmieniony.", placeId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "OPERATIONAL_REQUIRED") {
      return { error: "Wybierz aktualny stan operacyjny przed ponownym opublikowaniem miejsca." };
    }
    if (reason === "STATUS_CONFLICT") {
      return { error: "Wybrany status publikacji jest sprzeczny ze stanem operacyjnym miejsca." };
    }
    return { error: "Nie udało się zmienić statusu miejsca." };
  }
}

export async function updateAccommodationAvailability(
  _previousState: QuickAvailabilityActionState,
  formData: FormData,
): Promise<QuickAvailabilityActionState> {
  const placeId = formData.get("placeId");
  const rawUpdates = formData.get("updates");
  if (
    typeof placeId !== "string" ||
    !uuidPattern.test(placeId) ||
    typeof rawUpdates !== "string" ||
    rawUpdates.length > 20_000
  ) {
    return { error: "Nie udało się odczytać aktualizacji dostępności." };
  }
  const session = await requirePlacePermission("UPDATE_BED_AVAILABILITY", placeId);
  const facilityUpdate = session.user.role === "PLACE_MANAGER";

  let input: unknown;
  try {
    input = JSON.parse(rawUpdates);
  } catch {
    return { error: "Nie udało się odczytać aktualizacji dostępności." };
  }
  if (!Array.isArray(input) || input.length > 30) {
    return { error: "Nieprawidłowa liczba aktualizowanych pul." };
  }
  const updates: Array<{ id: string; availableBeds: number | null }> = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return { error: "Nieprawidłowe dane puli miejsc." };
    const id = "id" in item ? item.id : null;
    const availableBeds = "availableBeds" in item ? item.availableBeds : undefined;
    if (
      typeof id !== "string" ||
      !uuidPattern.test(id) ||
      !(
        availableBeds === null ||
        (typeof availableBeds === "number" && Number.isInteger(availableBeds) && availableBeds >= 0 && availableBeds <= 100_000)
      )
    ) {
      return { error: "Liczba wolnych miejsc musi być liczbą nieujemną albo pozostać nieznana." };
    }
    updates.push({ id, availableBeds });
  }
  if (new Set(updates.map((item) => item.id)).size !== updates.length) {
    return { error: "Ta sama pula została przesłana więcej niż raz." };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const place = await transaction.place.findUnique({
        where: { id: placeId },
        select: {
          id: true,
          slug: true,
          primaryCategory: { select: { slug: true } },
          accommodation: {
            select: {
              id: true,
              capacityGroups: {
                where: { active: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      });
      if (!place?.accommodation) throw new Error("NOT_FOUND");
      const currentById = new Map(place.accommodation.capacityGroups.map((group) => [group.id, group]));
      if (updates.some((item) => !currentById.has(item.id))) throw new Error("INVALID_GROUP");
      for (const update of updates) {
        const current = currentById.get(update.id)!;
        if (current.totalBeds !== null && update.availableBeds !== null && update.availableBeds > current.totalBeds) {
          throw new Error("CAPACITY");
        }
      }

      const changed = updates.filter((item) => currentById.get(item.id)!.availableBeds !== item.availableBeds);
      if (!changed.length) return { changed: false, publicHref: null };
      const now = new Date();
      for (const update of changed) {
        const current = currentById.get(update.id)!;
        const groupState = update.availableBeds === null
          ? "UNKNOWN" as const
          : update.availableBeds === 0
            ? "FULL" as const
            : update.availableBeds === 1
              ? "FEW" as const
              : "AVAILABLE" as const;
        await transaction.accommodationCapacityGroup.update({
          where: { id: current.id },
          data: {
            availableBeds: update.availableBeds,
            availabilityUpdatedAt: now,
            updatedByAdminUserId: session.user.id,
          },
        });
        await transaction.accommodationAvailabilityHistory.create({
          data: {
            accommodationDetailsId: place.accommodation.id,
            capacityGroupId: current.id,
            availabilityState: groupState,
            availableBeds: update.availableBeds,
            totalBeds: current.totalBeds,
            reportedAt: now,
            adminUserId: session.user.id,
            origin: facilityUpdate ? "FACILITY_REPRESENTATIVE" : "ADMIN_MANUAL",
            note: facilityUpdate ? "Aktualizacja przekazana przez uprawnionego pracownika placówki." : "Szybka aktualizacja dostępności w panelu administratora.",
          },
        });
      }

      const updateById = new Map(updates.map((item) => [item.id, item.availableBeds]));
      const currentValues = place.accommodation.capacityGroups.map((group) =>
        updateById.has(group.id) ? updateById.get(group.id)! : group.availableBeds,
      );
      const knownValues = currentValues.filter((value): value is number => value !== null);
      const totalAvailable = knownValues.reduce((sum, value) => sum + value, 0);
      const hasUnknown = knownValues.length !== currentValues.length;
      const availabilityState = knownValues.length === 0
        ? "UNKNOWN" as const
        : totalAvailable === 0
          ? "FULL" as const
          : totalAvailable <= 2
            ? "FEW" as const
            : "AVAILABLE" as const;
      const availabilityLabel = knownValues.length === 0
        ? "Brak aktualnych danych"
        : `${hasUnknown ? "Co najmniej " : ""}${totalAvailable} ${totalAvailable === 1 ? "wolne miejsce" : totalAvailable < 5 ? "wolne miejsca" : "wolnych miejsc"}`;
      await transaction.accommodationDetails.update({
        where: { id: place.accommodation.id },
        data: { availabilityState, availabilityLabel, availabilityConfirmedAt: now },
      });
      await transaction.place.update({
        where: { id: place.id },
        data: { lastEditedByAdminUserId: session.user.id },
      });
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: facilityUpdate ? "BED_AVAILABILITY_UPDATED" : "AVAILABILITY_UPDATED",
          entityType: "PLACE",
          entityId: place.id,
          changedFields: changed.map((item) => `capacityGroups.${currentById.get(item.id)!.label}.availableBeds`),
          previousValues: Object.fromEntries(changed.map((item) => [currentById.get(item.id)!.label, currentById.get(item.id)!.availableBeds])),
          newValues: Object.fromEntries(changed.map((item) => [currentById.get(item.id)!.label, item.availableBeds])),
          changeOrigin: facilityUpdate ? "FACILITY_REPRESENTATIVE" : "ADMIN_MANUAL",
          note: facilityUpdate ? "Aktualizacja placówki." : "Szybka aktualizacja dostępności noclegu.",
        },
      });
      return {
        changed: true,
        publicHref: `/lodz/${place.primaryCategory.slug}/${place.slug}`,
      };
    });

    if (!result.changed) return { success: "Nie było zmian do zapisania." };
    revalidatePath(`/admin/miejsca/${placeId}`);
    revalidatePath(`/admin/moje-miejsca/${placeId}`);
    revalidatePath("/admin/miejsca");
    revalidatePath("/znajdz-nocleg");
    revalidatePath("/mapa");
    if (result.publicHref) revalidatePath(result.publicHref);
    return { success: "Dostępność została zaktualizowana." };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "CAPACITY") return { error: "Liczba wolnych miejsc nie może przekraczać pojemności puli." };
    if (reason === "INVALID_GROUP") return { error: "Jedna z pul została wyłączona lub zmieniona. Odśwież stronę." };
    return { error: "Nie udało się zapisać dostępności. Spróbuj ponownie." };
  }
}

export async function confirmAccommodationAvailability(
  _previousState: QuickAvailabilityActionState,
  formData: FormData,
): Promise<QuickAvailabilityActionState> {
  const placeId = formData.get("placeId");
  if (typeof placeId !== "string" || !uuidPattern.test(placeId)) {
    return { error: "Nieprawidłowa placówka." };
  }

  const session = await requirePlacePermission("UPDATE_BED_AVAILABILITY", placeId);
  const facilityUpdate = session.user.role === "PLACE_MANAGER";

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const place = await transaction.place.findUnique({
        where: { id: placeId },
        select: {
          id: true,
          accommodation: {
            select: {
              id: true,
              availabilityState: true,
              availabilityConfirmedAt: true,
              capacityGroups: {
                where: { active: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      });
      if (!place?.accommodation) throw new Error("NOT_FOUND");

      const now = new Date();
      await transaction.accommodationDetails.update({
        where: { id: place.accommodation.id },
        data: { availabilityConfirmedAt: now },
      });

      for (const group of place.accommodation.capacityGroups) {
        const groupState = group.availableBeds === null
          ? "UNKNOWN" as const
          : group.availableBeds === 0
            ? "FULL" as const
            : group.availableBeds === 1
              ? "FEW" as const
              : "AVAILABLE" as const;
        await transaction.accommodationAvailabilityHistory.create({
          data: {
            accommodationDetailsId: place.accommodation.id,
            capacityGroupId: group.id,
            availabilityState: groupState,
            availableBeds: group.availableBeds,
            totalBeds: group.totalBeds,
            reportedAt: now,
            adminUserId: session.user.id,
            origin: facilityUpdate ? "FACILITY_REPRESENTATIVE" : "ADMIN_MANUAL",
            note: facilityUpdate
              ? "Placówka potwierdziła brak zmian w dostępności."
              : "Administrator potwierdził brak zmian w dostępności.",
          },
        });
      }

      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "AVAILABILITY_UPDATED",
          entityType: "PLACE",
          entityId: place.id,
          changedFields: ["accommodation.availabilityConfirmedAt"],
          previousValues: { availabilityConfirmedAt: place.accommodation.availabilityConfirmedAt?.toISOString() ?? null },
          newValues: { availabilityConfirmedAt: now.toISOString(), availabilityState: place.accommodation.availabilityState },
          changeOrigin: facilityUpdate ? "FACILITY_REPRESENTATIVE" : "ADMIN_MANUAL",
          note: facilityUpdate ? "Potwierdzenie placówki bez zmiany danych operacyjnych." : "Potwierdzenie aktualności danych bez zmiany danych operacyjnych.",
        },
      });
      return now;
    });

    revalidatePath(`/admin/moje-miejsca/${placeId}`);
    revalidatePath("/admin");
    revalidatePath("/znajdz-nocleg");
    revalidatePath("/mapa");
    return { success: `Dane potwierdzone o ${result.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}.` };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return { error: "To miejsce nie ma modułu noclegowego." };
    return { error: "Nie udało się potwierdzić danych. Spróbuj ponownie." };
  }
}
