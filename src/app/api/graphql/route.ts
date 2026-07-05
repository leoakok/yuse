import { auth } from "@/auth";
import { resolveBackendGraphqlUrl } from "@/lib/auth/backend-url";
import { AuthConfigError, signProxyJwt } from "@/lib/auth/proxy-jwt";
import {
  MAX_GRAPHQL_BODY_BYTES,
  enforceRateLimit,
  readBodyWithLimit,
} from "@/lib/security/rate-limit";

function graphqlError(message: string, status: number) {
  return Response.json(
    { errors: [{ message }] },
    { status, headers: { "Content-Type": "application/json" } },
  );
}

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
    return graphqlError("Unauthorized", 401);
  }

  const limited = enforceRateLimit(request, `graphql:${session.user.id}`, 120, 60 * 1000);
  if (limited) {
    return graphqlError("Too many requests", 429);
  }

  let token: string;
  try {
    token = await signProxyJwt(session);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error("[graphql proxy]", error.message);
      return graphqlError("Server auth is not configured", 503);
    }
    throw error;
  }

  const backendUrl = resolveBackendGraphqlUrl();
  const body = await readBodyWithLimit(request, MAX_GRAPHQL_BODY_BYTES);
  if (body instanceof Response) {
    return graphqlError("Request body too large", 413);
  }

  let upstream: Response;
  try {
    upstream = await fetch(backendUrl, {
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
      console.error("[graphql proxy] backend unreachable at", backendUrl, error);
      return graphqlError("Backend is unavailable", 503);
    }
    throw error;
  }

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
