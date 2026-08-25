export const PRODUCTION_TRANSFER_VERSION = 1;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

type TransferRow = Record<string, unknown>;

function without(row: TransferRow, ...keys: string[]): TransferRow {
  const excluded = new Set(keys);
  return Object.fromEntries(Object.entries(row).filter(([key]) => !excluded.has(key)));
}

/** Removes only admin foreign keys that cannot be carried without exporting admin accounts. */
export function sanitizeTransferRow(table: string, row: TransferRow): TransferRow {
  if (table === "places") return { ...row, verifiedByAdminUserId: null, lastEditedByAdminUserId: null };
  if (table === "import_candidates") return { ...row, resolvedByAdminUserId: null };
  if (table === "accommodation_capacity_groups") {
    return { ...without(row, "adminUserId", "resolvedByAdminUserId", "contactedByAdminUserId"), updatedByAdminUserId: null };
  }
  if (table === "accommodation_availability_history") {
    return { ...without(row, "updatedByAdminUserId", "resolvedByAdminUserId", "contactedByAdminUserId"), adminUserId: null };
  }
  if (table === "place_verification_contacts") return { ...row, contactedByAdminUserId: null };
  return row;
}

export function assertSafeTargetDatabaseUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("TARGET_DATABASE_URL must be a valid PostgreSQL connection string."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("TARGET_DATABASE_URL must use the PostgreSQL protocol.");
  if (LOCAL_HOSTS.has(url.hostname.toLowerCase()) || url.hostname.endsWith(".local")) throw new Error("Import target cannot be a local database.");
  return url;
}

export function assertProductionSnapshot(snapshot: unknown): asserts snapshot is {
  version: number;
  tables: Record<string, Array<Record<string, unknown>>>;
} {
  if (!snapshot || typeof snapshot !== "object") throw new Error("Invalid production snapshot.");
  const candidate = snapshot as { version?: unknown; tables?: unknown };
  if (candidate.version !== PRODUCTION_TRANSFER_VERSION || !candidate.tables || typeof candidate.tables !== "object") throw new Error("Unsupported or malformed production snapshot.");
  const places = (candidate.tables as Record<string, unknown>).places;
  if (!Array.isArray(places)) throw new Error("Production snapshot is missing places.");
  for (const place of places) {
    if (!place || typeof place !== "object") throw new Error("Production snapshot contains an invalid place.");
    const row = place as Record<string, unknown>;
    if (row.recordKind !== "PRODUCTION") throw new Error("Snapshot contains a non-production place.");
    if (row.publicationStatus === "PUBLISHED" && row.verificationStatus !== "VERIFIED") throw new Error("A published place must remain verified during transfer.");
  }
  const serialized = JSON.stringify(snapshot);
  for (const forbidden of ["passwordHash", "admin_sessions", "admin_access_tokens", "sessionToken", "resetToken"]) {
    if (serialized.includes(forbidden)) throw new Error(`Snapshot contains forbidden data: ${forbidden}.`);
  }
}

export const PRODUCTION_TRANSFER_TABLES = [
  "organizations", "categories", "places", "place_categories", "opening_hours", "place_requirements", "place_accessibility",
  "accommodation_details", "accommodation_capacity_groups", "accommodation_availability_history", "place_verification_contacts",
  "import_batches", "import_source_entries", "import_candidates", "import_candidate_sources",
] as const;

export const TARGET_DATA_GUARD_TABLES = [
  ...PRODUCTION_TRANSFER_TABLES, "place_update_submissions", "new_place_submissions", "submission_drafts", "audit_logs", "admin_sessions", "admin_access_tokens",
] as const;
