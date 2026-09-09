ALTER TABLE "import_batches"
  ADD COLUMN "fileName" VARCHAR(255),
  ADD COLUMN "fileFormat" VARCHAR(12),
  ADD COLUMN "sheetName" VARCHAR(255),
  ADD COLUMN "uploadedByAdminUserId" UUID;

ALTER TYPE "AuditAction" ADD VALUE 'IMPORT_MAPPING_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'IMPORT_STARTED';
ALTER TYPE "AuditEntityType" ADD VALUE 'IMPORT_BATCH';

ALTER TABLE "import_batches"
  ADD CONSTRAINT "import_batches_uploadedByAdminUserId_fkey"
  FOREIGN KEY ("uploadedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "import_batches_uploadedByAdminUserId_createdAt_idx"
  ON "import_batches"("uploadedByAdminUserId", "createdAt");
