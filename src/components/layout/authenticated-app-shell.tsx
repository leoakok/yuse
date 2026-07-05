"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WorkspaceBody, WELCOME_PATH } from "@/components/agent/cv-assistant-shell";
import { AppChrome } from "@/components/layout/app-chrome";
import {
  WorkspaceMobileDrawerProvider,
  WorkspaceMobileDrawers,
  useWorkspaceMobileDrawerOptional,
} from "@/components/layout/workspace-mobile-drawer";
import {
  useWorkspacePreviewRegistration,
  WorkspacePreviewRegistrationProvider,
} from "@/components/layout/workspace-preview-registration";
import {
  useWorkspaceView,
  WorkspaceViewProvider,
} from "@/components/layout/workspace-view-provider";
import { isDocumentWorkspacePath } from "@/lib/ui/document-workspace-route";

function WorkspaceViewResetOnNavigate() {
  const pathname = usePathname() ?? "";
  const { setView } = useWorkspaceView();
  const closeDrawerRef = useRef<(() => void) | null>(null);
  closeDrawerRef.current = useWorkspaceMobileDrawerOptional()?.closeDrawer ?? null;

  useEffect(() => {
    setView("edit");
    closeDrawerRef.current?.();
  }, [pathname, setView]);

  return null;
}

function AuthenticatedAppShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { hasPreview } = useWorkspacePreviewRegistration();
  const isDocumentWorkspace = isDocumentWorkspacePath(pathname);

  if (pathname === WELCOME_PATH) {
    return <>{children}</>;
  }

  return (
    <WorkspaceViewProvider hasPreview={hasPreview} isDocumentWorkspace={isDocumentWorkspace}>
      <WorkspaceMobileDrawerProvider>
        <WorkspaceViewResetOnNavigate />
        <div className="flex h-dvh flex-col bg-background">
          <WorkspaceBody header={<AppChrome />}>{children}</WorkspaceBody>
        </div>
        <WorkspaceMobileDrawers />
      </WorkspaceMobileDrawerProvider>
    </WorkspaceViewProvider>
  );
}

export function AuthenticatedAppShell({ children }: { children: ReactNode }) {
  return (
    <WorkspacePreviewRegistrationProvider>
      <AuthenticatedAppShellInner>{children}</AuthenticatedAppShellInner>
    </WorkspacePreviewRegistrationProvider>
  );
}
