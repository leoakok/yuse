import { backendBaseUrl } from "@/lib/auth/backend-url";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(request, "public-design", 60, 60 * 1000);
  if (limited) return limited;

  const { id } = await context.params;
  const trimmed = id?.trim() ?? "";
  if (!trimmed) {
    return new Response(JSON.stringify({ message: "Design id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(
    `${backendBaseUrl()}/public/designs/${encodeURIComponent(trimmed)}`,
    { next: { revalidate: 60 } },
  );

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
    },
  });
}
