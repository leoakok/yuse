import type { PortfolioWithContent } from "@/lib/types/portfolio";
import { backendBaseUrl } from "@/lib/auth/backend-url";
import { mapPortfolioWithContent } from "@/lib/portfolio/preview";

export async function fetchPublicPortfolio(
  username: string,
  slug?: string
): Promise<PortfolioWithContent | undefined> {
  const base = backendBaseUrl();
  const path = slug?.trim()
    ? `/public/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`
    : `/public/${encodeURIComponent(username)}`;

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      next: { revalidate: 60 },
    });
  } catch {
    return undefined;
  }

  if (response.status === 404) return undefined;
  if (!response.ok) return undefined;

  const data = (await response.json()) as PortfolioWithContent;
  return mapPortfolioWithContent(data);
}
