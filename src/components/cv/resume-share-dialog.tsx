"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { setResumeSlug } from "@/lib/api/cv-api";
import { buildShareUrl } from "@/lib/portfolio/share-url";
import { slugFromTitle, validateSlug } from "@/lib/portfolio/slug";
import { cn } from "@/lib/utils";

interface ResumeShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeId: string;
  resumeTitle: string;
  resumeSlug?: string | null;
  username?: string | null;
  onResumeSlugChange: (slug: string) => void;
}

export function ResumeShareDialog({
  open,
  onOpenChange,
  resumeId,
  resumeTitle,
  resumeSlug,
  username,
  onResumeSlugChange,
}: ResumeShareDialogProps) {
  const [slugInput, setSlugInput] = useState(resumeSlug ?? slugFromTitle(resumeTitle));
  const [savingSlug, setSavingSlug] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSlugInput(resumeSlug ?? slugFromTitle(resumeTitle));
    setCopied(false);
  }, [open, resumeSlug, resumeTitle]);

  const shareUrl = useMemo(() => {
    if (!username?.trim()) return "";
    return buildShareUrl(username, resumeSlug);
  }, [username, resumeSlug]);

  const previewUrl = useMemo(() => {
    if (!username?.trim()) return "";
    const slug = slugInput.trim() || resumeSlug?.trim();
    return buildShareUrl(username, slug);
  }, [username, slugInput, resumeSlug]);

  async function handleSaveSlug() {
    const result = validateSlug(slugInput);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setSavingSlug(true);
    try {
      const updated = await setResumeSlug(resumeId, result.value);
      if (updated.slug) {
        onResumeSlugChange(updated.slug);
        toast.success("Resume link saved.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save resume link.");
    } finally {
      setSavingSlug(false);
    }
  }

  async function handleCopy() {
    const url = shareUrl || previewUrl;
    if (!url) {
      toast.error("Set your username in Settings to get a share link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link.");
    }
  }

  const hasUsername = Boolean(username?.trim());

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent dialogClassName="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Share resume</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-5">
          {hasUsername ? (
            <p className="text-sm text-muted-foreground">
              Links use your username and a short slug, for example{" "}
              <span className="font-medium text-foreground">{username}/full-stack-cv</span>.{" "}
              <Link
                href="/settings#username"
                className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}
              >
                Change username
              </Link>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link
                href="/settings#username"
                className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}
              >
                Set your username in Settings
              </Link>{" "}
              to get a share link.
            </p>
          )}

          <div className="space-y-2">
            <label htmlFor="resume-share-slug" className="text-sm font-medium">
              Resume link
            </label>
            <div className="flex gap-2">
              <Input
                id="resume-share-slug"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                placeholder="full-stack-cv"
                autoComplete="off"
                spellCheck={false}
                disabled={!hasUsername}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSaveSlug()}
                disabled={savingSlug || !hasUsername}
              >
                {savingSlug ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground">Preview</p>
            {previewUrl ? (
              <p className="mt-1 break-all text-sm font-medium">{previewUrl}</p>
            ) : (
              <p className="mt-1 text-sm font-medium">
                Set your username in{" "}
                <Link
                  href="/settings#username"
                  className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 text-sm")}
                >
                  Settings
                </Link>{" "}
                to preview your link.
              </p>
            )}
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button type="button" onClick={() => void handleCopy()} disabled={!previewUrl && !shareUrl}>
            {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}
            Copy link
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
