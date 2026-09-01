import test from "node:test";
import assert from "node:assert/strict";
import { mapDetailsHref } from "../src/components/map/map-place-links.ts";

test("map place details keep the complete map return context", () => {
  const href = mapDetailsHref("/lodz/jedzenie/miejsce", "/mapa?kategoria=jedzenie&otwarte=1&sort=distance");
  assert.equal(
    href,
    "/lodz/jedzenie/miejsce?from=mapa&returnTo=%2Fmapa%3Fkategoria%3Djedzenie%26otwarte%3D1%26sort%3Ddistance",
  );
});
