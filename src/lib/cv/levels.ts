import type { SectionType } from "@/lib/types/cv";

export const LANGUAGE_LEVELS = [
  "BEGINNER",
  "INTERMEDIATE",
  "PROFICIENT",
  "FLUENT",
  "NATIVE",
] as const;

export const SKILL_LEVELS = [
  "BEGINNER",
  "INTERMEDIATE",
  "PROFICIENT",
  "ADVANCED",
  "EXPERT",
] as const;

export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];
export type SkillLevel = (typeof SKILL_LEVELS)[number];
export type ProficiencyLevel = LanguageLevel | SkillLevel;

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  PROFICIENT: "Proficient",
  FLUENT: "Fluent",
  NATIVE: "Native",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

export function formatLevelLabel(level: string | undefined): string | null {
  if (!level?.trim()) return null;
  const key = level.trim().toUpperCase();
  return LEVEL_LABELS[key] ?? level.trim();
}

export function levelsForSectionType(type: SectionType): readonly string[] {
  return type === "LANGUAGES" ? LANGUAGE_LEVELS : SKILL_LEVELS;
}
