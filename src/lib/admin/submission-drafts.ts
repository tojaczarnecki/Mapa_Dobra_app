import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type SubmissionDraftView = {
  id: string;
  entityId: string;
  entityType: "place-update" | "new-place";
  targetPlaceId: string | null;
  items: Array<{
    fieldKey: string;
    label: string;
    currentValue: string;
    userValue: string;
    workingValue: string;
    decision: "PENDING" | "INCLUDE" | "REJECT";
    sortOrder: number;
  }>;
};

type DraftSeedItem = {
  fieldKey: string;
  label: string;
  currentValue: string;
  userValue: string;
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

function jsonText(value: Prisma.JsonValue | null | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join("\n");
  return JSON.stringify(value, null, 2);
}

function addItem(items: Map<string, DraftSeedItem>, item: DraftSeedItem) {
  if (!item.userValue.trim() || items.has(item.fieldKey)) return;
  items.set(item.fieldKey, item);
}

function updateSeed(
  submission: NonNullable<Awaited<ReturnType<typeof prisma.placeUpdateSubmission.findUnique>>>,
  target: Awaited<ReturnType<typeof findTargetPlace>>,
) {
  const items = new Map<string, DraftSeedItem>();
  if (submission.proposedPhone) addItem(items, { fieldKey: "phone", label: "Telefon", currentValue: target?.phone ?? "", userValue: submission.proposedPhone });
  if (submission.proposedAddress) addItem(items, { fieldKey: "addressLine", label: "Adres", currentValue: target?.addressLine ?? "", userValue: submission.proposedAddress });
  if (submission.proposedOpeningHours) addItem(items, { fieldKey: "todayHoursLabel", label: "Godziny", currentValue: target?.todayHoursLabel ?? "", userValue: submission.proposedOpeningHours });
  if (submission.proposedWebsite) addItem(items, { fieldKey: "website", label: "Strona WWW", currentValue: target?.website ?? "", userValue: submission.proposedWebsite });

  if (submission.submissionTypes.includes("HELP_SCOPE")) {
    addItem(items, { fieldKey: "services", label: "Zakres pomocy", currentValue: target?.services.join("\n") ?? "", userValue: submission.proposedOtherValue || submission.description });
  }
  if (submission.submissionTypes.includes("REQUIREMENTS")) {
    addItem(items, { fieldKey: "requirementsText", label: "Warunki pomocy", currentValue: target?.requirements.map((item) => item.label).join("\n") ?? "", userValue: submission.proposedOtherValue || submission.description });
  }
  if (submission.submissionTypes.includes("TEMPORARY_CLOSURE")) {
    addItem(items, { fieldKey: "publicationStatus", label: "Status miejsca", currentValue: target?.publicationStatus ?? "", userValue: "TEMPORARILY_CLOSED" });
  }
  if (submission.submissionTypes.includes("PERMANENT_CLOSURE")) {
    addItem(items, { fieldKey: "publicationStatus", label: "Status miejsca", currentValue: target?.publicationStatus ?? "", userValue: "PERMANENTLY_CLOSED" });
  }
  if (submission.submissionTypes.includes("ACCOMMODATION_AVAILABILITY")) {
    addItem(items, { fieldKey: "accommodationAvailabilityLabel", label: "Wolne miejsca", currentValue: target?.accommodation?.availabilityLabel ?? "", userValue: submission.proposedOtherValue || submission.description });
  }
  if (submission.submissionTypes.includes("ACCOMMODATION_RULES")) {
    addItem(items, { fieldKey: "accommodationImportantNote", label: "Warunki noclegu", currentValue: target?.accommodation?.importantNote ?? "", userValue: submission.proposedOtherValue || submission.description });
  }
  if (submission.submissionTypes.includes("OTHER") && submission.proposedOtherValue) {
    addItem(items, { fieldKey: "description", label: "Opis miejsca", currentValue: target?.description ?? "", userValue: submission.proposedOtherValue });
  }
  if (!items.size) {
    addItem(items, { fieldKey: "description", label: "Opis miejsca", currentValue: target?.description ?? "", userValue: submission.description });
  }
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
    ["todayHoursLabel", "Godziny", submission.openingHoursDescription],
    ["description", "Opis", submission.description],
    ["requirementsText", "Warunki pomocy", submission.requirements],
    ["accommodationType", "Rodzaj noclegu", submission.accommodationType],
    ["targetGroups", "Grupy docelowe", submission.targetGroups],
    ["availableBeds", "Zgłoszona liczba wolnych miejsc", submission.availableBedsReported],
    ["admissionHoursDescription", "Godziny przyjęć", submission.admissionHoursDescription],
    ["sobrietyNote", "Zasady trzeźwości", submission.sobrietyPolicy],
    ["petNote", "Zwierzęta", submission.petPolicy],
    ["accessibilityText", "Dostępność", submission.accessibilityFeatures],
  ];
  return rows
    .filter(([, , value]) => value !== null && value !== undefined && String(value).trim())
    .map(([fieldKey, label, value]) => ({
      fieldKey,
      label,
      currentValue: "",
      userValue: Array.isArray(value) ? value.join("\n") : String(value),
    }));
}

