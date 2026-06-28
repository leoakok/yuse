import { backendBaseUrl } from "@/lib/auth/backend-url";

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await fetch(`${backendBaseUrl()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
