"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/session";
import {
  canPublishSubmission,
  hasPlaceVersionConflict,
  publicationAuditValues,
  splitPublicationItems,
} from "@/lib/admin/publication-logic";
import { getOrCreateSubmissionDraft } from "@/lib/admin/submission-drafts";
import {
  deriveTodayHoursLabel,
  emptyOpeningSchedule,
  openingRows,
  scheduleFromRows,
  validateOpeningSchedule,
} from "@/lib/places/opening-hours";
import { validatePlaceStatusCombination } from "@/lib/places/publication-status";
import { syncPlaceStructuredRelations } from "@/lib/places/structured-relations";
import type { AdminOpeningDay } from "@/types/place-admin";

export type DraftActionState = { error?: string; success?: string; conflict?: boolean };

type DraftInputItem = {
  fieldKey: string;
  workingValue: string | AdminOpeningDay[];
  decision: "PENDING" | "INCLUDE" | "REJECT";
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const decisions = ["PENDING", "INCLUDE", "REJECT"] as const;
const publicationStatuses = ["DRAFT", "PUBLISHED", "TEMPORARILY_CLOSED", "PERMANENTLY_CLOSED", "ARCHIVED"] as const;

function isOpeningHoursKey(fieldKey: string) {
  return fieldKey === "openingHours.operation" || fieldKey === "openingHours.admission";
}

function parseItems(formData: FormData, validateIncludedHours = true) {
  const draftId = formData.get("draftId");
  const raw = formData.get("items");
  if (typeof draftId !== "string" || !uuidPattern.test(draftId) || typeof raw !== "string" || raw.length > 180_000) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value) || value.length < 1 || value.length > 60) return null;
    const items: DraftInputItem[] = [];
    const keys = new Set<string>();
    for (const item of value) {
      if (typeof item !== "object" || item === null) return null;
      const record = item as Record<string, unknown>;
      if (
        typeof record.fieldKey !== "string" ||
        !/^[a-zA-Z][a-zA-Z0-9.]{1,119}$/u.test(record.fieldKey) ||
        keys.has(record.fieldKey) ||
        typeof record.decision !== "string" ||
        !decisions.includes(record.decision as (typeof decisions)[number])
      ) return null;
      let workingValue: DraftInputItem["workingValue"];
      if (isOpeningHoursKey(record.fieldKey)) {
        if (!Array.isArray(record.workingValue) || record.workingValue.length > 7) return null;
        if (record.decision === "INCLUDE" && validateIncludedHours) {
          const validation = validateOpeningSchedule(record.workingValue);
          if (!validation.ok) throw new Error(`HOURS:${validation.error}`);
          workingValue = validation.days;
        } else {
          workingValue = record.workingValue as AdminOpeningDay[];
        }
      } else {
        if (typeof record.workingValue !== "string" || record.workingValue.length > 4000) return null;
        workingValue = record.workingValue.trim();
      }
      keys.add(record.fieldKey);
      items.push({
        fieldKey: record.fieldKey,
        workingValue,
        decision: record.decision as DraftInputItem["decision"],
      });
    }
    return { draftId, items };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("HOURS:")) throw error;
    return null;
  }
}

function lines(value: string) {
  return Array.from(new Set(value.split(/\r?\n|,/u).map((item) => item.trim()).filter(Boolean))).slice(0, 30);
}

function textValue(item: DraftInputItem | undefined) {
  return typeof item?.workingValue === "string" ? item.workingValue : "";
}

function jsonValue(value: DraftInputItem["workingValue"]) {
  return value as Prisma.InputJsonValue;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("pl-PL").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 180) || "nowe-miejsce";
}

async function uniqueSlug(transaction: Prisma.TransactionClient, name: string) {
  const base = slugify(name);
  let slug = base;
  for (let suffix = 2; await transaction.place.findUnique({ where: { slug }, select: { id: true } }); suffix += 1) slug = `${base}-${suffix}`;
  return slug;
}

