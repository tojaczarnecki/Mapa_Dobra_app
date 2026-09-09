import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const responseForm = readFileSync(resolve(root, "src/components/admin/needs/response-status-form.tsx"), "utf8");
const needsSection = readFileSync(resolve(root, "src/components/admin/needs/admin-needs-section.tsx"), "utf8");
const needsList = readFileSync(resolve(root, "src/components/admin/needs/admin-needs-list.tsx"), "utf8");
const needStatusActions = readFileSync(resolve(root, "src/components/admin/needs/need-status-actions.tsx"), "utf8");

test("NEW response controls remain interactive after need lifecycle remount", () => {
  assert.match(responseForm, /<button type="button" onClick=\{\(\) => setOpenDecision\("CONFIRMED"\)\}/);
  assert.match(responseForm, /<button type="button" onClick=\{\(\) => setOpenDecision\("DECLINED"\)\}/);
  assert.doesNotMatch(responseForm, /CONFIRM_CLICK|DECLINE_CLICK/);
  assert.match(responseForm, /import \{ ConfirmDialog \} from "@\/components\/admin\/confirm-dialog"/);
  assert.doesNotMatch(responseForm, /showModal\(\)|\.close\(\)/);
  assert.match(responseForm, /activeCopy && !decisionSucceeded/);
  assert.match(responseForm, /onCancel=\{closeDecision\}/);
  assert.doesNotMatch(responseForm, /onCancel=\{\(\) => setOpenDecision\(null\)\}/);
  assert.match(needsSection, /<AdminNeedsList placeId=\{placeId\}/);
  assert.match(needsList, /<ResponseStatusForm key=\{`\$\{need\.id\}-\$\{need\.status\}-\$\{response\.id\}`\}/);
});

test("admin need list does not present expired or non-public needs as active public records", () => {
  assert.match(needsList, /function isExpired/);
  assert.match(needsList, /need\.status === "FILLED" \|\| isExpired\(need\)/);
  assert.match(needsList, /Brak aktywnego widoku publicznego/);
  assert.match(needsList, /statusLabel = expired \? "Po terminie"/);
});

test("FILLED is not a manual early-completion action", () => {
  assert.doesNotMatch(needStatusActions, /Zakończ wcześniej/);
  assert.match(needStatusActions, /Jeśli potrzebujesz kolejnych osób/);
});
