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
import { createDesignShare, getDesignShareForResume } from "@/lib/api/design-share-api";
import { buildDesignShareUrl } from "@/lib/design/public-api";
import { buildShareUrl } from "@/lib/portfolio/share-url";
import { slugFromTitle, validateSlug } from "@/lib/portfolio/slug";
import type { DesignShare, DesignShareContentMode } from "@/lib/types/design-share";
import { cn } from "@/lib/utils";

type ShareMode = "resume" | "design";

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
  const [mode, setMode] = useState<ShareMode>("resume");
  const [contentMode, setContentMode] = useState<DesignShareContentMode>("DUMMY");
  const [slugInput, setSlugInput] = useState(resumeSlug ?? slugFromTitle(resumeTitle));
  const [savingSlug, setSavingSlug] = useState(false);
  const [savingDesign, setSavingDesign] = useState(false);
  const [designShare, setDesignShare] = useState<DesignShare | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("resume");
    setContentMode("DUMMY");
    setSlugInput(resumeSlug ?? slugFromTitle(resumeTitle));
    setCopied(false);
    void getDesignShareForResume(resumeId).then(setDesignShare);
  }, [open, resumeSlug, resumeTitle, resumeId]);

  const shareUrl = useMemo(() => {
    if (!username?.trim()) return "";
    return buildShareUrl(username, resumeSlug);
  }, [username, resumeSlug]);

  const previewUrl = useMemo(() => {
    if (!username?.trim()) return "";
    const slug = slugInput.trim() || resumeSlug?.trim();
    return buildShareUrl(username, slug);
  }, [username, slugInput, resumeSlug]);

  const designUrl = useMemo(() => {
    if (!designShare?.urlPath) return "";
    return buildDesignShareUrl(designShare.urlPath);
  }, [designShare]);

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

  async function handleSaveDesignShare() {
    setSavingDesign(true);
    try {
      const share = await createDesignShare(resumeId, contentMode, resumeTitle);
      setDesignShare(share);
      toast.success("Design link saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save design link.");
    } finally {
      setSavingDesign(false);
    }
  }

  async function handleCopy(url: string) {
    if (!url) {
      toast.error("Save a link first.");
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
          <ResponsiveDialogTitle>Share</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="flex gap-2 rounded-lg border bg-muted/30 p-1">
          <Button
            type="button"
            variant={mode === "resume" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setMode("resume")}
          >
            Full resume
          </Button>
          <Button
            type="button"
            variant={mode === "design" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setMode("design")}
          >
            Design only
          </Button>
        </div>

        {mode === "resume" ? (
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
                <p className="mt-1 text-sm text-muted-foreground">Set your username to preview the link.</p>
              )}
            </div>

            <ResponsiveDialogFooter>
              <Button
                type="button"
                onClick={() => void handleCopy(shareUrl || previewUrl)}
                disabled={!previewUrl && !shareUrl}
              >
                {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}
                Copy link
              </Button>
            </ResponsiveDialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Share just the look of this CV. Viewers can apply the design to their own resumes.
            </p>

            <div className="space-y-2">
              <p className="text-sm font-medium">Preview content</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={contentMode === "DUMMY" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setContentMode("DUMMY")}
                >
                  Sample data (John Doe)
                </Button>
                <Button
                  type="button"
                  variant={contentMode === "REAL" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setContentMode("REAL")}
                >
                  My content
                </Button>
              </div>
              {contentMode === "REAL" ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Anyone with this link can view your real CV content. Email and phone are hidden, but work history and other details stay visible.
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">Design link</p>
              {designUrl ? (
                <p className="mt-1 break-all text-sm font-medium">{designUrl}</p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Save to generate your design link.</p>
              )}
            </div>

            <ResponsiveDialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSaveDesignShare()}
                disabled={savingDesign}
              >
                {savingDesign ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : null}
                {designShare ? "Update share" : "Create link"}
              </Button>
              <Button type="button" onClick={() => void handleCopy(designUrl)} disabled={!designUrl}>
                {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}
                Copy link
              </Button>
            </ResponsiveDialogFooter>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
