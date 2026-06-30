import type {
  ColumnLayout,
  ContactLayout,
  DateFormat,
  DatePosition,
  DesignPresetId,
  FontFamily,
  ItemTitleLayout,
  ItemTitleOrder,
  ItemTitleSeparator,
  ResumeSettings,
  SectionDividerStyle,
  SidebarPosition,
  SidebarWidth,
  SkillsLayout,
} from "@/lib/types/cv";
import { DEFAULT_RESUME_ACCENT_COLOR } from "@/lib/cv/accent";
import { DEFAULT_CV_FONT_FAMILY } from "@/lib/cv/fonts";
import type { ResumeDesignExtensionFields } from "@/lib/cv/resume-design";
import type { CvTypographySettings } from "@/lib/cv/typography";

export interface DesignPresetOption {
  id: DesignPresetId;
  label: string;
  description: string;
}

export const DESIGN_PRESET_OPTIONS: DesignPresetOption[] = [
  { id: "CLASSIC", label: "Classic", description: "Serif, single column, timeless" },
  { id: "MODERN", label: "Modern", description: "Clean sans, two columns" },
  { id: "EXECUTIVE", label: "Executive", description: "Formal serif, right sidebar" },
  { id: "CREATIVE", label: "Creative", description: "Bold accent, wide sidebar" },
  { id: "MINIMAL", label: "Minimal", description: "Airy spacing, no dividers" },
  { id: "PROFESSIONAL", label: "Professional", description: "Polished single column" },
  { id: "TECHNICAL", label: "Technical", description: "Mono type, skill tags" },
  { id: "ACADEMIC", label: "Academic", description: "Scholarly serif layout" },
  { id: "ELEGANT", label: "Elegant", description: "Refined serif, soft background" },
  { id: "BOLD", label: "Bold", description: "Strong accent, visual hierarchy" },
];

export const DESIGN_PRESET_IDS: DesignPresetId[] = DESIGN_PRESET_OPTIONS.map((option) => option.id);

export interface DesignPresetBundle {
  themeId: string;
  designPresetId: DesignPresetId;
  fontFamily: FontFamily;
  accentColor: string;
  sectionDividerStyle: SectionDividerStyle;
  itemTitleLayout: ItemTitleLayout;
  itemTitleSeparator: ItemTitleSeparator;
  itemTitleOrder: ItemTitleOrder;
  columnLayout: ColumnLayout;
  sidebarPosition: SidebarPosition;
  sidebarWidth: SidebarWidth;
  contactLayout: ContactLayout;
  skillsLayout: SkillsLayout;
  dateFormat: DateFormat;
  datePosition: DatePosition;
  typography?: Partial<CvTypographySettings>;
  extension?: Partial<ResumeDesignExtensionFields>;
}

