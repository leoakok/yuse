import { backendBaseUrl } from "@/lib/auth/backend-url";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const limited = enforceRateLimit(request, "public-invite", 30, 60 * 1000);
  if (limited) {
    return limited;
  }

  const { code } = await context.params;
  const trimmed = code?.trim() ?? "";
  if (!trimmed) {
    return new Response(JSON.stringify({ message: "Invite code required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(
    `${backendBaseUrl()}/invites/${encodeURIComponent(trimmed)}`,
    { cache: "no-store" },
  );

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
