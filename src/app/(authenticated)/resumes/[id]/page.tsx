"use client";

import { useEffect, useMemo, useState } from "react";
import { use } from "react";
import { toast } from "sonner";
import { AppWorkspace } from "@/components/layout/app-workspace";
import { ResumeWorkspace } from "@/components/cv/resume-workspace";
import { CvLivePreview } from "@/components/cv/cv-live-preview";
import { getResumeWithContent } from "@/lib/api/cv-api";
import { exportResumePdf } from "@/lib/cv/export-pdf";
import { DEFAULT_PAGE_MARGIN_MM } from "@/lib/cv/page-format";
import { setLastOpenedResumeId } from "@/lib/cv/preferences";
import { useRedirectIfResumeMissing } from "@/lib/cv/use-redirect-if-resume-missing";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import type { PageFormat, ResumeWithContent } from "@/lib/types/cv";

interface ResumePageProps {
  params: Promise<{ id: string }>;
}

export default function ResumePage({ params }: ResumePageProps) {
  const { id } = use(params);
  const { user } = useWorkspace();
  const { refreshKey, resumeContentPatch } = useCvAssistant();
  const [content, setContent] = useState<ResumeWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewPageFormat, setPreviewPageFormat] = useState<PageFormat | null>(null);
  const [previewMarginHorizontalMm, setPreviewMarginHorizontalMm] = useState<number | null>(null);
  const [previewMarginVerticalMm, setPreviewMarginVerticalMm] = useState<number | null>(null);
  const [previewShowPhoto, setPreviewShowPhoto] = useState<boolean | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    setLastOpenedResumeId(user.id, id);
  }, [id, user.id]);

  useEffect(() => {
    if (resumeContentPatch?.resume.id === id) {
      setContent(resumeContentPatch);
      setLoading(false);
    }
  }, [resumeContentPatch, id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getResumeWithContent(id).then((result) => {
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
    if (
      !previewPageFormat &&
      previewMarginHorizontalMm == null &&
      previewMarginVerticalMm == null &&
      previewShowPhoto == null
    ) {
      return content;
    }
    return {
      ...content,
      settings: {
        ...content.settings,
        pageFormat,
        marginHorizontalMm,
        marginVerticalMm,
        showPhoto,
      },
    };
  }, [content, previewPageFormat, previewMarginHorizontalMm, previewMarginVerticalMm, previewShowPhoto]);

  useRedirectIfResumeMissing(id, loading, content !== null);

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
      await exportResumePdf({
        content: previewContent ?? content,
        filename: content.resume.title,
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
    <AppWorkspace
      preview={
        previewContent ? <CvLivePreview content={previewContent} /> : null
      }
    >
      <ResumeWorkspace
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
