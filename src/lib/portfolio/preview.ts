import type { PortfolioWithContent } from "@/lib/types/portfolio";

export function mapPortfolioWithContent(data: PortfolioWithContent): PortfolioWithContent {
  return {
    ...data,
    settings: {
      ...data.settings,
      layout: data.settings.layout === "SPLIT" ? "SPLIT" : "SINGLE",
      accentColor: data.settings.accentColor || "#2563eb",
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
