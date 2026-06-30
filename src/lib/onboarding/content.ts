import type { OnboardingGoal } from "@/lib/onboarding/state";

export const ONBOARDING_GOALS: { id: OnboardingGoal; label: string }[] = [
  { id: "NEXT_ROLE", label: "Land my next role" },
  { id: "CAREER_CHANGE", label: "Change careers" },
  { id: "STAY_READY", label: "Keep my CV interview-ready" },
  { id: "PORTFOLIO", label: "Show my work with a portfolio" },
  { id: "EXPLORING", label: "Just exploring for now" },
];

export type OnboardingStartPath = "GITHUB" | "IMPORT_FILE" | "LINKEDIN" | "EXPLORE";

export const ONBOARDING_START_OPTIONS: {
  id: OnboardingStartPath;
  title: string;
  description: string;
}[] = [
  {
    id: "GITHUB",
    title: "Connect GitHub",
    description: "I'll learn from your repos and turn project work into strong CV material.",
  },
  {
    id: "IMPORT_FILE",
    title: "Upload a CV",
    description: "Drop a PDF or Word file and I'll build your workspace from it.",
  },
  {
    id: "LINKEDIN",
    title: "Share your LinkedIn",
    description: "Give me your profile link and I'll pull the essentials into a CV.",
  },
  {
    id: "EXPLORE",
    title: "Look around first",
    description: "Skip setup for now. You can connect or import anytime from Connections or Resumes.",
  },
];
