import type { ReactNode } from "react";
import { PageTitle } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

export type CatalogShellWidth = "default" | "narrow" | "full";

const widthClass: Record<CatalogShellWidth, string> = {
  default: "max-w-6xl",
  narrow: "max-w-2xl",
  full: "max-w-none",
};

export interface CatalogShellProps {
  title?: string;
  description?: string;
  /** Primary actions for this catalog page (import, create), rendered beside the page title. */
  actions?: ReactNode;
  width?: CatalogShellWidth;
  /** Stretch page content to fill remaining viewport height below the title. */
  fillHeight?: boolean;
  /** Smaller title row for dense tool pages like admin. */
  compactHeader?: boolean;
  /** Full-bleed content: no side gutters or top title band. */
  edgeToEdge?: boolean;
  children: ReactNode;
}

export function CatalogShell({
  title,
  description,
  actions,
  width = "default",
  fillHeight = false,
  compactHeader = false,
  edgeToEdge = false,
  children,
}: CatalogShellProps) {
  const showTitle = Boolean(title);

  return (
    <main
      className={cn(
        "w-full min-h-0 flex-1",
        fillHeight ? "flex min-h-0 flex-col overflow-hidden" : "overflow-y-auto",
      )}
    >
      <div
        className={cn(
          "mx-auto w-full min-w-0 px-4 pt-6 pb-8",
          widthClass[width],
          fillHeight && "flex min-h-0 flex-1 flex-col",
          width === "full" && fillHeight && "px-0 pb-0",
          compactHeader && width === "full" && fillHeight && !edgeToEdge && "pt-4",
          edgeToEdge && "pt-0",
        )}
      >
        {showTitle ? (
          <div
            className={cn(
              fillHeight && "shrink-0",
              width === "full" && "px-4",
              compactHeader && "px-4 lg:px-5",
            )}
          >
            <PageTitle
              title={title!}
              description={description}
              actions={actions}
              compact={compactHeader}
            />
          </div>
        ) : null}
        <div
          className={cn(
            fillHeight && "flex min-h-0 min-w-0 w-full flex-1 flex-col",
            compactHeader && !edgeToEdge && "px-4 lg:px-5",
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
