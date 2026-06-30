const ONBOARDING_COMPLETE_KEY_PREFIX = "yuse:onboardingComplete";
const ONBOARDING_GOAL_KEY_PREFIX = "yuse:onboardingGoal";

function completeKey(userId: string) {
  return `${ONBOARDING_COMPLETE_KEY_PREFIX}:${userId}`;
}

function goalKey(userId: string) {
  return `${ONBOARDING_GOAL_KEY_PREFIX}:${userId}`;
}

export type OnboardingGoal =
  | "NEXT_ROLE"
  | "CAREER_CHANGE"
  | "STAY_READY"
  | "PORTFOLIO"
  | "EXPLORING";

export function hasCompletedOnboarding(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(completeKey(userId)) === "1";
}

export function completeOnboarding(userId: string, goal?: OnboardingGoal): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(completeKey(userId), "1");
  if (goal) {
    localStorage.setItem(goalKey(userId), goal);
  }
}

export function getOnboardingGoal(userId: string): OnboardingGoal | undefined {
  if (typeof window === "undefined") return undefined;
  const value = localStorage.getItem(goalKey(userId));
  if (
    value === "NEXT_ROLE" ||
    value === "CAREER_CHANGE" ||
    value === "STAY_READY" ||
    value === "PORTFOLIO" ||
    value === "EXPLORING"
  ) {
    return value;
  }
  return undefined;
}
