import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { buildLoginMetadata } from "@/lib/site/metadata";

export const metadata: Metadata = buildLoginMetadata();

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "Google sign-in is not configured correctly. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and AUTH_SECRET in .env, then restart the dev server.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The sign-in link expired. Try again.",
  OAuthSignInError:
    "Could not reach Google. Check your network connection and try again.",
  OAuthCallbackError: "Google sign-in failed. Try again or use email sign-in.",
};

function authErrorMessage(error?: string): string | null {
  if (!error) return null;
  return AUTH_ERROR_MESSAGES[error] ?? "Sign-in failed. Try again.";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const authError = authErrorMessage(params.error);

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <YuseLogo className="size-12" aria-hidden={false} role="img" aria-label="Yuse" />
        <h1 className="text-3xl font-semibold tracking-tight">Yuse</h1>
        <p className="text-muted-foreground">
          Sign in to create and manage your CVs.
        </p>
      </div>
      <LoginForm authError={authError} />
    </main>
  );
}
