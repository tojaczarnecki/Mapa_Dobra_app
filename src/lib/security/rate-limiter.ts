import type { RuntimeEnvironment } from "../config/env.ts";

type RateLimitEntry = { count: number; resetAt: number };
export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };
export interface RateLimiter { consume(key: string, now?: number): RateLimitResult; reset(key: string): void; }

export function getTrustedClientAddress(headers: Headers, environment: RuntimeEnvironment = process.env) {
  if (environment.TRUSTED_PROXY_MODE === "single" || environment.TRUSTED_PROXY_MODE === "vercel") {
    return headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "proxy-network";
  }
  return "untrusted-network";
}

export function createInMemoryRateLimiter(windowMs: number, maxRequests: number): RateLimiter {
  const store = new Map<string, RateLimitEntry>();
  return {
    consume(key, now = Date.now()) {
      for (const [storedKey, entry] of store) if (entry.resetAt <= now) store.delete(storedKey);
      const current = store.get(key);
      if (!current) { store.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true, retryAfterSeconds: 0 }; }
      if (current.count >= maxRequests) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
      current.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
    reset(key) { store.delete(key); },
  };
}

export function createApplicationRateLimiter(windowMs: number, maxRequests: number) {
  if (process.env.NODE_ENV === "production") {
    return {
      consume() {
        throw new Error("A shared production rate limiter adapter must be configured before serving requests.");
      },
      reset() {
        throw new Error("A shared production rate limiter adapter must be configured before serving requests.");
      },
    } satisfies RateLimiter;
  }
  return createInMemoryRateLimiter(windowMs, maxRequests);
}

export function assertRateLimiterConfigured(environment = process.env) {
  if (environment.NODE_ENV === "production" && environment.RATE_LIMIT_MODE !== "upstash") {
    throw new Error("A shared production rate limiter is required before multi-instance deployment.");
  }
}
