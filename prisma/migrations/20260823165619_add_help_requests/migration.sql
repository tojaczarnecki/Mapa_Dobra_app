-- CreateEnum
CREATE TYPE "HelpRequestStatus" AS ENUM ('NEW', 'REVIEWING', 'FORWARDED', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HelpRequestUrgency" AS ENUM ('IMMEDIATE', 'STANDARD', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "HelpRequestNeed" AS ENUM ('SAFE_PLACE', 'FOOD', 'CLOTHING_HYGIENE', 'MEDICAL', 'DAILY_FUNCTIONING', 'OLDER_PERSON_SUPPORT', 'NO_SUPPORT_NETWORK', 'OUTDOOR_HARSH_CONDITIONS', 'DAILY_TASKS', 'SAFETY_WELLBEING', 'LOST_OR_DISORIENTED', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminPermission" ADD VALUE 'VIEW_HELP_REQUESTS';
ALTER TYPE "AdminPermission" ADD VALUE 'MANAGE_HELP_REQUESTS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'HELP_REQUEST_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'HELP_REQUEST_NOTE_ADDED';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'HELP_REQUEST';

-- CreateTable
CREATE TABLE "help_requests" (
    "id" UUID NOT NULL,
    "status" "HelpRequestStatus" NOT NULL DEFAULT 'NEW',
    "urgency" "HelpRequestUrgency" NOT NULL DEFAULT 'UNKNOWN',
    "emergencyAnswer" "InformationState" NOT NULL,
    "needs" "HelpRequestNeed"[],
    "description" VARCHAR(5000) NOT NULL,
    "addressText" VARCHAR(500),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationAccuracy" DOUBLE PRECISION,
    "reporterName" VARCHAR(160),
    "reporterPhone" VARCHAR(50),
    "reporterEmail" VARCHAR(320),
    "anonymous" BOOLEAN NOT NULL DEFAULT true,
    "internalNotes" VARCHAR(4000),
    "reviewedAt" TIMESTAMPTZ(3),
    "resolvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "help_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "help_requests_status_createdAt_idx" ON "help_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "help_requests_urgency_createdAt_idx" ON "help_requests"("urgency", "createdAt");
