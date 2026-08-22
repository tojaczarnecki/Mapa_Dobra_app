import assert from "node:assert/strict";
import test from "node:test";
import { geocoderUserAgent } from "../src/lib/geocoding/config.ts";

test("production geocoder requires a controlled application identity", () => {
  assert.throws(() => geocoderUserAgent({ NODE_ENV: "production" }), /nie jest skonfigurowany/u);
  assert.equal(geocoderUserAgent({ NODE_ENV: "production", GEOCODER_CONTACT_EMAIL: "kontakt@example.org" }), "MapaDobra/1.0 (kontakt@example.org)");
});

test("an explicit non-placeholder user agent is preserved", () => {
  assert.equal(geocoderUserAgent({ NODE_ENV: "production", GEOCODER_USER_AGENT: "MapaDobra/1.0 (ops@example.org)" }), "MapaDobra/1.0 (ops@example.org)");
});
