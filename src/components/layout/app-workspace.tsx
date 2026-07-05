"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EditorPanelProvider } from "@/components/layout/editor-panel-provider";
import { useRegisterWorkspacePreview } from "@/components/layout/workspace-preview-registration";

interface AppWorkspaceProps {
  children: ReactNode;
  preview?: ReactNode;
}

export function AppWorkspace({ children, preview }: AppWorkspaceProps) {
  useRegisterWorkspacePreview(Boolean(preview), preview);

  return (
    <EditorPanelProvider>
      <AppShell preview={preview}>{children}</AppShell>
    </EditorPanelProvider>
  );
}
