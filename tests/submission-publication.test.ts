import assert from "node:assert/strict";
import test from "node:test";
import {
  canPublishSubmission,
  hasPlaceVersionConflict,
  publicationAuditValues,
  splitPublicationItems,
} from "../src/lib/admin/publication-logic.ts";

test("only INCLUDE fields are selected for publication", () => {
  const result = splitPublicationItems([
    { fieldKey: "phone", workingValue: "501 222 333", decision: "INCLUDE" },
    { fieldKey: "requirements", workingValue: "Błędna wartość", decision: "REJECT" },
    { fieldKey: "address", workingValue: "Do decyzji", decision: "PENDING" },
  ]);
  assert.deepEqual(result.included.map((item) => item.fieldKey), ["phone"]);
  assert.deepEqual(result.rejected.map((item) => item.fieldKey), ["requirements"]);
  assert.equal(result.included.some((item) => item.fieldKey === "requirements"), false);
});

test("Place.updatedAt conflict blocks a stale draft", () => {
  const base = new Date("2026-08-12T08:00:00.000Z");
  assert.equal(hasPlaceVersionConflict(base, base), false);
  assert.equal(hasPlaceVersionConflict(base, new Date("2026-08-12T08:01:00.000Z")), true);
});

test("older APPROVED submission remains publishable only when not yet published", () => {
  assert.equal(canPublishSubmission("APPROVED", "NOT_PUBLISHED"), true);
  assert.equal(canPublishSubmission("APPROVED", "PUBLISHED"), false);
  assert.equal(canPublishSubmission("REJECTED", "NOT_PUBLISHED"), false);
});

test("publication audit separates published and rejected fields", () => {
  const audit = publicationAuditValues({ phone: "501 222 333" }, ["requirements"], "place-123");
  assert.deepEqual(audit, {
    placeId: "place-123",
    publishedValues: { phone: "501 222 333" },
    rejectedFields: ["requirements"],
  });
});
