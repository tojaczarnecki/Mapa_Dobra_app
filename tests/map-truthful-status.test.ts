import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mobileSheet = readFileSync(resolve(root, "src/components/map/mobile-map-sheet.tsx"), "utf8");
const mapMarker = readFileSync(resolve(root, "src/components/map/map-marker.tsx"), "utf8");

test("mobile map result sheet does not expose static distance as user-relative information", () => {
  assert.doesNotMatch(mobileSheet, /place\.distanceLabel/);
});

test("map marker accessibility status uses the shared public place resolver", () => {
  assert.match(mapMarker, /resolvePublicPlaceStatus/);
  assert.match(mapMarker, /profileKind: place\.profileKind/);
  assert.match(mapMarker, /mobileSeasonActive: place\.mobileSeasonActive/);
  assert.doesNotMatch(mapMarker, /if \(place\.profileKind === "FOOD_SHARING"\) return "dostęp 24\/7/);
});
