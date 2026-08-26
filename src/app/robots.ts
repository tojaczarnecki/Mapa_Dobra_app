import type { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl();
  const staging = process.env.DEPLOYMENT_ENV === "staging";
  return {
    rules: [
      staging
        ? { userAgent: "*", disallow: "/" }
        : { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    ],
    sitemap: staging || !baseUrl ? undefined : new URL("/sitemap.xml", baseUrl).toString(),
  };
}
