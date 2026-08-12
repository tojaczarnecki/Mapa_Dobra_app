-- CreateEnum
CREATE TYPE "SubmissionPublicationStatus" AS ENUM ('NOT_PUBLISHED', 'PUBLISHED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DRAFT_REBASED';

-- AlterTable
ALTER TABLE "new_place_submissions" ADD COLUMN     "publicationStatus" "SubmissionPublicationStatus" NOT NULL DEFAULT 'NOT_PUBLISHED';

-- AlterTable
ALTER TABLE "place_update_submissions" ADD COLUMN     "publicationStatus" "SubmissionPublicationStatus" NOT NULL DEFAULT 'NOT_PUBLISHED';

-- Existing links are already published; older APPROVED rows without a link deliberately stay NOT_PUBLISHED.
UPDATE "place_update_submissions"
SET "publicationStatus" = 'PUBLISHED'
WHERE "publishedPlaceId" IS NOT NULL AND "publishedAt" IS NOT NULL;

UPDATE "new_place_submissions"
SET "publicationStatus" = 'PUBLISHED'
WHERE "publishedPlaceId" IS NOT NULL AND "publishedAt" IS NOT NULL;

-- AlterTable
ALTER TABLE "submission_drafts" ADD COLUMN     "basePlaceSnapshot" JSONB,
ADD COLUMN     "basePlaceUpdatedAt" TIMESTAMPTZ(3);
