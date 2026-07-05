import { backendBaseUrl } from "@/lib/auth/backend-url";
import {
  MAX_REGISTER_BODY_BYTES,
  enforceRateLimit,
  readBodyWithLimit,
} from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "reset-password", 5, 15 * 60 * 1000);
  if (limited) {
    return limited;
  }

  const body = await readBodyWithLimit(request, MAX_REGISTER_BODY_BYTES);
  if (body instanceof Response) {
    return body;
  }

  const upstream = await fetch(`${backendBaseUrl()}/auth/reset-password`, {
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
