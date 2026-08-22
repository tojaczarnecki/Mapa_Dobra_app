import { createApplicationRateLimiter } from "../security/rate-limiter.ts";

const limiter = createApplicationRateLimiter(15 * 60 * 1000, 5);

export function consumeLoginAttempt(key: string, now = Date.now()) {
  return limiter.consume(key, now);
}

export function resetLoginAttempts(key: string) {
  limiter.reset(key);
}
