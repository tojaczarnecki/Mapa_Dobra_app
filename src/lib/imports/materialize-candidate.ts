import { Prisma } from "../../generated/prisma/client.ts";
import { ImportBatchStatus, ImportCandidateStatus } from "../../generated/prisma/enums.ts";
import { slugifyImportValue } from "./caritas-gdzie-parser.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MAX_SLUG_COLLISION_RETRIES = 2;

export type MaterializeImportCandidateInput = {
  candidateId: string;
  adminUserId: string;
  action: "CREATE_NEW_PLACE";
};

export type MaterializeImportCandidateResult =
  | { status: "CREATED"; placeId: string }
  | { status: "ALREADY_CREATED"; placeId: string }
  | { status: "BATCH_NOT_READY" }
  | { status: "INVALID_CANDIDATE" }
  | { status: "CATEGORY_REVIEW_REQUIRED" }
  | { status: "ORGANIZATION_REVIEW_REQUIRED" }
  | { status: "EXISTING_PLACE_REVIEW_REQUIRED" }
  | { status: "PLACE_MATCH_REVIEW_REQUIRED" }
  | { status: "SOURCE_DUPLICATE_REVIEW_REQUIRED" };

export class ImportCandidateMaterializationError extends Error {
  readonly code = "PERSISTENCE_ERROR" as const;

  constructor(message = "Nie udało się utworzyć szkicu miejsca.") {
    super(message);
    this.name = "ImportCandidateMaterializationError";
  }
}

type CandidateSnapshot = {
  id: string;
  status: ImportCandidateStatus;
  createdPlaceId: string | null;
  matchedPlaceId: string | null;
  proposedName: string;
  proposedAddress: string | null;
  proposedPhone: string | null;
  proposedEmail: string | null;
  proposedWebsite: string | null;
  proposedData: Prisma.JsonValue;
  importBatch: { id: string; key: string; status: ImportBatchStatus };
  sources: Array<{ sourceEntry: { id: string; parsedData: Prisma.JsonValue | null } }>;
};

export type MaterializeCandidateTransaction = {
  $queryRaw<T>(query: Prisma.Sql): Promise<T[]>;
  importCandidate: {
    findUnique(args: Prisma.ImportCandidateFindUniqueArgs): Promise<CandidateSnapshot | null>;
    update(args: Prisma.ImportCandidateUpdateArgs): Promise<{ id: string }>;
  };
  category: {
    findFirst(args: Prisma.CategoryFindFirstArgs): Promise<{ id: string; slug: string; active: boolean } | null>;
  };
  organization: {
    findUnique(args: Prisma.OrganizationFindUniqueArgs): Promise<{ id: string; active: boolean } | null>;
  };
  place: {
    findUnique(args: Prisma.PlaceFindUniqueArgs): Promise<{ id: string } | null>;
    create(args: Prisma.PlaceCreateArgs): Promise<{ id: string }>;
  };
  auditLog: {
    create(args: Prisma.AuditLogCreateArgs): Promise<{ id: string }>;
  };
};

export type MaterializeCandidateDatabase = {
  $transaction<T>(callback: (transaction: MaterializeCandidateTransaction) => Promise<T>): Promise<T>;
};

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()).slice(0, 30) : [];
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

type ProposedValues = {
  name: string;
  addressLine: string;
  street: string | null;
  buildingNumber: string | null;
  postalCode: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  audience: string[];
  services: string[];
};

type ProposedAnalysis = {
  categoryStatus: string;
  categorySlug: string | null;
  organizationStatus: string;
  organizationId: string | null;
  placeClassification: string;
  placeCandidateIds: string[];
  inFileDuplicate: boolean;
};

type ValidatedProposedData = { values: ProposedValues; analysis: ProposedAnalysis };

