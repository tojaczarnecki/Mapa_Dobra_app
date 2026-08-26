import { normalizeHttpUrl } from "./urls.ts";

const nipWeights = [6, 5, 7, 2, 3, 4, 5, 6, 7] as const;

export function normalizeDictionaryLabel(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export function dictionarySlug(value: string) {
  return normalizeDictionaryLabel(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pl-PL")
    .replace(/ł/gu, "l")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

export function normalizeNip(value: string): string | null {
  const digits = value.replace(/[\s-]/gu, "");
  if (!/^\d{10}$/u.test(digits)) return null;
  const checksum = nipWeights.reduce((sum, weight, index) => sum + Number(digits[index]) * weight, 0) % 11;
  return checksum === Number(digits[9]) ? digits : null;
}

export function normalizeRegon(value: string): string | null {
  const digits = value.replace(/[\s-]/gu, "");
  return /^\d{9}(?:\d{5})?$/u.test(digits) ? digits : null;
}

export function normalizeKrs(value: string): string | null {
  const digits = value.replace(/[\s-]/gu, "");
  return /^\d{10}$/u.test(digits) ? digits : null;
}

export type SocialPlatformValue = "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "YOUTUBE" | "TIKTOK" | "OTHER";

export function socialPlatformForUrl(value: string): SocialPlatformValue | null {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return null;
  const host = new URL(normalized).hostname.toLocaleLowerCase("en-US").replace(/^www\./u, "");
  if (host === "facebook.com" || host.endsWith(".facebook.com")) return "FACEBOOK";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "INSTAGRAM";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "LINKEDIN";
  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) return "YOUTUBE";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "TIKTOK";
  return "OTHER";
}

export function normalizeSocialLink(value: string) {
  return normalizeHttpUrl(value);
}
