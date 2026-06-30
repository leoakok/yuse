"use client";

import { useEffect, useMemo, useState } from "react";
import { use } from "react";
import { Loader2 } from "lucide-react";
import { AppWorkspace } from "@/components/layout/app-workspace";
import { PortfolioWorkspace } from "@/components/portfolio/portfolio-workspace";
import { PortfolioLivePreview } from "@/components/portfolio/portfolio-live-preview";
import { getPortfolioWithContent } from "@/lib/api/portfolio-api";
import { useRedirectIfPortfolioMissing } from "@/lib/portfolio/use-redirect-if-portfolio-missing";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import type { PortfolioSettings, PortfolioWithContent } from "@/lib/types/portfolio";

interface PortfolioPageProps {
  params: Promise<{ id: string }>;
}

export default function PortfolioPage({ params }: PortfolioPageProps) {
  const { id } = use(params);
  const { refreshKey, portfolioContentPatch } = useCvAssistant();
  const [content, setContent] = useState<PortfolioWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewSettings, setPreviewSettings] = useState<Partial<PortfolioSettings> | null>(null);

  useEffect(() => {
    if (portfolioContentPatch?.portfolio.id === id) {
      setContent(portfolioContentPatch);
      setLoading(false);
    }
  }, [portfolioContentPatch, id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getPortfolioWithContent(id).then((result) => {
      if (!cancelled) {
        setContent(result ?? null);
        setPreviewSettings(null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  const previewContent = useMemo(() => {
    if (!content) return null;
    if (!previewSettings) return content;
    return {
      ...content,
      settings: { ...content.settings, ...previewSettings },
    };
  }, [content, previewSettings]);

  useRedirectIfPortfolioMissing(id, loading, content !== null);

  if (!loading && !content) return null;

  if (loading || !content) {
    return (
      <AppWorkspace>
        <div className="flex flex-1 items-center justify-center p-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
          <span className="sr-only">Loading portfolio</span>
        </div>
      </AppWorkspace>
    );
  }

  return (
    <AppWorkspace preview={previewContent ? <PortfolioLivePreview content={previewContent} /> : null}>
      <PortfolioWorkspace
        content={content}
        onContentChange={setContent}
        onPreviewSettingsChange={(patch) =>
          setPreviewSettings((current) => ({ ...current, ...patch }))
        }
      />
    </AppWorkspace>
  );
}
