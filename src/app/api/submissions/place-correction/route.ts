import { prisma } from "@/lib/prisma";
import { readSubmissionBody, submissionErrorResponse, submissionSuccessResponse } from "@/lib/submissions/http";
import { consumeSubmissionRateLimit, getRequestAddress } from "@/lib/submissions/rate-limit";
import { encodeContextualCorrection, contextualCorrectionFields, contextualCorrectionLabels, type ContextualCorrectionField } from "@/lib/submissions/contextual-correction";
import { hasImpossibleFormTiming } from "@/lib/security/form-timing";
import { publicRecordKindsForEnvironment } from "@/lib/places/public-visibility";
import type { PlaceUpdateType, SubmissionSourceType } from "@/generated/prisma/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function stringValue(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length <= max ? result : null;
}

function fieldValue(place: Awaited<ReturnType<typeof findPublicPlace>>, field: ContextualCorrectionField) {
  if (!place) return "";
  switch (field) {
    case "name": return place.name;
    case "address": return place.addressLine;
    case "phone": return place.phone ?? "";
    case "email": return place.email ?? "";
    case "website": return place.website ?? "";
    case "hours": return place.todayHoursLabel ?? "Brak potwierdzonych godzin";
    case "categories": return place.categories.map((item) => item.category.name).join(", ");
    case "requirements": return place.requirements.map((item) => item.label).join("\n");
    case "accommodation": return place.accommodation?.importantNote ?? "Brak dodatkowych informacji noclegowych";
    case "accessibility": return place.accessibility.map((item) => item.label).join("\n");
    case "description": return place.description ?? "";
    case "closure": return place.publicationStatus === "PERMANENTLY_CLOSED" ? "Miejsce oznaczone jako zamknięte" : "Miejsce działa";
    case "other": return "";
  }
}

async function findPublicPlace(identifier: string) {
  return prisma.place.findFirst({
    where: {
      citySlug: "lodz",
      recordKind: { in: [...publicRecordKindsForEnvironment()] },
      publicationStatus: { in: ["PUBLISHED", "TEMPORARILY_CLOSED", "PERMANENTLY_CLOSED"] },
      OR: [{ id: uuidPattern.test(identifier) ? identifier : undefined }, { legacyId: identifier }, { slug: identifier }],
    },
    include: {
      primaryCategory: true,
      categories: { include: { category: true }, orderBy: { sortOrder: "asc" } },
      requirements: { orderBy: { sortOrder: "asc" } },
      accessibility: { orderBy: { sortOrder: "asc" } },
      accommodation: true,
    },
  });
}

export async function POST(request: Request) {
  const address = getRequestAddress(request);
  const limit = await consumeSubmissionRateLimit(`place-correction:${address}`, Date.now(), "placeChange");
  if (!limit.allowed) {
    const response = submissionErrorResponse(429);
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  const body = await readSubmissionBody(request);
  if (!body || typeof body !== "object") return submissionErrorResponse();
  const value = body as Record<string, unknown>;
  if (hasImpossibleFormTiming(value.formStartedAt)) return submissionErrorResponse();
  const requestId = stringValue(value.requestId, 36);
  const placeIdentifier = stringValue(value.placeId, 200);
  const field = stringValue(value.field, 40) as ContextualCorrectionField | null;
  const proposedValue = stringValue(value.proposedValue, 4000);
  const comment = stringValue(value.comment, 1000) ?? "";
  const sourceUrl = stringValue(value.sourceUrl, 2048) ?? "";
  const reporterEmail = stringValue(value.reporterEmail, 320) ?? "";
  const reporterName = stringValue(value.reporterName, 160) ?? "";
  const reporterPhone = stringValue(value.reporterPhone, 50) ?? "";
  const latitude = typeof value.latitude === "number" && Number.isFinite(value.latitude) && value.latitude >= -90 && value.latitude <= 90 ? value.latitude : value.latitude === undefined ? undefined : null;
  const longitude = typeof value.longitude === "number" && Number.isFinite(value.longitude) && value.longitude >= -180 && value.longitude <= 180 ? value.longitude : value.longitude === undefined ? undefined : null;
  const honeypot = value.protection && typeof value.protection === "object" ? (value.protection as Record<string, unknown>).contactWebsite : value.contactWebsite;
  if (!requestId || !uuidPattern.test(requestId) || !placeIdentifier || !field || !contextualCorrectionFields.includes(field) || !proposedValue || typeof honeypot === "string" && honeypot.trim() || reporterEmail && !emailPattern.test(reporterEmail) || latitude === null || longitude === null || (field === "address" && (latitude === undefined) !== (longitude === undefined))) return submissionErrorResponse();

  const place = await findPublicPlace(placeIdentifier);
  if (!place) return submissionErrorResponse();
  const oldValue = fieldValue(place, field);
  if (oldValue.trim() === proposedValue.trim()) return submissionErrorResponse();
  const label = contextualCorrectionLabels[field];
  const envelope = encodeContextualCorrection({ kind: "contextual-place-correction", field, label, oldValue, proposedValue, comment });
  const description = [`Kontekstowa korekta informacji`, `Pole: ${label}`, `Obecnie: ${oldValue || "Brak danych"}`, `Zgłoszono: ${proposedValue}`, comment ? `Komentarz: ${comment}` : ""].filter(Boolean).join("\n");
  const common = {
    requestId,
    placeId: place.legacyId ?? place.id,
    placeSlug: place.slug,
    placeNameSnapshot: place.name,
    submissionTypes: [field === "hours" ? "HOURS" : field === "address" ? "ADDRESS" : field === "phone" ? "PHONE" : field === "website" || field === "email" ? "ONLINE_CONTACT" : field === "closure" ? "PERMANENT_CLOSURE" : field === "requirements" ? "REQUIREMENTS" : field === "accommodation" ? "ACCOMMODATION_RULES" : field === "categories" ? "HELP_SCOPE" : "OTHER"] as PlaceUpdateType[],
    description,
    proposedPhone: field === "phone" ? proposedValue : undefined,
    proposedAddress: field === "address" ? proposedValue : undefined,
    proposedLatitude: field === "address" ? latitude : undefined,
    proposedLongitude: field === "address" ? longitude : undefined,
    proposedOpeningHours: field === "hours" ? proposedValue : undefined,
    proposedWebsite: field === "website" ? proposedValue : undefined,
    proposedOtherValue: envelope,
    sourceType: "OTHER" as SubmissionSourceType,
    sourceUrl,
    reporterName,
    reporterEmail,
    reporterPhone,
    targetPlaceId: place.id,
  };

  try {
    const duplicate = await prisma.placeUpdateSubmission.findFirst({ where: { placeId: common.placeId, description, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, select: { id: true, moderationStatus: true } });
    if (duplicate) return submissionSuccessResponse(duplicate, 200);
    const existing = await prisma.placeUpdateSubmission.findUnique({ where: { requestId }, select: { id: true, moderationStatus: true } });
    if (existing) return submissionSuccessResponse(existing, 200);
    const submission = await prisma.placeUpdateSubmission.create({ data: common, select: { id: true, moderationStatus: true } });
    return submissionSuccessResponse(submission);
  } catch {
    return submissionErrorResponse(500);
  }
}
