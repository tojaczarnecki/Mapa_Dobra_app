import assert from "node:assert/strict";
import test from "node:test";
import { applyRegistryData } from "../src/lib/organizations/gus-merge.ts";
import { GusLookupError, lookupGusByNip, parseGusRegistryResponse } from "../src/lib/organizations/gus-client.ts";

const response = `<Envelope><Body><DaneSzukajPodmiotyResult>&lt;root&gt;&lt;dane&gt;&lt;Nazwa&gt;Fundacja Łąka Światła&lt;/Nazwa&gt;&lt;NIP&gt;5261040828&lt;/NIP&gt;&lt;REGON&gt;123456789&lt;/REGON&gt;&lt;Ulica&gt;Żółta&lt;/Ulica&gt;&lt;NumerNieruchomosci&gt;7&lt;/NumerNieruchomosci&gt;&lt;KodPocztowy&gt;00-001&lt;/KodPocztowy&gt;&lt;Miejscowosc&gt;Łódź&lt;/Miejscowosc&gt;&lt;FormaPrawna&gt;Fundacja&lt;/FormaPrawna&gt;&lt;/dane&gt;&lt;/root&gt;</DaneSzukajPodmiotyResult></Body></Envelope>`;

test("normalizes an official registry payload into a safe DTO", () => {
  const result = parseGusRegistryResponse(response, "526-104-08-28");
  assert.equal(result.name, "Fundacja Łąka Światła");
  assert.equal(result.regon, "123456789");
  assert.equal(result.address.city, "Łódź");
  assert.equal(result.krs, null);
});

test("fills only empty organization fields and preserves manual values", () => {
  const result = applyRegistryData({ name: "Moja nazwa", nip: "5261040828", regon: "", krs: "", legalForm: "" }, parseGusRegistryResponse(response, "5261040828"));
  assert.equal(result.values.name, "Moja nazwa");
  assert.equal(result.values.regon, "123456789");
  assert.equal(result.values.legalForm, "Fundacja");
  assert.equal(result.suggestions[0]?.field, "name");
});

test("rejects malformed NIP before any provider request", async () => {
  let called = false;
  await assert.rejects(() => lookupGusByNip("123", async () => { called = true; throw new Error("must not call provider"); }), (error: unknown) => error instanceof GusLookupError && error.code === "MALFORMED");
  assert.equal(called, false);
});

test("rejects an empty registry response as not found", () => {
  assert.throws(() => parseGusRegistryResponse("<Envelope><Body /></Envelope>", "5261040828"), (error: unknown) => error instanceof GusLookupError && error.code === "NOT_FOUND");
});
