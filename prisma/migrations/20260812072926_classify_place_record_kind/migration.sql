-- CreateEnum
CREATE TYPE "PlaceRecordKind" AS ENUM ('PRODUCTION', 'DEMO', 'TEST');

-- DropIndex
DROP INDEX "places_publicationStatus_city_idx";

-- AlterTable
ALTER TABLE "places" ADD COLUMN     "recordKind" "PlaceRecordKind" NOT NULL DEFAULT 'PRODUCTION';

-- Preserve the established provenance of imported demo records.
UPDATE "places"
SET "recordKind" = 'DEMO'
WHERE "isDemo" = true;

-- These stable IDs belong to the five retained admin/workflow test records.
UPDATE "places"
SET "recordKind" = 'TEST'
WHERE "id" IN (
  '9a7a20d6-f2d9-4793-b829-08487b9cc23d',
  '138e8f7e-b0c8-4374-9777-e6aa5ceb693a',
  '0db0e183-adc6-41f4-9b03-0970f3d0d514',
  '67aacbab-88c8-40ec-86fe-ef9a1bb0a4b8',
  '132ac92a-8dd0-4a62-b856-7adca2be93b2'
);

-- CreateIndex
CREATE INDEX "places_recordKind_publicationStatus_city_idx" ON "places"("recordKind", "publicationStatus", "city");
