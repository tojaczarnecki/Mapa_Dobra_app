import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const favoritesList = readFileSync(resolve(root, "src/components/favorites/favorites-list.tsx"), "utf8");
const favoritesPage = readFileSync(resolve(root, "src/app/ulubione/page.tsx"), "utf8");

test("online favorites distinguish missing records from stale local snapshots", () => {
  assert.match(favoritesPage, /<FavoritesList livePlaces=\{livePlaces\} liveDataAvailable \/>/);
  assert.match(favoritesList, /if \(offlineMode \|\| !liveDataAvailable\) return favorites/);
  assert.match(favoritesList, /NIEDOSTĘPNE W AKTUALNYCH DANYCH/);
  assert.match(favoritesList, /phone: undefined/);
  assert.match(favoritesList, /unavailable: true/);
});

test("unavailable favorites do not link to potentially removed place detail", () => {
  assert.match(favoritesList, /place\.unavailable \? \([\s\S]*<div className="block min-w-0 p-4">/);
  assert.match(favoritesList, /Znajdź inne/);
});
