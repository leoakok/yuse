import { auth } from "@/auth";
import { backendBaseUrl } from "@/lib/auth/backend-url";
import { AuthConfigError, signProxyJwt } from "@/lib/auth/proxy-jwt";

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

  let token: string;
  try {
    token = await signProxyJwt(session);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error("[assistant stream]", error.message);
      return Response.json(
        { error: "Server auth is not configured. Set AUTH_SECRET in .env." },
        { status: 503 },
      );
    }
    throw error;
  }

  const body = await request.text();
  let upstream: Response;
  try {
    upstream = await fetch(`${backendBaseUrl()}/assistant/stream`, {
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
      console.error("[assistant stream] backend unreachable", error);
      return Response.json(
        { error: "Backend is unavailable. Start it with: npm run start." },
        { status: 503 },
      );
    }
    throw error;
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(text || "Assistant stream failed", { status: upstream.status });
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
