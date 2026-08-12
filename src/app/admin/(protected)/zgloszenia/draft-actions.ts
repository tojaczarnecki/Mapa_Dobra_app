"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/session";
import { weekdayOptions } from "@/lib/places/constants";

export type DraftActionState = { error?: string; success?: string };

type DraftInputItem = {
  fieldKey: string;
  workingValue: string;
  decision: "PENDING" | "INCLUDE" | "REJECT";
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const decisions = ["PENDING", "INCLUDE", "REJECT"] as const;
const publicationStatuses = ["DRAFT", "PUBLISHED", "TEMPORARILY_CLOSED", "PERMANENTLY_CLOSED", "ARCHIVED"] as const;

function parseItems(formData: FormData) {
  const draftId = formData.get("draftId");
  const raw = formData.get("items");
  if (typeof draftId !== "string" || !uuidPattern.test(draftId) || typeof raw !== "string" || raw.length > 120_000) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value) || value.length < 1 || value.length > 50) return null;
    const items: DraftInputItem[] = [];
    const keys = new Set<string>();
    for (const item of value) {
      if (typeof item !== "object" || item === null) return null;
      const record = item as Record<string, unknown>;
      if (
        typeof record.fieldKey !== "string" ||
        !/^[a-zA-Z][a-zA-Z0-9]{1,119}$/u.test(record.fieldKey) ||
        keys.has(record.fieldKey) ||
        typeof record.workingValue !== "string" ||
        record.workingValue.length > 4000 ||
        typeof record.decision !== "string" ||
        !decisions.includes(record.decision as (typeof decisions)[number])
      ) return null;
      keys.add(record.fieldKey);
      items.push({
        fieldKey: record.fieldKey,
        workingValue: record.workingValue.trim(),
        decision: record.decision as DraftInputItem["decision"],
      });
    }
    return { draftId, items };
  } catch {
    return null;
  }
}

function lines(value: string) {
  return Array.from(new Set(value.split(/\r?\n|,/u).map((item) => item.trim()).filter(Boolean))).slice(0, 30);
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("pl-PL").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 180) || "nowe-miejsce";
}

async function uniqueSlug(transaction: Prisma.TransactionClient, name: string) {
  const base = slugify(name);
  let slug = base;
  for (let suffix = 2; await transaction.place.findUnique({ where: { slug }, select: { id: true } }); suffix += 1) {
    slug = `${base}-${suffix}`;
  }
  return slug;
}

