import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  emptyOpeningSchedule,
  formatOpeningSchedule,
  scheduleFromRows,
} from "@/lib/places/opening-hours";
import type { AdminOpeningDay } from "@/types/place-admin";
import { hasPlaceVersionConflict } from "./publication-logic";

export type SubmissionDraftValue = string | AdminOpeningDay[];

export type SubmissionDraftView = {
  id: string;
  entityId: string;
  entityType: "place-update" | "new-place";
  targetPlaceId: string | null;
  basePlaceUpdatedAt: string | null;
  currentPlaceUpdatedAt: string | null;
  updatedAt: string;
  hasConflict: boolean;
  items: Array<{
    fieldKey: string;
    label: string;
    valueKind: "text" | "opening-hours";
    currentValue: SubmissionDraftValue;
    latestCurrentValue: SubmissionDraftValue;
    userValue: string;
    workingValue: SubmissionDraftValue;
    decision: "PENDING" | "INCLUDE" | "REJECT";
    sortOrder: number;
  }>;
};

type DraftSeedItem = {
  fieldKey: string;
  label: string;
  currentValue: SubmissionDraftValue;
  userValue: string;
  workingValue?: SubmissionDraftValue;
};

const categorySlugs = {
  FOOD: "jedzenie",
  ACCOMMODATION: "nocleg",
  HYGIENE: "higiena",
  CLOTHING: "odziez",
  MEDICAL: "pomoc-medyczna",
  PSYCHOLOGICAL: "pomoc-psychologiczna",
  LEGAL: "pomoc-prawna",
  SOCIAL: "pomoc-socjalna",
  OTHER: "inne",
} as const;

const targetInclude = {
  categories: { include: { category: true }, orderBy: { sortOrder: "asc" as const } },
  openingHours: { orderBy: [{ kind: "asc" as const }, { weekday: "asc" as const }, { sortOrder: "asc" as const }] },
  requirements: { orderBy: { sortOrder: "asc" as const } },
  accommodation: true,
} satisfies Prisma.PlaceInclude;

type DraftTargetPlace = Prisma.PlaceGetPayload<{ include: typeof targetInclude }>;

function isOpeningHoursKey(fieldKey: string) {
  return fieldKey === "openingHours.operation" || fieldKey === "openingHours.admission";
}

function textValue(value: Prisma.JsonValue | null | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value.join("\n");
  return JSON.stringify(value, null, 2);
}

function scheduleValue(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) return emptyOpeningSchedule();
  return value as unknown as AdminOpeningDay[];
}

function jsonValue(value: SubmissionDraftValue): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function addItem(items: Map<string, DraftSeedItem>, item: DraftSeedItem) {
  if (!item.userValue.trim() || items.has(item.fieldKey)) return;
  items.set(item.fieldKey, item);
}

function placeValue(target: DraftTargetPlace | null, fieldKey: string): SubmissionDraftValue {
  if (!target) return isOpeningHoursKey(fieldKey) ? emptyOpeningSchedule() : "";
  switch (fieldKey) {
    case "name": return target.name;
    case "phone": return target.phone ?? "";
    case "addressLine": return target.addressLine;
    case "website": return target.website ?? "";
    case "description": return target.description ?? "";
    case "services": return target.services.join("\n");
    case "categorySlugs": return target.categories.map((row) => row.category.slug).join("\n");
    case "requirementsText": return target.requirements.map((row) => row.label).join("\n");
    case "publicationStatus": return target.publicationStatus;
    case "accommodationAvailabilityLabel": return target.accommodation?.availabilityLabel ?? "";
    case "accommodationImportantNote": return target.accommodation?.importantNote ?? "";
    case "openingHours.operation": return scheduleFromRows(target.openingHours, "OPERATION");
    case "openingHours.admission": return scheduleFromRows(target.openingHours, "ADMISSION");
    default: return "";
  }
}

