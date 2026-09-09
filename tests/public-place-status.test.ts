import assert from "node:assert/strict";
import test from "node:test";
import { resolvePublicPlaceStatus } from "../src/lib/public/status-presentation.ts";

test("operational closure wins over FOOD_SHARING 24/7 messaging", () => {
  const presentation = resolvePublicPlaceStatus({
    status: "closed",
    profileKind: "FOOD_SHARING",
  });

  assert.equal(presentation.publicStatus, "absent");
  assert.equal(presentation.label, "ZAMKNIĘTE TERAZ");
  assert.equal(presentation.informational, undefined);
});

test("FOOD_SHARING uses 24/7 messaging only when current state is not closed or uncertain", () => {
  const presentation = resolvePublicPlaceStatus({
    status: "open",
    profileKind: "FOOD_SHARING",
  });

  assert.equal(presentation.publicStatus, "confirmed");
  assert.equal(presentation.label, "Dostęp 24/7");
  assert.equal(presentation.informational, true);
});

test("freshness warning wins over FOOD_SHARING profile messaging", () => {
  const presentation = resolvePublicPlaceStatus({
    status: "open",
    freshnessWarning: true,
    profileKind: "FOOD_SHARING",
  });

  assert.equal(presentation.publicStatus, "unknown");
  assert.match(presentation.label, /według ostatnich danych/i);
});

test("operational closure wins over MOBILE_SERVICE season messaging", () => {
  const presentation = resolvePublicPlaceStatus({
    status: "closed",
    profileKind: "MOBILE_SERVICE",
    mobileSeasonLabel: "kwiecień–październik",
    mobileSeasonActive: true,
  });

  assert.equal(presentation.publicStatus, "absent");
  assert.equal(presentation.label, "ZAMKNIĘTE TERAZ");
});

test("active mobile service season is presented only after current state checks", () => {
  const presentation = resolvePublicPlaceStatus({
    status: "openToday",
    profileKind: "MOBILE_SERVICE",
    mobileSeasonLabel: "kwiecień–październik",
    mobileSeasonActive: true,
  });

  assert.equal(presentation.publicStatus, "confirmed");
  assert.equal(presentation.label, "Sezonowo · kwiecień–październik");
});

test("mobile service outside season is unavailable even when generic status says openToday", () => {
  const presentation = resolvePublicPlaceStatus({
    status: "openToday",
    profileKind: "MOBILE_SERVICE",
    mobileSeasonLabel: "kwiecień–październik",
    mobileSeasonActive: false,
  });

  assert.equal(presentation.publicStatus, "absent");
  assert.equal(presentation.label, "Poza sezonem");
});
