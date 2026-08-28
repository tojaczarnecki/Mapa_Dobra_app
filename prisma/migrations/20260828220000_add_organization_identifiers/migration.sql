ALTER TABLE "organizations"
  ADD COLUMN "nip" VARCHAR(10),
  ADD COLUMN "regon" VARCHAR(14),
  ADD COLUMN "krs" VARCHAR(10);

CREATE UNIQUE INDEX "organizations_nip_key" ON "organizations"("nip");
CREATE UNIQUE INDEX "organizations_regon_key" ON "organizations"("regon");
CREATE UNIQUE INDEX "organizations_krs_key" ON "organizations"("krs");
