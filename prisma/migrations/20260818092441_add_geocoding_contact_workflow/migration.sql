-- CreateEnum
CREATE TYPE "VerificationContactReason" AS ENUM ('MISSING_CURRENT_HOURS', 'UNCERTAIN_ADDRESS', 'OUTDATED_PHONE', 'CONFLICTING_SOURCES', 'REQUIREMENTS_CONFIRMATION', 'POSSIBLY_CLOSED_OR_MOVED', 'NO_RELIABLE_ONLINE_SOURCE', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationContactMethod" AS ENUM ('PHONE', 'EMAIL', 'IN_PERSON');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'VERIFICATION_CONTACT_REQUIRED';
ALTER TYPE "AuditAction" ADD VALUE 'VERIFICATION_CONTACT_RECORDED';

-- AlterEnum
ALTER TYPE "VerificationQueueStatus" ADD VALUE 'CONTACT_REQUIRED';

-- CreateTable
CREATE TABLE "place_verification_contacts" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "reasons" "VerificationContactReason"[],
    "requiredNote" VARCHAR(1000),
    "requiredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiredByAdminUserId" UUID NOT NULL,
    "contactedAt" TIMESTAMPTZ(3),
    "contactMethod" "VerificationContactMethod",
    "contactResult" VARCHAR(2000),
    "contactedByAdminUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "place_verification_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "place_verification_contacts_placeId_key" ON "place_verification_contacts"("placeId");

-- CreateIndex
CREATE INDEX "place_verification_contacts_contactedAt_requiredAt_idx" ON "place_verification_contacts"("contactedAt", "requiredAt");

-- AddForeignKey
ALTER TABLE "place_verification_contacts" ADD CONSTRAINT "place_verification_contacts_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_verification_contacts" ADD CONSTRAINT "place_verification_contacts_requiredByAdminUserId_fkey" FOREIGN KEY ("requiredByAdminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_verification_contacts" ADD CONSTRAINT "place_verification_contacts_contactedByAdminUserId_fkey" FOREIGN KEY ("contactedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
