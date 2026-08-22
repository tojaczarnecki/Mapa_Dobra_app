import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");
if (!process.argv.includes("--dry-run")) {
  throw new Error("This first-stage command is report-only. Run it with --dry-run; export is enabled after review.");
}

const pool = new pg.Pool({ connectionString });
try {
  const result = await pool.query(`
    WITH production_places AS (
      SELECT "id" FROM "places" WHERE "recordKind" = 'PRODUCTION'::"PlaceRecordKind"
    )
    SELECT
      (SELECT COUNT(*)::int FROM production_places) AS production_places,
      (SELECT COUNT(*)::int FROM "places" p WHERE p."recordKind" = 'PRODUCTION'::"PlaceRecordKind" AND p."publicationStatus" = 'PUBLISHED'::"PlacePublicationStatus") AS published_places,
      (SELECT COUNT(*)::int FROM "places" p WHERE p."recordKind" = 'PRODUCTION'::"PlaceRecordKind" AND p."publicationStatus" = 'DRAFT'::"PlacePublicationStatus") AS draft_places,
      (SELECT COUNT(DISTINCT p."organizationId")::int FROM "places" p WHERE p."recordKind" = 'PRODUCTION'::"PlaceRecordKind" AND p."organizationId" IS NOT NULL) AS organizations,
      (SELECT COUNT(DISTINCT pc."categoryId")::int FROM "place_categories" pc JOIN production_places pp ON pp."id" = pc."placeId") AS categories,
      (SELECT COUNT(*)::int FROM "opening_hours" oh JOIN production_places pp ON pp."id" = oh."placeId") AS opening_hours,
      (SELECT COUNT(*)::int FROM "accommodation_details" a JOIN production_places pp ON pp."id" = a."placeId") AS accommodations,
      (SELECT COUNT(*)::int FROM "accommodation_capacity_groups" cg JOIN "accommodation_details" a ON a."id" = cg."accommodationDetailsId" JOIN production_places pp ON pp."id" = a."placeId") AS capacity_groups,
      (SELECT COUNT(*)::int FROM "place_verification_contacts" vc JOIN production_places pp ON pp."id" = vc."placeId") AS verification_contacts
  `);
  console.info(JSON.stringify({ mode: "dry-run", source: "local PostgreSQL", exportable: result.rows[0], excludes: ["DEMO", "TEST", "passwordHash", "sessions", "tokens", "local test AuditLog"] }, null, 2));
} finally {
  await pool.end();
}