async function updateDraftItems(transaction: Prisma.TransactionClient, draftId: string, items: DraftInputItem[], adminUserId: string) {
  const draft = await transaction.submissionDraft.findUnique({ where: { id: draftId }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!draft || draft.items.length !== items.length) throw new Error("DRAFT_NOT_FOUND");
  const allowedKeys = new Set(draft.items.map((item) => item.fieldKey));
  if (items.some((item) => !allowedKeys.has(item.fieldKey))) throw new Error("INVALID_FIELDS");
  for (const item of items) {
    await transaction.submissionDraftItem.update({
      where: { submissionDraftId_fieldKey: { submissionDraftId: draftId, fieldKey: item.fieldKey } },
      data: { workingValue: jsonValue(item.workingValue), decision: item.decision },
    });
  }
  await transaction.submissionDraft.update({ where: { id: draftId }, data: { updatedByAdminUserId: adminUserId } });
  return draft;
}

function parseDraft(formData: FormData, validateIncludedHours = true): ReturnType<typeof parseItems> {
  try {
    return parseItems(formData, validateIncludedHours);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("HOURS:")) throw error;
    return null;
  }
}

export async function saveSubmissionDraft(_state: DraftActionState, formData: FormData): Promise<DraftActionState> {
  const session = await requirePermission("MODERATE_SUBMISSIONS");
  let parsed: ReturnType<typeof parseItems>;
  try { parsed = parseDraft(formData); } catch (error) {
    return { error: error instanceof Error ? error.message.slice(6) : "Sprawdź godziny." };
  }
  if (!parsed) return { error: "Nie udało się odczytać wersji roboczej." };
  try {
    await prisma.$transaction(async (transaction) => {
      const previous = await updateDraftItems(transaction, parsed.draftId, parsed.items, session.user.id);
      await transaction.auditLog.create({ data: {
        adminUserId: session.user.id,
        action: "DRAFT_SAVED",
        entityType: "SUBMISSION_DRAFT",
        entityId: parsed.draftId,
        changedFields: parsed.items.map((item) => item.fieldKey),
        previousValues: previous.items.map((item) => ({ fieldKey: item.fieldKey, workingValue: item.workingValue, decision: item.decision })) as Prisma.InputJsonValue,
        newValues: parsed.items as Prisma.InputJsonValue,
        changeOrigin: "USER_SUBMISSION",
      } });
    });
    revalidatePath("/admin/zgloszenia");
    return { success: "Wersja robocza została zapisana." };
  } catch {
    return { error: "Nie udało się zapisać wersji roboczej." };
  }
}

function accommodationType(value: string) {
  const normalized = value.toLocaleLowerCase("pl-PL");
  if (normalized.includes("noclegown")) return "NIGHT_SHELTER" as const;
  if (normalized.includes("ogrzewal")) return "WARMING_CENTER" as const;
  if (normalized.includes("hostel interw")) return "INTERVENTION_HOSTEL" as const;
  if (normalized.includes("hostel")) return "HOSTEL" as const;
  if (normalized.includes("opieku")) return "CARE_SHELTER" as const;
  if (normalized.includes("kobiet") && normalized.includes("dzie")) return "WOMEN_WITH_CHILDREN_HOME" as const;
  if (normalized.includes("schron")) return "SHELTER" as const;
  return "OTHER" as const;
}

const publishPlaceInclude = {
  categories: { include: { category: true } },
  openingHours: { orderBy: [{ kind: "asc" as const }, { weekday: "asc" as const }, { sortOrder: "asc" as const }] },
  requirements: true,
  accessibility: true,
  socialLinks: true,
  audienceDefinitions: { include: { definition: true } },
  accommodation: { include: { capacityGroups: true } },
} satisfies Prisma.PlaceInclude;

async function replaceSchedule(transaction: Prisma.TransactionClient, placeId: string, kind: "OPERATION" | "ADMISSION", days: AdminOpeningDay[]) {
  const validation = validateOpeningSchedule(days);
  if (!validation.ok) throw new Error(`HOURS:${validation.error}`);
  await transaction.openingHours.deleteMany({ where: { placeId, kind } });
  await transaction.openingHours.createMany({ data: openingRows(validation.days, kind).map((row) => ({ placeId, ...row })) });
  return validation.days;
}

