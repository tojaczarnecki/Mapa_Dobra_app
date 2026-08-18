-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('STAGED', 'IMPORTED', 'COMPLETED_WITH_REVIEW');

-- CreateEnum
CREATE TYPE "ImportCandidateStatus" AS ENUM ('IMPORT_READY', 'MATCH_EXISTING', 'REQUIRES_REVIEW', 'IMPORTED', 'SKIPPED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PLACE_IMPORTED';

-- AlterEnum
ALTER TYPE "ChangeOrigin" ADD VALUE 'SOURCE_IMPORT';

-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL,
    "key" VARCHAR(160) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "sourceUrl" VARCHAR(2048) NOT NULL,
    "publisher" VARCHAR(250) NOT NULL,
    "edition" VARCHAR(80) NOT NULL,
    "sourceDocumentHash" CHAR(64) NOT NULL,
    "importedAt" TIMESTAMPTZ(3),
    "importDate" DATE NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'STAGED',
    "rawEntryCount" INTEGER NOT NULL DEFAULT 0,
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_source_entries" (
    "id" UUID NOT NULL,
    "importBatchId" UUID NOT NULL,
    "sourceKey" VARCHAR(200) NOT NULL,
    "section" VARCHAR(200) NOT NULL,
    "sourcePages" INTEGER[],
    "rawName" VARCHAR(500) NOT NULL,
    "rawAddress" VARCHAR(1200),
    "rawPhone" VARCHAR(500),
    "rawEmail" VARCHAR(500),
    "rawWebsite" VARCHAR(2048),
    "rawOpeningHours" VARCHAR(2000),
    "rawAdmissionHours" VARCHAR(2000),
    "rawAssistanceDescription" VARCHAR(5000),
    "rawText" TEXT NOT NULL,
    "parsedData" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_source_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_candidates" (
    "id" UUID NOT NULL,
    "importBatchId" UUID NOT NULL,
    "candidateKey" VARCHAR(200) NOT NULL,
    "status" "ImportCandidateStatus" NOT NULL,
    "proposedName" VARCHAR(500) NOT NULL,
    "proposedAddress" VARCHAR(1200),
    "proposedPhone" VARCHAR(500),
    "proposedEmail" VARCHAR(500),
    "proposedWebsite" VARCHAR(2048),
    "proposedOrganizationName" VARCHAR(500),
    "categorySlugs" TEXT[],
    "primaryCategorySlug" VARCHAR(120),
    "reviewReasons" TEXT[],
    "proposedData" JSONB NOT NULL,
    "matchedPlaceId" UUID,
    "createdPlaceId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "import_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_candidate_sources" (
    "importCandidateId" UUID NOT NULL,
    "sourceEntryId" UUID NOT NULL,

    CONSTRAINT "import_candidate_sources_pkey" PRIMARY KEY ("importCandidateId","sourceEntryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "import_batches_key_key" ON "import_batches"("key");

-- CreateIndex
CREATE INDEX "import_batches_status_createdAt_idx" ON "import_batches"("status", "createdAt");

-- CreateIndex
CREATE INDEX "import_source_entries_importBatchId_section_idx" ON "import_source_entries"("importBatchId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "import_source_entries_importBatchId_sourceKey_key" ON "import_source_entries"("importBatchId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "import_candidates_createdPlaceId_key" ON "import_candidates"("createdPlaceId");

-- CreateIndex
CREATE INDEX "import_candidates_importBatchId_status_idx" ON "import_candidates"("importBatchId", "status");

-- CreateIndex
CREATE INDEX "import_candidates_matchedPlaceId_idx" ON "import_candidates"("matchedPlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "import_candidates_importBatchId_candidateKey_key" ON "import_candidates"("importBatchId", "candidateKey");

-- CreateIndex
CREATE INDEX "import_candidate_sources_sourceEntryId_idx" ON "import_candidate_sources"("sourceEntryId");

-- AddForeignKey
ALTER TABLE "import_source_entries" ADD CONSTRAINT "import_source_entries_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_candidates" ADD CONSTRAINT "import_candidates_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_candidates" ADD CONSTRAINT "import_candidates_matchedPlaceId_fkey" FOREIGN KEY ("matchedPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_candidates" ADD CONSTRAINT "import_candidates_createdPlaceId_fkey" FOREIGN KEY ("createdPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_candidate_sources" ADD CONSTRAINT "import_candidate_sources_importCandidateId_fkey" FOREIGN KEY ("importCandidateId") REFERENCES "import_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_candidate_sources" ADD CONSTRAINT "import_candidate_sources_sourceEntryId_fkey" FOREIGN KEY ("sourceEntryId") REFERENCES "import_source_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
