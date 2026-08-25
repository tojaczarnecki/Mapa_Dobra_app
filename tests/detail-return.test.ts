import assert from "node:assert/strict";
import test from "node:test";
import {
  detailHrefWithSource,
  detailReturnLink,
  detailReturnSource,
} from "../src/lib/places/detail-return.ts";

test("detail links carry an explicit source context", () => {
  assert.equal(
    detailHrefWithSource("/lodz/jedzenie/lodzki-punkt-posilkow", "mapa"),
    "/lodz/jedzenie/lodzki-punkt-posilkow?from=mapa",
  );
  assert.equal(
    detailHrefWithSource("/lodz/higiena/centrum-prysznic?foo=bar#from", "szukaj"),
    "/lodz/higiena/centrum-prysznic?foo=bar&from=szukaj#from",
  );
  assert.equal(
    detailHrefWithSource("/lodz/higiena/centrum-prysznic?from=mapa", "szukaj"),
    "/lodz/higiena/centrum-prysznic?from=szukaj",
  );
});

test("detail return source only accepts known contexts", () => {
  assert.equal(detailReturnSource("mapa"), "mapa");
  assert.equal(detailReturnSource("szukaj"), "szukaj");
  assert.equal(detailReturnSource("xyz"), undefined);
  assert.equal(detailReturnSource(undefined), undefined);
});

test("detail return links resolve map, search, direct and invalid flows safely", () => {
  assert.deepEqual(detailReturnLink("mapa"), {
    href: "/mapa",
    label: "Wróć do mapy",
    ariaLabel: "Wróć do mapy",
  });
  assert.deepEqual(detailReturnLink("szukaj"), {
    href: "/szukaj",
    label: "Wróć do wyników",
    ariaLabel: "Wróć do wyników wyszukiwania",
  });
  assert.equal(detailReturnLink(undefined).href, "/szukaj");
  assert.equal(detailReturnLink("xyz").href, "/szukaj");
});
