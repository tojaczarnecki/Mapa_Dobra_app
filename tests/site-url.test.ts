import assert from "node:assert/strict";
import test from "node:test";
import { canonicalAlternates, getSiteBaseUrl } from "../src/lib/site-url.ts";

test("site URL configuration fails closed when the deployment URL is absent or invalid", () => {
  assert.equal(getSiteBaseUrl({}), undefined);
  assert.equal(getSiteBaseUrl({ APP_BASE_URL: "not-a-url" }), undefined);
  assert.equal(canonicalAlternates("/szukaj", {}), undefined);
});

test("a configured deployment URL enables canonical metadata", () => {
  assert.equal(
    getSiteBaseUrl({ APP_BASE_URL: "https://mapadobra.example" })?.toString(),
    "https://mapadobra.example/",
  );
  assert.deepEqual(
    canonicalAlternates("/szukaj", { APP_BASE_URL: "https://mapadobra.example" }),
    { canonical: "/szukaj" },
  );
});
