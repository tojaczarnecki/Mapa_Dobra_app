import test from "node:test";
import assert from "node:assert/strict";
import { validateRuntimeEnv, type RuntimeEnvironment } from "../src/lib/config/env.ts";
import { assertRateLimiterConfigured, createApplicationRateLimiter, createInMemoryRateLimiter, getTrustedClientAddress } from "../src/lib/security/rate-limiter.ts";

function validProductionEnv(overrides: RuntimeEnvironment = {}): RuntimeEnvironment {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://db.example/app",
    APP_BASE_URL: "https://mapadobra.example",
    PUBLIC_DATA_MODE: "production",
    GEOCODER_USER_AGENT: "MapaDobra/1.0",
    GEOCODER_CONTACT_EMAIL: "ops@mapadobra.example",
    RATE_LIMIT_MODE: "upstash",
    UPSTASH_REDIS_REST_URL: "https://redis.example",
    UPSTASH_REDIS_REST_TOKEN: "token",
    ...overrides,
  };
}

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

test("production with valid Upstash configuration is accepted", () => {
  const environment = validProductionEnv();
  assert.equal(validateRuntimeEnv(environment, "production").valid, true);
  assert.doesNotThrow(() => assertRateLimiterConfigured(environment));
});

test("production memory mode is rejected without explicit staging", () => {
  const environment = validProductionEnv({ RATE_LIMIT_MODE: "memory" });
  assert.equal(validateRuntimeEnv(environment, "production").valid, false);
  assert.throws(() => assertRateLimiterConfigured(environment));
});

test("production memory mode remains rejected for explicit production", () => {
  const environment = validProductionEnv({ DEPLOYMENT_ENV: "production", RATE_LIMIT_MODE: "memory" });
  assert.equal(validateRuntimeEnv(environment, "production").valid, false);
  assert.throws(() => assertRateLimiterConfigured(environment));
});

test("explicit production-mode staging may use memory without Upstash", async () => {
  const environment = validProductionEnv({ DEPLOYMENT_ENV: "staging", RATE_LIMIT_MODE: "memory", UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined });
  assert.equal(validateRuntimeEnv(environment, "production").valid, true);
  assert.doesNotThrow(() => assertRateLimiterConfigured(environment));
  const limiter = createApplicationRateLimiter(1000, 1, environment);
  assert.equal((await limiter.consume("staging", 0)).allowed, true);
  assert.equal((await limiter.consume("staging", 1)).allowed, false);
});

test("staging with an unsupported rate limit mode fails closed", async () => {
  const environment = validProductionEnv({ DEPLOYMENT_ENV: "staging", RATE_LIMIT_MODE: "other", UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined });
  assert.equal(validateRuntimeEnv(environment, "production").valid, false);
  assert.throws(() => assertRateLimiterConfigured(environment));
  const limiter = createApplicationRateLimiter(1000, 1, environment);
  assert.equal((await limiter.consume("staging", 0)).allowed, false);
});

test("development keeps using the existing in-memory behavior", async () => {
  const limiter = createApplicationRateLimiter(1000, 1, { NODE_ENV: "development", RATE_LIMIT_MODE: "upstash" });
  assert.equal((await limiter.consume("development", 0)).allowed, true);
  assert.equal((await limiter.consume("development", 1)).allowed, false);
});
