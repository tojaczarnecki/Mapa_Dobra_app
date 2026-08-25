import "dotenv/config";
import pg from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { assertProductionSnapshot, assertSafeTargetDatabaseUrl, PRODUCTION_TRANSFER_TABLES, sanitizeTransferRow, TARGET_DATA_GUARD_TABLES } from "../src/lib/production-transfer";

type Row = Record<string, unknown>;
type Snapshot = { version: number; tables: Record<string, Row[]>; counts?: Record<string, number> };
const fileArgument = process.argv.find((argument) => argument.startsWith("--file="))?.slice("--file=".length);
const dryRun = process.argv.includes("--dry-run");
const write = process.argv.includes("--write");
if (!fileArgument) throw new Error("Use --file=/path/to/production-export.json.");
if (dryRun === write) throw new Error("Choose exactly one mode: --dry-run or --write.");
const targetValue = process.env.TARGET_DATABASE_URL;
if (!targetValue) throw new Error("TARGET_DATABASE_URL is required and DATABASE_URL is never used as the import target.");
const targetUrl = assertSafeTargetDatabaseUrl(targetValue);
const verificationAdminId = process.argv.find((argument) => argument.startsWith("--verification-admin-id="))?.slice("--verification-admin-id=".length);
const snapshot = JSON.parse(readFileSync(path.resolve(fileArgument), "utf8")) as Snapshot;
assertProductionSnapshot(snapshot);
const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;
const applicationDataTables = [...new Set(TARGET_DATA_GUARD_TABLES)];
const pool = new pg.Pool({ connectionString: targetUrl.toString() });
type Client = pg.PoolClient;

async function countRows(client: Client, table: string): Promise<number> {
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${quote(table)}`);
  return result.rows[0].count;
}

async function assertTargetIsEmpty(client: Client): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of applicationDataTables) counts[table] = await countRows(client, table);
  const nonEmpty = Object.entries(counts).filter(([table, count]) => count > 0 && table !== "admin_users");
  if (nonEmpty.length) throw new Error(`Target database is not empty: ${nonEmpty.map(([table, count]) => `${table}=${count}`).join(", ")}.`);
  return counts;
}

function insertSql(table: string, row: Row): { text: string; values: unknown[] } {
  const columns = Object.keys(row);
  return { text: `INSERT INTO ${quote(table)} (${columns.map(quote).join(", ")}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})`, values: columns.map((column) => row[column]) };
}

function transformedRow(table: string, row: Row, targetAdminId?: string): Row {
  const sanitized = sanitizeTransferRow(table, row);
  if (table === "place_verification_contacts") {
    if (!targetAdminId) throw new Error("The export contains verification contacts. Supply --verification-admin-id=<production admin UUID>.");
    return { ...sanitized, requiredByAdminUserId: targetAdminId };
  }
  return sanitized;
}

async function verifyIntegrity(client: Client, snapshotTables: Record<string, Row[]>): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of PRODUCTION_TRANSFER_TABLES) {
    counts[table] = await countRows(client, table);
    const expected = snapshotTables[table]?.length ?? 0;
    if (counts[table] !== expected) throw new Error(`Integrity count mismatch for ${table}: expected ${expected}, got ${counts[table]}.`);
  }
  for (const place of snapshotTables.places ?? []) {
    const result = await client.query(`SELECT "recordKind", "publicationStatus", "verificationStatus" FROM "places" WHERE "id" = $1`, [place.id]);
    const row = result.rows[0];
    if (!row || row.recordKind !== "PRODUCTION") throw new Error(`Integrity check failed for place ${String(place.id)}.`);
    if (place.publicationStatus === "PUBLISHED" && (row.publicationStatus !== "PUBLISHED" || row.verificationStatus !== "VERIFIED")) throw new Error(`Published status changed for place ${String(place.id)}.`);
  }
  return counts;
}

const client = await pool.connect();
try {
  const targetCounts = await assertTargetIsEmpty(client);
  if (verificationAdminId) {
    const admin = await client.query(`SELECT "id", "active" FROM "admin_users" WHERE "id" = $1`, [verificationAdminId]);
    if (!admin.rows[0]?.active) throw new Error("The verification admin must exist and be active in the target database.");
  }
  const report: Record<string, unknown> = { mode: dryRun ? "dry-run" : "write", target: "non-local PostgreSQL", targetCounts, snapshotCounts: snapshot.counts ?? Object.fromEntries(Object.entries(snapshot.tables).map(([table, rows]) => [table, rows.length])), verificationAdminRequired: (snapshot.tables.place_verification_contacts?.length ?? 0) > 0 };
  if (dryRun) {
    if (report.verificationAdminRequired && !verificationAdminId) report.nextStep = "Provide --verification-admin-id for the production admin before --write.";
    console.info(JSON.stringify(report, null, 2));
  } else {
    if ((snapshot.tables.place_verification_contacts?.length ?? 0) > 0 && !verificationAdminId) throw new Error("Refusing to write: verification contacts require an explicit production admin mapping.");
    await client.query("BEGIN");
    for (const table of PRODUCTION_TRANSFER_TABLES) for (const sourceRow of snapshot.tables[table] ?? []) await client.query(insertSql(table, transformedRow(table, sourceRow, verificationAdminId)));
    const counts = await verifyIntegrity(client, snapshot.tables);
    await client.query("COMMIT");
    console.info(JSON.stringify({ ...report, importedCounts: counts, transaction: "committed", draftsNotPublished: true }, null, 2));
  }
} catch (error) {
  if (write) await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally { client.release(); await pool.end(); }
