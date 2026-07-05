"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { ResumeCustomizeLoadingShell } from "@/components/layout/app-workspace-skeleton";
import { AppWorkspace } from "@/components/layout/app-workspace";
import { ResumeCustomize } from "@/components/cv/resume-customize";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { getResumeWithContent } from "@/lib/api/cv-api";
import {
  getCachedResumeContent,
  setCachedResumeContent,
} from "@/lib/cache/workspace-cache";
import { useRedirectIfResumeMissing } from "@/lib/cv/use-redirect-if-resume-missing";
import type { ResumeWithContent } from "@/lib/types/cv";

interface ResumeCustomizePageProps {
  params: Promise<{ id: string }>;
}

export default function ResumeCustomizePage({ params }: ResumeCustomizePageProps) {
  const { id } = use(params);
  const { user } = useWorkspace();
  const [content, setContent] = useState<ResumeWithContent | null>(() =>
    getCachedResumeContent(user.id, id)
  );
  const [loading, setLoading] = useState(() => !getCachedResumeContent(user.id, id));

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedResumeContent(user.id, id);
    if (cached) {
      setContent(cached);
      setLoading(false);
    }
    void getResumeWithContent(id).then((result) => {
      if (!cancelled) {
        if (result) {
          setCachedResumeContent(user.id, id, result);
        }
        setContent(result ?? null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, user.id]);

  useRedirectIfResumeMissing(id, loading, content !== null);

  if (!loading && !content) {
    return null;
  }

  return (
    <AppWorkspace>
      {content ? (
        <ResumeCustomize content={content} />
      ) : (
        <ResumeCustomizeLoadingShell resumeId={id} />
      )}
    </AppWorkspace>
  );
}
