import "dotenv/config";
import pg from "pg";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PRODUCTION_TRANSFER_VERSION, sanitizeTransferRow } from "../src/lib/production-transfer";

type Row = Record<string, unknown>;
type Snapshot = { version: number; createdAt: string; source: { database: "local"; description: string }; tables: Record<string, Row[]>; counts: Record<string, number> };
const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl) throw new Error("DATABASE_URL is required for the local source database.");
const dryRun = process.argv.includes("--dry-run");
const writeSnapshot = process.argv.includes("--write");
if (!dryRun && !writeSnapshot) throw new Error("Use --dry-run or --write. No database import is performed by this command.");
const outputArgument = process.argv.find((argument) => argument.startsWith("--output="))?.slice("--output=".length);
const pool = new pg.Pool({ connectionString: sourceUrl });
type Client = pg.PoolClient;
const ids = (rows: Row[], key: string) => rows.map((row) => row[key]).filter((value): value is string => typeof value === "string");
const unique = (values: string[]) => [...new Set(values)];
const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

async function selectByIds(client: Client, table: string, column: string, values: string[]): Promise<Row[]> {
  if (!values.length) return [];
  return (await client.query(`SELECT * FROM ${quote(table)} WHERE ${quote(column)} = ANY($1::uuid[])`, [values])).rows;
}


async function buildSnapshot(): Promise<Snapshot> {
  const client = await pool.connect();
  try {
    const places = (await client.query(`SELECT * FROM "places" WHERE "recordKind" = 'PRODUCTION'::"PlaceRecordKind"`)).rows.map((row) => sanitizeTransferRow("places", row));
    const placeIds = ids(places, "id");
    const placeCategories = await selectByIds(client, "place_categories", "placeId", placeIds);
    const categoryIds = unique([...ids(placeCategories, "categoryId"), ...places.map((row) => row.primaryCategoryId).filter((value): value is string => typeof value === "string")]);
    const organizationIds = unique(ids(places, "organizationId"));
    const organizations = await selectByIds(client, "organizations", "id", organizationIds);
    const categories = await selectByIds(client, "categories", "id", categoryIds);
    const openingHours = await selectByIds(client, "opening_hours", "placeId", placeIds);
    const requirements = await selectByIds(client, "place_requirements", "placeId", placeIds);
    const accessibility = await selectByIds(client, "place_accessibility", "placeId", placeIds);
    const accommodations = await selectByIds(client, "accommodation_details", "placeId", placeIds);
    const accommodationIds = ids(accommodations, "id");
    const capacityGroups = await selectByIds(client, "accommodation_capacity_groups", "accommodationDetailsId", accommodationIds);
    const availabilityHistory = await selectByIds(client, "accommodation_availability_history", "accommodationDetailsId", accommodationIds);
    const verificationContacts = await selectByIds(client, "place_verification_contacts", "placeId", placeIds);
    const productionCandidates = (await client.query(`SELECT "importBatchId" FROM "import_candidates" WHERE "createdPlaceId" = ANY($1::uuid[]) OR "matchedPlaceId" = ANY($1::uuid[])`, [placeIds])).rows;
    const batchIds = unique(ids(productionCandidates, "importBatchId"));
    // Once a batch is needed for a production place, keep its full review queue.
    // This preserves unresolved candidates and their source pages without creating Places for them.
    const candidates = (batchIds.length ? (await client.query(`SELECT * FROM "import_candidates" WHERE "importBatchId" = ANY($1::uuid[])`, [batchIds])).rows : []).map((row) => ({ ...row, resolvedByAdminUserId: null }));
    const candidateIds = ids(candidates, "id");
    const candidateSources = await selectByIds(client, "import_candidate_sources", "importCandidateId", candidateIds);
    const sourceEntries = batchIds.length ? (await client.query(`SELECT * FROM "import_source_entries" WHERE "importBatchId" = ANY($1::uuid[])`, [batchIds])).rows : [];
    const importBatches = await selectByIds(client, "import_batches", "id", batchIds);
    const tables: Record<string, Row[]> = {
      organizations, categories, places, place_categories: placeCategories, opening_hours: openingHours,
      place_requirements: requirements, place_accessibility: accessibility, accommodation_details: accommodations,
      accommodation_capacity_groups: capacityGroups.map((row) => sanitizeTransferRow("accommodation_capacity_groups", row)),
      accommodation_availability_history: availabilityHistory.map((row) => sanitizeTransferRow("accommodation_availability_history", row)),
      // requiredByAdminUserId is retained as provenance metadata and mapped explicitly at import time.
      place_verification_contacts: verificationContacts, import_batches: importBatches,
      import_source_entries: sourceEntries, import_candidates: candidates, import_candidate_sources: candidateSources,
    };
    return { version: PRODUCTION_TRANSFER_VERSION, createdAt: new Date().toISOString(), source: { database: "local", description: "Production-only export from local PostgreSQL" }, tables, counts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])) };
  } finally { client.release(); }
}

try {
  const snapshot = await buildSnapshot();
  console.info(JSON.stringify({ mode: dryRun ? "dry-run" : "write-snapshot", counts: snapshot.counts, excluded: ["DEMO", "TEST", "AdminUser", "passwordHash", "sessions", "access tokens", "AuditLog"] }, null, 2));
  if (writeSnapshot) {
    const output = path.resolve(outputArgument ?? `backups/production-export-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}.json`);
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    console.info(`Snapshot written: ${output}`);
  }
} finally { await pool.end(); }
