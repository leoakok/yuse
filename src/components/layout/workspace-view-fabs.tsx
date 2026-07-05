"use client";

import { Eye } from "lucide-react";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { WorkspaceBottomChrome } from "@/components/layout/workspace-bottom-chrome";
import { useWorkspaceMobileDrawer } from "@/components/layout/workspace-mobile-drawer";
import { useWorkspaceLayoutMode } from "@/components/layout/workspace-view-provider";
import { workspaceFabClassName } from "@/lib/ui/floating-chip";
import { motionButton } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";

function workspaceFabButtonClassName(isActive: boolean) {
  return cn(
    workspaceFabClassName(isActive),
    "pointer-events-auto gap-2 px-4 text-sm font-medium",
    motionButton
  );
}

export function WorkspaceViewFabs() {
  const { isLargeScreen, hasPreview, hasWorkspaceView } = useWorkspaceLayoutMode();
  const { toggleDrawer, isDrawerOpen } = useWorkspaceMobileDrawer();

  if (isLargeScreen) {
    return null;
  }

  if (!hasWorkspaceView) {
    const assistantActive = isDrawerOpen("assistant");

    return (
      <WorkspaceBottomChrome
        showFog={false}
        assistantOpen={assistantActive}
        rightSlot={
          <button
            type="button"
            className={workspaceFabButtonClassName(assistantActive)}
            aria-label={assistantActive ? "Close Yuse assistant" : "Yuse assistant"}
            aria-pressed={assistantActive}
            onClick={() => toggleDrawer("assistant")}
          >
            <YuseLogo className="size-4 shrink-0" aria-hidden />
            Yuse
          </button>
        }
      />
    );
  }

  const previewActive = isDrawerOpen("preview");
  const assistantActive = isDrawerOpen("assistant");

  return (
    <WorkspaceBottomChrome
      showFog={!assistantActive}
      assistantOpen={assistantActive}
      leftSlot={
        hasPreview ? (
          <button
            type="button"
            className={workspaceFabButtonClassName(previewActive)}
            aria-label={previewActive ? "Close preview" : "Preview"}
            aria-pressed={previewActive}
            onClick={() => toggleDrawer("preview")}
          >
            <Eye className="size-4 shrink-0" aria-hidden />
            Preview
          </button>
        ) : null
      }
      rightSlot={
        <button
          type="button"
          className={workspaceFabButtonClassName(assistantActive)}
          aria-label={assistantActive ? "Close Yuse assistant" : "Yuse assistant"}
          aria-pressed={assistantActive}
          onClick={() => toggleDrawer("assistant")}
        >
          <YuseLogo className="size-4 shrink-0" aria-hidden />
          Yuse
        </button>
      }
    />
  );
}
