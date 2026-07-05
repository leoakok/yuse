import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { backendBaseUrl } from "@/lib/auth/backend-url";
import { AuthConfigError, signProxyJwt } from "@/lib/auth/proxy-jwt";
import { appOriginFromRequest, isAllowedRedirectUrl } from "@/lib/security/redirect";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  let token: string;
  try {
    token = await signProxyJwt(session);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      redirect("/connections?error=Server%20auth%20is%20not%20configured");
    }
    throw error;
  }

  const upstream = await fetch(`${backendBaseUrl()}/auth/github/start`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    redirect: "manual",
    cache: "no-store",
  });

  const location = upstream.headers.get("location");
  if (upstream.status >= 300 && upstream.status < 400 && location) {
    if (isAllowedRedirectUrl(location, appOriginFromRequest(request))) {
      redirect(location);
    }
  }

  let errorMessage = "Could not start GitHub sign-in";
  try {
    const body = (await upstream.json()) as { error?: string };
    if (body.error) {
      errorMessage = body.error;
    }
  } catch {
    // upstream did not return JSON
  }

  redirect(`/connections?error=${encodeURIComponent(errorMessage)}`);
}
