import assert from "node:assert/strict";
import test from "node:test";
import { turnstileRequired } from "../src/lib/security/turnstile.ts";
import { verifyTurnstileToken } from "../src/lib/security/turnstile.ts";

test("Turnstile is opt-in and only required in explicit required mode", () => {
  assert.equal(turnstileRequired({ TURNSTILE_MODE: "disabled" }), false);
  assert.equal(turnstileRequired({ TURNSTILE_MODE: "required" }), true);
  assert.equal(turnstileRequired({ TURNSTILE_MODE: "unexpected" }), false);
});

test("Turnstile disabled mode accepts a form without a provider request", async () => {
  const result = await verifyTurnstileToken(undefined, new Request("https://example.test"), { TURNSTILE_MODE: "disabled" });
  assert.deepEqual(result, { ok: true });
});

test("Turnstile required mode rejects missing token", async () => {
  const result = await verifyTurnstileToken(undefined, new Request("https://example.test"), { TURNSTILE_MODE: "required", TURNSTILE_SECRET_KEY: "secret" });
  assert.deepEqual(result, { ok: false, reason: "missing" });
});

test("Turnstile required mode maps provider outcomes", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ success: true }));
    assert.deepEqual(await verifyTurnstileToken("valid", new Request("https://example.test"), { TURNSTILE_MODE: "required", TURNSTILE_SECRET_KEY: "secret" }), { ok: true });
    globalThis.fetch = async () => new Response(JSON.stringify({ success: false }));
    assert.deepEqual(await verifyTurnstileToken("invalid", new Request("https://example.test"), { TURNSTILE_MODE: "required", TURNSTILE_SECRET_KEY: "secret" }), { ok: false, reason: "failed" });
    globalThis.fetch = async () => { throw new Error("provider unavailable"); };
    assert.deepEqual(await verifyTurnstileToken("expired", new Request("https://example.test"), { TURNSTILE_MODE: "required", TURNSTILE_SECRET_KEY: "secret" }), { ok: false, reason: "unavailable" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
