"use client";

import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useDrawerShell } from "@/components/ui/drawer-shell";
import { WorkspacePanelHeader } from "@/components/layout/workspace-panel";
import { floatingChipIconButtonClassName } from "@/lib/ui/floating-chip";

export interface WorkspaceFloatingHeaderProps {
  /** Custom leading content. When omitted, `onBack` renders the standard chevron chip. */
  leading?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  trailing?: ReactNode;
  scrollFade?: boolean;
  className?: string;
  /** Floating leading wrapper: default pill (px-3) or square icon chip (p-1). */
  leadingChip?: "default" | "icon";
}

export function WorkspaceFloatingHeader({
  leading,
  onBack,
  backLabel = "Back",
  trailing,
  scrollFade = true,
  className,
  leadingChip,
}: WorkspaceFloatingHeaderProps) {
  const inDrawerShell = useDrawerShell();
  if (inDrawerShell) {
    return null;
  }

  const resolvedLeading =
    leading ??
    (onBack ? (
      <Button
        variant="ghost"
        size="icon"
        className={floatingChipIconButtonClassName}
        onClick={onBack}
        aria-label={backLabel}
      >
        <ChevronLeft className="size-4" />
      </Button>
    ) : undefined);

  const resolvedLeadingChip = leadingChip ?? (onBack || leading ? "icon" : "default");

  return (
    <WorkspacePanelHeader
      variant="floating"
      scrollFade={scrollFade}
      className={className}
      leadingChip={resolvedLeadingChip}
      leading={resolvedLeading}
      trailing={trailing}
    />
  );
}
