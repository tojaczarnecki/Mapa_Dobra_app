import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canClaimPushEndpoint,
  isValidPushPayload,
  parseAdminPushSubscriptionInput,
  safeNotificationUrl,
} from "../src/lib/push/validation.ts";

const validSubscription = {
  endpoint: "https://push.example.test/send/abc",
  p256dh: "abcdefghijklmnopqrstuvwxyz",
  auth: "abcdefghijklmno",
};

test("push subscription input requires a valid HTTPS endpoint and keys", () => {
  assert.deepEqual(parseAdminPushSubscriptionInput(validSubscription), { ...validSubscription, expirationTime: null, userAgent: null });
  assert.equal(parseAdminPushSubscriptionInput({ ...validSubscription, endpoint: "http://push.example.test" }), null);
  assert.equal(parseAdminPushSubscriptionInput({ ...validSubscription, auth: "short" }), null);
});

test("an endpoint can never be claimed by another admin", () => {
  assert.equal(canClaimPushEndpoint(null, "admin-a"), true);
  assert.equal(canClaimPushEndpoint("admin-a", "admin-a"), true);
  assert.equal(canClaimPushEndpoint("admin-a", "admin-b"), false);
});

test("notification payloads accept only same-app relative URLs", () => {
  assert.equal(safeNotificationUrl("/admin"), "/admin");
  assert.equal(safeNotificationUrl("https://evil.example/"), null);
  assert.equal(safeNotificationUrl("//evil.example/"), null);
  assert.equal(isValidPushPayload({ title: "Dobra Mapa", body: "Aktualizacja", url: "/admin" }), true);
  assert.equal(isValidPushPayload({ title: "Dobra Mapa", body: "Aktualizacja", url: "https://evil.example" }), false);
});

test("service worker keeps push click navigation app-only", () => {
  const worker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(worker, /addEventListener\("push"/);
  assert.match(worker, /addEventListener\("notificationclick"/);
  assert.match(worker, /startsWith\("\/\/"\)/);
  assert.match(worker, /openWindow\(target\)/);
});
