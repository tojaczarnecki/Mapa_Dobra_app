import test from "node:test";
import assert from "node:assert/strict";
import { knowledgeFormData, knowledgeSlug } from "../src/lib/knowledge-admin.ts";

test("knowledgeSlug creates a stable Polish URL slug", () => {
  assert.equal(knowledgeSlug("Gdzie dostać bezpłatny posiłek?"), "gdzie-dostac-bezplatny-posilek");
});

test("knowledgeFormData normalizes editor lists and flags", () => {
  const form = new FormData();
  form.set("title", "Testowy materiał");
  form.set("excerpt", "Krótki opis");
  form.set("content", "## Treść");
  form.set("tags", "pomoc, Łódź");
  form.set("categorySlugs", "jedzenie, nocleg");
  form.set("placeIds", "place-1, place-2");
  form.set("featured", "on");
  const result = knowledgeFormData(form);
  assert.equal("data" in result, true);
  if ("data" in result && result.data) {
    const data = result.data;
    assert.deepEqual(data.tags, ["pomoc", "Łódź"]);
    assert.deepEqual(data.categorySlugs, ["jedzenie", "nocleg"]);
    assert.deepEqual(data.placeIds, ["place-1", "place-2"]);
    assert.equal(data.featured, true);
  }
});

test("knowledgeFormData accepts visual editor selections as repeated fields", () => {
  const form = new FormData();
  form.set("title", "Materiał");
  form.set("excerpt", "Opis");
  form.set("content", "## Treść");
  form.append("categorySlugs", "jedzenie");
  form.append("categorySlugs", "nocleg");
  form.append("relatedArticleIds", "article-1");
  form.append("relatedArticleIds", "article-2");
  form.set("authorDisplayName", "Zespół Mapy Dobra");
  form.set("important", "on");
  const result = knowledgeFormData(form);
  assert.equal("data" in result, true);
  if ("data" in result && result.data) {
    assert.deepEqual(result.data.categorySlugs, ["jedzenie", "nocleg"]);
    assert.deepEqual(result.data.relatedArticleIds, ["article-1", "article-2"]);
    assert.equal(result.data.authorDisplayName, "Zespół Mapy Dobra");
    assert.equal(result.data.important, true);
  }
});
