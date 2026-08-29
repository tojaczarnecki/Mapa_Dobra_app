import assert from "node:assert/strict";
import test from "node:test";
import { analyzeImportRows, findInFileDuplicates, matchCategories, matchCategory, matchOrganization, matchPlace, normalizeMatchingPhone, normalizeMatchingWebsite, parseCategoryTokens } from "../src/lib/imports/matching.ts";
import type { CanonicalImportValues, MappedImportRow } from "../src/lib/imports/column-mapping.ts";

const organizations = [
  { id: "org-a", name: "Fundacja A Łódź", nip: "5261040828", regon: "123456789", krs: "0000123456", active: true },
  { id: "org-b", name: "Fundacja B", nip: "1111111111", regon: "987654321", krs: "0000000001", active: false },
];
const categories = [
  { id: "cat-food", slug: "jedzenie", name: "Jedzenie", active: true },
  { id: "cat-clothing", slug: "odziez", name: "Odzież", active: false },
];
const places = [
  { id: "place-a", name: "Punkt A", addressLine: "Piotrkowska 10, Łódź", phone: "600-100-200", website: "https://example.pl/", organizationId: "org-a", primaryCategoryId: "cat-food" },
  { id: "place-b", name: "Punkt B", addressLine: "Piotrkowska 20, Łódź", phone: "601100200", website: "https://other.pl", organizationId: "org-a", primaryCategoryId: "cat-food" },
];

function values(overrides: CanonicalImportValues = {}): CanonicalImportValues {
  return { name: "Nowe miejsce", addressLine: "Adres 1, Łódź", primaryCategory: "Jedzenie", ...overrides };
}

function row(rowNumber: number, rowValues: CanonicalImportValues, errors: string[] = [], warnings: string[] = []): MappedImportRow {
  return { rowNumber, rawValues: [], values: rowValues, errors: errors.map((code) => ({ code: code as never, field: "name", message: code })), warnings: warnings.map((code) => ({ code: code as never, field: "name", message: code })), status: errors.length ? "ERROR" : warnings.length ? "WARNING" : "READY" };
}

test("organization identifiers have priority and conflicting identifiers are never resolved", () => {
  assert.equal(matchOrganization(values({ organizationName: "Inna nazwa", organizationNip: "526-104-08-28" }), organizations).organizationId, "org-a");
  const conflict = matchOrganization(values({ organizationNip: "5261040828", organizationRegon: "987654321" }), organizations);
  assert.equal(conflict.status, "CONFLICT");
  assert.equal(conflict.organizationId, null);
});

test("organization matching handles names, similar names, inactive and missing data", () => {
  assert.equal(matchOrganization(values({ organizationName: "Fundacja A Łódź" }), organizations).method, "NAME");
  assert.equal(matchOrganization(values({ organizationName: "Fundacja A Łódzka" }), organizations).status, "POSSIBLE");
  const inactive = matchOrganization(values({ organizationNip: "1111111111" }), organizations);
  assert.deepEqual(inactive.warnings, ["INACTIVE_ORGANIZATION"]);
  assert.equal(matchOrganization(values(), organizations).status, "NONE");
  assert.equal(matchOrganization(values({ organizationName: "Nowa Fundacja" }), organizations).status, "NEW_CANDIDATE");
});

test("category matching uses slug, name and known aliases only when target exists", () => {
  assert.equal(matchCategory("JEDZENIE", categories).method, "SLUG");
  assert.equal(matchCategory("  Odzież  ", categories).warnings[0], "INACTIVE_CATEGORY");
  assert.equal(matchCategory("inne", [{ id: "other", slug: "inne", name: "Other help", active: true }]).status, "UNRESOLVED");
  assert.equal(matchCategory("prysznic", [{ id: "hygiene", slug: "higiena", name: "Higiena", active: true }]).categorySlug, "higiena");
  assert.equal(matchCategory("Pomoc psychologiczna", [{ id: "psych", slug: "pomoc-psychologiczna", name: "Pomoc psychologiczna", active: true }]).categorySlug, "pomoc-psychologiczna");
  assert.equal(matchCategory("Pomoc prawna", [{ id: "legal", slug: "pomoc-prawna", name: "Pomoc prawna", active: true }]).categorySlug, "pomoc-prawna");
  assert.equal(matchCategory("Pomoc socjalna", [{ id: "social", slug: "pomoc-socjalna", name: "Pomoc socjalna", active: true }]).categorySlug, "pomoc-socjalna");
  assert.equal(matchCategory("Pomoc medyczna", categories).status, "UNRESOLVED");
  assert.equal(matchCategory("nieznana", categories).status, "UNRESOLVED");
});

test("category tokenization is semicolon-delimited, stable and normalized", () => {
  assert.deepEqual(parseCategoryTokens(" pomoc-prawna ;  pomoc-socjalna "), ["pomoc-prawna", "pomoc-socjalna"]);
  assert.deepEqual(parseCategoryTokens("pomoc-prawna;;pomoc-prawna;"), ["pomoc-prawna"]);
  assert.deepEqual(parseCategoryTokens(""), []);
});

