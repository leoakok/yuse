import { normalizeSlug } from "@/lib/portfolio/slug";

const DEFAULT_SITE_ORIGIN = "https://yuse.one";

export function portfolioSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return configured || DEFAULT_SITE_ORIGIN;
}

export function buildPortfolioShareUrl(username: string, portfolioSlug?: string | null) {
  const origin = portfolioSiteOrigin();
  const user = normalizeSlug(username);
  if (!user) return origin;
  if (portfolioSlug?.trim()) {
    const slug = normalizeSlug(portfolioSlug);
    if (slug) return `${origin}/${user}/${slug}`;
  }
  return `${origin}/${user}`;
}
