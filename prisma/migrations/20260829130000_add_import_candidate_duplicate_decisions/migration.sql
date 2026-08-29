CREATE TYPE "ImportCandidateDuplicateDecisionType" AS ENUM ('KEEP_A', 'KEEP_B', 'DIFFERENT_RECORDS');

CREATE TABLE "import_candidate_duplicate_decisions" (
    "id" UUID NOT NULL,
    "candidateAId" UUID NOT NULL,
    "candidateBId" UUID NOT NULL,
    "decision" "ImportCandidateDuplicateDecisionType" NOT NULL,
    "resolvedByAdminUserId" UUID NOT NULL,
    "resolvedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" VARCHAR(1000),

    CONSTRAINT "import_candidate_duplicate_decisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "import_candidate_duplicate_decisions_canonical_pair_check" CHECK ("candidateAId" < "candidateBId")
);

CREATE UNIQUE INDEX "import_candidate_duplicate_decisions_candidateAId_candidateBId_key" ON "import_candidate_duplicate_decisions"("candidateAId", "candidateBId");
CREATE INDEX "import_candidate_duplicate_decisions_candidateAId_idx" ON "import_candidate_duplicate_decisions"("candidateAId");
CREATE INDEX "import_candidate_duplicate_decisions_candidateBId_idx" ON "import_candidate_duplicate_decisions"("candidateBId");
CREATE INDEX "import_candidate_duplicate_decisions_resolvedByAdminUserId_idx" ON "import_candidate_duplicate_decisions"("resolvedByAdminUserId");

ALTER TABLE "import_candidate_duplicate_decisions" ADD CONSTRAINT "import_candidate_duplicate_decisions_candidateAId_fkey" FOREIGN KEY ("candidateAId") REFERENCES "import_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_candidate_duplicate_decisions" ADD CONSTRAINT "import_candidate_duplicate_decisions_candidateBId_fkey" FOREIGN KEY ("candidateBId") REFERENCES "import_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_candidate_duplicate_decisions" ADD CONSTRAINT "import_candidate_duplicate_decisions_resolvedByAdminUserId_fkey" FOREIGN KEY ("resolvedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
