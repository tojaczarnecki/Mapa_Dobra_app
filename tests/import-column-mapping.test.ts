import assert from "node:assert/strict";
import test from "node:test";
import {
  mapSpreadsheetRows,
  normalizeImportHeader,
  suggestColumnMapping,
  validateColumnMapping,
} from "../src/lib/imports/column-mapping.ts";

test("header matching handles aliases, case, whitespace and Polish characters", () => {
  assert.equal(normalizeImportHeader("  Numer telefonu: "), "numer telefonu");
  const result = suggestColumnMapping([" NAZWA PLACÓWKI ", "Adres", "KATEGORIA GŁÓWNA", "Telefon", "Nieznana"]);
  assert.equal(result.fields.name.columnIndex, 0);
  assert.equal(result.fields.addressLine.columnIndex, 1);
  assert.equal(result.fields.primaryCategory.columnIndex, 2);
  assert.equal(result.fields.phone.columnIndex, 3);
  assert.equal(result.fields.city.match, "unresolved");
});

test("suggestions report a conflict instead of assigning one column twice", () => {
  const result = suggestColumnMapping(["Nazwa", "Nazwa"]);
  assert.equal(result.fields.name.columnIndex, null);
  assert.equal(result.fields.name.match, "conflict");
  assert.deepEqual(result.conflicts, [{ columnIndex: 0, header: "Nazwa", fields: ["name"] }, { columnIndex: 1, header: "Nazwa", fields: ["name"] }]);
});

test("manual mapping validates required fields, indices and duplicate columns", () => {
  assert.equal(validateColumnMapping(["Nazwa", "Adres", "Kategoria"], { name: 0, addressLine: 1, primaryCategory: 2 }).ok, true);
  assert.deepEqual(validateColumnMapping(["Nazwa"], { name: 0, addressLine: 0, primaryCategory: 4 }), {
    ok: false,
    errors: [
      { code: "DUPLICATE_COLUMN_MAPPING", field: "addressLine", columnIndex: 0 },
      { code: "INVALID_MAPPING", field: "primaryCategory", columnIndex: 4 },
      { code: "MISSING_REQUIRED_MAPPING", field: "primaryCategory" },
    ],
  });
});

test("rows keep source row number and raw values while mapping required fields", () => {
  const result = mapSpreadsheetRows(["Nazwa", "Adres", "Kategoria"], [[" Punkt ", "ul. Dobra 1", "Jedzenie"], ["", "Adres", "Kategoria"]], { name: 0, addressLine: 1, primaryCategory: 2 }, [4, 6]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.rows[0].rowNumber, 4);
  assert.deepEqual(result.rows[0].rawValues, [" Punkt ", "ul. Dobra 1", "Jedzenie"]);
  assert.equal(result.rows[0].status, "READY");
  assert.equal(result.rows[1].status, "ERROR");
  assert.equal(result.rows[1].errors[0]?.code, "MISSING_REQUIRED_FIELD");
  assert.equal(result.rows[1].rowNumber, 6);
});

test("optional values normalize conservatively and invalid values warn", () => {
  const result = mapSpreadsheetRows(
    ["Nazwa", "Adres", "Kategoria", "NIP", "REGON", "KRS", "E-mail", "WWW", "Dla kogo", "Usługi"],
    [["Punkt", "Adres", "Pomoc", "526-104-08-28", "123-456-789", "0000-1234-56", "bad", "example.pl", "bezdomni; seniorzy, bezdomni", "porady\nżywność"]],
    { name: 0, addressLine: 1, primaryCategory: 2, organizationNip: 3, organizationRegon: 4, organizationKrs: 5, email: 6, website: 7, audience: 8, services: 9 },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const row = result.rows[0];
  assert.equal(row.status, "WARNING");
  assert.equal(row.values.organizationNip, "5261040828");
  assert.equal(row.values.organizationRegon, "123456789");
  assert.equal(row.values.organizationKrs, "0000123456");
  assert.equal(row.values.website, "https://example.pl");
  assert.deepEqual(row.values.audience, ["bezdomni", "seniorzy"]);
  assert.deepEqual(row.values.services, ["porady", "żywność"]);
  assert.equal(row.warnings.some((item) => item.code === "INVALID_EMAIL"), true);
});

test("invalid identifiers and unsafe URLs warn without blocking a valid place", () => {
  const result = mapSpreadsheetRows(["Nazwa", "Adres", "Kategoria", "NIP", "WWW"], [["Punkt", "Adres", "Pomoc", "123", "javascript:alert(1)"]], { name: 0, addressLine: 1, primaryCategory: 2, organizationNip: 3, website: 4 });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.rows[0].status, "WARNING");
  assert.equal(result.rows[0].errors.length, 0);
  assert.deepEqual(result.rows[0].warnings.map((item) => item.code), ["INVALID_WEBSITE", "INVALID_NIP"]);
});
