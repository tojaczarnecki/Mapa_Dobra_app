import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const script = resolve("scripts/iqhost-release.sh");

function makeRelease(base: string, buildId: string, includeEnv = false) {
  const source = join(base, `source-${buildId}`);
  const archive = join(base, `release-${buildId}.tar.gz`);
  mkdirSync(join(source, ".next"), { recursive: true });
  mkdirSync(join(source, "node_modules", "next"), { recursive: true });
  mkdirSync(join(source, "public"), { recursive: true });
  writeFileSync(join(source, ".next", "BUILD_ID"), `${buildId}\n`);
  writeFileSync(join(source, "node_modules", "next", "runtime.js"), "export {};\n");
  writeFileSync(join(source, "public", "health.txt"), "ok\n");
  writeFileSync(join(source, "package.json"), '{"name":"fixture"}\n');
  if (includeEnv) writeFileSync(join(source, ".env"), "SECRET=should-not-ship\n");

  const entries = [".next", "node_modules", "public", "package.json"];
  if (includeEnv) entries.push(".env");
  execFileSync("tar", ["-czf", archive, ...entries], { cwd: source });
  return archive;
}

function makeAppRoot(base: string) {
  const appRoot = join(base, "app");
  mkdirSync(appRoot, { recursive: true });
  writeFileSync(join(appRoot, ".deployment-env"), "staging\n");
  writeFileSync(join(appRoot, "server.cjs"), "// stable Passenger entry\n");
  return appRoot;
}

test("IQHost release script activates atomically and can roll back", () => {
  const base = mkdtempSync(join(tmpdir(), "mapa-dobra-release-"));
  try {
    const appRoot = makeAppRoot(base);
    const first = makeRelease(base, "build-one");
    const second = makeRelease(base, "build-two");

    execFileSync("bash", [script, "activate", appRoot, first, "staging"], { stdio: "pipe" });
    assert.equal(realpathSync(join(appRoot, "current")), join(appRoot, "releases", "build-one"));

    execFileSync("bash", [script, "activate", appRoot, second, "staging"], { stdio: "pipe" });
    assert.equal(realpathSync(join(appRoot, "current")), join(appRoot, "releases", "build-two"));
    assert.equal(readFileSync(join(appRoot, ".previous-release"), "utf8").trim(), join(appRoot, "releases", "build-one"));

    execFileSync("bash", [script, "rollback", appRoot, "staging"], { stdio: "pipe" });
    assert.equal(realpathSync(join(appRoot, "current")), join(appRoot, "releases", "build-one"));
    assert.equal(readFileSync(join(appRoot, "tmp", "restart.txt"), "utf8"), "");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("IQHost release script refuses archives containing environment files", () => {
  const base = mkdtempSync(join(tmpdir(), "mapa-dobra-release-"));
  try {
    const appRoot = makeAppRoot(base);
    const archive = makeRelease(base, "build-safe", true);

    assert.throws(
      () => execFileSync("bash", [script, "activate", appRoot, archive, "staging"], { stdio: "pipe" }),
      /Command failed/u,
    );
    assert.throws(() => realpathSync(join(appRoot, "current")));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
