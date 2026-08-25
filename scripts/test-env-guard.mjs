import assert from "node:assert/strict";

export function requireIsolatedTestDatabase() {
  const testUrl = process.env.TEST_DATABASE_URL;
  const normalUrl = process.env.TEST_BASE_DATABASE_URL ?? process.env.DATABASE_URL;
  assert.ok(testUrl, "TEST_DATABASE_URL is required for destructive integration tests.");
  assert.ok(normalUrl, "DATABASE_URL or TEST_BASE_DATABASE_URL is required for destructive integration tests.");
  assert.notEqual(testUrl, normalUrl, "TEST_DATABASE_URL must differ from DATABASE_URL.");
  let parsed;
  try { parsed = new URL(testUrl); } catch { throw new Error("TEST_DATABASE_URL must be a valid database URL."); }
  const databaseName = parsed.pathname.replace(/^\//u, "");
  const schema = parsed.searchParams.get("schema") ?? "";
  assert.match(`${databaseName} ${schema}`, /(?:test|ci|isolated)/iu, "TEST_DATABASE_URL must identify an isolated test database or schema.");
  return testUrl;
}
