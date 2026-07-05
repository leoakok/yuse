"use client";

import { FileText, LogOut } from "lucide-react";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { useWorkspace } from "@/components/layout/workspace-provider";
import {
  WorkspaceSection,
  WorkspaceSections,
} from "@/components/layout/workspace-section";
import { EditableFieldRow } from "@/components/settings/editable-field-row";
import { EmailChangeRow } from "@/components/settings/email-change-sheet";
import {
  PasswordChangeRow,
  type PasswordChangeValues,
} from "@/components/settings/password-change-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { changeEmail, changePassword, resendVerificationEmail } from "@/lib/api/settings-api";
import { setUsername } from "@/lib/api/portfolio-api";
import { portfolioSiteOrigin } from "@/lib/portfolio/share-url";
import { validateSlug } from "@/lib/portfolio/slug";
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

function accountDescription(user: { canChangeEmail: boolean; hasPasswordCredential: boolean }) {
  if (user.canChangeEmail) {
    return "Signed in with email";
  }
  if (!user.hasPasswordCredential) {
    return "Signed in with Google";
  }
  return "Your account";
}

export function SettingsWorkspace() {
  const { user, workspace, updateUser } = useWorkspace();
  const siteHost = portfolioSiteOrigin().replace(/^https?:\/\//, "");

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

  return (
    <WorkspaceSections>
      <WorkspaceSection title="Account" description={accountDescription(user)}>
        <div className="flex items-center gap-3">
            <Avatar size="lg">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium">{user.displayName}</p>
              {!user.canChangeEmail ? (
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              ) : null}
            </div>
          </div>
          <Separator />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Member since</dt>
              <dd className="font-medium">{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Workspace</dt>
              <dd className="font-medium">
                {workspace ? workspace.name : "Loading…"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium">
                {workspace ? planLabel(workspace.plan) : "Loading…"}
              </dd>
            </div>
          </dl>
          <Separator />
          {user.canChangeEmail ? (
            <EmailChangeRow email={user.email} onSave={handleSaveEmail} />
          ) : null}
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
          ) : !user.canChangeEmail ? (
            <p className="text-sm text-muted-foreground">
              Sign in with Google. Your password is managed there.
            </p>
          ) : null}
      </WorkspaceSection>

      <WorkspaceSection title="How Yuse works" description="Main parts of the platform.">
        <div className="flex gap-3 text-sm">
            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">Resumes</p>
              <p className="text-muted-foreground">
                Each resume is a tailored CV with its own title, contact details, and
                design. Sections and items are shared across resumes, you choose what
                shows on each one.
              </p>
              <Link
                href="/resumes"
                className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}
              >
                Open resumes
              </Link>
            </div>
          </div>
          <Separator />
          <div className="flex gap-3">
            <YuseLogo className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Yuse</p>
              <p className="text-muted-foreground">
                Ask Yuse to create a resume, add experience, tailor for a job, or
                update your twin. It edits your real data.
              </p>
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
