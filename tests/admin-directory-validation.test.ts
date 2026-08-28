import assert from "node:assert/strict";
import test from "node:test";
import {
  compareOrganizationNames,
  normalizeKrs,
  normalizeNip,
  normalizeOrganizationName,
  normalizeRegon,
  normalizeWebUrl,
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
  assert.equal(validateOrganizationForm(valid).ok, true);

  valid.set("email", "niepoprawny-email");
  assert.equal(validateOrganizationForm(valid).ok, false);
  valid.set("email", "kontakt@example.com");
  valid.set("website", "javascript:alert(1)");
  assert.equal(validateOrganizationForm(valid).ok, false);
});

test("organization identifiers normalize and validate their formats", () => {
  assert.equal(normalizeNip("526-104-08-28"), "5261040828");
  assert.equal(normalizeNip("5261040829"), null);
  assert.equal(normalizeNip("526104082"), null);
  assert.equal(normalizeNip("52610408A8"), null);
  assert.equal(normalizeNip(""), null);

  assert.equal(normalizeRegon("123-456-789"), "123456789");
  assert.equal(normalizeRegon("12345678901234"), "12345678901234");
  assert.equal(normalizeRegon("12345678"), null);
  assert.equal(normalizeRegon("12345678A"), null);
  assert.equal(normalizeRegon(""), null);

  assert.equal(normalizeKrs("0000-1234-56"), "0000123456");
  assert.equal(normalizeKrs("123456789"), null);
  assert.equal(normalizeKrs("123456789A"), null);
  assert.equal(normalizeKrs(""), null);
});

test("organization validation stores normalized identifiers and rejects invalid values", () => {
  const form = new FormData();
  form.set("name", "TEST Organizacja Rejestrowa");
  form.set("description", "");
  form.set("phone", "");
  form.set("email", "");
  form.set("website", "");
  form.set("nip", "526-104-08-28");
  form.set("regon", "123-456-789");
  form.set("krs", "0000-1234-56");
  const result = validateOrganizationForm(form);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual({ nip: result.data.nip, regon: result.data.regon, krs: result.data.krs }, { nip: "5261040828", regon: "123456789", krs: "0000123456" });

  form.set("nip", "1234567890");
  const invalidNip = validateOrganizationForm(form);
  assert.equal(invalidNip.ok, false);
  if (!invalidNip.ok) assert.deepEqual(invalidNip.fieldErrors, { nip: "NIP ma nieprawidłową sumę kontrolną." });

  form.set("nip", "5261040828");
  form.set("regon", "12345678");
  const invalidRegon = validateOrganizationForm(form);
  assert.equal(invalidRegon.ok, false);
  if (!invalidRegon.ok) assert.deepEqual(invalidRegon.fieldErrors, { regon: "REGON musi mieć 9 lub 14 cyfr." });

  form.set("regon", "123456789");
  form.set("krs", "123456789");
  const invalidKrs = validateOrganizationForm(form);
  assert.equal(invalidKrs.ok, false);
  if (!invalidKrs.ok) assert.deepEqual(invalidKrs.fieldErrors, { krs: "KRS musi mieć 10 cyfr." });

  form.set("nip", "123");
  form.set("regon", "123");
  const multipleErrors = validateOrganizationForm(form);
  assert.equal(multipleErrors.ok, false);
  if (!multipleErrors.ok) assert.deepEqual(multipleErrors.fieldErrors, {
    nip: "NIP musi mieć 10 cyfr.",
    regon: "REGON musi mieć 9 lub 14 cyfr.",
    krs: "KRS musi mieć 10 cyfr.",
  });
});

test("organization website normalization adds only a safe default protocol", () => {
  assert.equal(normalizeWebUrl(" example.pl "), "https://example.pl");
  assert.equal(normalizeWebUrl("www.example.pl"), "https://www.example.pl");
  assert.equal(normalizeWebUrl("https://example.pl"), "https://example.pl");
  assert.equal(normalizeWebUrl("http://example.pl"), "http://example.pl");
  assert.equal(normalizeWebUrl("   "), "");
  assert.equal(normalizeWebUrl("javascript:alert(1)"), null);
  assert.equal(normalizeWebUrl("https://"), null);
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
