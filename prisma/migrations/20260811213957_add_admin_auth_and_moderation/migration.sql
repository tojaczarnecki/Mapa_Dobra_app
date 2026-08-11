-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'STATUS_CHANGED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('ADMIN_USER', 'PLACE_UPDATE_SUBMISSION', 'NEW_PLACE_SUBMISSION');

-- AlterTable
ALTER TABLE "new_place_submissions" ADD COLUMN     "moderatedAt" TIMESTAMPTZ(3),
ADD COLUMN     "moderatedByAdminUserId" UUID,
ADD COLUMN     "moderatorNote" VARCHAR(2000),
ADD COLUMN     "rejectionReason" VARCHAR(1000);

-- AlterTable
ALTER TABLE "place_update_submissions" ADD COLUMN     "moderatedAt" TIMESTAMPTZ(3),
ADD COLUMN     "moderatedByAdminUserId" UUID,
ADD COLUMN     "moderatorNote" VARCHAR(2000),
ADD COLUMN     "rejectionReason" VARCHAR(1000);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(512) NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'MODERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "lastLoginAt" TIMESTAMPTZ(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "previousStatus" "ModerationStatus",
    "newStatus" "ModerationStatus",
    "note" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_active_idx" ON "admin_users"("active");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_tokenHash_key" ON "admin_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_sessions_adminUserId_idx" ON "admin_sessions"("adminUserId");

-- CreateIndex
CREATE INDEX "admin_sessions_expiresAt_idx" ON "admin_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_adminUserId_createdAt_idx" ON "audit_logs"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON "audit_logs"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_update_submissions" ADD CONSTRAINT "place_update_submissions_moderatedByAdminUserId_fkey" FOREIGN KEY ("moderatedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "new_place_submissions" ADD CONSTRAINT "new_place_submissions_moderatedByAdminUserId_fkey" FOREIGN KEY ("moderatedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
