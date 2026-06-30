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

/** CSS px at 96 dpi from print points (standard for Word/PDF sizing). */
export function ptToPx(pt: number): number {
  return Math.round((pt * 96) / 72);
}

/**
 * Professional resume font tiers (XS–XL) mapped to print points.
 * Ranges follow common ATS-friendly guidance:
 * - Body & bullets: 10–12pt (never below 10pt)
 * - Name: 18–24pt
 * - Section headings: 12–16pt
 * - Job titles: 11–14pt
 * - Contact & meta (dates, companies): 10–11pt
 */
const BODY_SCALE: Record<CvFontSize, number> = {
  XS: ptToPx(10),
  S: ptToPx(10.5),
  M: ptToPx(11),
  L: ptToPx(11.5),
  XL: ptToPx(12),
};

const NAME_SCALE: Record<CvFontSize, number> = {
  XS: ptToPx(18),
  S: ptToPx(19.5),
  M: ptToPx(21),
  L: ptToPx(22.5),
  XL: ptToPx(24),
};

const CONTACT_SCALE: Record<CvFontSize, number> = {
  XS: ptToPx(10),
  S: ptToPx(10.25),
  M: ptToPx(10.5),
  L: ptToPx(10.75),
  XL: ptToPx(11),
};

const SECTION_SCALE: Record<CvFontSize, number> = {
  XS: ptToPx(12),
  S: ptToPx(13),
  M: ptToPx(14),
  L: ptToPx(15),
  XL: ptToPx(16),
};

const ITEM_TITLE_SCALE: Record<CvFontSize, number> = {
  XS: ptToPx(11),
  S: ptToPx(11.75),
  M: ptToPx(12.5),
  L: ptToPx(13.25),
  XL: ptToPx(14),
};

function scale(size: CvFontSize | undefined, map: Record<CvFontSize, number>): number {
  const key = normalizeFontSize(size);
  return map[key];
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
    contactDetailsPx: scale(settings.contactDetailsFontSize, CONTACT_SCALE),
    sectionTitlePx: scale(settings.sectionTitleFontSize, SECTION_SCALE),
    itemTitlePx: scale(settings.itemTitleFontSize, ITEM_TITLE_SCALE),
    itemMetaPx: scale(settings.itemMetaFontSize, CONTACT_SCALE),
  };
}

export function typographyToPt(typography: CvTypography) {
  const pxToPt = (px: number) => (px * 72) / 96;
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
  { id: "XS", label: "Extra compact" },
  { id: "S", label: "Compact" },
  { id: "M", label: "Standard" },
  { id: "L", label: "Spacious" },
  { id: "XL", label: "Extra spacious" },
];

export const FONT_SIZE_ORDER: CvFontSize[] = ["XS", "S", "M", "L", "XL"];

/** Maps unknown strings to a valid tier; preserves XS–XL. */
export function normalizeFontSize(size: CvFontSize | string | undefined): CvFontSize {
  switch (size) {
    case "XS":
    case "S":
    case "M":
    case "L":
    case "XL":
      return size;
    default:
      return "M";
  }
}

export function stepFontSize(current: CvFontSize, delta: -1 | 1): CvFontSize {
  const index = FONT_SIZE_ORDER.indexOf(normalizeFontSize(current));
  const next = index + delta;
  return FONT_SIZE_ORDER[Math.max(0, Math.min(FONT_SIZE_ORDER.length - 1, next))];
}

function formatPtValue(pt: number): string {
  return Number(pt.toFixed(1)).toString();
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

/** Preview label: absolute pt for body/name, relative offset for other roles. */
export function formatTypographySettingLabel(
  key: keyof CvTypographySettings,
  settings: CvTypographySettings
): string {
  const px = typographyPxForKey(key, settings);
  const pt = (px * 72) / 96;
  if (key === "fontSize" || key === "contactNameFontSize") {
    return `${formatPtValue(pt)}pt`;
  }
  const bodyPt = (resolveCvTypography(settings).bodyPx * 72) / 96;
  const delta = pt - bodyPt;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${formatPtValue(delta)}pt`;
}
