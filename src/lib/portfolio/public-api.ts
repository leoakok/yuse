import type { ResumeWithContent } from "@/lib/types/cv";
import type { PortfolioWithContent } from "@/lib/types/portfolio";
import { backendBaseUrl } from "@/lib/auth/backend-url";
import { mapPortfolioWithContent } from "@/lib/portfolio/preview";

export type PublicContent =
  | { kind: "portfolio"; portfolio: PortfolioWithContent }
  | { kind: "resume"; resume: ResumeWithContent };

export async function fetchPublicContent(
  username: string,
  slug?: string
): Promise<PublicContent | undefined> {
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

  const data = (await response.json()) as {
    kind?: string;
    portfolio?: PortfolioWithContent;
    resume?: ResumeWithContent;
  };

  if (data.kind === "resume" && data.resume) {
    return { kind: "resume", resume: data.resume };
  }
  if (data.portfolio) {
    return { kind: "portfolio", portfolio: mapPortfolioWithContent(data.portfolio) };
  }
  return undefined;
}

/** @deprecated Use fetchPublicContent */
export async function fetchPublicPortfolio(username: string, slug?: string) {
  const content = await fetchPublicContent(username, slug);
  if (!content || content.kind !== "portfolio") return undefined;
  return content.portfolio;
}
