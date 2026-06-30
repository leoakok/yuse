import type { PortfolioTypographyScale } from "@/lib/types/portfolio";

export interface PortfolioSiteTypography {
  namePx: number;
  headlinePx: number;
  sectionLabelPx: number;
  bodyPx: number;
  projectTitlePx: number;
  metaPx: number;
}

const SCALE: Record<PortfolioTypographyScale, PortfolioSiteTypography> = {
  COMPACT: {
    namePx: 24,
    headlinePx: 16,
    sectionLabelPx: 10,
    bodyPx: 13,
    projectTitlePx: 14,
    metaPx: 11,
  },
  NORMAL: {
    namePx: 30,
    headlinePx: 18,
    sectionLabelPx: 11,
    bodyPx: 14,
    projectTitlePx: 16,
    metaPx: 12,
  },
  SPACIOUS: {
    namePx: 36,
    headlinePx: 20,
    sectionLabelPx: 12,
    bodyPx: 16,
    projectTitlePx: 18,
    metaPx: 13,
  },
};

export function resolvePortfolioTypography(
  scale: PortfolioTypographyScale | undefined
): PortfolioSiteTypography {
  return SCALE[scale === "COMPACT" || scale === "SPACIOUS" ? scale : "NORMAL"];
}
