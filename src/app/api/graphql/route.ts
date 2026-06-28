import { auth } from "@/auth";
import { resolveBackendGraphqlUrl } from "@/lib/auth/backend-url";
import { AuthConfigError, signProxyJwt } from "@/lib/auth/proxy-jwt";

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

  let token: string;
  try {
    token = await signProxyJwt(session);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error("[graphql proxy]", error.message);
      return graphqlError(
        "Server auth is not configured. Set AUTH_SECRET in .env (must match backend/.env).",
        503,
      );
    }
    throw error;
  }

  const backendUrl = resolveBackendGraphqlUrl();
  const body = await request.text();

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
      return graphqlError(
        "Backend is unavailable. Start it with: npm run start (or docker compose up -d).",
        503,
      );
    }
    throw error;
  }

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
