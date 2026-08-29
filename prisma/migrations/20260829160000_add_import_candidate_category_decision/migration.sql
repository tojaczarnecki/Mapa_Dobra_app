CREATE TABLE "import_candidate_category_decisions" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "primaryCategoryId" UUID NOT NULL,
    "resolvedByAdminUserId" UUID NOT NULL,
    "resolvedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" VARCHAR(1000),

    CONSTRAINT "import_cat_decisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "import_cat_decisions_candidate_key" ON "import_candidate_category_decisions"("candidateId");
CREATE INDEX "import_cat_decisions_primary_idx" ON "import_candidate_category_decisions"("primaryCategoryId");
CREATE INDEX "import_cat_decisions_resolver_idx" ON "import_candidate_category_decisions"("resolvedByAdminUserId");

ALTER TABLE "import_candidate_category_decisions" ADD CONSTRAINT "import_cat_decisions_candidate_fkey" FOREIGN KEY ("candidateId") REFERENCES "import_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_candidate_category_decisions" ADD CONSTRAINT "import_cat_decisions_primary_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_candidate_category_decisions" ADD CONSTRAINT "import_cat_decisions_resolver_fkey" FOREIGN KEY ("resolvedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "import_candidate_category_decision_categories" (
    "decisionId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "import_cat_decision_categories_pkey" PRIMARY KEY ("decisionId", "categoryId")
);

CREATE INDEX "import_cat_decision_categories_category_idx" ON "import_candidate_category_decision_categories"("categoryId");

ALTER TABLE "import_candidate_category_decision_categories" ADD CONSTRAINT "import_cat_decision_categories_decision_fkey" FOREIGN KEY ("decisionId") REFERENCES "import_candidate_category_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_candidate_category_decision_categories" ADD CONSTRAINT "import_cat_decision_categories_category_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
