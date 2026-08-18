import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import {
  buildCaritasCandidates,
  CARITAS_GDZIE_IMPORT,
  normalizeAddress,
  normalizeComparable,
  parseCaritasSourceEntries,
  slugifyImportValue,
  sourceDocumentHash,
  type CandidateDraft,
  type SourceEntry,
} from "../src/lib/imports/caritas-gdzie-parser";

type Mode = "dry-run" | "apply";

type ExistingPlace = {
  id: string;
  name: string;
  slug: string;
  addressLine: string;
  phone: string | null;
  recordKind: "PRODUCTION" | "DEMO" | "TEST";
  publicationStatus: string;
};

type ClassifiedCandidate = CandidateDraft & {
  status: "IMPORT_READY" | "MATCH_EXISTING" | "REQUIRES_REVIEW";
  matchedPlaceId: string | null;
  matchedPlaceKind: ExistingPlace["recordKind"] | null;
};

type ProposedOpeningRow = {
  weekday: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  status: "OPEN" | "CLOSED" | "UNKNOWN";
  opensAt: string | null;
  closesAt: string | null;
  note: string | null;
  sortOrder: number;
};

type ProposedRequirement = {
  kind: "REFERRAL" | "DOCUMENT" | "FEE" | "LODZ_REGISTRATION" | "APPOINTMENT";
  state: "YES" | "NO" | "UNKNOWN";
  label: string;
};

type ProposedAccessibility = {
  feature: "STEP_FREE_ENTRANCE" | "RAMP" | "ELEVATOR" | "ACCESSIBLE_TOILET" | "ACCESSIBLE_SHOWER" | "WHEELCHAIR_PLACE" | "ASSISTANCE_DOG" | "CARE_SERVICES" | "STAY_WITH_ASSISTANT";
  state: "YES" | "NO" | "UNKNOWN";
};

type ProposedAccommodation = {
  type: "SHELTER" | "NIGHT_SHELTER" | "WARMING_CENTER" | "HOSTEL" | "INTERVENTION_HOSTEL" | "CARE_SHELTER" | "WOMEN_WITH_CHILDREN_HOME" | "OTHER";
  targetGroups: string[];
  acceptsToday: "UNKNOWN";
  lodzRegistrationRequired: "UNKNOWN";
  referralRequired: "UNKNOWN";
  documentRequired: "UNKNOWN";
  sobrietyPolicy: "UNKNOWN";
  petPolicy: "UNKNOWN";
  wheelchairAccessibility: "UNKNOWN";
  careServices: "UNKNOWN";
  partialDependencySupport: "UNKNOWN";
  availabilityState: "UNKNOWN";
  capacityGroups: Array<{ label: string; totalBeds: number; availableBeds: null }>;
};

