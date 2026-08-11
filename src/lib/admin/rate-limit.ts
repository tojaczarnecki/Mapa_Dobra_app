type LoginRateLimitEntry = {
  attempts: number;
  resetAt: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const globalForLoginRateLimit = globalThis as unknown as {
  adminLoginRateLimit?: Map<string, LoginRateLimitEntry>;
};

const loginRateLimitStore =
  globalForLoginRateLimit.adminLoginRateLimit ??
  new Map<string, LoginRateLimitEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForLoginRateLimit.adminLoginRateLimit = loginRateLimitStore;
}

function removeExpiredEntries(now: number) {
  for (const [key, entry] of loginRateLimitStore) {
    if (entry.resetAt <= now) loginRateLimitStore.delete(key);
  }
}

export function consumeLoginAttempt(key: string, now = Date.now()) {
  removeExpiredEntries(now);
  const current = loginRateLimitStore.get(key);

  if (!current) {
    loginRateLimitStore.set(key, { attempts: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.attempts >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.attempts += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetLoginAttempts(key: string) {
  loginRateLimitStore.delete(key);
}