async function updateDraftItems(
  transaction: Prisma.TransactionClient,
  draftId: string,
  items: DraftInputItem[],
  adminUserId: string,
) {
  const draft = await transaction.submissionDraft.findUnique({
    where: { id: draftId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!draft || draft.items.length !== items.length) throw new Error("DRAFT_NOT_FOUND");
  const allowedKeys = new Set(draft.items.map((item) => item.fieldKey));
  if (items.some((item) => !allowedKeys.has(item.fieldKey))) throw new Error("INVALID_FIELDS");

  for (const item of items) {
    await transaction.submissionDraftItem.update({
      where: { submissionDraftId_fieldKey: { submissionDraftId: draftId, fieldKey: item.fieldKey } },
      data: { workingValue: item.workingValue, decision: item.decision },
    });
  }
  await transaction.submissionDraft.update({ where: { id: draftId }, data: { updatedByAdminUserId: adminUserId } });
  return draft;
}

export async function saveSubmissionDraft(
  _state: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  const session = await requireAdmin();
  const parsed = parseItems(formData);
  if (!parsed) return { error: "Nie udało się odczytać wersji roboczej." };
  try {
    await prisma.$transaction(async (transaction) => {
      const previous = await updateDraftItems(transaction, parsed.draftId, parsed.items, session.user.id);
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "DRAFT_SAVED",
          entityType: "SUBMISSION_DRAFT",
          entityId: parsed.draftId,
          changedFields: parsed.items.map((item) => item.fieldKey),
          previousValues: previous.items.map((item) => ({ fieldKey: item.fieldKey, workingValue: item.workingValue, decision: item.decision })) as Prisma.InputJsonValue,
          newValues: parsed.items as Prisma.InputJsonValue,
          changeOrigin: "USER_SUBMISSION",
        },
      });
    });
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

async function publishPlaceUpdate(
  transaction: Prisma.TransactionClient,
  draft: {
    targetPlaceId: string | null;
    placeUpdateSubmission: {
      id: string;
      targetPlaceId: string | null;
    };
  },
  included: DraftInputItem[],
  adminUserId: string,
) {
  const submission = draft.placeUpdateSubmission;
  const targetId = draft.targetPlaceId ?? submission.targetPlaceId;
  if (!targetId) throw new Error("NO_TARGET");
  const current = await transaction.place.findUnique({
    where: { id: targetId },
    include: { categories: { include: { category: true } }, requirements: true, accommodation: { include: { capacityGroups: true } } },
  });
  if (!current) throw new Error("NO_TARGET");

  const scalar: Prisma.PlaceUpdateInput = { lastEditedBy: { connect: { id: adminUserId } } };
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  let categoryValues: string[] | null = null;
  let requirementsText: string[] | null = null;
  let accommodationAvailability: string | null = null;
  let accommodationNote: string | null = null;

  for (const item of included) {
    after[item.fieldKey] = item.workingValue;
    switch (item.fieldKey) {
      case "name": before.name = current.name; scalar.name = item.workingValue; break;
      case "phone": before.phone = current.phone; scalar.phone = item.workingValue || null; break;
      case "addressLine": before.addressLine = current.addressLine; scalar.addressLine = item.workingValue; break;
      case "website": before.website = current.website; scalar.website = item.workingValue || null; break;
      case "todayHoursLabel": before.todayHoursLabel = current.todayHoursLabel; scalar.todayHoursLabel = item.workingValue || null; break;
      case "description": before.description = current.description; scalar.description = item.workingValue || null; break;
      case "services": before.services = current.services; scalar.services = lines(item.workingValue); break;
      case "categorySlugs": before.categorySlugs = current.categories.map((row) => row.category.slug); categoryValues = lines(item.workingValue); break;
      case "requirementsText": before.requirements = current.requirements.map((row) => row.label); requirementsText = lines(item.workingValue); break;
      case "publicationStatus": {
        if (!publicationStatuses.includes(item.workingValue as (typeof publicationStatuses)[number])) throw new Error("INVALID_STATUS");
        before.publicationStatus = current.publicationStatus;
        scalar.publicationStatus = item.workingValue as (typeof publicationStatuses)[number];
        if (item.workingValue === "TEMPORARILY_CLOSED" || item.workingValue === "PERMANENTLY_CLOSED") scalar.operationalStatus = "CLOSED";
        break;
      }
      case "accommodationAvailabilityLabel": before.accommodationAvailabilityLabel = current.accommodation?.availabilityLabel; accommodationAvailability = item.workingValue; break;
      case "accommodationImportantNote": before.accommodationImportantNote = current.accommodation?.importantNote; accommodationNote = item.workingValue; break;
    }
  }

  await transaction.place.update({ where: { id: current.id }, data: scalar });
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
  if (accommodationAvailability !== null || accommodationNote !== null) {
    if (!current.accommodation) throw new Error("NO_ACCOMMODATION");
    await transaction.accommodationDetails.update({
      where: { id: current.accommodation.id },
      data: {
        ...(accommodationAvailability !== null ? { availabilityLabel: accommodationAvailability || null, availabilityState: "UNKNOWN", availabilityConfirmedAt: new Date() } : {}),
        ...(accommodationNote !== null ? { importantNote: accommodationNote || null } : {}),
      },
    });
  }

  return { placeId: current.id, slug: current.slug, categorySlug: categoryValues?.[0] ?? current.categories[0]?.category.slug ?? "inne", before, after };
}

async function publishNewPlace(
  transaction: Prisma.TransactionClient,
  included: DraftInputItem[],
  adminUserId: string,
) {
  const values = new Map(included.map((item) => [item.fieldKey, item.workingValue]));
  const name = values.get("name")?.trim();
  const addressLine = values.get("addressLine")?.trim();
  const city = values.get("city")?.trim() || "Łódź";
  const requestedCategories = lines(values.get("categorySlugs") ?? "");
  if (!name || !addressLine || !requestedCategories.length) throw new Error("MISSING_REQUIRED");
  const categories = await transaction.category.findMany({ where: { slug: { in: requestedCategories }, active: true } });
  if (categories.length !== requestedCategories.length) throw new Error("INVALID_CATEGORY");
  const primary = categories.find((item) => item.slug === requestedCategories[0])!;
  let organizationId: string | null = null;
  const organizationName = values.get("organizationName")?.trim();
  if (organizationName) {
    const organization = await transaction.organization.upsert({
      where: { slug: slugify(organizationName) },
      create: { slug: slugify(organizationName), name: organizationName },
      update: { name: organizationName },
    });
    organizationId = organization.id;
  }
  const slug = await uniqueSlug(transaction, name);
  const place = await transaction.place.create({
    data: {
      slug,
      name,
      organizationId,
      primaryCategoryId: primary.id,
      description: values.get("description") || null,
      addressLine,
      postalCode: values.get("postalCode") || null,
      city,
      district: values.get("district") || null,
      phone: values.get("phone") || null,
      email: values.get("email") || null,
      website: values.get("website") || null,
      todayHoursLabel: values.get("todayHoursLabel") || null,
      publicationStatus: "PUBLISHED",
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      lastEditedByAdminUserId: adminUserId,
      recordKind: "PRODUCTION",
      isDemo: false,
    },
  });
  await transaction.placeCategory.createMany({ data: requestedCategories.map((categorySlug, sortOrder) => ({ placeId: place.id, categoryId: categories.find((item) => item.slug === categorySlug)!.id, sortOrder })) });
  await transaction.openingHours.createMany({ data: weekdayOptions.map(({ value }) => ({ placeId: place.id, weekday: value, status: "UNKNOWN", note: values.get("todayHoursLabel") || "Brak potwierdzonych godzin", sortOrder: 0 })) });
  const requirements = lines(values.get("requirementsText") ?? "");
  if (requirements.length) await transaction.placeRequirement.createMany({ data: requirements.map((label, sortOrder) => ({ placeId: place.id, kind: "OTHER", state: "UNKNOWN", label, sortOrder })) });
  const accessibility = lines(values.get("accessibilityText") ?? "");
  if (accessibility.length) await transaction.placeAccessibility.createMany({ data: accessibility.map((label, sortOrder) => ({ placeId: place.id, feature: "OTHER", state: "UNKNOWN", label, sortOrder })) });

  if (requestedCategories.includes("nocleg") || values.has("accommodationType")) {
    const freeBedsText = values.get("availableBeds") ?? "";
    const freeBeds = /^\d+$/u.test(freeBedsText) ? Number(freeBedsText) : null;
    const accommodation = await transaction.accommodationDetails.create({
      data: {
        placeId: place.id,
        type: accommodationType(values.get("accommodationType") ?? ""),
        targetGroups: lines(values.get("targetGroups") ?? ""),
        admissionHoursDescription: values.get("admissionHoursDescription") || null,
        sobrietyNote: values.get("sobrietyNote") || null,
        petNote: values.get("petNote") || null,
        availabilityState: freeBeds === null ? "UNKNOWN" : freeBeds > 1 ? "AVAILABLE" : freeBeds === 1 ? "FEW" : "FULL",
        availabilityLabel: freeBeds === null ? null : `${freeBeds} wolnych miejsc`,
        availabilityConfirmedAt: freeBeds === null ? null : new Date(),
        importantNote: "Informacja o wolnych miejscach nie jest gwarancją przyjęcia.",
      },
    });
    if (freeBeds !== null) {
      const group = await transaction.accommodationCapacityGroup.create({ data: { accommodationDetailsId: accommodation.id, label: "Ogólna", availableBeds: freeBeds, availabilityUpdatedAt: new Date(), updatedByAdminUserId: adminUserId } });
      await transaction.accommodationAvailabilityHistory.create({ data: { accommodationDetailsId: accommodation.id, capacityGroupId: group.id, availabilityState: freeBeds > 1 ? "AVAILABLE" : freeBeds === 1 ? "FEW" : "FULL", availableBeds: freeBeds, reportedAt: new Date(), adminUserId, origin: "USER_SUBMISSION" } });
    }
  }
  return { placeId: place.id, slug, categorySlug: requestedCategories[0], before: {}, after: Object.fromEntries(included.map((item) => [item.fieldKey, item.workingValue])) };
}

export async function publishSubmissionDraft(
  _state: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  const session = await requireAdmin();
  const parsed = parseItems(formData);
  const noteValue = formData.get("note");
  const note = typeof noteValue === "string" ? noteValue.trim().slice(0, 1000) : "";
  if (!parsed) return { error: "Nie udało się odczytać wersji do publikacji." };
  if (parsed.items.some((item) => item.decision === "PENDING")) return { error: "Podejmij decyzję dla każdego pola przed publikacją." };
  const included = parsed.items.filter((item) => item.decision === "INCLUDE");
  if (!included.length) return { error: "Wybierz co najmniej jedno pole do publikacji albo odrzuć zgłoszenie." };

  let published: { placeId: string; slug: string; categorySlug: string } | null = null;
  try {
    published = await prisma.$transaction(async (transaction) => {
      await updateDraftItems(transaction, parsed.draftId, parsed.items, session.user.id);
      const draft = await transaction.submissionDraft.findUnique({
        where: { id: parsed.draftId },
        include: { placeUpdateSubmission: true, newPlaceSubmission: true },
      });
      if (!draft) throw new Error("DRAFT_NOT_FOUND");
      const submission = draft.placeUpdateSubmission ?? draft.newPlaceSubmission;
      if (!submission || !["PENDING", "UNDER_REVIEW"].includes(submission.moderationStatus)) throw new Error("INVALID_STATUS");

      const result = draft.placeUpdateSubmission
        ? await publishPlaceUpdate(transaction, draft as Parameters<typeof publishPlaceUpdate>[1], included, session.user.id)
        : await publishNewPlace(transaction, included, session.user.id);

      const shared = { moderationStatus: "APPROVED" as const, moderatorNote: note || null, rejectionReason: null, moderatedAt: new Date(), moderatedByAdminUserId: session.user.id, publishedPlaceId: result.placeId, publishedAt: new Date() };
      const changed = draft.placeUpdateSubmission
        ? await transaction.placeUpdateSubmission.updateMany({ where: { id: draft.placeUpdateSubmission.id, moderationStatus: { in: ["PENDING", "UNDER_REVIEW"] } }, data: shared })
        : await transaction.newPlaceSubmission.updateMany({ where: { id: draft.newPlaceSubmission!.id, moderationStatus: { in: ["PENDING", "UNDER_REVIEW"] } }, data: shared });
      if (changed.count !== 1) throw new Error("CONCURRENT_UPDATE");

      const entityId = draft.placeUpdateSubmission?.id ?? draft.newPlaceSubmission!.id;
      const entityType = draft.placeUpdateSubmission ? "PLACE_UPDATE_SUBMISSION" : "NEW_PLACE_SUBMISSION";
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "SUBMISSION_PUBLISHED",
          entityType,
          entityId,
          previousStatus: submission.moderationStatus,
          newStatus: "APPROVED",
          changedFields: included.map((item) => item.fieldKey),
          previousValues: result.before as Prisma.InputJsonValue,
          newValues: result.after as Prisma.InputJsonValue,
          changeOrigin: "USER_SUBMISSION",
          sourceReferenceId: entityId,
          note: note || null,
        },
      });
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: draft.placeUpdateSubmission ? "PLACE_UPDATED" : "PLACE_CREATED",
          entityType: "PLACE",
          entityId: result.placeId,
          changedFields: included.map((item) => item.fieldKey),
          previousValues: result.before as Prisma.InputJsonValue,
          newValues: result.after as Prisma.InputJsonValue,
          changeOrigin: "USER_SUBMISSION",
          sourceReferenceId: entityId,
          note: note || null,
        },
      });
      return result;
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "NO_TARGET") return { error: "Nie odnaleziono miejsca, którego dotyczy zgłoszenie." };
    if (reason === "MISSING_REQUIRED") return { error: "Wersja do publikacji nie zawiera wymaganej nazwy, adresu lub kategorii." };
    if (reason === "INVALID_CATEGORY") return { error: "Co najmniej jedna kategoria nie istnieje w bazie." };
    return { error: "Nie udało się opublikować zmian. Żadne dane nie zostały częściowo zapisane." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/zgloszenia");
  revalidatePath("/admin/miejsca");
  revalidatePath(`/admin/miejsca/${published.placeId}`);
  revalidatePath("/szukaj");
  revalidatePath("/mapa");
  revalidatePath(`/lodz/${published.categorySlug}/${published.slug}`);
  return { success: "Zgłoszenie zostało zatwierdzone, a wybrane dane opublikowane." };
}