const PRESETS: Record<DesignPresetId, DesignPresetBundle> = {
  CLASSIC: {
    themeId: "theme-classic",
    designPresetId: "CLASSIC",
    fontFamily: "SERIF",
    accentColor: "#0f172a",
    sectionDividerStyle: "FULL",
    itemTitleLayout: "STACKED",
    itemTitleSeparator: "DOT",
    itemTitleOrder: "TITLE_FIRST",
    columnLayout: "SINGLE",
    sidebarPosition: "LEFT",
    sidebarWidth: "MEDIUM",
    contactLayout: "INLINE",
    skillsLayout: "LIST",
    dateFormat: "MON_YYYY",
    datePosition: "RIGHT",
    extension: {
      sectionSpacing: "NORMAL",
      itemSpacing: "NORMAL",
      headingFontFamily: "SERIF",
      bodyFontFamily: "SERIF",
      sectionTitleSmallCaps: true,
    },
  },
  MODERN: {
    themeId: "theme-modern",
    designPresetId: "MODERN",
    fontFamily: "SANS",
    accentColor: "#2563eb",
    sectionDividerStyle: "TEXT_WIDTH",
    itemTitleLayout: "INLINE",
    itemTitleSeparator: "DOT",
    itemTitleOrder: "TITLE_FIRST",
    columnLayout: "TWO_COLUMN",
    sidebarPosition: "LEFT",
    sidebarWidth: "MEDIUM",
    contactLayout: "INLINE",
    skillsLayout: "TAGS",
    dateFormat: "MON_YYYY",
    datePosition: "RIGHT",
    extension: {
      sectionSpacing: "NORMAL",
      itemSpacing: "NORMAL",
      headingFontFamily: "SANS",
      bodyFontFamily: "SANS",
    },
  },
  EXECUTIVE: {
    themeId: "theme-classic",
    designPresetId: "EXECUTIVE",
    fontFamily: "SERIF",
    accentColor: "#0f172a",
    sectionDividerStyle: "FULL",
    itemTitleLayout: "STACKED",
    itemTitleSeparator: "DOT",
    itemTitleOrder: "TITLE_FIRST",
    columnLayout: "TWO_COLUMN",
    sidebarPosition: "RIGHT",
    sidebarWidth: "NARROW",
    contactLayout: "STACKED",
    skillsLayout: "LIST",
    dateFormat: "MON_YYYY",
    datePosition: "RIGHT",
    extension: {
      sectionSpacing: "NORMAL",
      itemSpacing: "NORMAL",
      nameFontWeight: "SEMIBOLD",
      sectionTitleFontWeight: "SEMIBOLD",
      headingFontFamily: "SERIF",
      bodyFontFamily: "SERIF",
      sectionTitleSmallCaps: true,
    },
  },
  CREATIVE: {
    themeId: "theme-modern",
    designPresetId: "CREATIVE",
    fontFamily: "SANS",
    accentColor: "#7c3aed",
    sectionDividerStyle: "TEXT_WIDTH",
    itemTitleLayout: "INLINE",
    itemTitleSeparator: "PIPE",
    itemTitleOrder: "TITLE_FIRST",
    columnLayout: "TWO_COLUMN",
    sidebarPosition: "LEFT",
    sidebarWidth: "WIDE",
    contactLayout: "ICON_LABEL",
    skillsLayout: "TAGS",
    dateFormat: "MON_YYYY",
    datePosition: "INLINE",
    extension: {
      sectionSpacing: "AIRY",
      itemSpacing: "NORMAL",
      skillsProficiency: "DOTS",
      headingFontFamily: "SANS",
      bodyFontFamily: "SANS",
    },
  },
  MINIMAL: {
    themeId: "theme-modern",
    designPresetId: "MINIMAL",
    fontFamily: "SANS",
    accentColor: "#18181b",
    sectionDividerStyle: "NONE",
    itemTitleLayout: "STACKED",
    itemTitleSeparator: "DOT",
    itemTitleOrder: "TITLE_FIRST",
    columnLayout: "SINGLE",
    sidebarPosition: "LEFT",
    sidebarWidth: "MEDIUM",
    contactLayout: "INLINE",
    skillsLayout: "LIST",
    dateFormat: "YYYY",
    datePosition: "BELOW",
    typography: {
      fontSize: "S",
      sectionTitleFontSize: "S",
      itemTitleFontSize: "S",
    },
    extension: {
      sectionSpacing: "AIRY",
      itemSpacing: "AIRY",
      descriptionStyle: "PARAGRAPH",
      lineHeight: "RELAXED",
      headingFontFamily: "SANS",
      bodyFontFamily: "SANS",
      sectionTitleSmallCaps: false,
      nameFontWeight: "MEDIUM",
    },
  },
  PROFESSIONAL: {
    themeId: "theme-modern",
    designPresetId: "PROFESSIONAL",
    fontFamily: "SANS",
    accentColor: "#059669",
    sectionDividerStyle: "TEXT_WIDTH",
    itemTitleLayout: "INLINE",
    itemTitleSeparator: "DOT",
    itemTitleOrder: "COMPANY_FIRST",
    columnLayout: "SINGLE",
    sidebarPosition: "LEFT",
    sidebarWidth: "MEDIUM",
    contactLayout: "INLINE",
    skillsLayout: "COLUMNS",
    dateFormat: "MON_YYYY",
    datePosition: "RIGHT",
    extension: {
      sectionSpacing: "NORMAL",
      itemSpacing: "NORMAL",
      itemTitleEmphasis: "COMPANY",
      locationDisplay: "INLINE_WITH_COMPANY",
      headingFontFamily: "SANS",
      bodyFontFamily: "SANS",
    },
  },
  TECHNICAL: {
    themeId: "theme-modern",
    designPresetId: "TECHNICAL",
    fontFamily: "MONO",
    accentColor: "#10b981",
    sectionDividerStyle: "TEXT_WIDTH",
    itemTitleLayout: "INLINE",
    itemTitleSeparator: "PIPE",
    itemTitleOrder: "TITLE_FIRST",
    columnLayout: "TWO_COLUMN",
    sidebarPosition: "LEFT",
    sidebarWidth: "NARROW",
    contactLayout: "STACKED",
    skillsLayout: "TAGS",
    dateFormat: "ISO",
    datePosition: "RIGHT",
    extension: {
      sectionSpacing: "COMPACT",
      itemSpacing: "COMPACT",
      skillsProficiency: "BARS",
      headingFontFamily: "SANS",
      bodyFontFamily: "MONO",
      lineHeight: "TIGHT",
    },
  },
  ACADEMIC: {
    themeId: "theme-classic",
    designPresetId: "ACADEMIC",
    fontFamily: "SERIF",
    accentColor: "#78350f",
    sectionDividerStyle: "FULL",
    itemTitleLayout: "STACKED",
    itemTitleSeparator: "COMMA",
    itemTitleOrder: "TITLE_FIRST",
    columnLayout: "SINGLE",
    sidebarPosition: "LEFT",
    sidebarWidth: "MEDIUM",
    contactLayout: "STACKED",
    skillsLayout: "LIST",
    dateFormat: "YYYY",
    datePosition: "BELOW",
    extension: {
      sectionSpacing: "NORMAL",
      itemSpacing: "NORMAL",
      descriptionStyle: "PARAGRAPH",
      locationDisplay: "OWN_LINE",
      headingFontFamily: "SERIF",
      bodyFontFamily: "SERIF",
      sectionTitleSmallCaps: true,
      certificationsLayout: "DETAILED",
    },
  },
  ELEGANT: {
    themeId: "theme-classic",
    designPresetId: "ELEGANT",
    fontFamily: "SERIF",
    accentColor: "#881337",
    sectionDividerStyle: "TEXT_WIDTH",
    itemTitleLayout: "STACKED",
    itemTitleSeparator: "DOT",
    itemTitleOrder: "TITLE_FIRST",
    columnLayout: "TWO_COLUMN",
    sidebarPosition: "RIGHT",
    sidebarWidth: "MEDIUM",
    contactLayout: "STACKED",
    skillsLayout: "LIST",
    dateFormat: "MON_YYYY",
    datePosition: "RIGHT",
    extension: {
      sectionSpacing: "AIRY",
      itemSpacing: "NORMAL",
      pageBackground: "OFF_WHITE",
      headingFontFamily: "SERIF",
      bodyFontFamily: "SERIF",
      sectionTitleSmallCaps: true,
      nameFontWeight: "LIGHT",
      lineHeight: "RELAXED",
    },
  },
  BOLD: {
    themeId: "theme-modern",
    designPresetId: "BOLD",
    fontFamily: "SANS",
    accentColor: "#ea580c",
    sectionDividerStyle: "FULL",
    itemTitleLayout: "INLINE",
    itemTitleSeparator: "PIPE",
    itemTitleOrder: "TITLE_FIRST",
    columnLayout: "TWO_COLUMN",
    sidebarPosition: "LEFT",
    sidebarWidth: "WIDE",
    contactLayout: "ICON_LABEL",
    skillsLayout: "TAGS",
    dateFormat: "MON_YYYY",
    datePosition: "RIGHT",
    typography: {
      contactNameFontSize: "L",
      sectionTitleFontSize: "L",
    },
    extension: {
      sectionSpacing: "NORMAL",
      itemSpacing: "NORMAL",
      highlightCurrentRole: true,
      skillsProficiency: "BARS",
      nameFontWeight: "SEMIBOLD",
      sectionTitleFontWeight: "SEMIBOLD",
      headingFontFamily: "SANS",
      bodyFontFamily: "SANS",
      sectionTitleSmallCaps: false,
    },
  },
};

