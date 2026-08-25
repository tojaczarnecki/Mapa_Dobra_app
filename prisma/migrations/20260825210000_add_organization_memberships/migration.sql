CREATE TYPE "OrganizationMembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

CREATE TABLE "organization_memberships" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "adminUserId" UUID NOT NULL,
  "status" "OrganizationMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_memberships_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "organization_memberships_organizationId_adminUserId_key" ON "organization_memberships"("organizationId", "adminUserId");
CREATE INDEX "organization_memberships_adminUserId_status_idx" ON "organization_memberships"("adminUserId", "status");

INSERT INTO "organization_memberships" ("id", "organizationId", "adminUserId", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "organizationId", "adminUserId", 'ACTIVE'::"OrganizationMembershipStatus", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organization_registrations"
WHERE "status" = 'APPROVED'::"OrganizationRegistrationStatus"
  AND "organizationId" IS NOT NULL
ON CONFLICT ("organizationId", "adminUserId") DO NOTHING;
