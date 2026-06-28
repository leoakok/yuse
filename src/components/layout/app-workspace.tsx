import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";

interface AppWorkspaceProps {
  children: ReactNode;
  preview?: ReactNode;
  actions?: ReactNode;
}

export function AppWorkspace({ children, preview, actions }: AppWorkspaceProps) {
  return (
    <AppShell header={<PageHeader actions={actions} />} preview={preview}>
      {children}
    </AppShell>
  );
}
