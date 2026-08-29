import assert from "node:assert/strict";
import test from "node:test";
import {
  FIRST_LAUNCH_COMPLETE_KEY,
  canFinishSplash,
  clampProgress,
  fillHeightForProgress,
  getBrowserStorage,
  markFirstLaunchComplete,
  readFirstLaunchComplete,
  shouldShowLaunchSplash,
  stagedProgress,
} from "../src/lib/app/launch-splash.ts";

test("first launch shows mobile splash and completed launch does not", () => {
  assert.equal(shouldShowLaunchSplash({ completed: false, isMobile: true, force: false }), true);
  assert.equal(shouldShowLaunchSplash({ completed: true, isMobile: true, force: false }), false);
  assert.equal(shouldShowLaunchSplash({ completed: false, isMobile: false, force: false }), false);
});

test("development force mode can show the splash again without changing normal rules", () => {
  assert.equal(shouldShowLaunchSplash({ completed: true, isMobile: false, force: true }), true);
});

test("progress is clamped and maps directly to logo fill height", () => {
  assert.equal(clampProgress(-10), 0);
  assert.equal(clampProgress(65), 65);
  assert.equal(clampProgress(140), 100);
  assert.equal(fillHeightForProgress(25), "25%");
  assert.equal(fillHeightForProgress(140), "100%");
  assert.equal(stagedProgress(0, 1500), 8);
  assert.equal(stagedProgress(1500, 1500), 84);
  assert.equal(canFinishSplash(false, 9999, 1500), false);
  assert.equal(canFinishSplash(true, 1499, 1500), false);
  assert.equal(canFinishSplash(true, 1500, 1500), true);
});

test("first-run storage is safe when unavailable", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  assert.equal(readFirstLaunchComplete(storage), false);
  markFirstLaunchComplete(storage);
  assert.equal(values.get(FIRST_LAUNCH_COMPLETE_KEY), "1");
  assert.equal(readFirstLaunchComplete(storage), true);
  assert.doesNotThrow(() => markFirstLaunchComplete(null));
  assert.doesNotThrow(() => readFirstLaunchComplete(null));
});

test("browser storage access fails closed", () => {
  assert.equal(typeof getBrowserStorage, "function");
});
