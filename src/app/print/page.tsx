"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CvPreview } from "@/components/cv/cv-preview";
import { getResumeWithContent } from "@/lib/api/cv-api";
import { readPrintContent } from "@/lib/cv/print";
import { getPageFormatSpec } from "@/lib/cv/page-format";
import { SessionInvalidError } from "@/lib/graphql/client";
import type { ResumeWithContent } from "@/lib/types/cv";

function CvPrintPageContent() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("r");
  const autoPrint = searchParams.get("auto") === "1";
  const [content, setContent] = useState<ResumeWithContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resumeId) {
      setError("Missing resume id.");
      setLoading(false);
      return;
    }

    const cached = readPrintContent(resumeId);
    if (cached) {
      setContent(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void getResumeWithContent(resumeId)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setError("Resume not found.");
        } else {
          setContent(result);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SessionInvalidError) {
          const returnUrl = `${window.location.pathname}${window.location.search}`;
          window.location.href = `/login?callbackUrl=${encodeURIComponent(returnUrl)}`;
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load resume.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  const pageFormat = content?.settings.pageFormat ?? "A4";
  const page = getPageFormatSpec(pageFormat);

  useEffect(() => {
    if (!content || !autoPrint || loading) return;

    let cancelled = false;
    const runPrint = async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 150);
      });
      if (!cancelled) {
        window.print();
      }
    };

    void runPrint();
    return () => {
      cancelled = true;
    };
  }, [content, autoPrint, loading]);

  if (!resumeId || error) {
    return (
      <p className="cv-print-status p-8 text-center text-sm text-zinc-600">
        {error ?? "Missing resume id."}
      </p>
    );
  }

  if (loading || !content) {
    return (
      <p className="cv-print-status p-8 text-center text-sm text-zinc-600">Loading resume…</p>
    );
  }

  return (
    <>
      <style>{`
        @page {
          size: ${page.width} ${page.minHeight};
          margin: 0;
        }
      `}</style>
      <div className="cv-print-root">
        <CvPreview
          content={content}
          pageGapClassName="gap-0"
          className="rounded-none shadow-none ring-0"
        />
      </div>
    </>
  );
}

export default function CvPrintPage() {
  return (
    <Suspense
      fallback={
        <p className="cv-print-status p-8 text-center text-sm text-zinc-600">Loading…</p>
      }
    >
      <CvPrintPageContent />
    </Suspense>
  );
}
