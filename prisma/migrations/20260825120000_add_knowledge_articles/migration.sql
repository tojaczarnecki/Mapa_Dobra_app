ALTER TYPE "AdminPermission" ADD VALUE 'VIEW_KNOWLEDGE';
ALTER TYPE "AdminPermission" ADD VALUE 'MANAGE_KNOWLEDGE';
ALTER TYPE "AuditAction" ADD VALUE 'KNOWLEDGE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'KNOWLEDGE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'KNOWLEDGE_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'KNOWLEDGE_ARCHIVED';
ALTER TYPE "AuditEntityType" ADD VALUE 'KNOWLEDGE_ARTICLE';

CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "KnowledgeContentType" AS ENUM ('GUIDE', 'HOW_TO', 'EXPLAINER', 'CHECKLIST', 'FAQ', 'GOOD_PRACTICE', 'CASE_STUDY', 'PARTNER_CONTENT', 'ANNOUNCEMENT');
CREATE TYPE "KnowledgeIntent" AS ENUM ('NEED_HELP', 'HELP_SOMEONE', 'GOOD_PRACTICES', 'VOLUNTEERING', 'ORGANIZATIONS');

CREATE TABLE "knowledge_articles" (
  "id" UUID NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "slug" VARCHAR(240) NOT NULL,
  "excerpt" VARCHAR(600) NOT NULL,
  "content" TEXT NOT NULL,
  "status" "KnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
  "contentType" "KnowledgeContentType" NOT NULL DEFAULT 'GUIDE',
  "intent" "KnowledgeIntent" NOT NULL DEFAULT 'NEED_HELP',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "seoTitle" VARCHAR(240),
  "seoDescription" VARCHAR(320),
  "authorDisplayName" VARCHAR(160),
  "readingTime" INTEGER,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "important" BOOLEAN NOT NULL DEFAULT false,
  "partnerContent" BOOLEAN NOT NULL DEFAULT false,
  "partnerName" VARCHAR(240),
  "partnerDisclosure" VARCHAR(500),
  "geographicScope" VARCHAR(160),
  "emergencyNote" VARCHAR(500),
  "notificationEligible" BOOLEAN NOT NULL DEFAULT false,
  "notificationCategory" VARCHAR(120),
  "publishedAt" TIMESTAMPTZ(3),
  "reviewedAt" TIMESTAMPTZ(3),
  "reviewDueAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "knowledge_articles_slug_key" ON "knowledge_articles"("slug");
CREATE INDEX "knowledge_articles_status_featured_publishedAt_idx" ON "knowledge_articles"("status", "featured", "publishedAt");
CREATE INDEX "knowledge_articles_intent_status_idx" ON "knowledge_articles"("intent", "status");

CREATE TABLE "knowledge_article_categories" (
  "articleId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  CONSTRAINT "knowledge_article_categories_pkey" PRIMARY KEY ("articleId", "categoryId"),
  CONSTRAINT "knowledge_article_categories_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "knowledge_article_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "knowledge_article_places" (
  "articleId" UUID NOT NULL,
  "placeId" UUID NOT NULL,
  CONSTRAINT "knowledge_article_places_pkey" PRIMARY KEY ("articleId", "placeId"),
  CONSTRAINT "knowledge_article_places_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "knowledge_article_places_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "knowledge_article_relations" (
  "articleId" UUID NOT NULL,
  "relatedArticleId" UUID NOT NULL,
  CONSTRAINT "knowledge_article_relations_pkey" PRIMARY KEY ("articleId", "relatedArticleId"),
  CONSTRAINT "knowledge_article_relations_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "knowledge_article_relations_relatedArticleId_fkey" FOREIGN KEY ("relatedArticleId") REFERENCES "knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
