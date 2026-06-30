"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { Loader2 } from "lucide-react";
import { AppWorkspace } from "@/components/layout/app-workspace";
import { ResumeCustomize } from "@/components/cv/resume-customize";
import { getResumeWithContent } from "@/lib/api/cv-api";
import { useRedirectIfResumeMissing } from "@/lib/cv/use-redirect-if-resume-missing";
import type { ResumeWithContent } from "@/lib/types/cv";

interface ResumeCustomizePageProps {
  params: Promise<{ id: string }>;
}

export default function ResumeCustomizePage({ params }: ResumeCustomizePageProps) {
  const { id } = use(params);
  const [content, setContent] = useState<ResumeWithContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getResumeWithContent(id).then((result) => {
      if (!cancelled) {
        setContent(result ?? null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useRedirectIfResumeMissing(id, loading, content !== null);

  if (!loading && !content) {
    return null;
  }

  if (loading || !content) {
    return (
      <AppWorkspace>
        <div className="flex flex-1 items-center justify-center p-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
          <span className="sr-only">Loading resume</span>
        </div>
      </AppWorkspace>
    );
  }

  return (
    <AppWorkspace>
      <ResumeCustomize content={content} />
    </AppWorkspace>
  );
}
