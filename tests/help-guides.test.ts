import test from "node:test";
import assert from "node:assert/strict";
import { getHelpGuide, getPublicHelpGuide, getPublicHelpGuides, helpGuides } from "../src/data/help-guides.ts";

test("help guide slugs are unique and each guide has the required sections", () => {
  assert.equal(new Set(helpGuides.map((guide) => guide.slug)).size, helpGuides.length);
  assert.equal(helpGuides.length, 8);
  for (const guide of helpGuides) {
    assert.ok(guide.title);
    assert.ok(guide.intro);
    assert.ok(guide.steps.length >= 3 && guide.steps.length <= 5);
    assert.ok(guide.avoid.length >= 2 && guide.avoid.length <= 4);
    assert.ok(guide.nextAction.label);
    assert.ok(guide.nextAction.href);
  }
});

test("public index excludes guides awaiting expert review", () => {
  const publicGuides = getPublicHelpGuides();
  assert.equal(publicGuides.length, 4);
  assert.equal(publicGuides.some((guide) => guide.reviewStatus !== "PUBLISHED"), false);
  assert.equal(getHelpGuide("kiedy-dzwonic-pod-112")?.reviewStatus, "NEEDS_EXPERT_REVIEW");
  assert.equal(getPublicHelpGuide("kiedy-dzwonic-pod-112"), undefined);
  assert.ok(getPublicHelpGuide("jak-zaczac-rozmowe"));
  assert.equal(getPublicHelpGuide("unknown-slug"), undefined);
});

test("guide actions use existing public flows", () => {
  assert.equal(getHelpGuide("jak-zaczac-rozmowe")?.nextAction.href, "/pomagam");
  assert.equal(getHelpGuide("jak-wskazac-miejsce-pomocy")?.nextAction.href, "/szukam");
  assert.equal(getHelpGuide("pomoc-w-trudnych-warunkach")?.nextAction.href, "/pomagam");
  assert.equal(getHelpGuide("kiedy-dzwonic-pod-112")?.nextAction.href, "tel:112");
});

test("guides keep the agreed non-judgmental language", () => {
  const sleeping = getHelpGuide("osoba-spi-w-miejscu-publicznym");
  const money = getHelpGuide("pieniadze-czy-konkretna-pomoc");
  assert.ok(sleeping);
  assert.ok(money);
  assert.equal(sleeping.steps.some((step) => /bezdomn/u.test(step)), false);
  assert.equal(money.steps.some((step) => /nie dawaj pieniędzy/u.test(step)), false);
});

test("user-facing guide copy does not expose product architecture terms", () => {
  const userFacingCopy = helpGuides.flatMap((guide) => [
    guide.title,
    guide.intro,
    ...guide.steps,
    ...guide.avoid,
    guide.emergency?.title ?? "",
    guide.emergency?.body ?? "",
    guide.nextAction.label,
  ]);

  assert.equal(userFacingCopy.some((text) => /\bfilar\b|\bflow\b|\boperator\b|\blifecycle\b/iu.test(text)), false);
});
