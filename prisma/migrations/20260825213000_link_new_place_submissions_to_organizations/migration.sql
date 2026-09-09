ALTER TABLE "new_place_submissions"
ADD COLUMN "organizationId" UUID;

CREATE INDEX "new_place_submissions_organizationId_idx"
ON "new_place_submissions"("organizationId");

ALTER TABLE "new_place_submissions"
ADD CONSTRAINT "new_place_submissions_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
