import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  const now = new Date();

  return [
    {
      url,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
