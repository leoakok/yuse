import { mapResumeWithContent } from "@/lib/api/cv-api";
import { backendBaseUrl } from "@/lib/auth/backend-url";
import type { DesignShare, CuratedTheme } from "@/lib/types/design-share";
import type { ResumeWithContent } from "@/lib/types/cv";

export type PublicDesignContent = {
  designShare: DesignShare;
  preview: ResumeWithContent;
};

function publicFetchBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return backendBaseUrl();
}

export async function fetchPublicDesign(id: string): Promise<PublicDesignContent | undefined> {
  const base = publicFetchBase();
  const path =
    typeof window !== "undefined"
      ? `/api/public/designs/${encodeURIComponent(id)}`
      : `${base}/public/designs/${encodeURIComponent(id)}`;

  let response: Response;
  try {
    response = await fetch(path, {
      next: { revalidate: 60 },
    });
  } catch {
    return undefined;
  }
  if (response.status === 404) return undefined;
  if (!response.ok) return undefined;

  const data = (await response.json()) as {
    designShare?: DesignShare;
    preview?: ResumeWithContent;
  };
  if (!data.designShare || !data.preview) return undefined;
  return {
    designShare: data.designShare,
    preview: mapResumeWithContent(data.preview),
  };
}

export async function fetchFeaturedDesigns(): Promise<CuratedTheme[]> {
  return fetchCuratedThemes(
    typeof window !== "undefined" ? "/api/public/featured-designs" : "/public/featured-designs",
  );
}

export async function fetchPublicThemes(): Promise<CuratedTheme[]> {
  return fetchCuratedThemes(
    typeof window !== "undefined" ? "/api/public/themes" : "/public/themes",
  );
}

async function fetchCuratedThemes(path: string): Promise<CuratedTheme[]> {
  const base = publicFetchBase();
  const url = typeof window !== "undefined" ? path : `${base}${path}`;

  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate: 60 } });
  } catch {
    return [];
  }
  if (!response.ok) return [];
  const data = (await response.json()) as { themes?: CuratedTheme[] };
  return (data.themes ?? []).map(mapCuratedTheme);
}

function mapCuratedTheme(theme: CuratedTheme): CuratedTheme {
  return {
    ...theme,
    preview: mapResumeWithContent(theme.preview),
  };
}

export function buildDesignShareUrl(urlPath: string): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "https://yuse.one";
  const path = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
  return `${origin}${path}`;
}
