import type { ReactNode } from "react";
import { WorkspaceBody } from "@/components/agent/cv-assistant-shell";
import { FloatingAppChrome } from "@/components/layout/floating-app-chrome";
import { PageTitle } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

export type CatalogShellWidth = "default" | "narrow";

const widthClass: Record<CatalogShellWidth, string> = {
  default: "max-w-6xl",
  narrow: "max-w-2xl",
};

export interface CatalogShellProps {
  title: string;
  description?: string;
  /** Primary actions for this catalog page (import, create), rendered beside the page title. */
  actions?: ReactNode;
  width?: CatalogShellWidth;
  /** Stretch page content to fill remaining viewport height below the title. */
  fillHeight?: boolean;
  children: ReactNode;
}

export function CatalogShell({
  title,
  description,
  actions,
  width = "default",
  fillHeight = false,
  children,
}: CatalogShellProps) {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <FloatingAppChrome />
      <WorkspaceBody>
        <main
          className={cn(
            "w-full flex-1",
            fillHeight ? "flex min-h-0 flex-col overflow-hidden" : "overflow-y-auto"
          )}
        >
          <div
            className={cn(
              "mx-auto w-full min-w-0 px-4 pt-8 pb-16",
              widthClass[width],
              fillHeight && "flex min-h-0 flex-1 flex-col"
            )}
          >
            <div className={cn(fillHeight && "shrink-0")}>
              <PageTitle title={title} description={description} actions={actions} />
            </div>
            <div
              className={cn(fillHeight && "flex min-h-0 min-w-0 w-full flex-1 flex-col")}
            >
              {children}
            </div>
          </div>
        </main>
      </WorkspaceBody>
    </div>
  );
}