async function findTargetPlace(submission: {
  targetPlaceId: string | null;
  placeSlug: string | null;
  placeId: string | null;
}) {
  return prisma.place.findFirst({
    where: submission.targetPlaceId
      ? { id: submission.targetPlaceId }
      : {
          OR: [
            ...(submission.placeSlug ? [{ slug: submission.placeSlug }] : []),
            ...(submission.placeId ? [{ legacyId: submission.placeId }] : []),
          ],
        },
    include: {
      requirements: { orderBy: { sortOrder: "asc" } },
      accommodation: true,
    },
  });
}

function toView(draft: {
  id: string;
  placeUpdateSubmissionId: string | null;
  newPlaceSubmissionId: string | null;
  targetPlaceId: string | null;
  items: Array<{
    fieldKey: string;
    label: string;
    currentValueSnapshot: Prisma.JsonValue | null;
    userValueSnapshot: Prisma.JsonValue | null;
    workingValue: Prisma.JsonValue | null;
    decision: "PENDING" | "INCLUDE" | "REJECT";
    sortOrder: number;
  }>;
}): SubmissionDraftView {
  const isUpdate = Boolean(draft.placeUpdateSubmissionId);
  return {
    id: draft.id,
    entityId: (draft.placeUpdateSubmissionId ?? draft.newPlaceSubmissionId)!,
    entityType: isUpdate ? "place-update" : "new-place",
    targetPlaceId: draft.targetPlaceId,
    items: draft.items.map((item) => ({
      fieldKey: item.fieldKey,
      label: item.label,
      currentValue: jsonText(item.currentValueSnapshot),
      userValue: jsonText(item.userValueSnapshot),
      workingValue: jsonText(item.workingValue),
      decision: item.decision,
      sortOrder: item.sortOrder,
    })),
  };
}

export async function getOrCreateSubmissionDraft(
  submissionId: string,
  adminUserId: string,
): Promise<SubmissionDraftView | null> {
  const existing = await prisma.submissionDraft.findFirst({
    where: { OR: [{ placeUpdateSubmissionId: submissionId }, { newPlaceSubmissionId: submissionId }] },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (existing) return toView(existing);

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
      createdByAdminUserId: adminUserId,
      updatedByAdminUserId: adminUserId,
      items: {
        create: seed.map((item, sortOrder) => ({
          fieldKey: item.fieldKey,
          label: item.label,
          currentValueSnapshot: item.currentValue || Prisma.JsonNull,
          userValueSnapshot: item.userValue,
          workingValue: item.userValue,
          decision: "INCLUDE",
          sortOrder,
        })),
      },
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (update && target && update.targetPlaceId !== target.id) {
    await prisma.placeUpdateSubmission.update({ where: { id: update.id }, data: { targetPlaceId: target.id } });
  }
  return toView(draft);
}
