-- Prepared for review. Do not apply automatically to a shared database.
CREATE TYPE "SystemMode" AS ENUM ('NORMAL', 'READ_ONLY', 'MAINTENANCE');
CREATE TYPE "PublicNoticeLevel" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

ALTER TYPE "AdminPermission" ADD VALUE 'VIEW_SYSTEM_SETTINGS';
ALTER TYPE "AdminPermission" ADD VALUE 'MANAGE_SYSTEM_SETTINGS';

ALTER TYPE "AuditAction" ADD VALUE 'SYSTEM_MODE_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'SYSTEM_SETTINGS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PUBLIC_NOTICE_UPDATED';
ALTER TYPE "AuditEntityType" ADD VALUE 'SYSTEM_SETTINGS';

CREATE TABLE "system_settings" (
  "id" VARCHAR(32) NOT NULL DEFAULT 'singleton',
  "mode" "SystemMode" NOT NULL DEFAULT 'NORMAL',
  "maintenanceTitle" VARCHAR(200),
  "maintenanceMessage" VARCHAR(2000),
  "noticeEnabled" BOOLEAN NOT NULL DEFAULT false,
  "noticeText" VARCHAR(1000),
  "noticeLevel" "PublicNoticeLevel" NOT NULL DEFAULT 'INFO',
  "noticeDismissible" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedByAdminId" UUID,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
