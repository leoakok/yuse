import type { ResumeSettings, ResumeWithContent } from "@/lib/types/cv";
import { DEFAULT_RESUME_ACCENT_COLOR } from "@/lib/cv/accent";
import { normalizeContactFields } from "@/lib/cv/contact-header";
import { normalizeDesignPresetId } from "@/lib/cv/design-presets";
import { DEFAULT_CV_FONT_FAMILY } from "@/lib/cv/fonts";
import { DEFAULT_PAGE_MARGIN_MM } from "@/lib/cv/page-format";
import {
  DEFAULT_EXPORT_FILENAME_TEMPLATE,
  DEFAULT_RESUME_DESIGN_EXTENSION,
  pickResumeDesignExtension,
} from "@/lib/cv/resume-design";
import { DEFAULT_CV_TYPOGRAPHY_SETTINGS } from "@/lib/cv/typography";
import { snapMarginMm } from "@/lib/cv/page-format";
import { mapSectionDividerStyle } from "@/lib/cv/accent";
import { normalizeFontFamily } from "@/lib/cv/fonts";
import { normalizeFontSize } from "@/lib/cv/typography";

/** Default resume settings matching backend `defaultResumeSettings` in helpers.go. */
export const DEFAULT_RESUME_SETTINGS: Omit<ResumeSettings, "resumeId"> = {
  themeId: "theme-modern",
  ...DEFAULT_CV_TYPOGRAPHY_SETTINGS,
  pageFormat: "A4",
  marginHorizontalMm: DEFAULT_PAGE_MARGIN_MM,
  marginVerticalMm: DEFAULT_PAGE_MARGIN_MM,
  showPhoto: false,
  itemTitleLayout: "STACKED",
  itemTitleSeparator: "DOT",
  itemTitleOrder: "TITLE_FIRST",
  fontFamily: DEFAULT_CV_FONT_FAMILY,
  accentColor: DEFAULT_RESUME_ACCENT_COLOR,
  sectionDividerStyle: "FULL",
  dateFormat: "MON_YYYY",
  datePosition: "RIGHT",
  skillsLayout: "LIST",
  atsMode: false,
  columnLayout: "SINGLE",
  sidebarPosition: "LEFT",
  sidebarWidth: "MEDIUM",
  designPresetId: "MODERN",
  photoPosition: "HEADER_LEFT",
  photoSize: "M",
  contactLayout: "INLINE",
  contactFields: normalizeContactFields(undefined),
  ...DEFAULT_RESUME_DESIGN_EXTENSION,
  locale: "en-US",
};

export function defaultResumeSettings(resumeId: string): ResumeSettings {
  return { resumeId, ...DEFAULT_RESUME_SETTINGS };
}

/** Normalize raw GraphQL resume settings into a complete ResumeSettings object. */
export function normalizeResumeSettings(
  settings: Partial<ResumeSettings> & { resumeId: string }
): ResumeSettings {
  const base = defaultResumeSettings(settings.resumeId);
  return {
    ...base,
    ...settings,
    ...pickResumeDesignExtension({ ...base, ...settings }),
    fontSize: normalizeFontSize(settings.fontSize as string | undefined),
    contactNameFontSize: normalizeFontSize(settings.contactNameFontSize as string | undefined),
    contactHeadlineFontSize: normalizeFontSize(settings.contactHeadlineFontSize as string | undefined),
    contactDetailsFontSize: normalizeFontSize(settings.contactDetailsFontSize as string | undefined),
    sectionTitleFontSize: normalizeFontSize(settings.sectionTitleFontSize as string | undefined),
    itemTitleFontSize: normalizeFontSize(settings.itemTitleFontSize as string | undefined),
    itemMetaFontSize: normalizeFontSize(settings.itemMetaFontSize as string | undefined),
    marginHorizontalMm: snapMarginMm(settings.marginHorizontalMm ?? base.marginHorizontalMm),
    marginVerticalMm: snapMarginMm(settings.marginVerticalMm ?? base.marginVerticalMm),
    fontFamily: normalizeFontFamily(settings.fontFamily as string | undefined),
    accentColor: settings.accentColor?.trim() || DEFAULT_RESUME_ACCENT_COLOR,
    sectionDividerStyle: mapSectionDividerStyle(settings.sectionDividerStyle as string | undefined),
    designPresetId: normalizeDesignPresetId(settings.designPresetId as string | undefined),
    contactFields: normalizeContactFields(settings.contactFields),
    exportFilenameTemplate:
      settings.exportFilenameTemplate?.trim() || DEFAULT_EXPORT_FILENAME_TEMPLATE,
    locale: settings.locale?.trim() || base.locale,
  };
}

export function applyResumeSettingsPreview(
  content: ResumeWithContent,
  patch: Partial<ResumeSettings> | null | undefined
): ResumeWithContent {
  if (!patch || Object.keys(patch).length === 0) return content;
  return {
    ...content,
    settings: normalizeResumeSettings({
      ...content.settings,
      ...patch,
      resumeId: content.settings.resumeId,
    }),
  };
}

export { DEFAULT_EXPORT_FILENAME_TEMPLATE };
