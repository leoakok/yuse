import type { ContactProfile } from "@/lib/types/cv";
import type { CvTheme } from "@/lib/types/theme";

export type PortfolioLayout = "SINGLE" | "SPLIT";

export type PortfolioProjectGridColumns = "ONE" | "TWO" | "THREE";

export type PortfolioProjectCardStyle = "STANDARD" | "MINIMAL" | "IMAGE";

export type PortfolioTypographyScale = "COMPACT" | "NORMAL" | "SPACIOUS";

export type PortfolioHeroStyle = "GRADIENT" | "MINIMAL" | "CENTERED";

export type PortfolioNavigationStyle = "NONE" | "TOP" | "STICKY";

export type PortfolioAnimationLevel = "NONE" | "SUBTLE" | "FULL";

export interface Portfolio {
  id: string;
  workspaceId: string;
  title: string;
  slug?: string | null;
  tagline: string;
  about: string;
  contactProfileId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSettings {
  portfolioId: string;
  themeId: string;
  layout: PortfolioLayout;
  accentColor: string;
  showPhoto: boolean;
  locale: string;
  projectGridColumns: PortfolioProjectGridColumns;
  projectCardStyle: PortfolioProjectCardStyle;
  typographyScale: PortfolioTypographyScale;
  heroStyle: PortfolioHeroStyle;
  navigationStyle: PortfolioNavigationStyle;
  animationLevel: PortfolioAnimationLevel;
}

export interface PortfolioProject {
  id: string;
  portfolioId: string;
  title: string;
  tagline: string;
  problem: string;
  approach: string;
  outcome: string;
  techStack: string[];
  liveUrl?: string | null;
  repoUrl?: string | null;
  imageUrl?: string | null;
  featured: boolean;
  showInPreview: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSkill {
  id: string;
  portfolioId: string;
  name: string;
  category?: string | null;
  showInPreview: boolean;
  sortOrder: number;
}

export interface PortfolioTestimonial {
  id: string;
  portfolioId: string;
  quote: string;
  author: string;
  role: string;
  showInPreview: boolean;
  sortOrder: number;
}

export interface PortfolioWithContent {
  portfolio: Portfolio;
  contactProfile?: ContactProfile;
  settings: PortfolioSettings;
  theme: CvTheme;
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
  testimonials: PortfolioTestimonial[];
}

export type { ContactProfile };
