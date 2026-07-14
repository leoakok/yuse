"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { resolveHomePath } from "@/lib/cv/home-path";
import { resumePath } from "@/lib/cv/routes";
import { useWorkspace } from "@/components/layout/workspace-provider";
import {
  createResumeFromShowcaseDesign,
  takePendingShowcaseDesign,
} from "@/lib/landing/start-with-design";
import { hasCompletedOnboarding } from "@/lib/onboarding/state";

export function HomeRedirect() {
  const router = useRouter();
  const { user } = useWorkspace();

  useEffect(() => {
    let cancelled = false;

    if (!hasCompletedOnboarding(user.id)) {
      router.replace("/welcome");
      return;
    }

    async function go() {
      const pending = takePendingShowcaseDesign();
      if (pending) {
        try {
          const resume = await createResumeFromShowcaseDesign(pending);
          if (!cancelled) {
            toast.success(`Started a ${pending.styleLabel} resume`);
            router.replace(resumePath(resume.id));
          }
          return;
        } catch {
          if (!cancelled) {
            toast.error("Could not apply that design. Opening your workspace instead.");
          }
        }
      }

      const path = await resolveHomePath(user.id);
      if (!cancelled) {
        router.replace(path);
      }
    }

    void go();
    return () => {
      cancelled = true;
    };
  }, [router, user.id]);

  return null;
}
