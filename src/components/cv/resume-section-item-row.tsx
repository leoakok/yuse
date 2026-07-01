"use client";

import { useState } from "react";
import { Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { SectionItem } from "@/lib/types/cv";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motionHoverRevealGroup, motionTransitionColors } from "@/lib/ui/motion";
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
        "group/item relative cursor-pointer px-4 py-2.5 text-sm hover:bg-muted/40 lg:px-5",
        motionTransitionColors,
        hidden && "opacity-50"
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
          <p className={cn("font-medium", hidden && "text-muted-foreground")}>{item.headline}</p>
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
          className={cn("flex shrink-0 items-center gap-0.5", motionHoverRevealGroup("item"))}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            disabled={isToggling}
            aria-label={hidden ? "Show in preview" : "Hide from preview"}
            onClick={(event) => void handleToggleVisibility(event)}
          >
            {hidden ? <EyeOff /> : <Eye />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground"
                  aria-label="More actions"
                >
                  <MoreHorizontal />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="warning" onClick={handleDelete}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}
