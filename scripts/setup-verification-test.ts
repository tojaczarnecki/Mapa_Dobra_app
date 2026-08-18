import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const batchKey = "TEST_VERIFICATION_WORKFLOW_ETAP_F";

const unknownRequirements = [
  { kind: "REFERRAL", state: "UNKNOWN", label: "Wymagane skierowanie" },
  { kind: "DOCUMENT", state: "UNKNOWN", label: "Wymagany dokument" },
  { kind: "LODZ_REGISTRATION", state: "UNKNOWN", label: "Ostatnie zameldowanie w Łodzi" },
];

const unknownAccessibility = [
  { feature: "STEP_FREE_ENTRANCE", state: "UNKNOWN" },
  { feature: "WHEELCHAIR_PLACE", state: "UNKNOWN" },
];

function proposedData(name: string, addressLine: string) {
  return {
    name,
    addressLine,
    street: "Piotrkowska",
    buildingNumber: "104",
    postalCode: "90-926",
    city: "Łódź",
    description: "TEST kontrolny kolejki weryfikacji Etapu F.",
    categorySlugs: ["jedzenie"],
    primaryCategorySlug: "jedzenie",
    audience: [],
    services: ["jedzenie"],
    operationHours: [],
    admissionHours: [],
    rawOpeningHours: "poniedziałek 9:00-12:00 i 14:00-17:00",
    rawAdmissionHours: null,
    requirements: unknownRequirements,
    accessibility: unknownAccessibility,
    accommodation: null,
    sourcePages: [999],
  };
}

async function ensureSource(importBatchId: string, sourceKey: string, name: string, addressLine: string) {
  return prisma.importSourceEntry.upsert({
    where: { importBatchId_sourceKey: { importBatchId, sourceKey } },
    update: {},
    create: {
      importBatchId,
      sourceKey,
      section: "TEST Etap F",
      sourcePages: [999],
      rawName: name,
      rawAddress: addressLine,
      rawPhone: "+48 42 000 00 00",
      rawOpeningHours: "poniedziałek 9:00-12:00 i 14:00-17:00",
      rawAssistanceDescription: "TEST kontrolny. Dane nie są publiczne.",
      rawText: `${name}\n${addressLine}\nponiedziałek 9:00-12:00 i 14:00-17:00`,
      parsedData: proposedData(name, addressLine),
    },
  });
}

async function ensureCandidate(input: {
  importBatchId: string;
  sourceEntryId: string;
  candidateKey: string;
  name: string;
  addressLine: string;
  status: "IMPORTED" | "REQUIRES_REVIEW";
  matchedPlaceId?: string;
  createdPlaceId?: string;
  reviewReasons?: string[];
}) {
  const existing = await prisma.importCandidate.findUnique({
    where: { importBatchId_candidateKey: { importBatchId: input.importBatchId, candidateKey: input.candidateKey } },
  });
  if (existing) return existing;

  return prisma.importCandidate.create({
    data: {
      importBatchId: input.importBatchId,
      candidateKey: input.candidateKey,
      status: input.status,
      proposedName: input.name,
      proposedAddress: input.addressLine,
      proposedPhone: "+48 42 000 00 00",
      proposedOrganizationName: "TEST Organizacja Etap F",
      categorySlugs: ["jedzenie"],
      primaryCategorySlug: "jedzenie",
      reviewReasons: input.reviewReasons ?? [],
      proposedData: proposedData(input.name, input.addressLine),
      matchedPlaceId: input.matchedPlaceId,
      createdPlaceId: input.createdPlaceId,
      queueStatus: "PENDING",
      sources: { create: { sourceEntryId: input.sourceEntryId } },
    },
  });
}