async function publishPlaceUpdate(
  transaction: Prisma.TransactionClient,
  draft: {
    targetPlaceId: string | null;
    basePlaceUpdatedAt: Date | null;
    placeUpdateSubmission: { id: string; targetPlaceId: string | null };
  },
  included: DraftInputItem[],
  adminUserId: string,
) {
  const targetId = draft.targetPlaceId ?? draft.placeUpdateSubmission.targetPlaceId;
  if (!targetId) throw new Error("NO_TARGET");
  const current = await transaction.place.findUnique({ where: { id: targetId }, include: publishPlaceInclude });
  if (!current) throw new Error("NO_TARGET");
  if (!draft.basePlaceUpdatedAt || hasPlaceVersionConflict(draft.basePlaceUpdatedAt, current.updatedAt)) throw new Error("PLACE_CONFLICT");

  const scalar: Prisma.PlaceUncheckedUpdateManyInput = { lastEditedByAdminUserId: adminUserId };
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  let categoryValues: string[] | null = null;
  let requirementsText: string[] | null = null;
  let accommodationAvailability: string | null = null;
  let accommodationNote: string | null = null;
  let operationSchedule: AdminOpeningDay[] | null = null;
  let admissionSchedule: AdminOpeningDay[] | null = null;

  for (const item of included) {
    after[item.fieldKey] = item.workingValue;
    const value = textValue(item);
    switch (item.fieldKey) {
      case "name": before.name = current.name; scalar.name = value; break;
      case "phone": before.phone = current.phone; scalar.phone = value || null; break;
      case "addressLine": before.addressLine = current.addressLine; scalar.addressLine = value; break;
      case "website": before.website = current.website; scalar.website = value || null; break;
      case "description": before.description = current.description; scalar.description = value || null; break;
      case "services": before.services = current.services; scalar.services = lines(value); break;
      case "categorySlugs": before.categorySlugs = current.categories.map((row) => row.category.slug); categoryValues = lines(value); break;
      case "requirementsText": before.requirements = current.requirements.map((row) => row.label); requirementsText = lines(value); break;
      case "openingHours.operation":
        before[item.fieldKey] = scheduleFromRows(current.openingHours, "OPERATION");
        operationSchedule = item.workingValue as AdminOpeningDay[];
        scalar.todayHoursLabel = deriveTodayHoursLabel(operationSchedule);
        break;
      case "openingHours.admission":
        before[item.fieldKey] = scheduleFromRows(current.openingHours, "ADMISSION");
        admissionSchedule = item.workingValue as AdminOpeningDay[];
        break;
      case "publicationStatus": {
        if (!publicationStatuses.includes(value as (typeof publicationStatuses)[number])) throw new Error("INVALID_STATUS");
        before.publicationStatus = current.publicationStatus;
        scalar.publicationStatus = value as (typeof publicationStatuses)[number];
        if (value === "TEMPORARILY_CLOSED" || value === "PERMANENTLY_CLOSED") scalar.operationalStatus = "CLOSED";
        const combination = validatePlaceStatusCombination(
          value as (typeof publicationStatuses)[number],
          value === "TEMPORARILY_CLOSED" || value === "PERMANENTLY_CLOSED" ? "CLOSED" : current.operationalStatus,
        );
        if (!combination.ok) throw new Error("INVALID_STATUS");
        break;
      }
      case "accommodationAvailabilityLabel": before.accommodationAvailabilityLabel = current.accommodation?.availabilityLabel; accommodationAvailability = value; break;
      case "accommodationImportantNote": before.accommodationImportantNote = current.accommodation?.importantNote; accommodationNote = value; break;
    }
  }

  const updated = await transaction.place.updateMany({ where: { id: current.id, updatedAt: draft.basePlaceUpdatedAt }, data: scalar });
  if (updated.count !== 1) throw new Error("PLACE_CONFLICT");
  if (operationSchedule) await replaceSchedule(transaction, current.id, "OPERATION", operationSchedule);
  if (admissionSchedule) {
    if (!current.accommodation) throw new Error("NO_ACCOMMODATION");
    await replaceSchedule(transaction, current.id, "ADMISSION", admissionSchedule);
    await transaction.accommodationDetails.update({ where: { id: current.accommodation.id }, data: { admissionHoursDescription: deriveTodayHoursLabel(admissionSchedule) } });
  }
  if (categoryValues) {
    const categories = await transaction.category.findMany({ where: { slug: { in: categoryValues }, active: true } });
    if (!categories.length || categories.length !== categoryValues.length) throw new Error("INVALID_CATEGORY");
    await transaction.placeCategory.deleteMany({ where: { placeId: current.id } });
    await transaction.placeCategory.createMany({ data: categoryValues.map((slug, sortOrder) => ({ placeId: current.id, categoryId: categories.find((item) => item.slug === slug)!.id, sortOrder })) });
    await transaction.place.update({ where: { id: current.id }, data: { primaryCategoryId: categories.find((item) => item.slug === categoryValues![0])!.id } });
  }
  if (requirementsText) {
    await transaction.placeRequirement.deleteMany({ where: { placeId: current.id } });
    if (requirementsText.length) await transaction.placeRequirement.createMany({ data: requirementsText.map((label, sortOrder) => ({ placeId: current.id, kind: "OTHER", state: "UNKNOWN", label, sortOrder })) });
  }
  await syncPlaceStructuredRelations(
    transaction,
    current.id,
    requirementsText
      ? requirementsText.map((label) => ({ kind: "OTHER" as const, state: "UNKNOWN" as const, label, note: "" }))
      : current.requirements.map((item) => ({ kind: item.kind, state: item.state, label: item.label, note: item.note ?? "" })),
    current.accessibility.map((item) => ({ feature: item.feature, state: item.state, label: item.label, note: item.note ?? "" })),
    current.audienceDefinitions.length ? current.audienceDefinitions.map((item) => item.definition.label) : current.audience,
    current.socialLinks.map((item) => ({ platform: item.platform, url: item.url, label: item.label ?? "" })),
  );
  if (accommodationAvailability !== null || accommodationNote !== null) {
    if (!current.accommodation) throw new Error("NO_ACCOMMODATION");
    await transaction.accommodationDetails.update({ where: { id: current.accommodation.id }, data: {
      ...(accommodationAvailability !== null ? { availabilityLabel: accommodationAvailability || null, availabilityState: "UNKNOWN", availabilityConfirmedAt: new Date() } : {}),
      ...(accommodationNote !== null ? { importantNote: accommodationNote || null } : {}),
    } });
  }
  return { placeId: current.id, slug: current.slug, categorySlug: categoryValues?.[0] ?? current.categories[0]?.category.slug ?? "inne", before, after };
}

