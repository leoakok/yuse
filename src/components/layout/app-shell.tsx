"use client";

import type { ReactNode } from "react";
import {
  ResizeHandle,
  useStoredWidth,
  clamp,
  PREVIEW_KEY,
  PREVIEW_DEFAULT,
  PREVIEW_MIN,
  PREVIEW_MAX,
} from "@/components/layout/resize-handle";

interface AppShellProps {
  children: ReactNode;
  preview?: ReactNode;
  header?: ReactNode;
}

export function AppShell({ children, preview, header }: AppShellProps) {
  const [previewWidth, setPreviewWidth] = useStoredWidth(PREVIEW_KEY, PREVIEW_DEFAULT);

  return (
    <div className="flex h-dvh flex-col bg-background">
      {header}
      <div className="flex min-h-0 flex-1">
        <main className="agent-workspace flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
        {preview ? (
          <>
            <ResizeHandle
              label="Resize preview"
              className="hidden lg:block"
              onResize={(delta) =>
                setPreviewWidth((w) => clamp(w - delta, PREVIEW_MIN, PREVIEW_MAX))
              }
            />
            <aside
              className="resume-print-panel hidden min-h-0 shrink-0 flex-col overflow-hidden border-l bg-muted/10 lg:flex"
              style={{ width: previewWidth }}
            >
              {preview}
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
}
