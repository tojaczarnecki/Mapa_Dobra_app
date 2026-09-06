CREATE TYPE "OrganizationNeedType" AS ENUM ('VOLUNTEERS', 'ITEMS', 'TRANSPORT', 'SKILLS', 'SPACE', 'FUNDING', 'OTHER');
CREATE TYPE "OrganizationNeedStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'FILLED', 'CANCELLED');
CREATE TYPE "VolunteerNeedResponseStatus" AS ENUM ('NEW', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED');

CREATE TABLE "organization_needs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "placeId" UUID,
    "type" "OrganizationNeedType" NOT NULL DEFAULT 'VOLUNTEERS',
    "status" "OrganizationNeedStatus" NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(180) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "peopleNeeded" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "signupDeadline" TIMESTAMPTZ(3),
    "experienceRequired" BOOLEAN NOT NULL DEFAULT false,
    "requirements" VARCHAR(500),
    "locationNote" VARCHAR(300),
    "publishedAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "createdByAdminUserId" UUID NOT NULL,
    "updatedByAdminUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "organization_needs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "volunteer_need_responses" (
    "id" UUID NOT NULL,
    "needId" UUID NOT NULL,
    "firstName" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(50),
    "email" VARCHAR(320),
    "note" VARCHAR(500),
    "status" "VolunteerNeedResponseStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "volunteer_need_responses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "organization_needs_organizationId_status_startsAt_idx" ON "organization_needs"("organizationId", "status", "startsAt");
CREATE INDEX "organization_needs_placeId_status_startsAt_idx" ON "organization_needs"("placeId", "status", "startsAt");
CREATE INDEX "organization_needs_status_type_endsAt_idx" ON "organization_needs"("status", "type", "endsAt");
CREATE INDEX "volunteer_need_responses_needId_status_createdAt_idx" ON "volunteer_need_responses"("needId", "status", "createdAt");
ALTER TABLE "organization_needs" ADD CONSTRAINT "organization_needs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organization_needs" ADD CONSTRAINT "organization_needs_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "organization_needs" ADD CONSTRAINT "organization_needs_createdByAdminUserId_fkey" FOREIGN KEY ("createdByAdminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organization_needs" ADD CONSTRAINT "organization_needs_updatedByAdminUserId_fkey" FOREIGN KEY ("updatedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "volunteer_need_responses" ADD CONSTRAINT "volunteer_need_responses_needId_fkey" FOREIGN KEY ("needId") REFERENCES "organization_needs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
