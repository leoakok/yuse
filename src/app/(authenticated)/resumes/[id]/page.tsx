"use client";

import { useEffect, useMemo, useState } from "react";
import { use } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppWorkspace } from "@/components/layout/app-workspace";
import { ResumeWorkspace } from "@/components/cv/resume-workspace";
import { CvLivePreview } from "@/components/cv/cv-live-preview";
import { getResumeWithContent } from "@/lib/api/cv-api";
import { exportResumePdf } from "@/lib/cv/export-pdf";
import { resolveExportFilename } from "@/lib/cv/export-filename";
import { DEFAULT_PAGE_MARGIN_MM } from "@/lib/cv/page-format";
import { setLastOpenedResumeId } from "@/lib/cv/preferences";
import { useRedirectIfResumeMissing } from "@/lib/cv/use-redirect-if-resume-missing";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { useCvAssistant } from "@/components/agent/cv-assistant-provider";
import type {
  DateFormat,
  DatePosition,
  FontFamily,
  ItemTitleLayout,
  ItemTitleOrder,
  ItemTitleSeparator,
  PageFormat,
  ResumeWithContent,
  ResumeSettings,
  SectionDividerStyle,
  SkillsLayout,
} from "@/lib/types/cv";
import { DEFAULT_RESUME_ACCENT_COLOR } from "@/lib/cv/accent";
import { DEFAULT_CV_FONT_FAMILY } from "@/lib/cv/fonts";
import { DEFAULT_CV_TYPOGRAPHY_SETTINGS, type CvTypographySettings } from "@/lib/cv/typography";

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
  const [previewItemTitleLayout, setPreviewItemTitleLayout] = useState<ItemTitleLayout | null>(null);
  const [previewItemTitleSeparator, setPreviewItemTitleSeparator] = useState<ItemTitleSeparator | null>(null);
  const [previewItemTitleOrder, setPreviewItemTitleOrder] = useState<ItemTitleOrder | null>(null);
  const [previewFontFamily, setPreviewFontFamily] = useState<FontFamily | null>(null);
  const [previewAccentColor, setPreviewAccentColor] = useState<string | null>(null);
  const [previewSectionDividerStyle, setPreviewSectionDividerStyle] = useState<SectionDividerStyle | null>(null);
  const [previewDateFormat, setPreviewDateFormat] = useState<DateFormat | null>(null);
  const [previewDatePosition, setPreviewDatePosition] = useState<DatePosition | null>(null);
  const [previewSkillsLayout, setPreviewSkillsLayout] = useState<SkillsLayout | null>(null);
  const [previewAtsMode, setPreviewAtsMode] = useState<boolean | null>(null);
  const [previewDesignSettings, setPreviewDesignSettings] = useState<Partial<ResumeSettings>>({});
  const [previewTypography, setPreviewTypography] = useState<CvTypographySettings | null>(null);
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
        setPreviewItemTitleLayout(null);
        setPreviewItemTitleSeparator(null);
        setPreviewItemTitleOrder(null);
        setPreviewFontFamily(null);
        setPreviewAccentColor(null);
        setPreviewSectionDividerStyle(null);
        setPreviewDateFormat(null);
        setPreviewDatePosition(null);
        setPreviewSkillsLayout(null);
        setPreviewAtsMode(null);
        setPreviewDesignSettings({});
        setPreviewTypography(null);
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
    const itemTitleLayout = previewItemTitleLayout ?? content.settings.itemTitleLayout ?? "STACKED";
    const itemTitleSeparator = previewItemTitleSeparator ?? content.settings.itemTitleSeparator ?? "DOT";
    const itemTitleOrder = previewItemTitleOrder ?? content.settings.itemTitleOrder ?? "TITLE_FIRST";
    const fontFamily = previewFontFamily ?? content.settings.fontFamily ?? DEFAULT_CV_FONT_FAMILY;
    const accentColor = previewAccentColor ?? content.settings.accentColor ?? DEFAULT_RESUME_ACCENT_COLOR;
    const sectionDividerStyle =
      previewSectionDividerStyle ?? content.settings.sectionDividerStyle ?? "FULL";
    const dateFormat = previewDateFormat ?? content.settings.dateFormat ?? "MON_YYYY";
    const datePosition = previewDatePosition ?? content.settings.datePosition ?? "RIGHT";
    const skillsLayout = previewSkillsLayout ?? content.settings.skillsLayout ?? "LIST";
    const atsMode = previewAtsMode ?? content.settings.atsMode ?? false;
    const typography = previewTypography ?? {
      fontSize: content.settings.fontSize ?? DEFAULT_CV_TYPOGRAPHY_SETTINGS.fontSize,
      contactNameFontSize:
        content.settings.contactNameFontSize ?? DEFAULT_CV_TYPOGRAPHY_SETTINGS.contactNameFontSize,
      contactHeadlineFontSize:
        content.settings.contactHeadlineFontSize ??
        DEFAULT_CV_TYPOGRAPHY_SETTINGS.contactHeadlineFontSize,
      contactDetailsFontSize:
        content.settings.contactDetailsFontSize ??
        DEFAULT_CV_TYPOGRAPHY_SETTINGS.contactDetailsFontSize,
      sectionTitleFontSize:
        content.settings.sectionTitleFontSize ?? DEFAULT_CV_TYPOGRAPHY_SETTINGS.sectionTitleFontSize,
      itemTitleFontSize:
        content.settings.itemTitleFontSize ?? DEFAULT_CV_TYPOGRAPHY_SETTINGS.itemTitleFontSize,
      itemMetaFontSize:
        content.settings.itemMetaFontSize ?? DEFAULT_CV_TYPOGRAPHY_SETTINGS.itemMetaFontSize,
    };
    if (
      !previewPageFormat &&
      previewMarginHorizontalMm == null &&
      previewMarginVerticalMm == null &&
      previewShowPhoto == null &&
      previewItemTitleLayout == null &&
      previewItemTitleSeparator == null &&
      previewItemTitleOrder == null &&
      previewFontFamily == null &&
      previewAccentColor == null &&
      previewSectionDividerStyle == null &&
      previewDateFormat == null &&
      previewDatePosition == null &&
      previewSkillsLayout == null &&
      previewAtsMode == null &&
      Object.keys(previewDesignSettings).length === 0 &&
      previewTypography == null
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
        itemTitleLayout,
        itemTitleSeparator,
        itemTitleOrder,
        fontFamily,
        accentColor,
        sectionDividerStyle,
        dateFormat,
        datePosition,
        skillsLayout,
        atsMode,
        ...previewDesignSettings,
        ...typography,
      },
    };
  }, [
    content,
    previewPageFormat,
    previewMarginHorizontalMm,
    previewMarginVerticalMm,
    previewShowPhoto,
    previewItemTitleLayout,
    previewItemTitleSeparator,
    previewItemTitleOrder,
    previewFontFamily,
    previewAccentColor,
    previewSectionDividerStyle,
    previewDateFormat,
    previewDatePosition,
    previewSkillsLayout,
    previewAtsMode,
    previewDesignSettings,
    previewTypography,
  ]);

  useRedirectIfResumeMissing(id, loading, content !== null);

  if (!loading && !content) {
    return null;
  }

  if (loading || !content) {
    return (
      <AppWorkspace>
        <div className="flex flex-1 items-center justify-center p-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
          <span className="sr-only">Loading resume</span>
        </div>
      </AppWorkspace>
    );
  }

  async function handleDownload() {
    if (!content || isDownloading) return;
    setDownloadError(null);
    setIsDownloading(true);
    try {
      const exportContent = previewContent ?? content;
      await exportResumePdf({
        content: exportContent,
        filename: resolveExportFilename(
          exportContent.settings.exportFilenameTemplate,
          exportContent.resume,
          exportContent.contactProfile
        ),
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
        onItemTitleLayoutPreviewChange={setPreviewItemTitleLayout}
        onItemTitleSeparatorPreviewChange={setPreviewItemTitleSeparator}
        onItemTitleOrderPreviewChange={setPreviewItemTitleOrder}
        onFontFamilyPreviewChange={setPreviewFontFamily}
        onAccentColorPreviewChange={setPreviewAccentColor}
        onSectionDividerStylePreviewChange={setPreviewSectionDividerStyle}
        onDateFormatPreviewChange={setPreviewDateFormat}
        onDatePositionPreviewChange={setPreviewDatePosition}
        onSkillsLayoutPreviewChange={setPreviewSkillsLayout}
        onAtsModePreviewChange={setPreviewAtsMode}
        onDesignSettingsPreviewChange={(patch) =>
          setPreviewDesignSettings((current) => ({ ...current, ...patch }))
        }
        onTypographyPreviewChange={setPreviewTypography}
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
