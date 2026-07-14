"use client";

import { useEffect, useState } from "react";
import { LogOut, Star } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { GitHubMark } from "@/components/brand/github-mark";
import { useWorkspace } from "@/components/layout/workspace-provider";
import {
  WorkspaceSection,
  WorkspaceSections,
} from "@/components/layout/workspace-section";
import { EditableFieldRow } from "@/components/settings/editable-field-row";
import { EmailChangeRow } from "@/components/settings/email-change-sheet";
import {
  PasswordChangeRow,
  PasswordSetSheet,
  type PasswordChangeValues,
  type PasswordSetValues,
} from "@/components/settings/password-change-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  changeEmail,
  changePassword,
  removePassword,
  resendVerificationEmail,
  setPassword,
  unlinkGoogle,
} from "@/lib/api/settings-api";
import { setUsername } from "@/lib/api/portfolio-api";
import { portfolioSiteOrigin } from "@/lib/portfolio/share-url";
import { validateSlug } from "@/lib/portfolio/slug";
import {
  YUSE_GITHUB_CONTRIBUTING_URL,
  YUSE_GITHUB_ISSUES_URL,
  YUSE_GITHUB_URL,
} from "@/lib/site/github";
import { SUPPORT_MAILTO } from "@/lib/support";
import { cn } from "@/lib/utils";

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function planLabel(plan: string) {
  return plan === "pro" ? "Pro" : "Free";
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4 shrink-0", className)} aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.3 14.7 2.4 12 2.4 6.8 2.4 2.6 6.6 2.6 11.8S6.8 21.2 12 21.2c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

export function SettingsWorkspace() {
  const { user, workspace, updateUser } = useWorkspace();
  const searchParams = useSearchParams();
  const siteHost = portfolioSiteOrigin().replace(/^https?:\/\//, "");
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [busyMethod, setBusyMethod] = useState<"google" | "password" | null>(null);

  useEffect(() => {
    if (searchParams.get("linked") === "google") {
      toast.success("Google connected.");
      updateUser({ hasGoogleCredential: true });
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams, updateUser]);

  async function handleSaveUsername(next: string) {
    const updated = await setUsername(next);
    if (updated.username) {
      updateUser({ username: updated.username });
      toast.success("Username saved.");
    }
  }

  async function handleSaveEmail(values: { currentPassword: string; email: string }) {
    try {
      const updated = await changeEmail(values.currentPassword, values.email);
      updateUser({ email: updated.email, emailVerified: updated.emailVerified });
      if (!updated.emailVerified) {
        toast.success("Email saved. Check your inbox for a verification link.");
      } else {
        toast.success("Email saved.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update email.");
    }
  }

  async function handleResendVerification() {
    try {
      await resendVerificationEmail();
      toast.success("Verification email sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send verification email.");
    }
  }

  async function handlePasswordChange(values: PasswordChangeValues) {
    await changePassword(values.currentPassword, values.newPassword);
    toast.success("Password updated.");
  }

  async function handlePasswordSet(values: PasswordSetValues) {
    await setPassword(values.newPassword);
    updateUser({ hasPasswordCredential: true, canChangeEmail: true });
    toast.success("Password added. You can also sign in with email.");
  }

  async function handleConnectGoogle() {
    setLinkingGoogle(true);
    try {
      await signIn("google", { callbackUrl: "/settings?linked=google" });
    } catch {
      setLinkingGoogle(false);
      toast.error("Could not start Google sign-in.");
    }
  }

  async function handleDisconnectGoogle() {
    if (!user.hasPasswordCredential) {
      toast.error("Add a password before disconnecting Google.");
      return;
    }
    setBusyMethod("google");
    try {
      await unlinkGoogle();
      updateUser({ hasGoogleCredential: false });
      toast.success("Google disconnected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect Google.");
    } finally {
      setBusyMethod(null);
    }
  }

  async function handleRemovePassword() {
    if (!user.hasGoogleCredential) {
      toast.error("Connect Google before removing your password.");
      return;
    }
    setBusyMethod("password");
    try {
      await removePassword();
      updateUser({ hasPasswordCredential: false, canChangeEmail: false });
      toast.success("Password removed. Sign in with Google.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove password.");
    } finally {
      setBusyMethod(null);
    }
  }

  return (
    <WorkspaceSections>
      <WorkspaceSection title="Account">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium">{user.displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Separator />
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="font-medium">{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium">
              {workspace ? planLabel(workspace.plan) : "Free"}
            </dd>
          </div>
        </dl>
        <Separator />
        {user.canChangeEmail ? (
          <EmailChangeRow email={user.email} onSave={handleSaveEmail} />
        ) : (
          <div className="flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">Email</p>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
        {user.canChangeEmail && !user.emailVerified ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Verify your email to use the assistant.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleResendVerification()}>
              Resend verification email
            </Button>
          </div>
        ) : null}
        <EditableFieldRow
          id="username"
          label="Username"
          value={user.username ?? ""}
          placeholder="leo"
          emptyValueLabel="Set a username"
          autoComplete="off"
          spellCheck={false}
          validate={(raw) => {
            const result = validateSlug(raw);
            if (!result.ok) return result;
            return { ok: true, value: result.value };
          }}
          onSave={handleSaveUsername}
          description={(draft) =>
            `Your public portfolio URL: ${siteHost}/${draft.trim() || "username"}`
          }
        />
        {user.hasPasswordCredential ? (
          <PasswordChangeRow onSave={handlePasswordChange} />
        ) : null}
      </WorkspaceSection>

      <WorkspaceSection
        title="Sign-in methods"
        description="Use email, Google, or both. Keep at least one way to sign in."
      >
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 items-center justify-center rounded-md border border-border/60 bg-muted/30">
                <GoogleMark />
              </div>
              <div>
                <p className="text-sm font-medium">Google</p>
                <p className="text-sm text-muted-foreground">
                  {user.hasGoogleCredential ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            {user.hasGoogleCredential ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyMethod === "google" || !user.hasPasswordCredential}
                onClick={() => void handleDisconnectGoogle()}
              >
                {busyMethod === "google" ? "Disconnecting…" : "Disconnect"}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={linkingGoogle}
                onClick={() => void handleConnectGoogle()}
              >
                {linkingGoogle ? "Opening Google…" : "Connect Google"}
              </Button>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Email and password</p>
              <p className="text-sm text-muted-foreground">
                {user.hasPasswordCredential
                  ? "You can sign in with your email and password"
                  : "Add a password to sign in with email"}
              </p>
            </div>
            {user.hasPasswordCredential ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyMethod === "password" || !user.hasGoogleCredential}
                onClick={() => void handleRemovePassword()}
              >
                {busyMethod === "password" ? "Removing…" : "Remove password"}
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => setSetPasswordOpen(true)}>
                Add password
              </Button>
            )}
          </div>
        </div>

        <PasswordSetSheet
          open={setPasswordOpen}
          onOpenChange={setSetPasswordOpen}
          onSave={handlePasswordSet}
        />
      </WorkspaceSection>

      <WorkspaceSection title="Open source">
        <div className="flex gap-3">
          <GitHubMark className="mt-0.5 size-5 text-foreground" />
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-sm font-medium">Yuse is open source</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Star the repo if you like it, open an issue for bugs, or contribute a fix.
                We welcome pull requests.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={YUSE_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <GitHubMark className="size-3.5" />
                View on GitHub
              </a>
              <a
                href={YUSE_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Star className="size-3.5" />
                Star
              </a>
              <a
                href={YUSE_GITHUB_CONTRIBUTING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Contribute
              </a>
              <a
                href={YUSE_GITHUB_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Report an issue
              </a>
            </div>
          </div>
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="Help and support"
        description="Questions, bugs, or feedback, we are happy to help."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Email us and include what you were trying to do. Screenshots help.
          </p>
          <a href={SUPPORT_MAILTO} className={buttonVariants({ variant: "outline" })}>
            Contact support
          </a>
        </div>
      </WorkspaceSection>

      <div className="flex justify-end px-4 py-4 lg:px-5">
        <Button
          variant="outline"
          className="gap-2 text-destructive hover:text-destructive"
          onClick={() => {
            void signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </WorkspaceSections>
  );
}
