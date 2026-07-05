"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useCvAssistantOptional } from "@/components/agent/cv-assistant-provider";
import {
  CvAssistantPanel,
  CvAssistantPanelPlaceholder,
} from "@/components/agent/cv-assistant-panel";
import { WorkspaceViewFabs } from "@/components/layout/workspace-view-fabs";
import { useWorkspaceLayoutMode } from "@/components/layout/workspace-view-provider";

export const WELCOME_PATH = "/welcome";

/** Content row with main area plus optional assistant panel. */
export function WorkspaceBody({
  children,
  header,
}: {
  children: ReactNode;
  header?: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const assistant = useCvAssistantOptional();
  const { isLargeScreen } = useWorkspaceLayoutMode();

  if (pathname === WELCOME_PATH) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {header}
        {children}
      </div>
      {isLargeScreen ? (
        assistant ? (
          <CvAssistantPanel variant="sidebar" />
        ) : (
          <CvAssistantPanelPlaceholder />
        )
      ) : null}
      <WorkspaceViewFabs />
    </div>
  );
}
