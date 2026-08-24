import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/app/admin/login/actions.ts", import.meta.url),
  "utf8",
);

test("admin login redirects outside the caught authentication work", () => {
  const catchIndex = source.indexOf("  } catch (error) {");
  const redirectIndex = source.lastIndexOf('redirect("/admin")');

  assert.notEqual(catchIndex, -1);
  assert.ok(redirectIndex > catchIndex);
  assert.doesNotMatch(source, /LOGIN_STAGE_|login-debug\.log/);
});

test("invalid credentials return the form error before session creation", () => {
  const invalidCredentialsIndex = source.indexOf("if (!admin?.active || !passwordMatches)");
  const sessionCreationIndex = source.indexOf("transaction.adminSession.create");

  assert.match(source, /Nieprawidłowy e-mail lub hasło\./);
  assert.ok(invalidCredentialsIndex >= 0);
  assert.ok(sessionCreationIndex > invalidCredentialsIndex);
});
