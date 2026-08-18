import { createHash, randomBytes } from "node:crypto";

export const INVITATION_DURATION_MS = 48 * 60 * 60 * 1000;
export const PASSWORD_RESET_DURATION_MS = 60 * 60 * 1000;

export function createAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function accessTokenExpiry(purpose: "INVITATION" | "PASSWORD_RESET", now = new Date()) {
  return new Date(
    now.getTime() + (purpose === "INVITATION" ? INVITATION_DURATION_MS : PASSWORD_RESET_DURATION_MS),
  );
}

export function isUsableAccessToken(
  token: { usedAt: Date | null; expiresAt: Date },
  now = new Date(),
) {
  return token.usedAt === null && token.expiresAt > now;
}