function validateProposedData(value: Prisma.JsonValue): ValidatedProposedData | null {
  const root = record(value);
  const mapped = record(root?.mappedValues);
  const analysis = record(root?.analysis);
  const category = record(analysis?.category);
  const organization = record(analysis?.organization);
  const place = record(analysis?.place);
  if (!mapped || !analysis || !category || !organization || !place) return null;

  const name = stringValue(mapped.name);
  const addressLine = stringValue(mapped.addressLine);
  const categoryStatus = stringValue(category.status);
  const placeClassification = stringValue(place.classification);
  const organizationStatus = stringValue(organization.status);
  if (!name || !addressLine || !categoryStatus || !placeClassification || !organizationStatus) return null;

  const categorySlug = stringValue(category.categorySlug);
  const organizationId = stringValue(organization.organizationId);
  const placeCandidateIds = Array.isArray(place.candidates)
    ? place.candidates.flatMap((candidate) => {
        const item = record(candidate);
        const id = stringValue(item?.placeId);
        return id ? [id] : [];
      })
    : [];

  return {
    values: {
      name: name.slice(0, 250),
      addressLine: addressLine.slice(0, 400),
      street: stringValue(mapped.street)?.slice(0, 300) ?? null,
      buildingNumber: stringValue(mapped.buildingNumber)?.slice(0, 40) ?? null,
      postalCode: stringValue(mapped.postalCode)?.slice(0, 20) ?? null,
      city: stringValue(mapped.city)?.slice(0, 120) ?? null,
      district: stringValue(mapped.district)?.slice(0, 120) ?? null,
      phone: stringValue(mapped.phone)?.slice(0, 50) ?? null,
      email: stringValue(mapped.email)?.slice(0, 320) ?? null,
      website: stringValue(mapped.website)?.slice(0, 2048) ?? null,
      description: stringValue(mapped.description)?.slice(0, 4000) ?? null,
      audience: stringList(mapped.audience),
      services: stringList(mapped.services),
    },
    analysis: {
      categoryStatus,
      categorySlug,
      organizationStatus,
      organizationId,
      placeClassification,
      placeCandidateIds,
      inFileDuplicate: Array.isArray(analysis.inFileDuplicates) && analysis.inFileDuplicates.length > 0,
    },
  };
}

async function lockCandidate(transaction: MaterializeCandidateTransaction, candidateId: string) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT "id" FROM "import_candidates" WHERE "id" = ${candidateId}::uuid FOR UPDATE`,
  );
  return rows.length > 0;
}

async function uniquePlaceSlug(transaction: MaterializeCandidateTransaction, name: string, candidateId: string): Promise<string> {
  const base = slugifyImportValue(name).slice(0, 170) || `miejsce-${candidateId.slice(0, 8)}`;
  let slug = base;
  let suffix = 1;
  while (await transaction.place.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${candidateId.slice(0, 6)}${suffix > 1 ? `-${suffix}` : ""}`;
    suffix += 1;
  }
  return slug;
}

function blockedByMatch(candidate: CandidateSnapshot, analysis: ProposedAnalysis): MaterializeImportCandidateResult | null {
  if (candidate.matchedPlaceId || analysis.placeClassification === "EXACT_MATCH") return { status: "EXISTING_PLACE_REVIEW_REQUIRED" };
  if (analysis.placeClassification !== "NEW" || analysis.placeCandidateIds.length > 0) return { status: "PLACE_MATCH_REVIEW_REQUIRED" };
  if (analysis.inFileDuplicate) return { status: "SOURCE_DUPLICATE_REVIEW_REQUIRED" };
  return null;
}

