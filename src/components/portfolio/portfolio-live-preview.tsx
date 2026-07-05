"use client";

import type { PortfolioWithContent } from "@/lib/types/portfolio";
import { PortfolioSitePreview } from "@/components/portfolio/portfolio-site-preview";
import { useRegisterPreviewDrawerShellHeader } from "@/components/layout/preview-drawer-header-actions";
import { useWorkspacePreviewStageClassName } from "@/components/ui/drawer-shell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PortfolioLivePreviewProps {
  content: PortfolioWithContent;
}

export function PortfolioLivePreview({ content }: PortfolioLivePreviewProps) {
  const previewStageClassName = useWorkspacePreviewStageClassName();

  useRegisterPreviewDrawerShellHeader();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div
          className={cn(
            "flex min-h-full justify-center p-4",
            previewStageClassName
          )}
        >
          <div className="w-full max-w-2xl">
            <PortfolioSitePreview content={content} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
