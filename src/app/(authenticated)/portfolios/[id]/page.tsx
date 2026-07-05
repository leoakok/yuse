"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { use } from "react";
import {
  PortfolioEditorLoadingShell,
} from "@/components/layout/app-workspace-skeleton";
import { AppWorkspace } from "@/components/layout/app-workspace";
import { PortfolioWorkspace } from "@/components/portfolio/portfolio-workspace";
import { PortfolioLivePreview } from "@/components/portfolio/portfolio-live-preview";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { getPortfolioWithContent } from "@/lib/api/portfolio-api";
import {
  getCachedPortfolioContent,
  setCachedPortfolioContent,
} from "@/lib/cache/workspace-cache";
import { useRedirectIfPortfolioMissing } from "@/lib/portfolio/use-redirect-if-portfolio-missing";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import type { PortfolioSettings, PortfolioWithContent } from "@/lib/types/portfolio";

interface PortfolioPageProps {
  params: Promise<{ id: string }>;
}

export default function PortfolioPage({ params }: PortfolioPageProps) {
  const { id } = use(params);
  const { user } = useWorkspace();
  const { refreshKey, portfolioContentPatch } = useCvAssistant();
  const [fetched, setFetched] = useState<{
    id: string;
    refreshKey: number;
    data: PortfolioWithContent | null;
  } | null>(() => {
    const cached = getCachedPortfolioContent(user.id, id);
    return cached ? { id, refreshKey, data: cached } : null;
  });
  const [previewSettings, setPreviewSettings] = useState<Partial<PortfolioSettings> | null>(null);

  const hasPatch = portfolioContentPatch?.portfolio.id === id;
  const content = hasPatch
    ? portfolioContentPatch
    : fetched && fetched.id === id && fetched.refreshKey === refreshKey
      ? fetched.data
      : null;
  const loading = !hasPatch && (!fetched || fetched.id !== id || fetched.refreshKey !== refreshKey);

  const handleContentChange = useCallback(
    (next: PortfolioWithContent) => {
      setCachedPortfolioContent(user.id, id, next);
      setFetched({ id, refreshKey, data: next });
    },
    [id, refreshKey, user.id]
  );

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedPortfolioContent(user.id, id);
    if (cached) {
      setFetched({ id, refreshKey, data: cached });
    }
    void getPortfolioWithContent(id).then((result) => {
      if (!cancelled) {
        if (result) {
          setCachedPortfolioContent(user.id, id, result);
        }
        setFetched({ id, refreshKey, data: result ?? null });
        setPreviewSettings(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey, user.id]);

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

  return (
    <AppWorkspace
      preview={
        previewContent ? (
          <PortfolioLivePreview content={previewContent} />
        ) : null
      }
    >
      {content ? (
        <PortfolioWorkspace
          content={content}
          onContentChange={handleContentChange}
          onPreviewSettingsChange={(patch) =>
            setPreviewSettings((current) => ({ ...current, ...patch }))
          }
        />
      ) : (
        <PortfolioEditorLoadingShell portfolioId={id} />
      )}
    </AppWorkspace>
  );
}
