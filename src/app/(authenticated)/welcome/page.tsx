"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { hasCompletedOnboarding } from "@/lib/onboarding/state";

export default function WelcomePage() {
  const router = useRouter();
  const { user } = useWorkspace();

  useEffect(() => {
    if (hasCompletedOnboarding(user.id)) {
      router.replace("/home");
    }
  }, [router, user.id]);

  if (hasCompletedOnboarding(user.id)) {
    return null;
  }

  return <OnboardingFlow displayName={user.displayName} />;
}
