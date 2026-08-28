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

test("service worker only removes obsolete Mapa Dobra caches", async () => {
  const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.equal(source.includes('const STATIC_CACHE_PREFIX = "mapa-dobra-static-"'), true);
  assert.equal(source.includes("key.startsWith(STATIC_CACHE_PREFIX) && key !== STATIC_CACHE"), true);
  assert.equal(source.includes("keys.filter((key) => key !== STATIC_CACHE)"), false);
});

test("PWA registration bypasses cached worker scripts and checks for updates", async () => {
  const source = await readFile(new URL("../src/components/app/pwa-client.tsx", import.meta.url), "utf8");
  assert.equal(source.includes('updateViaCache: "none"'), true);
  assert.equal(source.includes("workerRegistration.update()"), true);
  assert.equal(source.includes('document.addEventListener("visibilitychange", onVisibilityChange)'), true);
});
