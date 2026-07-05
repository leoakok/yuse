"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not join the waitlist. Try again.");
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-xl border border-border bg-background/60 px-5 py-6 text-center backdrop-blur-sm">
        <p className="text-base font-medium">You are on the list</p>
        <p className="text-sm text-muted-foreground">
          Thanks. We will email you when you are in.
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="waitlist-email" className="sr-only">
          Email
        </label>
        <Input
          id="waitlist-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
        />
        {error ? (
          <p className="text-sm text-destructive sm:absolute sm:mt-11" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" disabled={loading} className="shrink-0 px-5">
        {loading ? "Joining…" : "Join the beta"}
        <ArrowRight />
      </Button>
    </form>
  );
}
