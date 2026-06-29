import type { PageFormat, ResumeWithContent, Section, SectionItem } from "@/lib/types/cv";
import type { CvTheme } from "@/lib/types/theme";
import type {
  Portfolio,
  PortfolioSettings,
  PortfolioWithContent,
} from "@/lib/types/portfolio";

export type { Portfolio, PortfolioSettings, PortfolioWithContent };

export interface PortfolioSection {
  section: Section;
  items: SectionItem[];
}

/** Maps portfolio content to resume preview shape for shared CvPreview/CvLivePreview. */
export function portfolioToPreviewContent(
  content: PortfolioWithContent
): ResumeWithContent {
  return {
    resume: {
      id: content.portfolio.id,
      workspaceId: content.portfolio.workspaceId,
      title: content.portfolio.title,
      contactProfileId: content.portfolio.contactProfileId,
      createdBy: content.portfolio.createdBy,
      createdAt: content.portfolio.createdAt,
      updatedAt: content.portfolio.updatedAt,
    },
    contactProfile: content.contactProfile,
    settings: {
      resumeId: content.settings.portfolioId,
      themeId: content.settings.themeId,
      fontSize: content.settings.fontSize,
      pageFormat: content.settings.pageFormat as PageFormat,
      marginHorizontalMm: content.settings.marginHorizontalMm,
      marginVerticalMm: content.settings.marginVerticalMm,
      showPhoto: content.settings.showPhoto,
      locale: content.settings.locale,
    },
    theme: content.theme as CvTheme,
    sections: content.sections,
  };
}

export function mapPortfolioWithContent(data: PortfolioWithContent): PortfolioWithContent {
  return {
    ...data,
    settings: {
      ...data.settings,
      pageFormat: data.settings.pageFormat === "LETTER" ? "LETTER" : "A4",
    },
    sections: data.sections.map((s) => ({
      section: s.section,
      items: s.items.map((item) => ({
        ...item,
        showInPreview: item.showInPreview ?? true,
      })),
    })),
  };
}
