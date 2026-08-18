-- CreateEnum
CREATE TYPE "AdminPermission" AS ENUM ('VIEW_DASHBOARD', 'VIEW_PLACES', 'CREATE_PLACES', 'EDIT_PLACES', 'VERIFY_PLACES', 'PUBLISH_PLACES', 'CHANGE_PLACE_STATUS', 'UPDATE_BED_AVAILABILITY', 'UPDATE_ADMISSION_STATUS', 'UPDATE_ADMISSION_HOURS', 'UPDATE_PLACE_CONTACT', 'MODERATE_SUBMISSIONS', 'PUBLISH_SUBMISSIONS', 'VIEW_ORGANIZATIONS', 'MANAGE_ORGANIZATIONS', 'VIEW_CATEGORIES', 'MANAGE_CATEGORIES', 'VIEW_IMPORTS', 'MANAGE_IMPORTS', 'VIEW_AUDIT_LOG', 'MANAGE_USERS', 'MANAGE_USER_PERMISSIONS');

-- CreateEnum
CREATE TYPE "AdminPermissionEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "AdminTokenPurpose" AS ENUM ('INVITATION', 'PASSWORD_RESET');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminRole" ADD VALUE 'PLACE_MANAGER';
ALTER TYPE "AdminRole" ADD VALUE 'VIEWER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'USER_INVITED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_ROLE_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_PERMISSIONS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_PLACE_ACCESS_GRANTED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_PLACE_ACCESS_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_REACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_SESSIONS_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_RESET_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_RESET_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'BED_AVAILABILITY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'ADMISSION_STATUS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'ADMISSION_HOURS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PLACE_CONTACT_UPDATED';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'USER_PLACE_ACCESS';

-- AlterEnum
ALTER TYPE "ChangeOrigin" ADD VALUE 'FACILITY_REPRESENTATIVE';

-- AlterTable
ALTER TABLE "admin_users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "admin_user_permissions" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "permission" "AdminPermission" NOT NULL,
    "effect" "AdminPermissionEffect" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_place_access" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "permissions" "AdminPermission"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByAdminId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_place_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_access_tokens" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "purpose" "AdminTokenPurpose" NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "createdByAdminId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_user_permissions_permission_effect_idx" ON "admin_user_permissions"("permission", "effect");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_permissions_adminUserId_permission_key" ON "admin_user_permissions"("adminUserId", "permission");

-- CreateIndex
CREATE INDEX "user_place_access_placeId_active_idx" ON "user_place_access"("placeId", "active");

-- CreateIndex
CREATE INDEX "user_place_access_adminUserId_active_idx" ON "user_place_access"("adminUserId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "user_place_access_adminUserId_placeId_key" ON "user_place_access"("adminUserId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_access_tokens_tokenHash_key" ON "admin_access_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_access_tokens_adminUserId_purpose_expiresAt_idx" ON "admin_access_tokens"("adminUserId", "purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "admin_access_tokens_purpose_expiresAt_usedAt_idx" ON "admin_access_tokens"("purpose", "expiresAt", "usedAt");

-- AddForeignKey
ALTER TABLE "admin_user_permissions" ADD CONSTRAINT "admin_user_permissions_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_place_access" ADD CONSTRAINT "user_place_access_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_place_access" ADD CONSTRAINT "user_place_access_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_place_access" ADD CONSTRAINT "user_place_access_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_access_tokens" ADD CONSTRAINT "admin_access_tokens_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_access_tokens" ADD CONSTRAINT "admin_access_tokens_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
