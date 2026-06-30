"use client";

import { useEffect, useRef, useState } from "react";
import { CvPreview } from "@/components/cv/cv-preview";
import { TAILOR_SHOWCASE_EXAMPLES } from "@/lib/landing/tailor-demo-content";
import type { ResumeWithContent } from "@/lib/types/cv";
import { cn } from "@/lib/utils";

function LandingA4CvPreview({
  content,
  label,
  className,
}: {
  content: ResumeWithContent;
  label: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [scaledHeight, setScaledHeight] = useState<number | undefined>();

  useEffect(() => {
    const container = containerRef.current;
    const page = pageRef.current;
    if (!container || !page) return;

    const updateScale = () => {
      const pageWidth = page.offsetWidth;
      const available = container.clientWidth;
      if (pageWidth > 0 && available > 0) {
        const nextScale = Math.min(1, available / pageWidth);
        setScale(nextScale);
        setScaledHeight(page.offsetHeight * nextScale);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    observer.observe(page);
    return () => observer.disconnect();
  }, [content]);

  return (
    <figure className={cn("flex min-w-0 flex-col gap-2", className)}>
      <figcaption className="text-center text-sm font-medium text-muted-foreground">
        {label}
      </figcaption>
      <div ref={containerRef} className="flex justify-center overflow-hidden">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            height: scale < 1 ? scaledHeight : undefined,
          }}
        >
          <div ref={pageRef}>
            <CvPreview
              content={content}
              singlePage
              className="rounded-sm shadow-[0_12px_40px_-8px_rgba(0,0,0,0.14),0_4px_12px_-4px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
            />
          </div>
        </div>
      </div>
    </figure>
  );
}

export function TailorCvShowcase() {
  return (
    <div className="w-full">
      <div className="mx-auto mb-6 max-w-5xl text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-primary">
          See what&apos;s possible
        </span>
        <p className="mt-2 text-balance text-lg font-medium tracking-tight">
          Full A4 CVs — tailored, print-ready
        </p>
      </div>

      <div className="relative -mx-5 sm:-mx-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent sm:w-12"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent sm:w-12"
        />

        <div className="flex gap-6 overflow-x-auto px-5 pb-3 snap-x snap-mandatory scroll-pl-5 sm:scroll-pl-8 sm:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TAILOR_SHOWCASE_EXAMPLES.map((example) => (
            <LandingA4CvPreview
              key={example.id}
              content={example.preview}
              label={example.label}
              className="w-[min(78vw,360px)] shrink-0 snap-center md:w-[380px]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
