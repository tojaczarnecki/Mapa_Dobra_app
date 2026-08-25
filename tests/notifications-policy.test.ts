import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("notification infrastructure keeps opt-in and partner preference separate", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  const settings = await readFile(new URL("../src/components/notifications/notification-settings.tsx", import.meta.url), "utf8");
  assert.equal(schema.includes("partnerContent Boolean            @default(false)"), true);
  assert.equal(settings.includes("Notification.requestPermission()"), true);
  assert.equal(settings.includes("partnerContent: false"), true);
  assert.equal(settings.includes("Powiadomienia nie są dostępne w tej przeglądarce."), true);
});

test("notification routes expose only the public VAPID key and protect test sending", async () => {
  const vapidRoute = await readFile(new URL("../src/app/api/notifications/vapid-public-key/route.ts", import.meta.url), "utf8");
  const testRoute = await readFile(new URL("../src/app/api/notifications/test/route.ts", import.meta.url), "utf8");
  assert.equal(vapidRoute.includes("VAPID_PUBLIC_KEY"), true);
  assert.equal(vapidRoute.includes("VAPID_PRIVATE_KEY"), false);
  assert.equal(testRoute.includes("await requireAdmin()"), true);
});

test("notification navigation does not accept arbitrary external URLs", async () => {
  const source = await readFile(new URL("../src/lib/notifications.ts", import.meta.url), "utf8");
  assert.equal(source.includes("value.startsWith(\"//\")"), true);
  assert.equal(source.includes("allowedPublicPaths"), true);
});
