import { Suspense } from "react";
import { VerifyEmailClient } from "@/components/auth/verify-email-client";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailClient />
    </Suspense>
  );
}

function VerifyEmailFallback() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Email verification</h1>
      <p className="text-sm text-muted-foreground">Verifying your email…</p>
    </main>
  );
}
