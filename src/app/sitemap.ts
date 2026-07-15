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
    {
      url: `${url}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${url}/llms.txt`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${url}/ai.txt`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${url}/humans.txt`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.1,
    },
  ];
}
