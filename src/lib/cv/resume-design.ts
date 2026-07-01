import type { FontFamily, ResumeSettings } from "@/lib/types/cv";
import { resolveAccentColor } from "@/lib/cv/accent";
import { resolveCvTypography } from "@/lib/cv/typography";

export type SpacingDensity = "COMPACT" | "NORMAL" | "AIRY";
export type DescriptionStyle = "BULLETS" | "PARAGRAPH";
export type BulletChar = "DOT" | "DASH" | "CHECK";
export type ItemTitleEmphasis = "TITLE" | "COMPANY";
export type LocationDisplay = "HIDDEN" | "OWN_LINE" | "INLINE_WITH_COMPANY";
export type FontWeightRole = "LIGHT" | "REGULAR" | "MEDIUM" | "SEMIBOLD";
export type LineHeightDensity = "TIGHT" | "NORMAL" | "RELAXED";
export type LetterSpacingDensity = "TIGHT" | "NORMAL";
export type SectionTitleCase = "UPPERCASE" | "CAPITALIZE";
export type PageBackground = "WHITE" | "OFF_WHITE" | "LIGHT_GRAY";
export type SkillsProficiency = "NONE" | "DOTS" | "BARS" | "TEXT";
export type LanguagesLayout = "LIST" | "INLINE" | "COLUMNS";
export type CertificationsLayout = "LIST" | "COMPACT" | "DETAILED";
export type FooterStyle = "NONE" | "PAGE_NUMBER" | "NAME_AND_PAGE";

export const DEFAULT_EXPORT_FILENAME_TEMPLATE = "{name}-resume";

export const HIGH_CONTRAST_PALETTE = {
  accentColor: "#000000",
  textPrimaryColor: "#000000",
  textMutedColor: "#333333",
  pageBackground: "WHITE" as PageBackground,
  linkColor: "#0000ee",
};

const SPACING_GAP_PX: Record<SpacingDensity, { section: number; item: number }> = {
  COMPACT: { section: 12, item: 6 },
  NORMAL: { section: 20, item: 12 },
  AIRY: { section: 28, item: 18 },
};

const LINE_HEIGHT: Record<LineHeightDensity, number> = {
  TIGHT: 1.25,
  NORMAL: 1.4,
  RELAXED: 1.55,
};

const FONT_WEIGHT: Record<FontWeightRole, number> = {
  LIGHT: 300,
  REGULAR: 400,
  MEDIUM: 500,
  SEMIBOLD: 600,
};

const LETTER_SPACING_EM: Record<LetterSpacingDensity, string> = {
  TIGHT: "-0.02em",
  NORMAL: "0",
};

const PAGE_BG: Record<PageBackground, string> = {
  WHITE: "#ffffff",
  OFF_WHITE: "#fafaf9",
  LIGHT_GRAY: "#f4f4f5",
};

const BULLET_MARKERS: Record<BulletChar, string> = {
  DOT: "•",
  DASH: "–",
  CHECK: "✓",
};

export interface CvDesignTokens {
  accentColor: string;
  linkColor: string;
  textPrimary: string;
  textMuted: string;
  pageBackground: string;
  sectionGapPx: number;
  itemGapPx: number;
  lineHeight: number;
  nameFontWeight: number;
  sectionTitleFontWeight: number;
  headingLetterSpacing: string;
  sectionTitleCase: SectionTitleCase;
  headingFontFamily: FontFamily;
  bodyFontFamily: FontFamily;
  descriptionStyle: DescriptionStyle;
  bulletMarker: string;
  itemTitleEmphasis: ItemTitleEmphasis;
  highlightCurrentRole: boolean;
  locationDisplay: LocationDisplay;
  skillsProficiency: SkillsProficiency;
  languagesLayout: LanguagesLayout;
  certificationsLayout: CertificationsLayout;
  keepSectionsTogether: boolean;
  maxItemsBeforeBreak: number | null;
  footerStyle: FooterStyle;
  atsMode: boolean;
}

function normalizeEnum<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  const upper = (value ?? "").toUpperCase() as T;
  return allowed.includes(upper) ? upper : fallback;
}

export function normalizeSpacingDensity(value?: string): SpacingDensity {
  return normalizeEnum(value, ["COMPACT", "NORMAL", "AIRY"], "NORMAL");
}

export function normalizeDescriptionStyle(value?: string): DescriptionStyle {
  return normalizeEnum(value, ["BULLETS", "PARAGRAPH"], "BULLETS");
}

export function normalizeBulletChar(value?: string): BulletChar {
  return normalizeEnum(value, ["DOT", "DASH", "CHECK"], "DOT");
}

export function normalizeItemTitleEmphasis(value?: string): ItemTitleEmphasis {
  return normalizeEnum(value, ["TITLE", "COMPANY"], "TITLE");
}

export function normalizeLocationDisplay(value?: string): LocationDisplay {
  return normalizeEnum(value, ["HIDDEN", "OWN_LINE", "INLINE_WITH_COMPANY"], "OWN_LINE");
}

