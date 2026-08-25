import { createApplicationRateLimiter } from "../security/rate-limiter.ts";

const limiter = createApplicationRateLimiter(60 * 1000, 30);

export async function consumeGeocodingRateLimit(key: string, now = Date.now()) {
  return limiter.consume(key, now);
}
