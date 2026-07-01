import type { Metadata } from "next";
import { portfolioSiteOrigin } from "@/lib/portfolio/share-url";

export const SITE_NAME = "Yuse";
export const SITE_TAGLINE = "More than a one-page summary";
export const SITE_DESCRIPTION =
  "Yuse is an AI-native resume and portfolio builder with a job tracker. Connect GitHub and LinkedIn, tailor your CV to every role, and publish a portfolio that reflects your real work.";
export const SITE_KEYWORDS = [
  "Yuse",
  "resume builder",
  "CV builder",
  "portfolio builder",
  "job tracker",
  "AI resume",
  "tailored CV",
  "GitHub portfolio",
  "LinkedIn resume",
  "job application",
  "career tools",
];
export const INSTAGRAM_HANDLE = "yuse.one";
export const INSTAGRAM_URL = "https://www.instagram.com/yuse.one";
export const DEFAULT_OG_IMAGE = "/social/og-homepage.png";
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 900;
export const DEFAULT_OG_IMAGE_ALT = "Yuse, AI resume and portfolio builder";

const PRIVATE_PATH_PREFIXES = [
  "/home",
  "/resumes",
  "/portfolios",
  "/settings",
  "/admin",
  "/job-tracker",
  "/connections",
  "/digital-twin",
  "/welcome",
  "/print",
  "/logo-preview",
  "/_/backend",
] as const;

export function siteUrl() {
  return portfolioSiteOrigin();
}

export function absoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${normalized}`;
}

export function defaultOgImages() {
  return [
    {
      url: DEFAULT_OG_IMAGE,
      width: DEFAULT_OG_IMAGE_WIDTH,
      height: DEFAULT_OG_IMAGE_HEIGHT,
      alt: DEFAULT_OG_IMAGE_ALT,
    },
  ];
}

export function buildRootMetadata(): Metadata {
  const url = siteUrl();

  return {
    metadataBase: new URL(url),
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    keywords: SITE_KEYWORDS,
    category: "technology",
    alternates: {
      canonical: url,
      languages: {
        "en-GB": url,
      },
      types: {
        "text/plain": [{ url: "/llms.txt" }, { url: "/ai.txt" }],
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
      locale: "en_GB",
      url,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: defaultOgImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
    icons: {
      icon: "/yuse-logo.png",
      apple: "/yuse-logo@2x.png",
    },
    manifest: "/manifest.webmanifest",
    other: {
      "instagram:creator": `@${INSTAGRAM_HANDLE}`,
    },
  };
}

export function buildHomeMetadata(): Metadata {
  const title = `${SITE_NAME}, ${SITE_TAGLINE}`;
  const description =
    "Yuse is an AI-native CV builder that learns your real work, connects your GitHub and LinkedIn, and tailors a CV to every job you go after.";
  const url = siteUrl();

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: DEFAULT_OG_IMAGE_WIDTH,
          height: DEFAULT_OG_IMAGE_HEIGHT,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function buildLoginMetadata(): Metadata {
  return {
    title: "Sign in",
    description: `Sign in to ${SITE_NAME} to build resumes, portfolios, and track job applications.`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export function buildLandingJsonLd() {
  const url = siteUrl();
  const organizationId = `${url}/#organization`;
  const websiteId = `${url}/#website`;
  const appId = `${url}/#app`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        url,
        logo: absoluteUrl("/yuse-logo@2x.png"),
        description: SITE_DESCRIPTION,
        sameAs: [INSTAGRAM_URL],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en-GB",
        publisher: { "@id": organizationId },
      },
      {
        "@type": "WebApplication",
        "@id": appId,
        name: SITE_NAME,
        url,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: SITE_DESCRIPTION,
        browserRequirements: "Requires a modern web browser and JavaScript.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "GBP",
        },
        publisher: { "@id": organizationId },
        isPartOf: { "@id": websiteId },
      },
    ],
  };
}

export function robotsDisallowPaths() {
  return [...PRIVATE_PATH_PREFIXES];
}
