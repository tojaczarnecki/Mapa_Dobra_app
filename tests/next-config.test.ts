import assert from "node:assert/strict";
import test from "node:test";
import { getServerActionsAllowedOrigins } from "../next.config.ts";

test("Server Actions allow the configured staging hostname", () => {
  assert.deepEqual(
    getServerActionsAllowedOrigins("https://staging.host11515.iqhs.pl"),
    ["staging.host11515.iqhs.pl"],
  );
});

test("Server Actions allow the configured production hostname", () => {
  assert.deepEqual(
    getServerActionsAllowedOrigins("https://mapadobra.org.pl"),
    ["mapadobra.org.pl"],
  );
});

test("invalid or missing APP_BASE_URL fails closed", () => {
  assert.deepEqual(getServerActionsAllowedOrigins(), []);
  assert.deepEqual(getServerActionsAllowedOrigins("not-a-url"), []);
});
