"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, LogOut, Mail, UserCircle } from "lucide-react";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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

export function SettingsWorkspace() {
  const { user, workspace, updateUser } = useWorkspace();
  const [usernameInput, setUsernameInput] = useState(user.username ?? "");
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    setUsernameInput(user.username ?? "");
  }, [user.username]);

  async function handleSaveUsername() {
    const result = validateSlug(usernameInput);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setSavingUsername(true);
    try {
      const updated = await setUsername(result.value);
      if (updated.username) {
        updateUser({ username: updated.username });
        setUsernameInput(updated.username);
        toast.success("Username saved.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save username.");
    } finally {
      setSavingUsername(false);
    }
  }

  const siteHost = portfolioSiteOrigin().replace(/^https?:\/\//, "");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="size-4" />
            Account
          </CardTitle>
          <CardDescription>Signed in with Google</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <dt className="text-muted-foreground">Workspace</dt>
              <dd className="font-medium">{workspace.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium">{planLabel(workspace.plan)}</dd>
            </div>
          </dl>
          <Separator />
          <div id="username" className="space-y-2 scroll-mt-6">
            <label htmlFor="settings-username" className="text-sm font-medium">
              Username
            </label>
            <div className="flex gap-2">
              <Input
                id="settings-username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="leo"
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSaveUsername()}
                disabled={savingUsername}
              >
                {savingUsername ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your public portfolio URL: {siteHost}/{usernameInput.trim() || "username"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <YuseLogo className="size-4" />
            How Yuse works
          </CardTitle>
          <CardDescription>Main parts of the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex gap-3">
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
        </CardContent>
      </Card>

      <Card id="support">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4" />
            Help &amp; support
          </CardTitle>
          <CardDescription>
            Questions, bugs, or feedback, we are happy to help.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Email us and include what you were trying to do. Screenshots help.
          </p>
          <a href={SUPPORT_MAILTO} className={buttonVariants({ variant: "outline" })}>
            Contact support
          </a>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
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
    </div>
  );
}
