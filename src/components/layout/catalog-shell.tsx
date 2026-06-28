import type { ReactNode } from "react";
import { PageHeader, PageTitle } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

export type CatalogShellWidth = "default" | "narrow";

const widthClass: Record<CatalogShellWidth, string> = {
  default: "max-w-6xl",
  narrow: "max-w-2xl",
};

export interface CatalogShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  width?: CatalogShellWidth;
  children: ReactNode;
}

export function CatalogShell({
  title,
  description,
  actions,
  width = "default",
  children,
}: CatalogShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PageHeader actions={actions} />
      <main className="flex-1 overflow-y-auto">
        <div className={cn("mx-auto px-4 py-8", widthClass[width])}>
          <PageTitle title={title} description={description} />
          {children}
        </div>
      </main>
    </div>
  );
}
