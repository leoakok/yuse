import type { MetadataRoute } from "next";
import { robotsDisallowPaths, siteUrl } from "@/lib/site/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/llms.txt", "/ai.txt"],
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/llms.txt", "/ai.txt"],
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/llms.txt", "/ai.txt"],
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/", "/llms.txt", "/ai.txt"],
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/llms.txt", "/ai.txt"],
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/llms.txt", "/ai.txt"],
        disallow: robotsDisallowPaths(),
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
