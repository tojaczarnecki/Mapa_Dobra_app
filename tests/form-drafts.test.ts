import test from "node:test";
import assert from "node:assert/strict";
import { clearFormDraft, readFormDraft, writeFormDraft } from "../src/lib/form-drafts.ts";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage: storage, sessionStorage: storage },
});

function writeRaw(value: unknown) {
  storage.setItem("mapa-dobra:draft:test", JSON.stringify(value));
}

function validRecord(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    formType: "test",
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    data: { value: "saved" },
    ...overrides,
  };
}

test("expired draft is removed", () => {
  writeRaw(validRecord({ expiresAt: new Date(Date.now() - 1).toISOString() }));
  assert.equal(readFormDraft("test", "local"), null);
  assert.equal(storage.getItem("mapa-dobra:draft:test"), null);
});

test("malformed JSON is removed", () => {
  storage.setItem("mapa-dobra:draft:test", "not-json");
  assert.equal(readFormDraft("test", "local"), null);
  assert.equal(storage.getItem("mapa-dobra:draft:test"), null);
});

test("invalid expiry is removed", () => {
  writeRaw(validRecord({ expiresAt: "not-a-date" }));
  assert.equal(readFormDraft("test", "local"), null);
  assert.equal(storage.getItem("mapa-dobra:draft:test"), null);
});

test("invalid identity is removed", () => {
  writeRaw(validRecord({ formType: "other" }));
  assert.equal(readFormDraft("test", "local"), null);
  assert.equal(storage.getItem("mapa-dobra:draft:test"), null);
});

test("resume read keeps the draft until discard or clear", () => {
  writeFormDraft({ formType: "test", storage: "local", ttlMs: 60_000, data: { value: "saved" } });
  assert.deepEqual(readFormDraft("test", "local")?.data, { value: "saved" });
  assert.deepEqual(readFormDraft("test", "local")?.data, { value: "saved" });
  clearFormDraft("test", "local");
  assert.equal(readFormDraft("test", "local"), null);
});

test("clear removes a stored draft", () => {
  writeFormDraft({ formType: "test", storage: "local", ttlMs: 60_000, data: { value: "saved" } });
  clearFormDraft("test", "local");
  assert.equal(storage.getItem("mapa-dobra:draft:test"), null);
});