async function publishNewPlace(transaction: Prisma.TransactionClient, included: DraftInputItem[], adminUserId: string, submissionOrganizationId?: string | null) {
  const values = new Map(included.map((item) => [item.fieldKey, item]));
  const name = textValue(values.get("name")).trim();
  const addressLine = textValue(values.get("addressLine")).trim();
  const city = textValue(values.get("city")).trim() || "Łódź";
  const requestedCategories = lines(textValue(values.get("categorySlugs")));
  if (!name || !addressLine || !requestedCategories.length) throw new Error("MISSING_REQUIRED");
  const categories = await transaction.category.findMany({ where: { slug: { in: requestedCategories }, active: true } });
  if (categories.length !== requestedCategories.length) throw new Error("INVALID_CATEGORY");
  const primary = categories.find((item) => item.slug === requestedCategories[0])!;
  let organizationId: string | null = submissionOrganizationId ?? null;
  const organizationName = textValue(values.get("organizationName")).trim();
  if (organizationName && !organizationId) {
    const organization = await transaction.organization.findFirst({ where: { active: true, name: { equals: organizationName, mode: "insensitive" } }, select: { id: true } });
    if (organization) organizationId = organization.id;
    else {
      const created = await transaction.organization.create({ data: { slug: slugify(organizationName), name: organizationName } });
      organizationId = created.id;
    }
  }
  const operationItem = values.get("openingHours.operation");
  const operationSchedule = operationItem ? operationItem.workingValue as AdminOpeningDay[] : emptyOpeningSchedule();
  const operationValidation = validateOpeningSchedule(operationSchedule);
  if (!operationValidation.ok) throw new Error(`HOURS:${operationValidation.error}`);
  const slug = await uniqueSlug(transaction, name);
  const place = await transaction.place.create({ data: {
    slug, name, organizationId, primaryCategoryId: primary.id,
    description: textValue(values.get("description")) || null,
    addressLine, postalCode: textValue(values.get("postalCode")) || null, city,
    district: textValue(values.get("district")) || null,
    phone: textValue(values.get("phone")) || null,
    email: textValue(values.get("email")) || null,
    website: textValue(values.get("website")) || null,
    todayHoursLabel: deriveTodayHoursLabel(operationValidation.days),
    publicationStatus: "PUBLISHED", verificationStatus: "VERIFIED", verifiedAt: new Date(),
    lastEditedByAdminUserId: adminUserId, recordKind: "PRODUCTION", isDemo: false,
  } });
  await transaction.placeCategory.createMany({ data: requestedCategories.map((categorySlug, sortOrder) => ({ placeId: place.id, categoryId: categories.find((item) => item.slug === categorySlug)!.id, sortOrder })) });
  await transaction.openingHours.createMany({ data: openingRows(operationValidation.days, "OPERATION").map((row) => ({ placeId: place.id, ...row })) });
  const requirements = lines(textValue(values.get("requirementsText")));
  if (requirements.length) await transaction.placeRequirement.createMany({ data: requirements.map((label, sortOrder) => ({ placeId: place.id, kind: "OTHER", state: "UNKNOWN", label, sortOrder })) });
  const accessibility = lines(textValue(values.get("accessibilityText")));
  if (accessibility.length) await transaction.placeAccessibility.createMany({ data: accessibility.map((label, sortOrder) => ({ placeId: place.id, feature: "OTHER", state: "UNKNOWN", label, sortOrder })) });
  await syncPlaceStructuredRelations(
    transaction,
    place.id,
    requirements.map((label) => ({ kind: "OTHER" as const, state: "UNKNOWN" as const, label, note: "" })),
    accessibility.map((label) => ({ feature: "OTHER" as const, state: "UNKNOWN" as const, label, note: "" })),
    Array.isArray(place.audience) ? place.audience : [],
    [],
  );

  if (requestedCategories.includes("nocleg") || values.has("accommodationType")) {
    const freeBedsText = textValue(values.get("availableBeds"));
    const freeBeds = /^\d+$/u.test(freeBedsText) ? Number(freeBedsText) : null;
    const admissionItem = values.get("openingHours.admission");
    const admissionSchedule = admissionItem ? admissionItem.workingValue as AdminOpeningDay[] : emptyOpeningSchedule();
    const admissionValidation = validateOpeningSchedule(admissionSchedule);
    if (!admissionValidation.ok) throw new Error(`HOURS:${admissionValidation.error}`);
    const accommodation = await transaction.accommodationDetails.create({ data: {
      placeId: place.id, type: accommodationType(textValue(values.get("accommodationType"))), targetGroups: lines(textValue(values.get("targetGroups"))),
      admissionHoursDescription: deriveTodayHoursLabel(admissionValidation.days),
      sobrietyNote: textValue(values.get("sobrietyNote")) || null, petNote: textValue(values.get("petNote")) || null,
      availabilityState: freeBeds === null ? "UNKNOWN" : freeBeds > 1 ? "AVAILABLE" : freeBeds === 1 ? "FEW" : "FULL",
      availabilityLabel: freeBeds === null ? null : `${freeBeds} wolnych miejsc`, availabilityConfirmedAt: freeBeds === null ? null : new Date(),
      importantNote: "Informacja o wolnych miejscach nie jest gwarancją przyjęcia.",
    } });
    await transaction.openingHours.createMany({ data: openingRows(admissionValidation.days, "ADMISSION").map((row) => ({ placeId: place.id, ...row })) });
    if (freeBeds !== null) {
      const group = await transaction.accommodationCapacityGroup.create({ data: { accommodationDetailsId: accommodation.id, label: "Ogólna", availableBeds: freeBeds, availabilityUpdatedAt: new Date(), updatedByAdminUserId: adminUserId } });
      await transaction.accommodationAvailabilityHistory.create({ data: { accommodationDetailsId: accommodation.id, capacityGroupId: group.id, availabilityState: freeBeds > 1 ? "AVAILABLE" : freeBeds === 1 ? "FEW" : "FULL", availableBeds: freeBeds, reportedAt: new Date(), adminUserId, origin: "USER_SUBMISSION" } });
    }
  }
  return { placeId: place.id, slug, categorySlug: requestedCategories[0], before: {}, after: Object.fromEntries(included.map((item) => [item.fieldKey, item.workingValue])) };
}

