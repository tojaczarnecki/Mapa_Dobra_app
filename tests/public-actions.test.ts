import assert from "node:assert/strict";
import test from "node:test";
import { directionsHref, telephoneHref } from "../src/lib/places/actions.ts";
import { mapPreviewLocationLabel } from "../src/lib/places/address-display.ts";

test("telephone links are normalized and absent without a number", () => {
  assert.equal(telephoneHref("+48 42 123-45-67"), "tel:+48421234567");
  assert.equal(telephoneHref(""), undefined);
  assert.equal(telephoneHref(undefined), undefined);
});

test("directions prefer coordinates and safely fall back to an address", () => {
  assert.match(
    directionsHref({ latitude: 51.76, longitude: 19.46, address: "Łódź" }) ?? "",
    /route=;51\.76,19\.46/u,
  );
  assert.match(
    directionsHref({ address: "ul. Wólczańska 108, Łódź" }) ?? "",
    /search\?query=ul\.%20W%C3%B3lcza%C5%84ska%20108%2C%20%C5%81%C3%B3d%C5%BA/u,
  );
  assert.equal(directionsHref({ address: "" }), undefined);
});

test("map preview does not repeat city already present in the address", () => {
  assert.equal(mapPreviewLocationLabel("Św. Stanisława Kostki 2/12, 90-457 Łódź", "Łódź"), null);
  assert.equal(mapPreviewLocationLabel("Św. Stanisława Kostki 2/12, 90-457 Łódź", "Łódź, Górna"), "Górna");
  assert.equal(mapPreviewLocationLabel("ul. Testowa 1, 00-001 Warszawa", "Warszawa"), null);
  assert.equal(mapPreviewLocationLabel("ul. Testowa 1, 00-001 Warszawa", "Warszawa, Mokotów"), "Mokotów");
});