test("multi-category matching preserves token provenance without choosing a primary category", () => {
  const references = [
    { id: "legal", slug: "pomoc-prawna", name: "Pomoc prawna", active: true },
    { id: "social", slug: "pomoc-socjalna", name: "Pomoc socjalna", active: true },
    { id: "hygiene", slug: "higiena", name: "Higiena", active: true },
    { id: "psych", slug: "pomoc-psychologiczna", name: "Pomoc psychologiczna", active: true },
    { id: "medical", slug: "pomoc-medyczna", name: "Pomoc medyczna", active: true },
    { id: "food", slug: "jedzenie", name: "Jedzenie", active: true },
  ];
  const result = matchCategories("prysznic; higiena", references);
  assert.equal(result.status, "FULLY_MATCHED");
  assert.deepEqual(result.matchedCategorySlugs, ["higiena"]);
  assert.deepEqual(result.tokens.map((token) => [token.sourceToken, token.categorySlug]), [["prysznic", "higiena"], ["higiena", "higiena"]]);
  assert.equal(matchCategories("pomoc-prawna; pomoc-socjalna", references).matchedCategorySlugs.join(","), "pomoc-prawna,pomoc-socjalna");
  assert.deepEqual(matchCategories("pomoc-socjalna; inne", references).unresolvedTokens, ["inne"]);
  assert.equal(matchCategories("pomoc-socjalna; inne", references).status, "PARTIALLY_MATCHED");
  assert.equal(matchCategories("inne", references).status, "UNRESOLVED");
  assert.equal(matchCategories("inna pomoc", references).status, "UNRESOLVED");
  assert.equal(matchCategories("foo; bar", references).status, "UNRESOLVED");
  assert.deepEqual(matchCategories("pomoc prawna; praca socjalna", references).matchedCategorySlugs, ["pomoc-prawna", "pomoc-socjalna"]);
});

test("empty multi-category input requires category review", () => {
  const references = [{ id: "food", slug: "jedzenie", name: "Jedzenie", active: true }];
  assert.equal(matchCategories("", references).requiresReview, true);
  assert.equal(matchCategories("   ", references).requiresReview, true);
});

test("inactive matched category is retained with an explicit review signal", () => {
  const result = matchCategories("pomoc-prawna", [{ id: "legal", slug: "pomoc-prawna", name: "Pomoc prawna", active: false }]);
  assert.equal(result.status, "FULLY_MATCHED");
  assert.equal(result.requiresReview, true);
  assert.deepEqual(result.warnings, ["INACTIVE_CATEGORY"]);
});

test("place matching is conservative", () => {
  assert.equal(matchPlace(values({ name: "Punkt A", addressLine: "Piotrkowska 10, Łódź" }), places).classification, "EXACT_MATCH");
  assert.equal(matchPlace(values({ addressLine: "Piotrkowska 20, Łódź", phone: "601 100 200" }), places).classification, "EXACT_MATCH");
  assert.equal(matchPlace(values({ addressLine: "Piotrkowska 20, Łódź", name: "Inny punkt" }), places).classification, "POSSIBLE_MATCH");
  assert.equal(matchPlace(values({ phone: "600100200" }), places).classification, "POSSIBLE_MATCH");
  assert.equal(matchPlace(values({ website: "http://example.pl" }), places).classification, "POSSIBLE_MATCH");
  assert.equal(matchPlace(values(), []).classification, "NEW");
});

test("matching normalizes phone and website conservatively", () => {
  assert.equal(normalizeMatchingPhone("+48 600 100 200"), "600100200");
  assert.equal(normalizeMatchingPhone("600-100-200"), "600100200");
  assert.equal(normalizeMatchingWebsite("http://www.example.pl/"), "example.pl/");
  assert.equal(normalizeMatchingWebsite("https://example.pl/"), "example.pl/");
});

test("in-file duplicates preserve source row numbers without removing rows", () => {
  const rows = [row(8, values({ name: "Punkt", addressLine: "Adres" })), row(21, values({ name: "punkt", addressLine: "Adres" })), row(30, values({ name: "Inne", addressLine: "Adres", phone: "600 100 200" }))];
  const duplicates = findInFileDuplicates(rows);
  assert.deepEqual(duplicates.get(8), [{ rowNumber: 21, reasons: ["SAME_NAME_AND_ADDRESS"] }]);
  assert.equal(duplicates.has(30), false);
  assert.equal(rows.length, 3);
});

test("analysis returns READY, REVIEW and ERROR without database access", () => {
  const result = analyzeImportRows([
    row(4, values({ name: "Unikalne miejsce", addressLine: "Adres unikalny, Łódź" })),
    row(6, values({ primaryCategory: "Nieznana" })),
    row(9, values({ organizationName: "Nowa Fundacja" })),
  ], { organizations, categories, places: [] });
  assert.equal(result[0].status, "READY");
  assert.equal(result[1].status, "ERROR");
  assert.equal(result[2].status, "REVIEW");
  assert.equal(result[2].rowNumber, 9);
});
