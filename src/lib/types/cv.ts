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
  createdAt: string;
  updatedAt: string;
}

export type PageFormat = "A4" | "LETTER";

export interface ResumeSettings {
  resumeId: string;
  themeId: string;
  fontSize: "S" | "M" | "L";
  pageFormat: PageFormat;
  marginHorizontalMm: number;
  marginVerticalMm: number;
  showPhoto: boolean;
  locale: string;
}

export interface ResumeWithContent {
  resume: Resume;
  contactProfile?: ContactProfile;
  settings: ResumeSettings;
  theme: import("@/lib/types/theme").CvTheme;
  sections: Array<{
    section: Section;
    items: SectionItem[];
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