export async function publishSubmissionDraft(_state: DraftActionState, formData: FormData): Promise<DraftActionState> {
  const session = await requirePermission("PUBLISH_SUBMISSIONS");
  let parsed: ReturnType<typeof parseItems>;
  try { parsed = parseDraft(formData); } catch (error) {
    return { error: error instanceof Error ? error.message.slice(6) : "Sprawdź godziny." };
  }
  const noteValue = formData.get("note");
  const note = typeof noteValue === "string" ? noteValue.trim().slice(0, 1000) : "";
  if (!parsed) return { error: "Nie udało się odczytać wersji do publikacji." };
  const selected = splitPublicationItems(parsed.items);
  if (selected.pending.length) return { error: "Podejmij decyzję dla każdego pola przed publikacją." };
  if (!selected.included.length) return { error: "Wybierz co najmniej jedno pole do publikacji albo odrzuć zgłoszenie." };

  try {
    // Work is persisted before publishing so a version conflict never discards moderator corrections.
    await prisma.$transaction((transaction) => updateDraftItems(transaction, parsed.draftId, parsed.items, session.user.id));
    const published = await prisma.$transaction(async (transaction) => {
      const draft = await transaction.submissionDraft.findUnique({ where: { id: parsed.draftId }, include: { placeUpdateSubmission: true, newPlaceSubmission: true } });
      if (!draft) throw new Error("DRAFT_NOT_FOUND");
      const submission = draft.placeUpdateSubmission ?? draft.newPlaceSubmission;
      if (!submission || !canPublishSubmission(submission.moderationStatus, submission.publicationStatus)) throw new Error("INVALID_STATUS");
      const result = draft.placeUpdateSubmission
        ? await publishPlaceUpdate(transaction, draft as Parameters<typeof publishPlaceUpdate>[1], selected.included, session.user.id)
        : await publishNewPlace(transaction, selected.included, session.user.id, draft.newPlaceSubmission?.organizationId);
      const now = new Date();
      const moderationData = submission.moderationStatus === "APPROVED" ? {} : {
        moderationStatus: "APPROVED" as const, moderatorNote: note || null, rejectionReason: null,
        moderatedAt: now, moderatedByAdminUserId: session.user.id,
      };
      const shared = { ...moderationData, publicationStatus: "PUBLISHED" as const, publishedPlaceId: result.placeId, publishedAt: now };
      const changed = draft.placeUpdateSubmission
        ? await transaction.placeUpdateSubmission.updateMany({ where: { id: draft.placeUpdateSubmission.id, publicationStatus: "NOT_PUBLISHED", moderationStatus: { not: "REJECTED" } }, data: shared })
        : await transaction.newPlaceSubmission.updateMany({ where: { id: draft.newPlaceSubmission!.id, publicationStatus: "NOT_PUBLISHED", moderationStatus: { not: "REJECTED" } }, data: shared });
      if (changed.count !== 1) throw new Error("CONCURRENT_UPDATE");
      const entityId = draft.placeUpdateSubmission?.id ?? draft.newPlaceSubmission!.id;
      const entityType = draft.placeUpdateSubmission ? "PLACE_UPDATE_SUBMISSION" : "NEW_PLACE_SUBMISSION";
      const rejectedFields = selected.rejected.map((item) => item.fieldKey);
      await transaction.auditLog.create({ data: {
        adminUserId: session.user.id, action: "SUBMISSION_PUBLISHED", entityType, entityId,
        previousStatus: submission.moderationStatus, newStatus: "APPROVED",
        changedFields: selected.included.map((item) => item.fieldKey),
        previousValues: result.before as Prisma.InputJsonValue,
        newValues: publicationAuditValues(result.after, rejectedFields, result.placeId) as Prisma.InputJsonValue,
        changeOrigin: "USER_SUBMISSION", sourceReferenceId: entityId, note: note || null,
      } });
      await transaction.auditLog.create({ data: {
        adminUserId: session.user.id, action: draft.placeUpdateSubmission ? "PLACE_UPDATED" : "PLACE_CREATED", entityType: "PLACE", entityId: result.placeId,
        changedFields: selected.included.map((item) => item.fieldKey), previousValues: result.before as Prisma.InputJsonValue,
        newValues: result.after as Prisma.InputJsonValue, changeOrigin: "USER_SUBMISSION", sourceReferenceId: entityId, note: note || null,
      } });
      return result;
    });
    revalidatePath("/admin"); revalidatePath("/admin/zgloszenia"); revalidatePath("/admin/miejsca"); revalidatePath(`/admin/miejsca/${published.placeId}`);
    revalidatePath("/szukaj"); revalidatePath("/mapa"); revalidatePath(`/lodz/${published.categorySlug}/${published.slug}`);
    return { success: "Wybrane dane zostały opublikowane." };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "PLACE_CONFLICT") return { error: "Dane miejsca zmieniły się od czasu rozpoczęcia moderacji. Zachowaliśmy Twoje korekty. Porównaj aktualne dane i wykonaj rebase.", conflict: true };
    if (reason === "NO_TARGET") return { error: "Nie odnaleziono miejsca, którego dotyczy zgłoszenie." };
    if (reason === "MISSING_REQUIRED") return { error: "Wersja do publikacji nie zawiera wymaganej nazwy, adresu lub kategorii." };
    if (reason === "INVALID_CATEGORY") return { error: "Co najmniej jedna kategoria nie istnieje w bazie." };
    if (reason.startsWith("HOURS:")) return { error: reason.slice(6) };
    return { error: "Nie udało się opublikować zmian. Żadne dane publiczne nie zostały częściowo zapisane." };
  }
}

