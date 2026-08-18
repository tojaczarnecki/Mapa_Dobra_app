-- CreateEnum
CREATE TYPE "VerificationQueueStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'VERIFIED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ImportCandidateResolution" AS ENUM ('SAME_PLACE', 'DIFFERENT_PLACE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PlaceLocationSource" AS ENUM ('GEOCODER', 'MANUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'VERIFICATION_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'IMPORT_CONFLICT_RESOLVED';
ALTER TYPE "AuditAction" ADD VALUE 'IMPORT_CANDIDATE_SKIPPED';
ALTER TYPE "AuditAction" ADD VALUE 'LOCATION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PLACE_VERIFIED';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'IMPORT_CANDIDATE';

-- AlterTable
ALTER TABLE "import_candidates" ADD COLUMN     "queueStatus" "VerificationQueueStatus",
ADD COLUMN     "resolution" "ImportCandidateResolution",
ADD COLUMN     "resolutionNote" VARCHAR(1000),
ADD COLUMN     "resolvedAt" TIMESTAMPTZ(3),
ADD COLUMN     "resolvedByAdminUserId" UUID;

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "locationSource" "PlaceLocationSource",
ADD COLUMN     "locationUpdatedAt" TIMESTAMPTZ(3),
ADD COLUMN     "verificationQueueStatus" "VerificationQueueStatus",
ADD COLUMN     "verificationSourceUrl" VARCHAR(2048);

-- CreateTable
CREATE TABLE "geocoding_cache" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "normalizedQuery" VARCHAR(700) NOT NULL,
    "query" VARCHAR(700) NOT NULL,
    "results" JSONB NOT NULL,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "geocoding_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "geocoding_cache_fetchedAt_idx" ON "geocoding_cache"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "geocoding_cache_provider_normalizedQuery_key" ON "geocoding_cache"("provider", "normalizedQuery");

-- CreateIndex
CREATE INDEX "import_candidates_queueStatus_status_idx" ON "import_candidates"("queueStatus", "status");

-- CreateIndex
CREATE INDEX "places_verificationQueueStatus_recordKind_publicationStatus_idx" ON "places"("verificationQueueStatus", "recordKind", "publicationStatus");

-- AddForeignKey
ALTER TABLE "import_candidates" ADD CONSTRAINT "import_candidates_resolvedByAdminUserId_fkey" FOREIGN KEY ("resolvedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Imported place drafts enter the verification queue without changing their
-- publication or verification status.
UPDATE "places"
SET "verificationQueueStatus" = 'PENDING'
WHERE "id" IN (
  SELECT "createdPlaceId"
  FROM "import_candidates"
  WHERE "createdPlaceId" IS NOT NULL
);

-- Unresolved source candidates remain separate from Place records until an
-- administrator makes an explicit conflict decision.
UPDATE "import_candidates"
SET "queueStatus" = 'PENDING'
WHERE "status" IN ('REQUIRES_REVIEW', 'MATCH_EXISTING');
