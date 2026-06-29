import type {
  ContactProfile,
  PageFormat,
  Section,
  SectionItem,
  SectionType,
} from "@/lib/types/cv";
import type { CvTheme } from "@/lib/types/theme";

export interface Portfolio {
  id: string;
  workspaceId: string;
  title: string;
  contactProfileId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSettings {
  portfolioId: string;
  themeId: string;
  fontSize: "S" | "M" | "L";
  pageFormat: PageFormat;
  marginHorizontalMm: number;
  marginVerticalMm: number;
  showPhoto: boolean;
  locale: string;
}

export interface PortfolioSection {
  section: Section;
  items: SectionItem[];
}

export interface PortfolioWithContent {
  portfolio: Portfolio;
  contactProfile?: ContactProfile;
  settings: PortfolioSettings;
  theme: CvTheme;
  sections: PortfolioSection[];
}

export type { SectionType, SectionItem, Section, ContactProfile, PageFormat };
