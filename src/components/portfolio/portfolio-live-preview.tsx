"use client";

import type { PortfolioWithContent } from "@/lib/types/portfolio";
import { PortfolioSitePreview } from "@/components/portfolio/portfolio-site-preview";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PortfolioLivePreviewProps {
  content: PortfolioWithContent;
}

export function PortfolioLivePreview({ content }: PortfolioLivePreviewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full justify-center bg-muted/40 p-4">
          <div className="w-full max-w-2xl">
            <PortfolioSitePreview content={content} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
