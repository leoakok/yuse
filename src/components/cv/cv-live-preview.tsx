"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ResumeWithContent } from "@/lib/types/cv";
import { CvPreview } from "@/components/cv/cv-preview";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CvLivePreviewProps {
  content: ResumeWithContent;
}

export function CvLivePreview({ content }: CvLivePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [stackHeight, setStackHeight] = useState<number | undefined>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const stack = stackRef.current;
    if (!container || !stack) return;

    const updateScale = () => {
      const pageWidth = stack.offsetWidth;
      const available = container.clientWidth - 32;
      if (pageWidth > 0 && available > 0) {
        const nextScale = Math.min(1, available / pageWidth);
        setScale(nextScale);
        setStackHeight(stack.offsetHeight * nextScale);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    observer.observe(stack);
    return () => observer.disconnect();
  }, [content.settings.pageFormat, content]);

  const exportRoot = mounted
    ? createPortal(
        <div
          data-export-root
          className="cv-pdf-export-root pointer-events-none fixed top-0 -left-[10000px] z-[-1] w-max"
          aria-hidden
        >
          <CvPreview
            content={content}
            pageGapClassName="gap-0"
            className="rounded-none shadow-none ring-0"
          />
        </div>,
        document.body
      )
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {exportRoot}
      <ScrollArea className="min-h-0 flex-1 bg-muted/40">
        <div className="min-h-full w-full">
          <div
            ref={containerRef}
            className="flex min-h-full w-full justify-center p-4"
          >
            <div
              className="resume-print-scale"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                height: scale < 1 ? stackHeight : undefined,
              }}
            >
              <div ref={stackRef} className="resume-print-target">
                <CvPreview
                  content={content}
                  className="rounded-sm shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18),0_4px_12px_-4px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5),0_4px_12px_-4px_rgba(0,0,0,0.3)] dark:ring-white/10"
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
