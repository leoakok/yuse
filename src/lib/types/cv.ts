export type SectionType =
  | "SUMMARY"
  | "EXPERIENCE"
  | "EDUCATION"
  | "SKILLS"
  | "PROJECTS"
  | "CERTIFICATIONS"
  | "LANGUAGES"
  | "ORGANIZATIONS"
  | "PUBLICATIONS"
  | "AWARDS"
  | "VOLUNTEER"
  | "CUSTOM";

export interface SectionItemMetadata {
  startDate?: string;
  endDate?: string;
  location?: string;
  url?: string;
  company?: string;
  institution?: string;
  /** Proficiency for SKILLS (BEGINNER…EXPERT) or LANGUAGES (BEGINNER…NATIVE). */
  level?: string;
  [key: string]: string | undefined;
}

export interface SectionItem {
  id: string;
  workspaceId: string;
  type: SectionType;
  headline: string;
  body: string;
  metadata: SectionItemMetadata;
  showInPreview: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  workspaceId: string;
  type: SectionType;
  title: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Resume {
  id: string;
  workspaceId: string;
  title: string;
  contactProfileId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeSection {
  resumeId: string;
  sectionId: string;
  sortOrder: number;
}

export interface SectionSectionItem {
  sectionId: string;
  sectionItemId: string;
  sortOrder: number;
}

export interface ContactProfile {
  id: string;
  workspaceId: string;
  fullName: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedIn?: string;
  github?: string;
  photoUrl?: string;
  linkedinPhotoUrl?: string;
  githubPhotoUrl?: string;
  effectivePhotoUrl?: string;
  ogImageUrl?: string;
  faviconUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type PageFormat = "A4" | "LETTER";

export type ItemTitleLayout = "STACKED" | "INLINE";

export type ItemTitleSeparator = "DOT" | "PIPE" | "COMMA";

/** Which field appears first in inline item titles. */
export type ItemTitleOrder = "TITLE_FIRST" | "COMPANY_FIRST";

export type FontFamily = "SANS" | "SERIF" | "MONO";

export type SectionDividerStyle = "NONE" | "FULL" | "TEXT_WIDTH";

export type DateFormat = "MON_YYYY" | "MM_YYYY" | "YYYY" | "ISO";

export type DatePosition = "RIGHT" | "BELOW" | "INLINE";

export type SkillsLayout = "LIST" | "TAGS" | "COLUMNS";

export type SpacingDensity = "COMPACT" | "NORMAL" | "AIRY";

export type DescriptionStyle = "BULLETS" | "PARAGRAPH";

export type BulletChar = "DOT" | "DASH" | "CHECK";

export type ItemTitleEmphasis = "TITLE" | "COMPANY";

export type LocationDisplay = "HIDDEN" | "OWN_LINE" | "INLINE_WITH_COMPANY";

export type FontWeightRole = "LIGHT" | "REGULAR" | "MEDIUM" | "SEMIBOLD";

export type LineHeightDensity = "TIGHT" | "NORMAL" | "RELAXED";

export type LetterSpacingDensity = "TIGHT" | "NORMAL";

export type PageBackground = "WHITE" | "OFF_WHITE" | "LIGHT_GRAY";

export type SkillsProficiency = "NONE" | "DOTS" | "BARS" | "TEXT";

export type LanguagesLayout = "LIST" | "INLINE" | "COLUMNS";

export type CertificationsLayout = "LIST" | "COMPACT" | "DETAILED";

export type FooterStyle = "NONE" | "PAGE_NUMBER" | "NAME_AND_PAGE";

export type ColumnLayout = "SINGLE" | "TWO_COLUMN";

export type SidebarPosition = "LEFT" | "RIGHT";

export type SidebarWidth = "NARROW" | "MEDIUM" | "WIDE";

export type DesignPresetId =
  | "CLASSIC"
  | "MODERN"
  | "EXECUTIVE"
  | "CREATIVE"
  | "MINIMAL"
  | "PROFESSIONAL"
  | "TECHNICAL"
  | "ACADEMIC"
  | "ELEGANT"
  | "BOLD";

export type PhotoPosition = "HEADER_LEFT" | "HEADER_RIGHT" | "SIDEBAR" | "NONE";

export type PhotoSize = "XS" | "S" | "M" | "L" | "XL";

export type ContactLayout = "INLINE" | "STACKED" | "ICON_LABEL";

export type ContactField =
  | "EMAIL"
  | "PHONE"
  | "LOCATION"
  | "WEBSITE"
  | "LINKEDIN"
  | "GITHUB";

export type CvFontSize = "XS" | "S" | "M" | "L" | "XL";

export interface ResumeSettings {
  resumeId: string;
  themeId: string;
  fontSize: CvFontSize;
  contactNameFontSize: CvFontSize;
  contactHeadlineFontSize: CvFontSize;
  contactDetailsFontSize: CvFontSize;
  sectionTitleFontSize: CvFontSize;
  itemTitleFontSize: CvFontSize;
  itemMetaFontSize: CvFontSize;
  pageFormat: PageFormat;
  marginHorizontalMm: number;
  marginVerticalMm: number;
  showPhoto: boolean;
  itemTitleLayout: ItemTitleLayout;
  itemTitleSeparator: ItemTitleSeparator;
  itemTitleOrder: ItemTitleOrder;
  fontFamily: FontFamily;
  accentColor: string;
  sectionDividerStyle: SectionDividerStyle;
  dateFormat: DateFormat;
  datePosition: DatePosition;
  skillsLayout: SkillsLayout;
  atsMode: boolean;
  columnLayout: ColumnLayout;
  sidebarPosition: SidebarPosition;
  sidebarWidth: SidebarWidth;
  designPresetId: DesignPresetId;
  photoPosition: PhotoPosition;
  photoSize: PhotoSize;
  contactLayout: ContactLayout;
  contactFields: ContactField[];
  sectionSpacing: SpacingDensity;
  itemSpacing: SpacingDensity;
  descriptionStyle: DescriptionStyle;
  bulletChar: BulletChar;
  itemTitleEmphasis: ItemTitleEmphasis;
  highlightCurrentRole: boolean;
  locationDisplay: LocationDisplay;
  headingFontFamily: FontFamily;
  bodyFontFamily: FontFamily;
  nameFontWeight: FontWeightRole;
  sectionTitleFontWeight: FontWeightRole;
  lineHeight: LineHeightDensity;
  headingLetterSpacing: LetterSpacingDensity;
  sectionTitleSmallCaps: boolean;
  textPrimaryColor: string;
  textMutedColor: string;
  pageBackground: PageBackground;
  linkColor: string;
  skillsProficiency: SkillsProficiency;
  languagesLayout: LanguagesLayout;
  certificationsLayout: CertificationsLayout;
  keepSectionsTogether: boolean;
  maxItemsBeforeBreak: number | null;
  footerStyle: FooterStyle;
  exportFilenameTemplate: string;
  locale: string;
}

export interface ResumeWithContent {
  resume: Resume;
  contactProfile?: ContactProfile;
  settings: ResumeSettings;
  theme: import("@/lib/types/theme").CvTheme;
  sections: Array<{
    section: Section;
    displayTitle?: string | null;
    items: SectionItem[];
    showInPreview: boolean;
  }>;
}

export interface SectionItemUsage {
  sectionItem: SectionItem;
  sections: Section[];
  resumes: Resume[];
  portfolios?: import("@/lib/types/portfolio").Portfolio[];
}

export interface WorkspaceStats {
  resumeCount: number;
  sectionCount: number;
  sectionItemCount: number;
}
