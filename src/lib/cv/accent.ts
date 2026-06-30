export const DEFAULT_RESUME_ACCENT_COLOR = "#c45c3e";

export type SectionDividerStyle = "NONE" | "FULL" | "TEXT_WIDTH";

export function mapSectionDividerStyle(value: string | undefined): SectionDividerStyle {
  if (value === "NONE") return "NONE";
  if (value === "TEXT_WIDTH") return "TEXT_WIDTH";
  return "FULL";
}

export function resolveAccentColor(value: string | undefined): string {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  return DEFAULT_RESUME_ACCENT_COLOR;
}
