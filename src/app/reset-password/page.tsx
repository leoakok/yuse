import { Suspense } from "react";
import { ResetPasswordClient } from "@/components/auth/reset-password-client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordClient />
    </Suspense>
  );
}

function ResetPasswordFallback() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
      <p className="text-sm text-muted-foreground">Loading…</p>
    </main>
  );
}
