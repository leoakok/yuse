"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearLastOpenedResumeId } from "@/lib/cv/preferences";
import { useWorkspace } from "@/components/layout/workspace-provider";

export function useRedirectIfResumeMissing(
  resumeId: string,
  loading: boolean,
  exists: boolean
) {
  const router = useRouter();
  const { user } = useWorkspace();

  useEffect(() => {
    if (loading || exists) return;
    clearLastOpenedResumeId(user.id);
    router.replace("/resumes");
  }, [loading, exists, resumeId, router, user.id]);
}
