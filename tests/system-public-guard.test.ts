import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../src/app/api/", import.meta.url);
const writeRoutes = [
  "help-requests/route.ts",
  "potrzeby/[id]/responses/route.ts",
  "submissions/place-update/route.ts",
  "submissions/new-place/route.ts",
];

test("every inventoried public write endpoint uses the central system guard", async () => {
  const sources = await Promise.all(writeRoutes.map((route) => readFile(new URL(route, root), "utf8")));
  for (const source of sources) {
    assert.match(source, /publicWriteBlockedResponse/);
    assert.match(source, /if \(blockedResponse\) return blockedResponse/);
  }
});

test("health and system status stay dynamic and uncached", async () => {
  const health = await readFile(new URL("health/route.ts", root), "utf8");
  const systemStatus = await readFile(new URL("system/status/route.ts", root), "utf8");
  assert.match(health, /force-dynamic/);
  assert.match(health, /no-store/);
  assert.match(systemStatus, /force-dynamic/);
  assert.match(systemStatus, /no-store/);
});