export async function materializeImportCandidate(
  db: MaterializeCandidateDatabase,
  input: MaterializeImportCandidateInput,
): Promise<MaterializeImportCandidateResult> {
  if (input.action !== "CREATE_NEW_PLACE" || !uuidPattern.test(input.candidateId) || !uuidPattern.test(input.adminUserId)) return { status: "INVALID_CANDIDATE" };

  let slugCollisionRetries = 0;
  while (true) {
    try {
      return await db.$transaction(async (transaction): Promise<MaterializeImportCandidateResult> => {
    if (!await lockCandidate(transaction, input.candidateId)) return { status: "INVALID_CANDIDATE" };
    const candidate = await transaction.importCandidate.findUnique({
      where: { id: input.candidateId },
      select: {
        id: true,
        status: true,
        createdPlaceId: true,
        matchedPlaceId: true,
        proposedName: true,
        proposedAddress: true,
        proposedPhone: true,
        proposedEmail: true,
        proposedWebsite: true,
        proposedData: true,
        importBatch: { select: { id: true, key: true, status: true } },
        sources: { select: { sourceEntry: { select: { id: true, parsedData: true } } } },
      },
    });
    if (!candidate) return { status: "INVALID_CANDIDATE" };
    if (candidate.createdPlaceId) return { status: "ALREADY_CREATED", placeId: candidate.createdPlaceId };
    if (candidate.importBatch.status === ImportBatchStatus.PROCESSING || candidate.importBatch.status === ImportBatchStatus.FAILED) return { status: "BATCH_NOT_READY" };
    if (candidate.status === ImportCandidateStatus.SKIPPED) return { status: "INVALID_CANDIDATE" };
    const proposed = validateProposedData(candidate.proposedData);
    if (!proposed) return { status: "INVALID_CANDIDATE" };

    const matchBlock = blockedByMatch(candidate, proposed.analysis);
    if (matchBlock) return matchBlock;
    if (candidate.status !== ImportCandidateStatus.IMPORT_READY) return { status: "INVALID_CANDIDATE" };
    if (proposed.analysis.categoryStatus !== "MATCHED" || !proposed.analysis.categorySlug) return { status: "CATEGORY_REVIEW_REQUIRED" };
    const category = await transaction.category.findFirst({ where: { slug: proposed.analysis.categorySlug, active: true }, select: { id: true, slug: true, active: true } });
    if (!category) return { status: "CATEGORY_REVIEW_REQUIRED" };

    let organizationId: string | null = null;
    if (proposed.analysis.organizationStatus === "NONE") {
      organizationId = null;
    } else if (proposed.analysis.organizationStatus === "MATCHED" && proposed.analysis.organizationId) {
      const organization = await transaction.organization.findUnique({ where: { id: proposed.analysis.organizationId }, select: { id: true, active: true } });
      if (!organization?.active) return { status: "ORGANIZATION_REVIEW_REQUIRED" };
      organizationId = organization.id;
    } else {
      return { status: "ORGANIZATION_REVIEW_REQUIRED" };
    }

    const values = proposed.values;
    const place = await transaction.place.create({
      data: {
        slug: await uniquePlaceSlug(transaction, values.name, candidate.id),
        name: values.name,
        organizationId,
        primaryCategoryId: category.id,
        typeLabel: null,
        description: values.description,
        street: values.street,
        buildingNumber: values.buildingNumber,
        addressLine: values.addressLine,
        postalCode: values.postalCode,
        city: values.city ?? "Łódź",
        district: values.district,
        latitude: null,
        longitude: null,
        phone: candidate.proposedPhone ?? values.phone,
        email: candidate.proposedEmail ?? values.email,
        website: candidate.proposedWebsite ?? values.website,
        publicationStatus: "DRAFT",
        verificationStatus: "NEEDS_CONFIRMATION",
        operationalStatus: "UNKNOWN",
        verificationQueueStatus: "PENDING",
        verifiedAt: null,
        verificationSource: null,
        audience: values.audience,
        services: values.services,
        recordKind: "PRODUCTION",
        isDemo: false,
        lastEditedByAdminUserId: input.adminUserId,
        categories: { create: [{ categoryId: category.id, sortOrder: 0 }] },
      },
      select: { id: true },
    });
    await transaction.importCandidate.update({ where: { id: candidate.id }, data: { status: ImportCandidateStatus.IMPORTED, createdPlaceId: place.id } });
    await transaction.auditLog.create({
      data: {
        adminUserId: input.adminUserId,
        action: "PLACE_IMPORTED",
        entityType: "PLACE",
        entityId: place.id,
        changedFields: ["recordKind", "publicationStatus", "verificationStatus", "verificationQueueStatus", "source"],
        previousValues: Prisma.JsonNull,
        newValues: { recordKind: "PRODUCTION", publicationStatus: "DRAFT", verificationStatus: "NEEDS_CONFIRMATION", verificationQueueStatus: "PENDING", importBatch: candidate.importBatch.key, candidateId: candidate.id },
        changeOrigin: "SOURCE_IMPORT",
        sourceReferenceId: candidate.id,
        note: `Utworzono szkic z kandydata importu ${candidate.importBatch.key}.`,
      },
    });
    return { status: "CREATED", placeId: place.id };
      });
    } catch (error) {
      if (isUniqueViolation(error) && slugCollisionRetries < MAX_SLUG_COLLISION_RETRIES) {
        slugCollisionRetries += 1;
        continue;
      }
      if (error instanceof ImportCandidateMaterializationError) throw error;
      throw new ImportCandidateMaterializationError(error instanceof Error ? error.message : undefined);
    }
  }
}
