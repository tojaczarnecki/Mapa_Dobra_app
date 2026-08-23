import { createApplicationRateLimiter, getTrustedClientAddress } from "../security/rate-limiter.ts";

const limiter = createApplicationRateLimiter(15 * 60 * 1000, 5);

export function getRequestAddress(request: Request) {
  return getTrustedClientAddress(request.headers);
}

export async function consumeSubmissionRateLimit(key: string, now = Date.now()) {
  return limiter.consume(key, now);
}
