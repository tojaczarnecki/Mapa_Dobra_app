import test from "node:test";
import assert from "node:assert/strict";
import { mapDetailsHref } from "../src/components/map/map-place-links.ts";

test("map place details keep the complete canonical map return context", () => {
  const href = mapDetailsHref("/lodz/jedzenie/miejsce", "/mapa?kategoria=jedzenie&otwarte=1");
  assert.equal(
    href,
    "/lodz/jedzenie/miejsce?from=mapa&returnTo=%2Fszukaj%3Fkategoria%3Djedzenie%26otwarte%3D1%26view%3Dmap",
  );
});
