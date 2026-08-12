-- CreateEnum
CREATE TYPE "PlacePublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'TEMPORARILY_CLOSED', 'PERMANENTLY_CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlaceVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'NEEDS_CONFIRMATION');

-- CreateEnum
CREATE TYPE "PlaceOperationalStatus" AS ENUM ('OPEN', 'CLOSED', 'OPEN_TODAY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "OpeningHoursKind" AS ENUM ('OPERATION', 'ADMISSION');

-- CreateEnum
CREATE TYPE "OpeningHoursStatus" AS ENUM ('OPEN', 'CLOSED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RequirementKind" AS ENUM ('REFERRAL', 'DOCUMENT', 'FEE', 'LODZ_REGISTRATION', 'APPOINTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AccessibilityFeature" AS ENUM ('STEP_FREE_ENTRANCE', 'RAMP', 'ELEVATOR', 'ACCESSIBLE_TOILET', 'ACCESSIBLE_SHOWER', 'WHEELCHAIR_PLACE', 'ASSISTANCE_DOG', 'CARE_SERVICES', 'STAY_WITH_ASSISTANT', 'OTHER');

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('SHELTER', 'NIGHT_SHELTER', 'WARMING_CENTER', 'HOSTEL', 'INTERVENTION_HOSTEL', 'CARE_SHELTER', 'WOMEN_WITH_CHILDREN_HOME', 'OTHER');

-- CreateEnum
CREATE TYPE "AccommodationAvailabilityState" AS ENUM ('AVAILABLE', 'FEW', 'FULL', 'UNKNOWN', 'STALE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SobrietyPolicy" AS ENUM ('SOBRIETY_REQUIRED', 'ZERO_TOLERANCE', 'INDIVIDUAL_ASSESSMENT', 'SEPARATE_PROCEDURE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PetPolicy" AS ENUM ('ACCEPTED', 'NOT_ACCEPTED', 'DOG_ONLY', 'BY_ARRANGEMENT', 'ASSISTANCE_DOG_ONLY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ChangeOrigin" AS ENUM ('DEMO_MIGRATION', 'ADMIN_MANUAL', 'USER_SUBMISSION');

-- CreateEnum
CREATE TYPE "VerificationSource" AS ENUM ('PHONE_CALL', 'ORGANIZATION_EMAIL', 'VISIT', 'OFFICIAL_WEBSITE', 'SOCIAL_MEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "DraftFieldDecision" AS ENUM ('PENDING', 'INCLUDE', 'REJECT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PLACE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PLACE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PLACE_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'PLACE_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'AVAILABILITY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'DRAFT_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'SUBMISSION_PUBLISHED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntityType" ADD VALUE 'PLACE';
ALTER TYPE "AuditEntityType" ADD VALUE 'ACCOMMODATION_CAPACITY_GROUP';
ALTER TYPE "AuditEntityType" ADD VALUE 'SUBMISSION_DRAFT';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "changeOrigin" "ChangeOrigin",
ADD COLUMN     "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "newValues" JSONB,
ADD COLUMN     "previousValues" JSONB,
ADD COLUMN     "sourceReferenceId" UUID,
ADD COLUMN     "sourceType" "VerificationSource";

-- AlterTable
ALTER TABLE "new_place_submissions" ADD COLUMN     "publishedAt" TIMESTAMPTZ(3),
ADD COLUMN     "publishedPlaceId" UUID;

-- AlterTable
ALTER TABLE "place_update_submissions" ADD COLUMN     "publishedAt" TIMESTAMPTZ(3),
ADD COLUMN     "publishedPlaceId" UUID,
ADD COLUMN     "targetPlaceId" UUID;

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "description" VARCHAR(2000),
    "phone" VARCHAR(50),
    "email" VARCHAR(320),
    "website" VARCHAR(2048),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" UUID NOT NULL,
    "legacyId" VARCHAR(200),
    "citySlug" VARCHAR(120) NOT NULL DEFAULT 'lodz',
    "slug" VARCHAR(200) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "organizationId" UUID,
    "primaryCategoryId" UUID NOT NULL,
    "typeLabel" VARCHAR(160),
    "description" VARCHAR(4000),
    "street" VARCHAR(300),
    "buildingNumber" VARCHAR(40),
    "addressLine" VARCHAR(400) NOT NULL,
    "postalCode" VARCHAR(20),
    "city" VARCHAR(120) NOT NULL DEFAULT 'Łódź',
    "district" VARCHAR(120),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "phone" VARCHAR(50),
    "email" VARCHAR(320),
    "website" VARCHAR(2048),
    "socialMedia" VARCHAR(2048),
    "publicationStatus" "PlacePublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationStatus" "PlaceVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "operationalStatus" "PlaceOperationalStatus" NOT NULL DEFAULT 'UNKNOWN',
    "todayHoursLabel" VARCHAR(240),
    "verificationNote" VARCHAR(1000),
    "verificationSource" "VerificationSource",
    "verifiedAt" TIMESTAMPTZ(3),
    "internalNote" VARCHAR(2000),
    "audience" TEXT[],
    "services" TEXT[],
    "distanceLabel" VARCHAR(80),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "lastEditedByAdminUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_categories" (
    "placeId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "place_categories_pkey" PRIMARY KEY ("placeId","categoryId")
);

-- CreateTable
CREATE TABLE "opening_hours" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "kind" "OpeningHoursKind" NOT NULL DEFAULT 'OPERATION',
    "weekday" "Weekday" NOT NULL,
    "status" "OpeningHoursStatus" NOT NULL,
    "opensAt" VARCHAR(5),
    "closesAt" VARCHAR(5),
    "note" VARCHAR(240),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_requirements" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "kind" "RequirementKind" NOT NULL,
    "state" "InformationState" NOT NULL DEFAULT 'UNKNOWN',
    "label" VARCHAR(240) NOT NULL,
    "note" VARCHAR(500),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "place_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_accessibility" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "feature" "AccessibilityFeature" NOT NULL,
    "state" "InformationState" NOT NULL DEFAULT 'UNKNOWN',
    "label" VARCHAR(240) NOT NULL,
    "note" VARCHAR(500),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "place_accessibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accommodation_details" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "type" "AccommodationType" NOT NULL,
    "audienceLabel" VARCHAR(240),
    "targetGroups" TEXT[],
    "acceptedProfiles" TEXT[],
    "admissionHoursDescription" VARCHAR(1200),
    "acceptsToday" "InformationState" NOT NULL DEFAULT 'UNKNOWN',
    "lodzRegistrationRequired" "InformationState" NOT NULL DEFAULT 'UNKNOWN',
    "referralRequired" "InformationState" NOT NULL DEFAULT 'UNKNOWN',
    "documentRequired" "InformationState" NOT NULL DEFAULT 'UNKNOWN',
    "sobrietyPolicy" "SobrietyPolicy" NOT NULL DEFAULT 'UNKNOWN',
    "sobrietyNote" VARCHAR(500),
    "petPolicy" "PetPolicy" NOT NULL DEFAULT 'UNKNOWN',
    "petNote" VARCHAR(500),
    "wheelchairAccessibility" "InformationState" NOT NULL DEFAULT 'UNKNOWN',
    "careServices" "InformationState" NOT NULL DEFAULT 'UNKNOWN',
    "partialDependencySupport" "InformationState" NOT NULL DEFAULT 'UNKNOWN',
    "mealsInfo" VARCHAR(500),
    "hygieneInfo" VARCHAR(500),
    "luggageInfo" VARCHAR(500),
    "returnTimeInfo" VARCHAR(500),
    "maxStayInfo" VARCHAR(500),
    "feeInfo" VARCHAR(500),
    "availabilityState" "AccommodationAvailabilityState" NOT NULL DEFAULT 'UNKNOWN',
    "availabilityLabel" VARCHAR(240),
    "availabilityConfirmedAt" TIMESTAMPTZ(3),
    "availabilityNote" VARCHAR(1000),
    "importantNote" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accommodation_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accommodation_capacity_groups" (
    "id" UUID NOT NULL,
    "accommodationDetailsId" UUID NOT NULL,
    "label" VARCHAR(160) NOT NULL,
    "totalBeds" INTEGER,
    "availableBeds" INTEGER,
    "availabilityUpdatedAt" TIMESTAMPTZ(3),
    "updatedByAdminUserId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accommodation_capacity_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accommodation_availability_history" (
    "id" UUID NOT NULL,
    "accommodationDetailsId" UUID NOT NULL,
    "capacityGroupId" UUID,
    "availabilityState" "AccommodationAvailabilityState" NOT NULL,
    "availableBeds" INTEGER,
    "totalBeds" INTEGER,
    "reportedAt" TIMESTAMPTZ(3) NOT NULL,
    "adminUserId" UUID,
    "origin" "ChangeOrigin" NOT NULL,
    "note" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accommodation_availability_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_drafts" (
    "id" UUID NOT NULL,
    "placeUpdateSubmissionId" UUID,
    "newPlaceSubmissionId" UUID,
    "targetPlaceId" UUID,
    "createdByAdminUserId" UUID NOT NULL,
    "updatedByAdminUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "submission_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_draft_items" (
    "id" UUID NOT NULL,
    "submissionDraftId" UUID NOT NULL,
    "fieldKey" VARCHAR(120) NOT NULL,
    "label" VARCHAR(160) NOT NULL,
    "currentValueSnapshot" JSONB,
    "userValueSnapshot" JSONB,
    "workingValue" JSONB,
    "decision" "DraftFieldDecision" NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "submission_draft_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_active_sortOrder_idx" ON "categories"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "places_legacyId_key" ON "places"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "places_slug_key" ON "places"("slug");

-- CreateIndex
CREATE INDEX "places_publicationStatus_city_idx" ON "places"("publicationStatus", "city");

-- CreateIndex
CREATE INDEX "places_primaryCategoryId_idx" ON "places"("primaryCategoryId");

-- CreateIndex
CREATE INDEX "places_name_idx" ON "places"("name");

-- CreateIndex
CREATE INDEX "place_categories_categoryId_idx" ON "place_categories"("categoryId");

-- CreateIndex
CREATE INDEX "opening_hours_placeId_kind_weekday_idx" ON "opening_hours"("placeId", "kind", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "opening_hours_placeId_kind_weekday_sortOrder_key" ON "opening_hours"("placeId", "kind", "weekday", "sortOrder");

-- CreateIndex
CREATE INDEX "place_requirements_placeId_sortOrder_idx" ON "place_requirements"("placeId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "place_requirements_placeId_kind_sortOrder_key" ON "place_requirements"("placeId", "kind", "sortOrder");

-- CreateIndex
CREATE INDEX "place_accessibility_placeId_sortOrder_idx" ON "place_accessibility"("placeId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "place_accessibility_placeId_feature_sortOrder_key" ON "place_accessibility"("placeId", "feature", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "accommodation_details_placeId_key" ON "accommodation_details"("placeId");

-- CreateIndex
CREATE INDEX "accommodation_capacity_groups_accommodationDetailsId_sortOr_idx" ON "accommodation_capacity_groups"("accommodationDetailsId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "accommodation_capacity_groups_accommodationDetailsId_label_key" ON "accommodation_capacity_groups"("accommodationDetailsId", "label");

-- CreateIndex
CREATE INDEX "accommodation_availability_history_accommodationDetailsId_r_idx" ON "accommodation_availability_history"("accommodationDetailsId", "reportedAt");

-- CreateIndex
CREATE INDEX "accommodation_availability_history_capacityGroupId_reported_idx" ON "accommodation_availability_history"("capacityGroupId", "reportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "submission_drafts_placeUpdateSubmissionId_key" ON "submission_drafts"("placeUpdateSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_drafts_newPlaceSubmissionId_key" ON "submission_drafts"("newPlaceSubmissionId");

-- CreateIndex
CREATE INDEX "submission_drafts_targetPlaceId_idx" ON "submission_drafts"("targetPlaceId");

-- CreateIndex
CREATE INDEX "submission_draft_items_submissionDraftId_sortOrder_idx" ON "submission_draft_items"("submissionDraftId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "submission_draft_items_submissionDraftId_fieldKey_key" ON "submission_draft_items"("submissionDraftId", "fieldKey");

-- CreateIndex
CREATE INDEX "new_place_submissions_publishedPlaceId_idx" ON "new_place_submissions"("publishedPlaceId");

-- CreateIndex
CREATE INDEX "place_update_submissions_targetPlaceId_idx" ON "place_update_submissions"("targetPlaceId");

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_primaryCategoryId_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_lastEditedByAdminUserId_fkey" FOREIGN KEY ("lastEditedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_categories" ADD CONSTRAINT "place_categories_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_categories" ADD CONSTRAINT "place_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_requirements" ADD CONSTRAINT "place_requirements_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_accessibility" ADD CONSTRAINT "place_accessibility_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_details" ADD CONSTRAINT "accommodation_details_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_capacity_groups" ADD CONSTRAINT "accommodation_capacity_groups_accommodationDetailsId_fkey" FOREIGN KEY ("accommodationDetailsId") REFERENCES "accommodation_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_capacity_groups" ADD CONSTRAINT "accommodation_capacity_groups_updatedByAdminUserId_fkey" FOREIGN KEY ("updatedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_availability_history" ADD CONSTRAINT "accommodation_availability_history_accommodationDetailsId_fkey" FOREIGN KEY ("accommodationDetailsId") REFERENCES "accommodation_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_availability_history" ADD CONSTRAINT "accommodation_availability_history_capacityGroupId_fkey" FOREIGN KEY ("capacityGroupId") REFERENCES "accommodation_capacity_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_availability_history" ADD CONSTRAINT "accommodation_availability_history_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_drafts" ADD CONSTRAINT "submission_drafts_placeUpdateSubmissionId_fkey" FOREIGN KEY ("placeUpdateSubmissionId") REFERENCES "place_update_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_drafts" ADD CONSTRAINT "submission_drafts_newPlaceSubmissionId_fkey" FOREIGN KEY ("newPlaceSubmissionId") REFERENCES "new_place_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_drafts" ADD CONSTRAINT "submission_drafts_targetPlaceId_fkey" FOREIGN KEY ("targetPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_drafts" ADD CONSTRAINT "submission_drafts_createdByAdminUserId_fkey" FOREIGN KEY ("createdByAdminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_drafts" ADD CONSTRAINT "submission_drafts_updatedByAdminUserId_fkey" FOREIGN KEY ("updatedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_draft_items" ADD CONSTRAINT "submission_draft_items_submissionDraftId_fkey" FOREIGN KEY ("submissionDraftId") REFERENCES "submission_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_update_submissions" ADD CONSTRAINT "place_update_submissions_targetPlaceId_fkey" FOREIGN KEY ("targetPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_update_submissions" ADD CONSTRAINT "place_update_submissions_publishedPlaceId_fkey" FOREIGN KEY ("publishedPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "new_place_submissions" ADD CONSTRAINT "new_place_submissions_publishedPlaceId_fkey" FOREIGN KEY ("publishedPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
