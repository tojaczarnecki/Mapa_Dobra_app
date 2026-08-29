import assert from "node:assert/strict";
import test from "node:test";
import { categoryMatchLabel, categoryMethodLabel, finalSelectedCategoryIds, initialCategoryFormValues, secondaryCategoryOptions, shouldStartEditing } from "../src/components/admin/imports/category-resolution-panel-model.ts";

const categories = [{ id: "a", name: "A", active: true }, { id: "b", name: "B", active: true }, { id: "c", name: "C", active: true }];

test("category panel uses human labels for match results", () => {
  assert.equal(categoryMatchLabel("FULLY_MATCHED"), "Rozpoznano");
  assert.equal(categoryMatchLabel("PARTIALLY_MATCHED"), "Rozpoznano częściowo");
  assert.equal(categoryMatchLabel("UNRESOLVED"), "Nie rozpoznano");
  assert.equal(categoryMethodLabel("SLUG"), "identyfikatorze");
  assert.equal(categoryMethodLabel("NAME"), "nazwie");
  assert.equal(categoryMethodLabel("ALIAS"), "aliasie");
});

test("auto single starts with compact singleton values", () => {
  assert.deepEqual(initialCategoryFormValues(null, "AUTO_SINGLE", ["a"]), { primaryCategoryId: "a", selectedCategoryIds: ["a"] });
  assert.equal(shouldStartEditing("AUTO_SINGLE", false, true), false);
  assert.equal(shouldStartEditing("ADMIN_DECISION", true, true), false);
  assert.equal(shouldStartEditing("REQUIRES_REVIEW", false, true), true);
  assert.equal(shouldStartEditing("REQUIRES_REVIEW", false, false), false);
});

test("primary is absent from secondary options and final ids keep it first", () => {
  assert.deepEqual(secondaryCategoryOptions(categories, "b").map((category) => category.id), ["a", "c"]);
  assert.deepEqual(finalSelectedCategoryIds("b", ["a", "b", "c", "a"]), ["b", "a", "c"]);
  assert.deepEqual(secondaryCategoryOptions(categories, "a").map((category) => category.id), ["b", "c"]);
});

test("review and admin decision values remain explicit", () => {
  assert.deepEqual(initialCategoryFormValues(null, "REQUIRES_REVIEW", ["a", "b"]), { primaryCategoryId: "", selectedCategoryIds: ["a", "b"] });
  assert.deepEqual(initialCategoryFormValues({ primaryCategoryId: "c", categoryIds: ["c", "a"] }, "ADMIN_DECISION", ["b"]), { primaryCategoryId: "c", selectedCategoryIds: ["c", "a"] });
});
