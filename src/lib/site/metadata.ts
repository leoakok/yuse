import type { Metadata } from "next";
import { portfolioSiteOrigin } from "@/lib/portfolio/share-url";

export const SITE_NAME = "Yuse";
export const SITE_TAGLINE = "More than a one-page summary";
export const SITE_HERO_HEADLINE = "You are more than a one-page summary.";
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
  "digital twin resume",
  "AI career assistant",
];
export const INSTAGRAM_HANDLE = "yuse.one";
export const INSTAGRAM_URL = "https://www.instagram.com/yuse.one";

/** File-convention OG route generated from the landing hero (no CTAs). */
export const DEFAULT_OG_IMAGE = "/opengraph-image";
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;
export const DEFAULT_OG_IMAGE_ALT = "Yuse. You are more than a one-page summary.";

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
        "text/plain": [
          { url: "/llms.txt", title: "llms.txt" },
          { url: "/ai.txt", title: "ai.txt" },
          { url: "/humans.txt", title: "humans.txt" },
        ],
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
        "max-video-preview": -1,
      },
    },
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
      locale: "en_GB",
      url,
      title: `${SITE_NAME}. ${SITE_HERO_HEADLINE}`,
      description: SITE_DESCRIPTION,
      images: defaultOgImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME}. ${SITE_HERO_HEADLINE}`,
      description: SITE_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
    icons: {
      icon: "/yuse-logo.png",
      apple: "/yuse-logo@2x.png",
    },
    manifest: "/manifest.webmanifest",
    other: {
      "instagram:site": INSTAGRAM_URL,
      "instagram:creator": `@${INSTAGRAM_HANDLE}`,
    },
  };
}

export function buildHomeMetadata(): Metadata {
  const title = `${SITE_NAME}. ${SITE_HERO_HEADLINE}`;
  const description =
    "Yuse is an AI-native CV builder that learns your real work, connects your GitHub and LinkedIn, and tailors a CV to every job you go after.";
  const url = siteUrl();

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: SITE_KEYWORDS,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: SITE_NAME,
      locale: "en_GB",
      images: defaultOgImages(),
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
  const logoUrl = absoluteUrl("/yuse-logo@2x.png");
  const ogImageUrl = absoluteUrl(DEFAULT_OG_IMAGE);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        legalName: SITE_NAME,
        url,
        logo: {
          "@type": "ImageObject",
          url: logoUrl,
        },
        image: ogImageUrl,
        description: SITE_DESCRIPTION,
        slogan: SITE_HERO_HEADLINE,
        sameAs: [INSTAGRAM_URL],
        brand: {
          "@type": "Brand",
          name: SITE_NAME,
          slogan: SITE_HERO_HEADLINE,
          logo: logoUrl,
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url,
        name: SITE_NAME,
        alternateName: ["yuse.one", "Yuse AI"],
        description: SITE_DESCRIPTION,
        inLanguage: "en-GB",
        publisher: { "@id": organizationId },
        about: { "@id": organizationId },
        potentialAction: {
          "@type": "ReadAction",
          target: url,
        },
      },
      {
        "@type": "WebApplication",
        "@id": appId,
        name: SITE_NAME,
        url,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Career tools",
        operatingSystem: "Web",
        description: SITE_DESCRIPTION,
        featureList: [
          "AI resume and CV builder",
          "Digital Twin work memory",
          "Portfolio publishing",
          "Job application tracker",
          "GitHub and LinkedIn connections",
        ],
        browserRequirements: "Requires a modern web browser and JavaScript.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "GBP",
          description: "Invite-only beta",
          availability: "https://schema.org/LimitedAvailability",
        },
        publisher: { "@id": organizationId },
        isPartOf: { "@id": websiteId },
        image: ogImageUrl,
      },
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: `${SITE_NAME}. ${SITE_HERO_HEADLINE}`,
        description: SITE_DESCRIPTION,
        isPartOf: { "@id": websiteId },
        about: { "@id": organizationId },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: ogImageUrl,
          width: DEFAULT_OG_IMAGE_WIDTH,
          height: DEFAULT_OG_IMAGE_HEIGHT,
        },
        inLanguage: "en-GB",
      },
    ],
  };
}

export function robotsDisallowPaths() {
  return [...PRIVATE_PATH_PREFIXES];
}
