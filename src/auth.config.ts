import type { NextAuthConfig } from "next-auth";

import { backendBaseUrl } from "@/lib/auth/backend-url";
import { isPublicPortfolioPath } from "@/lib/portfolio/slug";

const PUBLIC_PATH_PREFIXES = [
  "/llms.txt",
  "/ai.txt",
  "/humans.txt",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/twitter-image",
  "/manifest.webmanifest",
] as const;

function isExplicitPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile?.email) {
        return true;
      }

      try {
        const res = await fetch(`${backendBaseUrl()}/auth/access-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: profile.email }),
          cache: "no-store",
        });
        if (!res.ok) {
          return true;
        }
        const data = (await res.json()) as { status?: string };
        if (data.status === "pending") {
          return "/login?error=WaitlistPending";
        }
      } catch {
        return "/login?error=OAuthCallbackError";
      }

      return true;
    },
    async jwt({ token, account, profile, user, trigger, session }) {
      if (trigger === "update" && session?.clearSessionBootstrap) {
        token.sessionBootstrap = false;
      }
      if (account) {
        token.sessionBootstrap = true;
      }
      if (account?.provider === "credentials" && user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        delete token.googleId;
        delete token.picture;
        return token;
      }
      if (account?.provider === "google" && account.providerAccountId) {
        const fallbackGoogleSub = `google-${account.providerAccountId}`;
        const previousSub = typeof token.sub === "string" ? token.sub : "";
        let resolvedSub = fallbackGoogleSub;
        try {
          const res = await fetch(`${backendBaseUrl()}/auth/resolve-google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              googleId: account.providerAccountId,
            }),
            cache: "no-store",
          });
          if (res.ok) {
            const data = (await res.json()) as { userId?: string };
            if (data.userId) {
              resolvedSub = data.userId;
            }
          }
        } catch {
          resolvedSub = fallbackGoogleSub;
        }
        // If a signed-in user is connecting Google from settings, keep their subject
        // and let backend session sync attach the Google credential to the same account.
        if (previousSub && !previousSub.startsWith("google-")) {
          token.sub = previousSub;
        } else {
          token.sub = resolvedSub;
        }
        token.googleId = account.providerAccountId;
      }
      if (profile) {
        const googleProfile = profile as { email?: string; name?: string; picture?: string };
        if (googleProfile.email) token.email = googleProfile.email;
        if (googleProfile.name) token.name = googleProfile.name;
        if (googleProfile.picture) token.picture = googleProfile.picture;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.email = (token.email as string | undefined) ?? session.user.email;
        session.user.name = (token.name as string | undefined) ?? session.user.name;
        session.user.image = (token.picture as string | undefined) ?? session.user.image;
        session.user.googleId = token.googleId as string | undefined;
      }
      session.sessionBootstrap = Boolean(token.sessionBootstrap);
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLanding = pathname === "/";
      const isLogin = pathname.startsWith("/login");
      const isInvite = pathname.startsWith("/r/");
      const isAuthApi = pathname.startsWith("/api/auth");
      const isRegisterApi = pathname.startsWith("/api/register");
      const isWaitlistApi = pathname.startsWith("/api/waitlist");
      const isGraphqlProxy = pathname.startsWith("/api/graphql");
      const isGitHubOAuthCallback = pathname === "/api/auth/github/callback";

      // The marketing landing page is always public for signed-in and signed-out visitors.
      if (isLanding) {
        return true;
      }

      if (isLogin) {
        if (auth?.user) {
          return Response.redirect(new URL("/home", request.nextUrl));
        }
        return true;
      }

      if (isInvite) {
        return true;
      }

      if (pathname.startsWith("/d/")) {
        return true;
      }

      if (pathname.startsWith("/api/public")) {
        return true;
      }

      if (isAuthApi || isRegisterApi || isWaitlistApi) {
        return true;
      }

      if (isGitHubOAuthCallback) {
        return true;
      }

      if (isGraphqlProxy) {
        return !!auth?.user;
      }

      if (isExplicitPublicPath(pathname)) {
        return true;
      }

      if (isPublicPortfolioPath(pathname)) {
        return true;
      }

      return !!auth?.user;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
