import test from "node:test";
import assert from "node:assert/strict";
import { assertProductionSnapshot, assertSafeTargetDatabaseUrl, sanitizeTransferRow } from "../src/lib/production-transfer.ts";

test("production transfer rejects local targets", () => {
  assert.throws(() => assertSafeTargetDatabaseUrl("postgresql://localhost:5432/mapa_dobra"), /local database/);
  assert.throws(() => assertSafeTargetDatabaseUrl("postgresql://127.0.0.1:5432/mapa_dobra"), /local database/);
  assert.doesNotThrow(() => assertSafeTargetDatabaseUrl("postgresql://user:pass@ep-example.neon.tech/neondb"));
});

test("production snapshot rejects DEMO/TEST and unverified published places", () => {
  const base = { version: 1, tables: { places: [{ recordKind: "PRODUCTION", publicationStatus: "DRAFT", verificationStatus: "UNVERIFIED" }] } };
  assert.doesNotThrow(() => assertProductionSnapshot(base));
  assert.throws(() => assertProductionSnapshot({ ...base, tables: { places: [{ recordKind: "DEMO", publicationStatus: "DRAFT", verificationStatus: "UNVERIFIED" }] } }), /non-production/);
  assert.throws(() => assertProductionSnapshot({ ...base, tables: { places: [{ recordKind: "PRODUCTION", publicationStatus: "PUBLISHED", verificationStatus: "UNVERIFIED" }] } }), /published place/);
});

test("production snapshot rejects credential fields", () => {
  assert.throws(() => assertProductionSnapshot({ version: 1, tables: { places: [{ recordKind: "PRODUCTION", publicationStatus: "DRAFT", verificationStatus: "UNVERIFIED" }], notes: [{ passwordHash: "not exported" }] } }), /forbidden data/);
});

test("admin foreign keys use the actual accommodation table columns", () => {
  const capacity = sanitizeTransferRow("accommodation_capacity_groups", { id: "capacity", updatedByAdminUserId: "local-admin", adminUserId: "wrong-column" });
  assert.equal(capacity.updatedByAdminUserId, null);
  assert.equal("adminUserId" in capacity, false);

  const history = sanitizeTransferRow("accommodation_availability_history", { id: "history", adminUserId: "local-admin", updatedByAdminUserId: "wrong-column" });
  assert.equal(history.adminUserId, null);
  assert.equal("updatedByAdminUserId" in history, false);
});