function placeSnapshot(target: DraftTargetPlace | null) {
  if (!target) return null;
  return {
    id: target.id,
    updatedAt: target.updatedAt.toISOString(),
    name: target.name,
    phone: target.phone,
    addressLine: target.addressLine,
    website: target.website,
    description: target.description,
    services: target.services,
    categorySlugs: target.categories.map((row) => row.category.slug),
    requirements: target.requirements.map((row) => row.label),
    publicationStatus: target.publicationStatus,
    openingHours: {
      operation: scheduleFromRows(target.openingHours, "OPERATION"),
      admission: scheduleFromRows(target.openingHours, "ADMISSION"),
    },
    accommodationAvailabilityLabel: target.accommodation?.availabilityLabel ?? null,
    accommodationImportantNote: target.accommodation?.importantNote ?? null,
  };
}

function updateSeed(
  submission: NonNullable<Awaited<ReturnType<typeof prisma.placeUpdateSubmission.findUnique>>>,
  target: DraftTargetPlace | null,
) {
  const items = new Map<string, DraftSeedItem>();
  if (submission.proposedPhone) addItem(items, { fieldKey: "phone", label: "Telefon", currentValue: placeValue(target, "phone"), userValue: submission.proposedPhone });
  if (submission.proposedAddress) addItem(items, { fieldKey: "addressLine", label: "Adres", currentValue: placeValue(target, "addressLine"), userValue: submission.proposedAddress });
  if (submission.proposedOpeningHours) {
    const current = placeValue(target, "openingHours.operation");
    addItem(items, { fieldKey: "openingHours.operation", label: "Godziny działania", currentValue: current, workingValue: current, userValue: submission.proposedOpeningHours });
  }
  if (submission.proposedWebsite) addItem(items, { fieldKey: "website", label: "Strona WWW", currentValue: placeValue(target, "website"), userValue: submission.proposedWebsite });
  if (submission.submissionTypes.includes("HELP_SCOPE")) addItem(items, { fieldKey: "services", label: "Zakres pomocy", currentValue: placeValue(target, "services"), userValue: submission.proposedOtherValue || submission.description });
  if (submission.submissionTypes.includes("REQUIREMENTS")) addItem(items, { fieldKey: "requirementsText", label: "Warunki pomocy", currentValue: placeValue(target, "requirementsText"), userValue: submission.proposedOtherValue || submission.description });
  if (submission.submissionTypes.includes("TEMPORARY_CLOSURE")) addItem(items, { fieldKey: "publicationStatus", label: "Status miejsca", currentValue: placeValue(target, "publicationStatus"), userValue: "TEMPORARILY_CLOSED" });
  if (submission.submissionTypes.includes("PERMANENT_CLOSURE")) addItem(items, { fieldKey: "publicationStatus", label: "Status miejsca", currentValue: placeValue(target, "publicationStatus"), userValue: "PERMANENTLY_CLOSED" });
  if (submission.submissionTypes.includes("ACCOMMODATION_AVAILABILITY")) addItem(items, { fieldKey: "accommodationAvailabilityLabel", label: "Wolne miejsca", currentValue: placeValue(target, "accommodationAvailabilityLabel"), userValue: submission.proposedOtherValue || submission.description });
  if (submission.submissionTypes.includes("ACCOMMODATION_RULES")) addItem(items, { fieldKey: "accommodationImportantNote", label: "Warunki noclegu", currentValue: placeValue(target, "accommodationImportantNote"), userValue: submission.proposedOtherValue || submission.description });
  if (submission.submissionTypes.includes("OTHER") && submission.proposedOtherValue) addItem(items, { fieldKey: "description", label: "Opis miejsca", currentValue: placeValue(target, "description"), userValue: submission.proposedOtherValue });
  if (!items.size) addItem(items, { fieldKey: "description", label: "Opis miejsca", currentValue: placeValue(target, "description"), userValue: submission.description });
  return [...items.values()];
}

