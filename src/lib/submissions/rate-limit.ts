import { createApplicationRateLimiter, getTrustedClientAddress } from "../security/rate-limiter.ts";

const profiles = {
  legacy: createApplicationRateLimiter(15 * 60 * 1000, 5),
  help: createApplicationRateLimiter(15 * 60 * 1000, 20),
  newPlace: createApplicationRateLimiter(15 * 60 * 1000, 8),
  placeChange: createApplicationRateLimiter(15 * 60 * 1000, 8),
} as const;

export function getRequestAddress(request: Request) {
  return getTrustedClientAddress(request.headers);
}

export async function consumeSubmissionRateLimit(key: string, now = Date.now(), profile: keyof typeof profiles = "legacy") {
  return profiles[profile].consume(key, now);
}
