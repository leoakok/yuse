import { auth } from "@/auth";
import { backendBaseUrl } from "@/lib/auth/backend-url";
import { AuthConfigError, signProxyJwt } from "@/lib/auth/proxy-jwt";
import {
  MAX_ASSISTANT_BODY_BYTES,
  enforceRateLimit,
  readBodyWithLimit,
} from "@/lib/security/rate-limit";

function isBackendUnreachable(error: unknown): boolean {
  if (!(error instanceof TypeError)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("failed to parse url") ||
    message.includes("econnrefused") ||
    message.includes("enotfound")
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = enforceRateLimit(
    request,
    `automation-run:${session.user.id}`,
    10,
    60 * 1000,
  );
  if (limited) {
    return limited;
  }

  let token: string;
  try {
    token = await signProxyJwt(session);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error("[automation run stream]", error.message);
      return Response.json({ error: "Server auth is not configured" }, { status: 503 });
    }
    throw error;
  }

  const body = await readBodyWithLimit(request, MAX_ASSISTANT_BODY_BYTES);
  if (body instanceof Response) {
    return body;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${backendBaseUrl()}/automations/run/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
      cache: "no-store",
    });
  } catch (error) {
    if (isBackendUnreachable(error)) {
      console.error("[automation run stream] backend unreachable", error);
      return Response.json({ error: "Backend is unavailable" }, { status: 503 });
    }
    throw error;
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(text || "Automation run stream failed", {
      status: upstream.status,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
