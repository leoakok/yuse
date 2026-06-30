"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { setPortfolioSlug } from "@/lib/api/portfolio-api";
import { buildPortfolioShareUrl } from "@/lib/portfolio/share-url";
import { slugFromTitle, validateSlug } from "@/lib/portfolio/slug";
import { cn } from "@/lib/utils";

interface PortfolioShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  portfolioTitle: string;
  portfolioSlug?: string | null;
  username?: string | null;
  onPortfolioSlugChange: (slug: string) => void;
}

export function PortfolioShareDialog({
  open,
  onOpenChange,
  portfolioId,
  portfolioTitle,
  portfolioSlug,
  username,
  onPortfolioSlugChange,
}: PortfolioShareDialogProps) {
  const [slugInput, setSlugInput] = useState(portfolioSlug ?? slugFromTitle(portfolioTitle));
  const [savingSlug, setSavingSlug] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSlugInput(portfolioSlug ?? slugFromTitle(portfolioTitle));
    setCopied(false);
  }, [open, portfolioSlug, portfolioTitle]);

  const shareUrl = useMemo(() => {
    if (!username?.trim()) return "";
    return buildPortfolioShareUrl(username, portfolioSlug);
  }, [username, portfolioSlug]);

  const previewUrl = useMemo(() => {
    if (!username?.trim()) return "";
    const slug = slugInput.trim() || portfolioSlug?.trim();
    return buildPortfolioShareUrl(username, slug);
  }, [username, slugInput, portfolioSlug]);

  async function handleSaveSlug() {
    const result = validateSlug(slugInput);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setSavingSlug(true);
    try {
      const updated = await setPortfolioSlug(portfolioId, result.value);
      if (updated.slug) {
        onPortfolioSlugChange(updated.slug);
        toast.success("Portfolio link saved.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save portfolio link.");
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share portfolio</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {hasUsername ? (
            <p className="text-sm text-muted-foreground">
              Your username is <span className="font-medium text-foreground">{username}</span>.{" "}
              <Link
                href="/settings#username"
                className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}
              >
                Change it in Settings
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
            <label htmlFor="share-slug" className="text-sm font-medium">
              Portfolio link
            </label>
            <div className="flex gap-2">
              <Input
                id="share-slug"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                placeholder="my-portfolio"
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => void handleCopy()} disabled={!previewUrl && !shareUrl}>
            {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}
            Copy link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
