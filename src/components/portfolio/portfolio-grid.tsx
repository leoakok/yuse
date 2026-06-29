"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Download, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Portfolio, PortfolioWithContent } from "@/lib/types/portfolio";
import { portfolioPath } from "@/lib/portfolio/routes";
import {
  deletePortfolio,
  duplicatePortfolio,
  getPortfolioWithContent,
} from "@/lib/api/portfolio-api";
import { exportPortfolioPdf } from "@/lib/portfolio/export-pdf";
import { portfolioToPreviewContent } from "@/lib/portfolio/preview";
import { CvPreview } from "@/components/cv/cv-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface PortfolioCardProps {
  portfolio: Portfolio;
  onDeleted: (id: string) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PortfolioCard({ portfolio, onDeleted }: PortfolioCardProps) {
  const router = useRouter();
  const [content, setContent] = useState<PortfolioWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getPortfolioWithContent(portfolio.id).then((result) => {
      if (!cancelled) {
        setContent(result ?? null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [portfolio.id]);

  async function handleDuplicate() {
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      const duplicate = await duplicatePortfolio(portfolio.id);
      toast.success("Portfolio duplicated.");
      router.push(portfolioPath(duplicate.id));
    } catch {
      toast.error("Could not duplicate this portfolio. Try again.");
    } finally {
      setIsDuplicating(false);
    }
  }

  async function handleDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deletePortfolio(portfolio.id);
      toast.success("Portfolio deleted.");
      onDeleted(portfolio.id);
    } catch {
      toast.error("Could not delete this portfolio. Try again.");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleDownload() {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const exportContent = content ?? (await getPortfolioWithContent(portfolio.id));
      if (!exportContent) {
        throw new Error("Portfolio content is not available.");
      }
      await exportPortfolioPdf({
        content: exportContent,
        filename: exportContent.portfolio.title,
      });
      toast.success("Print dialog opened.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not download this portfolio.";
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <Card className="group flex h-full flex-col overflow-hidden transition-colors hover:bg-muted/40">
        <div className="relative h-52 overflow-hidden border-b bg-muted/30">
          <Link href={portfolioPath(portfolio.id)} className="absolute inset-0 block">
            {loading ? (
              <Skeleton className="absolute inset-0 rounded-none" />
            ) : content ? (
              <div className="absolute inset-0 flex justify-center overflow-hidden pt-3">
                <div
                  className="origin-top shadow-sm"
                  style={{ transform: "scale(0.38)" }}
                >
                  <CvPreview
                    content={portfolioToPreviewContent(content)}
                    className="shadow-none"
                    singlePage
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Preview unavailable
              </div>
            )}
          </Link>
          <div
            className="absolute right-2 top-2 z-10"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-xs"
                    className="size-7 bg-background/90 shadow-sm backdrop-blur-sm"
                    aria-label={`Actions for ${portfolio.title}`}
                    onClick={(event) => event.preventDefault()}
                  >
                    <MoreHorizontal />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem
                  disabled={isDownloading}
                  onClick={() => void handleDownload()}
                >
                  {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isDuplicating}
                  onClick={() => void handleDuplicate()}
                >
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="warning"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Link href={portfolioPath(portfolio.id)} className="flex flex-1 flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base group-hover:text-primary">
              {portfolio.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-auto">
            <p className="text-xs text-muted-foreground">
              Updated {formatDate(portfolio.updatedAt)}
            </p>
          </CardContent>
        </Link>
      </Card>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={!isDeleting}>
          <DialogHeader>
            <DialogTitle>Delete this portfolio?</DialogTitle>
            <DialogDescription>
              &ldquo;{portfolio.title}&rdquo; will be removed permanently. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="warning"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PortfolioGridProps {
  portfolios: Portfolio[];
  onCreatePortfolio?: () => void;
  onPortfolioDeleted?: (id: string) => void;
}

export function PortfolioGrid({
  portfolios,
  onCreatePortfolio,
  onPortfolioDeleted,
}: PortfolioGridProps) {
  if (portfolios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium">No portfolios yet</p>
          <p className="text-sm text-muted-foreground">
            Create a portfolio site to showcase your projects and experience.
          </p>
        </div>
        {onCreatePortfolio ? (
          <Button type="button" size="sm" onClick={onCreatePortfolio}>
            Create your first portfolio
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {portfolios.map((portfolio) => (
        <PortfolioCard
          key={portfolio.id}
          portfolio={portfolio}
          onDeleted={(id) => onPortfolioDeleted?.(id)}
        />
      ))}
    </div>
  );
}