export async function prepareApprovedSubmissionDraft(formData: FormData) {
  const session = await requirePermission("MODERATE_SUBMISSIONS");
  const submissionId = formData.get("submissionId");
  if (typeof submissionId !== "string" || !uuidPattern.test(submissionId)) return;
  const [update, newPlace] = await Promise.all([
    prisma.placeUpdateSubmission.findUnique({ where: { id: submissionId }, select: { moderationStatus: true, publicationStatus: true } }),
    prisma.newPlaceSubmission.findUnique({ where: { id: submissionId }, select: { moderationStatus: true, publicationStatus: true } }),
  ]);
  const submission = update ?? newPlace;
  if (!submission || submission.moderationStatus !== "APPROVED" || submission.publicationStatus !== "NOT_PUBLISHED") return;
  await getOrCreateSubmissionDraft(submissionId, session.user.id);
  revalidatePath(`/admin/zgloszenia/${submissionId}`);
}

export async function rebaseSubmissionDraft(formData: FormData) {
  const session = await requirePermission("MODERATE_SUBMISSIONS");
  let parsed: ReturnType<typeof parseItems>;
  try { parsed = parseDraft(formData, false); } catch { return; }
  if (!parsed) return;
  await prisma.$transaction(async (transaction) => {
    await updateDraftItems(transaction, parsed.draftId, parsed.items, session.user.id);
    const draft = await transaction.submissionDraft.findUnique({ where: { id: parsed.draftId }, include: { items: true } });
    if (!draft?.targetPlaceId) throw new Error("NO_TARGET");
    const place = await transaction.place.findUnique({ where: { id: draft.targetPlaceId }, include: publishPlaceInclude });
    if (!place) throw new Error("NO_TARGET");
    const valueFor = (fieldKey: string): DraftInputItem["workingValue"] => {
      switch (fieldKey) {
        case "name": return place.name;
        case "phone": return place.phone ?? "";
        case "addressLine": return place.addressLine;
        case "website": return place.website ?? "";
        case "description": return place.description ?? "";
        case "services": return place.services.join("\n");
        case "categorySlugs": return place.categories.map((row) => row.category.slug).join("\n");
        case "requirementsText": return place.requirements.map((row) => row.label).join("\n");
        case "publicationStatus": return place.publicationStatus;
        case "accommodationAvailabilityLabel": return place.accommodation?.availabilityLabel ?? "";
        case "accommodationImportantNote": return place.accommodation?.importantNote ?? "";
        case "openingHours.operation": return scheduleFromRows(place.openingHours, "OPERATION");
        case "openingHours.admission": return scheduleFromRows(place.openingHours, "ADMISSION");
        default: return "";
      }
    };
    for (const item of draft.items) {
      await transaction.submissionDraftItem.update({ where: { id: item.id }, data: { currentValueSnapshot: jsonValue(valueFor(item.fieldKey)) } });
    }
    await transaction.submissionDraft.update({ where: { id: draft.id }, data: {
      basePlaceUpdatedAt: place.updatedAt,
      basePlaceSnapshot: { updatedAt: place.updatedAt.toISOString(), values: Object.fromEntries(draft.items.map((item) => [item.fieldKey, valueFor(item.fieldKey)])) } as Prisma.InputJsonValue,
      updatedByAdminUserId: session.user.id,
    } });
    await transaction.auditLog.create({ data: {
      adminUserId: session.user.id, action: "DRAFT_REBASED", entityType: "SUBMISSION_DRAFT", entityId: draft.id,
      changedFields: draft.items.map((item) => item.fieldKey),
      previousValues: { basePlaceUpdatedAt: draft.basePlaceUpdatedAt?.toISOString() ?? null },
      newValues: { basePlaceUpdatedAt: place.updatedAt.toISOString() },
      changeOrigin: "USER_SUBMISSION",
    } });
  });
  revalidatePath("/admin/zgloszenia");
}
