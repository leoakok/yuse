import { backendBaseUrl } from "@/lib/auth/backend-url";
import { enforceRateLimit } from "@/lib/security/rate-limit";

async function proxyPublicThemes(request: Request, path: string) {
  const limited = enforceRateLimit(request, "public-themes", 60, 60 * 1000);
  if (limited) return limited;

  const upstream = await fetch(`${backendBaseUrl()}${path}`, {
    next: { revalidate: 60 },
  });

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
    },
  });
}

export async function GET(request: Request) {
  return proxyPublicThemes(request, "/public/featured-designs");
}
