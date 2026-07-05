"use client";

import Link from "next/link";
import {
  Copy,
  LayoutTemplate,
  List,
  MoreHorizontal,
  Share2,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ResponsiveDropdownMenu,
  ResponsiveDropdownMenuContent,
  ResponsiveDropdownMenuItem,
  ResponsiveDropdownMenuTrigger,
} from "@/components/ui/responsive-dropdown-menu";
import { cn } from "@/lib/utils";
import { resumePath } from "@/lib/cv/routes";

export type PortfolioWorkspaceMode = "content" | "design";

export interface PortfolioWorkspaceToolbarProps {
  mode: PortfolioWorkspaceMode;
  onModeChange: (mode: PortfolioWorkspaceMode) => void;
  onShare?: () => void;
  onDuplicate?: () => void;
  onDeleteRequest?: () => void;
  isDuplicating?: boolean;
  actionsDisabled?: boolean;
}

export function PortfolioWorkspaceToolbar({
  mode,
  onModeChange,
  onShare,
  onDuplicate,
  onDeleteRequest,
  isDuplicating = false,
  actionsDisabled = false,
}: PortfolioWorkspaceToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <Button
          variant={mode === "content" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onModeChange("content")}
        >
          <List className="mr-1.5 size-4" /> Content
        </Button>
        <Button
          variant={mode === "design" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onModeChange("design")}
        >
          <LayoutTemplate className="mr-1.5 size-4" /> Design
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label="Share portfolio"
          onClick={() => onShare?.()}
          disabled={actionsDisabled}
        >
          <Share2 className="size-4" />
        </Button>
        <ResponsiveDropdownMenu>
          <ResponsiveDropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label="Portfolio actions"
                disabled={actionsDisabled}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <ResponsiveDropdownMenuContent align="end">
            <ResponsiveDropdownMenuItem
              disabled={actionsDisabled || isDuplicating}
              onClick={() => void onDuplicate?.()}
            >
              <Copy className="mr-2 size-4" /> Duplicate
            </ResponsiveDropdownMenuItem>
            <ResponsiveDropdownMenuItem
              className={cn(!actionsDisabled && "text-destructive")}
              disabled={actionsDisabled}
              onClick={() => onDeleteRequest?.()}
            >
              <Trash2 className="mr-2 size-4" /> Delete
            </ResponsiveDropdownMenuItem>
          </ResponsiveDropdownMenuContent>
        </ResponsiveDropdownMenu>
      </div>
    </div>
  );
}

export function ResumeCustomizeHeader({
  resumeId,
  title,
}: {
  resumeId: string;
  title?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold">Customize style</h1>
        <p className="text-sm text-muted-foreground">
          {title ? `${title}, page layout and style options` : "Page layout and style options"}
        </p>
      </div>
      <Link
        href={resumePath(resumeId)}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Back to resume
      </Link>
    </div>
  );
}
