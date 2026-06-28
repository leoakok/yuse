"use client";

import { Trash2 } from "lucide-react";
import type { AssistantThread } from "@/lib/types/assistant";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function threadTitle(thread: AssistantThread): string {
  const preview = thread.preview?.trim();
  if (preview) {
    return preview.length > 72 ? `${preview.slice(0, 72)}…` : preview;
  }
  return "New chat";
}

function formatLastUsed(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffSec = Math.round((date.getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  const absSec = Math.abs(diffSec);
  if (absSec < 60) return rtf.format(Math.round(diffSec), "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffSec / 3600);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffSec / 86400);
  if (Math.abs(diffDay) < 7) return rtf.format(diffDay, "day");

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(date);
}

interface AssistantThreadHistoryProps {
  threads: AssistantThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onDeleteRequest: (threadId: string) => void;
  deletingThreadId?: string | null;
}

export function AssistantThreadHistory({
  threads,
  activeThreadId,
  onSelectThread,
  onDeleteRequest,
  deletingThreadId = null,
}: AssistantThreadHistoryProps) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-sm font-medium">No past chats yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a conversation and it will show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {threads.map((thread) => {
        const isActive = thread.id === activeThreadId;
        const isDeleting = deletingThreadId === thread.id;

        return (
          <li key={thread.id}>
            <div
              className={cn(
                "group flex items-start gap-2 px-1 py-3 transition-colors",
                isActive && "bg-muted/50"
              )}
            >
              <button
                type="button"
                onClick={() => onSelectThread(thread.id)}
                disabled={isDeleting}
                className="min-w-0 flex-1 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted disabled:opacity-50"
              >
                <p className="line-clamp-2 text-sm font-medium leading-snug">
                  {threadTitle(thread)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatLastUsed(thread.updatedAt)}
                </p>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                disabled={isDeleting}
                onClick={() => onDeleteRequest(thread.id)}
                aria-label="Delete chat"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
