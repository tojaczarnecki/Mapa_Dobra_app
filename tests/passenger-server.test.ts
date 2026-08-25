import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getListenTarget, getPassengerApi } from "../server-config.js";

test("normal Node startup uses the numeric PORT", () => {
  assert.equal(getPassengerApi({} as unknown as typeof globalThis), null);
  assert.equal(getListenTarget({ passenger: null, port: 3101 }), 3101);
  assert.throws(() => getListenTarget({ passenger: null, port: undefined }), /PORT/);
});

test("Passenger startup configures reverse port binding", () => {
  const calls: unknown[] = [];
  const passenger = getPassengerApi({
    PhusionPassenger: { configure: (options: unknown) => calls.push(options) },
  } as unknown as typeof globalThis);
  assert.ok(passenger);
  assert.deepEqual(calls, [{ autoInstall: false }]);
  assert.equal(getListenTarget({ passenger, port: undefined }), "passenger");
});

test("server wires exactly one Passenger listener", () => {
  const source = readFileSync(new URL("../server.js", import.meta.url), "utf8");
  const configSource = readFileSync(new URL("../server-config.js", import.meta.url), "utf8");
  assert.match(source, /server\.listen\(listenTarget/);
  assert.match(source, /getListenTarget\(\{ passenger, port \}\)/);
  assert.match(configSource, /return \"passenger\"/);
});
