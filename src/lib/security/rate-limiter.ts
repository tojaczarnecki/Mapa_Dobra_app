import type { RuntimeEnvironment } from "../config/env.ts";
import { Redis } from "@upstash/redis";

type RateLimitEntry = { count: number; resetAt: number };
export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };
export interface RateLimiter { consume(key: string, now?: number): Promise<RateLimitResult>; reset(key: string): Promise<void>; }

export function getTrustedClientAddress(headers: Headers, environment: RuntimeEnvironment = process.env) {
  if (environment.TRUSTED_PROXY_MODE === "single" || environment.TRUSTED_PROXY_MODE === "vercel") {
    return headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "proxy-network";
  }
  return "untrusted-network";
}

export function createInMemoryRateLimiter(windowMs: number, maxRequests: number): RateLimiter {
  const store = new Map<string, RateLimitEntry>();
  return {
    async consume(key, now = Date.now()) {
      for (const [storedKey, entry] of store) if (entry.resetAt <= now) store.delete(storedKey);
      const current = store.get(key);
      if (!current) { store.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true, retryAfterSeconds: 0 }; }
      if (current.count >= maxRequests) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
      current.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
    async reset(key) { store.delete(key); },
  };
}

function createUpstashRateLimiter(windowMs: number, maxRequests: number, environment: RuntimeEnvironment) {
  const redis = new Redis({
    url: environment.UPSTASH_REDIS_REST_URL!,
    token: environment.UPSTASH_REDIS_REST_TOKEN!,
  });
  const prefix = "mapa-dobra:rate-limit";

  return {
    async consume(key: string, now = Date.now()) {
      const redisKey = `${prefix}:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) await redis.pexpire(redisKey, windowMs);
      if (count > maxRequests) {
        const ttl = await redis.pttl(redisKey);
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(Math.max(ttl, 1000) / 1000)) };
      }
      void now;
      return { allowed: true, retryAfterSeconds: 0 };
    },
    async reset(key: string) {
      await redis.del(`${prefix}:${key}`);
    },
  } satisfies RateLimiter;
}

export function createApplicationRateLimiter(windowMs: number, maxRequests: number, environment: RuntimeEnvironment = process.env) {
  if (environment.NODE_ENV === "production" && environment.RATE_LIMIT_MODE === "upstash") {
    return createUpstashRateLimiter(windowMs, maxRequests, environment);
  }
  if (environment.NODE_ENV === "production") {
    return {
      async consume() { return { allowed: false, retryAfterSeconds: 60 }; },
      async reset() { /* Fail closed until shared storage is configured. */ },
    } satisfies RateLimiter;
  }
  return createInMemoryRateLimiter(windowMs, maxRequests);
}

export function assertRateLimiterConfigured(environment = process.env) {
  if (environment.NODE_ENV === "production" && environment.RATE_LIMIT_MODE !== "upstash") {
    throw new Error("A shared production rate limiter is required before multi-instance deployment.");
  }
}
