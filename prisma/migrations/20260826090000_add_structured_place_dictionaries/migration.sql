-- Batch 7: additive dictionary relations and organization registry fields.
-- Legacy labels/arrays remain available for rollback and old import payloads.
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'TIKTOK', 'OTHER');

CREATE TABLE "requirement_definitions" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "label" VARCHAR(240) NOT NULL,
  "description" VARCHAR(1000),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "systemKey" VARCHAR(80),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "requirement_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "requirement_definitions_slug_key" ON "requirement_definitions"("slug");
CREATE UNIQUE INDEX "requirement_definitions_systemKey_key" ON "requirement_definitions"("systemKey");
CREATE INDEX "requirement_definitions_active_sortOrder_idx" ON "requirement_definitions"("active", "sortOrder");

CREATE TABLE "accessibility_definitions" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "label" VARCHAR(240) NOT NULL,
  "description" VARCHAR(1000),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "systemKey" VARCHAR(80),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "accessibility_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "accessibility_definitions_slug_key" ON "accessibility_definitions"("slug");
CREATE UNIQUE INDEX "accessibility_definitions_systemKey_key" ON "accessibility_definitions"("systemKey");
CREATE INDEX "accessibility_definitions_active_sortOrder_idx" ON "accessibility_definitions"("active", "sortOrder");

CREATE TABLE "audience_definitions" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "label" VARCHAR(240) NOT NULL,
  "description" VARCHAR(1000),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "systemKey" VARCHAR(80),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "audience_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "audience_definitions_slug_key" ON "audience_definitions"("slug");
CREATE UNIQUE INDEX "audience_definitions_systemKey_key" ON "audience_definitions"("systemKey");
CREATE INDEX "audience_definitions_active_sortOrder_idx" ON "audience_definitions"("active", "sortOrder");

ALTER TABLE "place_requirements" ADD COLUMN "definitionId" UUID;
ALTER TABLE "place_accessibility" ADD COLUMN "definitionId" UUID;
CREATE TABLE "place_audience" (
  "placeId" UUID NOT NULL,
  "definitionId" UUID NOT NULL,
  CONSTRAINT "place_audience_pkey" PRIMARY KEY ("placeId", "definitionId")
);
CREATE INDEX "place_audience_definitionId_idx" ON "place_audience"("definitionId");

