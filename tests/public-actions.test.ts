import assert from "node:assert/strict";
import test from "node:test";
import { directionsHref, telephoneHref } from "../src/lib/places/actions.ts";

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
