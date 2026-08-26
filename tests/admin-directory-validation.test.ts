import assert from "node:assert/strict";
import test from "node:test";
import {
  compareOrganizationNames,
  normalizeOrganizationName,
  validateCategoryForm,
  validateOrganizationForm,
} from "../src/lib/admin/directory-validation.ts";

test("organization names distinguish duplicates, similar names and separate entities", () => {
  assert.equal(compareOrganizationNames("Fundacja Dobra Łódź", "Fundacja Dobra Lodz"), "same");
  assert.equal(compareOrganizationNames("Fundacja Pomocna Dłoń", "Fundacja Pomocna Dlon"), "same");
  assert.equal(compareOrganizationNames("Centrum Wsparcia Północ", "Centrum Wsparcia Północy"), "similar");
  assert.equal(compareOrganizationNames("Fundacja Dobra", "Stowarzyszenie Nowy Dom"), "different");
  assert.equal(normalizeOrganizationName("  ŁÓDŹ — Pomaga! "), "lodz pomaga");
});

test("organization validation checks required name, email, URL and limits", () => {
  const valid = new FormData();
  valid.set("name", "TEST Organizacja");
  valid.set("description", "Opis");
  valid.set("phone", "+48 500 000 000");
  valid.set("email", "kontakt@example.com");
  valid.set("website", "https://example.com");
  valid.set("nip", "526-104-08-28");
  valid.set("regon", "123456789");
  valid.set("krs", "0000123456");
  valid.set("legalForm", "Fundacja");
  assert.equal(validateOrganizationForm(valid).ok, true);

  valid.set("email", "niepoprawny-email");
  assert.equal(validateOrganizationForm(valid).ok, false);
  valid.set("email", "kontakt@example.com");
  valid.set("website", "javascript:alert(1)");
  assert.equal(validateOrganizationForm(valid).ok, false);
});

test("new category is inactive unless explicitly activated and requires a safe slug", () => {
  const category = new FormData();
  category.set("name", "TEST Kategoria");
  category.set("slug", "test-kategoria");
  category.set("sortOrder", "");
  const result = validateCategoryForm(category);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.active, false);
    assert.equal(result.data.sortOrder, null);
  }
  category.set("slug", "Niebezpieczny Slug");
  assert.equal(validateCategoryForm(category).ok, false);
});
