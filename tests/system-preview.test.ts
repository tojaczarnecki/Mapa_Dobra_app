import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceRoot = new URL("../src/", import.meta.url);

test("system settings link to a separate read-only maintenance preview", async () => {
  const page = await readFile(new URL("app/admin/(protected)/system/page.tsx", sourceRoot), "utf8");
  const preview = await readFile(new URL("app/admin/(protected)/system/podglad/page.tsx", sourceRoot), "utf8");

  assert.match(page, /href=\"\/admin\/system\/podglad\"/);
  assert.doesNotMatch(page, /params\.preview|preview=1/);
  assert.match(preview, /requirePermission\("VIEW_SYSTEM_SETTINGS"\)/);
  assert.match(preview, /getSystemState\(\)/);
  assert.match(preview, /MaintenanceScreen/);
  assert.match(preview, /\/admin\/system/);
  assert.doesNotMatch(preview, /prisma|updateSystemSettings|AuditLog/);
});

test("maintenance preview keeps the safety call to 112", async () => {
  const shell = await readFile(new URL("components/app/public-page-shell.tsx", sourceRoot), "utf8");

  assert.match(shell, /export function MaintenanceScreen/);
  assert.match(shell, /tel:112/);
  assert.match(shell, /noindex/);
});

test("system save handles a missing local settings table without exposing Prisma errors", async () => {
  const actions = await readFile(new URL("app/admin/(protected)/system/actions.ts", sourceRoot), "utf8");

  assert.match(actions, /redirect\("\/admin\/system\?error=storage"\)/);
  assert.match(actions, /Nie udało się odczytać ustawień przed zapisem/);
});
