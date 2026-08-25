import { createApplicationRateLimiter } from "../security/rate-limiter.ts";
import { createHash } from "node:crypto";

const limiter = createApplicationRateLimiter(15 * 60 * 1000, 5);
const accountLimiter = createApplicationRateLimiter(15 * 60 * 1000, 8);

export async function consumeLoginAttempt(key: string, now = Date.now()) {
  return limiter.consume(key, now);
}

export async function resetLoginAttempts(key: string) {
  limiter.reset(key);
}

export function loginAccountKey(email: string) {
  return `admin-account:${createHash("sha256").update(email).digest("hex")}`;
}

export async function consumeLoginAccountAttempt(key: string, now = Date.now()) {
  return accountLimiter.consume(key, now);
}

export async function resetLoginAccountAttempts(key: string) {
  accountLimiter.reset(key);
}
