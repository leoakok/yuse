import type { NextAuthConfig } from "next-auth";

import { isPublicPortfolioPath } from "@/lib/portfolio/slug";

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
    jwt({ token, account, profile, user, trigger, session }) {
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
        token.googleId = account.providerAccountId;
        token.sub = `google-${account.providerAccountId}`;
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
      const isAuthApi = pathname.startsWith("/api/auth");
      const isRegisterApi = pathname.startsWith("/api/register");
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

      if (isAuthApi || isRegisterApi) {
        return true;
      }

      if (isGitHubOAuthCallback) {
        return true;
      }

      if (isGraphqlProxy) {
        return !!auth?.user;
      }

      if (isPublicPortfolioPath(pathname)) {
        return true;
      }

      return !!auth?.user;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
