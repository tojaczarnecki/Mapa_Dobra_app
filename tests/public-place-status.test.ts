import assert from "node:assert/strict";
import test from "node:test";
import { resolvePublicPlaceStatus } from "../src/lib/public/status-presentation.ts";

test("fresh operational closure wins over FOOD_SHARING 24/7 messaging", () => {
  const presentation = resolvePublicPlaceStatus({
    status: "closed",
    profileKind: "FOOD_SHARING",
  });

  assert.equal(presentation.publicStatus, "absent");
  assert.equal(presentation.label, "ZAMKNIĘTE TERAZ");
  assert.equal(presentation.informational, undefined);
});

test("stale operational closure is presented as unconfirmed instead of definitive", () => {
  const presentation = resolvePublicPlaceStatus({
    status: "closed",
    freshnessWarning: true,
  });

  assert.equal(presentation.publicStatus, "unknown");
  assert.match(presentation.label, /według ostatnich danych/i);
  assert.match(presentation.label, /zamknięte/i);
  assert.equal(presentation.showStandardHours, false);
});

test("stale closure also wins over FOOD_SHARING and MOBILE_SERVICE profile messaging", () => {
  for (const profileKind of ["FOOD_SHARING", "MOBILE_SERVICE"] as const) {
    const presentation = resolvePublicPlaceStatus({
      status: "closed",
      freshnessWarning: true,
      profileKind,
      mobileSeasonLabel: profileKind === "MOBILE_SERVICE" ? "kwiecień–październik" : undefined,
      mobileSeasonActive: profileKind === "MOBILE_SERVICE" ? true : undefined,
    });

    assert.equal(presentation.publicStatus, "unknown");
    assert.match(presentation.label, /według ostatnich danych/i);
  }
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

test("fresh operational closure wins over MOBILE_SERVICE season messaging", () => {
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

test("seasonless mobile service can be confirmed by its current schedule", () => {
  const presentation = resolvePublicPlaceStatus({
    status: "open",
    profileKind: "MOBILE_SERVICE",
  });

  assert.equal(presentation.publicStatus, "confirmed");
  assert.equal(presentation.label, "KURSUJE WEDŁUG ROZKŁADU");
});

test("uncertainty still wins for a seasonless mobile service", () => {
  const presentation = resolvePublicPlaceStatus({
    status: "unknownHours",
    profileKind: "MOBILE_SERVICE",
  });

  assert.equal(presentation.publicStatus, "unknown");
  assert.equal(presentation.label, "BRAK POTWIERDZONYCH GODZIN");
});
