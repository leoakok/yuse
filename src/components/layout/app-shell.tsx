"use client";

import type { ReactNode } from "react";
import { WorkspaceBody } from "@/components/agent/cv-assistant-shell";
import { useEditorPanel } from "@/components/layout/editor-panel-provider";
import { FloatingAppChrome } from "@/components/layout/floating-app-chrome";
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

interface AppShellProps {
  children: ReactNode;
  preview?: ReactNode;
  chromeActions?: ReactNode;
}

export function AppShell({ children, preview, chromeActions }: AppShellProps) {
  const [editorWidth, setEditorWidth] = useStoredWidth(EDITOR_KEY, EDITOR_DEFAULT);
  const { isOpen: isEditorOpen, setOpen: setEditorOpen } = useEditorPanel();

  return (
    <div className="flex h-dvh flex-col bg-background">
      <FloatingAppChrome actions={chromeActions} />
      <WorkspaceBody>
        <div className="flex min-h-0 flex-1">
          {!isEditorOpen ? (
            <EditorCollapsedRail
              className="hidden lg:flex"
              onOpen={() => setEditorOpen(true)}
            />
          ) : null}

          <ShellAside
            side="left"
            width={editorWidth}
            className={cn("agent-workspace", !isEditorOpen && "lg:hidden")}
          >
            {children}
          </ShellAside>

          {isEditorOpen ? (
            <ResizeHandle
              label="Resize editor"
              className="hidden lg:block"
              onResize={(delta) =>
                setEditorWidth((width) => clamp(width + delta, EDITOR_MIN, EDITOR_MAX))
              }
            />
          ) : null}

          {preview ? (
            <aside className="resume-print-panel hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l bg-muted/10 lg:flex">
              {preview}
            </aside>
          ) : null}
        </div>
      </WorkspaceBody>
    </div>
  );
}
