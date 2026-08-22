import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("service worker keeps live and administrative routes out of its static cache", async () => {
  const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  for (const route of ["/admin", "/api", "/szukaj", "/mapa", "/znajdz-nocleg", "/lodz/"]) {
    assert.equal(source.includes(`url.pathname.startsWith(\"${route}\")`), true);
  }
  assert.equal(source.includes('url.pathname.startsWith("/_next/static/")'), true);
});
