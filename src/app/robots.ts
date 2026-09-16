import type { MetadataRoute } from "next";
import { getSiteUrl, isPubliclyHosted } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  // Without a real site URL the only address available is localhost, so an
  // allow-rule here would describe a site that cannot be crawled anyway. Refusing
  // outright also stops a preview deployment being indexed by accident.
  if (!isPubliclyHosted()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Everything behind sign-in. These already redirect to /login, but saying
        // so keeps them out of crawl budget and out of search results.
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/account",
          "/gallery",
          "/brand-kit",
          "/promotions",
          "/upscale",
          "/product",
          "/ads",
          "/portrait",
          "/reset-password",
          "/setup",
        ],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
