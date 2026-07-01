import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { EditorPanelProvider } from "@/components/layout/editor-panel-provider";

interface AppWorkspaceProps {
  children: ReactNode;
  preview?: ReactNode;
  actions?: ReactNode;
}

export function AppWorkspace({ children, preview, actions }: AppWorkspaceProps) {
  return (
    <EditorPanelProvider>
      <AppShell chromeActions={actions} preview={preview}>
        {children}
      </AppShell>
    </EditorPanelProvider>
  );
}