type ProposedPlaceData = {
  name: string;
  addressLine: string | null;
  street: string | null;
  buildingNumber: string | null;
  postalCode: string | null;
  city: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  categorySlugs: string[];
  primaryCategorySlug: string | null;
  audience: string[];
  services: string[];
  operationHours: ProposedOpeningRow[];
  admissionHours: ProposedOpeningRow[];
  rawOpeningHours: string | null;
  rawAdmissionHours: string | null;
  requirements: ProposedRequirement[];
  accessibility: ProposedAccessibility[];
  accommodation: ProposedAccommodation | null;
  sourcePages: number[];
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseArguments() {
  const mode: Mode = process.argv.includes("--apply") ? "apply" : "dry-run";
  const textPath = argument("--text");
  const pdfPath = argument("--pdf");
  const reportPath = argument("--report");
  if (!textPath || !pdfPath) throw new Error("Use --text PATH --pdf PATH and either --dry-run or --apply.");
  return { mode, textPath, pdfPath, reportPath };
}

function phoneDigits(value: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function nameSimilarity(left: string, right: string) {
  const a = normalizeComparable(left);
  const b = normalizeComparable(right);
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  const leftWords = new Set(a.split(" "));
  const rightWords = new Set(b.split(" "));
  const intersection = [...leftWords].filter((word) => rightWords.has(word)).length;
  return intersection / Math.max(leftWords.size, rightWords.size, 1);
}

function matchScore(candidate: CandidateDraft, place: ExistingPlace) {
  const sameAddress = Boolean(candidate.proposedAddress && normalizeAddress(candidate.proposedAddress) === normalizeAddress(place.addressLine));
  const samePhone = Boolean(phoneDigits(candidate.proposedPhone) && phoneDigits(candidate.proposedPhone) === phoneDigits(place.phone));
  const similarity = nameSimilarity(candidate.proposedName, place.name);
  return similarity * 0.7 + (sameAddress ? 0.55 : 0) + (samePhone ? 0.35 : 0);
}

function classifyCandidates(candidates: CandidateDraft[], places: ExistingPlace[]) {
  return candidates.map<ClassifiedCandidate>((candidate) => {
    const matches = places
      .map((place) => ({ place, score: matchScore(candidate, place) }))
      .filter(({ score }) => score >= 0.68)
      .sort((left, right) => right.score - left.score);
    const best = matches[0];
    if (best?.place.recordKind === "PRODUCTION") {
      return { ...candidate, status: "MATCH_EXISTING", matchedPlaceId: best.place.id, matchedPlaceKind: best.place.recordKind };
    }
    const reviewReasons = [...candidate.reviewReasons];
    if (best) reviewReasons.push(`Możliwe dopasowanie do istniejącego rekordu ${best.place.recordKind}: ${best.place.name}.`);
    return {
      ...candidate,
      reviewReasons: [...new Set(reviewReasons)],
      status: reviewReasons.length ? "REQUIRES_REVIEW" : "IMPORT_READY",
      matchedPlaceId: best?.place.id ?? null,
      matchedPlaceKind: best?.place.recordKind ?? null,
    };
  });
}

function summarize(sourceEntries: SourceEntry[], candidates: ClassifiedCandidate[]) {
  const expandedLocationCount = sourceEntries.length + 15;
  return {
    source: CARITAS_GDZIE_IMPORT,
    rawEntries: sourceEntries.length,
    expandedLocations: expandedLocationCount,
    probableUniquePlaces: candidates.length,
    duplicateOccurrencesMerged: expandedLocationCount - candidates.length,
    existingMatches: candidates.filter((candidate) => candidate.status === "MATCH_EXISTING").length,
    requiresReview: candidates.filter((candidate) => candidate.status === "REQUIRES_REVIEW").length,
    importReady: candidates.filter((candidate) => candidate.status === "IMPORT_READY").length,
    skipped: 0,
    accommodationCandidates: candidates.filter((candidate) => Boolean((candidate.proposedData as ProposedPlaceData).accommodation)).length,
    withoutCoordinates: candidates.filter((candidate) => candidate.status === "IMPORT_READY").length,
    reviewReasons: Object.entries(
      candidates.flatMap((candidate) => candidate.reviewReasons).reduce<Record<string, number>>((result, reason) => {
        result[reason] = (result[reason] ?? 0) + 1;
        return result;
      }, {}),
    ).sort((left, right) => right[1] - left[1]),
    mergedExamples: candidates
      .filter((candidate) => candidate.sourceKeys.length > 1)
      .slice(0, 12)
      .map((candidate) => ({ name: candidate.proposedName, address: candidate.proposedAddress, sources: candidate.sourceKeys, categories: candidate.categorySlugs })),
    matches: candidates
      .filter((candidate) => candidate.matchedPlaceId)
      .map((candidate) => ({ name: candidate.proposedName, matchedPlaceId: candidate.matchedPlaceId, matchedPlaceKind: candidate.matchedPlaceKind, status: candidate.status })),
  };
}

async function uniqueSlug(transaction: Prisma.TransactionClient, name: string, candidateKey: string) {
  const base = slugifyImportValue(name).slice(0, 170) || `miejsce-${candidateKey.slice(0, 8)}`;
  let slug = base;
  let suffix = 1;
  while (await transaction.place.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base.slice(0, 180)}-${candidateKey.slice(0, 6)}${suffix > 1 ? `-${suffix}` : ""}`;
    suffix += 1;
  }
  return slug;
}

async function uniqueOrganizationSlug(transaction: Prisma.TransactionClient, name: string) {
  const base = slugifyImportValue(name).slice(0, 180) || "organizacja";
  let slug = base;
  let suffix = 2;
  while (await transaction.organization.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function organizationId(
  transaction: Prisma.TransactionClient,
  name: string | null,
  organizations: Map<string, string>,
  counters: { created: number; linked: Set<string> },
) {
  if (!name) return null;
  const key = normalizeComparable(name);
  const existing = organizations.get(key);
  if (existing) {
    counters.linked.add(existing);
    return existing;
  }
  const created = await transaction.organization.create({
    data: { name, slug: await uniqueOrganizationSlug(transaction, name), active: true },
    select: { id: true },
  });
  organizations.set(key, created.id);
  counters.created += 1;
  counters.linked.add(created.id);
  return created.id;
}

function asJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

async function stageBatch(
  transaction: Prisma.TransactionClient,
  sourceEntries: SourceEntry[],
  candidates: ClassifiedCandidate[],
  documentHash: string,
) {
  const batch = await transaction.importBatch.upsert({
    where: { key: CARITAS_GDZIE_IMPORT.key },
    create: {
      key: CARITAS_GDZIE_IMPORT.key,
      title: CARITAS_GDZIE_IMPORT.title,
      sourceUrl: CARITAS_GDZIE_IMPORT.sourceUrl,
      publisher: CARITAS_GDZIE_IMPORT.publisher,
      edition: CARITAS_GDZIE_IMPORT.edition,
      sourceDocumentHash: documentHash,
      importDate: new Date(`${CARITAS_GDZIE_IMPORT.importDate}T00:00:00.000Z`),
      rawEntryCount: sourceEntries.length,
      candidateCount: candidates.length,
      metadata: asJson({ parser: "caritas-gdzie-parser-v1", expandedLocations: sourceEntries.length + 15 }),
    },
    update: {
      title: CARITAS_GDZIE_IMPORT.title,
      sourceUrl: CARITAS_GDZIE_IMPORT.sourceUrl,
      publisher: CARITAS_GDZIE_IMPORT.publisher,
      edition: CARITAS_GDZIE_IMPORT.edition,
      sourceDocumentHash: documentHash,
      rawEntryCount: sourceEntries.length,
      candidateCount: candidates.length,
    },
  });

  const sourceIds = new Map<string, string>();
  for (const entry of sourceEntries) {
    const source = await transaction.importSourceEntry.upsert({
      where: { importBatchId_sourceKey: { importBatchId: batch.id, sourceKey: entry.sourceKey } },
      create: {
        importBatchId: batch.id,
        sourceKey: entry.sourceKey,
        section: entry.section,
        sourcePages: entry.sourcePages,
        rawName: entry.rawName,
        rawAddress: entry.rawAddress,
        rawPhone: entry.rawPhone,
        rawEmail: entry.rawEmail,
        rawWebsite: entry.rawWebsite,
        rawOpeningHours: entry.rawOpeningHours,
        rawAdmissionHours: entry.rawAdmissionHours,
        rawAssistanceDescription: entry.rawAssistanceDescription,
        rawText: entry.rawText,
        parsedData: asJson({ categoryHints: entry.categoryHints, targetGroupHints: entry.targetGroupHints }),
      },
      update: {
        section: entry.section,
        sourcePages: entry.sourcePages,
        rawName: entry.rawName,
        rawAddress: entry.rawAddress,
        rawPhone: entry.rawPhone,
        rawEmail: entry.rawEmail,
        rawWebsite: entry.rawWebsite,
        rawOpeningHours: entry.rawOpeningHours,
        rawAdmissionHours: entry.rawAdmissionHours,
        rawAssistanceDescription: entry.rawAssistanceDescription,
        rawText: entry.rawText,
        parsedData: asJson({ categoryHints: entry.categoryHints, targetGroupHints: entry.targetGroupHints }),
      },
      select: { id: true },
    });
    sourceIds.set(entry.sourceKey, source.id);
  }

  const candidateIds = new Map<string, string>();
  for (const candidate of candidates) {
    const existing = await transaction.importCandidate.findUnique({
      where: { importBatchId_candidateKey: { importBatchId: batch.id, candidateKey: candidate.candidateKey } },
      select: { id: true, status: true, createdPlaceId: true },
    });
    const status = existing?.status === "IMPORTED" && existing.createdPlaceId ? "IMPORTED" : candidate.status;
    const staged = await transaction.importCandidate.upsert({
      where: { importBatchId_candidateKey: { importBatchId: batch.id, candidateKey: candidate.candidateKey } },
      create: {
        importBatchId: batch.id,
        candidateKey: candidate.candidateKey,
        status,
        proposedName: candidate.proposedName,
        proposedAddress: candidate.proposedAddress,
        proposedPhone: candidate.proposedPhone,
        proposedEmail: candidate.proposedEmail,
        proposedWebsite: candidate.proposedWebsite,
        proposedOrganizationName: candidate.proposedOrganizationName,
        categorySlugs: candidate.categorySlugs,
        primaryCategorySlug: candidate.primaryCategorySlug,
        reviewReasons: candidate.reviewReasons,
        proposedData: asJson(candidate.proposedData),
        matchedPlaceId: candidate.matchedPlaceId,
      },
      update: {
        status,
        proposedName: candidate.proposedName,
        proposedAddress: candidate.proposedAddress,
        proposedPhone: candidate.proposedPhone,
        proposedEmail: candidate.proposedEmail,
        proposedWebsite: candidate.proposedWebsite,
        proposedOrganizationName: candidate.proposedOrganizationName,
        categorySlugs: candidate.categorySlugs,
        primaryCategorySlug: candidate.primaryCategorySlug,
        reviewReasons: candidate.reviewReasons,
        proposedData: asJson(candidate.proposedData),
        matchedPlaceId: candidate.matchedPlaceId,
      },
      select: { id: true },
    });
    candidateIds.set(candidate.candidateKey, staged.id);
    await transaction.importCandidateSource.deleteMany({ where: { importCandidateId: staged.id } });
    for (const sourceKey of candidate.sourceKeys) {
      const sourceEntryId = sourceIds.get(sourceKey);
      if (!sourceEntryId) throw new Error(`Missing staged source ${sourceKey}.`);
      await transaction.importCandidateSource.create({ data: { importCandidateId: staged.id, sourceEntryId } });
    }
  }
  return { batch, candidateIds };
}

async function applyImport(
  sourceEntries: SourceEntry[],
  candidates: ClassifiedCandidate[],
  documentHash: string,
) {
  return prisma.$transaction(async (transaction) => {
    const admin = await transaction.adminUser.findFirst({
      where: { active: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    if (!admin) throw new Error("Import requires an active administrator for AuditLog provenance.");
    const categories = new Map((await transaction.category.findMany({ select: { id: true, slug: true } })).map((category) => [category.slug, category.id]));
    const missingCategories = [...new Set(candidates.flatMap((candidate) => candidate.categorySlugs))].filter((slug) => !categories.has(slug));
    if (missingCategories.length) throw new Error(`Missing categories: ${missingCategories.join(", ")}`);
    const organizations = new Map((await transaction.organization.findMany({ select: { id: true, name: true } })).map((organization) => [normalizeComparable(organization.name), organization.id]));
    const organizationCounters = { created: 0, linked: new Set<string>() };
    const { batch, candidateIds } = await stageBatch(transaction, sourceEntries, candidates, documentHash);
    let createdPlaces = 0;
    let alreadyImported = 0;

    for (const candidate of candidates.filter((item) => item.status === "IMPORT_READY")) {
      const candidateId = candidateIds.get(candidate.candidateKey)!;
      const staged = await transaction.importCandidate.findUniqueOrThrow({ where: { id: candidateId }, select: { status: true, createdPlaceId: true } });
      if (staged.status === "IMPORTED" && staged.createdPlaceId) {
        alreadyImported += 1;
        continue;
      }
      const data = candidate.proposedData as unknown as ProposedPlaceData;
      if (!data.addressLine || !data.primaryCategorySlug) throw new Error(`Candidate ${candidate.proposedName} is not import-ready.`);
      const primaryCategoryId = categories.get(data.primaryCategorySlug);
      if (!primaryCategoryId) throw new Error(`Missing primary category ${data.primaryCategorySlug}.`);
      const orgId = await organizationId(transaction, candidate.proposedOrganizationName, organizations, organizationCounters);
      const slug = await uniqueSlug(transaction, data.name, candidate.candidateKey);
      const sourceLabel = `Przewodnik „Gdzie” 2025/2026 - Caritas Archidiecezji Łódzkiej, s. ${data.sourcePages.join(", ")}`;
      const place = await transaction.place.create({
        data: {
          slug,
          name: data.name.slice(0, 250),
          organizationId: orgId,
          primaryCategoryId,
          typeLabel: data.accommodation ? "Miejsce noclegowe" : "Punkt pomocy",
          description: data.description,
          street: data.street,
          buildingNumber: data.buildingNumber,
          addressLine: data.addressLine.slice(0, 400),
          postalCode: data.postalCode,
          city: data.city,
          latitude: null,
          longitude: null,
          phone: data.phone,
          email: data.email,
          website: data.website,
          publicationStatus: "DRAFT",
          verificationStatus: "NEEDS_CONFIRMATION",
          operationalStatus: "UNKNOWN",
          verifiedAt: null,
          verificationSource: null,
          verificationNote: "Import z przewodnika 2025/2026 nie stanowi bieżącej weryfikacji.",
          internalNote: `${sourceLabel}. Rekord wymaga weryfikacji przed publikacją.`,
          audience: data.audience,
          services: data.services,
          recordKind: "PRODUCTION",
          isDemo: false,
          lastEditedByAdminUserId: admin.id,
          categories: {
            create: data.categorySlugs.map((categorySlug, sortOrder) => ({ categoryId: categories.get(categorySlug)!, sortOrder })),
          },
          openingHours: {
            create: [
              ...data.operationHours.map((row) => ({ ...row, kind: "OPERATION" as const })),
              ...(data.accommodation ? data.admissionHours.map((row) => ({ ...row, kind: "ADMISSION" as const })) : []),
            ],
          },
          requirements: {
            create: data.requirements.map((requirement, sortOrder) => ({ ...requirement, note: null, sortOrder })),
          },
          accessibility: {
            create: data.accessibility.map((item, sortOrder) => ({ ...item, label: item.feature, note: null, sortOrder })),
          },
          accommodation: data.accommodation
            ? {
                create: {
                  type: data.accommodation.type,
                  targetGroups: data.accommodation.targetGroups,
                  audienceLabel: data.accommodation.targetGroups.join(" · ") || null,
                  acceptedProfiles: [],
                  admissionHoursDescription: data.rawAdmissionHours,
                  acceptsToday: data.accommodation.acceptsToday,
                  lodzRegistrationRequired: data.accommodation.lodzRegistrationRequired,
                  referralRequired: data.accommodation.referralRequired,
                  documentRequired: data.accommodation.documentRequired,
                  sobrietyPolicy: data.accommodation.sobrietyPolicy,
                  petPolicy: data.accommodation.petPolicy,
                  wheelchairAccessibility: data.accommodation.wheelchairAccessibility,
                  careServices: data.accommodation.careServices,
                  partialDependencySupport: data.accommodation.partialDependencySupport,
                  availabilityState: data.accommodation.availabilityState,
                  availabilityLabel: "Brak aktualnych danych o wolnych miejscach",
                  availabilityNote: "Całkowita pojemność ze źródła nie oznacza liczby wolnych miejsc.",
                  importantNote: "Wymaga bieżącego potwierdzenia przed przyjazdem.",
                  capacityGroups: {
                    create: data.accommodation.capacityGroups.map((group, sortOrder) => ({ ...group, active: true, sortOrder, availabilityUpdatedAt: null })),
                  },
                },
              }
            : undefined,
        },
        select: { id: true },
      });
      await transaction.importCandidate.update({ where: { id: candidateId }, data: { status: "IMPORTED", createdPlaceId: place.id } });
      await transaction.auditLog.create({
        data: {
          adminUserId: admin.id,
          action: "PLACE_IMPORTED",
          entityType: "PLACE",
          entityId: place.id,
          changedFields: ["recordKind", "publicationStatus", "verificationStatus", "source"],
          previousValues: Prisma.JsonNull,
          newValues: asJson({ importBatch: batch.key, source: CARITAS_GDZIE_IMPORT.sourceUrl, pages: data.sourcePages, publicationStatus: "DRAFT", verificationStatus: "NEEDS_CONFIRMATION" }),
          changeOrigin: "SOURCE_IMPORT",
          sourceReferenceId: candidateId,
          note: sourceLabel,
        },
      });
      createdPlaces += 1;
    }

    const counts = await transaction.importCandidate.groupBy({ by: ["status"], where: { importBatchId: batch.id }, _count: { _all: true } });
    const count = (status: string) => counts.find((item) => item.status === status)?._count._all ?? 0;
    await transaction.importBatch.update({
      where: { id: batch.id },
      data: {
        status: count("REQUIRES_REVIEW") ? "COMPLETED_WITH_REVIEW" : "IMPORTED",
        importedAt: new Date(),
        importedCount: count("IMPORTED"),
        matchedCount: count("MATCH_EXISTING"),
        reviewCount: count("REQUIRES_REVIEW"),
        skippedCount: count("SKIPPED"),
      },
    });
    return {
      batchId: batch.id,
      createdPlaces,
      alreadyImported,
      organizationsCreated: organizationCounters.created,
      organizationsLinked: organizationCounters.linked.size,
      finalCounts: Object.fromEntries(counts.map((item) => [item.status, item._count._all])),
    };
  }, { timeout: 120_000 });
}

async function main() {
  const options = parseArguments();
  const [extractedText, pdf] = await Promise.all([readFile(options.textPath, "utf8"), readFile(options.pdfPath)]);
  const sourceEntries = parseCaritasSourceEntries(extractedText);
  const candidates = buildCaritasCandidates(sourceEntries);
  const places = await prisma.place.findMany({
    where: {
      createdFromImport: {
        isNot: { importBatch: { key: CARITAS_GDZIE_IMPORT.key } },
      },
    },
    select: { id: true, name: true, slug: true, addressLine: true, phone: true, recordKind: true, publicationStatus: true },
  });
  const classified = classifyCandidates(candidates, places);
  const report = { mode: options.mode, documentHash: sourceDocumentHash(pdf), ...summarize(sourceEntries, classified) };
  if (options.reportPath) await writeFile(options.reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.info(JSON.stringify(report, null, 2));
  if (options.mode === "apply") console.info(JSON.stringify(await applyImport(sourceEntries, classified, report.documentHash), null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
