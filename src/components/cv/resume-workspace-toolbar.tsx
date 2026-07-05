"use client";

import {
  Copy,
  Download,
  LayoutTemplate,
  List,
  Loader2,
  MoreHorizontal,
  PanelLeftClose,
  Share2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDropdownMenu,
  ResponsiveDropdownMenuContent,
  ResponsiveDropdownMenuItem,
  ResponsiveDropdownMenuTrigger,
} from "@/components/ui/responsive-dropdown-menu";
import { useEditorPanel } from "@/components/layout/editor-panel-provider";
import { WorkspacePanelHeader } from "@/components/layout/workspace-panel";
import { cn } from "@/lib/utils";

export type ResumeWorkspaceMode = "sections" | "design";

export interface ResumeWorkspaceToolbarProps {
  mode: ResumeWorkspaceMode;
  onModeChange: (mode: ResumeWorkspaceMode) => void;
  onDownload?: () => void;
  isDownloading?: boolean;
  downloadError?: string | null;
  onDismissDownloadError?: () => void;
  onDuplicate?: () => void;
  onDeleteRequest?: () => void;
  onShare?: () => void;
  isDuplicating?: boolean;
  actionsDisabled?: boolean;
}

export function ResumeWorkspaceToolbar({
  mode,
  onModeChange,
  onDownload,
  isDownloading = false,
  downloadError,
  onDismissDownloadError,
  onDuplicate,
  onDeleteRequest,
  onShare,
  isDuplicating = false,
  actionsDisabled = false,
}: ResumeWorkspaceToolbarProps) {
  const { setOpen: setEditorOpen } = useEditorPanel();

  return (
    <WorkspacePanelHeader
      leading={
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden size-8 shrink-0 lg:inline-flex"
            onClick={() => setEditorOpen(false)}
          >
            <PanelLeftClose className="size-4" />
            <span className="sr-only">Hide editor</span>
          </Button>
          <div className="flex min-w-0 rounded-lg border p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn("h-7 gap-1.5 px-2.5", mode === "sections" && "bg-muted")}
              aria-pressed={mode === "sections"}
              onClick={() => onModeChange("sections")}
            >
              <List className="size-3.5" />
              Sections
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn("h-7 gap-1.5 px-2.5", mode === "design" && "bg-muted")}
              aria-pressed={mode === "design"}
              onClick={() => onModeChange("design")}
            >
              <LayoutTemplate className="size-3.5" />
              Design
            </Button>
          </div>
        </div>
      }
      trailing={
        <div className="flex shrink-0 items-center gap-2">
          {downloadError ? (
            <p
              className="max-w-48 truncate text-xs text-destructive"
              role="alert"
              title={downloadError}
            >
              {downloadError}
              {onDismissDownloadError ? (
                <button
                  type="button"
                  className="ml-1 underline"
                  onClick={onDismissDownloadError}
                >
                  Dismiss
                </button>
              ) : null}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            onClick={() => onShare?.()}
            disabled={actionsDisabled}
            aria-label="Share resume"
          >
            <Share2 />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            onClick={() => void onDownload?.()}
            disabled={actionsDisabled || !onDownload || isDownloading}
            aria-label={isDownloading ? "Opening print view" : "Print or save as PDF"}
          >
            {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
          </Button>
          <ResponsiveDropdownMenu>
            <ResponsiveDropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground"
                  aria-label="More actions"
                  disabled={actionsDisabled}
                >
                  <MoreHorizontal />
                </Button>
              }
            />
            <ResponsiveDropdownMenuContent align="end" className="min-w-40">
              <ResponsiveDropdownMenuItem
                disabled={actionsDisabled || isDuplicating}
                onClick={() => void onDuplicate?.()}
              >
                <Copy />
                Duplicate
              </ResponsiveDropdownMenuItem>
              <ResponsiveDropdownMenuItem
                variant="warning"
                disabled={actionsDisabled}
                onClick={() => onDeleteRequest?.()}
              >
                <Trash2 />
                Delete
              </ResponsiveDropdownMenuItem>
            </ResponsiveDropdownMenuContent>
          </ResponsiveDropdownMenu>
        </div>
      }
    />
  );
}
