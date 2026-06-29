"use client";

import { useEffect, useMemo, useState } from "react";
import { use } from "react";
import { toast } from "sonner";
import { AppWorkspace } from "@/components/layout/app-workspace";
import { PortfolioWorkspace } from "@/components/portfolio/portfolio-workspace";
import { CvLivePreview } from "@/components/cv/cv-live-preview";
import { getPortfolioWithContent } from "@/lib/api/portfolio-api";
import { exportPortfolioPdf } from "@/lib/portfolio/export-pdf";
import { portfolioToPreviewContent } from "@/lib/portfolio/preview";
import { DEFAULT_PAGE_MARGIN_MM } from "@/lib/cv/page-format";
import { useRedirectIfPortfolioMissing } from "@/lib/portfolio/use-redirect-if-portfolio-missing";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import type { PageFormat } from "@/lib/types/cv";
import type { PortfolioWithContent } from "@/lib/types/portfolio";

interface PortfolioPageProps {
  params: Promise<{ id: string }>;
}

export default function PortfolioPage({ params }: PortfolioPageProps) {
  const { id } = use(params);
  const { refreshKey, portfolioContentPatch } = useCvAssistant();
  const [content, setContent] = useState<PortfolioWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewPageFormat, setPreviewPageFormat] = useState<PageFormat | null>(null);
  const [previewMarginHorizontalMm, setPreviewMarginHorizontalMm] = useState<number | null>(null);
  const [previewMarginVerticalMm, setPreviewMarginVerticalMm] = useState<number | null>(null);
  const [previewShowPhoto, setPreviewShowPhoto] = useState<boolean | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
        setPreviewPageFormat(null);
        setPreviewMarginHorizontalMm(null);
        setPreviewMarginVerticalMm(null);
        setPreviewShowPhoto(null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  const previewContent = useMemo(() => {
    if (!content) return null;
    const pageFormat = previewPageFormat ?? content.settings.pageFormat ?? "A4";
    const marginHorizontalMm =
      previewMarginHorizontalMm ??
      content.settings.marginHorizontalMm ??
      DEFAULT_PAGE_MARGIN_MM;
    const marginVerticalMm =
      previewMarginVerticalMm ?? content.settings.marginVerticalMm ?? DEFAULT_PAGE_MARGIN_MM;
    const showPhoto = previewShowPhoto ?? content.settings.showPhoto;
    const adjusted: PortfolioWithContent = {
      ...content,
      settings: {
        ...content.settings,
        pageFormat,
        marginHorizontalMm,
        marginVerticalMm,
        showPhoto,
      },
    };
    return portfolioToPreviewContent(adjusted);
  }, [
    content,
    previewPageFormat,
    previewMarginHorizontalMm,
    previewMarginVerticalMm,
    previewShowPhoto,
  ]);

  useRedirectIfPortfolioMissing(id, loading, content !== null);

  if (!loading && !content) {
    return null;
  }

  if (!content) {
    return null;
  }

  async function handleDownload() {
    if (!content || isDownloading) return;
    setDownloadError(null);
    setIsDownloading(true);
    try {
      await exportPortfolioPdf({
        content,
        filename: content.portfolio.title,
      });
      toast.success("Print dialog opened.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not open print view.";
      setDownloadError(message);
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <AppWorkspace preview={previewContent ? <CvLivePreview content={previewContent} /> : null}>
      <PortfolioWorkspace
        content={content}
        onContentChange={setContent}
        onPageFormatPreviewChange={setPreviewPageFormat}
        onShowPhotoPreviewChange={setPreviewShowPhoto}
        onMarginHorizontalPreviewChange={setPreviewMarginHorizontalMm}
        onMarginVerticalPreviewChange={setPreviewMarginVerticalMm}
        onDownload={handleDownload}
        isDownloading={isDownloading}
        downloadError={downloadError}
        onDismissDownloadError={() => setDownloadError(null)}
      />
    </AppWorkspace>
  );
}
