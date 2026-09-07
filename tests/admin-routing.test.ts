import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

test("admin navigation does not target the missing standalone moje-miejsca route", () => {
  const nav = read("src/components/admin/admin-nav.tsx");
  const needsPage = read("src/app/admin/(protected)/potrzeby/page.tsx");
  const pushRoute = read("src/app/admin/api/push/test/route.ts");

  assert.doesNotMatch(nav, /href=["']\/admin\/moje-miejsca["']/);
  assert.doesNotMatch(needsPage, /href=["']\/admin\/moje-miejsca["']/);
  assert.doesNotMatch(pushRoute, /url:\s*["']\/admin\/moje-miejsca["']/);
  assert.match(needsPage, /GlobalNeedLauncher/);
  assert.match(nav, /item\.href === "\/admin\/miejsca" \? "\/admin"/);
});

test("admin not-found uses panel copy and preserves the detail route", () => {
  const notFound = read("src/app/admin/not-found.tsx");
  const managerPage = read("src/app/admin/(protected)/page.tsx");

  assert.match(notFound, /Nie znaleźliśmy tej strony w panelu\./);
  assert.match(notFound, /Wróć do panelu/);
  assert.match(notFound, /href="\/admin"/);
  assert.match(managerPage, /href=\{`\/admin\/moje-miejsca\/\$\{place\.id\}`\}/);
});

test("global need creation uses the existing form flow with server-side organization scoping", () => {
  const form = read("src/components/admin/needs/need-form.tsx");
  const actions = read("src/app/admin/(protected)/moje-miejsca/needs-actions.ts");

  assert.match(read("src/components/admin/needs/global-need-launcher.tsx"), /href="\/admin\/potrzeby\/nowa"/);
  assert.match(read("src/app/admin/(protected)/potrzeby/nowa/page.tsx"), /NeedForm/);
  assert.match(actions, /redirect\(`\/admin\/potrzeby\?created=\$\{status === "PUBLISHED" \? "published" : "draft"\}`\)/);
  assert.match(form, /role="combobox"/);
  assert.match(form, /name="organizationId"/);
  assert.match(form, /name="placeId"/);
  assert.match(form, /name="status" value="PUBLISHED"/);
  assert.match(actions, /requirePermission\("MANAGE_VOLUNTEER_NEEDS"\)/);
  assert.match(actions, /where: \{ id: placeId, organizationId \}/);
  assert.match(actions, /Wybrana placówka nie należy do tej organizacji/);
  assert.match(actions, /if \(!validation\.ok\) return \{ error: validation\.message \};/);
  assert.match(form, /disabled=\{pending\}[^>]*className/);
  assert.match(form, /formAction\(data\)/);
});

test("mobile admin navigation uses a full-height drawer with interaction safeguards", () => {
  const nav = read("src/components/admin/admin-nav.tsx");

  assert.match(nav, /w-\[min\(360px,calc\(100vw-16px\)\)\]/);
  assert.match(nav, /h-\[100dvh\]/);
  assert.match(nav, /fixed inset-0 z-50/);
  assert.match(nav, /document\.body\.style\.overflow = "hidden"/);
  assert.match(nav, /mobileMenuButtonRef\.current\?\.focus\(\)/);
  assert.match(nav, /aria-label="Zamknij menu"/);
});
