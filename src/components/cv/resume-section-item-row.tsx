"use client";

import { useState } from "react";
import { Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { SectionItem } from "@/lib/types/cv";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDropdownMenu,
  ResponsiveDropdownMenuContent,
  ResponsiveDropdownMenuItem,
  ResponsiveDropdownMenuSeparator,
  ResponsiveDropdownMenuTrigger,
} from "@/components/ui/responsive-dropdown-menu";
import { motionTransitionColors } from "@/lib/ui/motion";
import {
  workspaceRowActionButtonClassName,
  workspaceRowActionsClassName,
  workspaceRowClassName,
  workspaceRowHiddenClassName,
} from "@/lib/ui/workspace-section";
import { stripMarkdown } from "@/lib/markdown/render";
import { formatItemRowDetail } from "@/lib/cv/section-item-display";
import { cn } from "@/lib/utils";

interface ResumeSectionItemRowProps {
  item: SectionItem;
  onToggleVisibility: (showInPreview: boolean) => Promise<void>;
  onEdit: () => void;
  onDeleteRequest: () => void;
}

export function ResumeSectionItemRow({
  item,
  onToggleVisibility,
  onEdit,
  onDeleteRequest,
}: ResumeSectionItemRowProps) {
  const [isToggling, setIsToggling] = useState(false);
  const hidden = !item.showInPreview;
  const detail = formatItemRowDetail(item);

  async function handleToggleVisibility(event: React.MouseEvent) {
    event.stopPropagation();
    if (isToggling) return;
    setIsToggling(true);
    try {
      await onToggleVisibility(!item.showInPreview);
    } finally {
      setIsToggling(false);
    }
  }

  function handleEdit(event: React.MouseEvent) {
    event.stopPropagation();
    onEdit();
  }

  function handleDelete(event: React.MouseEvent) {
    event.stopPropagation();
    onDeleteRequest();
  }

  return (
    <li
      className={cn(
        "relative cursor-pointer",
        workspaceRowClassName,
        motionTransitionColors
      )}
      onClick={onEdit}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${item.headline}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium", hidden && workspaceRowHiddenClassName)}>
            {item.headline}
          </p>
          {detail ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
          ) : null}
          {item.body ? (
            <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">
              {stripMarkdown(item.body)}
            </p>
          ) : null}
        </div>

        <div
          className={workspaceRowActionsClassName}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={workspaceRowActionButtonClassName}
            disabled={isToggling}
            aria-label={hidden ? "Show in preview" : "Hide from preview"}
            onClick={(event) => void handleToggleVisibility(event)}
          >
            {hidden ? <EyeOff /> : <Eye />}
          </Button>

          <ResponsiveDropdownMenu>
            <ResponsiveDropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={workspaceRowActionButtonClassName}
                  aria-label="More actions"
                >
                  <MoreHorizontal />
                </Button>
              }
            />
            <ResponsiveDropdownMenuContent align="end">
              <ResponsiveDropdownMenuItem onClick={handleEdit}>
                <Pencil />
                Edit
              </ResponsiveDropdownMenuItem>
              <ResponsiveDropdownMenuSeparator />
              <ResponsiveDropdownMenuItem variant="warning" onClick={handleDelete}>
                <Trash2 />
                Delete
              </ResponsiveDropdownMenuItem>
            </ResponsiveDropdownMenuContent>
          </ResponsiveDropdownMenu>
        </div>
      </div>
    </li>
  );
}
