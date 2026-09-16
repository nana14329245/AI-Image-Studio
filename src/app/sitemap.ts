import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

/** Only the pages a signed-out visitor can actually reach. */
const PUBLIC_PATHS = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/signup", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/login", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/refund", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/contact", priority: 0.3, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  return PUBLIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
