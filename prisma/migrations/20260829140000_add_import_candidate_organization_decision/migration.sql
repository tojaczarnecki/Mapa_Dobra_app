CREATE TYPE "ImportCandidateOrganizationDecisionType" AS ENUM ('SELECTED_ORGANIZATION', 'NO_ORGANIZATION');

CREATE TABLE "import_candidate_organization_decisions" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "decision" "ImportCandidateOrganizationDecisionType" NOT NULL,
    "organizationId" UUID,
    "resolvedByAdminUserId" UUID NOT NULL,
    "resolvedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" VARCHAR(1000),

    CONSTRAINT "import_org_decisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "import_org_decisions_decision_org_check" CHECK (
      ("decision" = 'SELECTED_ORGANIZATION' AND "organizationId" IS NOT NULL)
      OR ("decision" = 'NO_ORGANIZATION' AND "organizationId" IS NULL)
    )
);

CREATE UNIQUE INDEX "import_org_decisions_candidate_key" ON "import_candidate_organization_decisions"("candidateId");
CREATE INDEX "import_org_decisions_org_idx" ON "import_candidate_organization_decisions"("organizationId");
CREATE INDEX "import_org_decisions_resolver_idx" ON "import_candidate_organization_decisions"("resolvedByAdminUserId");

ALTER TABLE "import_candidate_organization_decisions" ADD CONSTRAINT "import_org_decisions_candidate_fkey" FOREIGN KEY ("candidateId") REFERENCES "import_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_candidate_organization_decisions" ADD CONSTRAINT "import_org_decisions_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_candidate_organization_decisions" ADD CONSTRAINT "import_org_decisions_resolver_fkey" FOREIGN KEY ("resolvedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