function newPlaceSeed(
  submission: NonNullable<Awaited<ReturnType<typeof prisma.newPlaceSubmission.findUnique>>>,
) {
  const rows: Array<[string, string, string | string[] | number | null | undefined]> = [
    ["name", "Nazwa miejsca", submission.name],
    ["organizationName", "Organizacja", submission.organizationName],
    ["categorySlugs", "Kategorie", submission.categories.map((item) => categorySlugs[item])],
    ["addressLine", "Adres", submission.streetAddress],
    ["postalCode", "Kod pocztowy", submission.postalCode],
    ["city", "Miasto", submission.city],
    ["district", "Dzielnica", submission.district],
    ["phone", "Telefon", submission.phone],
    ["email", "E-mail", submission.email],
    ["website", "Strona WWW", submission.website],
    ["description", "Opis", submission.description],
    ["requirementsText", "Warunki pomocy", submission.requirements],
    ["accommodationType", "Rodzaj noclegu", submission.accommodationType],
    ["targetGroups", "Grupy docelowe", submission.targetGroups],
    ["availableBeds", "Zgłoszona liczba wolnych miejsc", submission.availableBedsReported],
    ["sobrietyNote", "Zasady trzeźwości", submission.sobrietyPolicy],
    ["petNote", "Zwierzęta", submission.petPolicy],
    ["accessibilityText", "Dostępność", submission.accessibilityFeatures],
  ];
  const seed: DraftSeedItem[] = rows
    .filter(([, , value]) => value !== null && value !== undefined && String(value).trim())
    .map(([fieldKey, label, value]) => ({
      fieldKey,
      label,
      currentValue: "",
      userValue: Array.isArray(value) ? value.join("\n") : String(value),
    }));
  if (submission.openingHoursDescription) {
    seed.push({ fieldKey: "openingHours.operation", label: "Godziny działania", currentValue: emptyOpeningSchedule(), workingValue: emptyOpeningSchedule(), userValue: submission.openingHoursDescription });
  }
  if (submission.admissionHoursDescription) {
    seed.push({ fieldKey: "openingHours.admission", label: "Godziny przyjęć", currentValue: emptyOpeningSchedule(), workingValue: emptyOpeningSchedule(), userValue: submission.admissionHoursDescription });
  }
  return seed;
}

async function findTargetPlace(submission: { targetPlaceId: string | null; placeSlug: string | null; placeId: string | null }) {
  return prisma.place.findFirst({
    where: submission.targetPlaceId
      ? { id: submission.targetPlaceId }
      : { OR: [...(submission.placeSlug ? [{ slug: submission.placeSlug }] : []), ...(submission.placeId ? [{ legacyId: submission.placeId }] : [])] },
    include: targetInclude,
  });
}

async function loadTargetPlace(targetPlaceId: string | null) {
  return targetPlaceId ? prisma.place.findUnique({ where: { id: targetPlaceId }, include: targetInclude }) : null;
}

async function normalizeExistingDraft<T extends {
  id: string;
  targetPlaceId: string | null;
  basePlaceUpdatedAt: Date | null;
  createdAt: Date;
  items: Array<{ id: string; fieldKey: string; currentValueSnapshot: Prisma.JsonValue | null; userValueSnapshot: Prisma.JsonValue | null }>;
}>(draft: T) {
  const target = await loadTargetPlace(draft.targetPlaceId);
  const legacyHours = draft.items.find((item) => item.fieldKey === "todayHoursLabel");
  if (!draft.basePlaceUpdatedAt || legacyHours) {
    await prisma.$transaction(async (transaction) => {
      if (!draft.basePlaceUpdatedAt && target) {
        const inferredBase = target.updatedAt > draft.createdAt ? draft.createdAt : target.updatedAt;
        await transaction.submissionDraft.update({
          where: { id: draft.id },
          data: {
            basePlaceUpdatedAt: inferredBase,
            basePlaceSnapshot: {
              inferredForLegacyDraft: true,
              createdAt: draft.createdAt.toISOString(),
              values: Object.fromEntries(draft.items.map((item) => [item.fieldKey, item.currentValueSnapshot])),
            } as Prisma.InputJsonValue,
          },
        });
      }
      if (legacyHours) {
        const schedule = placeValue(target, "openingHours.operation");
        await transaction.submissionDraftItem.update({
          where: { id: legacyHours.id },
          data: {
            fieldKey: "openingHours.operation",
            label: "Godziny działania",
            currentValueSnapshot: jsonValue(schedule),
            workingValue: jsonValue(schedule),
          },
        });
      }
    });
  }
}