export function getDesignPresetBundle(id: DesignPresetId): DesignPresetBundle {
  return PRESETS[id] ?? PRESETS.MODERN;
}

export function getDesignPresetLabel(id: DesignPresetId): string {
  return DESIGN_PRESET_OPTIONS.find((option) => option.id === id)?.label ?? "Modern";
}

export function normalizeDesignPresetId(value: string | undefined): DesignPresetId {
  const upper = value?.toUpperCase().trim() as DesignPresetId | undefined;
  if (upper && DESIGN_PRESET_IDS.includes(upper)) {
    return upper;
  }
  return "MODERN";
}

export function applyDesignPreset(
  current: ResumeSettings,
  presetId: DesignPresetId
): Partial<ResumeSettings> {
  const bundle = getDesignPresetBundle(presetId);
  return {
    themeId: bundle.themeId,
    designPresetId: bundle.designPresetId,
    fontFamily: bundle.fontFamily ?? DEFAULT_CV_FONT_FAMILY,
    accentColor: bundle.accentColor || DEFAULT_RESUME_ACCENT_COLOR,
    sectionDividerStyle: bundle.sectionDividerStyle,
    itemTitleLayout: bundle.itemTitleLayout,
    itemTitleSeparator: bundle.itemTitleSeparator,
    itemTitleOrder: bundle.itemTitleOrder,
    columnLayout: bundle.columnLayout,
    sidebarPosition: bundle.sidebarPosition,
    sidebarWidth: bundle.sidebarWidth,
    contactLayout: bundle.contactLayout,
    skillsLayout: bundle.skillsLayout,
    dateFormat: bundle.dateFormat,
    datePosition: bundle.datePosition,
    ...(bundle.typography ?? {}),
    ...(bundle.extension ?? {}),
  };
}

