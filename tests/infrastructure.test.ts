import test from "node:test";
import assert from "node:assert/strict";
import { validateRuntimeEnv } from "../src/lib/config/env.ts";
import { createInMemoryRateLimiter, getTrustedClientAddress } from "../src/lib/security/rate-limiter.ts";

test("production runtime configuration fails closed without deployment values", () => {
  const result = validateRuntimeEnv({ NODE_ENV: "production" }, "production");
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("DATABASE_URL"));
  assert.ok(result.errors.includes("PUBLIC_DATA_MODE"));
});

test("rate limiter does not trust forwarded client IP by default", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.5" });
  assert.equal(getTrustedClientAddress(headers, { TRUSTED_PROXY_MODE: "none" }), "untrusted-network");
  assert.equal(getTrustedClientAddress(headers, { TRUSTED_PROXY_MODE: "single" }), "203.0.113.5");
});

test("in-memory limiter remains deterministic for local development", async () => {
  const limiter = createInMemoryRateLimiter(1000, 2);
  assert.equal((await limiter.consume("test", 0)).allowed, true);
  assert.equal((await limiter.consume("test", 1)).allowed, true);
  assert.equal((await limiter.consume("test", 2)).allowed, false);
  assert.equal((await limiter.consume("test", 1001)).allowed, true);
});
