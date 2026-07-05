"use client";

import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  workspaceRowActionButtonClassName,
  workspaceRowActionsClassName,
  workspaceRowClassName,
} from "@/lib/ui/workspace-section";
import { cn } from "@/lib/utils";

interface SettingsFieldRowProps {
  label: string;
  value: ReactNode;
  onEdit: () => void;
  ariaLabel?: string;
  id?: string;
  description?: ReactNode;
  valueClassName?: string;
}

export function SettingsFieldRow({
  label,
  value,
  onEdit,
  ariaLabel,
  id,
  description,
  valueClassName,
}: SettingsFieldRowProps) {
  const actionLabel = ariaLabel ?? `Edit ${label}`;

  return (
    <div
      id={id}
      className={cn(
        workspaceRowClassName,
        "cursor-pointer scroll-mt-6 -mx-4 lg:-mx-5"
      )}
      role="button"
      tabIndex={0}
      aria-label={actionLabel}
      onClick={onEdit}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit();
        }
      }}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn("truncate font-medium", valueClassName)}>{value}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
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
            aria-label={actionLabel}
            onClick={onEdit}
          >
            <Pencil />
          </Button>
        </div>
      </div>
    </div>
  );
}
