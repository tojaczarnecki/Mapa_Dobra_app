"use server";

import { appendFileSync } from "node:fs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, isAcceptableAdminPassword, verifyPassword } from "@/lib/admin/password";
import { consumeLoginAttempt, resetLoginAttempts } from "@/lib/admin/rate-limit";
import { getTrustedClientAddress } from "@/lib/security/rate-limiter";
import {
  createSessionToken,
  getSessionExpiry,
  hashSessionToken,
  setAdminSessionCookie,
} from "@/lib/admin/session";

export type LoginActionState = {
  error?: string;
};

const INVALID_CREDENTIALS = "Nieprawidłowy e-mail lub hasło.";
const LOGIN_DEBUG_PATH = "/home/host11515/logs/mapa-dobra-staging/login-debug.log";

function redactDebugText(value: unknown) {
  return String(value)
    .replace(/(?:postgres(?:ql)?:\/\/)[^\s)]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/(password|token|secret|authorization|cookie|session)[^\s:=]*\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

function writeLoginDebug(entry: Record<string, unknown>) {
  if (process.env.DEPLOYMENT_ENV !== "staging") return;
  appendFileSync(
    LOGIN_DEBUG_PATH,
    `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}

function normalizeEmail(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.trim().toLocaleLowerCase("pl-PL").slice(0, 320);
}

export async function loginAdmin(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  let stage = "LOGIN_STAGE_1 input";
  writeLoginDebug({ stage });

  try {
    const email = normalizeEmail(formData.get("email"));
    const passwordEntry = formData.get("password");
    const password = typeof passwordEntry === "string" ? passwordEntry : "";
    const headerStore = await headers();
    const rateLimitKey = getTrustedClientAddress(headerStore);
    const rateLimit = await consumeLoginAttempt(rateLimitKey);

    if (!rateLimit.allowed) {
      return {
        error: "Zbyt wiele prób logowania. Spróbuj ponownie za kilkanaście minut.",
      };
    }

    if (!email || !isAcceptableAdminPassword(password)) {
      return { error: INVALID_CREDENTIALS };
    }

    stage = "LOGIN_STAGE_2 user lookup";
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    writeLoginDebug({ stage });

    stage = "LOGIN_STAGE_3 password verify start";
    writeLoginDebug({ stage });
    const passwordMatches = admin?.active && admin.passwordHash
      ? await verifyPassword(password, admin.passwordHash)
      : Boolean(await hashPassword(password)) && false;
    stage = `LOGIN_STAGE_4 password verify ${passwordMatches ? "success" : "failure"}`;
    writeLoginDebug({ stage });

    if (!admin?.active || !passwordMatches) {
      return { error: INVALID_CREDENTIALS };
    }

    stage = "LOGIN_STAGE_5 session create start";
    writeLoginDebug({ stage });
    const token = createSessionToken();
    const expiresAt = getSessionExpiry();

    await prisma.$transaction(async (transaction) => {
      await transaction.adminUser.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });
      await transaction.adminSession.create({
        data: {
          adminUserId: admin.id,
          tokenHash: hashSessionToken(token),
          expiresAt,
        },
      });
      await transaction.auditLog.create({
        data: {
          adminUserId: admin.id,
          action: "LOGIN",
          entityType: "ADMIN_USER",
          entityId: admin.id,
          note: "Prawidłowe logowanie administratora",
        },
      });
    });
    stage = "LOGIN_STAGE_6 session created";
    writeLoginDebug({ stage });

    await resetLoginAttempts(rateLimitKey);
    await setAdminSessionCookie(token, expiresAt);
    stage = "LOGIN_STAGE_7 cookie set";
    writeLoginDebug({ stage });
    stage = "LOGIN_STAGE_8 redirect";
    writeLoginDebug({ stage });
    redirect("/admin");
  } catch (error) {
    writeLoginDebug({
      stage,
      errorName: redactDebugText(error instanceof Error ? error.name : "UnknownError"),
      errorMessage: redactDebugText(error instanceof Error ? error.message : error),
      errorStack: redactDebugText(error instanceof Error ? error.stack : undefined),
    });
    throw error;
  }
}
