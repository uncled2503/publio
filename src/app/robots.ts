import type { MetadataRoute } from "next";

const SITE_URL = "https://www.publio.website";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/api/", "/onboarding", "/admin"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
