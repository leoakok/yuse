import type {
  PortfolioAnimationLevel,
  PortfolioHeroStyle,
  PortfolioLayout,
  PortfolioNavigationStyle,
  PortfolioProjectCardStyle,
  PortfolioProjectGridColumns,
  PortfolioTypographyScale,
  PortfolioWithContent,
} from "@/lib/types/portfolio";

const GRID_COLUMNS: PortfolioProjectGridColumns[] = ["ONE", "TWO", "THREE"];
const CARD_STYLES: PortfolioProjectCardStyle[] = ["STANDARD", "MINIMAL", "IMAGE"];
const TYPOGRAPHY_SCALES: PortfolioTypographyScale[] = ["COMPACT", "NORMAL", "SPACIOUS"];
const HERO_STYLES: PortfolioHeroStyle[] = ["GRADIENT", "MINIMAL", "CENTERED"];
const NAV_STYLES: PortfolioNavigationStyle[] = ["NONE", "TOP", "STICKY"];
const ANIMATION_LEVELS: PortfolioAnimationLevel[] = ["NONE", "SUBTLE", "FULL"];

function pickEnum<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  if (value && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

export function mapPortfolioWithContent(data: PortfolioWithContent): PortfolioWithContent {
  return {
    ...data,
    settings: {
      ...data.settings,
      layout: data.settings.layout === "SPLIT" ? "SPLIT" : "SINGLE",
      accentColor: data.settings.accentColor || "#2563eb",
      projectGridColumns: pickEnum(data.settings.projectGridColumns, GRID_COLUMNS, "TWO"),
      projectCardStyle: pickEnum(data.settings.projectCardStyle, CARD_STYLES, "STANDARD"),
      typographyScale: pickEnum(data.settings.typographyScale, TYPOGRAPHY_SCALES, "NORMAL"),
      heroStyle: pickEnum(data.settings.heroStyle, HERO_STYLES, "GRADIENT"),
      navigationStyle: pickEnum(data.settings.navigationStyle, NAV_STYLES, "TOP"),
      animationLevel: pickEnum(data.settings.animationLevel, ANIMATION_LEVELS, "SUBTLE"),
    },
    projects: (data.projects ?? []).map((p) => ({
      ...p,
      techStack: p.techStack ?? [],
      showInPreview: p.showInPreview ?? true,
    })),
    skills: (data.skills ?? []).map((s) => ({
      ...s,
      showInPreview: s.showInPreview ?? true,
    })),
    testimonials: (data.testimonials ?? []).map((t) => ({
      ...t,
      showInPreview: t.showInPreview ?? true,
    })),
  };
}
