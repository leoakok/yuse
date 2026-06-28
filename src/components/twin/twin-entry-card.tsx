"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { TwinEntry } from "@/lib/types/twin";
import { TWIN_ENTRY_TYPE_LABELS } from "@/lib/types/twin";
import { stripMarkdown } from "@/lib/markdown/render";
import { missingStoryPieces, readTwinStory, storyPreview } from "@/lib/twin/story";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TwinEntryCardProps {
  entry: TwinEntry;
  onEdit?: () => void;
  onDeleteRequest: () => void;
}

export function TwinEntryCard({ entry, onEdit, onDeleteRequest }: TwinEntryCardProps) {
  const story = readTwinStory(entry.metadata);
  const preview = storyPreview(entry.type, entry.metadata);
  const missing = missingStoryPieces(entry.type, story);
  const company =
    typeof entry.metadata.company === "string" ? entry.metadata.company : null;

  function handleDelete(event: React.MouseEvent) {
    event.stopPropagation();
    onDeleteRequest();
  }

  const clickable = Boolean(onEdit);

  return (
    <Card
      className={clickable ? "cursor-pointer transition-colors hover:bg-muted/30" : undefined}
      onClick={onEdit}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onEdit?.();
              }
            }
          : undefined
      }
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{TWIN_ENTRY_TYPE_LABELS[entry.type]}</Badge>
            {missing.length > 0 ? (
              <Badge variant="outline" className="text-xs font-normal">
                Needs detail
              </Badge>
            ) : preview ? (
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                Complete
              </Badge>
            ) : null}
          </div>
          <CardTitle className="text-base leading-snug">
            {entry.title}
            {company ? (
              <span className="font-normal text-muted-foreground"> · {company}</span>
            ) : null}
          </CardTitle>
        </div>
        <div
          className="flex shrink-0 gap-1"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {onEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Edit ${entry.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            aria-label={`Delete ${entry.title}`}
            onClick={handleDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      {(preview || entry.body) && (
        <CardContent className="space-y-2">
          {preview ? (
            <p className="line-clamp-4 text-sm text-foreground">{preview}</p>
          ) : null}
          {entry.body ? (
            <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
              {stripMarkdown(entry.body)}
            </p>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}
