import test from "node:test";
import assert from "node:assert/strict";
import { shouldUseSecureAdminCookie } from "../src/lib/admin/session-cookie.ts";

test("admin session cookie stays secure in production by default", () => {
  assert.equal(shouldUseSecureAdminCookie({ NODE_ENV: "production" }), true);
});

test("admin session cookie can be insecure only for explicit local HTTP E2E", () => {
  assert.equal(shouldUseSecureAdminCookie({
    NODE_ENV: "production",
    E2E_ALLOW_INSECURE_ADMIN_COOKIE: "1",
    TEST_BASE_URL: "http://127.0.0.1:3100",
  }), false);

  assert.equal(shouldUseSecureAdminCookie({
    NODE_ENV: "production",
    E2E_ALLOW_INSECURE_ADMIN_COOKIE: "1",
    TEST_BASE_URL: "http://localhost:3100",
  }), false);
});

test("E2E override cannot disable Secure outside local HTTP", () => {
  assert.equal(shouldUseSecureAdminCookie({
    NODE_ENV: "production",
    E2E_ALLOW_INSECURE_ADMIN_COOKIE: "1",
    TEST_BASE_URL: "https://127.0.0.1:3100",
  }), true);

  assert.equal(shouldUseSecureAdminCookie({
    NODE_ENV: "production",
    E2E_ALLOW_INSECURE_ADMIN_COOKIE: "1",
    TEST_BASE_URL: "http://mapadobra.pl",
  }), true);

  assert.equal(shouldUseSecureAdminCookie({
    NODE_ENV: "production",
    E2E_ALLOW_INSECURE_ADMIN_COOKIE: "1",
    TEST_BASE_URL: "not-a-url",
  }), true);
});
