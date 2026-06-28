import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      googleId?: string;
    };
    sessionBootstrap?: boolean;
    clearSessionBootstrap?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleId?: string;
    picture?: string;
    sessionBootstrap?: boolean;
  }
}
