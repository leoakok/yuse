"use client";

import { useState } from "react";
import { Check, ChevronDown, LoaderCircle, X } from "lucide-react";
import type { AgentActivity } from "@/lib/types/assistant";
import { cn } from "@/lib/utils";

function ActivityIcon({ status }: { status: AgentActivity["status"] }) {
  if (status === "complete") {
    return <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />;
  }
  if (status === "error") {
    return <X className="size-3.5 text-destructive" />;
  }
  return <LoaderCircle className="size-3.5 animate-spin text-primary" />;
}

export function isThinkingLabel(label: string | undefined): boolean {
  if (!label) return false;
  const normalized = label.toLowerCase().replace(/…/g, "").replace(/\./g, "").trim();
  return normalized === "thinking";
}

interface AgentActivityFeedProps {
  activities: AgentActivity[];
  className?: string;
}

/** Always-visible tool step list during streaming. */
export function AgentActivityFeed({ activities, className }: AgentActivityFeedProps) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <ol
      className={cn(
        "space-y-2 rounded-lg border bg-muted/40 px-3 py-2.5 backdrop-blur-sm",
        className
      )}
    >
      {activities.map((activity) => (
        <li key={activity.id} className="flex items-start gap-2.5 text-xs">
          <span className="mt-0.5 shrink-0">
            <ActivityIcon status={activity.status} />
          </span>
          <span
            className={cn(
              activity.status === "active" && "font-medium text-foreground",
              activity.status === "complete" && "text-muted-foreground",
              activity.status === "error" && "text-destructive"
            )}
          >
            {activity.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

interface ThinkingCollapsibleProps {
  label?: string;
  content?: string;
  isActive?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

/** Collapsible block for model reasoning / thinking phase only. */
export function ThinkingCollapsible({
  label = "Thinking…",
  content,
  isActive = false,
  defaultOpen = false,
  className,
}: ThinkingCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = Boolean(content?.trim());

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/40 backdrop-blur-sm",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
      >
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
        {isActive ? (
          <LoaderCircle className="size-3.5 shrink-0 animate-spin text-primary" />
        ) : null}
        <span
          className={cn(
            isActive ? "font-medium text-foreground" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
      </button>
      {open && hasContent ? (
        <div className="whitespace-pre-wrap border-t px-3 py-2 text-xs text-muted-foreground">
          {content}
        </div>
      ) : null}
    </div>
  );
}

interface LiveStatusLineProps {
  label: string;
  className?: string;
}

/** Inline status for non-thinking, non-tool phases (e.g. saving). */
export function LiveStatusLine({ label, className }: LiveStatusLineProps) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm",
        className
      )}
    >
      <LoaderCircle className="size-3.5 shrink-0 animate-spin text-primary" />
      <span>{label}</span>
    </p>
  );
}
