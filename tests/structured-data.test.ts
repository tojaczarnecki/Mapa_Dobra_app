import assert from "node:assert/strict";
import test from "node:test";
import {
  dictionarySlug,
  normalizeDictionaryLabel,
  normalizeKrs,
  normalizeNip,
  normalizeRegon,
  normalizeSocialLink,
  socialPlatformForUrl,
} from "../src/lib/structured-data.ts";

test("normalizes reusable dictionary labels and slugs", () => {
  assert.equal(normalizeDictionaryLabel("  Osoby   starsze "), "Osoby starsze");
  assert.equal(dictionarySlug("  Wejście bez schodów "), "wejscie-bez-schodow");
});

test("normalizes and validates Polish NIP", () => {
  assert.equal(normalizeNip("526-104-08-28"), "5261040828");
  assert.equal(normalizeNip("526 104 08 29"), null);
  assert.equal(normalizeNip("123"), null);
});

test("validates registry identifiers without inventing lookups", () => {
  assert.equal(normalizeRegon("123456789"), "123456789");
  assert.equal(normalizeRegon("12345678901234"), "12345678901234");
  assert.equal(normalizeRegon("12345678"), null);
  assert.equal(normalizeKrs("0000123456"), "0000123456");
  assert.equal(normalizeKrs("123"), null);
});

test("recognizes social platforms and preserves safe URLs", () => {
  assert.equal(socialPlatformForUrl("instagram.com/mapadobra"), "INSTAGRAM");
  assert.equal(socialPlatformForUrl("https://www.facebook.com/mapadobra"), "FACEBOOK");
  assert.equal(socialPlatformForUrl("https://youtu.be/example"), "YOUTUBE");
  assert.equal(socialPlatformForUrl("https://example.com/profile"), "OTHER");
  assert.equal(normalizeSocialLink(" javascript:alert(1) "), null);
});
