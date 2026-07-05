"use client";

import type { ReactNode } from "react";
import { useEditorPanel } from "@/components/layout/editor-panel-provider";
import {
  EditorCollapsedRail,
  ShellAside,
} from "@/components/layout/workspace-panel";
import {
  ResizeHandle,
  useStoredWidth,
  clamp,
  EDITOR_KEY,
  EDITOR_DEFAULT,
  EDITOR_MIN,
  EDITOR_MAX,
} from "@/components/layout/resize-handle";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

interface AppShellProps {
  children: ReactNode;
  preview?: ReactNode;
}

export function AppShell({ children, preview }: AppShellProps) {
  const [editorWidth, setEditorWidth] = useStoredWidth(EDITOR_KEY, EDITOR_DEFAULT);
  const { isOpen: isEditorOpen, setOpen: setEditorOpen } = useEditorPanel();
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const showEditor = isLargeScreen ? isEditorOpen : true;
  const showPreview = Boolean(preview) && isLargeScreen;

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1">
      {isLargeScreen && !isEditorOpen ? (
        <EditorCollapsedRail onOpen={() => setEditorOpen(true)} />
      ) : null}

      {showEditor ? (
        <ShellAside
          side="left"
          width={editorWidth}
          compact={!isLargeScreen}
          className="agent-workspace"
        >
          {children}
        </ShellAside>
      ) : null}

      {isLargeScreen && isEditorOpen ? (
        <ResizeHandle
          label="Resize editor"
          className="hidden lg:block"
          onResize={(delta) =>
            setEditorWidth((width) => clamp(width + delta, EDITOR_MIN, EDITOR_MAX))
          }
        />
      ) : null}

      {showPreview ? (
        <aside
          className={cn(
            "resume-print-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/10",
            isLargeScreen ? "border-l" : "w-full"
          )}
        >
          {preview}
        </aside>
      ) : null}
    </div>
  );
}
