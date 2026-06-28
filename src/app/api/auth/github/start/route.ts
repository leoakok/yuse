import { SignJWT } from "jose";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { backendBaseUrl } from "@/lib/auth/backend-url";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

async function backendJWT(session: {
  user: { id: string; email?: string | null; name?: string | null; image?: string | null; googleId?: string };
}) {
  const jwtPayload: Record<string, string> = {
    email: session.user.email ?? "",
    name: session.user.name ?? session.user.email ?? "",
    picture: session.user.image ?? "",
  };
  if (session.user.googleId) {
    jwtPayload.googleId = session.user.googleId;
  }

  return new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secretKey());
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  const token = await backendJWT(session);
  const upstream = await fetch(`${backendBaseUrl()}/auth/github/start`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    redirect: "manual",
    cache: "no-store",
  });

  const location = upstream.headers.get("location");
  if (upstream.status >= 300 && upstream.status < 400 && location) {
    redirect(location);
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