export function normalizeFontWeightRole(value?: string): FontWeightRole {
  return normalizeEnum(value, ["LIGHT", "REGULAR", "MEDIUM", "SEMIBOLD"], "SEMIBOLD");
}

export function normalizeLineHeightDensity(value?: string): LineHeightDensity {
  return normalizeEnum(value, ["TIGHT", "NORMAL", "RELAXED"], "NORMAL");
}

export function normalizeLetterSpacingDensity(value?: string): LetterSpacingDensity {
  return normalizeEnum(value, ["TIGHT", "NORMAL"], "NORMAL");
}

export function normalizeSectionTitleCase(value?: string): SectionTitleCase {
  return normalizeEnum(value, ["UPPERCASE", "CAPITALIZE"], "CAPITALIZE");
}

export function formatSectionTitle(title: string, caseStyle: SectionTitleCase): string {
  if (caseStyle === "UPPERCASE") {
    return title.toUpperCase();
  }
  return title.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizePageBackground(value?: string): PageBackground {
  return normalizeEnum(value, ["WHITE", "OFF_WHITE", "LIGHT_GRAY"], "WHITE");
}

export function normalizeSkillsProficiency(value?: string): SkillsProficiency {
  return normalizeEnum(value, ["NONE", "DOTS", "BARS", "TEXT"], "NONE");
}

export function normalizeLanguagesLayout(value?: string): LanguagesLayout {
  return normalizeEnum(value, ["LIST", "INLINE", "COLUMNS"], "LIST");
}

export function normalizeCertificationsLayout(value?: string): CertificationsLayout {
  return normalizeEnum(value, ["LIST", "COMPACT", "DETAILED"], "LIST");
}

export function normalizeFooterStyle(value?: string): FooterStyle {
  return normalizeEnum(value, ["NONE", "PAGE_NUMBER", "NAME_AND_PAGE"], "NONE");
}

export function resolveCvDesignTokens(settings: ResumeSettings): CvDesignTokens {
  const accent = resolveAccentColor(settings.accentColor);
  const ats = settings.atsMode;
  const sectionSpacing = normalizeSpacingDensity(settings.sectionSpacing);
  const itemSpacing = normalizeSpacingDensity(settings.itemSpacing);

  return {
    accentColor: ats ? "#000000" : accent,
    linkColor: ats ? "#0000ee" : settings.linkColor?.trim() || accent,
    textPrimary: ats ? "#000000" : settings.textPrimaryColor?.trim() || "#18181b",
    textMuted: ats ? "#333333" : settings.textMutedColor?.trim() || "#71717a",
    pageBackground: ats ? "#ffffff" : PAGE_BG[normalizePageBackground(settings.pageBackground)],
    sectionGapPx: ats ? SPACING_GAP_PX.NORMAL.section : SPACING_GAP_PX[sectionSpacing].section,
    itemGapPx: ats ? SPACING_GAP_PX.NORMAL.item : SPACING_GAP_PX[itemSpacing].item,
    lineHeight: ats ? LINE_HEIGHT.NORMAL : LINE_HEIGHT[normalizeLineHeightDensity(settings.lineHeight)],
    nameFontWeight: ats ? 700 : FONT_WEIGHT[normalizeFontWeightRole(settings.nameFontWeight)],
    sectionTitleFontWeight: ats
      ? 600
      : FONT_WEIGHT[normalizeFontWeightRole(settings.sectionTitleFontWeight)],
    headingLetterSpacing: ats
      ? "0"
      : LETTER_SPACING_EM[normalizeLetterSpacingDensity(settings.headingLetterSpacing)],
    sectionTitleCase: ats ? "UPPERCASE" : normalizeSectionTitleCase(settings.sectionTitleCase),
    headingFontFamily: ats ? "SANS" : settings.headingFontFamily ?? settings.fontFamily ?? "SANS",
    bodyFontFamily: ats ? "SANS" : settings.bodyFontFamily ?? settings.fontFamily ?? "SANS",
    descriptionStyle: ats ? "BULLETS" : normalizeDescriptionStyle(settings.descriptionStyle),
    bulletMarker: BULLET_MARKERS[normalizeBulletChar(settings.bulletChar)],
    itemTitleEmphasis: normalizeItemTitleEmphasis(settings.itemTitleEmphasis),
    highlightCurrentRole: !ats && settings.highlightCurrentRole,
    locationDisplay: ats ? "INLINE_WITH_COMPANY" : normalizeLocationDisplay(settings.locationDisplay),
    skillsProficiency: ats ? "NONE" : normalizeSkillsProficiency(settings.skillsProficiency),
    languagesLayout: ats ? "LIST" : normalizeLanguagesLayout(settings.languagesLayout),
    certificationsLayout: ats ? "LIST" : normalizeCertificationsLayout(settings.certificationsLayout),
    keepSectionsTogether: settings.keepSectionsTogether,
    maxItemsBeforeBreak: settings.maxItemsBeforeBreak ?? null,
    footerStyle: normalizeFooterStyle(settings.footerStyle),
    atsMode: ats,
  };
}

export function isCurrentRole(metadata: Record<string, string | undefined>): boolean {
  const end = metadata.endDate?.trim().toLowerCase();
  return !end || end === "present";
}

export function sectionDisplayTitle(
  section: { title: string },
  displayTitle?: string | null
): string {
  const override = displayTitle?.trim();
  return override || section.title;
}

/** Design fields persisted on ResumeSettings (phases 3–7). */
export type ResumeDesignExtensionFields = Pick<
  ResumeSettings,
  | "sectionSpacing"
  | "itemSpacing"
  | "descriptionStyle"
  | "bulletChar"
  | "itemTitleEmphasis"
  | "highlightCurrentRole"
  | "locationDisplay"
  | "headingFontFamily"
  | "bodyFontFamily"
  | "nameFontWeight"
  | "sectionTitleFontWeight"
  | "lineHeight"
  | "headingLetterSpacing"
  | "sectionTitleCase"
  | "textPrimaryColor"
  | "textMutedColor"
  | "pageBackground"
  | "linkColor"
  | "skillsProficiency"
  | "languagesLayout"
  | "certificationsLayout"
  | "keepSectionsTogether"
  | "maxItemsBeforeBreak"
  | "footerStyle"
  | "exportFilenameTemplate"
>;

export const DEFAULT_RESUME_DESIGN_EXTENSION: ResumeDesignExtensionFields = {
  sectionSpacing: "NORMAL",
  itemSpacing: "NORMAL",
  descriptionStyle: "BULLETS",
  bulletChar: "DOT",
  itemTitleEmphasis: "TITLE",
  highlightCurrentRole: false,
  locationDisplay: "OWN_LINE",
  headingFontFamily: "SANS",
  bodyFontFamily: "SANS",
  nameFontWeight: "SEMIBOLD",
  sectionTitleFontWeight: "SEMIBOLD",
  lineHeight: "NORMAL",
  headingLetterSpacing: "NORMAL",
  sectionTitleCase: "CAPITALIZE",
  textPrimaryColor: "",
  textMutedColor: "",
  pageBackground: "WHITE",
  linkColor: "",
  skillsProficiency: "NONE",
  languagesLayout: "LIST",
  certificationsLayout: "LIST",
  keepSectionsTogether: true,
  maxItemsBeforeBreak: null,
  footerStyle: "NONE",
  exportFilenameTemplate: DEFAULT_EXPORT_FILENAME_TEMPLATE,
};

export function pickResumeDesignExtension(settings: Partial<ResumeSettings>): ResumeDesignExtensionFields {
  return {
    sectionSpacing: normalizeSpacingDensity(settings.sectionSpacing),
    itemSpacing: normalizeSpacingDensity(settings.itemSpacing),
    descriptionStyle: normalizeDescriptionStyle(settings.descriptionStyle),
    bulletChar: normalizeBulletChar(settings.bulletChar),
    itemTitleEmphasis: normalizeItemTitleEmphasis(settings.itemTitleEmphasis),
    highlightCurrentRole: settings.highlightCurrentRole ?? false,
    locationDisplay: normalizeLocationDisplay(settings.locationDisplay),
    headingFontFamily: settings.headingFontFamily ?? settings.fontFamily ?? "SANS",
    bodyFontFamily: settings.bodyFontFamily ?? settings.fontFamily ?? "SANS",
    nameFontWeight: normalizeFontWeightRole(settings.nameFontWeight),
    sectionTitleFontWeight: normalizeFontWeightRole(settings.sectionTitleFontWeight),
    lineHeight: normalizeLineHeightDensity(settings.lineHeight),
    headingLetterSpacing: normalizeLetterSpacingDensity(settings.headingLetterSpacing),
    sectionTitleCase: normalizeSectionTitleCase(settings.sectionTitleCase),
    textPrimaryColor: settings.textPrimaryColor ?? "",
    textMutedColor: settings.textMutedColor ?? "",
    pageBackground: normalizePageBackground(settings.pageBackground),
    linkColor: settings.linkColor ?? "",
    skillsProficiency: normalizeSkillsProficiency(settings.skillsProficiency),
    languagesLayout: normalizeLanguagesLayout(settings.languagesLayout),
    certificationsLayout: normalizeCertificationsLayout(settings.certificationsLayout),
    keepSectionsTogether: settings.keepSectionsTogether ?? true,
    maxItemsBeforeBreak: settings.maxItemsBeforeBreak ?? null,
    footerStyle: normalizeFooterStyle(settings.footerStyle),
    exportFilenameTemplate: settings.exportFilenameTemplate?.trim() || DEFAULT_EXPORT_FILENAME_TEMPLATE,
  };
}

export function resolveTypographyWithLineHeight(settings: ResumeSettings) {
  const typography = resolveCvTypography(settings);
  const tokens = resolveCvDesignTokens(settings);
  return { typography, lineHeight: tokens.lineHeight };
}
