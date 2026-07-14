"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { workspaceFabFogClassName } from "@/lib/ui/floating-chip";
import "./workspace-fab-fog.css";

export function WorkspaceFabFog({ assistantOpen }: { assistantOpen?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(workspaceFabFogClassName, assistantOpen && "workspace-fab-fog--assistant")}
    />
  );
}

/**
 * Panel-anchored bottom shell for the assistant composer.
 * No frost overlay. Only positions the composer above the panel bottom.
 */
export function WorkspacePanelComposerChrome({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-50",
        className
      )}
    >
      <div className="workspace-fab-row-pad relative w-full px-4">
        <div className="pointer-events-auto w-full">{children}</div>
      </div>
    </div>
  );
}

/**
 * Fixed bottom shell for compact workspace FABs.
 * Single place for z-index, fog, safe-area padding, and left/right slots.
 */
export function WorkspaceBottomChrome({
  leftSlot,
  rightSlot,
  assistantOpen = false,
  showFog = true,
}: {
  leftSlot?: ReactNode;
  rightSlot: ReactNode;
  assistantOpen?: boolean;
  showFog?: boolean;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 isolate"
      aria-hidden={!leftSlot && !rightSlot}
    >
      {showFog ? <WorkspaceFabFog assistantOpen={assistantOpen} /> : null}
      <div className="workspace-fab-row-pad relative z-10 flex items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 flex-1 justify-start">{leftSlot}</div>
        <div className="flex shrink-0 justify-end">{rightSlot}</div>
      </div>
    </div>
  );
}
