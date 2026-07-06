"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { claimInvite } from "@/lib/api/invite-api";
import type { PublicInvitePreview } from "@/lib/types/admin";

export function InviteRedeemPage({ preview }: { preview: PublicInvitePreview }) {
  const [email, setEmail] = useState(preview.emailRestrict ?? "");
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClaim(event: React.FormEvent) {
    event.preventDefault();
    if (preview.expired) {
      toast.error("This invite is no longer active.");
      return;
    }
    setLoading(true);
    try {
      await claimInvite(preview.code, email);
      setClaimed(true);
      toast.success("Invite claimed. You can sign up now.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not claim invite.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16">
      <p className="text-sm font-medium text-muted-foreground">Beta invite</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {preview.label?.trim() || "You are invited"}
      </h1>
      {preview.expired ? (
        <p className="mt-3 text-muted-foreground">This invite is no longer active.</p>
      ) : claimed ? (
        <div className="mt-6 space-y-4">
          <p className="text-muted-foreground">
            Your email is approved for beta access. Sign in or create an account to get started.
          </p>
          <Link href="/login" className={buttonVariants()}>
            Sign in
          </Link>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={(event) => void handleClaim(event)}>
          {preview.emailRestrict ? (
            <p className="text-sm text-muted-foreground">
              This invite is for <span className="font-medium text-foreground">{preview.emailRestrict}</span>.
            </p>
          ) : null}
          {preview.remainingUses != null ? (
            <p className="text-sm text-muted-foreground">
              {preview.remainingUses} spot{preview.remainingUses === 1 ? "" : "s"} left on this invite.
            </p>
          ) : null}
          <div className="space-y-2">
            <label htmlFor="invite-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              readOnly={Boolean(preview.emailRestrict)}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Claiming…" : "Claim invite"}
          </Button>
        </form>
      )}
    </main>
  );
}
