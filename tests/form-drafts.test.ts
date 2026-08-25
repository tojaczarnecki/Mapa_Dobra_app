import assert from "node:assert/strict";
import test from "node:test";
import { clearFormDraft, draftKey, readFormDraft, writeFormDraft } from "../src/lib/form-drafts.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("draft keys are namespaced and entity-scoped", () => {
  assert.equal(draftKey("help-request"), "mapa-dobra:draft:help-request");
  assert.equal(draftKey("place-change", "place/A"), "mapa-dobra:draft:place-change:place%2FA");
  assert.notEqual(draftKey("place-change", "A"), draftKey("place-change", "B"));
});

test("draft repository restores valid drafts and clears expired or incompatible versions", () => {
  const localStorage = new MemoryStorage();
  Object.assign(globalThis, { window: { localStorage, sessionStorage: new MemoryStorage() } });
  assert.equal(writeFormDraft({ formType: "new-place", storage: "local", ttlMs: 60_000, data: { name: "Test" }, currentStep: "basic" }), true);
  assert.deepEqual(readFormDraft("new-place", "local")?.data, { name: "Test" });
  assert.equal(readFormDraft("new-place", "local", "other"), null);
  localStorage.setItem(draftKey("new-place"), JSON.stringify({ version: 99, formType: "new-place", updatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 1000).toISOString(), data: {} }));
  assert.equal(readFormDraft("new-place", "local"), null);
  clearFormDraft("new-place", "local");
});
