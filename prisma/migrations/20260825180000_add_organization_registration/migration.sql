ALTER TYPE "AdminTokenPurpose" ADD VALUE 'ORGANIZATION_EMAIL_VERIFICATION';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_REGISTRATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_REGISTRATION_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_REGISTRATION_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'PLACE_ACCESS_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'PLACE_ACCESS_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'PLACE_ACCESS_REJECTED';
ALTER TYPE "AuditEntityType" ADD VALUE 'ORGANIZATION_REGISTRATION';
ALTER TYPE "AuditEntityType" ADD VALUE 'PLACE_ACCESS_REQUEST';
CREATE TYPE "OrganizationRegistrationStatus" AS ENUM ('EMAIL_PENDING', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "PlaceAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "organization_registrations" (
  "id" UUID NOT NULL,
  "adminUserId" UUID NOT NULL,
  "organizationId" UUID,
  "organizationName" VARCHAR(250) NOT NULL,
  "nip" VARCHAR(20),
  "website" VARCHAR(2048),
  "organizationPhone" VARCHAR(50),
  "organizationEmail" VARCHAR(320) NOT NULL,
  "applicantName" VARCHAR(160) NOT NULL,
  "applicantEmail" VARCHAR(320) NOT NULL,
  "applicantPhone" VARCHAR(50),
  "applicantPosition" VARCHAR(160),
  "status" "OrganizationRegistrationStatus" NOT NULL DEFAULT 'EMAIL_PENDING',
  "possibleOrganizationId" UUID,
  "rejectionReason" VARCHAR(1000),
  "verifiedAt" TIMESTAMPTZ(3),
  "reviewedByAdminId" UUID,
  "reviewedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "organization_registrations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_registrations_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_registrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "organization_registrations_possibleOrganizationId_fkey" FOREIGN KEY ("possibleOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "organization_registrations_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "organization_registrations_adminUserId_key" ON "organization_registrations"("adminUserId");
CREATE INDEX "organization_registrations_status_createdAt_idx" ON "organization_registrations"("status", "createdAt");
CREATE INDEX "organization_registrations_organizationEmail_idx" ON "organization_registrations"("organizationEmail");

CREATE TABLE "place_access_requests" (
  "id" UUID NOT NULL,
  "requestingUserId" UUID NOT NULL,
  "organizationId" UUID,
  "placeId" UUID NOT NULL,
  "message" VARCHAR(1000),
  "status" "PlaceAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedByAdminId" UUID,
  "reviewedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "place_access_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "place_access_requests_requestingUserId_fkey" FOREIGN KEY ("requestingUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "place_access_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "place_access_requests_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "place_access_requests_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "place_access_requests_requestingUserId_placeId_status_key" ON "place_access_requests"("requestingUserId", "placeId", "status");
CREATE INDEX "place_access_requests_status_createdAt_idx" ON "place_access_requests"("status", "createdAt");
CREATE INDEX "place_access_requests_placeId_status_idx" ON "place_access_requests"("placeId", "status");