async function findDraft(submissionId: string) {
  return prisma.submissionDraft.findFirst({
    where: { OR: [{ placeUpdateSubmissionId: submissionId }, { newPlaceSubmissionId: submissionId }] },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
}

async function toView(draft: NonNullable<Awaited<ReturnType<typeof findDraft>>>): Promise<SubmissionDraftView> {
  const target = await loadTargetPlace(draft.targetPlaceId);
  return {
    id: draft.id,
    entityId: (draft.placeUpdateSubmissionId ?? draft.newPlaceSubmissionId)!,
    entityType: draft.placeUpdateSubmissionId ? "place-update" : "new-place",
    targetPlaceId: draft.targetPlaceId,
    basePlaceUpdatedAt: draft.basePlaceUpdatedAt?.toISOString() ?? null,
    currentPlaceUpdatedAt: target?.updatedAt.toISOString() ?? null,
    updatedAt: draft.updatedAt.toISOString(),
    hasConflict: hasPlaceVersionConflict(draft.basePlaceUpdatedAt, target?.updatedAt ?? null),
    items: draft.items.map((item) => {
      const hours = isOpeningHoursKey(item.fieldKey);
      return {
        fieldKey: item.fieldKey,
        label: item.label,
        valueKind: hours ? "opening-hours" : "text",
        currentValue: hours ? scheduleValue(item.currentValueSnapshot) : textValue(item.currentValueSnapshot),
        latestCurrentValue: placeValue(target, item.fieldKey),
        userValue: textValue(item.userValueSnapshot),
        workingValue: hours ? scheduleValue(item.workingValue) : textValue(item.workingValue),
        decision: item.decision,
        sortOrder: item.sortOrder,
      };
    }),
  };
}

export async function getSubmissionDraft(submissionId: string): Promise<SubmissionDraftView | null> {
  const existing = await findDraft(submissionId);
  if (!existing) return null;
  await normalizeExistingDraft(existing);
  return toView((await findDraft(submissionId))!);
}

export async function getOrCreateSubmissionDraft(submissionId: string, adminUserId: string): Promise<SubmissionDraftView | null> {
  const existing = await getSubmissionDraft(submissionId);
  if (existing) return existing;
  const [update, newPlace] = await Promise.all([
    prisma.placeUpdateSubmission.findUnique({ where: { id: submissionId } }),
    prisma.newPlaceSubmission.findUnique({ where: { id: submissionId } }),
  ]);
  if (!update && !newPlace) return null;
  const target = update ? await findTargetPlace(update) : null;
  const seed = update ? updateSeed(update, target) : newPlaceSeed(newPlace!);
  const draft = await prisma.submissionDraft.create({
    data: {
      placeUpdateSubmissionId: update?.id,
      newPlaceSubmissionId: newPlace?.id,
      targetPlaceId: target?.id,
      basePlaceUpdatedAt: target?.updatedAt,
      basePlaceSnapshot: target ? placeSnapshot(target) as Prisma.InputJsonValue : undefined,
      createdByAdminUserId: adminUserId,
      updatedByAdminUserId: adminUserId,
      items: { create: seed.map((item, sortOrder) => ({
        fieldKey: item.fieldKey,
        label: item.label,
        currentValueSnapshot: jsonValue(item.currentValue),
        userValueSnapshot: item.userValue,
        workingValue: jsonValue(item.workingValue ?? item.userValue),
        decision: "INCLUDE",
        sortOrder,
      })) },
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (update && target && update.targetPlaceId !== target.id) {
    await prisma.placeUpdateSubmission.update({ where: { id: update.id }, data: { targetPlaceId: target.id } });
  }
  return toView(draft);
}

export function formatDraftValue(value: SubmissionDraftValue) {
  return typeof value === "string" ? value : formatOpeningSchedule(value);
}