CREATE TABLE "place_social_links" (
  "id" UUID NOT NULL,
  "placeId" UUID NOT NULL,
  "platform" "SocialPlatform" NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "label" VARCHAR(160),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "place_social_links_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "place_social_links_placeId_platform_key" ON "place_social_links"("placeId", "platform");
CREATE INDEX "place_social_links_placeId_sortOrder_idx" ON "place_social_links"("placeId", "sortOrder");

ALTER TABLE "organizations" ADD COLUMN "nip" VARCHAR(10);
ALTER TABLE "organizations" ADD COLUMN "regon" VARCHAR(14);
ALTER TABLE "organizations" ADD COLUMN "krs" VARCHAR(10);
ALTER TABLE "organizations" ADD COLUMN "legalForm" VARCHAR(160);

INSERT INTO "requirement_definitions" ("id", "slug", "label", "sortOrder", "systemKey", "updatedAt") VALUES
  (gen_random_uuid(), 'referral', 'Skierowanie', 10, 'REFERRAL', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'document', 'Dokument tożsamości', 20, 'DOCUMENT', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'fee', 'Opłata', 30, 'FEE', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'lodz-registration', 'Meldunek w Łodzi', 40, 'LODZ_REGISTRATION', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'appointment', 'Wizyta umówiona', 50, 'APPOINTMENT', CURRENT_TIMESTAMP);
INSERT INTO "accessibility_definitions" ("id", "slug", "label", "sortOrder", "systemKey", "updatedAt") VALUES
  (gen_random_uuid(), 'step-free-entrance', 'Wejście bez schodów', 10, 'STEP_FREE_ENTRANCE', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'ramp', 'Podjazd', 20, 'RAMP', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'elevator', 'Winda', 30, 'ELEVATOR', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'accessible-toilet', 'Dostępna toaleta', 40, 'ACCESSIBLE_TOILET', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'accessible-shower', 'Dostępny prysznic', 50, 'ACCESSIBLE_SHOWER', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'wheelchair-place', 'Miejsce dla osoby na wózku', 60, 'WHEELCHAIR_PLACE', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'assistance-dog', 'Pies asystujący', 70, 'ASSISTANCE_DOG', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'care-services', 'Usługi opiekuńcze', 80, 'CARE_SERVICES', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'stay-with-assistant', 'Pobyt z asystentem', 90, 'STAY_WITH_ASSISTANT', CURRENT_TIMESTAMP);

UPDATE "place_requirements" AS row
SET "definitionId" = definition."id"
FROM "requirement_definitions" AS definition
WHERE definition."systemKey" = row."kind"::text;
UPDATE "place_accessibility" AS row
SET "definitionId" = definition."id"
FROM "accessibility_definitions" AS definition
WHERE definition."systemKey" = row."feature"::text;

-- Preserve custom OTHER values by reusing one normalized definition per label.
INSERT INTO "requirement_definitions" ("id", "slug", "label", "sortOrder", "updatedAt")
SELECT gen_random_uuid(), 'custom-requirement-' || md5(normalized), min(label), 100, CURRENT_TIMESTAMP
FROM (
  SELECT lower(regexp_replace(trim("label"), '\\s+', ' ', 'g')) AS normalized, min(trim("label")) AS label
  FROM "place_requirements" WHERE "kind" = 'OTHER' AND trim("label") <> '' GROUP BY 1
) values_to_add
WHERE NOT EXISTS (SELECT 1 FROM "requirement_definitions" d WHERE d."slug" = 'custom-requirement-' || md5(normalized));
UPDATE "place_requirements" AS row
SET "definitionId" = definition."id"
FROM "requirement_definitions" AS definition
WHERE row."kind" = 'OTHER' AND definition."slug" = 'custom-requirement-' || md5(lower(regexp_replace(trim(row."label"), '\\s+', ' ', 'g')));

INSERT INTO "accessibility_definitions" ("id", "slug", "label", "sortOrder", "updatedAt")
SELECT gen_random_uuid(), 'custom-accessibility-' || md5(normalized), min(label), 100, CURRENT_TIMESTAMP
FROM (
  SELECT lower(regexp_replace(trim("label"), '\\s+', ' ', 'g')) AS normalized, min(trim("label")) AS label
  FROM "place_accessibility" WHERE "feature" = 'OTHER' AND trim("label") <> '' GROUP BY 1
) values_to_add
WHERE NOT EXISTS (SELECT 1 FROM "accessibility_definitions" d WHERE d."slug" = 'custom-accessibility-' || md5(normalized));
UPDATE "place_accessibility" AS row
SET "definitionId" = definition."id"
FROM "accessibility_definitions" AS definition
WHERE row."feature" = 'OTHER' AND definition."slug" = 'custom-accessibility-' || md5(lower(regexp_replace(trim(row."label"), '\\s+', ' ', 'g')));

-- Audience remains available as a legacy array while common values gain relations.
INSERT INTO "audience_definitions" ("id", "slug", "label", "sortOrder", "updatedAt")
SELECT gen_random_uuid(), 'audience-' || md5(normalized), min(label), 100, CURRENT_TIMESTAMP
FROM (
  SELECT lower(regexp_replace(trim(value), '\\s+', ' ', 'g')) AS normalized, min(trim(value)) AS label
  FROM "places", unnest("audience") AS value WHERE trim(value) <> '' GROUP BY 1
) values_to_add
WHERE NOT EXISTS (SELECT 1 FROM "audience_definitions" d WHERE d."slug" = 'audience-' || md5(normalized));
INSERT INTO "place_audience" ("placeId", "definitionId")
SELECT place."id", definition."id"
FROM "places" AS place
CROSS JOIN LATERAL unnest(place."audience") AS value
JOIN "audience_definitions" AS definition ON definition."slug" = 'audience-' || md5(lower(regexp_replace(trim(value), '\\s+', ' ', 'g')))
WHERE trim(value) <> ''
ON CONFLICT DO NOTHING;

INSERT INTO "place_social_links" ("id", "placeId", "platform", "url", "sortOrder", "updatedAt")
SELECT gen_random_uuid(), "id",
  CASE
    WHEN lower("socialMedia") LIKE '%facebook.%' THEN 'FACEBOOK'::"SocialPlatform"
    WHEN lower("socialMedia") LIKE '%instagram.%' THEN 'INSTAGRAM'::"SocialPlatform"
    WHEN lower("socialMedia") LIKE '%linkedin.%' THEN 'LINKEDIN'::"SocialPlatform"
    WHEN lower("socialMedia") LIKE '%youtube.%' OR lower("socialMedia") LIKE '%youtu.be/%' THEN 'YOUTUBE'::"SocialPlatform"
    WHEN lower("socialMedia") LIKE '%tiktok.%' THEN 'TIKTOK'::"SocialPlatform"
    ELSE 'OTHER'::"SocialPlatform"
  END,
  CASE WHEN lower(trim("socialMedia")) LIKE 'http://%' OR lower(trim("socialMedia")) LIKE 'https://%' THEN trim("socialMedia") ELSE 'https://' || trim("socialMedia") END,
  0, CURRENT_TIMESTAMP
FROM "places"
WHERE "socialMedia" IS NOT NULL AND trim("socialMedia") <> '';

ALTER TABLE "place_requirements" ADD CONSTRAINT "place_requirements_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "requirement_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "place_accessibility" ADD CONSTRAINT "place_accessibility_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "accessibility_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "place_audience" ADD CONSTRAINT "place_audience_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "place_audience" ADD CONSTRAINT "place_audience_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "audience_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "place_social_links" ADD CONSTRAINT "place_social_links_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
