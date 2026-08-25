import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source() {
  return readFileSync(new URL("../server.cjs", import.meta.url), "utf8");
}

test("CommonJS startup uses a numeric PORT with a safe fallback", () => {
  const text = source();
  assert.match(text, /const port = Number\.isInteger\(parsedPort\) && parsedPort > 0 \? parsedPort : 3000/);
  assert.match(text, /Number\.isInteger\(parsedPort\)/);
});

test("CommonJS startup leaves Passenger in default auto-install mode", () => {
  const text = source();
  assert.doesNotMatch(text, /PhusionPassenger/);
  assert.doesNotMatch(text, /configure\(\{\s*autoInstall\s*:\s*false/);
  assert.doesNotMatch(text, /listen\(\s*["']passenger["']/);
  assert.match(text, /server\.listen\(port/);
});

test("startup uses the required Next custom-server pieces", () => {
  const text = source();
  assert.match(text, /const app = next\(\{ dev: false, dir: releasePath \}\)/);
  assert.match(text, /const handle = app\.getRequestHandler\(\)/);
  assert.match(text, /const server = createServer/);
});

test("server.cjs is self-contained CommonJS and has one listener", () => {
  const text = source();
  assert.doesNotMatch(text, /\bimport\s/);
  assert.doesNotMatch(text, /\bexport\s/);
  assert.doesNotMatch(text, /\bawait\s/);
  assert.match(text, /require\("node:http"\)/);
  assert.equal((text.match(/server\.listen\(port/g) ?? []).length, 1);
});
