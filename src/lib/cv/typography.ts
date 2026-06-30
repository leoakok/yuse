import type { ResumeSettings } from "@/lib/types/cv";

export type CvFontSize = ResumeSettings["fontSize"];

export interface CvTypography {
  bodyPx: number;
  contactNamePx: number;
  contactHeadlinePx: number;
  contactDetailsPx: number;
  sectionTitlePx: number;
  itemTitlePx: number;
  itemMetaPx: number;
}

const BODY_SCALE: Record<CvFontSize, number> = { XS: 9, S: 11, M: 13, L: 15, XL: 17 };
const NAME_SCALE: Record<CvFontSize, number> = { XS: 18, S: 20, M: 24, L: 28, XL: 32 };
const SMALL_SCALE: Record<CvFontSize, number> = { XS: 8, S: 10, M: 12, L: 14, XL: 16 };

function scale(size: CvFontSize | undefined, map: Record<CvFontSize, number>): number {
  return map[size ?? "M"];
}

export type CvTypographySettings = Pick<
  ResumeSettings,
  | "fontSize"
  | "contactNameFontSize"
  | "contactHeadlineFontSize"
  | "contactDetailsFontSize"
  | "sectionTitleFontSize"
  | "itemTitleFontSize"
  | "itemMetaFontSize"
>;

export function resolveCvTypography(settings: CvTypographySettings): CvTypography {
  return {
    bodyPx: scale(settings.fontSize, BODY_SCALE),
    contactNamePx: scale(settings.contactNameFontSize, NAME_SCALE),
    contactHeadlinePx: scale(settings.contactHeadlineFontSize, BODY_SCALE),
    contactDetailsPx: scale(settings.contactDetailsFontSize, SMALL_SCALE),
    sectionTitlePx: scale(settings.sectionTitleFontSize, SMALL_SCALE),
    itemTitlePx: scale(settings.itemTitleFontSize, BODY_SCALE),
    itemMetaPx: scale(settings.itemMetaFontSize, SMALL_SCALE),
  };
}

export function typographyToPt(typography: CvTypography) {
  const pxToPt = (px: number) => px * 0.75;
  return {
    bodyPt: pxToPt(typography.bodyPx),
    namePt: pxToPt(typography.contactNamePx),
    headlinePt: pxToPt(typography.contactHeadlinePx),
    contactDetailsPt: pxToPt(typography.contactDetailsPx),
    sectionPt: pxToPt(typography.sectionTitlePx),
    itemTitlePt: pxToPt(typography.itemTitlePx),
    smallPt: pxToPt(typography.itemMetaPx),
    lineHeight: 1.4,
  };
}

export const DEFAULT_CV_TYPOGRAPHY_SETTINGS: CvTypographySettings = {
  fontSize: "M",
  contactNameFontSize: "M",
  contactHeadlineFontSize: "M",
  contactDetailsFontSize: "M",
  sectionTitleFontSize: "M",
  itemTitleFontSize: "M",
  itemMetaFontSize: "M",
};

export const FONT_SIZE_OPTIONS: { id: CvFontSize; label: string }[] = [
  { id: "XS", label: "Extra small" },
  { id: "S", label: "Small" },
  { id: "M", label: "Medium" },
  { id: "L", label: "Large" },
  { id: "XL", label: "Extra large" },
];

export const FONT_SIZE_ORDER: CvFontSize[] = ["XS", "S", "M", "L", "XL"];

export function stepFontSize(current: CvFontSize, delta: -1 | 1): CvFontSize {
  const index = FONT_SIZE_ORDER.indexOf(current);
  const next = index + delta;
  return FONT_SIZE_ORDER[Math.max(0, Math.min(FONT_SIZE_ORDER.length - 1, next))];
}

function formatPtValue(pt: number): string {
  return Number(pt.toFixed(2)).toString();
}

export function typographyPxForKey(
  key: keyof CvTypographySettings,
  settings: CvTypographySettings
): number {
  const typography = resolveCvTypography(settings);
  const map: Record<keyof CvTypographySettings, number> = {
    fontSize: typography.bodyPx,
    contactNameFontSize: typography.contactNamePx,
    contactHeadlineFontSize: typography.contactHeadlinePx,
    contactDetailsFontSize: typography.contactDetailsPx,
    sectionTitleFontSize: typography.sectionTitlePx,
    itemTitleFontSize: typography.itemTitlePx,
    itemMetaFontSize: typography.itemMetaPx,
  };
  return map[key];
}

/** Preview label: absolute pt for body, relative offset for other roles. */
export function formatTypographySettingLabel(
  key: keyof CvTypographySettings,
  settings: CvTypographySettings
): string {
  const pt = typographyPxForKey(key, settings) * 0.75;
  if (key === "fontSize") {
    return `${formatPtValue(pt)}pt`;
  }
  const bodyPt = resolveCvTypography(settings).bodyPx * 0.75;
  const delta = pt - bodyPt;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${formatPtValue(delta)}pt`;
}
