import type { Metadata } from "next";
import type { PortfolioWithContent } from "@/lib/types/portfolio";
import { effectiveContactPhotoUrl } from "@/lib/cv/contact-photo";

export function buildPublicPortfolioMetadata(content: PortfolioWithContent): Metadata {
  const name = content.contactProfile?.fullName || content.portfolio.title;
  const title = content.portfolio.tagline
    ? `${name}, ${content.portfolio.tagline}`
    : name;
  const description =
    content.portfolio.about?.trim() ||
    content.contactProfile?.headline ||
    `Portfolio by ${name}`;
  const ogImage =
    content.contactProfile?.ogImageUrl ||
    effectiveContactPhotoUrl(content.contactProfile) ||
    undefined;
  const icons = content.contactProfile?.faviconUrl
    ? { icon: content.contactProfile.faviconUrl }
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(ogImage ? { images: [{ url: ogImage, alt: name }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    icons,
  };
}