async function main() {
  const admin = await prisma.adminUser.findFirstOrThrow({ where: { active: true }, orderBy: { createdAt: "asc" } });
  const category = await prisma.category.findFirstOrThrow({ where: { slug: "jedzenie", active: true } });
  const batch = await prisma.importBatch.upsert({
    where: { key: batchKey },
    update: {},
    create: {
      key: batchKey,
      title: "TEST kolejki weryfikacji Etap F",
      sourceUrl: "https://example.invalid/test-verification-etap-f",
      publisher: "Mapa Dobra - test kontrolny",
      edition: "TEST",
      sourceDocumentHash: "f".repeat(64),
      importedAt: new Date(),
      importDate: new Date(),
      status: "COMPLETED_WITH_REVIEW",
      rawEntryCount: 4,
      candidateCount: 4,
      importedCount: 1,
      reviewCount: 3,
      metadata: { recordKind: "TEST", purpose: "Controlled verification workflow test" },
    },
  });

  const importedSource = await ensureSource(batch.id, "test-place", "TEST Etap F - lokalizacja", "ul. Piotrkowska 104, Łódź");
  let place = await prisma.place.findUnique({ where: { slug: "test-etap-f-lokalizacja" } });
  if (!place) {
    place = await prisma.place.create({
      data: {
        slug: "test-etap-f-lokalizacja",
        name: "TEST Etap F - lokalizacja",
        primaryCategoryId: category.id,
        typeLabel: "Punkt pomocy TEST",
        description: "TEST kontrolny geokodowania i weryfikacji.",
        street: "Piotrkowska",
        buildingNumber: "104",
        postalCode: "90-926",
        city: "Łódź",
        addressLine: "ul. Piotrkowska 104, Łódź",
        publicationStatus: "DRAFT",
        verificationStatus: "NEEDS_CONFIRMATION",
        operationalStatus: "UNKNOWN",
        recordKind: "TEST",
        verificationQueueStatus: "PENDING",
        lastEditedByAdminUserId: admin.id,
        categories: { create: { categoryId: category.id, sortOrder: 0 } },
        requirements: {
          create: unknownRequirements.map((item, sortOrder) => ({
            kind: item.kind as "REFERRAL" | "DOCUMENT" | "LODZ_REGISTRATION",
            state: item.state as "UNKNOWN",
            label: item.label,
            sortOrder,
          })),
        },
        accessibility: {
          create: unknownAccessibility.map((item, sortOrder) => ({
            feature: item.feature as "STEP_FREE_ENTRANCE" | "WHEELCHAIR_PLACE",
            state: item.state as "UNKNOWN",
            label: item.feature === "STEP_FREE_ENTRANCE" ? "Wejście bez stopni" : "Miejsce dla osoby na wózku",
            sortOrder,
          })),
        },
      },
    });
  }

  const importedCandidate = await ensureCandidate({
    importBatchId: batch.id,
    sourceEntryId: importedSource.id,
    candidateKey: "test-place",
    name: place.name,
    addressLine: place.addressLine,
    status: "IMPORTED",
    createdPlaceId: place.id,
  });

  const sameSource = await ensureSource(batch.id, "test-same", "TEST Etap F - możliwy duplikat", place.addressLine);
  const sameCandidate = await ensureCandidate({
    importBatchId: batch.id,
    sourceEntryId: sameSource.id,
    candidateKey: "test-same",
    name: "TEST Etap F - możliwy duplikat",
    addressLine: place.addressLine,
    status: "REQUIRES_REVIEW",
    matchedPlaceId: place.id,
    reviewReasons: ["Możliwy duplikat testowego miejsca"],
  });

  const differentSource = await ensureSource(batch.id, "test-different", "TEST Etap F - osobne miejsce", "ul. Piotrkowska 104A, Łódź");
  const differentCandidate = await ensureCandidate({
    importBatchId: batch.id,
    sourceEntryId: differentSource.id,
    candidateKey: "test-different",
    name: "TEST Etap F - osobne miejsce",
    addressLine: "ul. Piotrkowska 104A, Łódź",
    status: "REQUIRES_REVIEW",
    matchedPlaceId: place.id,
    reviewReasons: ["Ten sam adres bazowy, ale inna jednostka testowa"],
  });

  const skipSource = await ensureSource(batch.id, "test-skip", "TEST Etap F - pomiń", "Usługa mobilna TEST, Łódź");
  const skipCandidate = await ensureCandidate({
    importBatchId: batch.id,
    sourceEntryId: skipSource.id,
    candidateKey: "test-skip",
    name: "TEST Etap F - pomiń",
    addressLine: "Usługa mobilna TEST, Łódź",
    status: "REQUIRES_REVIEW",
    reviewReasons: ["Usługa mobilna bez jednego stałego punktu"],
  });

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { rawEntryCount: 4, candidateCount: 4, importedCount: 1, reviewCount: 3 },
  });

  console.log(JSON.stringify({
    batchId: batch.id,
    placeId: place.id,
    placeSlug: place.slug,
    candidates: {
      imported: importedCandidate.id,
      same: sameCandidate.id,
      different: differentCandidate.id,
      skip: skipCandidate.id,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
