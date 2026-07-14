import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageTitleProps {
  title: string;
  description?: string;
  /** Page-level actions (create, import), not global nav. */
  actions?: ReactNode;
  compact?: boolean;
}

export function PageTitle({ title, description, actions, compact = false }: PageTitleProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", compact ? "mb-3" : "mb-6")}>
      <div className="min-w-0">
        <h1 className={cn("font-semibold tracking-tight", compact ? "text-lg" : "text-2xl")}>
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div>
      ) : null}
    </div>
  );
}