export interface DesignPresetChangeHandlers {
  onDesignPresetChange: (presetId: DesignPresetId) => void;
  onFontFamilyChange: (fontFamily: FontFamily) => void;
  onAccentColorChange: (color: string) => void;
  onSectionDividerStyleChange: (style: SectionDividerStyle) => void;
  onItemTitleLayoutChange: (layout: ItemTitleLayout) => void;
  onItemTitleSeparatorChange: (separator: ItemTitleSeparator) => void;
  onItemTitleOrderChange: (order: ItemTitleOrder) => void;
  onColumnLayoutChange: (layout: ColumnLayout) => void;
  onSidebarPositionChange: (position: SidebarPosition) => void;
  onSidebarWidthChange: (width: SidebarWidth) => void;
  onContactLayoutChange: (layout: ContactLayout) => void;
  onSkillsLayoutChange: (layout: SkillsLayout) => void;
  onDateFormatChange: (format: DateFormat) => void;
  onDatePositionChange: (position: DatePosition) => void;
  onTypographyChange?: (typography: CvTypographySettings) => void;
  onDesignExtensionChange?: (extension: ResumeDesignExtensionFields) => void;
  typography?: CvTypographySettings;
  designExtension?: ResumeDesignExtensionFields;
}

export function dispatchDesignPreset(
  presetId: DesignPresetId,
  handlers: DesignPresetChangeHandlers
): void {
  const bundle = getDesignPresetBundle(presetId);

  handlers.onDesignPresetChange(presetId);
  handlers.onFontFamilyChange(bundle.fontFamily);
  handlers.onAccentColorChange(bundle.accentColor);
  handlers.onSectionDividerStyleChange(bundle.sectionDividerStyle);
  handlers.onItemTitleLayoutChange(bundle.itemTitleLayout);
  handlers.onItemTitleSeparatorChange(bundle.itemTitleSeparator);
  handlers.onItemTitleOrderChange(bundle.itemTitleOrder);
  handlers.onColumnLayoutChange(bundle.columnLayout);
  handlers.onSidebarPositionChange(bundle.sidebarPosition);
  handlers.onSidebarWidthChange(bundle.sidebarWidth);
  handlers.onContactLayoutChange(bundle.contactLayout);
  handlers.onSkillsLayoutChange(bundle.skillsLayout);
  handlers.onDateFormatChange(bundle.dateFormat);
  handlers.onDatePositionChange(bundle.datePosition);

  if (bundle.typography && handlers.onTypographyChange && handlers.typography) {
    handlers.onTypographyChange({ ...handlers.typography, ...bundle.typography });
  }

  if (bundle.extension && handlers.onDesignExtensionChange && handlers.designExtension) {
    handlers.onDesignExtensionChange({ ...handlers.designExtension, ...bundle.extension });
  }
}
