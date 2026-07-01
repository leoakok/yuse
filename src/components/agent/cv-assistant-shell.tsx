"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CvAssistantPanel } from "@/components/agent/cv-assistant-panel";

export const WELCOME_PATH = "/welcome";

/** Content row with main area plus optional assistant panel. */
export function WorkspaceBody({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";

  if (pathname === WELCOME_PATH) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      <CvAssistantPanel />
    </div>
  );
}
