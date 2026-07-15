import { backendBaseUrl } from "@/lib/auth/backend-url";
import {
  enforceRateLimit,
  readBodyWithLimit,
} from "@/lib/security/rate-limit";

const MAX_CLAIM_INVITE_BODY_BYTES = 4 * 1024;

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "claim-invite", 10, 60 * 60 * 1000);
  if (limited) {
    return limited;
  }

  const body = await readBodyWithLimit(request, MAX_CLAIM_INVITE_BODY_BYTES);
  if (body instanceof Response) {
    return body;
  }

  const upstream = await fetch(`${backendBaseUrl()}/auth/claim-invite`, {
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
