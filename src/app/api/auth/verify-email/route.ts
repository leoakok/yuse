import { backendBaseUrl } from "@/lib/auth/backend-url";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token?.trim()) {
    return Response.json({ error: "missing verification token" }, { status: 400 });
  }

  const upstream = await fetch(
    `${backendBaseUrl()}/auth/verify-email?token=${encodeURIComponent(token.trim())}`,
    { cache: "no-store" }
  );

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
