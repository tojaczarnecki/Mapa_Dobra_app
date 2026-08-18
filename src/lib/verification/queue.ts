import { normalizeAddress, normalizeComparable } from "@/lib/imports/caritas-gdzie-parser";
import { prisma } from "@/lib/prisma";

export type VerificationQueueItem = {
  id: string;
  entityKind: "PLACE" | "CANDIDATE";
  name: string;
  address: string | null;
  categories: string[];
  queueStatus: "PENDING" | "IN_PROGRESS" | "READY" | "VERIFIED" | "SKIPPED";
  issueType: "NEW_PLACE" | "POSSIBLE_DUPLICATE" | "MATCH_EXISTING" | "IMPORT_CONFLICT";
  sourceLabel: string;
  sourceBatchId: string;
  sourcePages: number[];
  missingCoordinates: boolean;
  missingPhone: boolean;
  missingHours: boolean;
  missingPrimaryCategory: boolean;
  accommodation: boolean;
  manualDecision: boolean;
  verifiedAt: Date | null;
  updatedAt: Date;
};

export async function getVerificationQueueItems() {
  const [places, candidates] = await Promise.all([
    prisma.place.findMany({
      where: { verificationQueueStatus: { not: null } },
      include: {
        primaryCategory: { select: { name: true, active: true } },
        categories: { include: { category: { select: { name: true } } }, orderBy: { sortOrder: "asc" } },
        openingHours: { select: { status: true } },
        accommodation: { select: { id: true } },
        createdFromImport: {
          include: {
            importBatch: { select: { id: true, title: true, edition: true } },
            sources: { include: { sourceEntry: { select: { sourcePages: true } } } },
          },
        },
      },
    }),
    prisma.importCandidate.findMany({
      where: { queueStatus: { not: null } },
      include: {
        importBatch: { select: { id: true, title: true, edition: true } },
        matchedPlace: { select: { id: true } },
        sources: { include: { sourceEntry: { select: { sourcePages: true } } } },
      },
    }),
  ]);

  const placeItems: VerificationQueueItem[] = places.map((place) => ({
    id: place.id,
    entityKind: "PLACE",
    name: place.name,
    address: place.addressLine,
    categories: place.categories.map((item) => item.category.name),
    queueStatus: place.verificationQueueStatus!,
    issueType: "NEW_PLACE",
    sourceLabel: place.createdFromImport ? `${place.createdFromImport.importBatch.title} · ${place.createdFromImport.importBatch.edition}` : "Ręczna weryfikacja",
    sourceBatchId: place.createdFromImport?.importBatch.id ?? "manual",
    sourcePages: [...new Set(place.createdFromImport?.sources.flatMap((item) => item.sourceEntry.sourcePages) ?? [])].sort((a, b) => a - b),
    missingCoordinates: place.latitude === null || place.longitude === null,
    missingPhone: !place.phone,
    missingHours: !place.openingHours.some((row) => row.status !== "UNKNOWN"),
    missingPrimaryCategory: !place.primaryCategory.active,
    accommodation: Boolean(place.accommodation),
    manualDecision: false,
    verifiedAt: place.verifiedAt,
    updatedAt: place.updatedAt,
  }));
  const candidateItems: VerificationQueueItem[] = candidates.map((candidate) => ({
    id: candidate.id,
    entityKind: "CANDIDATE",
    name: candidate.proposedName,
    address: candidate.proposedAddress,
    categories: candidate.categorySlugs,
    queueStatus: candidate.queueStatus!,
    issueType: candidate.status === "MATCH_EXISTING" ? "MATCH_EXISTING" : candidate.matchedPlaceId ? "POSSIBLE_DUPLICATE" : "IMPORT_CONFLICT",
    sourceLabel: `${candidate.importBatch.title} · ${candidate.importBatch.edition}`,
    sourceBatchId: candidate.importBatch.id,
    sourcePages: [...new Set(candidate.sources.flatMap((item) => item.sourceEntry.sourcePages))].sort((a, b) => a - b),
    missingCoordinates: true,
    missingPhone: !candidate.proposedPhone,
    missingHours: !Array.isArray((candidate.proposedData as Record<string, unknown>).operationHours) || !((candidate.proposedData as Record<string, unknown>).operationHours as unknown[]).some((row) => row && typeof row === "object" && !Array.isArray(row) && "status" in row && row.status !== "UNKNOWN"),
    missingPrimaryCategory: !candidate.primaryCategorySlug,
    accommodation: candidate.categorySlugs.includes("nocleg"),
    manualDecision: true,
    verifiedAt: null,
    updatedAt: candidate.updatedAt,
  }));
  return [...placeItems, ...candidateItems].sort((left, right) => {
    const statusOrder = ["IN_PROGRESS", "PENDING", "READY", "VERIFIED", "SKIPPED"];
    return statusOrder.indexOf(left.queueStatus) - statusOrder.indexOf(right.queueStatus) || left.name.localeCompare(right.name, "pl");
  });
}

export async function getVerificationNavigation(currentId: string) {
  const items = await getVerificationQueueItems();
  const active = items.filter((item) => item.queueStatus !== "VERIFIED" && item.queueStatus !== "SKIPPED");
  const index = active.findIndex((item) => item.id === currentId);
  return {
    previousId: index > 0 ? active[index - 1].id : null,
    nextId: index >= 0 && index < active.length - 1 ? active[index + 1].id : null,
    position: index >= 0 ? index + 1 : null,
    total: active.length,
  };
}

function similarity(left: string, right: string) {
  const a = normalizeComparable(left);
  const b = normalizeComparable(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aWords = new Set(a.split(" "));
  const bWords = new Set(b.split(" "));
  const common = [...aWords].filter((word) => bWords.has(word)).length;
  return common / Math.max(aWords.size, bWords.size, 1);
}

export async function getCandidateComparisonOptions(candidateId: string) {
  const candidate = await prisma.importCandidate.findUnique({ where: { id: candidateId }, select: { importBatchId: true, proposedName: true, proposedAddress: true, proposedPhone: true } });
  if (!candidate) return { allPlaces: [], suggestions: [], relatedCandidates: [] };
  const [places, candidates] = await Promise.all([
    prisma.place.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, addressLine: true, phone: true, organization: { select: { name: true } }, categories: { include: { category: { select: { name: true } } } } },
    }),
    prisma.importCandidate.findMany({
      where: { id: { not: candidateId }, importBatchId: candidate.importBatchId },
      select: { id: true, proposedName: true, proposedAddress: true, proposedPhone: true, categorySlugs: true },
    }),
  ]);
  const address = normalizeAddress(candidate.proposedAddress);
  const scoredPlaces = places.map((place) => ({
    ...place,
    score: similarity(candidate.proposedName, place.name) + (address && normalizeAddress(place.addressLine) === address ? 0.7 : 0) + (candidate.proposedPhone && place.phone === candidate.proposedPhone ? 0.4 : 0),
  })).filter((place) => place.score >= 0.55).sort((a, b) => b.score - a.score).slice(0, 5);
  const relatedCandidates = candidates.map((item) => ({
    ...item,
    score: similarity(candidate.proposedName, item.proposedName) + (address && normalizeAddress(item.proposedAddress) === address ? 0.7 : 0),
  })).filter((item) => item.score >= 0.65).sort((a, b) => b.score - a.score).slice(0, 5);
  return { allPlaces: places, suggestions: scoredPlaces, relatedCandidates };
}
