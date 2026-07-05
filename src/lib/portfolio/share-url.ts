import { normalizeSlug } from "@/lib/portfolio/slug";

const DEFAULT_SITE_ORIGIN = "https://yuse.one";

export function portfolioSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return configured || DEFAULT_SITE_ORIGIN;
}

export function buildShareUrl(username: string, slug?: string | null) {
  const origin = portfolioSiteOrigin();
  const user = normalizeSlug(username);
  if (!user) return origin;
  if (slug?.trim()) {
    const segment = normalizeSlug(slug);
    if (segment) return `${origin}/${user}/${segment}`;
  }
  return `${origin}/${user}`;
}

/** @deprecated Use buildShareUrl */
export const buildPortfolioShareUrl = buildShareUrl;
