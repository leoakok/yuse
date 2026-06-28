import { SignJWT } from "jose";
import type { Session } from "next-auth";

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new AuthConfigError("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function signProxyJwt(session: Session): Promise<string> {
  if (!session.user?.id || !session.user.email) {
    throw new Error("Session is missing user id or email");
  }

  const jwtPayload: Record<string, string> = {
    email: session.user.email,
    name: session.user.name ?? session.user.email,
    picture: session.user.image ?? "",
  };
  if (session.user.googleId) {
    jwtPayload.googleId = session.user.googleId;
  }
  if (session.sessionBootstrap) {
    jwtPayload.bootstrap = "1";
  }

  return new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secretKey());
}
