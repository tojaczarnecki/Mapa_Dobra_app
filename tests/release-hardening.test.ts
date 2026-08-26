import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("staging robots and metadata are closed to indexing", async () => {
  const robots = await readFile(new URL("../src/app/robots.ts", import.meta.url), "utf8");
  const layout = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.equal(robots.includes('process.env.DEPLOYMENT_ENV === "staging"'), true);
  assert.equal(robots.includes('disallow: "/"'), true);
  assert.equal(layout.includes("index: false, follow: false"), true);
});

test("shared unsaved guard handles history navigation and native unload", async () => {
  const source = await readFile(new URL("../src/components/forms/use-unsaved-changes-guard.ts", import.meta.url), "utf8");
  assert.equal(source.includes('addEventListener("beforeunload"'), true);
  assert.equal(source.includes('addEventListener("popstate"'), true);
  assert.equal(source.includes("history.pushState"), true);
});

test("contextual corrections use the same Turnstile verifier as other public writes", async () => {
  const source = await readFile(new URL("../src/app/api/submissions/place-correction/route.ts", import.meta.url), "utf8");
  assert.equal(source.includes("verifyTurnstileToken"), true);
  assert.equal(source.includes("if (!challenge.ok)"), true);
});
