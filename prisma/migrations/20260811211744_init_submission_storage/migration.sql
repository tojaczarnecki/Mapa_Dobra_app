-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PlaceUpdateType" AS ENUM ('hours', 'address', 'phone', 'online-contact', 'help-scope', 'requirements', 'temporary-closure', 'permanent-closure', 'accommodation-availability', 'accommodation-rules', 'other');

-- CreateEnum
CREATE TYPE "HelpCategory" AS ENUM ('food', 'accommodation', 'hygiene', 'clothing', 'medical', 'psychological', 'legal', 'social', 'other');

-- CreateEnum
CREATE TYPE "SubmissionSourceType" AS ENUM ('visited', 'used-help', 'staff', 'phone', 'website', 'social', 'volunteer', 'recommendation', 'other', 'prefer-not');

-- CreateEnum
CREATE TYPE "InformationState" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateTable
CREATE TABLE "place_update_submissions" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "placeId" VARCHAR(200),
    "placeSlug" VARCHAR(200),
    "placeNameSnapshot" VARCHAR(250) NOT NULL,
    "submissionTypes" "PlaceUpdateType"[],
    "description" VARCHAR(4000) NOT NULL,
    "proposedPhone" VARCHAR(50),
    "proposedAddress" VARCHAR(400),
    "proposedOpeningHours" VARCHAR(1200),
    "proposedWebsite" VARCHAR(2048),
    "proposedOtherValue" VARCHAR(2000),
    "sourceType" "SubmissionSourceType",
    "sourceUrl" VARCHAR(2048),
    "reporterName" VARCHAR(160),
    "reporterEmail" VARCHAR(320),
    "reporterPhone" VARCHAR(50),
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "place_update_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "new_place_submissions" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "organizationName" VARCHAR(250),
    "categories" "HelpCategory"[],
    "streetAddress" VARCHAR(300),
    "postalCode" VARCHAR(20),
    "city" VARCHAR(120) NOT NULL,
    "district" VARCHAR(120),
    "phone" VARCHAR(50),
    "email" VARCHAR(320),
    "website" VARCHAR(2048),
    "openingHoursDescription" VARCHAR(1200),
    "description" VARCHAR(4000),
    "requirements" TEXT[],
    "sourceType" "SubmissionSourceType",
    "sourceUrl" VARCHAR(2048),
    "reporterName" VARCHAR(160),
    "reporterEmail" VARCHAR(320),
    "reporterPhone" VARCHAR(50),
    "accommodationType" VARCHAR(160),
    "targetGroups" TEXT[],
    "availabilityKnown" "InformationState",
    "availableBedsReported" INTEGER,
    "availabilityReportedAt" TIMESTAMPTZ(3),
    "availabilityReportedDescription" VARCHAR(240),
    "admissionHoursDescription" VARCHAR(1200),
    "sobrietyPolicy" VARCHAR(240),
    "petPolicy" VARCHAR(240),
    "accessibilityFeatures" TEXT[],
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "new_place_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "place_update_submissions_requestId_key" ON "place_update_submissions"("requestId");

-- CreateIndex
CREATE INDEX "place_update_submissions_moderationStatus_createdAt_idx" ON "place_update_submissions"("moderationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "place_update_submissions_placeSlug_idx" ON "place_update_submissions"("placeSlug");

-- CreateIndex
CREATE UNIQUE INDEX "new_place_submissions_requestId_key" ON "new_place_submissions"("requestId");

-- CreateIndex
CREATE INDEX "new_place_submissions_moderationStatus_createdAt_idx" ON "new_place_submissions"("moderationStatus", "createdAt");
