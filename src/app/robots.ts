import type { MetadataRoute } from "next";
import { robotsDisallowPaths, siteUrl } from "@/lib/site/metadata";

const AI_DISCOVERY_ALLOW = ["/", "/llms.txt", "/ai.txt", "/humans.txt", "/sitemap.xml"];

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
        allow: AI_DISCOVERY_ALLOW,
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "ChatGPT-User",
        allow: AI_DISCOVERY_ALLOW,
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "OAI-SearchBot",
        allow: AI_DISCOVERY_ALLOW,
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "Google-Extended",
        allow: AI_DISCOVERY_ALLOW,
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "anthropic-ai",
        allow: AI_DISCOVERY_ALLOW,
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "ClaudeBot",
        allow: AI_DISCOVERY_ALLOW,
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "Claude-Web",
        allow: AI_DISCOVERY_ALLOW,
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "PerplexityBot",
        allow: AI_DISCOVERY_ALLOW,
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "Applebot-Extended",
        allow: AI_DISCOVERY_ALLOW,
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "Bytespider",
        allow: AI_DISCOVERY_ALLOW,
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "meta-externalagent",
        allow: AI_DISCOVERY_ALLOW,
        disallow: robotsDisallowPaths(),
      },
      {
        userAgent: "FacebookBot",
        allow: AI_DISCOVERY_ALLOW,
        disallow: robotsDisallowPaths(),
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
