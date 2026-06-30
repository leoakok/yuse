import type { ResumeSettings } from "@/lib/types/cv";

/** Effective preview settings when ATS mode overrides decorative layout choices. */
export function resolveAtsPreviewSettings(settings: ResumeSettings): ResumeSettings {
  if (!settings.atsMode) return settings;
  return {
    ...settings,
    showPhoto: false,
    fontFamily: "SANS",
    accentColor: "#000000",
    sectionDividerStyle: "NONE",
    datePosition: "INLINE",
    skillsLayout: "LIST",
    columnLayout: "SINGLE",
    contactLayout: "INLINE",
    photoPosition: "NONE",
  };
}

export const ATS_SYSTEM_FONT_STYLE = {
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
} as const;
