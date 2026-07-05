"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    if (!token?.trim()) {
      setStatus("error");
      setMessage("This verification link is missing a token.");
      return;
    }

    let cancelled = false;
    void fetch(`/api/auth/verify-email?token=${encodeURIComponent(token.trim())}`)
      .then(async (response) => {
        const data = (await response.json()) as { message?: string; error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setStatus("error");
          setMessage(data.error || "This verification link is invalid or expired.");
          return;
        }
        setStatus("success");
        setMessage(data.message || "Email verified. You can return to Yuse.");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not verify your email. Try again in a moment.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Email verification</h1>
      <p className={cn("text-sm", status === "error" ? "text-destructive" : "text-muted-foreground")}>
        {message}
      </p>
      {status === "success" ? (
        <Link href="/home" className={cn(buttonVariants(), "w-fit")}>
          Go to Yuse
        </Link>
      ) : status === "error" ? (
        <div className="flex flex-wrap gap-2">
          <Link href="/settings" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
            Open settings
          </Link>
          <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      ) : null}
    </main>
  );
}
