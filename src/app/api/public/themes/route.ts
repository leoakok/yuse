import { backendBaseUrl } from "@/lib/auth/backend-url";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "public-themes", 60, 60 * 1000);
  if (limited) return limited;

  const upstream = await fetch(`${backendBaseUrl()}/public/themes`, {
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
