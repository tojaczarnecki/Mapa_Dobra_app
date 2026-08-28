import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
export function getServerActionsAllowedOrigins(baseUrl = process.env.APP_BASE_URL): string[] {
  if (!baseUrl) return [];

  try {
    const url = new URL(baseUrl);
    if (!url.hostname || (url.protocol !== "https:" && url.protocol !== "http:")) return [];
    return [url.hostname];
  } catch {
    return [];
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
  `connect-src 'self'${isProduction ? "" : " ws: wss:"}`,
  "font-src 'self' data:",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.20"],
  experimental: {
    serverActions: {
      allowedOrigins: getServerActionsAllowedOrigins(),
      bodySizeLimit: "6mb",
    },
  },
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
      ],
    }];
  },
};

export default nextConfig;
