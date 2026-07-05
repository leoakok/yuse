"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Portfolio, PortfolioWithContent } from "@/lib/types/portfolio";
import { portfolioPath } from "@/lib/portfolio/routes";
import {
  deletePortfolio,
  duplicatePortfolio,
  getPortfolioWithContent,
} from "@/lib/api/portfolio-api";
import { PortfolioSitePreview } from "@/components/portfolio/portfolio-site-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  catalogCardPreviewClassName,
  catalogCardShellClassName,
} from "@/lib/ui/catalog-card";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  ResponsiveDropdownMenu,
  ResponsiveDropdownMenuContent,
  ResponsiveDropdownMenuItem,
  ResponsiveDropdownMenuTrigger,
} from "@/components/ui/responsive-dropdown-menu";

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

  return (
    <>
      <Card className={catalogCardShellClassName}>
        <Link href={portfolioPath(portfolio.id)} className={catalogCardPreviewClassName}>
          {loading ? (
            <div className="flex h-full items-center justify-center bg-muted/30">
              <span className="sr-only">Loading preview</span>
            </div>
          ) : content ? (
            <div className="absolute inset-0 flex justify-center overflow-hidden">
              <div
                className="origin-top shadow-sm"
                style={{ transform: "scale(0.32)" }}
              >
                <PortfolioSitePreview content={content} className="w-[640px]" interactive={false} />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Preview unavailable
            </div>
          )}
        </Link>
        <div className="flex flex-1 flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <Link
                href={portfolioPath(portfolio.id)}
                className="line-clamp-2 group-hover:text-primary"
              >
                {portfolio.title}
              </Link>
            </CardTitle>
            <CardAction>
              <ResponsiveDropdownMenu>
                <ResponsiveDropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground"
                    >
                      <MoreHorizontal className="mr-1.5 size-4" />
                      Actions
                    </Button>
                  }
                />
                <ResponsiveDropdownMenuContent align="end" className="min-w-40">
                  <ResponsiveDropdownMenuItem
                    disabled={isDuplicating}
                    onClick={() => void handleDuplicate()}
                  >
                    <Copy />
                    Duplicate
                  </ResponsiveDropdownMenuItem>
                  <ResponsiveDropdownMenuItem
                    variant="warning"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 />
                    Delete
                  </ResponsiveDropdownMenuItem>
                </ResponsiveDropdownMenuContent>
              </ResponsiveDropdownMenu>
            </CardAction>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href={portfolioPath(portfolio.id)}>
              <p className="text-xs text-muted-foreground">
                Updated {formatDate(portfolio.updatedAt)}
              </p>
            </Link>
          </CardContent>
        </div>
      </Card>
      <ResponsiveDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ResponsiveDialogContent showCloseButton={!isDeleting}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Delete this portfolio?</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              &ldquo;{portfolio.title}&rdquo; will be removed permanently. This cannot be
              undone.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="warning"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}

interface PortfolioGridProps {
  portfolios: Portfolio[];
  isLoading?: boolean;
  isRevalidating?: boolean;
  onCreatePortfolio?: () => void;
  onPortfolioDeleted?: (id: string) => void;
}

export function PortfolioGrid({
  portfolios,
  isLoading = false,
  isRevalidating = false,
  onCreatePortfolio,
  onPortfolioDeleted,
}: PortfolioGridProps) {
  if (isLoading && portfolios.length === 0) {
    return (
      <div
        className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center"
        aria-busy="true"
      >
        <p className="text-sm text-muted-foreground">Loading portfolios…</p>
      </div>
    );
  }

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
    <div className="relative">
      {isRevalidating ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse bg-primary/40"
          aria-hidden
        />
      ) : null}
      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 transition-opacity duration-300",
          isRevalidating && "opacity-80"
        )}
      >
        {portfolios.map((portfolio) => (
          <PortfolioCard
            key={portfolio.id}
            portfolio={portfolio}
            onDeleted={(id) => onPortfolioDeleted?.(id)}
          />
        ))}
      </div>
    </div>
  );
}
